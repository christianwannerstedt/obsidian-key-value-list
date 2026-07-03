import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { buildKeyValueLineRegex, parseDelimiters } from "./parser";
import { scanKeyValueLists } from "./list-scanner";

function doc(lines: string[]): Text {
  return Text.of(lines);
}

describe("scanKeyValueLists", () => {
  const lineRegex = buildKeyValueLineRegex(parseDelimiters(":"));

  it("finds contiguous key-value list blocks", () => {
    const markdown = doc([
      "Intro",
      "- Name: Alice",
      "- Age: 30",
      "",
      "- City: Stockholm",
    ]);

    expect(scanKeyValueLists(markdown, 1, markdown.lines, lineRegex)).toEqual([
      {
        startLine: 2,
        endLine: 3,
        lines: ["- Name: Alice", "- Age: 30"],
      },
      {
        startLine: 5,
        endLine: 5,
        lines: ["- City: Stockholm"],
      },
    ]);
  });

  it("rejects an entire contiguous list when any row is not key-value", () => {
    const markdown = doc([
      "- Name: Alice",
      "- plain bullet",
      "- Age: 30",
    ]);

    expect(scanKeyValueLists(markdown, 1, markdown.lines, lineRegex)).toEqual(
      []
    );
  });

  it("expands a scan range to include the whole surrounding list", () => {
    const markdown = doc([
      "- Name: Alice",
      "- Age: 30",
      "- City: Stockholm",
    ]);

    expect(scanKeyValueLists(markdown, 2, 2, lineRegex)).toEqual([
      {
        startLine: 1,
        endLine: 3,
        lines: ["- Name: Alice", "- Age: 30", "- City: Stockholm"],
      },
    ]);
  });

  it("treats skipped lines as list boundaries", () => {
    const markdown = doc([
      "- Name: Alice",
      "- Code: ignored",
      "- Age: 30",
    ]);
    const shouldSkipLine = (lineNumber: number): boolean => lineNumber === 2;

    expect(
      scanKeyValueLists(markdown, 1, markdown.lines, lineRegex, shouldSkipLine)
    ).toEqual([
      {
        startLine: 1,
        endLine: 1,
        lines: ["- Name: Alice"],
      },
      {
        startLine: 3,
        endLine: 3,
        lines: ["- Age: 30"],
      },
    ]);
  });
});
