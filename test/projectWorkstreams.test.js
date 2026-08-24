import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultStages } from "../src/constants/stages.js";
import {
  createProjectBundle,
  restoreProjectBundle,
  validateProjectBundle,
} from "../src/services/jsonTransfer.js";
import { projectToMarkdown } from "../src/services/markdownExport.js";
import { createEmptyProject } from "../src/services/projectFactory.js";
import { resolveProjectProgress } from "../src/services/projectProgress.js";
import {
  createProjectWorkstream,
  inspectProjectWorkstreamReferences,
  normalizeBacklogWorkstreamReferences,
  normalizeProjectWorkstreams,
  normalizeWorkstreams,
  ProjectWorkstreamError,
  suggestProjectWorkstreams,
  WORKSTREAM_PROJECT_TYPE,
  WORKSTREAM_STATUS,
} from "../src/services/projectWorkstreams.js";

const NOW = "2026-08-24T14:00:00.000Z";

function project(id = "project-1", options = {}) {
  return {
    schemaVersion: "1.0",
    project: {
      id,
      title: options.title || "Projet de recherche",
      summary: "Un projet pouvant avancer sur plusieurs fronts.",
      status: "active",
      currentStage: "v0_2",
      createdAt: NOW,
      updatedAt: NOW,
      ...(options.project || {}),
    },
    stages: buildDefaultStages(),
    backlog: options.backlog || [],
    journal: [],
    decisions: [],
    ...(Object.prototype.hasOwnProperty.call(options, "workstreams")
      ? { workstreams: options.workstreams }
      : {}),
    ...(options.extra || {}),
  };
}

test("legacy projects acquire an empty workstream collection without losing data", () => {
  const legacy = project("legacy", {
    backlog: [{ id: "b1", title: "Existing task", relatedStage: "v0_2" }],
    extra: { legacyExtension: { keep: true } },
  });
  const original = JSON.stringify(legacy);
  const normalized = normalizeProjectWorkstreams(legacy);

  assert.deepEqual(normalized.workstreams, []);
  assert.deepEqual(normalized.legacyExtension, { keep: true });
  assert.deepEqual(normalized.backlog[0], legacy.backlog[0]);
  assert.equal(normalized.schemaVersion, "1.0");
  assert.equal(JSON.stringify(legacy), original);
});

test("new projects start empty without imposing a software template", () => {
  const projectDoc = createEmptyProject("local-owner");

  assert.deepEqual(projectDoc.workstreams, []);
  assert.deepEqual(projectDoc.backlog, []);
  assert.equal(projectDoc.project.ownerId, "local-owner");
  assert.equal(projectDoc.schemaVersion, "1.0");
});

test("absent, null and invalid workstream collections normalize safely", () => {
  for (const value of [undefined, null, "invalid", {}, 42]) {
    assert.deepEqual(normalizeWorkstreams(value), []);
  }
  assert.equal(normalizeProjectWorkstreams(null), null);
});

test("normalization preserves stable identifiers and optional presentation metadata", () => {
  const [workstream] = normalizeWorkstreams([
    {
      id: "ws_regulatory",
      title: "  Réglementation  ",
      description: "ADR, CLP et REACH",
      category: "research",
      icon: "flask",
      color: "#2f855a",
      status: "blocked",
      order: 20,
      archived: false,
      customExtension: { preserved: true },
    },
  ]);

  assert.deepEqual(workstream, {
    id: "ws_regulatory",
    title: "Réglementation",
    description: "ADR, CLP et REACH",
    category: "research",
    icon: "flask",
    color: "#2f855a",
    status: WORKSTREAM_STATUS.BLOCKED,
    order: 20,
    archived: false,
    customExtension: { preserved: true },
  });
});

test("missing and duplicate workstream identifiers are repaired deterministically", () => {
  const raw = [
    { title: "État de l'art" },
    { id: "shared", title: "One" },
    { id: "shared", title: "Two" },
    "Documentation",
    null,
  ];
  const first = normalizeWorkstreams(raw);
  const second = normalizeWorkstreams(raw);

  assert.deepEqual(first, second);
  assert.deepEqual(
    first.map(({ id }) => id),
    ["ws_etat_de_l_art_1", "shared", "shared_2", "ws_documentation_4"]
  );
});

test("invalid presentation values and historical statuses normalize explicitly", () => {
  const normalized = normalizeWorkstreams([
    { id: "active", title: "A", status: "in_progress", icon: 42 },
    { id: "planned", title: "B", status: "todo", color: false },
    { id: "completed", title: "C", status: "done" },
    { id: "archived", title: "D", status: "archived" },
  ]);

  assert.deepEqual(normalized.map(({ status }) => status), [
    "active",
    "planned",
    "completed",
    "paused",
  ]);
  assert.equal(normalized[0].icon, null);
  assert.equal(normalized[1].color, null);
  assert.equal(normalized[3].archived, true);
});

