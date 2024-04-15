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
import { KeyValuePiece, ListItemWidth, ListRows } from "./types";
import { KeyValueLineWidget } from "./widgets";
import { ListParser } from "./list-parser";
import { hashCode } from "./utils";

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
    const listRows: ListRows = {};

    // Register a Markdown post processor to handle read mode.
    this.plugin.registerMarkdownPostProcessor((element, context) => {
      if (
        !this.plugin.settings.activeInReadMode ||
        excludeFileFromCssClasses(plugin)
      ) {
        return;
      }

      for (const listElement of element.findAll("ul")) {
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

            const pieces: KeyValuePiece = parser.getPiecesFromLiElem(listItem);

            // If the settings.boldKey is true, wrap the key in a strong tag.
            const keyElemType: string = plugin.settings.boldKey
              ? "strong"
              : "span";
            const keyElem = document.createElement(keyElemType);
            keyElem.innerHTML = pieces.key;
            if (plugin.settings.isKeyColored) {
              keyElem.style.color = plugin.settings.keyColor;
            }
            tdKey.style.padding = `${plugin.settings.verticalPadding + 2}px ${
              plugin.settings.horizontalPadding
            }px`;
            tdKey.appendChild(keyElem);

            const tdValue = document.createElement("td");
            tdValue.innerHTML = pieces.value;
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
    let isPointerDown = false;
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

            // Collect the collectedHashes from the list rows.
            const collectedHashes: string[] = [];
            lists.forEach((list: List) => {
              list.collectedHashes.forEach((hash: string) => {
                collectedHashes.push(hash);
              });
            });

            // Remove old values from listRows
            for (const hash in listRows) {
              if (!collectedHashes.includes(hash)) {
                delete listRows[hash];
              }
            }

            // We need to update if any of the collectedHashes are not in the listRows.
            let needsUpdate = false;

            const touchedListIndex: number = lists.findIndex(
              (list) => list.hasCursorInside
            );
            if (touchedListIndex >= 0) {
              needsUpdate = true;
            } else {
              for (const hash of collectedHashes) {
                if (
                  !listRows[hash] ||
                  !listRows[hash].completed ||
                  listRows[hash].touched ||
                  !listRows[hash].calculatedKey ||
                  !listRows[hash].calculatedValue
                ) {
                  needsUpdate = true;
                  break;
                }
              }
            }
            if (needsUpdate && update.view.dom.clientWidth > 0) {
              this.decorations = this.buildDecorations(update.view, lists);
            }
          }

          getListWidths(lists: List[]) {
            lists.forEach((list: List, index: number) => {
              list.collectedLines.forEach((lineText: string, index: number) => {
                const lineHash = hashCode(lineText);
                if (!listRows[lineHash]) {
                  listRows[lineHash] = {
                    hash: lineHash,
                    text: lineText,
                    key: 0,
                    value: 0,
                    calculatedKey: false,
                    calculatedValue: false,
                    completed: false,
                    touched: false,
                  };
                } else {
                  if (listRows[lineHash].touched) {
                    listRows[lineHash].touched = false;
                  }
                  if (!listRows[lineHash].calculatedKey) {
                    const keyWidth =
                      document.getElementsByClassName(
                        `kvl-key-${lineHash} unset`
                      )[0]?.clientWidth || 0;
                    if (keyWidth > 0) {
                      listRows[lineHash].key =
                        keyWidth + plugin.settings.horizontalPadding;
                      listRows[lineHash].calculatedKey = true;
                    }
                  } else if (!listRows[lineHash].calculatedValue) {
                    const valueWidth =
                      document.getElementsByClassName(
                        `kvl-value-${lineHash} unset`
                      )[0]?.clientWidth || 0;
                    if (valueWidth > 0) {
                      listRows[lineHash].value =
                        valueWidth + plugin.settings.horizontalPadding;
                      listRows[lineHash].calculatedValue = true;
                    }
                  } else if (!listRows[lineHash].completed) {
                    listRows[lineHash].completed = true;
                  }
                }
              });
            });
          }

          buildDecorations(view: EditorView, lists: List[]): DecorationSet {
            const builder = new RangeSetBuilder<Decoration>();
            if (!this.editor || excludeFileFromCssClasses(plugin)) {
              return builder.finish();
            }
            const cursor: EditorPosition = this.editor.getCursor();

            this.getListWidths(lists);
            const maxAllowedKeyWidth: number =
              (plugin.settings.maxKeyWidth / 100) * view.dom.clientWidth;
            const maxAllowedValueWidth: number =
              view.dom.clientWidth -
              maxAllowedKeyWidth -
              plugin.settings.horizontalPadding * 4;

            const markdownView =
              plugin.app.workspace.getActiveViewOfType(MarkdownView);

            lists.forEach((list: List, index: number) => {
              // Get the max widths of the key and the row for every line in the list.
              let maxKey = 0;
              let maxValue = 0;
              list.collectedHashes.forEach((hash: string) => {
                // if (listRows[hash].completed) {
                if (listRows[hash].key > maxKey) {
                  maxKey = listRows[hash].key;
                }
                if (listRows[hash].value > maxValue) {
                  maxValue = listRows[hash].value;
                }
                // }
              });
              let maxRow = Math.min(
                maxKey + maxValue + plugin.settings.horizontalPadding * 4,
                view.dom.clientWidth - 100
              );

              for (
                let lineNumber: number = list.start.line;
                lineNumber < list.end.line;
                lineNumber++
              ) {
                const line: Line = view.state.doc.line(lineNumber + 1);
                const lineHash = hashCode(line.text);
                if (lineNumber === cursor.line) {
                  if (listRows[lineHash]) {
                    listRows[lineHash] = {
                      ...listRows[lineHash],
                      touched: true,
                      calculatedKey: false,
                      calculatedValue: false,
                      completed: false,
                    };
                  }
                  continue;
                } else if (listRows[lineHash].touched) {
                  listRows[lineHash].touched = false;
                  listRows[lineHash].calculatedKey = false;
                  listRows[lineHash].calculatedValue = false;
                  listRows[lineHash].completed = false;
                }

                builder.add(
                  line.from,
                  line.to,
                  Decoration.replace({
                    widget: new KeyValueLineWidget({
                      plugin,
                      listId: index,
                      listIndex: lineNumber,
                      textLine: line.text,
                      listKeyWidth: maxKey,
                      listRowWidth: maxRow,
                      maxAllowedKeyWidth,
                      maxAllowedValueWidth,
                      listRow: listRows[lineHash],
                      editorWidth: view.dom.clientWidth,
                      path: markdownView?.file?.path || "",
                    }),
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
