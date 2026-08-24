import assert from "node:assert/strict";
import test from "node:test";

import {
  formatCalendarDate,
  formatDateTime,
  resolvePresentationLocale,
} from "../src/services/dateTimePresentation.js";
import {
  createProjectBundle,
  validateProjectBundle,
} from "../src/services/jsonTransfer.js";
import { projectToMarkdown } from "../src/services/markdownExport.js";

const TIMESTAMP = "2026-08-19T21:18:28.347Z";
const CALENDAR_DATE = "2026-08-19";
const BRUSSELS = "Europe/Brussels";

function project() {
  return {
    schemaVersion: "1.0",
    project: {
      id: "localized-date-project",
      title: "Projet de test",
      summary: "Des dates visibles sans modifier les données techniques.",
      status: "active",
      ownerId: "local-user",
      currentStage: "v0_2",
      createdAt: TIMESTAMP,
      updatedAt: TIMESTAMP,
    },
    stages: {},
    backlog: [],
    journal: [
      {
        title: "Une entrée de journal",
        type: "note",
        stage: "v0_2",
        createdAt: TIMESTAMP,
        content: "Conserver l’horodatage UTC d’origine.",
      },
    ],
    decisions: [
      {
        title: "Une décision",
        date: CALENDAR_DATE,
        status: "accepted",
        context: "Une date civile ne doit pas changer de jour.",
        decision: "Présenter les dates selon la langue de l’application.",
      },
    ],
    attachments: [{ id: "attachment-1", createdAt: TIMESTAMP }],
  };
}

test("presentation locales follow application language with a safe French fallback", () => {
  assert.equal(resolvePresentationLocale("fr"), "fr-BE");
  assert.equal(resolvePresentationLocale("en"), "en-GB");
  assert.equal(resolvePresentationLocale(undefined), "fr-BE");
  assert.equal(resolvePresentationLocale("unknown"), "fr-BE");
});

test("UTC timestamps use the selected language, local time zone and 24-hour format", () => {
  assert.equal(
    formatDateTime(TIMESTAMP, "fr", { timeZone: BRUSSELS }),
    "19 août 2026, 23:18"
  );
  assert.equal(
    formatDateTime(TIMESTAMP, "en", { timeZone: BRUSSELS }),
    "19 Aug 2026, 23:18"
  );
  assert.equal(
    formatDateTime(TIMESTAMP, "en", { timeZone: "Pacific/Honolulu" }),
    "19 Aug 2026, 11:18"
  );
  assert.doesNotMatch(
    formatDateTime(TIMESTAMP, "en", { timeZone: BRUSSELS }),
    /:28|\.347|\b(?:AM|PM)\b/i
  );
});

test("missing and invalid timestamps never render Invalid Date", () => {
  for (const value of [null, undefined, "", "not-a-date", new Date(NaN)]) {
    assert.equal(formatDateTime(value, "fr"), "");
    assert.equal(formatCalendarDate(value, "en"), "");
  }

  assert.equal(formatCalendarDate("2026-02-30", "fr"), "");
});

test("calendar-only decision dates keep the same civil day in every time zone", () => {
  for (const timeZone of ["Pacific/Honolulu", "Pacific/Kiritimati", BRUSSELS]) {
    assert.equal(
      formatCalendarDate(CALENDAR_DATE, "fr", { timeZone }),
      "19 août 2026"
    );
    assert.equal(
      formatCalendarDate(CALENDAR_DATE, "en", { timeZone }),
      "19 Aug 2026"
    );
  }
});

test("Markdown preview and downloads share localized, human-readable date presentation", () => {
  const projectDoc = project();
  const originalDocument = JSON.stringify(projectDoc);
  const frenchMarkdown = projectToMarkdown(projectDoc, {
    locale: "fr",
    timeZone: BRUSSELS,
  });
  const englishMarkdown = projectToMarkdown(projectDoc, {
    locale: "en",
    timeZone: BRUSSELS,
  });

  assert.match(frenchMarkdown, /- Créé le : 19 août 2026, 23:18/);
  assert.match(frenchMarkdown, /- Dernière mise à jour : 19 août 2026, 23:18/);
  assert.match(frenchMarkdown, /- Date : 19 août 2026, 23:18/);
  assert.match(frenchMarkdown, /- Date : 19 août 2026\n- Statut/);
  assert.match(englishMarkdown, /- Créé le : 19 Aug 2026, 23:18/);
  assert.match(englishMarkdown, /- Date : 19 Aug 2026\n- Statut/);
  assert.doesNotMatch(frenchMarkdown, /2026-08-19T21:18:28\.347Z/);
  assert.doesNotMatch(englishMarkdown, /2026-08-19T21:18:28\.347Z/);
  assert.equal(JSON.stringify(projectDoc), originalDocument);
});

test("Markdown safely replaces missing or invalid human-readable dates", () => {
  const projectDoc = project();
  projectDoc.project.createdAt = "not-a-date";
  projectDoc.project.updatedAt = undefined;
  projectDoc.journal[0].createdAt = null;
  projectDoc.decisions[0].date = "2026-02-30";

  const markdown = projectToMarkdown(projectDoc, {
    locale: "en",
    timeZone: BRUSSELS,
  });

  assert.match(markdown, /- Créé le : -/);
  assert.match(markdown, /- Dernière mise à jour : -/);
  assert.equal((markdown.match(/- Date : -/g) || []).length, 2);
  assert.doesNotMatch(markdown, /Invalid Date/);
});

test("JSON backups retain exact UTC timestamps, milliseconds and calendar dates", () => {
  const projectDoc = project();
  const exportedAt = "2026-08-19T21:19:44.918Z";
  const bundle = createProjectBundle([projectDoc], { exportedAt });
  const restored = validateProjectBundle(JSON.parse(JSON.stringify(bundle)));
  const restoredProject = restored.projects[0];

  assert.equal(restored.exportedAt, exportedAt);
  assert.equal(restoredProject.project.createdAt, TIMESTAMP);
  assert.equal(restoredProject.project.updatedAt, TIMESTAMP);
  assert.equal(restoredProject.journal[0].createdAt, TIMESTAMP);
  assert.equal(restoredProject.attachments[0].createdAt, TIMESTAMP);
  assert.equal(restoredProject.decisions[0].date, CALENDAR_DATE);
});
