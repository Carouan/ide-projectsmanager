import assert from "node:assert/strict";
import test from "node:test";

import { buildDefaultStages } from "../src/constants/stages.js";
import {
  deriveWorkstreamPlanning,
  filterWorkstreamBacklog,
  mergeSuggestedWorkstreams,
  reorderProjectWorkstreams,
  updateBacklogWorkstreamAssignment,
  updateProjectWorkstream,
  WORKSTREAM_BACKLOG_FILTER,
} from "../src/features/projects/services/workstreamPlanningModel.js";
import { suggestProjectWorkstreams } from "../src/services/projectWorkstreams.js";

function project(options = {}) {
  return {
    project: {
      id: "project-1",
      title: "Research project",
      currentStage: options.currentStage || "v0_2",
    },
    stages: buildDefaultStages(),
    workstreams: options.workstreams || [],
    backlog: options.backlog || [],
    ...(options.extra || {}),
  };
}

function workstream(id, options = {}) {
  return { id, title: options.title || id, status: "active", ...options };
}

function task(id, options = {}) {
  return { id, title: options.title || id, status: "open", ...options };
}

test("an empty project produces a quiet planning surface with no invented work", () => {
  const planning = deriveWorkstreamPlanning(project());

  assert.equal(planning.rows.length, 0);
  assert.equal(planning.focus, null);
  assert.deepEqual(planning.summary, {
    total: 0,
    active: 0,
    blocked: 0,
    archived: 0,
    openAssigned: 0,
    unassigned: 0,
    withoutCoverage: 0,
  });
});

test("software and scientific fronts remain independent of project stages", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [
        workstream("ws_ui", { title: "UI / UX" }),
        workstream("ws_method", { title: "Méthodologie" }),
      ],
      backlog: [
        task("ui", { workstreamId: "ws_ui", stageKey: "v0_2" }),
        task("research", { workstreamId: "ws_method", stageKey: "v0_2" }),
      ],
    })
  );

  assert.equal(planning.rows.length, 2);
  assert.ok(
    planning.rows.every(
      (row) => row.cells.find(({ stageKey }) => stageKey === "v0_2").openCount === 1
    )
  );
});

test("matrix cells distinguish empty, active and completed work without filling gaps", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [workstream("ws_method")],
      backlog: [
        task("open", { workstreamId: "ws_method", stageKey: "v0_2" }),
        task("done", {
          workstreamId: "ws_method",
          stageKey: "v0_4",
          status: "done",
        }),
      ],
    })
  );
  const row = planning.rows[0];

  assert.equal(row.cells.find(({ stageKey }) => stageKey === "v0_2").state, "active");
  assert.equal(
    row.cells.find(({ stageKey }) => stageKey === "v0_4").state,
    "completed"
  );
  assert.equal(row.cells.find(({ stageKey }) => stageKey === "v0_3").state, "empty");
});

test("historical relatedStage links continue to appear in the matrix", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [workstream("ws_legacy")],
      backlog: [task("old", { workstreamId: "ws_legacy", relatedStage: "v0_5" })],
    })
  );

  assert.equal(
    planning.rows[0].cells.find(({ stageKey }) => stageKey === "v0_5").totalCount,
    1
  );
});

test("summary separates active, blocked, archived, unassigned and missing coverage", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [
        workstream("active"),
        workstream("blocked", { status: "blocked" }),
        workstream("empty", { status: "planned" }),
        workstream("archived", { archived: true }),
      ],
      backlog: [
        task("a", { workstreamId: "active" }),
        task("b", { workstreamId: "blocked" }),
        task("none"),
        task("closed", { status: "done" }),
      ],
    })
  );

  assert.deepEqual(planning.summary, {
    total: 3,
    active: 1,
    blocked: 1,
    archived: 1,
    openAssigned: 2,
    unassigned: 1,
    withoutCoverage: 1,
  });
});

test("archived workstreams can be inspected without becoming active", () => {
  const projectDoc = project({
    workstreams: [workstream("active"), workstream("archived", { archived: true })],
  });

  assert.equal(deriveWorkstreamPlanning(projectDoc).rows.length, 1);
  assert.equal(
    deriveWorkstreamPlanning(projectDoc, { includeArchived: true }).rows.length,
    2
  );
  assert.equal(
    deriveWorkstreamPlanning(projectDoc, { includeArchived: true }).summary.total,
    1
  );
});

test("recommended focus prioritizes blockers, current-stage work and task priority", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [workstream("normal"), workstream("blocked", { status: "blocked" })],
      backlog: [
        task("normal", {
          workstreamId: "normal",
          stageKey: "v0_2",
          priority: "high",
        }),
        task("unblock", {
          title: "Resolve regulatory question",
          workstreamId: "blocked",
          priority: "medium",
        }),
      ],
    })
  );

  assert.equal(planning.focus.workstream.id, "blocked");
  assert.equal(planning.focus.nextAction.title, "Resolve regulatory question");
});

test("completed and dropped tasks never create a false recommended action", () => {
  const planning = deriveWorkstreamPlanning(
    project({
      workstreams: [workstream("finished")],
      backlog: [
        task("done", { workstreamId: "finished", status: "done" }),
        task("dropped", { workstreamId: "finished", status: "dropped" }),
      ],
    })
  );

  assert.equal(planning.focus, null);
  assert.equal(planning.summary.openAssigned, 0);
});

