import { createContext, useContext, useMemo } from "react";
import fr from "./fr.json";
import en from "./en.json";

const I18nContext = createContext({
  locale: "fr",
  t: (key) => key,
});

const TRANSLATIONS = {
  fr,
  en,
};

function createTranslator(locale) {
  const selectedLocale = TRANSLATIONS[locale] ? locale : "fr";
  const dictionary = TRANSLATIONS[selectedLocale];
  const fallbackDictionary = TRANSLATIONS.fr;

  return function translate(key) {
    if (dictionary[key]) return dictionary[key];
    if (fallbackDictionary[key]) return fallbackDictionary[key];
    return key;
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
