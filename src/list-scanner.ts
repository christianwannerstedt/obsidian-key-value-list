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
  keyValueLineRegex: RegExp
): ScannedList[] {
  const lists: ScannedList[] = [];
  let lineNumber = fromLine;

  while (lineNumber <= toLine) {
    const line = doc.line(lineNumber);
    if (!LIST_LINE.test(line.text)) {
      lineNumber++;
      continue;
    }

    const listStart = findListStart(doc, lineNumber);
    const listEnd = findListEnd(doc, lineNumber);
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

function findListStart(doc: Text, lineNumber: number): number {
  let start = lineNumber;
  while (start > 1) {
    const prev = doc.line(start - 1);
    if (!LIST_LINE.test(prev.text)) break;
    start--;
  }
  return start;
}

function findListEnd(doc: Text, lineNumber: number): number {
  let end = lineNumber;
  while (end < doc.lines) {
    const next = doc.line(end + 1);
    if (!LIST_LINE.test(next.text)) break;
    end++;
  }
  return end;
}
