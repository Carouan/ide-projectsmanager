import test from "node:test";
import assert from "node:assert/strict";

import { buildDefaultStages, STAGE_DEFINITIONS } from "../src/constants/stages.js";
import {
  getNextStageDefinition,
  getVisibleStageDefinitions,
  isPristineStage,
} from "../src/features/projects/services/stageVisibility.js";

function project(overrides = {}) {
  return {
    project: {
      currentStage: "v0_0",
      ...(overrides.project || {}),
    },
    stages: {
      ...buildDefaultStages(),
      ...(overrides.stages || {}),
    },
    backlog: overrides.backlog || [],
    journal: overrides.journal || [],
  };
}

function keys(definitions) {
  return definitions.map((definition) => definition.key);
}

test("new projects show only the active stage by default", () => {
  assert.deepEqual(keys(getVisibleStageDefinitions(project())), ["v0_0"]);
});

test("past and active stages remain visible even when empty", () => {
  const projectDoc = project({ project: { currentStage: "v0_3" } });

  assert.deepEqual(keys(getVisibleStageDefinitions(projectDoc)), [
    "v0_0",
    "v0_1",
    "v0_2",
    "v0_3",
  ]);
});

test("future stages with content or a changed status remain visible", () => {
  for (const field of [
    "goal",
    "notes",
    "deliverable",
    "definitionOfDone",
  ]) {
    const projectDoc = project({
      stages: { v0_4: { status: "todo", [field]: "Useful content" } },
    });

    assert.deepEqual(keys(getVisibleStageDefinitions(projectDoc)), [
      "v0_0",
      "v0_4",
    ]);
  }

  const projectDoc = project({
    stages: { v0_6: { status: "in_progress" } },
  });

  assert.deepEqual(keys(getVisibleStageDefinitions(projectDoc)), [
    "v0_0",
    "v0_6",
  ]);
});

test("future stages with direct or reverse links remain visible", () => {
  const directBacklogLink = project({
    stages: { v0_2: { linkedBacklogIds: ["b1"] } },
  });
  const directJournalLink = project({
    stages: { v0_3: { linkedJournalIds: ["j1"] } },
  });
  const reverseBacklogLink = project({
    backlog: [{ id: "b2", relatedStage: "v0_4" }],
  });
  const reverseJournalLink = project({
    journal: [{ id: "j2", stage: "v0_5" }],
  });

  assert.deepEqual(keys(getVisibleStageDefinitions(directBacklogLink)), [
    "v0_0",
    "v0_2",
  ]);
  assert.deepEqual(keys(getVisibleStageDefinitions(directJournalLink)), [
    "v0_0",
    "v0_3",
  ]);
  assert.deepEqual(keys(getVisibleStageDefinitions(reverseBacklogLink)), [
    "v0_0",
    "v0_4",
  ]);
  assert.deepEqual(keys(getVisibleStageDefinitions(reverseJournalLink)), [
    "v0_0",
    "v0_5",
  ]);
});

test("full-journey preference exposes every stage without mutating data", () => {
  const projectDoc = project();
  const before = JSON.stringify(projectDoc);

  assert.deepEqual(
    keys(getVisibleStageDefinitions(projectDoc, true)),
    keys(STAGE_DEFINITIONS)
  );
  assert.equal(JSON.stringify(projectDoc), before);
  assert.deepEqual(keys(getVisibleStageDefinitions(projectDoc, false)), [
    "v0_0",
  ]);
});

test("unknown current stages fail safely by exposing the full journey", () => {
  const projectDoc = project({ project: { currentStage: "unknown" } });

  assert.deepEqual(
    keys(getVisibleStageDefinitions(projectDoc)),
    keys(STAGE_DEFINITIONS)
  );
});

test("whitespace alone does not make a future stage populated", () => {
  assert.equal(
    isPristineStage({ status: "todo", notes: "  \n  " }, "v0_1"),
    true
  );
});

test("next-stage lookup follows the existing journey boundaries", () => {
  assert.equal(getNextStageDefinition("v0_0")?.key, "v0_1");
  assert.equal(getNextStageDefinition("v0_9")?.key, "v1_0");
  assert.equal(getNextStageDefinition("v1_0"), null);
  assert.equal(getNextStageDefinition("unknown"), null);
});
