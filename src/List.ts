import { EditorPosition, EditorSelection } from "obsidian";

export class List {
	constructor(
		public start: EditorPosition,
		public end: EditorPosition,
		public isKeyValueList: boolean,
		public hasCursorInside: boolean
	) {}
}
