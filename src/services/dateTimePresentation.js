const PRESENTATION_LOCALES = {
  fr: "fr-BE",
  en: "en-GB",
};

function validDate(value) {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function resolvePresentationLocale(locale) {
  return PRESENTATION_LOCALES[locale] || PRESENTATION_LOCALES.fr;
}

export function formatDateTime(value, locale = "fr", options = {}) {
  const date = validDate(value);
  if (!date) return "";

  const formatOptions = {
    dateStyle: "medium",
    timeStyle: "short",
    hourCycle: "h23",
  };

  if (options.timeZone) {
    formatOptions.timeZone = options.timeZone;
  }

  return new Intl.DateTimeFormat(
    resolvePresentationLocale(locale),
    formatOptions
  ).format(date);
}

export function formatCalendarDate(value, locale = "fr", options = {}) {
  if (typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

    if (match) {
      const [, year, month, day] = match.map(Number);
      const date = new Date(`${value}T00:00:00.000Z`);

      if (
        Number.isNaN(date.getTime()) ||
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() + 1 !== month ||
        date.getUTCDate() !== day
      ) {
        return "";
      }

      return new Intl.DateTimeFormat(resolvePresentationLocale(locale), {
        dateStyle: "medium",
        timeZone: "UTC",
      }).format(date);
    }
  }

  const date = validDate(value);
  if (!date) return "";

  const formatOptions = { dateStyle: "medium" };

  if (options.timeZone) {
    formatOptions.timeZone = options.timeZone;
  }

  return new Intl.DateTimeFormat(
    resolvePresentationLocale(locale),
    formatOptions
  ).format(date);
}
