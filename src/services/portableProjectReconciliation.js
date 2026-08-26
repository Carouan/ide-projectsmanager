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

export class PortableProjectReconciliationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PortableProjectReconciliationError";
    this.code = code;
  }
}

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

function reconciliationError(code, message) {
  return new PortableProjectReconciliationError(code, message);
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
      versions: {
        base: cloneJson(baseProject),
        local: cloneJson(localProject),
        external: cloneJson(externalProject),
      },
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

function normalizeDecisionMap(comparison, decisions) {
  if (!comparison || !Array.isArray(comparison.projects)) {
    throw reconciliationError(
      "invalid_comparison",
      "A valid project comparison is required before preparing decisions."
    );
  }

  const supplied = decisions instanceof Map
    ? new Map(decisions)
    : decisions && typeof decisions === "object" && !Array.isArray(decisions)
      ? new Map(Object.entries(decisions))
      : null;

  if (!supplied) {
    throw reconciliationError(
      "decision_required",
      "Every project difference requires an explicit decision."
    );
  }

  const projectsById = new Map(
    comparison.projects.map((project) => [project.projectId, project])
  );
  for (const [projectId, decision] of supplied) {
    const project = projectsById.get(projectId);
    if (!project) {
      throw reconciliationError(
        "unknown_project_decision",
        "A decision targets a project outside this comparison."
      );
    }
    if (!project.decisions.includes(decision)) {
      throw reconciliationError(
        "invalid_project_decision",
        "A decision is incompatible with the compared project state."
      );
    }
  }

  const normalized = new Map();

  for (const project of comparison.projects) {
    if (project.decisions.length === 0) continue;

    const decision = supplied.get(project.projectId);
    if (!project.decisions.includes(decision)) {
      throw reconciliationError(
        decision ? "invalid_project_decision" : "decision_required",
        "The selected project decision is missing or incompatible."
      );
    }

    normalized.set(project.projectId, decision);
  }

  return normalized;
}

export function summarizePortableProjectDecisions(comparison, decisions) {
  const selected = normalizeDecisionMap(comparison, decisions);
  const summary = {
    unchangedCount: 0,
    addedCount: 0,
    replacedCount: 0,
    deletedCount: 0,
    mergedCount: 0,
    resultingProjectCount: comparison.projects.filter(({ localExists }) => localExists).length,
  };

  for (const project of comparison.projects) {
    const decision = selected.get(project.projectId) || null;

    if (!decision) {
      if (project.localExists) summary.unchangedCount += 1;
      continue;
    }

    switch (decision) {
      case PORTABLE_PROJECT_DECISION.KEEP_LOCAL:
        if (project.localExists) summary.unchangedCount += 1;
        break;
      case PORTABLE_PROJECT_DECISION.ADD_EXTERNAL:
      case PORTABLE_PROJECT_DECISION.RESTORE_EXTERNAL:
        summary.addedCount += 1;
        summary.resultingProjectCount += 1;
        break;
      case PORTABLE_PROJECT_DECISION.USE_EXTERNAL:
        if (project.localExists) {
          summary.replacedCount += 1;
        } else {
          summary.addedCount += 1;
          summary.resultingProjectCount += 1;
        }
        break;
      case PORTABLE_PROJECT_DECISION.DELETE_LOCAL:
        summary.deletedCount += 1;
        summary.resultingProjectCount -= 1;
        break;
      case PORTABLE_PROJECT_DECISION.MERGE_INDEPENDENT:
        summary.mergedCount += 1;
        break;
      default:
        throw reconciliationError(
          "invalid_project_decision",
          "The selected project decision is unsupported."
        );
    }
  }

  return summary;
}

const MISSING_VALUE = Symbol("missing_project_value");

function comparableValue(value) {
  return value === MISSING_VALUE ? undefined : value;
}

function sameMergedValue(left, right) {
  if (left === MISSING_VALUE || right === MISSING_VALUE) return left === right;
  return sameValue(left, right);
}

function cloneMergedValue(value) {
  return value === MISSING_VALUE ? MISSING_VALUE : cloneJson(value);
}

function plainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function mergeIndexedCollection(base, local, external, path) {
  const baseItems = indexedCollection(base);
  const localItems = indexedCollection(local);
  const externalItems = indexedCollection(external);

  if (!baseItems || !localItems || !externalItems) {
    throw reconciliationError(
      "merge_conflict",
      "A collection without stable unique identifiers cannot be combined safely."
    );
  }

  const mergedById = new Map();
  const ids = new Set([...baseItems.keys(), ...localItems.keys(), ...externalItems.keys()]);

  for (const id of ids) {
    const merged = mergeProjectValue(
      baseItems.has(id) ? baseItems.get(id) : MISSING_VALUE,
      localItems.has(id) ? localItems.get(id) : MISSING_VALUE,
      externalItems.has(id) ? externalItems.get(id) : MISSING_VALUE,
      `${path}[${id}]`
    );
    if (merged !== MISSING_VALUE) mergedById.set(id, merged);
  }

  const orderedIds = [
    ...localItems.keys(),
    ...[...externalItems.keys()].filter((id) => !localItems.has(id)),
  ];

  return orderedIds
    .filter((id) => mergedById.has(id))
    .map((id) => mergedById.get(id));
}

function mergeProjectValue(base, local, external, path = "") {
  if (path === "sync" || path === "project.updatedAt") {
    return cloneMergedValue(local === MISSING_VALUE ? external : local);
  }

  if (sameMergedValue(local, external)) return cloneMergedValue(local);
  if (sameMergedValue(local, base)) return cloneMergedValue(external);
  if (sameMergedValue(external, base)) return cloneMergedValue(local);

  if (
    TRACKED_COLLECTIONS.has(path) &&
    [base, local, external].every((value) =>
      value === MISSING_VALUE || Array.isArray(value)
    )
  ) {
    return mergeIndexedCollection(
      base === MISSING_VALUE ? [] : base,
      local === MISSING_VALUE ? [] : local,
      external === MISSING_VALUE ? [] : external,
      path
    );
  }

  if (
    plainObject(local) &&
    plainObject(external) &&
    (plainObject(base) || base === MISSING_VALUE)
  ) {
    const baseObject = base === MISSING_VALUE ? {} : base;
    const result = {};
    const keys = new Set([
      ...Object.keys(baseObject),
      ...Object.keys(local),
      ...Object.keys(external),
    ]);

    for (const key of keys) {
      const merged = mergeProjectValue(
        Object.hasOwn(baseObject, key) ? baseObject[key] : MISSING_VALUE,
        Object.hasOwn(local, key) ? local[key] : MISSING_VALUE,
        Object.hasOwn(external, key) ? external[key] : MISSING_VALUE,
        path ? `${path}.${key}` : key
      );
      if (merged !== MISSING_VALUE) result[key] = merged;
    }

    return result;
  }

  throw reconciliationError(
    "merge_conflict",
    `The field ${path || "project"} changed incompatibly on both devices.`
  );
}

function mergeIndependentProject(project) {
  if (!project.versions?.local || !project.versions?.external) {
    throw reconciliationError(
      "stale_comparison",
      "The compared project versions are no longer available."
    );
  }
  if (!project.versions.base) {
    throw reconciliationError(
      "stale_comparison",
      "The verified common ancestor is no longer available."
    );
  }

  return comparableValue(mergeProjectValue(
    project.versions.base,
    project.versions.local,
    project.versions.external
  ));
}

function validateComparisonVersions(comparison, localProjects, externalSnapshot) {
  const localById = new Map(localProjects.map((project) => [project.project.id, project]));
  const externalById = new Map(
    externalSnapshot.bundle.projects.map((project) => [project.project.id, project])
  );

  if (comparison.snapshotId !== externalSnapshot.snapshotId) {
    throw reconciliationError(
      "stale_comparison",
      "The comparison belongs to a different external snapshot."
    );
  }

  for (const project of comparison.projects) {
    if (
      !sameDocument(localById.get(project.projectId), project.versions?.local) ||
      !sameDocument(externalById.get(project.projectId), project.versions?.external)
    ) {
      throw reconciliationError(
        "stale_comparison",
        "A project changed after the comparison was prepared."
      );
    }
  }

  if (
    localById.size !== comparison.projects.filter(({ localExists }) => localExists).length ||
    externalById.size !== comparison.projects.filter(({ externalExists }) => externalExists).length
  ) {
    throw reconciliationError(
      "stale_comparison",
      "The compared portfolio changed after the preview was prepared."
    );
  }

  return { localById, externalById };
}

export function preparePortableProjectDecisionPlan({
  comparison,
  localProjects = [],
  externalSnapshot,
  decisions,
}) {
  const external = validatePortableBackupSnapshot(externalSnapshot);
  const currentProjects = Array.isArray(localProjects) ? localProjects : [];
  validateProjectBundle(
    createProjectBundle(currentProjects, { exportedAt: external.createdAt })
  );

  const selected = normalizeDecisionMap(comparison, decisions);
  const { localById, externalById } = validateComparisonVersions(
    comparison,
    currentProjects,
    external
  );
  const resultingById = new Map();

  for (const project of comparison.projects) {
    const local = localById.get(project.projectId);
    const incoming = externalById.get(project.projectId);
    const decision = selected.get(project.projectId) || null;

    if (!decision) {
      if (local) resultingById.set(project.projectId, cloneJson(local));
      continue;
    }

    switch (decision) {
      case PORTABLE_PROJECT_DECISION.KEEP_LOCAL:
        if (local) resultingById.set(project.projectId, cloneJson(local));
        break;
      case PORTABLE_PROJECT_DECISION.ADD_EXTERNAL:
      case PORTABLE_PROJECT_DECISION.USE_EXTERNAL:
      case PORTABLE_PROJECT_DECISION.RESTORE_EXTERNAL:
        if (!incoming) {
          throw reconciliationError(
            "missing_external_project",
            "The selected external project is no longer available."
          );
        }
        resultingById.set(project.projectId, cloneJson(incoming));
        break;
      case PORTABLE_PROJECT_DECISION.DELETE_LOCAL:
        break;
      case PORTABLE_PROJECT_DECISION.MERGE_INDEPENDENT:
        resultingById.set(project.projectId, mergeIndependentProject(project));
        break;
      default:
        throw reconciliationError(
          "invalid_project_decision",
          "The selected project decision is unsupported."
        );
    }
  }

  const projects = [];
  for (const project of currentProjects) {
    const result = resultingById.get(project.project.id);
    if (result) {
      projects.push(result);
      resultingById.delete(project.project.id);
    }
  }
  for (const project of external.bundle.projects) {
    const result = resultingById.get(project.project.id);
    if (result) {
      projects.push(result);
      resultingById.delete(project.project.id);
    }
  }

  if (resultingById.size > 0) {
    throw reconciliationError(
      "invalid_project_result",
      "The project decision plan produced an incomplete result."
    );
  }

  validateProjectBundle(createProjectBundle(projects, { exportedAt: external.createdAt }));

  return {
    projects,
    decisions: Object.fromEntries(selected),
    summary: summarizePortableProjectDecisions(comparison, decisions),
  };
}

export function applyPortableProjectDecisionPlan(options) {
  if (options?.confirmed !== true) {
    throw reconciliationError(
      "confirmation_required",
      "Explicit confirmation is required before applying project decisions."
    );
  }

  return preparePortableProjectDecisionPlan(options);
}
