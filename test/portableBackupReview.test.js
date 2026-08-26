import assert from "node:assert/strict";
import test from "node:test";

import {
  acknowledgePortableBackupSnapshot,
  createPortableBackupSnapshot,
  normalizePortableBackupDevice,
} from "../src/services/portableBackupSnapshots.js";
import {
  applyPortableBackupSnapshotDecision,
  PORTABLE_SNAPSHOT_DECISION,
  PORTABLE_SNAPSHOT_REVIEW_STATE,
  reviewPortableBackupSnapshots,
} from "../src/services/portableBackupReview.js";
import {
  PORTABLE_PROJECT_COMPARISON_STATE,
  PORTABLE_PROJECT_DECISION,
} from "../src/services/portableProjectReconciliation.js";

const DATE_A = "2026-08-24T20:00:00.000Z";
const DATE_B = "2026-08-24T21:00:00.000Z";

function project(id, title = id) {
  return {
    schemaVersion: "1.0",
    project: { id, title, slug: id },
    historicalField: { keep: true },
  };
}

function snapshot({
  id,
  parent = null,
  deviceId = "device_external",
  label = "Other device",
  projects = [project("project-1")],
  createdAt = DATE_B,
}) {
  return createPortableBackupSnapshot(projects, {
    snapshotId: id,
    parentSnapshotId: parent,
    device: { id: deviceId, label },
    createdAt,
  });
}

function review({
  localSnapshot,
  externalSnapshots = [],
  localProjects,
  deviceOverrides = {},
  unreadable = [],
}) {
  const device = normalizePortableBackupDevice({
    id: "device_local",
    label: "Local laptop",
    lastSnapshotId: localSnapshot?.snapshotId || null,
    ...deviceOverrides,
  });

  return reviewPortableBackupSnapshots({
    localDevice: device,
    localProjects: localProjects || localSnapshot?.bundle.projects || [],
    localSnapshot,
    externalSnapshots,
    unreadable,
  });
}

test("missing external snapshots leave local projects untouched", () => {
  const local = snapshot({ id: "local", deviceId: "device_local", createdAt: DATE_A });
  const result = review({ localSnapshot: local });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.NO_EXTERNAL);
  assert.deepEqual(result.candidates, []);
});

test("the same snapshot identifier is recognized without relying on timestamps", () => {
  const local = snapshot({ id: "shared", deviceId: "device_local", createdAt: DATE_A });
  const same = snapshot({ id: "shared", createdAt: DATE_B });
  const result = review({ localSnapshot: local, externalSnapshots: [same] });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.SAME);
  assert.equal(result.candidates[0].state, PORTABLE_SNAPSHOT_REVIEW_STATE.SAME);
});

test("a direct descendant is proved by its parent snapshot identifier", () => {
  const local = snapshot({ id: "local", deviceId: "device_local", createdAt: DATE_A });
  const descendant = snapshot({
    id: "external-child",
    parent: "local",
    projects: [project("project-1", "Changed elsewhere"), project("new")],
  });
  const result = review({
    localSnapshot: local,
    externalSnapshots: [{ reference: "snapshots/external/latest.json", snapshot: descendant }],
  });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT);
  assert.equal(result.candidates[0].newCount, 1);
  assert.equal(result.candidates[0].conflictCount, 1);
  assert.equal(result.candidates[0].deviceLabel, "Other device");
  assert.equal(result.candidates[0].reference, "snapshots/external/latest.json");
  assert.deepEqual(result.candidates[0].projectComparison.baseline, {
    status: "verified",
    snapshotId: "local",
    reason: null,
  });
  assert.equal(
    result.candidates[0].projectComparison.projects.find(({ projectId }) => projectId === "new").state,
    PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ADDED
  );
});

test("older snapshots are identified by ancestry rather than their creation time", () => {
  const external = snapshot({ id: "old", createdAt: DATE_B });
  const local = snapshot({
    id: "local",
    parent: "old",
    deviceId: "device_local",
    createdAt: DATE_A,
  });
  const result = review({ localSnapshot: local, externalSnapshots: [external] });

  assert.equal(result.candidates[0].state, PORTABLE_SNAPSHOT_REVIEW_STATE.OLDER);
});

test("a newer timestamp without proven lineage remains unknown", () => {
  const local = snapshot({ id: "local", deviceId: "device_local", createdAt: DATE_A });
  const unrelated = snapshot({ id: "unrelated", createdAt: DATE_B });
  const result = review({ localSnapshot: local, externalSnapshots: [unrelated] });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.UNKNOWN);
  assert.notEqual(result.candidates[0].state, PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT);
});

