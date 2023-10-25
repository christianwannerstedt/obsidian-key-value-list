import { WidgetType } from "@codemirror/view";
import { ListItemWidth } from "./types";
import KeyValueListPlugin from "./main";
import { MarkdownRenderer } from "obsidian";
import { KeyValueListPluginSettings } from "./settings";

export class KeyValueLineWidget extends WidgetType {
  constructor(
    readonly plugin: KeyValueListPlugin,
    readonly listId: number,
    readonly listIndex: number,
    readonly textLine: string,
    readonly maxKeyWidth: number,
    readonly listItemWidth: ListItemWidth,
    readonly path: string
  ) {
    super();
  }

  // eq(other: TestWidget) {
  // 	// console.log("EQ: ", this.value, "==", other.value);
  // 	return other.value == this.value;
  // }

  toDOM() {
    const settings: KeyValueListPluginSettings = this.plugin.settings;
    const bullet: string = settings.bullet || "-";
    const delimiter: string = settings.delimiter || ":";
    const isEven: boolean = this.listIndex % 2 == 0;
    const split: number = this.textLine.indexOf(delimiter);
    const key: string = `${
      settings.displayBullet ? `\\${bullet} ` : ""
    } ${this.textLine
      .substring(
        bullet.length + 1,
        split + (settings.displayDelimiter ? delimiter.length : 0)
      )
      .trim()}`;
    const value: string = this.textLine
      .substring(split + delimiter.length)
      .trim();

    // Container
    const row = document.createElement("span");
    row.id = `kvl-${this.listId}-${this.listIndex}`;
    row.className = `kvl-row kvl-row-${this.listId} ${
      isEven ? "kvl-row-even" : "kvl-row-odd"
    } ${settings.stripedBackgroundType === "default" ? "striped" : ""}`;
    if (isEven && settings.stripedBackgroundType === "custom") {
      row.style.backgroundColor = settings.stripedBackgroundColor;
    }
    row.style.padding = `${settings.verticalPadding}px ${settings.horizontalPadding}px`;
    if (this.listItemWidth.row) {
      row.style.minWidth = `${this.listItemWidth.row}px`;
    }

    const rowInner = document.createElement("span");
    rowInner.className = `kvl-row-inner kvl-row-inner-${this.listId}`;

    // Key
    let keySpan = document.createElement(settings.boldKey ? "strong" : "span");
    keySpan.className = `kvl-key kvl-key-${this.listId}`;
    if (this.listItemWidth.key) {
      keySpan.style.minWidth = `${this.listItemWidth.key}px`;
    }

    let keySpanInner = document.createElement("span");
    if (this.maxKeyWidth > 0) {
      keySpanInner.style.maxWidth = `${this.maxKeyWidth}px`;
    }
    if (settings.isKeyColored) {
      keySpanInner.style.color = settings.keyColor;
    }
    keySpanInner.className = `kvl-key-inner kvl-key-inner-${this.listId}`;
    this.renderMarkdown(key, keySpanInner);

    // Value
    let valueSpan = document.createElement("span");
    valueSpan.className = "kvl-value";
    if (settings.isValueColored) {
      valueSpan.style.color = settings.valueColor;
    }
    this.renderMarkdown(value, valueSpan);

    row.appendChild(rowInner);
    rowInner.appendChild(keySpan);
    keySpan.appendChild(keySpanInner);
    rowInner.appendChild(valueSpan);
    return row;
  }

  renderMarkdown(html: string, container: HTMLElement) {
    MarkdownRenderer.render(
      this.plugin.app,
      html,
      container,
      this.path,
      this.plugin
    );
  }

  ignoreEvent() {
    return false;
  }
}