test("workstream ordering is deterministic and keeps original ties stable", () => {
  const normalized = normalizeWorkstreams([
    { id: "late", title: "Late", order: 20 },
    { id: "first", title: "First", order: 5 },
    { id: "tie", title: "Tie", order: 5 },
  ]);

  assert.deepEqual(normalized.map(({ id }) => id), ["first", "tie", "late"]);
});

test("backlog links remain optional and preserve historical stage references", () => {
  const legacy = { id: "old", relatedStage: "v0_2" };
  const linked = {
    id: "linked",
    workstreamId: "  ws_method  ",
    stageKey: "  v0_4  ",
    dependencyIds: ["existing-task"],
  };

  assert.deepEqual(normalizeBacklogWorkstreamReferences(legacy), legacy);
  assert.deepEqual(normalizeBacklogWorkstreamReferences(linked), {
    id: "linked",
    workstreamId: "ws_method",
    stageKey: "v0_4",
    dependencyIds: ["existing-task"],
  });
  assert.deepEqual(
    normalizeBacklogWorkstreamReferences({ workstreamId: "", stageKey: 4 }),
    { workstreamId: null, stageKey: null }
  );
});

test("unknown backlog workstreams and stages are diagnosed without deleting data", () => {
  const projectDoc = project("broken", {
    workstreams: [{ id: "ws_known", title: "Known" }],
    backlog: [
      { id: "valid", workstreamId: "ws_known", stageKey: "v0_2" },
      { id: "unknown", workstreamId: "ws_missing", stageKey: "v9_9" },
    ],
  });
  const normalized = normalizeProjectWorkstreams(projectDoc);

  assert.equal(normalized.backlog[1].workstreamId, "ws_missing");
  assert.equal(normalized.backlog[1].stageKey, "v9_9");
  assert.deepEqual(inspectProjectWorkstreamReferences(normalized), [
    {
      code: "unknown_workstream",
      backlogId: "unknown",
      workstreamId: "ws_missing",
    },
    { code: "unknown_stage", backlogId: "unknown", stageKey: "v9_9" },
  ]);
});

test("new workstreams receive a stable identifier and the next available order", () => {
  const created = createProjectWorkstream(
    { title: "Méthodologie", description: "Définir le protocole" },
    {
      existingWorkstreams: [{ id: "ws_existing", title: "Existing", order: 30 }],
      idFactory: () => "ws_method",
    }
  );

  assert.deepEqual(created, {
    id: "ws_method",
    title: "Méthodologie",
    description: "Définir le protocole",
    status: "active",
    order: 40,
    archived: false,
  });
});

test("invalid creation requests fail clearly without inventing or replacing data", () => {
  assert.throws(
    () => createProjectWorkstream({ title: " " }),
    (error) =>
      error instanceof ProjectWorkstreamError &&
      error.code === "invalid_workstream_title"
  );
  assert.throws(
    () =>
      createProjectWorkstream(
        { id: "ws_existing", title: "Duplicate" },
        { existingWorkstreams: [{ id: "ws_existing", title: "Original" }] }
      ),
    (error) => error.code === "duplicate_workstream_id"
  );
  assert.throws(
    () => createProjectWorkstream({ title: "Invalid" }, { idFactory: () => "" }),
    (error) => error.code === "invalid_workstream_id"
  );
});

test("software, research, association and personal suggestions stay optional", () => {
  for (const projectType of Object.values(WORKSTREAM_PROJECT_TYPE)) {
    const suggestions = suggestProjectWorkstreams(projectType);

    assert.ok(suggestions.length >= 4);
    assert.ok(suggestions.every(({ category }) => category === projectType));
    assert.ok(suggestions.every(({ status }) => status === "planned"));
  }

  assert.deepEqual(suggestProjectWorkstreams("unknown"), []);
  assert.ok(
    suggestProjectWorkstreams("research").some(
      ({ title }) => title === "Méthodologie"
    )
  );
  assert.ok(
    suggestProjectWorkstreams("association").some(
      ({ title }) => title === "Juridique"
    )
  );
});

test("suggestion titles are localized without changing stable identifiers", () => {
  const french = suggestProjectWorkstreams("research", { locale: "fr" });
  const english = suggestProjectWorkstreams("research", { locale: "en" });

  assert.equal(french[0].title, "État de l'art");
  assert.equal(english[0].title, "Literature review");
  assert.deepEqual(
    french.map(({ id }) => id),
    english.map(({ id }) => id)
  );
});

