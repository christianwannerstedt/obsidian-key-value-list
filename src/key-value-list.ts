// import { Plugin_2 } from "obsidian";

import { syntaxTree, SyntaxNodeRef } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
} from "@codemirror/view";
import { KeyValueLineWidget } from "src/widgets";
import { ListParser } from "src/list-parser";
import { List } from "./list";
import KeyValueListPlugin from "main";
import { Editor, editorInfoField } from "obsidian";
import { ListItemWidth } from "./types";

export class KeyValueList {
  constructor(private plugin: KeyValueListPlugin, private parser: ListParser) {
    console.log("Init KeyValueList");
  }

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
          needsUpdate: boolean;
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
          };

          update(update: ViewUpdate) {
            let lists: List[] = [];
            if (
              this.view.viewportLineBlocks.length > 0 &&
              this.view.visibleRanges.length > 0
            ) {
              const fromLine: number = this.editor.offsetToPos(
                this.view.viewport.from
              ).line;
              const toLine: number = this.editor.offsetToPos(
                this.view.viewport.to
              ).line;
              lists = parser
                .collectLists(this.editor, fromLine, toLine)
                .filter((list: List) => list.isKeyValueList);
            }

            if (lists.length != this.listWidths.length) {
              this.listWidths = lists.map(() => ({
                key: 0,
                row: 0,
                keyNeedsUpdate: true,
                rowNeedsUpdate: true,
              }));
            }

            const touchedListIndex: number = lists.findIndex(
              (list) => list.hasCursorInside
            );
            const isAnyListTouched: boolean = touchedListIndex >= 0;
            let needsUpdate = false;
            if (touchedListIndex === -1 && this.lastTouchedListIndex !== -1) {
              needsUpdate = true;
              this.listWidths[this.lastTouchedListIndex].keyNeedsUpdate = true;
              this.listWidths[this.lastTouchedListIndex].rowNeedsUpdate = true;
              this.lastTouchedListIndex = -1;
            } else if (isAnyListTouched) {
              this.lastTouchedListIndex = touchedListIndex;
            }

            if (
              update.docChanged ||
              update.viewportChanged ||
              isAnyListTouched ||
              needsUpdate ||
              true
            ) {
              this.decorations = this.buildDecorations(update.view, lists);
            }
          }

          destroy() {}

          buildDecorations(view: EditorView, lists: List[]): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();

            const listWidths = this.listWidths;
            view.requestMeasure({
              read: () => {
                lists.forEach((_list: List, index: number) => {
                  // Get the max width of the key and the row for every line in the list.
                  listWidths[index] = {
                    key: Math.max(
                      listWidths[index].keyNeedsUpdate
                        ? 0
                        : listWidths[index].key,
                      ...Array.from(
                        document.getElementsByClassName(
                          `kvl-key-inner-${index}`
                        )
                      ).map((elem) => elem.clientWidth + 20)
                    ),
                    row: Math.max(
                      listWidths[index].rowNeedsUpdate
                        ? 0
                        : listWidths[index].row,
                      ...Array.from(
                        document.getElementsByClassName(
                          `kvl-row-inner-${index}`
                        )
                      ).map(
                        (elem) =>
                          elem.children[0].clientWidth +
                          elem.children[1].clientWidth +
                          plugin.settings.horizontalPadding * 2
                      )
                    ),
                    keyNeedsUpdate: false,
                    rowNeedsUpdate: listWidths[index].keyNeedsUpdate,
                  };
                });
              },
            });

            const maxKeyWidth: number =
              (plugin.settings.maxKeyWidth / 100) * view.dom.clientWidth;
            const padding: string = `${plugin.settings.verticalPadding}px ${plugin.settings.horizontalPadding}px`;

            lists.forEach((list: List, index: number) => {
              const cursor = this.editor.getCursor();
              const from = this.editor.posToOffset(list.start);
              const to = this.editor.posToOffset(list.end);

              let listIndex = 0;
              syntaxTree(view.state).iterate({
                from,
                to,
                enter(node: SyntaxNodeRef) {
                  listIndex++;
                  const nodeLine = view.state.doc.lineAt(node.from);
                  if (
                    node.type.name.startsWith("list") &&
                    nodeLine.number != cursor.line + 1
                  ) {
                    let substring: string = view.state.doc.sliceString(
                      node.from,
                      node.to
                    );
                    builder.add(
                      node.from - 2,
                      node.to,
                      Decoration.replace({
                        widget: new KeyValueLineWidget(
                          plugin,
                          maxKeyWidth,
                          padding,
                          index,
                          substring,
                          // listWidth,
                          listWidths[index],
                          listIndex
                        ),
                      })
                    );
                  }
                },
              });
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
