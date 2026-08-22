import { STAGE_DEFINITIONS } from "../../../constants/stages.js";

const STAGE_CONTENT_FIELDS = [
  "goal",
  "notes",
  "deliverable",
  "definitionOfDone",
];

export function isPristineStage(stage, stageKey, backlog = [], journal = []) {
  if ((stage?.status || "todo") !== "todo") return false;

  if (
    STAGE_CONTENT_FIELDS.some((field) =>
      String(stage?.[field] || "").trim()
    )
  ) {
    return false;
  }

  if (stage?.linkedBacklogIds?.length || stage?.linkedJournalIds?.length) {
    return false;
  }

  if (backlog.some((item) => item?.relatedStage === stageKey)) return false;
  if (journal.some((entry) => entry?.stage === stageKey)) return false;

  return true;
}

export function getVisibleStageDefinitions(projectDoc, showFullJourney = false) {
  if (showFullJourney) return STAGE_DEFINITIONS;

  const currentStageKey = projectDoc?.project?.currentStage || "v0_0";
  const currentStageIndex = STAGE_DEFINITIONS.findIndex(
    (definition) => definition.key === currentStageKey
  );

  if (currentStageIndex < 0) return STAGE_DEFINITIONS;

  const stages = projectDoc?.stages || {};
  const backlog = Array.isArray(projectDoc?.backlog) ? projectDoc.backlog : [];
  const journal = Array.isArray(projectDoc?.journal) ? projectDoc.journal : [];

  return STAGE_DEFINITIONS.filter((definition, index) => {
    if (index <= currentStageIndex) return true;

    return !isPristineStage(
      stages[definition.key],
      definition.key,
      backlog,
      journal
    );
  });
}

export function getNextStageDefinition(currentStageKey) {
  const currentStageIndex = STAGE_DEFINITIONS.findIndex(
    (definition) => definition.key === currentStageKey
  );

  if (currentStageIndex < 0) return null;

  return STAGE_DEFINITIONS[currentStageIndex + 1] || null;
}
