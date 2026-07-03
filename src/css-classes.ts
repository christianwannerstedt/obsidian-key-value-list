import { App } from "obsidian";
import { KeyValueListPluginSettings } from "./settings";

export type KeyValueMode = "edit" | "read";

type ModeSettings = Pick<
  KeyValueListPluginSettings,
  "activeInEditMode" | "activeInReadMode"
>;

export function getCssClasses(
  frontmatter: Record<string, unknown> | undefined
): string[] {
  if (!frontmatter) return [];

  const classes = frontmatter.cssclasses ?? frontmatter.cssclass;
  if (!classes) return [];

  return Array.isArray(classes) ? classes.map(String) : [String(classes)];
}

export function isActiveForMode(
  classList: string[],
  mode: KeyValueMode,
  settings: ModeSettings
): boolean {
  if (classList.includes("nokeyvalue")) {
    return false;
  }

  if (classList.includes("keyvalue")) {
    return true;
  }

  if (mode === "edit" && classList.includes("keyvalue-edit")) {
    return true;
  }

  if (mode === "read" && classList.includes("keyvalue-read")) {
    return true;
  }

  return mode === "edit"
    ? settings.activeInEditMode
    : settings.activeInReadMode;
}

export function isActiveForFile(
  app: App,
  sourcePath: string,
  mode: KeyValueMode,
  settings: ModeSettings
): boolean {
  const cache = app.metadataCache.getCache(sourcePath);
  const classList = getCssClasses(cache?.frontmatter);
  return isActiveForMode(classList, mode, settings);
}
