import { BACKLOG_STATUS } from "../../../constants/backlog.js";
import {
  REPOSITORY_ATTENTION,
  getPullRequestHealth,
} from "./repositoryPanelModel.js";

export const ATTENTION_FILTER = Object.freeze({
  ALL: "all",
  ...REPOSITORY_ATTENTION,
});

export const ATTENTION_SEVERITY = Object.freeze({
  INFORMATION: "information",
  ACTION: "action",
  WARNING: "warning",
  CRITICAL: "critical",
});

const CATEGORY_PRIORITY = Object.freeze({
  [REPOSITORY_ATTENTION.BLOCKING_QUESTION]: 0,
  [REPOSITORY_ATTENTION.DECISION_REQUIRED]: 1,
  [REPOSITORY_ATTENTION.VALIDATION_REQUIRED]: 2,
  [REPOSITORY_ATTENTION.INFORMATION]: 3,
});

const SEVERITY_PRIORITY = Object.freeze({
  [ATTENTION_SEVERITY.CRITICAL]: 0,
  [ATTENTION_SEVERITY.WARNING]: 1,
  [ATTENTION_SEVERITY.ACTION]: 2,
  [ATTENTION_SEVERITY.INFORMATION]: 3,
});

function projectIdentity(projectDoc) {
  return {
    projectId: projectDoc?.project?.id || null,
    projectTitle: projectDoc?.project?.title || "",
  };
}

function buildProjectItem(projectDoc, values) {
  return {
    ...projectIdentity(projectDoc),
    stale: false,
    targetUrl: null,
    ...values,
  };
}

function deriveLocalAttention(projectDoc) {
  const items = [];

  for (const decision of projectDoc?.decisions || []) {
    if (decision?.status !== "pending") continue;

    items.push(
      buildProjectItem(projectDoc, {
        id: `decision:${projectDoc.project.id}:${decision.id}`,
        category: REPOSITORY_ATTENTION.DECISION_REQUIRED,
        severity: ATTENTION_SEVERITY.ACTION,
        source: "project",
        reason: "pending_decision",
        title: decision.title || "",
      })
    );
  }

  for (const backlogItem of projectDoc?.backlog || []) {
    const isOpen = ![
      BACKLOG_STATUS.DONE,
      BACKLOG_STATUS.DROPPED,
    ].includes(backlogItem?.status);
    const isExplicitBlockingQuestion =
      backlogItem?.type === "question" && backlogItem?.blocking === true;

    if (!isOpen || !isExplicitBlockingQuestion) continue;

    items.push(
      buildProjectItem(projectDoc, {
        id: `question:${projectDoc.project.id}:${backlogItem.id}`,
        category: REPOSITORY_ATTENTION.BLOCKING_QUESTION,
        severity: ATTENTION_SEVERITY.CRITICAL,
        source: "project",
        reason: "explicit_blocking_question",
        title: backlogItem.title || "",
      })
    );
  }

  if (projectDoc?.project?.status === "stale") {
    items.push(
      buildProjectItem(projectDoc, {
        id: `project-status:${projectDoc.project.id}`,
        category: REPOSITORY_ATTENTION.INFORMATION,
        severity: ATTENTION_SEVERITY.WARNING,
        source: "project",
        reason: "stale_project_status",
        title: projectDoc.project.title || "",
        stale: true,
      })
    );
  }

  return items;
}

function pullRequestReason(health, readyForReview) {
  if (readyForReview && health === "conflicts") return "ready_pr_conflicts";
  if (readyForReview && health === "failing") return "ready_pr_checks_failing";
  if (readyForReview && health === "pending") return "ready_pr_checks_pending";
  if (readyForReview) return "ready_pr_validation";
  if (health === "conflicts") return "draft_pr_conflicts";
  if (health === "failing") return "draft_pr_checks_failing";
  return null;
}

function pullRequestSeverity(health, readyForReview) {
  if (["conflicts", "failing"].includes(health)) {
    return ATTENTION_SEVERITY.CRITICAL;
  }
  if (health === "pending") return ATTENTION_SEVERITY.WARNING;
  return readyForReview
    ? ATTENTION_SEVERITY.ACTION
    : ATTENTION_SEVERITY.INFORMATION;
}

