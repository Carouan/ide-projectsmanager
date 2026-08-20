import { buildDefaultStages } from "../constants/stages.js";
import { DEFAULT_SETTINGS } from "../constants/settings.js";
import { buildDefaultSyncMetadata } from "./syncMetadata.js";

export const IDE_DEMO_PROJECT_ID = "demo-ide-projectsmanager";

export function createIdeDemoProject(options = {}) {
  const now = options.now || new Date().toISOString();
  const ownerId = options.ownerId || null;
  const currentStage = "v0_7";
  const activeBacklogId = "demo-ide-projectsmanager-review-repository";
  const stages = buildDefaultStages();

  stages[currentStage] = {
    ...stages[currentStage],
    status: "in_progress",
    goal: "Valider le cockpit connecté au dépôt GitHub réel.",
    notes:
      "Ce projet de démonstration utilise le même modèle que les projets locaux et peut être modifié ou supprimé normalement.",
    deliverable: "Une vue lisible de l’état du dépôt et des pull requests ouvertes.",
    definitionOfDone:
      "Le panneau Dépôt et validations affiche des données GitHub fraîches ou un état d’erreur explicite.",
    linkedBacklogIds: [activeBacklogId],
  };

  return {
    schemaVersion: "1.0",
    project: {
      id: IDE_DEMO_PROJECT_ID,
      slug: "ide-projectsmanager-demo",
      title: "IDE-projectsmanager — projet de démonstration",
      summary:
        "Découvrir l’IDE avec un projet réel relié au dépôt public de l’application.",
      description:
        "Projet de démonstration facultatif. Il permet d’explorer les étapes, le backlog, le journal et le panneau GitHub sans injecter de données personnelles dans le dépôt public.",
      status: "active",
      createdAt: now,
      updatedAt: now,
      tags: ["demo", "github", "pwa", "project-steward"],
      ownerId,
      currentStage,
    },
    stages,
    backlog: [
      {
        id: activeBacklogId,
        createdAt: now,
        title: "Examiner l’état du dépôt et les pull requests ouvertes",
        status: "open",
        priority: "high",
        source: "demo",
      },
      {
        id: "demo-ide-projectsmanager-portable-backup",
        createdAt: now,
        title: "Poursuivre la roadmap de sauvegarde portable S1",
        status: "planned",
        priority: "medium",
        source: "demo",
      },
    ],
    journal: [
      {
        id: "demo-ide-projectsmanager-created",
        createdAt: now,
        type: "note",
        title: "Projet de démonstration installé",
        content:
          "Ce projet est une copie locale et éditable incluse pour démontrer l’IDE. Son panneau GitHub lit uniquement l’état public de Carouan/ide-projectsmanager et ne modifie jamais le dépôt.",
      },
    ],
    decisions: [],
    attachments: [],
    repository: {
      provider: "github",
      fullName: "Carouan/ide-projectsmanager",
      url: "https://github.com/Carouan/ide-projectsmanager",
      defaultBranch: "main",
      visibility: "public",
      governance: "project-steward",
    },
    settings: {
      ...DEFAULT_SETTINGS,
    },
    sync: buildDefaultSyncMetadata(),
  };
}

export function installIdeDemoProject(projects, options = {}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const existingProject = safeProjects.find(
    (projectDoc) => projectDoc?.project?.id === IDE_DEMO_PROJECT_ID
  );

  if (existingProject) {
    return {
      projects: safeProjects,
      project: existingProject,
      installed: false,
    };
  }

  const demoProject = createIdeDemoProject(options);

  return {
    projects: [demoProject, ...safeProjects],
    project: demoProject,
    installed: true,
  };
}