test("suggested workstreams are independent mutable copies", () => {
  const first = suggestProjectWorkstreams("personal");
  const second = suggestProjectWorkstreams("personal");

  first[0].title = "Customized";

  assert.notEqual(second[0].title, "Customized");
});

test("single-project JSON round trips preserve workstreams and backlog links", () => {
  const projectDoc = normalizeProjectWorkstreams(
    project("roundtrip", {
      workstreams: [{ id: "ws_method", title: "Méthodologie" }],
      backlog: [{ id: "b1", workstreamId: "ws_method", stageKey: "v0_2" }],
    })
  );
  const roundTripped = JSON.parse(JSON.stringify(projectDoc));

  assert.deepEqual(roundTripped.workstreams, projectDoc.workstreams);
  assert.equal(roundTripped.backlog[0].workstreamId, "ws_method");
  assert.equal(roundTripped.backlog[0].stageKey, "v0_2");
  assert.equal(roundTripped.schemaVersion, "1.0");
});

test("global JSON backups and safe copies preserve independent workstream links", () => {
  const original = normalizeProjectWorkstreams(
    project("existing", {
      workstreams: [{ id: "ws_method", title: "Méthodologie" }],
      backlog: [{ id: "b1", workstreamId: "ws_method", stageKey: "v0_2" }],
    })
  );
  const bundle = validateProjectBundle(
    createProjectBundle([original], { exportedAt: NOW })
  );
  const restored = restoreProjectBundle(bundle, [project("existing")], {
    conflictStrategy: "copy",
    idFactory: () => "existing-copy",
    now: NOW,
  });
  const copy = restored.projects[0];

  assert.equal(copy.project.id, "existing-copy");
  assert.equal(copy.workstreams[0].id, "ws_method");
  assert.equal(copy.backlog[0].workstreamId, "ws_method");
  assert.equal(original.project.id, "existing");
  assert.equal(inspectProjectWorkstreamReferences(copy).length, 0);
});

test("workstreams never become an automatic project-progress calculation", () => {
  const projectDoc = project("progress", {
    workstreams: [
      { id: "ws_done", title: "Done", status: "completed" },
      { id: "ws_active", title: "Active", status: "active" },
    ],
  });

  assert.equal(resolveProjectProgress(projectDoc).percent, 20);
  assert.equal(resolveProjectProgress(projectDoc).source, "stage");
});

test("legacy Markdown stays unchanged when a project has no workstreams", () => {
  const legacy = project("legacy");
  const normalized = normalizeProjectWorkstreams(legacy);

  assert.equal(projectToMarkdown(normalized), projectToMarkdown(legacy));
  assert.doesNotMatch(projectToMarkdown(normalized), /## Chantiers/);
});

test("Markdown presents workstreams and their linked backlog stages", () => {
  const projectDoc = normalizeProjectWorkstreams(
    project("documented", {
      workstreams: [
        {
          id: "ws_method",
          title: "Méthodologie",
          description: "Définir un protocole reproductible",
          category: "research",
          status: "active",
        },
      ],
      backlog: [
        {
          id: "b1",
          title: "Rédiger le protocole",
          workstreamId: "ws_method",
          stageKey: "v0_4",
        },
      ],
    })
  );
  const markdown = projectToMarkdown(projectDoc);

  assert.match(markdown, /## Chantiers/u);
  assert.match(markdown, /### Méthodologie/u);
  assert.match(markdown, /Définir un protocole reproductible/u);
  assert.match(markdown, /- Chantier : Méthodologie/u);
  assert.match(markdown, /- Étape liée : v\.0\.4/u);
});

test("broken workstream references stay visible in French and English Markdown", () => {
  const projectDoc = project("broken-markdown", {
    workstreams: [{ id: "ws_known", title: "Known" }],
    backlog: [
      {
        id: "broken",
        title: "Broken link",
        workstreamId: "ws_missing",
        stageKey: "v9_9",
      },
    ],
  });

  assert.match(projectToMarkdown(projectDoc), /référence inconnue : ws_missing/u);
  assert.match(projectToMarkdown(projectDoc), /étape inconnue : v9_9/u);
  assert.match(
    projectToMarkdown(projectDoc, { locale: "en" }),
    /unknown reference: ws_missing/u
  );
  assert.match(
    projectToMarkdown(projectDoc, { locale: "en" }),
    /unknown stage: v9_9/u
  );
});
