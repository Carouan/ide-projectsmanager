import { BACKLOG_STATUS } from "../../../constants/backlog.js";
import {
  getStageDefinition,
  STAGE_DEFINITIONS,
} from "../../../constants/stages.js";
import {
  normalizeWorkstreams,
  ProjectWorkstreamError,
  WORKSTREAM_STATUS,
} from "../../../services/projectWorkstreams.js";

export const WORKSTREAM_BACKLOG_FILTER = Object.freeze({
  ALL: "all",
  UNASSIGNED: "unassigned",
});

const PRIORITY_ORDER = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
});

function openBacklogItem(item) {
  return ![BACKLOG_STATUS.DONE, BACKLOG_STATUS.DROPPED].includes(item?.status);
}

function linkedStageKey(item) {
  return item?.stageKey || item?.relatedStage || null;
}

function nextAction(items) {
  return [...items].sort(
    (left, right) =>
      (PRIORITY_ORDER[left.priority] ?? 4) -
      (PRIORITY_ORDER[right.priority] ?? 4)
  )[0] || null;
}

function planningRow(workstream, backlog, currentStageKey) {
  const assignedItems = backlog.filter(
    (item) => item?.workstreamId === workstream.id
  );
  const openItems = assignedItems.filter(openBacklogItem);
  const cells = STAGE_DEFINITIONS.map((stage) => {
    const items = assignedItems.filter((item) => linkedStageKey(item) === stage.key);
    const openCount = items.filter(openBacklogItem).length;

    return {
      stageKey: stage.key,
      totalCount: items.length,
      openCount,
      completedCount: items.filter((item) => item.status === BACKLOG_STATUS.DONE)
        .length,
      state:
        items.length === 0 ? "empty" : openCount > 0 ? "active" : "completed",
    };
  });

  return {
    workstream,
    assignedItems,
    openItems,
    nextAction: nextAction(openItems),
    totalCount: assignedItems.length,
    openCount: openItems.length,
    currentStageOpenCount: openItems.filter(
      (item) => linkedStageKey(item) === currentStageKey
    ).length,
    unscheduledCount: assignedItems.filter((item) => !linkedStageKey(item)).length,
    cells,
  };
}

function recommendedFocus(rows) {
  return [...rows]
    .filter(
      (row) =>
        row.openCount > 0 &&
        !row.workstream.archived &&
        row.workstream.status !== WORKSTREAM_STATUS.COMPLETED
    )
    .sort((left, right) => {
      const leftBlocked = left.workstream.status === WORKSTREAM_STATUS.BLOCKED;
      const rightBlocked = right.workstream.status === WORKSTREAM_STATUS.BLOCKED;

      if (leftBlocked !== rightBlocked) return leftBlocked ? -1 : 1;
      if (left.currentStageOpenCount !== right.currentStageOpenCount) {
        return right.currentStageOpenCount - left.currentStageOpenCount;
      }

      return (
        (PRIORITY_ORDER[left.nextAction?.priority] ?? 4) -
        (PRIORITY_ORDER[right.nextAction?.priority] ?? 4) ||
        left.workstream.order - right.workstream.order
      );
    })[0] || null;
}

export function deriveWorkstreamPlanning(projectDoc, options = {}) {
  const allWorkstreams = normalizeWorkstreams(projectDoc?.workstreams);
  const backlog = Array.isArray(projectDoc?.backlog) ? projectDoc.backlog : [];
  const currentStageKey = projectDoc?.project?.currentStage || "v0_0";
  const visibleWorkstreams = allWorkstreams.filter(
    (workstream) => options.includeArchived || !workstream.archived
  );
  const rows = visibleWorkstreams.map((workstream) =>
    planningRow(workstream, backlog, currentStageKey)
  );
  const available = allWorkstreams.filter((workstream) => !workstream.archived);
  const availableIds = new Set(available.map(({ id }) => id));
  const openItems = backlog.filter(openBacklogItem);

  return {
    stages: STAGE_DEFINITIONS,
    rows,
    currentStageKey,
    focus: recommendedFocus(rows),
    summary: {
      total: available.length,
      active: available.filter(({ status }) => status === WORKSTREAM_STATUS.ACTIVE)
        .length,
      blocked: available.filter(({ status }) => status === WORKSTREAM_STATUS.BLOCKED)
        .length,
      archived: allWorkstreams.length - available.length,
      openAssigned: openItems.filter(({ workstreamId }) =>
        availableIds.has(workstreamId)
      ).length,
      unassigned: openItems.filter(({ workstreamId }) => !workstreamId).length,
      withoutCoverage: rows.filter(
        (row) => !row.workstream.archived && row.totalCount === 0
      ).length,
    },
  };
}

