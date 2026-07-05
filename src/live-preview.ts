import { EditorState, RangeSetBuilder, StateEffect } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import {
  App,
  Component,
  Editor,
  MarkdownRenderer,
  MarkdownView,
  TFile,
  editorInfoField,
  editorLivePreviewField,
} from "obsidian";
import { isActiveForFile } from "./css-classes";
import KeyValueListPlugin from "./main";
import { getFencedCodeBlockLines } from "./code-context";
import { ScannedList, scanKeyValueLists } from "./list-scanner";
import {
  buildKeyValueLineRegex,
  KeyValuePiece,
  ListAlignment,
  resolveListAlignment,
  splitKeyValueLine,
} from "./parser";
import { getElementFont, measureTextWidth } from "./measure";
import { applyRowDepth } from "./renderer";
import { KeyValueListPluginSettings } from "./settings";

// Approximate space used by the list bullet/indent before our widget content.
const LIST_INDENT_PX = 32;

export const kvlSettingsEffect = StateEffect.define<null>();

export function refreshLivePreviewDecorations(app: App): void {
  app.workspace.iterateAllLeaves((leaf) => {
    const view = leaf.view;
    if (!(view instanceof MarkdownView)) return;

    const editorView = getEditorView(view.editor);
    if (!editorView) return;

    editorView.dispatch({
      effects: kvlSettingsEffect.of(null),
    });
  });
}

function getEditorView(editor: Editor): EditorView | null {
  const cm = (editor as Editor & { cm?: EditorView }).cm;
  return cm ?? null;
}

function buildRenderKey(settings: KeyValueListPluginSettings): string {
  return JSON.stringify(settings);
}

function getLivePreviewParseSettings(
  settings: KeyValueListPluginSettings
): KeyValueListPluginSettings {
  return {
    ...settings,
    displayBullet: false,
    displayDelimiter: false,
  };
}

class KvlRowWidget extends WidgetType {
  private readonly renderKey: string;
  private readonly renderComponent = new Component();
  private readonly pendingRenders: Promise<unknown>[] = [];

  constructor(
    private readonly plugin: KeyValueListPlugin,
    private readonly lineText: string,
    private readonly rowIndex: number,
    private readonly depth: number,
    private readonly keyWidth: number,
    private readonly listRowWidth: number,
    private readonly needsKeyWrap: boolean,
    private readonly listAlignment: ListAlignment,
    private readonly path: string,
    private readonly settings: KeyValueListPluginSettings
  ) {
    super();
    this.renderKey = buildRenderKey(settings);
  }

  eq(other: KvlRowWidget): boolean {
    return (
      other instanceof KvlRowWidget &&
      this.lineText === other.lineText &&
      this.rowIndex === other.rowIndex &&
      this.depth === other.depth &&
      this.keyWidth === other.keyWidth &&
      this.listRowWidth === other.listRowWidth &&
      this.needsKeyWrap === other.needsKeyWrap &&
      this.listAlignment.keyRight === other.listAlignment.keyRight &&
      this.listAlignment.valueRight === other.listAlignment.valueRight &&
      this.path === other.path &&
      this.renderKey === other.renderKey
    );
  }

  toDOM(view: EditorView): HTMLElement {
    this.renderComponent.load();
    const doc = view?.dom?.ownerDocument ?? document;
    const pieces = splitKeyValueLine(
      this.lineText,
      getLivePreviewParseSettings(this.settings)
    );
    if (!pieces) {
      const fallback = doc.createElement("span");
      fallback.textContent = this.lineText;
      return fallback;
    }

    const row = doc.createElement("span");
    row.className = "kvl-live-row";
    row.classList.add(
      this.rowIndex % 2 === 0 ? "kvl-row-odd" : "kvl-row-even"
    );
    applyRowStyles(
      row,
      this.settings,
      this.keyWidth,
      this.listRowWidth,
      this.needsKeyWrap,
      this.listAlignment
    );
    applyRowDepth(row, this.depth);

    const keyCell = doc.createElement("span");
    keyCell.className = "kvl-key";
    const keyInner = doc.createElement(
      this.settings.boldKey ? "strong" : "span"
    );
    keyInner.className = "kvl-key-inner";
    this.populateKeyCell(keyInner, pieces, doc);
    keyCell.appendChild(keyInner);

    const valueCell = doc.createElement("span");
    valueCell.className = "kvl-value";
    this.renderMarkdown(pieces.value, valueCell);

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    return row;
  }

