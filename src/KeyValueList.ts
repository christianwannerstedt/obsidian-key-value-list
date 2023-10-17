// import { Plugin_2 } from "obsidian";

import { syntaxTree, SyntaxNodeRef } from "@codemirror/language";
import { RangeSetBuilder } from "@codemirror/state";
import {
	Decoration,
	DecorationSet,
	EditorView,
	PluginSpec,
	PluginValue,
	ViewPlugin,
	ViewUpdate,
} from "@codemirror/view";
import { KeyValueLineWidget } from "src/Widgets";
import { ListParser } from "src/ListParser";
import { List } from "./List";
import KeyValueListPlugin from "main";
import { Editor, editorInfoField } from "obsidian";
import { ListItemWidth } from "./types";

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
		this.parser = new ListParser();
		this.view = view;
		this.listWidths = [];
		this.needsUpdate = true;
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
			lists = this.parser
				.collectLists(this.editor, fromLine, toLine)
				.filter((list: List) => list.isKeyValueList);
		}

		if (lists.length != this.listWidths.length) {
			this.listWidths = lists.map(() => ({ key: 0, row: 0 }));
		}

		const touchedListIndex: number = lists.findIndex(
			(list) => list.hasCursorInside
		);
		const isAnyListTouched: boolean = touchedListIndex >= 0;
		if (isAnyListTouched) {
			this.updateCounter = 2;
		}
		if (touchedListIndex === -1 && this.lastTouchedListIndex !== -1) {
			this.listWidths[this.lastTouchedListIndex] = { key: 0, row: 0 };
			this.needsUpdate = true;
			if (--this.updateCounter === 0) {
				this.lastTouchedListIndex = -1;
			}
		} else if (isAnyListTouched) {
			this.lastTouchedListIndex = touchedListIndex;
		}

		if (
			update.docChanged ||
			update.viewportChanged ||
			isAnyListTouched ||
			this.needsUpdate
		) {
			this.decorations = this.buildDecorations(update.view, lists);
		}
	}

	destroy() {}

	buildDecorations(view: EditorView, lists: List[]): DecorationSet {
		const builder = new RangeSetBuilder<Decoration>();

		lists.forEach((list: List, index: number) => {
			// Get the max width of the key and the row for every line in the list.
			const maxWidth: number = Math.max(
				this.listWidths[index].key,
				...Array.from(
					document.getElementsByClassName(`kv-list-inner-${index}`)
				).map((elem) => elem.clientWidth + 20)
			);
			if (index == 0) {
				const tmpMaxWidth: number = Math.max(
					...Array.from(
						document.getElementsByClassName(
							`kv-list-inner-${index}`
						)
					).map((elem) => elem.clientWidth + 20)
				);
			}

			const maxRowWidth: number = Math.max(
				this.listWidths[index].row,
				...Array.from(
					document.getElementsByClassName(`kv-list-row-${index}`)
				).map((elem) => elem.clientWidth)
			);

			const listWidth = { key: maxWidth, row: maxRowWidth };
			this.listWidths[index] = listWidth;

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
									index,
									substring,
									listWidth,
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
}

const pluginSpec: PluginSpec<KVLPlugin> = {
	decorations: (value: KVLPlugin) => value.decorations,
};

export class KeyValueList {
	constructor(private plugin: KeyValueListPlugin) {
		console.log("Init KeyValueList");
	}

	async load() {
		this.plugin.registerEditorExtension(
			ViewPlugin.fromClass(KVLPlugin, pluginSpec)
		);
	}

	async unload() {}
}
