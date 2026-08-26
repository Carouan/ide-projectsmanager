import assert from "node:assert/strict";
import test from "node:test";

import {
  getThemeColor,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_PREFERENCE,
} from "../src/services/themePreference.js";

test("historical dark and light preferences remain valid", () => {
  assert.equal(normalizeThemePreference("dark"), THEME_PREFERENCE.DARK);
  assert.equal(normalizeThemePreference("light"), THEME_PREFERENCE.LIGHT);
  assert.equal(normalizeThemePreference("system"), THEME_PREFERENCE.SYSTEM);
});

test("missing and unsupported preferences safely follow the system", () => {
  for (const value of [undefined, null, "", "sepia", true, {}, 42]) {
    assert.equal(normalizeThemePreference(value), THEME_PREFERENCE.SYSTEM);
  }
});

test("system preferences resolve the actual operating-system appearance", () => {
  assert.equal(resolveThemePreference("system", false), "light");
  assert.equal(resolveThemePreference("system", true), "dark");
  assert.equal(resolveThemePreference(undefined, true), "dark");
});

test("explicit preferences never silently follow system appearance", () => {
  assert.equal(resolveThemePreference("dark", false), "dark");
  assert.equal(resolveThemePreference("light", true), "light");
});

test("browser chrome receives the matching safe theme color", () => {
  assert.equal(getThemeColor("dark"), "#0f172a");
  assert.equal(getThemeColor("light"), "#f6f4ef");
  assert.equal(getThemeColor("unexpected"), "#f6f4ef");
});
