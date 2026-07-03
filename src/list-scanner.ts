import { Text } from "@codemirror/state";

const LIST_LINE = /^[ \t]*-/;

export interface ScannedList {
  startLine: number;
  endLine: number;
  lines: string[];
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
      lists.push({ startLine: listStart, endLine: listEnd, lines });
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
