import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildDefaultStages,
  formatStageLabel,
  STAGE_DEFINITIONS,
} from "../src/constants/stages.js";
import {
  createProjectBundle,
  validateProjectBundle,
} from "../src/services/jsonTransfer.js";
import { projectToMarkdown } from "../src/services/markdownExport.js";

function project() {
  return {
    schemaVersion: "1.0",
    project: {
      id: "stage-label-project",
      title: "Projet de test",
      summary: "Un projet avec des références d’étapes historiques.",
      status: "active",
      ownerId: "local-user",
      currentStage: "v0_2",
      createdAt: "2026-08-22T10:00:00.000Z",
      updatedAt: "2026-08-22T10:00:00.000Z",
    },
    stages: buildDefaultStages(),
    backlog: [
      {
        title: "Élément lié",
        status: "open",
        type: "idea",
        priority: "medium",
        source: "manual",
        relatedStage: "v0_2",
      },
    ],
    journal: [
      {
        title: "Note liée",
        type: "note",
        stage: "v0_2",
        createdAt: "2026-08-22T10:00:00.000Z",
        content: "Conserver les clés internes du projet.",
      },
    ],
    decisions: [],
  };
}

test("every supported stage spelling is presented using the canonical dotted label", () => {
  for (const definition of STAGE_DEFINITIONS) {
    assert.equal(formatStageLabel(definition.key), definition.version);
    assert.equal(formatStageLabel(definition.version), definition.version);
    assert.equal(formatStageLabel(definition.shortTitle), definition.version);
    assert.equal(formatStageLabel(` ${definition.key} `), definition.version);
  }

  assert.equal(formatStageLabel("v0_2"), "v.0.2");
  assert.equal(formatStageLabel("v0.2"), "v.0.2");
  assert.equal(formatStageLabel("v.0.2"), "v.0.2");
  assert.equal(formatStageLabel("v1_0"), "v.1.0");
});

test("unknown values remain safe without reformatting application versions", () => {
  assert.equal(formatStageLabel("unknown-stage"), "unknown-stage");
  assert.equal(formatStageLabel("v2.3.4"), "v2.3.4");
  assert.equal(formatStageLabel(""), "");
  assert.equal(formatStageLabel("  "), "");
  assert.equal(formatStageLabel(null), "");
  assert.equal(formatStageLabel(undefined), "");
  assert.equal(formatStageLabel(42), "");
});

test("French and English visible guidance consistently uses dotted stage labels", () => {
  for (const locale of ["fr", "en"]) {
    const dictionary = JSON.parse(
      readFileSync(new URL(`../src/i18n/${locale}.json`, import.meta.url), "utf8")
    );
    const visibleText = Object.values(dictionary)
      .flatMap((value) => (Array.isArray(value) ? value : [value]))
      .filter((value) => typeof value === "string")
      .join("\n");

    assert.match(visibleText, /v\.0\.0/);
    assert.match(visibleText, /v\.1\.0/);
    assert.doesNotMatch(visibleText, /(?:^|[^\w])v[01]\.(?:\d|x)\b/);
  }
});

test("human-readable Markdown uses stage labels without leaking technical keys", () => {
  const projectDoc = project();
  const originalDocument = JSON.stringify(projectDoc);
  const markdown = projectToMarkdown(projectDoc);

  assert.match(markdown, /- Étape actuelle : v\.0\.2/);
  assert.match(markdown, /### v\.0\.2 — Formalisation des exigences/);
  assert.match(markdown, /- Étape liée : v\.0\.2/);
  assert.match(markdown, /- Étape : v\.0\.2/);
  assert.doesNotMatch(markdown, /- Clé :/);
  assert.doesNotMatch(markdown, /v0_2/);
  assert.equal(JSON.stringify(projectDoc), originalDocument);
});

test("JSON backup and restore preserve internal stage keys and references", () => {
  const projectDoc = project();
  const bundle = createProjectBundle([projectDoc], {
    exportedAt: "2026-08-22T10:00:00.000Z",
  });
  const restoredBundle = validateProjectBundle(JSON.parse(JSON.stringify(bundle)));
  const restoredProject = restoredBundle.projects[0];

  assert.equal(restoredProject.project.currentStage, "v0_2");
  assert.equal(restoredProject.stages.v0_2.version, "v.0.2");
  assert.equal(restoredProject.backlog[0].relatedStage, "v0_2");
  assert.equal(restoredProject.journal[0].stage, "v0_2");
});
