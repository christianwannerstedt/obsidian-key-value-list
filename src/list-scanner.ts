import { Text } from "@codemirror/state";

const LIST_LINE = /^[ \t]*-/;

export interface ScannedList {
  startLine: number;
  endLine: number;
  lines: string[];
  depths: number[];
}

export function measureLineIndent(text: string): number {
  const match = text.match(/^([ \t]*)/);
  if (!match) return 0;
  return match[1].replace(/\t/g, "  ").length;
}

export function computeLineDepths(lines: string[]): number[] {
  if (lines.length === 0) return [];

  const indents = lines.map(measureLineIndent);
  const baseIndent = indents[0];
  const step = detectIndentStep(indents, baseIndent);

  return indents.map((indent) =>
    Math.max(0, Math.round((indent - baseIndent) / step))
  );
}

function detectIndentStep(indents: number[], baseIndent: number): number {
  const deeperIndents = [...new Set(indents)]
    .filter((indent) => indent > baseIndent)
    .sort((a, b) => a - b);

  if (deeperIndents.length === 0) return 2;

  let minDiff = deeperIndents[0] - baseIndent;
  for (let i = 1; i < deeperIndents.length; i++) {
    minDiff = Math.min(minDiff, deeperIndents[i] - deeperIndents[i - 1]);
  }

  return minDiff;
}

export function scanKeyValueLists(
  doc: Text,
  fromLine: number,
  toLine: number,
  keyValueLineRegex: RegExp,
  shouldSkipLine?: (lineNumber: number) => boolean
): ScannedList[] {
  const lists: ScannedList[] = [];
  let lineNumber = fromLine;

  while (lineNumber <= toLine) {
    const line = doc.line(lineNumber);
    if (!LIST_LINE.test(line.text) || shouldSkipLine?.(lineNumber)) {
      lineNumber++;
      continue;
    }

    const listStart = findListStart(doc, lineNumber, shouldSkipLine);
    const listEnd = findListEnd(doc, lineNumber, shouldSkipLine);
    const lines: string[] = [];
    let isKeyValueList = true;

    for (let i = listStart; i <= listEnd; i++) {
      const listLine = doc.line(i);
      if (!keyValueLineRegex.test(listLine.text)) {
        isKeyValueList = false;
      }
      lines.push(listLine.text);
    }

    if (isKeyValueList && lines.length > 0) {
      lists.push({
        startLine: listStart,
        endLine: listEnd,
        lines,
        depths: computeLineDepths(lines),
      });
    }

    lineNumber = listEnd + 1;
  }

  return lists;
}

function findListStart(
  doc: Text,
  lineNumber: number,
  shouldSkipLine?: (lineNumber: number) => boolean
): number {
  let start = lineNumber;
  while (start > 1) {
    const prevLineNumber = start - 1;
    if (shouldSkipLine?.(prevLineNumber)) break;
    const prev = doc.line(prevLineNumber);
    if (!LIST_LINE.test(prev.text)) break;
    start = prevLineNumber;
  }
  return start;
}

function findListEnd(
  doc: Text,
  lineNumber: number,
  shouldSkipLine?: (lineNumber: number) => boolean
): number {
  let end = lineNumber;
  while (end < doc.lines) {
    const nextLineNumber = end + 1;
    if (shouldSkipLine?.(nextLineNumber)) break;
    const next = doc.line(nextLineNumber);
    if (!LIST_LINE.test(next.text)) break;
    end = nextLineNumber;
  }
  return end;
}
