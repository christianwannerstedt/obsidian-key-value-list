import { escapeRegExp, removeInvalidHtmlTags } from "./utils";
import { KeyValueListPluginSettings } from "./settings";

export interface KeyValuePiece {
  key: string;
  delimiter: string;
  value: string;
}

export interface ListAlignment {
  keyRight: boolean;
  valueRight: boolean;
}

const NO_ALIGNMENT: ListAlignment = { keyRight: false, valueRight: false };

export function parseDelimiters(delimiterSetting: string): string[] {
  return delimiterSetting
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

function buildSeparatorPattern(settings: KeyValueListPluginSettings): string {
  const delimiters = parseDelimiters(settings.delimiter);
  const delimiterPattern = delimiters.map(escapeRegExp).join("|");
  const keyAlign = settings.keyRightAlignChar
    ? `(?:${escapeRegExp(settings.keyRightAlignChar)})?`
    : "";
  const valueAlign = settings.valueRightAlignChar
    ? `(?:${escapeRegExp(settings.valueRightAlignChar)})?`
    : "";
  return `${keyAlign}(${delimiterPattern})${valueAlign}`;
}

export function buildKeyValueRegex(
  settings: KeyValueListPluginSettings
): RegExp {
  return new RegExp(`^(.*?)${buildSeparatorPattern(settings)}(?: (.*))?$`);
}

export function buildKeyValueLineRegex(
  settings: KeyValueListPluginSettings
): RegExp {
  return new RegExp(
    `^[ \\t]*-(.*?)${buildSeparatorPattern(settings)}(?: (.*))?$`
  );
}

export function isKeyValueText(text: string, regex: RegExp): boolean {
  return regex.test(text.replace(/<br>/g, "\n"));
}

export function isKeyValueListText(
  texts: string[],
  regex: RegExp
): boolean {
  return texts.length > 0 && texts.every((text) => isKeyValueText(text, regex));
}

function extractSeparatorFromMatch(
  match: RegExpMatchArray
): string {
  const keyRaw = match[1] || "";
  const afterKey = match[0].slice(
    match[0].indexOf(keyRaw) + keyRaw.length
  );
  const value = match[3] ?? "";

  if (value) {
    const suffix = ` ${value}`;
    if (afterKey.endsWith(suffix)) {
      return afterKey.slice(0, afterKey.length - suffix.length);
    }
  }

  return match[2] || "";
}

export function parseSeparatorAlignment(
  separator: string,
  settings: KeyValueListPluginSettings
): ListAlignment {
  const delimiters = parseDelimiters(settings.delimiter).sort(
    (a, b) => b.length - a.length
  );

  for (const delimiter of delimiters) {
    const idx = separator.indexOf(delimiter);
    if (idx === -1) continue;

    const before = separator.slice(0, idx);
    const after = separator.slice(idx + delimiter.length);

    if (settings.keyRightAlignChar === "" && before !== "") continue;
    if (
      settings.keyRightAlignChar !== "" &&
      before !== "" &&
      before !== settings.keyRightAlignChar
    ) {
      continue;
    }
    if (settings.valueRightAlignChar === "" && after !== "") continue;
    if (
      settings.valueRightAlignChar !== "" &&
      after !== "" &&
      after !== settings.valueRightAlignChar
    ) {
      continue;
    }

    return {
      keyRight:
        settings.keyRightAlignChar !== "" &&
        before === settings.keyRightAlignChar,
      valueRight:
        settings.valueRightAlignChar !== "" &&
        after === settings.valueRightAlignChar,
    };
  }

  return NO_ALIGNMENT;
}

function detectAlignment(
  text: string,
  regex: RegExp,
  settings: KeyValueListPluginSettings
): ListAlignment {
  const match = text.match(regex);
  if (!match) return NO_ALIGNMENT;
  return parseSeparatorAlignment(
    extractSeparatorFromMatch(match),
    settings
  );
}

export function detectLineAlignment(
  line: string,
  settings: KeyValueListPluginSettings
): ListAlignment {
  return detectAlignment(line, buildKeyValueLineRegex(settings), settings);
}

export function detectTextAlignment(
  text: string,
  settings: KeyValueListPluginSettings
): ListAlignment {
  return detectAlignment(text, buildKeyValueRegex(settings), settings);
}

export function resolveListAlignment(
  lines: string[],
  settings: KeyValueListPluginSettings
): ListAlignment {
  if (lines.length === 0) return NO_ALIGNMENT;
  return detectLineAlignment(lines[0], settings);
}

export function resolveListAlignmentFromTexts(
  texts: string[],
  settings: KeyValueListPluginSettings
): ListAlignment {
  if (texts.length === 0) return NO_ALIGNMENT;
  return detectTextAlignment(texts[0], settings);
}

function formatKeyText(
  keyRaw: string,
  delimiter: string,
  settings: KeyValueListPluginSettings
): string {
  let key = keyRaw;

  if (settings.displayBullet) {
    key = `${settings.displayBulletChar} ${key}`;
  }

  if (settings.displayDelimiter) {
    key = `${key}${delimiter}`;
  }

  return key;
}

export function splitKeyValueHtml(
  html: string,
  settings: KeyValueListPluginSettings,
  doc: Document
): KeyValuePiece | null {
  const regex = buildKeyValueRegex(settings);
  const match = html
    .replace(/\n/g, " ")
    .trim()
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .match(regex);

  if (!match) return null;

  const delimiter = (match[2] || "")
    .replace(/>/g, "&gt;")
    .replace(/</g, "&lt;");

  return {
    key: formatKeyHtml(match[1] || "", delimiter, settings, doc),
    delimiter,
    value: removeInvalidHtmlTags(match[3] || ""),
  };
}

export function splitKeyValueFromLi(
  listItem: HTMLElement,
  settings: KeyValueListPluginSettings
): KeyValuePiece | null {
  const content = listItem.cloneNode(true) as HTMLElement;
  content.querySelectorAll(".list-bullet").forEach((el) => el.remove());
  content.querySelectorAll(":scope > ul").forEach((el) => el.remove());
  return splitKeyValueHtml(content.innerHTML, settings, listItem.ownerDocument);
}

export function splitKeyValueLine(
  line: string,
  settings: KeyValueListPluginSettings
): KeyValuePiece | null {
  const match = line.match(buildKeyValueLineRegex(settings));
  if (!match) return null;

  const delimiter = match[2] || "";
  const key = formatKeyText(match[1] || "", delimiter, settings);
  const value = (match[3] || "").replace(/\[(\^\d+)\]/g, "\\$1");

  return { key, delimiter, value };
}

function formatKeyHtml(
  key: string,
  delimiter: string,
  settings: KeyValueListPluginSettings,
  doc: Document
): string {
  let result = stripListBulletMarkup(key, doc);
  if (settings.displayBullet) {
    result = `${settings.displayBulletChar} ${result}`;
  }
  if (settings.displayDelimiter) {
    result = `${result}${delimiter}`;
  }
  return removeInvalidHtmlTags(result);
}

function stripListBulletMarkup(html: string, doc: Document): string {
  const container = doc.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll(".list-bullet").forEach((el) => el.remove());
  return container.innerHTML;
}
