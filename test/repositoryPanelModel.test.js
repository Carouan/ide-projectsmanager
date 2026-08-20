import test from "node:test";
import assert from "node:assert/strict";

import {
  REPOSITORY_ATTENTION,
  classifyPullRequestAttention,
  getPullRequestHealth,
  getPullRequestOriginSignal,
  getRepositoryPanelState,
  summarizeRepositoryAttention,
} from "../src/features/projects/services/repositoryPanelModel.js";

test("draft PRs remain informational while ready PRs request validation", () => {
  assert.equal(
    classifyPullRequestAttention({ draft: true, readyForReview: false }),
    REPOSITORY_ATTENTION.INFORMATION
  );
  assert.equal(
    classifyPullRequestAttention({ draft: false, readyForReview: true }),
    REPOSITORY_ATTENTION.VALIDATION_REQUIRED
  );
});

test("technical failures stay repository-health facts", () => {
  const conflictedReadyPullRequest = {
    draft: false,
    readyForReview: true,
    hasConflicts: true,
    statusSummary: { state: "failure", failure: 1, pending: 0 },
  };

  assert.equal(
    getPullRequestHealth(conflictedReadyPullRequest),
    "conflicts"
  );
  assert.equal(
    classifyPullRequestAttention(conflictedReadyPullRequest),
    REPOSITORY_ATTENTION.VALIDATION_REQUIRED
  );
});

test("repository health distinguishes passing, pending, failing and unknown", () => {
  assert.equal(
    getPullRequestHealth({
      statusSummary: { state: "success", failure: 0, pending: 0 },
    }),
    "passing"
  );
  assert.equal(
    getPullRequestHealth({
      statusSummary: { state: "pending", failure: 0, pending: 1 },
    }),
    "pending"
  );
  assert.equal(
    getPullRequestHealth({
      statusSummary: { state: "failure", failure: 1, pending: 0 },
    }),
    "failing"
  );
  assert.equal(getPullRequestHealth({ statusSummary: null }), "unknown");
});

test("origin signals use GitHub facts without guessing AI authorship", () => {
  assert.equal(
    getPullRequestOriginSignal({ author: { login: "dependabot[bot]" } }),
    "bot"
  );
  assert.equal(
    getPullRequestOriginSignal({ author: { login: "Carouan", type: "User" } }),
    "human"
  );
  assert.equal(getPullRequestOriginSignal({ author: {} }), "unknown");
});

test("attention summary exposes every Steward category without inventing it", () => {
  const summary = summarizeRepositoryAttention([
    { number: 1, draft: true, readyForReview: false },
    { number: 2, draft: false, readyForReview: true },
  ]);

  assert.equal(summary.highest, REPOSITORY_ATTENTION.VALIDATION_REQUIRED);
  assert.deepEqual(summary.counts, {
    information: 1,
    decision_required: 0,
    validation_required: 1,
    blocking_question: 0,
  });
});

test("panel states distinguish loading, empty, stale, rate limits and errors", () => {
  assert.equal(getRepositoryPanelState({ isLoading: true }), "loading");
  assert.equal(
    getRepositoryPanelState({ result: { status: "unlinked" } }),
    "unlinked"
  );
  assert.equal(
    getRepositoryPanelState({
      result: { status: "fresh", snapshot: { openPullRequests: [] } },
    }),
    "success"
  );
  assert.equal(
    getRepositoryPanelState({
      result: { status: "stale", snapshot: { openPullRequests: [] } },
    }),
    "stale"
  );
  assert.equal(
    getRepositoryPanelState({
      result: { status: "error", error: { code: "rate_limited" } },
    }),
    "rate_limited"
  );
  assert.equal(
    getRepositoryPanelState({ result: { status: "offline" } }),
    "offline"
  );
  assert.equal(
    getRepositoryPanelState({ result: { status: "unsupported" } }),
    "unsupported"
  );
  assert.equal(
    getRepositoryPanelState({
      result: { status: "error", error: { code: "network" } },
    }),
    "error"
  );
});
