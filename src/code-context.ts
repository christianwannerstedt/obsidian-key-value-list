import { Text } from "@codemirror/state";

const OPENING_FENCE = /^[ \t]{0,3}(`{3,}|~{3,})/;

export function getFencedCodeBlockLines(
  doc: Text,
  toLine: number
): Set<number> {
  const codeLines = new Set<number>();
  let currentFence: string | null = null;

  for (let lineNumber = 1; lineNumber <= toLine; lineNumber++) {
    const text = doc.line(lineNumber).text;

    if (currentFence) {
      codeLines.add(lineNumber);

      if (isClosingFence(text, currentFence)) {
        currentFence = null;
      }

      continue;
    }

    const openingFence = text.match(OPENING_FENCE)?.[1];
    if (openingFence) {
      currentFence = openingFence;
      codeLines.add(lineNumber);
    }
  }

  return codeLines;
}

function isClosingFence(line: string, openingFence: string): boolean {
  const fenceChar = openingFence[0];
  const fenceLength = openingFence.length;
  const closingFence = new RegExp(
    `^[ \\t]{0,3}\\${fenceChar}{${fenceLength},}[ \\t]*$`
  );

  return closingFence.test(line);
}
