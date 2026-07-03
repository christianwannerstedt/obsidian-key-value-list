import { Text } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { getFencedCodeBlockLines } from "./code-context";

function doc(lines: string[]): Text {
  return Text.of(lines);
}

describe("getFencedCodeBlockLines", () => {
  it("marks fenced code block opening, content, and closing lines", () => {
    const markdown = doc([
      "Intro",
      "```",
      "- Name: Alice",
      "```",
      "- Age: 30",
    ]);

    expect([...getFencedCodeBlockLines(markdown, markdown.lines)]).toEqual([
      2, 3, 4,
    ]);
  });

  it("supports tilde fences and indented fences", () => {
    const markdown = doc([
      "   ~~~",
      "- Name: Alice",
      "   ~~~",
      "- Age: 30",
    ]);

    expect([...getFencedCodeBlockLines(markdown, markdown.lines)]).toEqual([
      1, 2, 3,
    ]);
  });

  it("requires closing fences to be at least as long as the opening fence", () => {
    const markdown = doc([
      "````",
      "```",
      "- Still: code",
      "````",
      "- Age: 30",
    ]);

    expect([...getFencedCodeBlockLines(markdown, markdown.lines)]).toEqual([
      1, 2, 3, 4,
    ]);
  });

  it("only scans through the requested line", () => {
    const markdown = doc([
      "```",
      "- Name: Alice",
      "```",
      "```",
      "- Age: 30",
      "```",
    ]);

    expect([...getFencedCodeBlockLines(markdown, 3)]).toEqual([1, 2, 3]);
  });
});
