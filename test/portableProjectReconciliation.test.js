import assert from "node:assert/strict";
import test from "node:test";

import { createPortableBackupSnapshot } from "../src/services/portableBackupSnapshots.js";
import {
  comparePortableSnapshotProjects,
  PORTABLE_PROJECT_COMPARISON_STATE,
  PORTABLE_PROJECT_DECISION,
} from "../src/services/portableProjectReconciliation.js";

const CREATED_AT = "2026-08-25T20:00:00.000Z";

function project(id, options = {}) {
  return {
    schemaVersion: "1.0",
    project: {
      id,
      title: options.title || `Project ${id}`,
      description: options.description || "Initial description",
      updatedAt: options.updatedAt || CREATED_AT,
    },
    backlog: options.backlog || [],
    journal: options.journal || [],
    decisions: options.decisions || [],
    workstreams: options.workstreams || [],
    attachments: options.attachments || [],
    sync: options.sync || { dirty: false },
    ...(options.extra || {}),
  };
}

function snapshot(id, projects, options = {}) {
  return createPortableBackupSnapshot(projects, {
    snapshotId: id,
    parentSnapshotId: options.parent || null,
    createdAt: options.createdAt || CREATED_AT,
    device: {
      id: options.deviceId || "device_external",
      label: options.label || "External device",
    },
  });
}

function compare({ localSnapshot, localProjects, externalSnapshot, knownSnapshots }) {
  return comparePortableSnapshotProjects({
    localSnapshot,
    localProjects: localProjects || localSnapshot?.bundle.projects || [],
    externalSnapshot,
    knownSnapshots,
  });
}

test("identical stable project identifiers ignore timestamps and local sync metadata", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one", {
    updatedAt: "2026-08-26T12:00:00.000Z",
    sync: { dirty: true, localVersion: 9 },
  })], { parent: "base" });
  const result = compare({ localSnapshot: base, externalSnapshot: external });

  assert.equal(result.baseline.status, "verified");
  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.IDENTICAL);
  assert.equal(result.summary.identical, 1);
  assert.deepEqual(result.projects[0].decisions, []);
});

test("verified descendants distinguish external and local project additions", () => {
  const base = snapshot("base", [project("shared")], { deviceId: "device_local" });
  const external = snapshot("child", [project("shared"), project("external")], {
    parent: "base",
  });
  const result = compare({
    localSnapshot: base,
    localProjects: [project("shared"), project("local")],
    externalSnapshot: external,
  });

  assert.equal(
    result.projects.find(({ projectId }) => projectId === "external").state,
    PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ADDED
  );
  assert.equal(
    result.projects.find(({ projectId }) => projectId === "local").state,
    PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_ADDED
  );
  assert.equal(result.summary.added, 2);
});

test("an unavailable baseline never invents the origin of a missing project", () => {
  const local = snapshot("local", [project("local")], { deviceId: "device_local" });
  const external = snapshot("external", [project("external")]);
  const result = compare({ localSnapshot: local, externalSnapshot: external });

  assert.equal(result.baseline.status, "unavailable");
  assert.equal(result.baseline.reason, "common_ancestor_unavailable");
  assert.equal(result.summary.unverified, 2);
  assert.equal(
    result.projects.find(({ projectId }) => projectId === "external").state,
    PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ONLY
  );
  const localProject = result.projects.find(({ projectId }) => projectId === "local");
  assert.equal(localProject.state, PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_ONLY);
  assert.equal(localProject.decisions.includes(PORTABLE_PROJECT_DECISION.DELETE_LOCAL), false);
});

