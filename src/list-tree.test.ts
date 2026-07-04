// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { buildKeyValueRegex } from "./parser";
import type { KeyValueListPluginSettings } from "./settings";
import {
  flattenKeyValueListUl,
  getLiDirectText,
  isUlInsideKeyValueList,
} from "./list-tree";

const settings: KeyValueListPluginSettings = {
  activeInEditMode: true,
  activeInReadMode: true,
  displayBullet: false,
  displayBulletChar: "-",
  delimiter: ":",
  keyRightAlignChar: "",
  valueRightAlignChar: "",
  displayDelimiter: true,
  maxKeyWidth: 50,
  verticalPadding: 3,
  horizontalPadding: 12,
  boldKey: true,
  stripedBackgroundType: "default",
  stripedBackgroundColor: "",
  isKeyColored: false,
  keyColor: "",
  isValueColored: false,
  valueColor: "",
};

function buildNestedListHtml(): HTMLUListElement {
  const root = document.createElement("ul");
  root.innerHTML = `
    <li>Foo: Bar<ul>
      <li>Baz: Quux</li>
      <li>Blah: Bang</li>
    </ul></li>
  `;
  return root;
}

describe("getLiDirectText", () => {
  it("excludes nested list text from a parent list item", () => {
    const root = buildNestedListHtml();
    const parent = root.querySelector(":scope > li") as HTMLElement;

    expect(getLiDirectText(parent)).toBe("Foo: Bar");
  });
});

describe("flattenKeyValueListUl", () => {
  const regex = buildKeyValueRegex(settings);

  it("flattens nested key-value lists with depth metadata", () => {
    const rows = flattenKeyValueListUl(buildNestedListHtml(), regex);

    expect(rows).not.toBeNull();
    if (!rows) return;

    expect(rows).toEqual([
      { listItem: expect.any(HTMLElement), depth: 0 },
      { listItem: expect.any(HTMLElement), depth: 1 },
      { listItem: expect.any(HTMLElement), depth: 1 },
    ]);
    expect(getLiDirectText(rows[0].listItem)).toBe("Foo: Bar");
    expect(getLiDirectText(rows[1].listItem)).toBe("Baz: Quux");
    expect(getLiDirectText(rows[2].listItem)).toBe("Blah: Bang");
  });

  it("rejects lists when any row is not key-value text", () => {
    const root = document.createElement("ul");
    root.innerHTML = `
      <li>Foo: Bar<ul>
        <li>Plain bullet</li>
      </ul></li>
    `;

    expect(flattenKeyValueListUl(root, regex)).toBeNull();
  });
});

describe("isUlInsideKeyValueList", () => {
  it("detects nested uls that should not be processed independently", () => {
    const root = buildNestedListHtml();
    const nested = root.querySelector(":scope > li > ul") as HTMLElement;

    expect(isUlInsideKeyValueList(root)).toBe(false);
    expect(isUlInsideKeyValueList(nested)).toBe(true);
  });
});