test("backlog filtering supports all, unassigned and named workstreams", () => {
  const backlog = [task("one", { workstreamId: "ws_1" }), task("none")];

  assert.deepEqual(filterWorkstreamBacklog(backlog), backlog);
  assert.deepEqual(
    filterWorkstreamBacklog(backlog, WORKSTREAM_BACKLOG_FILTER.UNASSIGNED).map(
      ({ id }) => id
    ),
    ["none"]
  );
  assert.deepEqual(
    filterWorkstreamBacklog(backlog, "ws_1").map(({ id }) => id),
    ["one"]
  );
});

test("editing preserves stable workstream identifiers and unknown properties", () => {
  const updated = updateProjectWorkstream(
    [workstream("stable", { customValue: "keep" })],
    "stable",
    { id: "replacement", title: "Updated", status: "blocked" }
  );

  assert.equal(updated[0].id, "stable");
  assert.equal(updated[0].title, "Updated");
  assert.equal(updated[0].status, "blocked");
  assert.equal(updated[0].customValue, "keep");
});

test("invalid workstream edits fail without silently replacing data", () => {
  assert.throws(
    () => updateProjectWorkstream([workstream("known")], "missing", { title: "X" }),
    (error) => error.code === "unknown_workstream"
  );
  assert.throws(
    () => updateProjectWorkstream([workstream("known")], "known", { title: " " }),
    (error) => error.code === "invalid_workstream_title"
  );
});

test("archiving and reactivation preserve assignments and previous status", () => {
  const original = [workstream("ws_method", { status: "blocked" })];
  const archived = updateProjectWorkstream(original, "ws_method", { archived: true });
  const restored = updateProjectWorkstream(archived, "ws_method", { archived: false });

  assert.equal(archived[0].archived, true);
  assert.equal(archived[0].status, "blocked");
  assert.equal(restored[0].archived, false);
  assert.equal(restored[0].status, "blocked");
});

test("reordering moves one front while keeping a deterministic 0, 10, 20 sequence", () => {
  const initial = [
    workstream("first", { order: 0 }),
    workstream("second", { order: 10 }),
    workstream("third", { order: 20 }),
  ];
  const moved = reorderProjectWorkstreams(initial, "second", "up");

  assert.deepEqual(moved.map(({ id }) => id), ["second", "first", "third"]);
  assert.deepEqual(moved.map(({ order }) => order), [0, 10, 20]);
  assert.deepEqual(
    reorderProjectWorkstreams(initial, "first", "up").map(({ id }) => id),
    ["first", "second", "third"]
  );
});

test("templates append missing suggestions without overwriting existing fronts", () => {
  const existing = [
    workstream("ws_software_product", { title: "Mon produit", order: 30 }),
    workstream("custom_quality", { title: "Qualité et tests", order: 40 }),
  ];
  const merged = mergeSuggestedWorkstreams(
    existing,
    suggestProjectWorkstreams("software")
  );

  assert.equal(merged[0].title, "Mon produit");
  assert.equal(merged.filter(({ title }) => title === "Qualité et tests").length, 1);
  assert.ok(merged.some(({ id }) => id === "ws_software_backend"));
  assert.equal(merged[2].order, 50);
});

test("backlog assignments preserve project data and update both stage conventions", () => {
  const projectDoc = project({
    workstreams: [workstream("ws_method")],
    backlog: [task("b1", { relatedStage: "v0_1" })],
    extra: { customProjectData: { keep: true } },
  });
  projectDoc.stages.v0_1.linkedBacklogIds = ["b1"];
  const assigned = updateBacklogWorkstreamAssignment(projectDoc, "b1", {
    workstreamId: "ws_method",
    stageKey: "v0_4",
  });

  assert.equal(assigned.backlog[0].workstreamId, "ws_method");
  assert.equal(assigned.backlog[0].stageKey, "v0_4");
  assert.equal(assigned.backlog[0].relatedStage, "v0_4");
  assert.deepEqual(assigned.stages.v0_1.linkedBacklogIds, []);
  assert.deepEqual(assigned.stages.v0_4.linkedBacklogIds, ["b1"]);
  assert.deepEqual(assigned.customProjectData, { keep: true });
  assert.equal(projectDoc.backlog[0].workstreamId, undefined);
});

test("clearing assignments safely removes the item from the previous stage", () => {
  const projectDoc = project({
    workstreams: [workstream("ws_method")],
    backlog: [task("b1", { workstreamId: "ws_method", stageKey: "v0_2" })],
  });
  projectDoc.stages.v0_2.linkedBacklogIds = ["b1"];
  const cleared = updateBacklogWorkstreamAssignment(projectDoc, "b1", {
    workstreamId: null,
    stageKey: null,
  });

  assert.equal(cleared.backlog[0].workstreamId, null);
  assert.equal(cleared.backlog[0].stageKey, null);
  assert.equal(cleared.backlog[0].relatedStage, null);
  assert.deepEqual(cleared.stages.v0_2.linkedBacklogIds, []);
});

test("invalid backlog, archived workstream and unknown stage assignments fail clearly", () => {
  const projectDoc = project({
    workstreams: [workstream("archived", { archived: true })],
    backlog: [task("b1")],
  });

  assert.throws(
    () => updateBacklogWorkstreamAssignment(projectDoc, "missing", {}),
    (error) => error.code === "unknown_backlog_item"
  );
  assert.throws(
    () =>
      updateBacklogWorkstreamAssignment(projectDoc, "b1", {
        workstreamId: "archived",
      }),
    (error) => error.code === "archived_workstream"
  );
  assert.throws(
    () => updateBacklogWorkstreamAssignment(projectDoc, "b1", { stageKey: "v9_9" }),
    (error) => error.code === "unknown_stage"
  );
});
