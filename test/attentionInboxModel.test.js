import test from "node:test";
import assert from "node:assert/strict";

import {
  ATTENTION_FILTER,
  ATTENTION_SEVERITY,
  deriveAttentionItems,
  filterAttentionItems,
  summarizeAttentionItems,
} from "../src/features/projects/services/attentionInboxModel.js";
import { readAttentionRepositoryResults } from "../src/features/projects/hooks/useAttentionInbox.js";

function project(overrides = {}) {
  return {
    project: {
      id: "project-1",
      title: "Project One",
      status: "active",
      ...(overrides.project || {}),
    },
    repository: overrides.repository ?? null,
    decisions: overrides.decisions || [],
    backlog: overrides.backlog || [],
  };
}

function repositoryResult(pullRequests = [], status = "fresh") {
  return {
    status,
    snapshot: {
      repository: { fullName: "Carouan/project-one" },
      openPullRequests: pullRequests,
      links: {
        repository: "https://github.com/Carouan/project-one",
        pullRequests: "https://github.com/Carouan/project-one/pulls",
      },
    },
  };
}

test("pending decisions and explicit blocking questions create local attention", () => {
  const items = deriveAttentionItems([
    project({
      decisions: [
        { id: "d1", title: "Choose scope", status: "pending" },
        { id: "d2", title: "Accepted", status: "accepted" },
      ],
      backlog: [
        {
          id: "q1",
          title: "Owner answer needed",
          type: "question",
          blocking: true,
          status: "open",
        },
        {
          id: "q2",
          title: "Closed question",
          type: "question",
          blocking: true,
          status: "done",
        },
      ],
    }),
  ]);

  assert.deepEqual(
    items.map(({ category, reason }) => ({ category, reason })),
    [
      {
        category: "blocking_question",
        reason: "explicit_blocking_question",
      },
      { category: "decision_required", reason: "pending_decision" },
    ]
  );
});

test("healthy drafts stay out while ready PRs request validation", () => {
  const projectDoc = project({
    repository: {
      provider: "github",
      fullName: "Carouan/project-one",
      url: "https://github.com/Carouan/project-one",
    },
  });
  const result = repositoryResult([
    {
      number: 1,
      title: "Draft work",
      draft: true,
      readyForReview: false,
      hasConflicts: false,
      statusSummary: { state: "success", failure: 0, pending: 0 },
    },
    {
      number: 2,
      title: "Review me",
      draft: false,
      readyForReview: true,
      url: "https://github.com/Carouan/project-one/pull/2",
      hasConflicts: false,
      statusSummary: { state: "success", failure: 0, pending: 0 },
    },
  ]);

  const items = deriveAttentionItems([projectDoc], { "project-1": result });

  assert.equal(items.length, 1);
  assert.equal(items[0].category, "validation_required");
  assert.equal(items[0].severity, ATTENTION_SEVERITY.ACTION);
  assert.equal(items[0].reason, "ready_pr_validation");
  assert.equal(items[0].pullRequestNumber, 2);
});

test("failing drafts are technical information, not invented validation", () => {
  const projectDoc = project({
    repository: { provider: "github", fullName: "Carouan/project-one" },
  });
  const result = repositoryResult([
    {
      number: 3,
      title: "Broken draft",
      draft: true,
      readyForReview: false,
      hasConflicts: false,
      statusSummary: { state: "failure", failure: 1, pending: 0 },
    },
  ]);

  const [item] = deriveAttentionItems([projectDoc], { "project-1": result });

  assert.equal(item.category, "information");
  assert.equal(item.severity, ATTENTION_SEVERITY.CRITICAL);
  assert.equal(item.reason, "draft_pr_checks_failing");
});

test("stale repository facts are visibly marked and explained", () => {
  const projectDoc = project({
    repository: { provider: "github", fullName: "Carouan/project-one" },
  });
  const result = repositoryResult(
    [
      {
        number: 4,
        title: "Ready but cached",
        draft: false,
        readyForReview: true,
        statusSummary: null,
      },
    ],
    "stale"
  );

  const items = deriveAttentionItems([projectDoc], { "project-1": result });

  assert.equal(items.length, 2);
  assert.ok(items.every((item) => item.stale));
  assert.ok(items.some((item) => item.reason === "stale_repository_snapshot"));
});

test("repository failures remain explicit rather than appearing healthy", () => {
  const projectDoc = project({
    repository: {
      provider: "github",
      fullName: "Carouan/project-one",
      url: "https://github.com/Carouan/project-one",
    },
  });

  const [item] = deriveAttentionItems([projectDoc], {
    "project-1": {
      status: "error",
      snapshot: null,
      error: { code: "rate_limited" },
    },
  });

  assert.equal(item.category, "information");
  assert.equal(item.reason, "repository_rate_limited");
  assert.equal(item.stale, true);
});

test("private authorization requirements appear as honest warnings, not fabricated project blockers", () => {
  const projectDoc = project({
    repository: {
      provider: "github",
      fullName: "Carouan/private-project",
      visibility: "private",
    },
  });

  for (const [code, reason] of [
    ["authorization_required", "repository_authorization_required"],
    ["authorization_expired", "repository_authorization_expired"],
  ]) {
    const [item] = deriveAttentionItems([projectDoc], {
      "project-1": { status: "unauthorized", snapshot: null, error: { code } },
    });

    assert.equal(item.category, "information");
    assert.equal(item.severity, ATTENTION_SEVERITY.WARNING);
    assert.equal(item.reason, reason);
  }
});

test("project staleness is surfaced only when explicitly declared", () => {
  assert.equal(deriveAttentionItems([project()]).length, 0);

  const [item] = deriveAttentionItems([
    project({ project: { status: "stale" } }),
  ]);

  assert.equal(item.reason, "stale_project_status");
  assert.equal(item.stale, true);
});

test("summaries and filters expose all attention categories", () => {
  const items = [
    { category: "information" },
    { category: "decision_required" },
    { category: "validation_required" },
    { category: "blocking_question" },
  ];
  const summary = summarizeAttentionItems(items);

  assert.equal(summary.total, 4);
  assert.equal(summary.actionable, 3);
  assert.deepEqual(summary.counts, {
    information: 1,
    decision_required: 1,
    validation_required: 1,
    blocking_question: 1,
  });
  assert.deepEqual(
    filterAttentionItems(items, ATTENTION_FILTER.VALIDATION_REQUIRED),
    [{ category: "validation_required" }]
  );
});

test("repository reads are limited to linked projects and stay read-only", async () => {
  const calls = [];
  const projects = [
    project(),
    project({
      project: { id: "project-2", title: "Linked" },
      repository: { provider: "github", fullName: "Carouan/linked" },
    }),
  ];

  const results = await readAttentionRepositoryResults(projects, {
    forceRefresh: true,
    repositoryService: {
      async read(repository, options) {
        calls.push({ repository, options });
        return { status: "fresh", snapshot: { openPullRequests: [] } };
      },
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].repository.fullName, "Carouan/linked");
  assert.deepEqual(calls[0].options, { forceRefresh: true });
  assert.deepEqual(Object.keys(results), ["project-2"]);
});
