import { buildDefaultStages } from "../constants/stages";
import { DEFAULT_SETTINGS } from "../constants/settings";
import { buildDefaultSyncMetadata } from "./syncMetadata";

export function createEmptyProject(ownerId = null) {
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
      ownerId,
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
    sync: buildDefaultSyncMetadata(),
  };
}