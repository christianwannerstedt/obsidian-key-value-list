export function getElementFont(
  element: HTMLElement,
  weightOverride?: string
): string {
  const style = getComputedStyle(element);
  const weight = weightOverride ?? style.fontWeight;
  return `${weight} ${style.fontSize} ${style.fontFamily}`;
}

export function measureTextWidth(text: string, font: string): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return 0;
  ctx.font = font;
  return ctx.measureText(stripMarkdownForMeasure(text)).width;
}

function stripMarkdownForMeasure(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/_(.+?)_/g, "$1")
    .replace(/\[\[([^\]]+)\]\]/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1");
}
