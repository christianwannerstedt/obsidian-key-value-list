import { KeyValueListPluginSettings } from "./settings";
import {
  ListAlignment,
  resolveListAlignmentFromTexts,
  splitKeyValueFromLi,
} from "./parser";

export function renderKeyValueList(
  listItems: HTMLElement[],
  settings: KeyValueListPluginSettings,
  contentWidth = 0
): HTMLDivElement {
  const texts = listItems.map((item) => item.innerText.trim());
  const alignment = resolveListAlignmentFromTexts(texts, settings);
  const list = document.createElement("div");
  list.classList.add("kvl-list");
  applyListStyles(list, settings, alignment, contentWidth);

  listItems.forEach((listItem, index) => {
    const pieces = splitKeyValueFromLi(listItem, settings);
    if (!pieces) return;

    const row = document.createElement("div");
    row.classList.add("kvl-row");
    row.classList.add(index % 2 === 0 ? "kvl-row-odd" : "kvl-row-even");

    if (
      index % 2 === 1 &&
      settings.stripedBackgroundType === "custom" &&
      settings.stripedBackgroundColor
    ) {
      row.style.setProperty(
        "--kvl-stripe-bg",
        settings.stripedBackgroundColor
      );
    }

    row.appendChild(createKeyCell(pieces, settings));
    row.appendChild(createValueCell(pieces, settings));
    list.appendChild(row);
  });

  return list;
}

function applyListStyles(
  list: HTMLDivElement,
  settings: KeyValueListPluginSettings,
  alignment: ListAlignment,
  contentWidth: number
): void {
  list.style.setProperty("--kvl-v-pad", `${settings.verticalPadding}px`);
  list.style.setProperty("--kvl-h-pad", `${settings.horizontalPadding}px`);

  if (settings.maxKeyWidth > 0 && contentWidth > 0) {
    const maxKeyWidthPx = Math.floor(
      (settings.maxKeyWidth / 100) * contentWidth
    );
    list.style.setProperty("--kvl-max-key-width", `${maxKeyWidthPx}px`);
    list.classList.add("kvl-key-limited");
  }

  if (settings.isKeyColored && settings.keyColor) {
    list.style.setProperty("--kvl-key-color", settings.keyColor);
    list.classList.add("kvl-key-colored");
  }

  if (settings.isValueColored && settings.valueColor) {
    list.style.setProperty("--kvl-value-color", settings.valueColor);
    list.classList.add("kvl-value-colored");
  }

  if (settings.stripedBackgroundType === "default") {
    list.classList.add("kvl-striped-default");
  } else if (settings.stripedBackgroundType === "custom") {
    list.classList.add("kvl-striped-custom");
  }

  if (alignment.keyRight) {
    list.classList.add("kvl-key-right");
  }

  if (alignment.valueRight) {
    list.classList.add("kvl-value-right");
  }
}

function createKeyCell(
  pieces: { key: string },
  settings: KeyValueListPluginSettings
): HTMLElement {
  const keyCell = document.createElement("span");
  keyCell.classList.add("kvl-key");

  const keyInner = document.createElement(
    settings.boldKey ? "strong" : "span"
  );
  keyInner.classList.add("kvl-key-inner");
  keyInner.innerHTML = pieces.key;
  keyCell.appendChild(keyInner);

  return keyCell;
}

function createValueCell(
  pieces: { value: string },
  settings: KeyValueListPluginSettings
): HTMLElement {
  const valueCell = document.createElement("span");
  valueCell.classList.add("kvl-value");
  valueCell.innerHTML = pieces.value;
  return valueCell;
}

export function getReadingViewContentWidth(element: HTMLElement): number {
  const view = element.closest(
    ".markdown-reading-view, .markdown-preview-view"
  );
  return view?.clientWidth ?? element.parentElement?.clientWidth ?? 0;
}
