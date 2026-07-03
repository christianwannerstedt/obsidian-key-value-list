import { describe, expect, it } from "vitest";
import {
  buildKeyValueLineRegex,
  buildKeyValueRegex,
  isKeyValueListText,
  isKeyValueText,
  parseDelimiters,
  splitKeyValueLine,
} from "./parser";
import type { KeyValueListPluginSettings } from "./settings";

const settings: KeyValueListPluginSettings = {
  activeInEditMode: true,
  activeInReadMode: true,
  displayBullet: false,
  displayBulletChar: "-",
  delimiter: ":",
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

describe("parseDelimiters", () => {
  it("trims delimiters and removes empty entries", () => {
    expect(parseDelimiters(" :, ::, , => ")).toEqual([":", "::", "=>"]);
  });
});

describe("key-value text matching", () => {
  const regex = buildKeyValueRegex(parseDelimiters(":, ::"));

  it("matches key-value rows with configured delimiters", () => {
    expect(isKeyValueText("Name: Alice", regex)).toBe(true);
    expect(isKeyValueText("Name:: Alice", regex)).toBe(true);
  });

  it("rejects non key-value rows", () => {
    expect(isKeyValueText("Just a list item", regex)).toBe(false);
  });

  it("requires every row in a list to be key-value text", () => {
    expect(isKeyValueListText(["Name: Alice", "Age: 30"], regex)).toBe(true);
    expect(isKeyValueListText(["Name: Alice", "Just a bullet"], regex)).toBe(
      false
    );
    expect(isKeyValueListText([], regex)).toBe(false);
  });
});

describe("splitKeyValueLine", () => {
  const lineRegex = buildKeyValueLineRegex(parseDelimiters(":"));

  it("splits a markdown list line into key, delimiter, and value", () => {
    expect(splitKeyValueLine("- Name: Alice", lineRegex, settings)).toEqual({
      key: " Name:",
      delimiter: ":",
      value: "Alice",
    });
  });

  it("can omit the delimiter and include a configured bullet", () => {
    expect(
      splitKeyValueLine("- Name: Alice", lineRegex, {
        ...settings,
        displayBullet: true,
        displayBulletChar: "*",
        displayDelimiter: false,
      })
    ).toEqual({
      key: "*  Name",
      delimiter: ":",
      value: "Alice",
    });
  });

  it("escapes Obsidian footnote references in values", () => {
    expect(splitKeyValueLine("- Note: value[^1]", lineRegex, settings)).toEqual({
      key: " Note:",
      delimiter: ":",
      value: "value\\^1",
    });
  });

  it("returns null for non key-value list lines", () => {
    expect(splitKeyValueLine("- plain bullet", lineRegex, settings)).toBeNull();
  });
});
