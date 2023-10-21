import { WidgetType } from "@codemirror/view";
import { ListItemWidth } from "./types";
import KeyValueListPlugin from "./main";

export class KeyValueLineWidget extends WidgetType {
	constructor(
		readonly plugin: KeyValueListPlugin,
		readonly listId: number,
		readonly value: string,
		readonly listItemWidth: ListItemWidth,
		readonly listIndex: number
	) {
		super();
	}

	// eq(other: TestWidget) {
	// 	// console.log("EQ: ", this.value, "==", other.value);
	// 	return other.value == this.value;
	// }

	toDOM() {
		const delimiter = this.plugin.settings.delimiter || ":";
		const split: number = this.value.indexOf(delimiter);
		const key: string = this.value
			.substring(
				0,
				split +
					(this.plugin.settings.displayDelimiter
						? delimiter.length
						: 0)
			)
			.trim();
		const val: string = this.value
			.substring(split + delimiter.length)
			.trim();
		const isEven: boolean = this.listIndex % 2 == 0;

		const container = document.createElement("span");
		container.id = `kv-${this.listId}-${this.listIndex}`;
		container.style.display = "inline-block";
		container.className = `kv-list-row kv-list-row-${this.listId} ${
			isEven ? "kv-list-row-even" : "kv-list-row-odd"
		}`;
		if (this.listItemWidth.row) {
			container.style.minWidth = `${this.listItemWidth.row}px`;
		}

		let keySpan = document.createElement("strong");
		keySpan.className = `kv-list kv-list-${this.listId}`;
		keySpan.style.display = "inline-block";
		if (this.listItemWidth.key) {
			keySpan.style.minWidth = `${this.listItemWidth.key}px`;
		}

		let keySpanInner = document.createElement("span");
		keySpanInner.innerHTML = key;
		keySpanInner.style.display = "inline-block";
		keySpanInner.className = `kv-list-inner kv-list-inner-${this.listId}`;

		let valueSpan = document.createElement("span");
		valueSpan.innerHTML = `${val}`;
		container.appendChild(keySpan);
		keySpan.appendChild(keySpanInner);
		container.appendChild(valueSpan);
		return container;
	}

	ignoreEvent() {
		return false;
	}
}
