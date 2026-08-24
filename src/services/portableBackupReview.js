import {
  analyzeProjectBundle,
  PROJECT_BUNDLE_CONFLICT_STRATEGY,
  restoreProjectBundle,
} from "./jsonTransfer.js";
import { validatePortableBackupSnapshot } from "./portableBackupSnapshots.js";

export const PORTABLE_SNAPSHOT_REVIEW_STATE = Object.freeze({
  NO_EXTERNAL: "no_external",
  SAME: "same",
  NEWER_DESCENDANT: "newer_descendant",
  OLDER: "older",
  DIVERGENT: "divergent",
  UNKNOWN: "unknown",
  UNREADABLE: "unreadable",
  PERMISSION_ERROR: "permission_error",
});

export const PORTABLE_SNAPSHOT_DECISION = Object.freeze({
  RESTORE: "restore",
  COPY: "copy",
  KEEP: "keep",
  IGNORE: "ignore",
});

export class PortableBackupReviewError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PortableBackupReviewError";
    this.code = code;
  }
}

function reviewError(code, message) {
  return new PortableBackupReviewError(code, message);
}

function isKnownAncestor(ancestorId, descendantId, snapshotsById) {
  if (!ancestorId || !descendantId || ancestorId === descendantId) return false;

  const visited = new Set();
  let currentId = descendantId;

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId);
    const snapshot = snapshotsById.get(currentId);
    const parentId = snapshot?.parentSnapshotId || null;

    if (parentId === ancestorId) return true;
    currentId = parentId;
  }

  return false;
}

function projectContentMatches(left, right) {
  return JSON.stringify(left || []) === JSON.stringify(right || []);
}

function removedProjectCount(bundle, existingProjects) {
  const incomingIds = new Set(bundle.projects.map((project) => project.project.id));
  return existingProjects.filter((project) =>
    !incomingIds.has(project?.project?.id)
  ).length;
}

export function classifyPortableBackupSnapshot({
  snapshot,
  localSnapshot,
  localSnapshotId,
  localProjects = [],
  snapshotsById = new Map(),
}) {
  const external = validatePortableBackupSnapshot(snapshot);
  if (external.snapshotId === localSnapshotId) {
    return PORTABLE_SNAPSHOT_REVIEW_STATE.SAME;
  }

  if (!localSnapshotId) return PORTABLE_SNAPSHOT_REVIEW_STATE.UNKNOWN;

  const localDirty = localSnapshot
    ? !projectContentMatches(localSnapshot.bundle.projects, localProjects)
    : localProjects.length > 0;

  if (isKnownAncestor(localSnapshotId, external.snapshotId, snapshotsById)) {
    return localDirty
      ? PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT
      : PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT;
  }

  if (isKnownAncestor(external.snapshotId, localSnapshotId, snapshotsById)) {
    return PORTABLE_SNAPSHOT_REVIEW_STATE.OLDER;
  }

  if (
    localSnapshot?.parentSnapshotId &&
    localSnapshot.parentSnapshotId === external.parentSnapshotId
  ) {
    return PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT;
  }

  return PORTABLE_SNAPSHOT_REVIEW_STATE.UNKNOWN;
}

export function summarizePortableBackupReview(candidates = [], unreadable = []) {
  if (candidates.some((candidate) =>
    candidate.state === PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT
  )) return PORTABLE_SNAPSHOT_REVIEW_STATE.DIVERGENT;

  if (unreadable.length > 0) return PORTABLE_SNAPSHOT_REVIEW_STATE.UNREADABLE;

  for (const state of [
    PORTABLE_SNAPSHOT_REVIEW_STATE.NEWER_DESCENDANT,
    PORTABLE_SNAPSHOT_REVIEW_STATE.UNKNOWN,
    PORTABLE_SNAPSHOT_REVIEW_STATE.OLDER,
    PORTABLE_SNAPSHOT_REVIEW_STATE.SAME,
  ]) {
    if (candidates.some((candidate) => candidate.state === state)) return state;
  }

  return PORTABLE_SNAPSHOT_REVIEW_STATE.NO_EXTERNAL;
}

