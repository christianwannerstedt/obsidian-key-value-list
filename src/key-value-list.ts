import { Line } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { EditorPosition, MarkdownView } from "obsidian";

import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { Editor, editorInfoField } from "obsidian";
import KeyValueListPlugin from "./main";
import { List } from "./list";
import { ListItemWidth } from "./types";
import { KeyValueLineWidget } from "./widgets";
import { ListParser } from "./list-parser";

export class KeyValueList {
  constructor(private plugin: KeyValueListPlugin, private parser: ListParser) {}

  async load() {
    const plugin: KeyValueListPlugin = this.plugin;
    const parser: ListParser = this.parser;

    this.plugin.registerEditorExtension(
      ViewPlugin.fromClass(
        class KVLPlugin implements PluginValue {
          decorations: DecorationSet;
          parser: ListParser;
          view: EditorView;
          listWidths: ListItemWidth[];
          editor: Editor;
          lastTouchedListIndex: number;
          updateCounter: number;

          constructor(view: EditorView) {
            this.view = view;
            this.listWidths = [];
            this.lastTouchedListIndex = -1;
            this.updateCounter = 0;
            this.decorations = this.buildDecorations(view, []);
            this.setupEditor();
          }

          private setupEditor = () => {
            const editor = this.view.state.field(editorInfoField)?.editor;
            if (!editor) {
              setTimeout(this.setupEditor, 0);
              return;
            }
            this.editor = editor;
            this.updateCounter = 10;
          };

          update(update: ViewUpdate) {
            // Collect all lists in the current viewport.
            const lists: List[] =
              this.view.viewportLineBlocks.length > 0 &&
              this.view.visibleRanges.length > 0
                ? parser
                    .collectLists(
                      this.editor,
                      this.editor.offsetToPos(this.view.viewport.from).line,
                      this.editor.offsetToPos(this.view.viewport.to).line
                    )
                    .filter((list: List) => list.isKeyValueList)
                : [];

            // If the number of lists changed, we need to reset the list widths.
            if (lists.length != this.listWidths.length) {
              this.listWidths = lists.map(() => ({
                key: 0,
                row: 0,
                keyNeedsUpdate: true,
                rowNeedsUpdate: true,
              }));
            }

            // Check if the cursor is inside a list.
            const touchedListIndex: number = lists.findIndex(
              (list) => list.hasCursorInside
            );
            const isAnyListTouched: boolean = touchedListIndex >= 0;
            if (!isAnyListTouched && this.lastTouchedListIndex !== -1) {
              if (this.listWidths[this.lastTouchedListIndex]) {
                this.listWidths[this.lastTouchedListIndex].keyNeedsUpdate =
                  true;
                this.listWidths[this.lastTouchedListIndex].rowNeedsUpdate =
                  false;
              }
              this.lastTouchedListIndex = -1;

              // When the cursor leaves a list, we need to update the decorations
              // two additional times. One to ensure proper key width and one for
              // the row width.
              this.updateCounter = 3;
            } else if (isAnyListTouched) {
              this.lastTouchedListIndex = touchedListIndex;
            }

            if (
              update.docChanged ||
              update.viewportChanged ||
              isAnyListTouched ||
              this.updateCounter ||
              parser.needsUpdate
            ) {
              if (this.updateCounter > 0) {
                this.updateCounter--;
              }
              if (parser.needsUpdate) {
                parser.needsUpdate = false;
              }
              this.decorations = this.buildDecorations(update.view, lists);
            }
          }

          getListWidths(lists: List[]) {
            lists.forEach((_list: List, index: number) => {
              // Get the max width of the key and the row for every line in the list.
              this.listWidths[index] = {
                key: Math.max(
                  this.listWidths[index].keyNeedsUpdate
                    ? 0
                    : this.listWidths[index].key,
                  ...Array.from(
                    document.getElementsByClassName(`kvl-key-inner-${index}`)
                  ).map((elem) => elem.clientWidth + 20)
                ),
                row: Math.max(
                  this.listWidths[index].rowNeedsUpdate
                    ? 0
                    : this.listWidths[index].row,
                  ...Array.from(
                    document.getElementsByClassName(`kvl-row-inner-${index}`)
                  ).map(
                    (elem) =>
                      elem.children[0].clientWidth +
                      elem.children[1].clientWidth +
                      plugin.settings.horizontalPadding * 2
                  )
                ),
                keyNeedsUpdate: false,
                rowNeedsUpdate: this.listWidths[index].keyNeedsUpdate,
              };
            });
          }

          buildDecorations(view: EditorView, lists: List[]): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            if (!this.editor) {
              return builder.finish();
            }
            const cursor: EditorPosition = this.editor.getCursor();
            this.getListWidths(lists);

            const maxKeyWidth: number =
              (plugin.settings.maxKeyWidth / 100) * view.dom.clientWidth;
            const markdownView =
              plugin.app.workspace.getActiveViewOfType(MarkdownView);

            lists.forEach((list: List, index: number) => {
              for (
                let lineNumber: number = list.start.line;
                lineNumber < list.end.line;
                lineNumber++
              ) {
                if (lineNumber === cursor.line) {
                  continue;
                }
                const line: Line = view.state.doc.line(lineNumber + 1);
                builder.add(
                  line.from,
                  line.to,
                  Decoration.replace({
                    widget: new KeyValueLineWidget(
                      plugin,
                      index,
                      lineNumber,
                      line.text,
                      maxKeyWidth,
                      this.listWidths[index],
                      markdownView?.file?.path || ""
                    ),
                  })
                );
              }
            });

            return builder.finish();
          }
        },
        {
          decorations: (value) => value.decorations,
        }
      )
    );
  }

  async unload() {}
}