export function filterWorkstreamBacklog(
  backlog = [],
  filter = WORKSTREAM_BACKLOG_FILTER.ALL
) {
  const safeBacklog = Array.isArray(backlog) ? backlog : [];

  if (filter === WORKSTREAM_BACKLOG_FILTER.ALL) return safeBacklog;
  if (filter === WORKSTREAM_BACKLOG_FILTER.UNASSIGNED) {
    return safeBacklog.filter((item) => !item?.workstreamId);
  }

  return safeBacklog.filter((item) => item?.workstreamId === filter);
}

export function updateProjectWorkstream(workstreams, workstreamId, patch = {}) {
  const normalized = normalizeWorkstreams(workstreams);
  const existing = normalized.find((workstream) => workstream.id === workstreamId);

  if (!existing) {
    throw new ProjectWorkstreamError(
      "unknown_workstream",
      `Workstream ${workstreamId} does not exist.`
    );
  }

  if (
    Object.prototype.hasOwnProperty.call(patch, "title") &&
    (typeof patch.title !== "string" || !patch.title.trim())
  ) {
    throw new ProjectWorkstreamError(
      "invalid_workstream_title",
      "A workstream requires a non-empty title."
    );
  }

  return normalizeWorkstreams(
    normalized.map((workstream) =>
      workstream.id === workstreamId
        ? { ...workstream, ...patch, id: workstream.id }
        : workstream
    )
  );
}

export function reorderProjectWorkstreams(workstreams, workstreamId, direction) {
  const normalized = normalizeWorkstreams(workstreams);
  const index = normalized.findIndex(({ id }) => id === workstreamId);
  const offset = direction === "up" ? -1 : direction === "down" ? 1 : 0;
  const target = index + offset;

  if (index < 0 || offset === 0 || target < 0 || target >= normalized.length) {
    return normalized;
  }

  [normalized[index], normalized[target]] = [normalized[target], normalized[index]];

  return normalized.map((workstream, order) => ({
    ...workstream,
    order: order * 10,
  }));
}

function normalizedTitle(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function mergeSuggestedWorkstreams(existing, suggestions) {
  const result = normalizeWorkstreams(existing);
  const ids = new Set(result.map(({ id }) => id));
  const titles = new Set(result.map(({ title }) => normalizedTitle(title)));
  let nextOrder = result.reduce(
    (maximum, workstream) => Math.max(maximum, workstream.order + 10),
    0
  );

  for (const suggestion of normalizeWorkstreams(suggestions)) {
    if (ids.has(suggestion.id) || titles.has(normalizedTitle(suggestion.title))) {
      continue;
    }

    result.push({ ...suggestion, order: nextOrder });
    ids.add(suggestion.id);
    titles.add(normalizedTitle(suggestion.title));
    nextOrder += 10;
  }

  return result;
}

export function updateBacklogWorkstreamAssignment(projectDoc, itemId, patch = {}) {
  const backlog = Array.isArray(projectDoc?.backlog) ? projectDoc.backlog : [];
  const item = backlog.find((candidate) => candidate.id === itemId);

  if (!item) {
    throw new ProjectWorkstreamError(
      "unknown_backlog_item",
      `Backlog item ${itemId} does not exist.`
    );
  }

  const workstreams = normalizeWorkstreams(projectDoc.workstreams);
  const hasWorkstreamPatch = Object.prototype.hasOwnProperty.call(
    patch,
    "workstreamId"
  );
  const hasStagePatch = Object.prototype.hasOwnProperty.call(patch, "stageKey");
  const workstreamId = patch.workstreamId || null;
  const stageKey = patch.stageKey || null;

  if (hasWorkstreamPatch && workstreamId) {
    const workstream = workstreams.find(({ id }) => id === workstreamId);

    if (!workstream || workstream.archived) {
      throw new ProjectWorkstreamError(
        workstream ? "archived_workstream" : "unknown_workstream",
        `Workstream ${workstreamId} cannot accept a new assignment.`
      );
    }
  }

  if (hasStagePatch && stageKey && !getStageDefinition(stageKey)) {
    throw new ProjectWorkstreamError(
      "unknown_stage",
      `Stage ${stageKey} does not exist.`
    );
  }

  const updated = {
    ...projectDoc,
    backlog: backlog.map((candidate) => {
      if (candidate.id !== itemId) return candidate;

      return {
        ...candidate,
        ...(hasWorkstreamPatch ? { workstreamId } : {}),
        ...(hasStagePatch ? { stageKey, relatedStage: stageKey } : {}),
      };
    }),
  };

  if (!hasStagePatch) return updated;

  updated.stages = Object.fromEntries(
    Object.entries(projectDoc.stages || {}).map(([key, stage]) => {
      const previous = Array.isArray(stage?.linkedBacklogIds)
        ? stage.linkedBacklogIds
        : [];
      const withoutItem = previous.filter((id) => id !== itemId);

      return [
        key,
        {
          ...stage,
          linkedBacklogIds:
            key === stageKey ? [...withoutItem, itemId] : withoutItem,
        },
      ];
    })
  );

  return updated;
}