  private populateKeyCell(
    keyInner: HTMLElement,
    pieces: KeyValuePiece,
    doc: Document
  ): void {
    if (this.settings.displayBullet) {
      keyInner.appendChild(
        doc.createTextNode(`${this.settings.displayBulletChar} `)
      );
    }

    this.renderMarkdown(pieces.key, keyInner);

    if (this.settings.displayDelimiter) {
      keyInner.appendChild(doc.createTextNode(pieces.delimiter));
    }
  }

  private renderMarkdown(markdown: string, container: HTMLElement): void {
    this.pendingRenders.push(
      MarkdownRenderer.render(
        this.plugin.app,
        markdown,
        container,
        this.path,
        this.renderComponent
      )
    );
  }

  ignoreEvent(): boolean {
    return false;
  }

  destroy(): void {
    void Promise.all(this.pendingRenders).finally(() => {
      this.renderComponent.unload();
    });
  }
}

function applyRowStyles(
  row: HTMLElement,
  settings: KeyValueListPluginSettings,
  keyWidth: number,
  listRowWidth: number,
  needsKeyWrap: boolean,
  alignment: ListAlignment
): void {
  row.style.setProperty("--kvl-v-pad", `${settings.verticalPadding}px`);
  row.style.setProperty("--kvl-h-pad", `${settings.horizontalPadding}px`);
  row.style.setProperty("--kvl-key-width", `${keyWidth}px`);
  row.style.setProperty("--kvl-row-width", `${listRowWidth}px`);

  if (needsKeyWrap) {
    row.classList.add("kvl-key-wrap");
  }

  if (settings.isKeyColored && settings.keyColor) {
    row.style.setProperty("--kvl-key-color", settings.keyColor);
    row.classList.add("kvl-key-colored");
  }

  if (settings.isValueColored && settings.valueColor) {
    row.style.setProperty("--kvl-value-color", settings.valueColor);
    row.classList.add("kvl-value-colored");
  }

  if (settings.stripedBackgroundType === "default") {
    row.classList.add("kvl-striped-default");
  } else if (settings.stripedBackgroundType === "custom") {
    row.classList.add("kvl-striped-custom");
    if (
      settings.stripedBackgroundColor &&
      row.classList.contains("kvl-row-even")
    ) {
      row.style.setProperty(
        "--kvl-stripe-bg",
        settings.stripedBackgroundColor
      );
    }
  }

  if (alignment.keyRight) {
    row.classList.add("kvl-key-right");
  }

  if (alignment.valueRight) {
    row.classList.add("kvl-value-right");
  }
}

interface ListKeyWidth {
  width: number;
  needsWrap: boolean;
}

function measureRenderedKeyWidth(
  pieces: KeyValuePiece,
  settings: KeyValueListPluginSettings,
  font: string,
  doc: Document
): number {
  let width = measureTextWidth(pieces.key, font, doc);

  if (settings.displayBullet) {
    width += measureTextWidth(`${settings.displayBulletChar} `, font, doc);
  }

  if (settings.displayDelimiter) {
    width += measureTextWidth(pieces.delimiter, font, doc);
  }

  return width;
}

function computeListKeyWidth(
  list: ScannedList,
  settings: KeyValueListPluginSettings,
  font: string,
  contentWidth: number,
  doc: Document
): ListKeyWidth {
  let max = 0;
  const parseSettings = getLivePreviewParseSettings(settings);

  for (const line of list.lines) {
    const pieces = splitKeyValueLine(line, parseSettings);
    if (pieces) {
      max = Math.max(
        max,
        measureRenderedKeyWidth(pieces, settings, font, doc)
      );
    }
  }

  const naturalWidth = Math.ceil(max) + 2;
  if (settings.maxKeyWidth <= 0) {
    return { width: naturalWidth, needsWrap: false };
  }

  const cap = Math.floor((settings.maxKeyWidth / 100) * contentWidth);
  if (naturalWidth > cap) {
    return { width: cap, needsWrap: true };
  }

  return { width: naturalWidth, needsWrap: false };
}

