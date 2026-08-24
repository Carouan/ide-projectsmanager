import assert from "node:assert/strict";
import test from "node:test";

import {
  applyKnownPortfolioProgressMigrations,
  formatProjectProgress,
  normalizeProjectProgress,
  normalizeProjectProgressDocument,
  previewKnownPortfolioProgressMigrations,
  previewKnownProjectProgressMigration,
} from "../src/services/projectProgress.js";
import {
  createProjectBundle,
  validateProjectBundle,
} from "../src/services/jsonTransfer.js";
import { projectToMarkdown } from "../src/services/markdownExport.js";

const CREATED_AT = "2026-08-20T10:00:00.000Z";
const MIGRATED_AT = "2026-08-24T09:00:00.000Z";

function project(id, options = {}) {
  return {
    schemaVersion: "1.0",
    project: {
      id,
      title: options.title || id,
      summary: "Un projet de test.",
      status: "active",
      currentStage: options.currentStage || "v0_7",
      createdAt: CREATED_AT,
      updatedAt: CREATED_AT,
      ...(Object.prototype.hasOwnProperty.call(options, "progressPercent")
        ? { progressPercent: options.progressPercent }
        : {}),
      ...(options.projectFields || {}),
    },
    stages: {},
    backlog: [],
    journal: options.journal || [],
    decisions: [],
    ...(options.documentFields || {}),
  };
}

test("declared progress accepts integer boundaries and normalized imported strings", () => {
  assert.equal(normalizeProjectProgress(0), 0);
  assert.equal(normalizeProjectProgress(42), 42);
  assert.equal(normalizeProjectProgress(100), 100);
  assert.equal(normalizeProjectProgress("0"), 0);
  assert.equal(normalizeProjectProgress(" 65 "), 65);
  assert.equal(normalizeProjectProgress("100"), 100);
});

test("missing, invalid, fractional and out-of-range progress remains undeclared", () => {
  for (const value of [
    null,
    undefined,
    "",
    " ",
    -1,
    101,
    7.5,
    NaN,
    Infinity,
    true,
    "25 %",
    "5.5",
    "-5",
    {},
  ]) {
    assert.equal(normalizeProjectProgress(value), null);
  }
});

test("legacy project normalization adds null while preserving unknown fields", () => {
  const legacyProject = project("legacy", {
    projectFields: { customLegacyValue: "preserved" },
    documentFields: { unknownExtension: { enabled: true } },
  });
  const originalDocument = JSON.stringify(legacyProject);
  const normalized = normalizeProjectProgressDocument(legacyProject);

  assert.equal(normalized.project.progressPercent, null);
  assert.equal(normalized.project.customLegacyValue, "preserved");
  assert.deepEqual(normalized.unknownExtension, { enabled: true });
  assert.equal(JSON.stringify(legacyProject), originalDocument);
});

test("invalid imported progress is normalized without changing valid values", () => {
  assert.equal(
    normalizeProjectProgressDocument(project("invalid", { progressPercent: 101 }))
      .project.progressPercent,
    null
  );
  assert.equal(
    normalizeProjectProgressDocument(project("valid", { progressPercent: "72" }))
      .project.progressPercent,
    72
  );
});

test("presentation distinguishes declared zero from an undeclared value", () => {
  assert.equal(formatProjectProgress(0, "Non déclarée"), "0 %");
  assert.equal(formatProjectProgress(100, "Not declared"), "100 %");
  assert.equal(formatProjectProgress(null, "Non déclarée"), "Non déclarée");
  assert.equal(formatProjectProgress(undefined, "Not declared"), "Not declared");
});

test("known portfolio progress is previewed from an exact standalone journal line", () => {
  const imported = project("portfolio", {
    title: "Projet importé",
    journal: [
      {
        title: "Import depuis Sites",
        content: "Origine : portfolio personnel\nProgression déclarée : 65 %",
      },
    ],
  });
  const originalDocument = JSON.stringify(imported);

  assert.deepEqual(previewKnownProjectProgressMigration(imported), {
    projectId: "portfolio",
    projectTitle: "Projet importé",
    progressPercent: 65,
  });
  assert.equal(JSON.stringify(imported), originalDocument);
});

test("portfolio recovery accepts known title lines and the valid zero boundary", () => {
  const imported = project("portfolio-zero", {
    journal: [{ title: "Progression déclarée : 0 %" }],
  });

  assert.equal(
    previewKnownProjectProgressMigration(imported).progressPercent,
    0
  );
});

