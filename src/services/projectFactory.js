import { buildDefaultStages } from "../constants/stages";
import { DEFAULT_SETTINGS } from "../constants/settings";

export function createEmptyProject() {
  const now = new Date().toISOString();

  return {
    schemaVersion: "1.0",
    project: {
      id: crypto.randomUUID(),
      slug: "nouveau-projet",
      title: "Nouveau projet",
      summary: "Résumé à compléter",
      description: "",
      status: "active",
      createdAt: now,
      updatedAt: now,
      tags: [],
      owner: "Sébastien",
      currentStage: "v0_0",
    },
    stages: buildDefaultStages(),
    backlog: [],
    journal: [],
    decisions: [],
    attachments: [],
    settings: {
      ...DEFAULT_SETTINGS,
    },
  };
}