function computeListRowWidth(
  list: ScannedList,
  settings: KeyValueListPluginSettings,
  font: string,
  keyWidth: number,
  contentWidth: number,
  alignment: ListAlignment,
  doc: Document
): number {
  const maxAvailable = contentWidth - LIST_INDENT_PX;
  let maxRowWidth = 0;
  const parseSettings = getLivePreviewParseSettings(settings);
  const columnGap = alignment.keyRight ? settings.horizontalPadding : 0;

  for (const line of list.lines) {
    const pieces = splitKeyValueLine(line, parseSettings);
    if (!pieces) continue;

    const valueWidth = measureTextWidth(pieces.value, font, doc);
    const rowWidth =
      keyWidth + valueWidth + settings.horizontalPadding * 2 + columnGap;
    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  return Math.min(Math.ceil(maxRowWidth), maxAvailable);
}

function isLivePreviewActive(state: EditorState): boolean {
  try {
    return state.field(editorLivePreviewField);
  } catch {
    return false;
  }
}

export function registerLivePreview(plugin: KeyValueListPlugin): void {
  plugin.registerEditorExtension(
    ViewPlugin.fromClass(
      class KvlLivePreviewPlugin implements PluginValue {
        decorations: DecorationSet = Decoration.none;

        constructor(private view: EditorView) {
          this.decorations = this.buildDecorations(this.view);
        }

        update(update: ViewUpdate): void {
          const livePreviewChanged =
            isLivePreviewActive(update.startState) !==
            isLivePreviewActive(update.state);

          if (
            livePreviewChanged ||
            update.docChanged ||
            update.viewportChanged ||
            update.selectionSet ||
            update.geometryChanged ||
            update.transactions.some((tr) =>
              tr.effects.some((effect) => effect.is(kvlSettingsEffect))
            )
          ) {
            this.decorations = this.buildDecorations(update.view);
          }
        }

        private buildDecorations(view: EditorView): DecorationSet {
          if (!isLivePreviewActive(view.state)) {
            return Decoration.none;
          }

          let file: TFile | null = null;
          try {
            file = view.state.field(editorInfoField).file ?? null;
          } catch {
            return Decoration.none;
          }

          if (
            !file ||
            !isActiveForFile(
              plugin.app,
              file.path,
              "edit",
              plugin.settings
            )
          ) {
            return Decoration.none;
          }

          const contentWidth = view.contentDOM.clientWidth;
          if (contentWidth <= 0) {
            return Decoration.none;
          }

          const lineRegex = buildKeyValueLineRegex(plugin.settings);
          const doc = view.state.doc;
          const fromLine = doc.lineAt(view.viewport.from).number;
          const toLine = doc.lineAt(view.viewport.to).number;
          const cursorLine = doc.lineAt(view.state.selection.main.head).number;
          const codeBlockLines = getFencedCodeBlockLines(doc, toLine);
          const lists = scanKeyValueLists(
            doc,
            fromLine,
            toLine,
            lineRegex,
            (lineNumber) => codeBlockLines.has(lineNumber)
          );

          if (lists.length === 0) {
            return Decoration.none;
          }

          const sampleLine = view.contentDOM.querySelector(".cm-line");
          const font = getElementFont(
            (sampleLine as HTMLElement) ?? view.contentDOM,
            plugin.settings.boldKey ? "bold" : undefined
          );
          const path = file?.path ?? "";
          const builder = new RangeSetBuilder<Decoration>();

          for (const list of lists) {
            const listAlignment = resolveListAlignment(
              list.lines,
              plugin.settings
            );
            const { width: keyWidth, needsWrap: needsKeyWrap } =
              computeListKeyWidth(
                list,
                plugin.settings,
                font,
                contentWidth,
                view.dom.ownerDocument
              );
            const listRowWidth = computeListRowWidth(
              list,
              plugin.settings,
              font,
              keyWidth,
              contentWidth,
              listAlignment,
              view.dom.ownerDocument
            );

            for (
              let lineNumber = list.startLine;
              lineNumber <= list.endLine;
              lineNumber++
            ) {
              if (lineNumber === cursorLine) continue;

              const line = doc.line(lineNumber);
              const rowIndex = lineNumber - list.startLine;
              builder.add(
                line.from,
                line.to,
                Decoration.replace({
                  widget: new KvlRowWidget(
                    plugin,
                    line.text,
                    rowIndex,
                    list.depths[rowIndex] ?? 0,
                    keyWidth,
                    listRowWidth,
                    needsKeyWrap,
                    listAlignment,
                    path,
                    plugin.settings
                  ),
                })
              );
            }
          }

          return builder.finish();
        }
      },
      {
        decorations: (value) => value.decorations,
      }
    )
  );
}
