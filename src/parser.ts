import { escapeRegExp, removeInvalidHtmlTags } from "./utils";
import { KeyValueListPluginSettings } from "./settings";

export interface KeyValuePiece {
  key: string;
  delimiter: string;
  value: string;
}

export function parseDelimiters(delimiterSetting: string): string[] {
  return delimiterSetting
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

export function buildKeyValueRegex(delimiters: string[]): RegExp {
  const delimiterPattern = delimiters.map(escapeRegExp).join("|");
  return new RegExp(`^(.*[^:])(${delimiterPattern})(?: (.*))?$`);
}

export function buildKeyValueLineRegex(delimiters: string[]): RegExp {
  const delimiterPattern = delimiters.map(escapeRegExp).join("|");
  return new RegExp(`^[ \\t]*-(.*[^:])(${delimiterPattern})(?: (.*))?$`);
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

export function splitKeyValueHtml(
  html: string,
  regex: RegExp,
  settings: KeyValueListPluginSettings
): KeyValuePiece | null {
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
    key: formatKeyHtml(match[1] || "", delimiter, settings),
    delimiter,
    value: removeInvalidHtmlTags(match[3] || ""),
  };
}

export function splitKeyValueFromLi(
  listItem: HTMLElement,
  regex: RegExp,
  settings: KeyValueListPluginSettings
): KeyValuePiece | null {
  const content = listItem.cloneNode(true) as HTMLElement;
  content.querySelectorAll(".list-bullet").forEach((el) => el.remove());
  return splitKeyValueHtml(content.innerHTML, regex, settings);
}

export function splitKeyValueLine(
  line: string,
  lineRegex: RegExp,
  settings: KeyValueListPluginSettings
): KeyValuePiece | null {
  const match = line.match(lineRegex);
  if (!match) return null;

  let key = match[1] || "";

  if (settings.displayBullet) {
    key = `${settings.displayBulletChar} ${key}`;
  }

  const delimiter = match[2] || "";
  if (settings.displayDelimiter) {
    key = `${key}${delimiter}`;
  }

  const value = (match[3] || "").replace(/\[(\^\d+)\]/g, "\\$1");

  return { key, delimiter, value };
}

function formatKeyHtml(
  key: string,
  delimiter: string,
  settings: KeyValueListPluginSettings
): string {
  let result = stripListBulletMarkup(key);
  if (settings.displayBullet) {
    result = `${settings.displayBulletChar} ${result}`;
  }
  if (settings.displayDelimiter) {
    result = `${result}${delimiter}`;
  }
  return removeInvalidHtmlTags(result);
}

function stripListBulletMarkup(html: string): string {
  const container = document.createElement("div");
  container.innerHTML = html;
  container.querySelectorAll(".list-bullet").forEach((el) => el.remove());
  return container.innerHTML;
}
