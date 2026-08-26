import assert from "node:assert/strict";
import test from "node:test";

import {
  DASHBOARD_ATTENTION_FILTER,
  DASHBOARD_REPOSITORY_FILTER,
  DASHBOARD_SORT_DIRECTION,
  DASHBOARD_SORT_FIELD,
  DEFAULT_DASHBOARD_FILTERS,
  createDashboardProjectRows,
  deriveDashboardFilterOptions,
  hasActiveDashboardFilters,
  normalizeDashboardPreferences,
  selectDashboardProjects,
} from "../src/features/projects/services/projectDashboardModel.js";

function project(id, options = {}) {
  return {
    project: {
      id,
      title: options.title || id,
      summary: options.summary || "",
      description: options.description || "",
      status: options.status || "active",
      currentStage: Object.hasOwn(options, "currentStage")
        ? options.currentStage
        : "v0_2",
      updatedAt: options.updatedAt || "2026-08-20T10:00:00.000Z",
      tags: options.tags || [],
      ...(Object.hasOwn(options, "category")
        ? { category: options.category }
        : {}),
      ...(Object.hasOwn(options, "progressPercent")
        ? { progressPercent: options.progressPercent }
        : {}),
    },
    repository: options.repository || null,
    decisions: options.decisions || [],
    backlog: options.backlog || [],
  };
}

function repository(fullName) {
  return { provider: "github", fullName };
}

function roadmapResult(percent, completed = percent, total = 100) {
  return {
    status: "fresh",
    snapshot: {
      roadmap: { percent, completed, total },
      openPullRequests: [],
    },
  };
}

function projectIds(rows) {
  return rows.map((row) => row.projectId);
}

test("dashboard rows reuse shared GitHub snapshots for effective progress", () => {
  const projects = [
    project("linked", { repository: repository("Carouan/linked") }),
    project("local", { currentStage: "v0_7" }),
  ];
  const snapshots = { linked: roadmapResult(49, 44, 89) };
  const [linked, local] = createDashboardProjectRows(projects, snapshots);

  assert.equal(linked.repositoryResult, snapshots.linked);
  assert.deepEqual(
    { percent: linked.progress.percent, source: linked.progress.source },
    { percent: 49, source: "roadmap" }
  );
  assert.deepEqual(
    { percent: local.progress.percent, source: local.progress.source },
    { percent: 70, source: "stage" }
  );
});

test("manual progress remains the dashboard priority over roadmap and stage", () => {
  const rows = createDashboardProjectRows(
    [
      project("manual", {
        currentStage: "v0_2",
        progressPercent: 83,
        repository: repository("Carouan/manual"),
      }),
    ],
    { manual: roadmapResult(49) }
  );

  assert.equal(rows[0].progress.percent, 83);
  assert.equal(rows[0].progress.source, "manual");
});

test("search is accent-insensitive and includes metadata, tags and repository", () => {
  const rows = createDashboardProjectRows([
    project("research", {
      title: "Évaluation des déchets",
      description: "Analyse scientifique",
      tags: ["laboratoire"],
      repository: repository("Carouan/hazardous-waste"),
    }),
    project("other", { title: "Cuisine" }),
  ]);

  for (const query of ["evaluation", "scientifique", "laboratoire", "hazardous"]) {
    assert.deepEqual(
      projectIds(selectDashboardProjects(rows, { filters: { query } })),
      ["research"]
    );
  }
});

test("status, tag and category filters combine deterministically", () => {
  const rows = createDashboardProjectRows([
    project("matching", {
      status: "active",
      category: "Recherche",
      tags: ["Urgent"],
    }),
    project("wrong-status", {
      status: "archived",
      category: "Recherche",
    }),
    project("wrong-category", { status: "active", tags: ["design"] }),
  ]);

  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { status: "active", category: "recherche" },
      })
    ),
    ["matching"]
  );
  assert.deepEqual(
    projectIds(selectDashboardProjects(rows, { filters: { category: "urgent" } })),
    ["matching"]
  );
});

test("filter options expose sorted, case-insensitive tags and categories", () => {
  const rows = createDashboardProjectRows([
    project("first", {
      status: "stale",
      category: "Recherche",
      tags: ["Alpha", "beta"],
    }),
    project("second", {
      status: "active",
      category: "recherche",
      tags: ["alpha", "Gamma"],
    }),
  ]);

  assert.deepEqual(deriveDashboardFilterOptions(rows, "fr"), {
    statuses: ["active", "stale"],
    categories: ["Alpha", "beta", "Gamma", "Recherche"],
  });
});

test("repository linkage filtering works locally without requiring snapshots", () => {
  const rows = createDashboardProjectRows([
    project("linked", { repository: repository("Carouan/linked") }),
    project("local"),
  ]);

  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { repository: DASHBOARD_REPOSITORY_FILTER.LINKED },
      })
    ),
    ["linked"]
  );
  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { repository: DASHBOARD_REPOSITORY_FILTER.LOCAL },
      })
    ),
    ["local"]
  );
});