test("portfolio recovery never guesses from general text, stages or GitHub facts", () => {
  for (const content of [
    "Le projet est terminé à 60 %.",
    "progression déclarée : 60 %",
    "Progression déclarée : 60 % (estimation)",
    "Progress: 60%",
    "Progression déclarée : 101 %",
  ]) {
    assert.equal(
      previewKnownProjectProgressMigration(
        project("free-text", {
          journal: [{ content }],
          documentFields: {
            repository: { fullName: "example/active-repository" },
          },
        })
      ),
      null
    );
  }
});

test("existing declared values and conflicting legacy lines are never replaced", () => {
  assert.equal(
    previewKnownProjectProgressMigration(
      project("existing-zero", {
        progressPercent: 0,
        journal: [{ content: "Progression déclarée : 72 %" }],
      })
    ),
    null
  );
  assert.equal(
    previewKnownProjectProgressMigration(
      project("conflicting", {
        journal: [
          { content: "Progression déclarée : 20 %" },
          { content: "Progression déclarée : 80 %" },
        ],
      })
    ),
    null
  );
});

test("portfolio migration previews and applies only explicitly eligible projects", () => {
  const eligible = project("eligible", {
    journal: [{ content: "Progression déclarée : 65 %" }],
  });
  const declared = project("declared", {
    progressPercent: 90,
    journal: [{ content: "Progression déclarée : 35 %" }],
  });
  const unknown = project("unknown");
  const originalProjects = [eligible, declared, unknown];

  assert.deepEqual(previewKnownPortfolioProgressMigrations(originalProjects), [
    {
      projectId: "eligible",
      projectTitle: "eligible",
      progressPercent: 65,
    },
  ]);

  const result = applyKnownPortfolioProgressMigrations(originalProjects, {
    now: MIGRATED_AT,
  });

  assert.equal(result.migratedCount, 1);
  assert.equal(result.projects[0].project.progressPercent, 65);
  assert.equal(result.projects[0].project.updatedAt, MIGRATED_AT);
  assert.equal(result.projects[1], declared);
  assert.equal(result.projects[2], unknown);
  assert.equal(eligible.project.progressPercent, undefined);
  assert.equal(declared.project.progressPercent, 90);
});

test("empty and already-declared portfolios remain unchanged", () => {
  assert.deepEqual(previewKnownPortfolioProgressMigrations(null), []);
  assert.deepEqual(applyKnownPortfolioProgressMigrations(null), {
    projects: [],
    migrations: [],
    migratedCount: 0,
  });

  const projects = [project("declared", { progressPercent: 100 })];
  assert.equal(applyKnownPortfolioProgressMigrations(projects).projects, projects);
});

test("single-project and global JSON exports preserve declared and undeclared progress", () => {
  const projects = [
    normalizeProjectProgressDocument(project("zero", { progressPercent: 0 })),
    normalizeProjectProgressDocument(project("complete", { progressPercent: 100 })),
    normalizeProjectProgressDocument(project("undeclared")),
  ];
  const singleProject = JSON.parse(JSON.stringify(projects[0]));
  const bundle = createProjectBundle(projects, { exportedAt: CREATED_AT });
  const restored = validateProjectBundle(JSON.parse(JSON.stringify(bundle)));

  assert.equal(singleProject.project.progressPercent, 0);
  assert.deepEqual(
    restored.projects.map((projectDoc) => projectDoc.project.progressPercent),
    [0, 100, null]
  );
});

test("Markdown includes declared progress and localized undeclared labels", () => {
  const declaredMarkdown = projectToMarkdown(
    project("declared", { progressPercent: 0 }),
    { locale: "fr", timeZone: "UTC" }
  );
  const undeclaredFrench = projectToMarkdown(project("undeclared"), {
    locale: "fr",
    timeZone: "UTC",
  });
  const undeclaredEnglish = projectToMarkdown(project("undeclared"), {
    locale: "en",
    timeZone: "UTC",
  });

  assert.match(declaredMarkdown, /- Progression déclarée : 0 %/);
  assert.match(undeclaredFrench, /- Progression déclarée : Non déclarée/);
  assert.match(undeclaredEnglish, /- Progression déclarée : Not declared/);
});