test("a shared parent identifier without its actual snapshot is never treated as proof", () => {
  const local = snapshot("local-child", [project("one", { title: "Local" })], {
    parent: "missing-parent",
    deviceId: "device_local",
  });
  const external = snapshot("external-child", [project("one", { title: "External" })], {
    parent: "missing-parent",
  });
  const result = compare({ localSnapshot: local, externalSnapshot: external });

  assert.equal(result.baseline.status, "unavailable");
  assert.equal(
    result.projects[0].state,
    PORTABLE_PROJECT_COMPARISON_STATE.UNVERIFIED_DIFFERENCE
  );
  assert.ok(result.projects[0].changes.every(({ state }) => state === "unverified"));
});

test("a known shared ancestor enables verified comparison of sibling snapshots", () => {
  const ancestor = snapshot("ancestor", [project("one")], { deviceId: "device_root" });
  const local = snapshot("local", [project("one", { title: "Local title" })], {
    parent: "ancestor",
    deviceId: "device_local",
  });
  const external = snapshot("external", [project("one", {
    description: "External description",
  })], { parent: "ancestor" });
  const result = compare({
    localSnapshot: local,
    externalSnapshot: external,
    knownSnapshots: [ancestor],
  });

  assert.equal(result.baseline.snapshotId, "ancestor");
  assert.equal(
    result.projects[0].state,
    PORTABLE_PROJECT_COMPARISON_STATE.INDEPENDENT_CHANGES
  );
  assert.ok(result.projects[0].decisions.includes(PORTABLE_PROJECT_DECISION.MERGE_INDEPENDENT));
});

test("a verified unilateral external modification is distinguished from a conflict", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one", { title: "Changed elsewhere" })], {
    parent: "base",
  });
  const result = compare({ localSnapshot: base, externalSnapshot: external });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_MODIFIED);
  assert.deepEqual(
    result.projects[0].changes.map(({ path, state }) => ({ path, state })),
    [{ path: "project.title", state: "external" }]
  );
});

test("local-only modification remains visible even when an external snapshot is newer", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one")], { parent: "base" });
  const result = compare({
    localSnapshot: base,
    localProjects: [project("one", { title: "Unsaved local change" })],
    externalSnapshot: external,
  });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_MODIFIED);
  assert.equal(result.projects[0].changes[0].state, "local");
});

test("different fields changed on each device remain explicitly mergeable, not merged", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one", { description: "Remote notes" })], {
    parent: "base",
  });
  const result = compare({
    localSnapshot: base,
    localProjects: [project("one", { title: "Local title" })],
    externalSnapshot: external,
  });
  const row = result.projects[0];

  assert.equal(row.state, PORTABLE_PROJECT_COMPARISON_STATE.INDEPENDENT_CHANGES);
  assert.deepEqual(
    row.changes.map(({ path, state }) => ({ path, state })),
    [
      { path: "project.description", state: "external" },
      { path: "project.title", state: "local" },
    ]
  );
  assert.equal(result.summary.mergeable, 1);
});

test("different changes to the same business field create a real conflict", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one", { title: "Remote title" })], {
    parent: "base",
  });
  const result = compare({
    localSnapshot: base,
    localProjects: [project("one", { title: "Local title" })],
    externalSnapshot: external,
  });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.CONFLICT);
  assert.equal(result.projects[0].changes[0].state, "conflict");
  assert.equal(result.projects[0].changes[0].base.value, "Project one");
  assert.equal(result.projects[0].changes[0].local.value, "Local title");
  assert.equal(result.projects[0].changes[0].external.value, "Remote title");
  assert.equal(result.summary.conflicts, 1);
});

test("the same convergent change on both devices does not create a fake conflict", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const updated = project("one", { title: "Shared final title" });
  const external = snapshot("child", [updated], { parent: "base" });
  const result = compare({
    localSnapshot: base,
    localProjects: [updated],
    externalSnapshot: external,
  });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.IDENTICAL);
  assert.equal(result.summary.conflicts, 0);
});

