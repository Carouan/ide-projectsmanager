export const THEME_PREFERENCE = Object.freeze({
  SYSTEM: "system",
  LIGHT: "light",
  DARK: "dark",
});

const THEME_COLORS = Object.freeze({
  [THEME_PREFERENCE.LIGHT]: "#f6f4ef",
  [THEME_PREFERENCE.DARK]: "#0f172a",
});

export function normalizeThemePreference(value) {
  return Object.values(THEME_PREFERENCE).includes(value)
    ? value
    : THEME_PREFERENCE.SYSTEM;
}

export function resolveThemePreference(value, prefersDark = false) {
  const preference = normalizeThemePreference(value);

  if (preference !== THEME_PREFERENCE.SYSTEM) {
    return preference;
  }

  return prefersDark ? THEME_PREFERENCE.DARK : THEME_PREFERENCE.LIGHT;
}

export function getThemeColor(value) {
  return THEME_COLORS[resolveThemePreference(value)];
}
