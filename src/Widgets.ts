import { WidgetType } from "@codemirror/view";
import { ListItemWidth } from "./types";
import KeyValueListPlugin from "./main";

export class KeyValueLineWidget extends WidgetType {
  constructor(
    readonly plugin: KeyValueListPlugin,
    readonly maxKeyWidth: number,
    readonly padding: string,
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
        split + (this.plugin.settings.displayDelimiter ? delimiter.length : 0)
      )
      .trim();
    const val: string = this.value.substring(split + delimiter.length).trim();
    const isEven: boolean = this.listIndex % 2 == 0;

    const row = document.createElement("span");
    row.id = `kvl-${this.listId}-${this.listIndex}`;
    row.className = `kvl-row kvl-row-${this.listId} ${
      isEven ? "kvl-row-even" : "kvl-row-odd"
    }`;
    row.style.padding = this.padding;
    if (this.listItemWidth.row) {
      row.style.minWidth = `${this.listItemWidth.row}px`;
    }

    const rowInner = document.createElement("span");
    rowInner.className = `kvl-row-inner kvl-row-inner-${this.listId}`;

    let keySpan = document.createElement("strong");
    keySpan.className = `kvl-key kvl-key-${this.listId}`;
    if (this.listItemWidth.key) {
      keySpan.style.minWidth = `${this.listItemWidth.key}px`;
    }

    let keySpanInner = document.createElement("span");
    keySpanInner.innerHTML = key;
    if (this.maxKeyWidth > 0) {
      keySpanInner.style.maxWidth = `${this.maxKeyWidth}px`;
    }
    keySpanInner.className = `kvl-key-inner kvl-key-inner-${this.listId}`;

    let valueSpan = document.createElement("span");
    valueSpan.className = "kvl-value";
    valueSpan.innerHTML = `${val}`;

    row.appendChild(rowInner);
    rowInner.appendChild(keySpan);
    keySpan.appendChild(keySpanInner);
    rowInner.appendChild(valueSpan);
    return row;
  }

  ignoreEvent() {
    return false;
  }
}
