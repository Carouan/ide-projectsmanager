export const FONT_SCALE = Object.freeze({
  STANDARD: "standard",
  LARGE: "large",
  EXTRA_LARGE: "extra-large",
});

export const CONTRAST_PREFERENCE = Object.freeze({
  STANDARD: "standard",
  HIGH: "high",
});

export const MOTION_PREFERENCE = Object.freeze({
  SYSTEM: "system",
  REDUCED: "reduced",
});

const ROOT_FONT_SIZES = Object.freeze({
  [FONT_SCALE.STANDARD]: "100%",
  [FONT_SCALE.LARGE]: "112.5%",
  [FONT_SCALE.EXTRA_LARGE]: "125%",
});

function normalizeValue(value, acceptedValues, fallback) {
  return Object.values(acceptedValues).includes(value) ? value : fallback;
}

export function normalizeAccessibilityPreferences(preferences = {}) {
  const source =
    preferences != null && typeof preferences === "object" ? preferences : {};

  return {
    fontScale: normalizeValue(source.fontScale, FONT_SCALE, FONT_SCALE.STANDARD),
    contrast: normalizeValue(
      source.contrast,
      CONTRAST_PREFERENCE,
      CONTRAST_PREFERENCE.STANDARD
    ),
    motionPreference: normalizeValue(
      source.motionPreference,
      MOTION_PREFERENCE,
      MOTION_PREFERENCE.SYSTEM
    ),
  };
}

export function resolveRootFontSize(fontScale) {
  return ROOT_FONT_SIZES[
    normalizeValue(fontScale, FONT_SCALE, FONT_SCALE.STANDARD)
  ];
}
