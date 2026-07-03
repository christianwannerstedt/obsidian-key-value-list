import { describe, expect, it } from "vitest";
import { getCssClasses, isActiveForMode } from "./css-classes";

const settingsOff = { activeInEditMode: false, activeInReadMode: false };
const settingsOn = { activeInEditMode: true, activeInReadMode: true };
const settingsEditOnly = { activeInEditMode: true, activeInReadMode: false };

describe("getCssClasses", () => {
  it("returns empty array when frontmatter is undefined", () => {
    expect(getCssClasses(undefined)).toEqual([]);
  });

  it("parses cssclasses array", () => {
    expect(getCssClasses({ cssclasses: ["keyvalue", "foo"] })).toEqual([
      "keyvalue",
      "foo",
    ]);
  });

  it("parses single cssclass string", () => {
    expect(getCssClasses({ cssclass: "nokeyvalue" })).toEqual(["nokeyvalue"]);
  });
});

describe("isActiveForMode", () => {
  it("nokeyvalue disables both modes", () => {
    expect(isActiveForMode(["nokeyvalue"], "edit", settingsOn)).toBe(false);
    expect(isActiveForMode(["nokeyvalue"], "read", settingsOn)).toBe(false);
  });

  it("keyvalue enables both modes when globally off", () => {
    expect(isActiveForMode(["keyvalue"], "edit", settingsOff)).toBe(true);
    expect(isActiveForMode(["keyvalue"], "read", settingsOff)).toBe(true);
  });

  it("keyvalue-edit enables edit only when globally off", () => {
    expect(isActiveForMode(["keyvalue-edit"], "edit", settingsOff)).toBe(true);
    expect(isActiveForMode(["keyvalue-edit"], "read", settingsOff)).toBe(false);
  });

  it("keyvalue-read enables read only when globally off", () => {
    expect(isActiveForMode(["keyvalue-read"], "edit", settingsOff)).toBe(false);
    expect(isActiveForMode(["keyvalue-read"], "read", settingsOff)).toBe(true);
  });

  it("falls back to settings when no override classes", () => {
    expect(isActiveForMode([], "edit", settingsEditOnly)).toBe(true);
    expect(isActiveForMode([], "read", settingsEditOnly)).toBe(false);
  });

  it("nokeyvalue takes precedence over enable classes", () => {
    expect(isActiveForMode(["nokeyvalue", "keyvalue"], "edit", settingsOff)).toBe(
      false
    );
  });
});
