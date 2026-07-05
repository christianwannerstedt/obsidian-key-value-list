import { isKeyValueText } from "./parser";

export interface KeyValueRow {
  listItem: HTMLElement;
  depth: number;
}

export function getLiDirectText(listItem: HTMLElement): string {
  const clone = listItem.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(":scope > ul").forEach((el) => el.remove());
  clone.querySelectorAll(".list-bullet").forEach((el) => el.remove());
  return (clone.textContent ?? "").trim();
}

export function isUlInsideKeyValueList(ul: HTMLElement): boolean {
  return Boolean(ul.parentElement?.closest("ul"));
}

export function flattenKeyValueListUl(
  ul: HTMLUListElement,
  regex: RegExp,
  depth = 0
): KeyValueRow[] | null {
  const listItems = Array.from(
    ul.querySelectorAll<HTMLElement>(":scope > li")
  );

  if (listItems.length === 0) return null;

  const rows: KeyValueRow[] = [];

  for (const listItem of listItems) {
    const directText = getLiDirectText(listItem);
    if (!isKeyValueText(directText, regex)) {
      return null;
    }

    rows.push({ listItem, depth });

    const nestedUl = listItem.querySelector(":scope > ul");
    if (nestedUl) {
      const nestedRows = flattenKeyValueListUl(
        nestedUl as HTMLUListElement,
        regex,
        depth + 1
      );
      if (!nestedRows) return null;
      rows.push(...nestedRows);
    }
  }

  return rows;
}
