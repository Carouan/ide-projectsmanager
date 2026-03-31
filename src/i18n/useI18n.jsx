import { createContext, useContext, useMemo } from "react";
import fr from "./fr.json";
import en from "./en.json";

const I18nContext = createContext({
  locale: "fr",
  t: (key, params = {}) => key,
});

const TRANSLATIONS = {
  fr,
  en,
};

function createTranslator(locale) {
  const selectedLocale = TRANSLATIONS[locale] ? locale : "fr";
  const dictionary = TRANSLATIONS[selectedLocale];
  const fallbackDictionary = TRANSLATIONS.fr;

  return function translate(key, params = {}) {
    const resolvedValue = dictionary[key] ?? fallbackDictionary[key] ?? key;

    if (typeof resolvedValue !== "string") {
      return resolvedValue;
    }

    return resolvedValue.replace(/\{\{(\w+)\}\}/g, (token, paramName) => {
      if (Object.prototype.hasOwnProperty.call(params, paramName)) {
        return String(params[paramName]);
      }

      return token;
    });
  };
}

export function I18nProvider({ locale, children }) {
  const value = useMemo(
    () => ({
      locale: TRANSLATIONS[locale] ? locale : "fr",
      t: createTranslator(locale),
    }),
    [locale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
