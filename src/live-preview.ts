import { RangeSetBuilder, StateEffect } from "@codemirror/state";
import {
  Decoration,
  DecorationSet,
  EditorView,
  PluginValue,
  ViewPlugin,
  ViewUpdate,
  WidgetType,
} from "@codemirror/view";
import { App, Editor, MarkdownRenderer, MarkdownView, TFile, editorInfoField } from "obsidian";
import KeyValueListPlugin from "./main";
import { ScannedList, scanKeyValueLists } from "./list-scanner";
import {
  buildKeyValueLineRegex,
  KeyValuePiece,
  parseDelimiters,
  splitKeyValueLine,
} from "./parser";
import { getElementFont, measureTextWidth } from "./measure";
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

function buildRenderKey(
  settings: KeyValueListPluginSettings,
  lineRegex: RegExp
): string {
  return JSON.stringify(settings) + lineRegex.source + lineRegex.flags;
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

  constructor(
    private readonly plugin: KeyValueListPlugin,
    private readonly lineText: string,
    private readonly rowIndex: number,
    private readonly keyWidth: number,
    private readonly listRowWidth: number,
    private readonly needsKeyWrap: boolean,
    private readonly path: string,
    private readonly settings: KeyValueListPluginSettings,
    private readonly lineRegex: RegExp
  ) {
    super();
    this.renderKey = buildRenderKey(settings, lineRegex);
  }

  eq(other: KvlRowWidget): boolean {
    return (
      other instanceof KvlRowWidget &&
      this.lineText === other.lineText &&
      this.rowIndex === other.rowIndex &&
      this.keyWidth === other.keyWidth &&
      this.listRowWidth === other.listRowWidth &&
      this.needsKeyWrap === other.needsKeyWrap &&
      this.path === other.path &&
      this.renderKey === other.renderKey
    );
  }

  toDOM(): HTMLElement {
    const pieces = splitKeyValueLine(
      this.lineText,
      this.lineRegex,
      getLivePreviewParseSettings(this.settings)
    );
    if (!pieces) {
      const fallback = document.createElement("span");
      fallback.textContent = this.lineText;
      return fallback;
    }

    const row = document.createElement("span");
    row.className = "kvl-live-row";
    row.classList.add(
      this.rowIndex % 2 === 0 ? "kvl-row-odd" : "kvl-row-even"
    );
    applyRowStyles(
      row,
      this.settings,
      this.keyWidth,
      this.listRowWidth,
      this.needsKeyWrap
    );

    const keyCell = document.createElement("span");
    keyCell.className = "kvl-key";
    const keyInner = document.createElement(
      this.settings.boldKey ? "strong" : "span"
    );
    keyInner.className = "kvl-key-inner";
    this.populateKeyCell(keyInner, pieces);
    keyCell.appendChild(keyInner);

    const valueCell = document.createElement("span");
    valueCell.className = "kvl-value";
    this.renderMarkdown(pieces.value, valueCell);

    row.appendChild(keyCell);
    row.appendChild(valueCell);
    return row;
  }

  private populateKeyCell(keyInner: HTMLElement, pieces: KeyValuePiece): void {
    if (this.settings.displayBullet) {
      keyInner.appendChild(
        document.createTextNode(`${this.settings.displayBulletChar} `)
      );
    }

    this.renderMarkdown(pieces.key, keyInner);

    if (this.settings.displayDelimiter) {
      keyInner.appendChild(document.createTextNode(pieces.delimiter));
    }
  }

  private renderMarkdown(markdown: string, container: HTMLElement): void {
    MarkdownRenderer.render(
      this.plugin.app,
      markdown,
      container,
      this.path,
      this.plugin
    );
  }

  ignoreEvent(): boolean {
    return false;
  }
}

function applyRowStyles(
  row: HTMLElement,
  settings: KeyValueListPluginSettings,
  keyWidth: number,
  listRowWidth: number,
  needsKeyWrap: boolean
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
}

interface ListKeyWidth {
  width: number;
  needsWrap: boolean;
}