test("human-attention filters distinguish action, information and no signal", () => {
  const rows = createDashboardProjectRows([
    project("decision", {
      decisions: [{ id: "d1", status: "pending", title: "Choose" }],
    }),
    project("information", { status: "stale" }),
    project("quiet"),
  ]);

  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { attention: DASHBOARD_ATTENTION_FILTER.ACTION_REQUIRED },
      })
    ),
    ["decision"]
  );
  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { attention: DASHBOARD_ATTENTION_FILTER.INFORMATION },
      })
    ),
    ["information"]
  );
  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        filters: { attention: DASHBOARD_ATTENTION_FILTER.NONE },
      })
    ),
    ["quiet"]
  );
});

test("title sorting uses locale-aware ascending and descending order", () => {
  const rows = createDashboardProjectRows([
    project("z", { title: "Zèbre" }),
    project("a", { title: "Alpha" }),
    project("e", { title: "Écho" }),
  ]);

  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        preferences: {
          dashboardSortField: DASHBOARD_SORT_FIELD.TITLE,
          dashboardSortDirection: DASHBOARD_SORT_DIRECTION.ASCENDING,
        },
      })
    ),
    ["a", "e", "z"]
  );
  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        preferences: {
          dashboardSortField: DASHBOARD_SORT_FIELD.TITLE,
          dashboardSortDirection: DASHBOARD_SORT_DIRECTION.DESCENDING,
        },
      })
    ),
    ["z", "e", "a"]
  );
});

test("updated-at sorting defaults to newest first and supports oldest first", () => {
  const rows = createDashboardProjectRows([
    project("old", { updatedAt: "2026-08-19T10:00:00.000Z" }),
    project("new", { updatedAt: "2026-08-24T10:00:00.000Z" }),
  ]);

  assert.deepEqual(projectIds(selectDashboardProjects(rows)), ["new", "old"]);
  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        preferences: { dashboardSortDirection: "asc" },
      })
    ),
    ["old", "new"]
  );
});

test("progress sorting uses effective roadmap, manual and stage percentages", () => {
  const rows = createDashboardProjectRows(
    [
      project("manual", { progressPercent: 80 }),
      project("roadmap", { repository: repository("Carouan/roadmap") }),
      project("stage", { currentStage: "v0_2" }),
    ],
    { roadmap: roadmapResult(49, 44, 89) }
  );

  assert.deepEqual(
    projectIds(
      selectDashboardProjects(rows, {
        preferences: {
          dashboardSortField: DASHBOARD_SORT_FIELD.PROGRESS,
          dashboardSortDirection: DASHBOARD_SORT_DIRECTION.DESCENDING,
        },
      })
    ),
    ["manual", "roadmap", "stage"]
  );
});

test("unavailable progress always appears last in either sort direction", () => {
  const rows = createDashboardProjectRows([
    project("unavailable", { currentStage: "unknown" }),
    project("zero", { progressPercent: 0 }),
    project("advanced", { progressPercent: 80 }),
  ]);

  for (const [direction, expected] of [
    ["asc", ["zero", "advanced", "unavailable"]],
    ["desc", ["advanced", "zero", "unavailable"]],
  ]) {
    assert.deepEqual(
      projectIds(
        selectDashboardProjects(rows, {
          preferences: {
            dashboardSortField: DASHBOARD_SORT_FIELD.PROGRESS,
            dashboardSortDirection: direction,
          },
        })
      ),
      expected
    );
  }
});

test("missing timestamps stay last and equal sort values have a stable tie-break", () => {
  const rows = createDashboardProjectRows([
    project("z", { title: "Zulu" }),
    project("a", { title: "Alpha" }),
    project("invalid", { updatedAt: "not-a-date" }),
  ]);

  assert.deepEqual(projectIds(selectDashboardProjects(rows)), ["a", "z", "invalid"]);
});

test("stored display preferences are normalized without persisting transient filters", () => {
  assert.deepEqual(normalizeDashboardPreferences({}), {
    dashboardView: "grid",
    dashboardSortField: "updatedAt",
    dashboardSortDirection: "desc",
  });
  assert.deepEqual(
    normalizeDashboardPreferences({
      dashboardView: "list",
      dashboardSortField: "progress",
      dashboardSortDirection: "asc",
      query: "temporary",
    }),
    {
      dashboardView: "list",
      dashboardSortField: "progress",
      dashboardSortDirection: "asc",
    }
  );
  assert.equal(normalizeDashboardPreferences({ dashboardView: "broken" }).dashboardView, "grid");
});

test("filter reset detection distinguishes blank search and active controls", () => {
  assert.equal(hasActiveDashboardFilters(DEFAULT_DASHBOARD_FILTERS), false);
  assert.equal(
    hasActiveDashboardFilters({ ...DEFAULT_DASHBOARD_FILTERS, query: "  " }),
    false
  );
  assert.equal(
    hasActiveDashboardFilters({ ...DEFAULT_DASHBOARD_FILTERS, query: "project" }),
    true
  );
  assert.equal(
    hasActiveDashboardFilters({
      ...DEFAULT_DASHBOARD_FILTERS,
      attention: DASHBOARD_ATTENTION_FILTER.NONE,
    }),
    true
  );
});
