import assert from "node:assert/strict";
import test from "node:test";

import {
  CONTRAST_PREFERENCE,
  FONT_SCALE,
  MOTION_PREFERENCE,
  normalizeAccessibilityPreferences,
  resolveRootFontSize,
} from "../src/services/accessibilityPreferences.js";

test("historical settings receive safe accessibility defaults", () => {
  for (const settings of [undefined, null, false, "large", {}]) {
    assert.deepEqual(normalizeAccessibilityPreferences(settings), {
      fontScale: FONT_SCALE.STANDARD,
      contrast: CONTRAST_PREFERENCE.STANDARD,
      motionPreference: MOTION_PREFERENCE.SYSTEM,
    });
  }
});

test("valid text, contrast and motion preferences remain independent", () => {
  assert.deepEqual(
    normalizeAccessibilityPreferences({
      fontScale: "extra-large",
      contrast: "high",
      motionPreference: "reduced",
      theme: "dark",
    }),
    {
      fontScale: FONT_SCALE.EXTRA_LARGE,
      contrast: CONTRAST_PREFERENCE.HIGH,
      motionPreference: MOTION_PREFERENCE.REDUCED,
    }
  );
});

test("invalid preferences cannot introduce unsafe root presentation values", () => {
  assert.deepEqual(
    normalizeAccessibilityPreferences({
      fontScale: "900%",
      contrast: "inverted",
      motionPreference: "allow-everything",
    }),
    {
      fontScale: FONT_SCALE.STANDARD,
      contrast: CONTRAST_PREFERENCE.STANDARD,
      motionPreference: MOTION_PREFERENCE.SYSTEM,
    }
  );
});

test("font scaling remains bounded and preserves browser-relative sizing", () => {
  assert.equal(resolveRootFontSize("standard"), "100%");
  assert.equal(resolveRootFontSize("large"), "112.5%");
  assert.equal(resolveRootFontSize("extra-large"), "125%");
  assert.equal(resolveRootFontSize("300%"), "100%");
});
