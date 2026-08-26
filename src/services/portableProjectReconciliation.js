import { createProjectBundle, validateProjectBundle } from "./jsonTransfer.js";
import { validatePortableBackupSnapshot } from "./portableBackupSnapshots.js";

export const PORTABLE_PROJECT_COMPARISON_STATE = Object.freeze({
  IDENTICAL: "identical",
  BOTH_DELETED: "both_deleted",
  EXTERNAL_ONLY: "external_only",
  LOCAL_ONLY: "local_only",
  EXTERNAL_ADDED: "external_added",
  LOCAL_ADDED: "local_added",
  EXTERNAL_DELETED: "external_deleted",
  LOCAL_DELETED: "local_deleted",
  EXTERNAL_MODIFIED: "external_modified",
  LOCAL_MODIFIED: "local_modified",
  INDEPENDENT_CHANGES: "independent_changes",
  CONFLICT: "conflict",
  UNVERIFIED_DIFFERENCE: "unverified_difference",
});

export const PORTABLE_PROJECT_DECISION = Object.freeze({
  KEEP_LOCAL: "keep_local",
  ADD_EXTERNAL: "add_external",
  USE_EXTERNAL: "use_external",
  RESTORE_EXTERNAL: "restore_external",
  DELETE_LOCAL: "delete_local",
  MERGE_INDEPENDENT: "merge_independent",
});

const TRACKED_COLLECTIONS = new Set([
  "backlog",
  "journal",
  "decisions",
  "workstreams",
  "attachments",
]);

function cloneJson(value) {
  return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (!value || typeof value !== "object") return value;

  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, canonicalize(value[key])])
  );
}

