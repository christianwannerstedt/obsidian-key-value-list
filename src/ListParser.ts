import { Editor } from "obsidian";
import { List } from "./List";

const keyValueReg = new RegExp(`^[ \t]*(?:[-*+])( |\t)(.*)\:(.*) (.*)`);
const listItemReg = new RegExp(`^[ \t]*(?:[-*+]|\\d+\\.)( |\t)`);

export class ListParser {
	constructor() {}

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
		startLine: number = 0,
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
				let isKeyValueList: boolean = true;
				let hasCursorInside: boolean = false;
				let listStartLine: number = currentLine;

				let listEndLineLookup: number = listStartLine;
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
						{ line: listStartLine, ch: 0 },
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

	private isKeyValueListItem(line: string): boolean {
		return keyValueReg.test(line);
	}
}
