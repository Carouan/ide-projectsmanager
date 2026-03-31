import en from "./en.json";
import fr from "./fr.json";

const TRANSLATIONS = {
  en,
  fr,
};

function resolveKey(dictionary, key) {
  return key.split(".").reduce((acc, part) => acc?.[part], dictionary);
}

export function useI18n(language) {
  const currentLanguage = language && TRANSLATIONS[language] ? language : "fr";

  function t(key) {
    const value =
      resolveKey(TRANSLATIONS[currentLanguage], key) ??
      resolveKey(TRANSLATIONS.fr, key);

    return typeof value === "string" ? value : key;
  }

  return { t, language: currentLanguage };
}