test("backlog changes are compared by stable item identity rather than position", () => {
  const tasks = [{ id: "task-a", title: "First" }, { id: "task-b", title: "Second" }];
  const base = snapshot("base", [project("one", { backlog: tasks })], {
    deviceId: "device_local",
  });
  const reordered = snapshot("reordered", [project("one", {
    backlog: [tasks[1], tasks[0]],
  })], { parent: "base" });

  assert.equal(
    compare({ localSnapshot: base, externalSnapshot: reordered }).projects[0].state,
    PORTABLE_PROJECT_COMPARISON_STATE.IDENTICAL
  );

  const changed = snapshot("changed", [project("one", {
    backlog: [{ ...tasks[0], title: "External task" }, tasks[1]],
  })], { parent: "base" });
  const result = compare({ localSnapshot: base, externalSnapshot: changed });

  assert.ok(result.projects[0].changes.some(({ path, state }) =>
    path === "backlog[task-a].title" && state === "external"
  ));
});

test("journal, decisions, workstreams and attachments preserve individual provenance", () => {
  const baseProject = project("one", {
    journal: [{ id: "note-1", title: "Old note" }],
    decisions: [{ id: "choice-1", title: "Old choice" }],
    workstreams: [{ id: "front-1", title: "Old front" }],
    attachments: [{ id: "file-1", title: "Old attachment" }],
  });
  const base = snapshot("base", [baseProject], { deviceId: "device_local" });
  const external = snapshot("child", [project("one", {
    journal: [{ id: "note-1", title: "New note" }],
    decisions: [{ id: "choice-1", title: "New choice" }],
    workstreams: [{ id: "front-1", title: "New front" }],
    attachments: [{ id: "file-1", title: "New attachment" }],
  })], { parent: "base" });
  const result = compare({ localSnapshot: base, externalSnapshot: external });
  const paths = result.projects[0].changes.map(({ path }) => path);

  assert.ok(paths.includes("journal[note-1].title"));
  assert.ok(paths.includes("decisions[choice-1].title"));
  assert.ok(paths.includes("workstreams[front-1].title"));
  assert.ok(paths.includes("attachments[file-1].title"));
});

test("an externally deleted project requires verified ancestry and explicit deletion", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [], { parent: "base" });
  const result = compare({ localSnapshot: base, externalSnapshot: external });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_DELETED);
  assert.ok(result.projects[0].decisions.includes(PORTABLE_PROJECT_DECISION.DELETE_LOCAL));
  assert.equal(result.summary.deleted, 1);
});

test("a locally deleted project can only be restored through a visible decision", () => {
  const base = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one")], { parent: "base" });
  const result = comparePortableSnapshotProjects({
    localSnapshot: base,
    localProjects: [],
    externalSnapshot: external,
  });

  assert.equal(result.projects[0].state, PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_DELETED);
  assert.ok(result.projects[0].decisions.includes(PORTABLE_PROJECT_DECISION.RESTORE_EXTERNAL));
});

test("invalid local identifiers and duplicated snapshots fail safely", () => {
  const local = snapshot("base", [project("one")], { deviceId: "device_local" });
  const external = snapshot("child", [project("one")], { parent: "base" });

  assert.throws(
    () => compare({
      localSnapshot: local,
      localProjects: [project("same"), project("same")],
      externalSnapshot: external,
    }),
    (error) => error.code === "duplicate_project_id"
  );
  assert.throws(
    () => compare({
      localSnapshot: local,
      externalSnapshot: external,
      knownSnapshots: [snapshot("base", [project("different")])],
    }),
    /same snapshot identifier/
  );
});

test("comparison never mutates local projects, external snapshots or baseline data", () => {
  const local = snapshot("base", [project("one")], { deviceId: "device_local" });
  const localProjects = [project("one", { title: "Local" })];
  const external = snapshot("child", [project("one", { title: "External" })], {
    parent: "base",
  });
  const before = JSON.stringify({ local, localProjects, external });

  compare({ localSnapshot: local, localProjects, externalSnapshot: external });

  assert.equal(JSON.stringify({ local, localProjects, external }), before);
});
