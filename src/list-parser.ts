import { Editor } from "obsidian";
import { List } from "./list";
import KeyValueListPlugin from "./main";
import { escapeRegExp } from "./utils";
import { DEFAULT_SETTINGS } from "./settings";

const listItemReg = new RegExp(`^[ \t]*(?:[-*+]|\\d+\\.)( |\t)`);

export class ListParser {
  keyValueReg: RegExp;
  liElemReg: RegExp;
  needsUpdate = false;

  constructor(private plugin: KeyValueListPlugin) {
    this.update();
  }

  update() {
    const bullet: string = "-";
    const delimiter: string = escapeRegExp(
      this.plugin.settings.delimiter || DEFAULT_SETTINGS.delimiter
    );
    this.keyValueReg = new RegExp(
      `^[ \t]*${bullet}(?![ \t]*[-*+])( |\t)(.*)${delimiter} (.*)`
    );
    this.liElemReg = new RegExp(`^(.*)${delimiter} (.*)`);
    this.needsUpdate = true;
  }

  /**
   * Collects all lists within a given range.
   * @param  {Editor} editor    The editor to parse.
   * @param  {Number} startLine The line to start parsing from.
   * @param  {Number} endLine   The line to stop parsing at.
   * @return {List[]}           A list of all lists found.
   * @public
   */
  collectLists(
    editor: Editor,
    startLine = 0,
    endLine: number = editor.lastLine()
  ): List[] {
    const lists: List[] = [];
    const cursorLine = editor.getCursor().line;

    for (
      let currentLine: number = startLine;
      currentLine <= endLine;
      currentLine++
    ) {
      const line = editor.getLine(currentLine);
      if (this.isLineList(line)) {
        let isKeyValueList = true;
        let hasCursorInside = false;

        let listEndLineLookup: number = currentLine;
        while (listEndLineLookup <= editor.lastLine()) {
          const line = editor.getLine(listEndLineLookup);
          // Check if the line is a list item
          if (!this.isLineList(line)) {
            break;
          }
          if (cursorLine === listEndLineLookup) {
            hasCursorInside = true;
          }

          // Check if the list item is a key-value list item (or the cursor is on the line)
          if (
            !this.isKeyValueListItem(line) &&
            cursorLine !== listEndLineLookup
          ) {
            isKeyValueList = false;
          }

          if (listEndLineLookup >= endLine) {
            listEndLineLookup = endLine;
            break;
          }
          listEndLineLookup++;
        }
        lists.push(
          new List(
            { line: currentLine, ch: 0 },
            {
              line: listEndLineLookup,
              ch: editor.getLine(listEndLineLookup).length,
            },
            isKeyValueList,
            hasCursorInside
          )
        );
        currentLine = listEndLineLookup;
      }
    }

    return lists;
  }

  private isLineList(line: string) {
    return listItemReg.test(line);
  }

  public isKeyValueLiElem(line: string) {
    return this.liElemReg.test(line);
  }

  public getKeyFromLiElem(line: string): string {
    return line.match(this.liElemReg)?.[1] || "";
  }

  public getValueFromLiElem(line: string): string {
    return line.match(this.liElemReg)?.[2] || "";
  }

  private isKeyValueListItem(line: string): boolean {
    return this.keyValueReg.test(line);
  }
}
