import { useEffect } from "react";
import {
  getThemeColor,
  normalizeThemePreference,
  resolveThemePreference,
  THEME_PREFERENCE,
} from "../services/themePreference.js";
import {
  normalizeAccessibilityPreferences,
  resolveRootFontSize,
} from "../services/accessibilityPreferences.js";

export default function ThemeController({ preference, accessibility }) {
  const { fontScale, contrast, motionPreference } =
    normalizeAccessibilityPreferences(accessibility);

  useEffect(() => {
    const normalizedPreference = normalizeThemePreference(preference);
    const mediaQuery =
      typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-color-scheme: dark)")
        : null;

    function applyTheme() {
      const resolvedTheme = resolveThemePreference(
        normalizedPreference,
        mediaQuery?.matches === true
      );

      document.documentElement.dataset.theme = resolvedTheme;
      document.documentElement.style.colorScheme = resolvedTheme;

      const themeColor = document.querySelector('meta[name="theme-color"]');
      themeColor?.setAttribute("content", getThemeColor(resolvedTheme));
    }

    applyTheme();

    if (
      normalizedPreference !== THEME_PREFERENCE.SYSTEM ||
      mediaQuery == null
    ) {
      return undefined;
    }

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", applyTheme);
      return () => mediaQuery.removeEventListener("change", applyTheme);
    }

    if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(applyTheme);
      return () => mediaQuery.removeListener(applyTheme);
    }

    return undefined;
  }, [preference]);

  useEffect(() => {
    document.documentElement.style.fontSize = resolveRootFontSize(fontScale);
    document.documentElement.dataset.contrast = contrast;
    document.documentElement.dataset.motion = motionPreference;
  }, [fontScale, contrast, motionPreference]);

  return null;
}
