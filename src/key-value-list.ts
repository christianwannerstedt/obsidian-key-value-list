import { Line } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import { EditorPosition, MarkdownView, TFile } from "obsidian";

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
import { removeInvalidHtmlTags } from "./utils";

const excludeFileFromCssClasses = (plugin: KeyValueListPlugin) => {
  const noteFile: TFile | null = plugin.app.workspace.getActiveFile();
  if (noteFile) {
    const metadata = plugin.app.metadataCache.getFileCache(noteFile);
    if (metadata?.frontmatter) {
      return (metadata.frontmatter.cssclasses || []).includes("nokeyvalue");
    }
  }
  return false;
};

export class KeyValueList {
  constructor(private plugin: KeyValueListPlugin, private parser: ListParser) {}

  async load() {
    const plugin: KeyValueListPlugin = this.plugin;
    const parser: ListParser = this.parser;

    // Register a Markdown post processor to handle read mode.
    this.plugin.registerMarkdownPostProcessor((element, context) => {
      if (
        !this.plugin.settings.activeInReadMode ||
        excludeFileFromCssClasses(plugin)
      ) {
        return;
      }

      const listElements = element.findAll("ul");
      const displayBulletChar: string =
        plugin.settings.displayBulletChar || "-";

      for (const listElement of listElements) {
        const listItems = listElement.findAll("li");
        const isKeyValueList = listItems.every((listItem) =>
          parser.isKeyValueLiElem(listItem.innerText.trim())
        );

        if (isKeyValueList) {
          // Replace the list with a table where every row is a list item, and the first column is the key and the second column is the value.
          const table = document.createElement("table");
          table.classList.add("kvl-table");
          listElement.replaceWith(table);
          let rowIndex = 0;
          for (const listItem of listItems) {
            const tr = document.createElement("tr");

            // Every other row should have a different background color.
            if (++rowIndex % 2 == 0) {
              // Set the background color to the stripedBackgroundColor setting
              if (
                plugin.settings.stripedBackgroundType === "custom" &&
                plugin.settings.stripedBackgroundColor
              ) {
                tr.style.backgroundColor =
                  plugin.settings.stripedBackgroundColor;
              }
              tr.classList.add("kvl-row-even");
            } else {
              tr.classList.add("kvl-row-odd");
            }

            table.appendChild(tr);
            const tdKey = document.createElement("td");
            tr.appendChild(tdKey);

            let keyText = removeInvalidHtmlTags(
              parser.getKeyFromLiElem(
                listItem.innerHTML.replace("\n", " ").trim()
              )
            );

            // Include the delimiter if the settings.displayDelimiter is true.
            if (plugin.settings.displayDelimiter) {
              keyText += plugin.settings.delimiter;
            }
            // Include the bullet if the settings.displayBullet is true.
            if (plugin.settings.displayBullet) {
              keyText = `${displayBulletChar} ${keyText}`;
            }

            // If the settings.boldKey is true, wrap the key in a strong tag.
            const keyElemType: string = plugin.settings.boldKey
              ? "strong"
              : "span";
            const keyElem = document.createElement(keyElemType);
            keyElem.innerHTML = keyText;
            if (plugin.settings.isKeyColored) {
              keyElem.style.color = plugin.settings.keyColor;
            }
            tdKey.style.padding = `${plugin.settings.verticalPadding + 2}px ${
              plugin.settings.horizontalPadding
            }px`;
            tdKey.appendChild(keyElem);

            const tdValue = document.createElement("td");
            tdValue.innerHTML = removeInvalidHtmlTags(
              parser.getValueFromLiElem(
                listItem.innerHTML.replace("\n", " ").trim()
              )
            );
            tdValue.style.padding = `${plugin.settings.verticalPadding + 2}px ${
              plugin.settings.horizontalPadding
            }px`;
            if (plugin.settings.isValueColored) {
              tdValue.style.color = plugin.settings.valueColor;
            }
            tr.appendChild(tdValue);
          }
        }
      }
    });

    // Keep track of the pointer state. We're avoiding updates when it's down,
    // since that prevents link clicks to work properly in edit mode.
    let isPointerDown: boolean = false;
    this.plugin.registerDomEvent(window, "pointerdown", () => {
      isPointerDown = true;
    });
    this.plugin.registerDomEvent(window, "pointerup", () => {
      isPointerDown = false;
    });

    // Register a CodeMirror view plugin to handle edit mode.
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
            const field = this.view.state.field(editorInfoField);
            // Get the editor from the field but catch any type errors here
            // because the editor is not available immediately.
            let editor;
            try {
              editor = field.editor;
            } catch (error) {
              editor = undefined;
            }
            if (!editor) {
              setTimeout(this.setupEditor, 0);
              return;
            }
            this.editor = editor;
            this.updateCounter = 10;
          };

          update(update: ViewUpdate) {
            if (isPointerDown) return;

            if (
              !this.editor ||
              !plugin.settings.activeInEditMode ||
              excludeFileFromCssClasses(plugin)
            ) {
              this.decorations = Decoration.none;
              return;
            }

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
                  ).map((elem: Element) => elem.clientWidth + 20)
                ),
                row: Math.max(
                  this.listWidths[index].rowNeedsUpdate
                    ? 0
                    : this.listWidths[index].row,
                  ...Array.from(
                    document.getElementsByClassName(`kvl-row-inner-${index}`)
                  ).map(
                    (elem: Element) =>
                      elem.children[0].clientWidth +
                      elem.children[1].clientWidth +
                      plugin.settings.horizontalPadding * 2 +
                      (elem.querySelector("a") ? 16 : 0)
                  )
                ),
                keyNeedsUpdate: false,
                rowNeedsUpdate: this.listWidths[index].keyNeedsUpdate,
              };
            });
          }

          buildDecorations(view: EditorView, lists: List[]): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            if (!this.editor || excludeFileFromCssClasses(plugin)) {
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
          decorations: (value) =>
            plugin.settings.activeInEditMode &&
            !excludeFileFromCssClasses(plugin)
              ? value.decorations
              : Decoration.none,
        }
      )
    );
  }

  async unload() {}
}