export function reviewPortableBackupSnapshots({
  localDevice,
  localProjects = [],
  localSnapshot = null,
  externalSnapshots = [],
  unreadable = [],
}) {
  const currentProjects = Array.isArray(localProjects) ? localProjects : [];
  const localSnapshotId = localDevice?.lastSnapshotId || localSnapshot?.snapshotId || null;
  const acknowledged = new Set(localDevice?.acknowledgedSnapshotIds || []);
  const validatedExternalSnapshots = externalSnapshots.map((entry) => ({
    reference: entry.reference || null,
    snapshot: validatePortableBackupSnapshot(entry.snapshot || entry),
  }));
  const snapshotsById = new Map();

  if (localSnapshot) {
    const validatedLocal = validatePortableBackupSnapshot(localSnapshot);
    snapshotsById.set(validatedLocal.snapshotId, validatedLocal);
  }

  for (const entry of validatedExternalSnapshots) {
    snapshotsById.set(entry.snapshot.snapshotId, entry.snapshot);
  }

  const effectiveLocalSnapshot = snapshotsById.get(localSnapshotId) || localSnapshot;

  const candidates = validatedExternalSnapshots
    .filter(({ snapshot }) => !acknowledged.has(snapshot.snapshotId))
    .map(({ reference, snapshot }) => {
      const analysis = analyzeProjectBundle(snapshot.bundle, currentProjects);
      return {
        reference,
        snapshot,
        state: classifyPortableBackupSnapshot({
          snapshot,
          localSnapshot: effectiveLocalSnapshot,
          localSnapshotId,
          localProjects: currentProjects,
          snapshotsById,
        }),
        snapshotId: snapshot.snapshotId,
        deviceId: snapshot.device.id,
        deviceLabel: snapshot.device.label,
        createdAt: snapshot.createdAt,
        projectCount: analysis.projectCount,
        newCount: analysis.newCount,
        conflictCount: analysis.conflictCount,
        removedCount: removedProjectCount(snapshot.bundle, currentProjects),
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));

  return {
    state: summarizePortableBackupReview(candidates, unreadable),
    localSnapshotId,
    candidates,
    unreadable,
  };
}

export function applyPortableBackupSnapshotDecision(
  candidate,
  existingProjects = [],
  action,
  options = {}
) {
  if (!Object.values(PORTABLE_SNAPSHOT_DECISION).includes(action)) {
    throw reviewError("invalid_snapshot_decision", "The snapshot decision is invalid.");
  }

  const snapshot = validatePortableBackupSnapshot(candidate?.snapshot);
  const currentProjects = Array.isArray(existingProjects) ? existingProjects : [];
  const analysis = analyzeProjectBundle(snapshot.bundle, currentProjects);

  if (action === PORTABLE_SNAPSHOT_DECISION.RESTORE) {
    if (options.confirmed !== true) {
      throw reviewError(
        "confirmation_required",
        "Explicit confirmation is required before replacing the local portfolio."
      );
    }

    return {
      action,
      projects: JSON.parse(JSON.stringify(snapshot.bundle.projects)),
      summary: {
        addedCount: analysis.newCount,
        replacedCount: analysis.conflictCount,
        removedCount: removedProjectCount(snapshot.bundle, currentProjects),
        copiedCount: 0,
        resultingProjectCount: snapshot.bundle.projectCount,
      },
    };
  }

  if (action === PORTABLE_SNAPSHOT_DECISION.COPY) {
    const result = restoreProjectBundle(snapshot.bundle, currentProjects, {
      conflictStrategy: PROJECT_BUNDLE_CONFLICT_STRATEGY.COPY,
      idFactory: options.idFactory,
      now: options.now,
    });

    return {
      action,
      projects: result.projects,
      summary: {
        ...result.summary,
        replacedCount: 0,
        removedCount: 0,
      },
    };
  }

  return {
    action,
    projects: currentProjects,
    summary: {
      addedCount: 0,
      replacedCount: 0,
      removedCount: 0,
      copiedCount: 0,
      resultingProjectCount: currentProjects.length,
    },
  };
}