test("a missing common ancestor exposes uncertainty without inventing a deletion", () => {
  const local = snapshot({
    id: "local",
    deviceId: "device_local",
    projects: [project("local-only")],
    createdAt: DATE_A,
  });
  const unrelated = snapshot({
    id: "unrelated",
    projects: [project("external-only")],
    createdAt: DATE_B,
  });
  const result = review({ localSnapshot: local, externalSnapshots: [unrelated] });
  const comparison = result.candidates[0].projectComparison;

  assert.equal(comparison.baseline.status, "unavailable");
  assert.deepEqual(
    comparison.projects.map(({ projectId, state }) => [projectId, state]),
    [
      ["external-only", PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ONLY],
      ["local-only", PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_ONLY],
    ]
  );
  assert.equal(
    comparison.projects.some(({ decisions }) =>
      decisions.includes(PORTABLE_PROJECT_DECISION.DELETE_LOCAL)
    ),
    false
  );
});

test("an ambiguous snapshot history keeps the candidate visible and isolates comparison failure", () => {
  const local = snapshot({ id: "local", deviceId: "device_local", createdAt: DATE_A });
  const first = snapshot({
    id: "duplicate",
    parent: "local",
    projects: [project("project-1", "First external value")],
  });
  const second = snapshot({
    id: "duplicate",
    parent: "local",
    projects: [project("project-1", "Different external value")],
  });
  const result = review({ localSnapshot: local, externalSnapshots: [first, second] });

  assert.equal(result.candidates.length, 2);
  assert.equal(result.candidates[0].projectComparison, null);
  assert.equal(result.candidates[0].comparisonError, "comparison_failed");
});

test("siblings sharing a known parent remain visibly divergent", () => {
  const local = snapshot({
    id: "local-child",
    parent: "shared-parent",
    deviceId: "device_local",
  });
  const external = snapshot({ id: "external-child", parent: "shared-parent" });
  const result = review({ localSnapshot: local, externalSnapshots: [external] });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT);
  assert.equal(result.candidates[0].state, PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT);
});

test("unsaved local changes turn an otherwise direct descendant into a divergence", () => {
  const local = snapshot({ id: "local", deviceId: "device_local" });
  const external = snapshot({ id: "external-child", parent: "local" });
  const result = review({
    localSnapshot: local,
    localProjects: [project("project-1", "Locally modified")],
    externalSnapshots: [external],
  });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT);
});

test("known intermediate snapshots establish transitive ancestry", () => {
  const local = snapshot({ id: "local", deviceId: "device_local" });
  const intermediate = snapshot({
    id: "middle",
    parent: "local",
    deviceId: "device_middle",
  });
  const latest = snapshot({ id: "latest", parent: "middle", createdAt: DATE_B });
  const result = review({
    localSnapshot: local,
    externalSnapshots: [intermediate, latest],
  });

  const candidate = result.candidates.find((entry) => entry.snapshotId === "latest");
  assert.equal(candidate.state, PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT);
});

test("restored external lineage remains usable before this device writes again", () => {
  const oldLocal = snapshot({
    id: "old-local",
    deviceId: "device_local",
    projects: [project("before")],
  });
  const restored = snapshot({
    id: "restored-external",
    projects: [project("restored")],
  });
  const child = snapshot({
    id: "new-external",
    parent: "restored-external",
    deviceId: "device_new",
    projects: [project("restored", "Updated")],
  });
  const result = review({
    localSnapshot: oldLocal,
    localProjects: restored.bundle.projects,
    externalSnapshots: [restored, child],
    deviceOverrides: {
      lastSnapshotId: "restored-external",
      acknowledgedSnapshotIds: ["restored-external"],
    },
  });

  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0].state, PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT);
});

test("unreadable snapshots are visible but never become restore candidates", () => {
  const local = snapshot({ id: "local", deviceId: "device_local" });
  const result = review({
    localSnapshot: local,
    unreadable: [{ reference: "snapshots/broken/latest.json", unreadable: true }],
  });

  assert.equal(result.state, PORTABLE_SNAPSHOT_REVIEW_STATE.UNREADABLE);
  assert.equal(result.candidates.length, 0);
  assert.equal(result.unreadable.length, 1);
});

test("acknowledged snapshots stay hidden without discarding new snapshots", () => {
  const local = snapshot({ id: "local", deviceId: "device_local" });
  const dismissed = snapshot({ id: "dismissed", parent: "local" });
  const newer = snapshot({
    id: "newer",
    parent: "dismissed",
    deviceId: "device_other",
  });
  const acknowledgedDevice = acknowledgePortableBackupSnapshot(
    { id: "device_local", label: "Local laptop", lastSnapshotId: "local" },
    "dismissed"
  );
  const result = review({
    localSnapshot: local,
    externalSnapshots: [dismissed, newer],
    deviceOverrides: acknowledgedDevice,
  });

  assert.deepEqual(result.candidates.map((candidate) => candidate.snapshotId), ["newer"]);
});

