export const REPOSITORY_ATTENTION = Object.freeze({
  INFORMATION: "information",
  DECISION_REQUIRED: "decision_required",
  VALIDATION_REQUIRED: "validation_required",
  BLOCKING_QUESTION: "blocking_question",
});

const ATTENTION_PRIORITY = Object.freeze({
  [REPOSITORY_ATTENTION.INFORMATION]: 0,
  [REPOSITORY_ATTENTION.DECISION_REQUIRED]: 1,
  [REPOSITORY_ATTENTION.VALIDATION_REQUIRED]: 2,
  [REPOSITORY_ATTENTION.BLOCKING_QUESTION]: 3,
});

export function getPullRequestOriginSignal(pullRequest) {
  const authorType = String(pullRequest?.author?.type || "").toLowerCase();
  const login = String(pullRequest?.author?.login || "").toLowerCase();

  if (authorType === "bot" || login.endsWith("[bot]")) return "bot";
  if (authorType === "user") return "human";
  return "unknown";
}

export function getPullRequestHealth(pullRequest) {
  if (pullRequest?.hasConflicts === true) return "conflicts";

  const status = pullRequest?.statusSummary;
  if (!status || status.state === "unknown") return "unknown";
  if (status.failure > 0 || ["failure", "error"].includes(status.state)) {
    return "failing";
  }
  if (status.pending > 0 || status.state === "pending") return "pending";
  if (status.state === "success") return "passing";
  return "unknown";
}

export function classifyPullRequestAttention(pullRequest) {
  // A ready PR explicitly asks for human review. Technical failures and
  // conflicts stay repository-health facts; they do not become invented
  // human decisions or blocking questions.
  return pullRequest?.readyForReview === true && pullRequest?.draft !== true
    ? REPOSITORY_ATTENTION.VALIDATION_REQUIRED
    : REPOSITORY_ATTENTION.INFORMATION;
}

export function summarizeRepositoryAttention(pullRequests = []) {
  const items = pullRequests.map((pullRequest) => ({
    pullRequest,
    level: classifyPullRequestAttention(pullRequest),
  }));
  const counts = Object.values(REPOSITORY_ATTENTION).reduce(
    (result, level) => ({ ...result, [level]: 0 }),
    {}
  );

  for (const item of items) counts[item.level] += 1;

  const highest = items.reduce(
    (current, item) =>
      ATTENTION_PRIORITY[item.level] > ATTENTION_PRIORITY[current]
        ? item.level
        : current,
    REPOSITORY_ATTENTION.INFORMATION
  );

  return { highest, counts, items };
}

export function getRepositoryPanelState({ isLoading = false, result } = {}) {
  if (isLoading && !result?.snapshot) return "loading";
  if (!result || result.status === "unlinked") return "unlinked";
  if (result.snapshot && result.status === "stale") return "stale";
  if (result.snapshot) return "success";
  if (result.error?.code === "rate_limited") return "rate_limited";
  if (
    result.status === "unauthorized" ||
    ["authorization_required", "authorization_expired"].includes(result.error?.code)
  ) {
    return result.error?.code === "authorization_expired"
      ? "authorization_expired"
      : "authorization_required";
  }
  if (result.status === "offline") return "offline";
  if (result.status === "unsupported") return "unsupported";
  return "error";
}
