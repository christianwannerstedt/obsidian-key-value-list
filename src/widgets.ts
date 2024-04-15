import { WidgetType } from "@codemirror/view";
import { KeyValuePiece, ListItemWidth, ListRow } from "./types";
import KeyValueListPlugin from "./main";
import { MarkdownRenderer } from "obsidian";
import { KeyValueListPluginSettings } from "./settings";

export class KeyValueLineWidget extends WidgetType {
  constructor(
    readonly options // readonly plugin: KeyValueListPlugin, // readonly listId: number, // readonly listIndex: number, // readonly textLine: string, // readonly listKeyWidth: number, // readonly listRowWidth: number, // readonly listRow: ListRow, // readonly editorWidth: number, // // readonly maxKeyWidth: number, // // readonly listItemWidth: ListItemWidth, // readonly path: string
  ) {
    super();
  }

  eq(other: KeyValueLineWidget) {
    return false;
    // return (
    //   this.options.listId === other.options.listId &&
    //   this.options.listIndex === other.options.listIndex &&
    //   this.options.textLine === other.options.textLine &&
    //   this.options.editorWidth === other.options.editorWidth &&
    //   this.options.path === other.options.path &&
    //   this.options.listKeyWidth === other.options.listKeyWidth &&
    //   this.options.listRowWidth === other.options.listRowWidth &&
    //   this.options.maxAllowedKeyWidth === other.options.maxAllowedKeyWidth &&
    //   this.options.maxAllowedValueWidth ===
    //     other.options.maxAllowedValueWidth &&
    //   this.options.listRow.hash === other.options.listRow.hash &&
    //   this.options.listRow.key === other.options.listRow.key &&
    //   this.options.listRow.value === other.options.listRow.value &&
    //   this.options.listRow.touched === other.options.listRow.touched &&
    //   this.options.listRow.completed === other.options.listRow.completed &&
    //   this.options.listRow.calculatedKey ===
    //     other.options.listRow.calculatedKey &&
    //   this.options.listRow.calculatedValue ===
    //     other.options.listRow.calculatedValue &&
    //   this.options.editorWidth === other.options.editorWidth
    // );
  }

  toDOM() {
    const {
      listId,
      listIndex,
      listRow,
      listKeyWidth,
      listRowWidth,
      maxAllowedValueWidth,
      plugin,
      textLine,
      editorWidth,
    } = this.options;

    const settings: KeyValueListPluginSettings = plugin.settings;
    const isEven: boolean = listIndex % 2 == 0;
    const pieces: KeyValuePiece = plugin.parser.getPiecesFromString(textLine);

    // Container
    const row = document.createElement("span");
    row.id = `kvl-${listId}-${listIndex}`;
    row.className = `kvl-row kvl-row-${listId} ${
      isEven ? "kvl-row-even" : "kvl-row-odd"
    } ${settings.stripedBackgroundType === "default" ? "striped" : ""}`;
    if (isEven && settings.stripedBackgroundType === "custom") {
      row.style.backgroundColor = settings.stripedBackgroundColor;
    }
    row.style.padding = `${settings.verticalPadding}px ${settings.horizontalPadding}px`;

    if (!listRow.calculatedKey || !listRow.calculatedValue) {
      row.style.width = `${editorWidth}px`;
    }

    if (listRowWidth && listRow.completed) {
      row.style.minWidth = `${Math.min(editorWidth, listRowWidth)}px`;
    }

    const rowInner = document.createElement("span");
    rowInner.className = `kvl-row-inner kvl-row-inner-${listId}`;

    // Key
    const keySpan = document.createElement(
      settings.boldKey ? "strong" : "span"
    );
    keySpan.className = `kvl-key kvl-key-${listId} kvl-key-${listRow.hash}`;
    if (listKeyWidth && listRow.calculatedKey) {
      keySpan.style.minWidth = `${listKeyWidth}px`;
    } else {
      keySpan.className += ` unset`;
    }

    const keySpanInner = document.createElement("span");
    if (settings.isKeyColored) {
      keySpanInner.style.color = settings.keyColor;
    }
    keySpanInner.className = `kvl-key-inner kvl-key-inner-${listId}`;
    this.renderMarkdown(pieces.key, keySpanInner);

    // Value
    const valueSpan = document.createElement("span");
    valueSpan.className = `kvl-value kvl-value-${listRow.hash}`;
    if (settings.isValueColored) {
      valueSpan.style.color = settings.valueColor;
    }
    if (listRow.calculatedValue) {
      valueSpan.style.minWidth = `${Math.min(
        listRow.value,
        maxAllowedValueWidth
      )}px`;
    } else {
      valueSpan.className += ` unset`;
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
      this.options.plugin.app,
      html,
      container,
      this.options.path,
      this.options.plugin
    );
  }

  ignoreEvent() {
    return false;
  }
}
