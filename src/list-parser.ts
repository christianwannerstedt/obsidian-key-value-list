import { Editor } from "obsidian";
import { List } from "./list";
import KeyValueListPlugin from "./main";
import { escapeRegExp, removeInvalidHtmlTags } from "./utils";
import { DEFAULT_SETTINGS } from "./settings";
import { KeyValuePiece } from "./types";

const listItemReg = new RegExp(`^[ \t]*-(.*)`);

export class ListParser {
  keyValueReg: RegExp;
  liElemReg: RegExp;
  needsUpdate = false;

  constructor(private plugin: KeyValueListPlugin) {
    this.update();
  }

  update() {
    const bullet = "-";
    const delimiter: string = escapeRegExp(
      this.plugin.settings.delimiter || DEFAULT_SETTINGS.delimiter
    );
    // Trim spaces and tabs from the delimiter
    const delimiters = delimiter
      .split(",")
      .map((d) => d.trim()) //escapeRegExp(d).trim())
      .join("|");
    this.keyValueReg = new RegExp(
      `^[ \t]*${bullet}(.*[^:])(${delimiters}) (.*)`
    );
    this.liElemReg = new RegExp(`^(.*[^:])(${delimiters}) (.*)$`);
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
    return this.liElemReg.test(line.replace("<br>", "\n"));
  }

  public getPiecesFromLiElem(listItem: Element): KeyValuePiece {
    const match = listItem.innerHTML
      .replace("\n", " ")
      .trim()
      .replace("&gt;", ">")
      .replace("&lt;", "<")
      .match(this.liElemReg);

    let key = match?.[1] || "";
    if (this.plugin.settings.displayBullet) {
      key = `${this.plugin.settings.displayBulletChar} ${key}`;
    }

    const delimiter = (match?.[2] || "")
      .replace(">", "&gt;")
      .replace("<", "&lt;");
    if (this.plugin.settings.displayDelimiter) {
      key = `${key}${delimiter}`;
    }

    return {
      key: removeInvalidHtmlTags(key),
      delimiter,
      value: removeInvalidHtmlTags(match?.[3] || ""),
    };
  }

  public getPiecesFromString(line: string): KeyValuePiece {
    const match = line
      .replace("&gt;", ">")
      .replace("&lt;", "<")
      .match(this.liElemReg);

    let key = (match?.[1] || "").substring(2);
    if (this.plugin.settings.displayBullet) {
      key = `\\${this.plugin.settings.displayBulletChar} ${key}`;
    }

    // We need to handle rows starting with a checkbox
    if (!this.plugin.settings.displayBullet && key.charAt(0) === "[") {
      key = `- ${key}`;
    } else if (this.plugin.settings.displayBullet && key.startsWith("\\- [")) {
      key = key.substring(1);
    }

    const delimiter = (match?.[2] || "")
      .replace(">", "&gt;")
      .replace("<", "&lt;");
    if (this.plugin.settings.displayDelimiter) {
      key = `${key}${delimiter}`;
    }

    // Escape any footnotes in the value. A foot note is a number after the ^ symbol in square brackets.
    // Example: This is a footnote[^1]
    const value = (match?.[3] || "").replace(/\[(\^\d+)\]/g, "\\$1");

    return {
      key,
      delimiter,
      value,
    };
  }

  private isKeyValueListItem(line: string): boolean {
    return this.keyValueReg.test(line);
  }
}