function deriveRepositoryAttention(projectDoc, repositoryResult) {
  if (!projectDoc?.repository || !repositoryResult) return [];

  const items = [];
  const isStale = repositoryResult.status === "stale";
  const snapshot = repositoryResult.snapshot;

  if (!snapshot) {
    const authorizationRequired =
      repositoryResult.status === "unauthorized" ||
      ["authorization_required", "authorization_expired"].includes(
        repositoryResult.error?.code
      );

    items.push(
      buildProjectItem(projectDoc, {
        id: `repository-unavailable:${projectDoc.project.id}`,
        category: REPOSITORY_ATTENTION.INFORMATION,
        severity:
          repositoryResult.status === "unsupported" || authorizationRequired
            ? ATTENTION_SEVERITY.WARNING
            : ATTENTION_SEVERITY.CRITICAL,
        source: "repository",
        reason:
          authorizationRequired
            ? repositoryResult.error?.code === "authorization_expired"
              ? "repository_authorization_expired"
              : "repository_authorization_required"
            : repositoryResult.error?.code === "rate_limited"
            ? "repository_rate_limited"
            : repositoryResult.status === "offline"
              ? "repository_offline"
              : repositoryResult.status === "unsupported"
                ? "repository_unsupported"
                : "repository_unavailable",
        title:
          projectDoc.repository.fullName || projectDoc.repository.url || "",
        stale: true,
        targetUrl: projectDoc.repository.url || null,
      })
    );

    return items;
  }

  for (const pullRequest of snapshot.openPullRequests || []) {
    const readyForReview =
      pullRequest?.readyForReview === true && pullRequest?.draft !== true;
    const health = getPullRequestHealth(pullRequest);
    const reason = pullRequestReason(health, readyForReview);

    // Healthy drafts are informative in the project panel, but they do not
    // require space in the global human-attention inbox.
    if (!reason) continue;

    items.push(
      buildProjectItem(projectDoc, {
        id: `pull-request:${projectDoc.project.id}:${pullRequest.number}`,
        category: readyForReview
          ? REPOSITORY_ATTENTION.VALIDATION_REQUIRED
          : REPOSITORY_ATTENTION.INFORMATION,
        severity: pullRequestSeverity(health, readyForReview),
        source: "repository",
        reason,
        title: pullRequest.title || `#${pullRequest.number}`,
        stale: isStale,
        targetUrl: pullRequest.url || snapshot.links?.pullRequests || null,
        pullRequestNumber: pullRequest.number,
      })
    );
  }

  if (isStale) {
    items.push(
      buildProjectItem(projectDoc, {
        id: `repository-stale:${projectDoc.project.id}`,
        category: REPOSITORY_ATTENTION.INFORMATION,
        severity: ATTENTION_SEVERITY.WARNING,
        source: "repository",
        reason: "stale_repository_snapshot",
        title: snapshot.repository?.fullName || projectDoc.repository.fullName || "",
        stale: true,
        targetUrl: snapshot.links?.repository || projectDoc.repository.url || null,
      })
    );
  }

  return items;
}

export function deriveAttentionItems(projects = [], repositoryResults = {}) {
  return projects
    .flatMap((projectDoc) => [
      ...deriveLocalAttention(projectDoc),
      ...deriveRepositoryAttention(
        projectDoc,
        repositoryResults[projectDoc?.project?.id]
      ),
    ])
    .sort((left, right) => {
      const categoryDifference =
        CATEGORY_PRIORITY[left.category] - CATEGORY_PRIORITY[right.category];
      if (categoryDifference !== 0) return categoryDifference;

      const severityDifference =
        SEVERITY_PRIORITY[left.severity] - SEVERITY_PRIORITY[right.severity];
      if (severityDifference !== 0) return severityDifference;

      return left.projectTitle.localeCompare(right.projectTitle);
    });
}

export function summarizeAttentionItems(items = []) {
  const counts = Object.values(REPOSITORY_ATTENTION).reduce(
    (result, category) => ({ ...result, [category]: 0 }),
    {}
  );

  for (const item of items) {
    if (Object.prototype.hasOwnProperty.call(counts, item.category)) {
      counts[item.category] += 1;
    }
  }

  return {
    total: items.length,
    actionable:
      counts[REPOSITORY_ATTENTION.DECISION_REQUIRED] +
      counts[REPOSITORY_ATTENTION.VALIDATION_REQUIRED] +
      counts[REPOSITORY_ATTENTION.BLOCKING_QUESTION],
    counts,
  };
}

export function filterAttentionItems(items = [], filter = ATTENTION_FILTER.ALL) {
  if (filter === ATTENTION_FILTER.ALL) return items;
  return items.filter((item) => item.category === filter);
}