test("restore refuses to replace any local project without explicit confirmation", () => {
  const original = [project("project-1", "Protected local version"), project("local-only")];
  const external = snapshot({
    id: "external",
    projects: [project("project-1", "External version"), project("new")],
  });

  assert.throws(
    () => applyPortableBackupSnapshotDecision(
      { snapshot: external },
      original,
      PORTABLE_SNAPSHOT_DECISION.RESTORE
    ),
    (error) => error.code === "confirmation_required"
  );
  assert.equal(original[0].project.title, "Protected local version");
  assert.equal(original.length, 2);
});

test("confirmed restore reports replaced, removed and added projects accurately", () => {
  const original = [project("project-1", "Local"), project("local-only")];
  const external = snapshot({
    id: "external",
    projects: [project("project-1", "External"), project("new")],
  });
  const result = applyPortableBackupSnapshotDecision(
    { snapshot: external },
    original,
    PORTABLE_SNAPSHOT_DECISION.RESTORE,
    { confirmed: true }
  );

  assert.deepEqual(result.summary, {
    addedCount: 1,
    replacedCount: 1,
    removedCount: 1,
    copiedCount: 0,
    resultingProjectCount: 2,
  });
  assert.equal(result.projects[0].project.title, "External");
  assert.equal(original[0].project.title, "Local");
});

test("a confirmed project plan applies the reviewed per-project choices", () => {
  const local = snapshot({
    id: "local",
    deviceId: "device_local",
    projects: [project("project-1", "Local")],
    createdAt: DATE_A,
  });
  const external = snapshot({
    id: "external",
    parent: "local",
    projects: [project("project-1", "External"), project("new")],
  });
  const candidate = review({
    localSnapshot: local,
    externalSnapshots: [external],
  }).candidates[0];
  const result = applyPortableBackupSnapshotDecision(
    candidate,
    local.bundle.projects,
    PORTABLE_SNAPSHOT_DECISION.PROJECTS,
    {
      confirmed: true,
      projectDecisions: {
        "project-1": PORTABLE_PROJECT_DECISION.USE_EXTERNAL,
        new: PORTABLE_PROJECT_DECISION.ADD_EXTERNAL,
      },
    }
  );

  assert.deepEqual(
    result.projects.map(({ project: item }) => [item.id, item.title]),
    [["project-1", "External"], ["new", "new"]]
  );
  assert.equal(result.summary.replacedCount, 1);
  assert.equal(result.summary.addedCount, 1);
});

test("import-as-copies keeps every local project and assigns safe fresh IDs", () => {
  const original = [project("project-1", "Local")];
  const external = snapshot({
    id: "external",
    projects: [project("project-1", "External"), project("new")],
  });
  const result = applyPortableBackupSnapshotDecision(
    { snapshot: external },
    original,
    PORTABLE_SNAPSHOT_DECISION.COPY,
    { idFactory: () => "project-1-safe-copy", now: DATE_B }
  );

  assert.equal(result.summary.copiedCount, 1);
  assert.equal(result.summary.addedCount, 1);
  assert.equal(result.summary.replacedCount, 0);
  assert.equal(result.summary.removedCount, 0);
  assert.ok(result.projects.some((entry) => entry.project.id === "project-1-safe-copy"));
  assert.ok(result.projects.some((entry) =>
    entry.project.id === "project-1" && entry.project.title === "Local"
  ));
});

test("keep and ignore preserve local references without applying the snapshot", () => {
  const original = [project("project-1", "Local")];
  const external = snapshot({ id: "external", projects: [project("elsewhere")] });

  for (const action of [PORTABLE_SNAPSHOT_DECISION.KEEP, PORTABLE_SNAPSHOT_DECISION.IGNORE]) {
    const result = applyPortableBackupSnapshotDecision(
      { snapshot: external },
      original,
      action
    );
    assert.equal(result.projects, original);
    assert.equal(result.summary.addedCount, 0);
  }
});

test("corrupted snapshots and unsupported decisions never modify local data", () => {
  const original = [project("project-1", "Local")];
  const external = snapshot({ id: "external" });

  assert.throws(
    () => applyPortableBackupSnapshotDecision(
      { snapshot: { ...external, version: 99 } },
      original,
      PORTABLE_SNAPSHOT_DECISION.RESTORE,
      { confirmed: true }
    ),
    (error) => error.code === "unsupported_snapshot_version"
  );
  assert.throws(
    () => applyPortableBackupSnapshotDecision({ snapshot: external }, original, "merge"),
    (error) => error.code === "invalid_snapshot_decision"
  );
  assert.deepEqual(original, [project("project-1", "Local")]);
});

test("local snapshot acknowledgements remain bounded and contain no secrets", () => {
  let device = normalizePortableBackupDevice({ id: "device_local", label: "Laptop" });

  for (let index = 0; index < 70; index += 1) {
    device = acknowledgePortableBackupSnapshot(device, `snapshot_${index}`);
  }

  assert.equal(device.acknowledgedSnapshotIds.length, 50);
  assert.equal(device.acknowledgedSnapshotIds[0], "snapshot_20");
  assert.equal(device.acknowledgedSnapshotIds.at(-1), "snapshot_69");
});
