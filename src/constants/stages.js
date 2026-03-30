export const STAGE_DEFINITIONS = [
  {
    key: "v0_0",
    version: "v.0.0",
    title: "Idée initiale",
    shortTitle: "v0.0",
  },
  {
    key: "v0_1",
    version: "v.0.1",
    title: "Analyse exploratoire",
    shortTitle: "v0.1",
  },
  {
    key: "v0_2",
    version: "v.0.2",
    title: "Formalisation des exigences",
    shortTitle: "v0.2",
  },
  {
    key: "v0_3",
    version: "v.0.3",
    title: "Conception & architecture",
    shortTitle: "v0.3",
  },
  {
    key: "v0_4",
    version: "v.0.4",
    title: "Assemblage des éléments",
    shortTitle: "v0.4",
  },
  {
    key: "v0_5",
    version: "v.0.5",
    title: "P.O.C. / Alpha",
    shortTitle: "v0.5",
  },
  {
    key: "v0_6",
    version: "v.0.6",
    title: "Correction des bugs",
    shortTitle: "v0.6",
  },
  {
    key: "v0_7",
    version: "v.0.7",
    title: "Beta",
    shortTitle: "v0.7",
  },
  {
    key: "v0_8",
    version: "v.0.8",
    title: "Corrections post-beta",
    shortTitle: "v0.8",
  },
  {
    key: "v0_9",
    version: "v.0.9",
    title: "Release Candidate",
    shortTitle: "v0.9",
  },
  {
    key: "v1_0",
    version: "v.1.0",
    title: "First Public Release",
    shortTitle: "v1.0",
  },
];

export function createEmptyStage(definition) {
  return {
    version: definition.version,
    title: definition.title,
    status: "todo",
    goal: "",
    notes: "",
    deliverable: "",
    definitionOfDone: "",
    linkedBacklogIds: [],
    linkedJournalIds: [],
  };
}

export function buildDefaultStages() {
  return STAGE_DEFINITIONS.reduce((acc, definition) => {
    acc[definition.key] = createEmptyStage(definition);
    return acc;
  }, {});
}

export function ensureProjectStages(projectDoc) {
  const existingStages = projectDoc?.stages ?? {};
  const mergedStages = {};

  for (const definition of STAGE_DEFINITIONS) {
    mergedStages[definition.key] = {
      ...createEmptyStage(definition),
      ...(existingStages[definition.key] ?? {}),
      version: definition.version,
      title: definition.title,
    };
  }

  return {
    ...projectDoc,
    stages: mergedStages,
  };
}

export function getStageDefinition(stageKey) {
  return STAGE_DEFINITIONS.find((stage) => stage.key === stageKey) ?? null;
}