import { KeyValueListPluginSettings } from "./settings";
import {
  KeyValuePiece,
  splitKeyValueFromLi,
  buildKeyValueRegex,
  parseDelimiters,
} from "./parser";

export function renderKeyValueList(
  listItems: HTMLElement[],
  settings: KeyValueListPluginSettings
): HTMLUListElement {
  const regex = buildKeyValueRegex(parseDelimiters(settings.delimiter));
  const list = document.createElement("ul");
  list.classList.add("kvl-list");
  applyListStyles(list, settings);

  listItems.forEach((listItem, index) => {
    const pieces = splitKeyValueFromLi(listItem, regex, settings);
    if (!pieces) return;

    const row = document.createElement("li");
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
  list: HTMLUListElement,
  settings: KeyValueListPluginSettings
): void {
  list.style.setProperty("--kvl-v-pad", `${settings.verticalPadding}px`);
  list.style.setProperty("--kvl-h-pad", `${settings.horizontalPadding}px`);
  list.style.setProperty("--kvl-max-key-width", `${settings.maxKeyWidth}%`);

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
}

function createKeyCell(
  pieces: KeyValuePiece,
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
  pieces: KeyValuePiece,
  settings: KeyValueListPluginSettings
): HTMLElement {
  const valueCell = document.createElement("span");
  valueCell.classList.add("kvl-value");
  valueCell.innerHTML = pieces.value;
  return valueCell;
}
