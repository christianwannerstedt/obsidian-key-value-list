import { WidgetType } from "@codemirror/view";
import { KeyValuePiece, ListItemWidth } from "./types";
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

  eq(other: KeyValueLineWidget) {
    return (
      this.listId === other.listId &&
      this.listIndex === other.listIndex &&
      this.textLine === other.textLine &&
      this.maxKeyWidth === other.maxKeyWidth &&
      this.listItemWidth === other.listItemWidth &&
      this.path === other.path
    );
  }

  toDOM() {
    const settings: KeyValueListPluginSettings = this.plugin.settings;
    const isEven: boolean = this.listIndex % 2 == 0;
    const pieces: KeyValuePiece = this.plugin.parser.getPiecesFromString(
      this.textLine
    );

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
    const keySpan = document.createElement(
      settings.boldKey ? "strong" : "span"
    );
    keySpan.className = `kvl-key kvl-key-${this.listId}`;
    if (this.listItemWidth.key) {
      keySpan.style.minWidth = `${this.listItemWidth.key}px`;
    }

    const keySpanInner = document.createElement("span");
    if (this.maxKeyWidth > 0) {
      keySpanInner.style.maxWidth = `${this.maxKeyWidth}px`;
    }
    if (settings.isKeyColored) {
      keySpanInner.style.color = settings.keyColor;
    }
    keySpanInner.className = `kvl-key-inner kvl-key-inner-${this.listId}`;
    this.renderMarkdown(pieces.key, keySpanInner);

    // Value
    const valueSpan = document.createElement("span");
    valueSpan.className = "kvl-value";
    if (settings.isValueColored) {
      valueSpan.style.color = settings.valueColor;
    }

    this.renderMarkdown(pieces.value, valueSpan);

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