function sameValue(left, right) {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function indexedCollection(value) {
  if (!Array.isArray(value)) return null;

  const entries = new Map();

  for (const item of value) {
    if (!item || typeof item !== "object" || typeof item.id !== "string" || !item.id) {
      return null;
    }

    if (entries.has(item.id)) return null;
    entries.set(item.id, item);
  }

  return entries;
}

function flattenDocument(value, currentPath = "", target = new Map()) {
  if (
    currentPath === "sync" ||
    currentPath.startsWith("sync.") ||
    currentPath === "project.updatedAt"
  ) {
    return target;
  }

  if (TRACKED_COLLECTIONS.has(currentPath)) {
    const entries = indexedCollection(value);

    if (entries) {
      if (entries.size === 0) target.set(currentPath, []);

      for (const [id, item] of entries) {
        flattenDocument(item, `${currentPath}[${id}]`, target);
      }

      return target;
    }
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const keys = Object.keys(value).sort();
    if (keys.length === 0 && currentPath) target.set(currentPath, {});

    for (const key of keys) {
      flattenDocument(value[key], currentPath ? `${currentPath}.${key}` : key, target);
    }

    return target;
  }

  if (currentPath) target.set(currentPath, cloneJson(value));
  return target;
}

function sameDocument(left, right) {
  if (!left || !right) return left === right;

  const leftFields = flattenDocument(left);
  const rightFields = flattenDocument(right);

  if (leftFields.size !== rightFields.size) return false;

  for (const [field, value] of leftFields) {
    if (!rightFields.has(field) || !sameValue(value, rightFields.get(field))) {
      return false;
    }
  }

  return true;
}

function snapshotLineage(snapshot, snapshotsById) {
  const lineage = [];
  const visited = new Set();
  let current = snapshot;

  while (current && !visited.has(current.snapshotId)) {
    visited.add(current.snapshotId);
    lineage.push(current.snapshotId);
    current = snapshotsById.get(current.parentSnapshotId) || null;
  }

  return lineage;
}

function findVerifiedBaseline(localSnapshot, externalSnapshot, knownSnapshots) {
  if (!localSnapshot) {
    return { status: "unavailable", snapshot: null, reason: "missing_local_snapshot" };
  }

  const snapshotsById = new Map();

  for (const candidate of [localSnapshot, externalSnapshot, ...knownSnapshots]) {
    const snapshot = validatePortableBackupSnapshot(candidate);
    const previous = snapshotsById.get(snapshot.snapshotId);

    if (previous && !sameValue(previous, snapshot)) {
      throw new Error("Two different snapshots claim the same snapshot identifier.");
    }

    snapshotsById.set(snapshot.snapshotId, snapshot);
  }

  const externalLineage = new Set(snapshotLineage(externalSnapshot, snapshotsById));
  const commonId = snapshotLineage(localSnapshot, snapshotsById).find((snapshotId) =>
    externalLineage.has(snapshotId)
  );

  return commonId
    ? { status: "verified", snapshot: snapshotsById.get(commonId), reason: null }
    : { status: "unavailable", snapshot: null, reason: "common_ancestor_unavailable" };
}

function fieldValue(fields, key) {
  return {
    present: fields.has(key),
    value: cloneJson(fields.get(key)),
  };
}

function sameField(left, right) {
  return left.present === right.present && sameValue(left.value, right.value);
}

function compareFields(base, local, external, verified) {
  const baseFields = flattenDocument(base || {});
  const localFields = flattenDocument(local || {});
  const externalFields = flattenDocument(external || {});
  const fieldNames = new Set([
    ...baseFields.keys(),
    ...localFields.keys(),
    ...externalFields.keys(),
  ]);
  const changes = [];

  for (const field of [...fieldNames].sort()) {
    const before = fieldValue(baseFields, field);
    const current = fieldValue(localFields, field);
    const incoming = fieldValue(externalFields, field);

    if (sameField(current, incoming)) {
      if (verified && !sameField(before, current)) {
        changes.push({ path: field, state: "both_same", base: before, local: current, external: incoming });
      }
      continue;
    }

    if (!verified) {
      changes.push({ path: field, state: "unverified", base: null, local: current, external: incoming });
      continue;
    }

    const localChanged = !sameField(before, current);
    const externalChanged = !sameField(before, incoming);
    const state = localChanged && externalChanged
      ? "conflict"
      : localChanged
        ? "local"
        : "external";

    changes.push({ path: field, state, base: before, local: current, external: incoming });
  }

  return changes;
}

function decisionsForState(state) {
  const { KEEP_LOCAL, ADD_EXTERNAL, USE_EXTERNAL, RESTORE_EXTERNAL, DELETE_LOCAL, MERGE_INDEPENDENT } =
    PORTABLE_PROJECT_DECISION;

  switch (state) {
    case PORTABLE_PROJECT_COMPARISON_STATE.IDENTICAL:
    case PORTABLE_PROJECT_COMPARISON_STATE.BOTH_DELETED:
      return [];
    case PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ONLY:
    case PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_ADDED:
      return [KEEP_LOCAL, ADD_EXTERNAL];
    case PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_ONLY:
    case PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_ADDED:
      return [KEEP_LOCAL];
    case PORTABLE_PROJECT_COMPARISON_STATE.LOCAL_DELETED:
      return [KEEP_LOCAL, RESTORE_EXTERNAL];
    case PORTABLE_PROJECT_COMPARISON_STATE.EXTERNAL_DELETED:
      return [KEEP_LOCAL, DELETE_LOCAL];
    case PORTABLE_PROJECT_COMPARISON_STATE.INDEPENDENT_CHANGES:
      return [KEEP_LOCAL, USE_EXTERNAL, MERGE_INDEPENDENT];
    default:
      return [KEEP_LOCAL, USE_EXTERNAL];
  }
}

function classifyDifference({ base, local, external, verified, changes }) {
  const states = PORTABLE_PROJECT_COMPARISON_STATE;

  if (!local && !external) return states.BOTH_DELETED;
  if (local && external && sameDocument(local, external)) return states.IDENTICAL;

  if (!verified) {
    if (!local) return states.EXTERNAL_ONLY;
    if (!external) return states.LOCAL_ONLY;
    return states.UNVERIFIED_DIFFERENCE;
  }

  if (!local) return base ? states.LOCAL_DELETED : states.EXTERNAL_ADDED;
  if (!external) return base ? states.EXTERNAL_DELETED : states.LOCAL_ADDED;

  if (sameDocument(local, base)) return states.EXTERNAL_MODIFIED;
  if (sameDocument(external, base)) return states.LOCAL_MODIFIED;

  return changes.some(({ state }) => state === "conflict")
    ? states.CONFLICT
    : states.INDEPENDENT_CHANGES;
}

function summarizeProjects(projects) {
  const states = PORTABLE_PROJECT_COMPARISON_STATE;

  return {
    total: projects.length,
    identical: projects.filter(({ state }) => state === states.IDENTICAL).length,
    added: projects.filter(({ state }) =>
      [states.EXTERNAL_ADDED, states.LOCAL_ADDED].includes(state)
    ).length,
    deleted: projects.filter(({ state }) =>
      [states.EXTERNAL_DELETED, states.LOCAL_DELETED, states.BOTH_DELETED].includes(state)
    ).length,
    modified: projects.filter(({ state }) =>
      [states.EXTERNAL_MODIFIED, states.LOCAL_MODIFIED, states.INDEPENDENT_CHANGES].includes(state)
    ).length,
    conflicts: projects.filter(({ state }) => state === states.CONFLICT).length,
    unverified: projects.filter(({ state }) =>
      [states.EXTERNAL_ONLY, states.LOCAL_ONLY, states.UNVERIFIED_DIFFERENCE].includes(state)
    ).length,
    mergeable: projects.filter(({ state }) => state === states.INDEPENDENT_CHANGES).length,
  };
}

export function comparePortableSnapshotProjects({
  localProjects = [],
  localSnapshot = null,
  externalSnapshot,
  knownSnapshots = [],
}) {
  const external = validatePortableBackupSnapshot(externalSnapshot);
  const local = localSnapshot ? validatePortableBackupSnapshot(localSnapshot) : null;
  const normalizedLocalProjects = Array.isArray(localProjects) ? localProjects : [];
  validateProjectBundle(
    createProjectBundle(normalizedLocalProjects, { exportedAt: external.createdAt })
  );

  const baseline = findVerifiedBaseline(local, external, knownSnapshots);
  const verified = baseline.status === "verified";
  const baseProjects = new Map(
    (baseline.snapshot?.bundle.projects || []).map((project) => [project.project.id, project])
  );
  const currentProjects = new Map(
    normalizedLocalProjects.map((project) => [project.project.id, project])
  );
  const externalProjects = new Map(
    external.bundle.projects.map((project) => [project.project.id, project])
  );
  const projectIds = new Set([
    ...baseProjects.keys(),
    ...currentProjects.keys(),
    ...externalProjects.keys(),
  ]);
  const projects = [...projectIds].sort().map((projectId) => {
    const baseProject = baseProjects.get(projectId);
    const localProject = currentProjects.get(projectId);
    const externalProject = externalProjects.get(projectId);
    const changes = compareFields(baseProject, localProject, externalProject, verified);
    const state = classifyDifference({
      base: baseProject,
      local: localProject,
      external: externalProject,
      verified,
      changes,
    });

    return {
      projectId,
      title:
        localProject?.project.title ||
        externalProject?.project.title ||
        baseProject?.project.title ||
        projectId,
      state,
      changes,
      decisions: decisionsForState(state),
      localExists: Boolean(localProject),
      externalExists: Boolean(externalProject),
      baselineExists: Boolean(baseProject),
    };
  });

  return {
    snapshotId: external.snapshotId,
    deviceId: external.device.id,
    deviceLabel: external.device.label,
    baseline: {
      status: baseline.status,
      snapshotId: baseline.snapshot?.snapshotId || null,
      reason: baseline.reason,
    },
    projects,
    summary: summarizeProjects(projects),
  };
}