function measureRenderedKeyWidth(
  pieces: KeyValuePiece,
  settings: KeyValueListPluginSettings,
  font: string
): number {
  let width = measureTextWidth(pieces.key, font);

  if (settings.displayBullet) {
    width += measureTextWidth(`${settings.displayBulletChar} `, font);
  }

  if (settings.displayDelimiter) {
    width += measureTextWidth(pieces.delimiter, font);
  }

  return width;
}

function computeListKeyWidth(
  list: ScannedList,
  lineRegex: RegExp,
  settings: KeyValueListPluginSettings,
  font: string,
  contentWidth: number
): ListKeyWidth {
  let max = 0;
  const parseSettings = getLivePreviewParseSettings(settings);

  for (const line of list.lines) {
    const pieces = splitKeyValueLine(line, lineRegex, parseSettings);
    if (pieces) {
      max = Math.max(max, measureRenderedKeyWidth(pieces, settings, font));
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
  lineRegex: RegExp,
  settings: KeyValueListPluginSettings,
  font: string,
  keyWidth: number,
  contentWidth: number
): number {
  const maxAvailable = contentWidth - LIST_INDENT_PX;
  let maxRowWidth = 0;
  const parseSettings = getLivePreviewParseSettings(settings);

  for (const line of list.lines) {
    const pieces = splitKeyValueLine(line, lineRegex, parseSettings);
    if (!pieces) continue;

    const valueWidth = measureTextWidth(pieces.value, font);
    const rowWidth =
      keyWidth + valueWidth + settings.horizontalPadding * 2;
    maxRowWidth = Math.max(maxRowWidth, rowWidth);
  }

  return Math.min(Math.ceil(maxRowWidth), maxAvailable);
}

function isFileExcluded(
  plugin: KeyValueListPlugin,
  file: TFile | null
): boolean {
  if (!file) return false;

  const cache = plugin.app.metadataCache.getFileCache(file);
  const frontmatter = cache?.frontmatter;
  if (!frontmatter) return false;

  const classes = frontmatter.cssclasses ?? frontmatter.cssclass;
  if (!classes) return false;

  const classList = Array.isArray(classes) ? classes : [classes];
  return classList.includes("nokeyvalue");
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
          if (
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
          if (!plugin.settings.activeInEditMode) {
            return Decoration.none;
          }

          let file: TFile | null = null;
          try {
            file = view.state.field(editorInfoField).file ?? null;
          } catch {
            return Decoration.none;
          }

          if (isFileExcluded(plugin, file)) {
            return Decoration.none;
          }

          const contentWidth = view.contentDOM.clientWidth;
          if (contentWidth <= 0) {
            return Decoration.none;
          }

          const delimiters = parseDelimiters(plugin.settings.delimiter);
          const lineRegex = buildKeyValueLineRegex(delimiters);
          const doc = view.state.doc;
          const fromLine = doc.lineAt(view.viewport.from).number;
          const toLine = doc.lineAt(view.viewport.to).number;
          const cursorLine = doc.lineAt(view.state.selection.main.head).number;
          const lists = scanKeyValueLists(doc, fromLine, toLine, lineRegex);

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
            const { width: keyWidth, needsWrap: needsKeyWrap } =
              computeListKeyWidth(
                list,
                lineRegex,
                plugin.settings,
                font,
                contentWidth
              );
            const listRowWidth = computeListRowWidth(
              list,
              lineRegex,
              plugin.settings,
              font,
              keyWidth,
              contentWidth
            );

            for (
              let lineNumber = list.startLine;
              lineNumber <= list.endLine;
              lineNumber++
            ) {
              if (lineNumber === cursorLine) continue;

              const line = doc.line(lineNumber);
              builder.add(
                line.from,
                line.to,
                Decoration.replace({
                  widget: new KvlRowWidget(
                    plugin,
                    line.text,
                    lineNumber - list.startLine,
                    keyWidth,
                    listRowWidth,
                    needsKeyWrap,
                    path,
                    plugin.settings,
                    lineRegex
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
