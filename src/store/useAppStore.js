import { useEffect, useState } from "react";
import {
  loadPersistedProjects,
  savePersistedProjects,
  loadPersistedSettings,
  savePersistedSettings,
  loadPersistedUserProfile,
  savePersistedUserProfile,
  loadPersistedPortableBackupDevice,
  savePersistedPortableBackupDevice,
} from "../repositories/storageRepository";
import { createEmptyProject } from "../services/projectFactory";
import { createGovernedProjectDocument } from "../services/governedProjectBootstrap";
import {
  analyzeProjectBundle,
  downloadJsonFile,
  readJsonFile,
  restoreProjectBundle as applyProjectBundleRestore,
  validateProjectBundle,
} from "../services/jsonTransfer";
import {
  projectToMarkdown,
  downloadMarkdownFile,
} from "../services/markdownExport";
import { ensureProjectStages, formatStageLabel } from "../constants/stages";
import { BACKLOG_STATUS, normalizeBacklogStatus } from "../constants/backlog";
import { DEFAULT_SETTINGS } from "../constants/settings";
import {
  createAttachment,
  normalizeAttachments,
  patchAttachment,
} from "../services/attachments";
import { normalizeUserProfile } from "../services/userProfile";
import { normalizeSyncMetadata } from "../services/syncMetadata";
import { normalizeRepositoryLink } from "../services/repositoryLink";
import {
  applyKnownPortfolioProgressMigrations,
  normalizeProjectProgress,
  normalizeProjectProgressDocument,
} from "../services/projectProgress";
import {
  createProjectWorkstream,
  normalizeProjectWorkstreams,
  suggestProjectWorkstreams,
} from "../services/projectWorkstreams";
import {
  mergeSuggestedWorkstreams,
  reorderProjectWorkstreams,
  updateBacklogWorkstreamAssignment,
  updateProjectWorkstream,
} from "../features/projects/services/workstreamPlanningModel";
import {
  IDE_DEMO_PROJECT_ID,
  installIdeDemoProject as prepareIdeDemoProjectInstall,
} from "../services/demoProject";
import {
  createManualDownloadBackupProvider,
  MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
} from "../repositories/portableBackup/manualDownloadBackupProvider";
import {
  createSelectedFolderBackupProvider,
  SELECTED_FOLDER_BACKUP_PROVIDER_ID,
} from "../repositories/portableBackup/selectedFolderBackupProvider";
import { createPortableBackupService } from "../services/portableBackupService";
import {
  acknowledgePortableBackupSnapshot,
  normalizePortableBackupDevice,
} from "../services/portableBackupSnapshots";
import {
  applyPortableBackupSnapshotDecision,
  PORTABLE_SNAPSHOT_DECISION,
  PORTABLE_SNAPSHOT_REVIEW_STATE,
  reviewPortableBackupSnapshots,
  summarizePortableBackupReview,
} from "../services/portableBackupReview";

const selectedFolderBackupProvider = createSelectedFolderBackupProvider();
const portableBackupService = createPortableBackupService({
  providers: [
    createManualDownloadBackupProvider(),
    selectedFolderBackupProvider,
  ],
  fallbackProviderId: MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
});

function newBacklogId() {
  return `b_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function newJournalId() {
  return `j_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function newDecisionId() {
  return `d_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function normalizeProject(projectDoc) {
  const normalized = normalizeProjectWorkstreams(
    normalizeProjectProgressDocument(ensureProjectStages(projectDoc))
  );

  return {
    ...normalized,
    project: {
      ...normalized.project,
      currentStage: normalized.project?.currentStage || "v0_0",
    },
    backlog: (normalized.backlog || []).map((item) => ({
      ...item,
      status: normalizeBacklogStatus(item.status),
    })),
    journal: normalized.journal || [],
    decisions: normalized.decisions || [],
    attachments: normalizeAttachments(normalized.attachments),
    repository: normalizeRepositoryLink(normalized.repository),
    settings: {
      ...DEFAULT_SETTINGS,
      ...(normalized.settings || {}),
    },
    sync: normalizeSyncMetadata(normalized.sync),
  };
}


function withProjectOwnerId(projectDoc, ownerId) {
  const normalizedProject = normalizeProject(projectDoc);
  const resolvedOwnerId = normalizedProject.project?.ownerId || ownerId || null;

  return {
    ...normalizedProject,
    project: {
      ...normalizedProject.project,
      ownerId: resolvedOwnerId,
    },
  };
}

function stripLegacyProjectOwner(projectDoc) {
  if (!projectDoc?.project) return projectDoc;

  const projectWithoutLegacyOwner = { ...projectDoc.project };
  delete projectWithoutLegacyOwner.owner;

  return {
    ...projectDoc,
    project: projectWithoutLegacyOwner,
  };
}

function uniqueIds(list) {
  return [...new Set(list.filter(Boolean))];
}

export function useAppStore() {
  const [projects, setProjects] = useState([]);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [userProfile, setUserProfile] = useState(null);
  const [backupFolderStatus, setBackupFolderStatus] = useState(null);
  const [backupDevice, setBackupDevice] = useState(null);
  const [backupSnapshotReview, setBackupSnapshotReview] = useState(null);
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isCancelled = false;

async function hydrateStore() {
  try {
    const storedProjects = await loadPersistedProjects();
    const storedSettings = await loadPersistedSettings();
    const storedUserProfile = await loadPersistedUserProfile();

    const initialUserProfile = normalizeUserProfile(storedUserProfile);

    const loaded = storedProjects.map((projectDoc) =>
      stripLegacyProjectOwner(
        withProjectOwnerId(projectDoc, initialUserProfile.id)
      )
    );

    const initialSettings = {
      ...DEFAULT_SETTINGS,
      ...(storedSettings || loaded[0]?.settings || {}),
    };

if (isCancelled) return;

setProjects(loaded);
setSettings(initialSettings);
setUserProfile(initialUserProfile);

if (loaded.length > 0) {
  setCurrentProjectId(loaded[0].project.id);
}

  } catch (error) {
    console.error("Failed to hydrate store", error);

    const fallbackUserProfile = normalizeUserProfile(
      await loadPersistedUserProfile()
    );

    const fallbackSettings = {
      ...DEFAULT_SETTINGS,
      ...((await loadPersistedSettings()) || {}),
    };

    if (isCancelled) return;
    
    setProjects([]);
    setSettings(fallbackSettings);
    setUserProfile(fallbackUserProfile);
    setCurrentProjectId(null);

  } finally {
    if (!isCancelled) {   setIsHydrated(true); }
  }
}

    hydrateStore();

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    loadPersistedPortableBackupDevice()
      .then((storedDevice) => {
        if (!isCancelled && storedDevice) {
          setBackupDevice(normalizePortableBackupDevice(storedDevice));
        }
      })
      .catch((error) => {
        console.error("Failed to inspect the local backup device", error);
      });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    let isCancelled = false;

    async function inspectBackupFolder() {
      const [status, details] = await Promise.all([
        portableBackupService.inspect(SELECTED_FOLDER_BACKUP_PROVIDER_ID),
        selectedFolderBackupProvider.connectionDetails(),
      ]);

      if (!isCancelled) {
        setBackupFolderStatus({ ...status, ...details });
      }
    }

    inspectBackupFolder().catch((error) => {
      console.error("Failed to inspect the optional backup folder", error);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    savePersistedProjects(projects).catch((error) => {   console.error("Failed to persist projects", error); });
  }, [projects, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    savePersistedSettings(settings).catch((error) => {
      console.error("Failed to persist settings", error);
    });
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !userProfile) return;
    savePersistedUserProfile(userProfile).catch((error) => {
      console.error("Failed to persist user profile", error);
    });
  }, [userProfile, isHydrated]);

  function createProject() {
    const newProject = stripLegacyProjectOwner(
      withProjectOwnerId(createEmptyProject(userProfile?.id), userProfile?.id)
    );
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.project.id);
  }

  function createGovernedProject(preparedPackage) {
    const governedProject = stripLegacyProjectOwner(
      withProjectOwnerId(
        createGovernedProjectDocument(preparedPackage, {
          ownerId: userProfile?.id || null,
        }),
        userProfile?.id
      )
    );

    setProjects((previousProjects) => [governedProject, ...previousProjects]);
    setCurrentProjectId(governedProject.project.id);

    return governedProject.project.id;
  }

  function installIdeDemoProject() {
    setProjects((previousProjects) =>
      prepareIdeDemoProjectInstall(previousProjects, {
        ownerId: userProfile?.id || null,
      }).projects
    );
    setCurrentProjectId(IDE_DEMO_PROJECT_ID);

    return IDE_DEMO_PROJECT_ID;
  }

  function createProjectFromIdea({ title, content }) {
    const newProject = stripLegacyProjectOwner(
      withProjectOwnerId(createEmptyProject(userProfile?.id), userProfile?.id)
    );

    const preparedProject = {
      ...newProject,
      project: {
        ...newProject.project,
        title: title || "Nouveau projet",
        slug: slugify(title || "nouveau-projet"),
        summary: content || "Projet créé depuis l'arbre de décision",
        description: content || "",
        updatedAt: new Date().toISOString(),
        currentStage: "v0_0",
      },
      stages: {
        ...newProject.stages,
        v0_0: {
          ...newProject.stages.v0_0,
          goal: title || "",
          notes: content || "",
        },
      },
      journal: [
        {
          id: newJournalId(),
          createdAt: new Date().toISOString(),
          type: "note",
          title: "Projet créé depuis l'arbre de décision",
          content:
            content ||
            "Création automatique d'un nouveau projet depuis une idée capturée.",
          stage: "v0_0",
          impact: "Création d'un nouveau projet",
        },
      ],
    };

    setProjects((prev) => [preparedProject, ...prev]);
    setCurrentProjectId(preparedProject.project.id);
  }

  function openProject(projectId) {
    setCurrentProjectId(projectId);
  }

  function deleteProject(projectId) {
    setProjects((prev) => prev.filter((p) => p.project.id !== projectId));
    setCurrentProjectId((prev) => (prev === projectId ? null : prev));
  }

  function updateProjectMeta(projectId, patch) {
    const normalizedPatch = Object.prototype.hasOwnProperty.call(
      patch,
      "progressPercent"
    )
      ? {
          ...patch,
          progressPercent: normalizeProjectProgress(patch.progressPercent),
        }
      : patch;

    setProjects((prev) =>
      prev.map((p) =>
        p.project.id === projectId
          ? {
              ...p,
              project: {
                ...p.project,
                ...normalizedPatch,
                updatedAt: new Date().toISOString(),
              },
            }
          : p
      )
    );
  }

  function migrateKnownPortfolioProgress() {
    setProjects((previousProjects) =>
      applyKnownPortfolioProgressMigrations(previousProjects).projects
    );
  }

  function setCurrentStage(projectId, stageKey) {
    setProjects((prev) =>
      prev.map((p) =>
        p.project.id === projectId
          ? {
              ...p,
              project: {
                ...p.project,
                currentStage: stageKey,
                updatedAt: new Date().toISOString(),
              },
            }
          : p
      )
    );
  }

  function updateStageField(projectId, stageKey, field, value) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const safeProject = normalizeProject(p);

        return {
          ...safeProject,
          project: {
            ...safeProject.project,
            updatedAt: new Date().toISOString(),
          },
          stages: {
            ...safeProject.stages,
            [stageKey]: {
              ...safeProject.stages[stageKey],
              [field]: value,
            },
          },
        };
      })
    );
  }

  function addBacklogItem(projectId, item) {
    const backlogItem = {
      id: newBacklogId(),
      createdAt: new Date().toISOString(),
      ...item,
      status: normalizeBacklogStatus(item.status),
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const preparedProject = {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          backlog: [backlogItem, ...p.backlog],
        };

        if (
          !Object.prototype.hasOwnProperty.call(backlogItem, "workstreamId") &&
          !Object.prototype.hasOwnProperty.call(backlogItem, "stageKey")
        ) {
          return preparedProject;
        }

        return updateBacklogWorkstreamAssignment(
          preparedProject,
          backlogItem.id,
          {
            workstreamId: backlogItem.workstreamId || null,
            stageKey: backlogItem.stageKey || null,
          }
        );
      })
    );

    return backlogItem;
  }

  function addJournalEntry(projectId, entry) {
    const journalEntry = {
      id: newJournalId(),
      createdAt: new Date().toISOString(),
      ...entry,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          journal: [journalEntry, ...(p.journal || [])],
        };
      })
    );

    return journalEntry;
  }

  function addDecision(projectId, decision) {
    const decisionItem = {
      id: newDecisionId(),
      date: new Date().toISOString().slice(0, 10),
      status: "accepted",
      ...decision,
    };

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          decisions: [decisionItem, ...(p.decisions || [])],
        };
      })
    );

    return decisionItem;
  }

  function addAttachment(projectId, attachment) {
    const nextAttachment = createAttachment(attachment);

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          attachments: [nextAttachment, ...(p.attachments || [])],
        };
      })
    );

    return nextAttachment;
  }

  function updateAttachment(projectId, attachmentId, patch) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const updatedAttachments = (p.attachments || []).map((attachment) =>
          attachment.id === attachmentId
            ? patchAttachment(attachment, patch)
            : attachment
        );

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          attachments: updatedAttachments,
        };
      })
    );
  }

  function removeAttachment(projectId, attachmentId) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          attachments: (p.attachments || []).filter(
            (attachment) => attachment.id !== attachmentId
          ),
        };
      })
    );
  }

  function updateDecisionStatus(projectId, decisionId, status) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          decisions: (p.decisions || []).map((decision) =>
            decision.id === decisionId ? { ...decision, status } : decision
          ),
        };
      })
    );
  }

  function linkBacklogItemToStage(projectId, stageKey, backlogItemId) {
    if (!stageKey || !backlogItemId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const safeProject = normalizeProject(p);
        const stage = safeProject.stages[stageKey];
        if (!stage) return safeProject;

        return {
          ...safeProject,
          project: {
            ...safeProject.project,
            updatedAt: new Date().toISOString(),
          },
          stages: {
            ...safeProject.stages,
            [stageKey]: {
              ...stage,
              linkedBacklogIds: uniqueIds([
                ...(stage.linkedBacklogIds || []),
                backlogItemId,
              ]),
            },
          },
        };
      })
    );
  }

  function linkJournalEntryToStage(projectId, stageKey, journalEntryId) {
    if (!stageKey || !journalEntryId) return;

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        const safeProject = normalizeProject(p);
        const stage = safeProject.stages[stageKey];
        if (!stage) return safeProject;

        return {
          ...safeProject,
          project: {
            ...safeProject.project,
            updatedAt: new Date().toISOString(),
          },
          stages: {
            ...safeProject.stages,
            [stageKey]: {
              ...stage,
              linkedJournalIds: uniqueIds([
                ...(stage.linkedJournalIds || []),
                journalEntryId,
              ]),
            },
          },
        };
      })
    );
  }


  function updateSettings(patch) {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
      ...patch,
    }));
  }

  function updateProjectSettings(projectId, patch) {
    setSettings((prev) => ({
      ...DEFAULT_SETTINGS,
      ...prev,
      ...patch,
    }));

    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          settings: {
            ...DEFAULT_SETTINGS,
            ...(p.settings || {}),
            ...patch,
          },
        };
      })
    );
  }

  function updateBacklogItemStatus(projectId, itemId, status) {
    setProjects((prev) =>
      prev.map((p) => {
        if (p.project.id !== projectId) return p;

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          backlog: p.backlog.map((item) =>
            item.id === itemId
              ? { ...item, status: normalizeBacklogStatus(status) }
              : item
          ),
        };
      })
    );
  }

  function modifyProjectWorkstreams(projectId, transform) {
    setProjects((previousProjects) =>
      previousProjects.map((projectDoc) => {
        if (projectDoc.project.id !== projectId) return projectDoc;

        return {
          ...projectDoc,
          project: {
            ...projectDoc.project,
            updatedAt: new Date().toISOString(),
          },
          workstreams: transform(projectDoc.workstreams || []),
        };
      })
    );
  }

  function addWorkstream(projectId, payload) {
    modifyProjectWorkstreams(projectId, (workstreams) => [
      ...workstreams,
      createProjectWorkstream(payload, { existingWorkstreams: workstreams }),
    ]);
  }

  function updateWorkstream(projectId, workstreamId, patch) {
    modifyProjectWorkstreams(projectId, (workstreams) =>
      updateProjectWorkstream(workstreams, workstreamId, patch)
    );
  }

  function reorderWorkstream(projectId, workstreamId, direction) {
    modifyProjectWorkstreams(projectId, (workstreams) =>
      reorderProjectWorkstreams(workstreams, workstreamId, direction)
    );
  }

  function applyWorkstreamTemplate(projectId, projectType, locale) {
    modifyProjectWorkstreams(projectId, (workstreams) =>
      mergeSuggestedWorkstreams(
        workstreams,
        suggestProjectWorkstreams(projectType, { locale })
      )
    );
  }

  function updateBacklogItemWorkstream(projectId, itemId, patch) {
    setProjects((previousProjects) =>
      previousProjects.map((projectDoc) => {
        if (projectDoc.project.id !== projectId) return projectDoc;

        const updatedProject = updateBacklogWorkstreamAssignment(
          projectDoc,
          itemId,
          patch
        );

        return {
          ...updatedProject,
          project: {
            ...updatedProject.project,
            updatedAt: new Date().toISOString(),
          },
        };
      })
    );
  }

  function handleDecisionTreeDestination(projectId, payload) {
    const { destinationKey, ideaTitle, ideaContent, sourceStageKey } = payload;

    if (destinationKey === "newproject") {
      createProjectFromIdea({
        title: ideaTitle,
        content: ideaContent,
      });
      return;
    }

    if (destinationKey === "backlog") {
      const item = addBacklogItem(projectId, {
        title: ideaTitle,
        description: ideaContent,
        status: BACKLOG_STATUS.OPEN,
        type: "idea",
        relatedStage: sourceStageKey || null,
      });

      if (sourceStageKey) {
        linkBacklogItemToStage(projectId, sourceStageKey, item.id);
      }
      return;
    }

    if (destinationKey === "technote") {
      const item = addBacklogItem(projectId, {
        title: ideaTitle,
        description: ideaContent,
        status: BACKLOG_STATUS.OPEN,
        type: "tech",
        relatedStage: sourceStageKey || null,
      });

      if (sourceStageKey) {
        linkBacklogItemToStage(projectId, sourceStageKey, item.id);
      }

      const entry = addJournalEntry(projectId, {
        type: "note",
        title: "Idée classée en note technique future",
        content: `Idée : ${ideaTitle}\n\n${ideaContent}`,
        stage: sourceStageKey || "v1_0",
        impact: "Report technique / refactoring futur",
      });

      if (sourceStageKey) {
        linkJournalEntryToStage(projectId, sourceStageKey, entry.id);
      }
      return;
    }

    if (destinationKey === "archi") {
      const entry = addJournalEntry(projectId, {
        type: "decision",
        title: ideaTitle,
        content: ideaContent || "Idée architecturale à évaluer.",
        stage: sourceStageKey || "v0_3",
        impact: "Réévaluation potentielle de l'architecture",
      });

      if (sourceStageKey) {
        linkJournalEntryToStage(projectId, sourceStageKey, entry.id);
      }

      addDecision(projectId, {
        title: ideaTitle,
        context:
          ideaContent || "Décision architecturale issue de l'arbre de décision.",
        decision: "Décision architecturale à évaluer / arbitrer",
        consequences: [
          sourceStageKey
            ? `Idée capturée depuis l'étape ${formatStageLabel(sourceStageKey)}`
            : "Idée capturée sans étape source explicite",
          `Repositionnement du projet vers ${formatStageLabel("v0_3")}`,
        ],
        stage: sourceStageKey || "v0_3",
      });

      setCurrentStage(projectId, "v0_3");
      return;
    }

    if (destinationKey === "reframe") {
      const entry = addJournalEntry(projectId, {
        type: "decision",
        title: ideaTitle,
        content: ideaContent || "Le besoin initial doit être recadré.",
        stage: sourceStageKey || "v0_0",
        impact: "Retour à la clarification du besoin",
      });

      if (sourceStageKey) {
        linkJournalEntryToStage(projectId, sourceStageKey, entry.id);
      }

      addDecision(projectId, {
        title: ideaTitle,
        context: ideaContent || "Le besoin initial doit être redéfini.",
        decision: `Retour en ${formatStageLabel("v0_0")} pour recadrage du besoin`,
        consequences: [
          sourceStageKey
            ? `Idée capturée depuis l'étape ${formatStageLabel(sourceStageKey)}`
            : "Idée capturée sans étape source explicite",
          `Repositionnement du projet vers ${formatStageLabel("v0_0")}`,
        ],
        stage: sourceStageKey || "v0_0",
      });

      setCurrentStage(projectId, "v0_0");
    }
  }

  function exportCurrentProjectJson() {
    const project = projects.find((p) => p.project.id === currentProjectId);
    if (!project) return;

    const slug = project.project.slug || project.project.title || "project";
    const safeSlug = slug.toLowerCase().replace(/\s+/g, "-");

    downloadJsonFile(`${safeSlug}.json`, project);
  }

  async function exportAllProjectsJson() {
    if (projects.length === 0) return;

    const exportedAt = new Date().toISOString();
    const date = exportedAt.slice(0, 10);
    return portableBackupService.writeFallbackSnapshot(projects, {
      exportedAt,
      filename: `ide-projectsmanager-backup-${date}.json`,
    });
  }

  async function inspectProjectBundleFile(file) {
    const { bundle: rawBundle } =
      await portableBackupService.readPortfolioSnapshot(
        MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
        { file }
      );
    const normalizedBundle = {
      ...rawBundle,
      projects: rawBundle.projects.map((projectDoc) =>
        stripLegacyProjectOwner(
          withProjectOwnerId(projectDoc, userProfile?.id)
        )
      ),
    };

    return analyzeProjectBundle(normalizedBundle, projects);
  }

  async function refreshBackupFolderStatus() {
    const [status, details] = await Promise.all([
      portableBackupService.inspect(SELECTED_FOLDER_BACKUP_PROVIDER_ID),
      selectedFolderBackupProvider.connectionDetails(),
    ]);
    const nextStatus = { ...status, ...details };
    setBackupFolderStatus(nextStatus);
    return nextStatus;
  }

  async function connectBackupFolder() {
    try {
      await selectedFolderBackupProvider.connect();
      await ensureBackupDevice();
    } finally {
      await refreshBackupFolderStatus();
    }
  }

  async function reauthorizeBackupFolder() {
    try {
      await selectedFolderBackupProvider.reauthorize();
    } finally {
      await refreshBackupFolderStatus();
    }
  }

  async function disconnectBackupFolder() {
    try {
      await selectedFolderBackupProvider.disconnect();
      setBackupSnapshotReview(null);
    } finally {
      await refreshBackupFolderStatus();
    }
  }

  async function exportAllProjectsToBackupFolder() {
    if (projects.length === 0) return null;

    try {
      const device = await ensureBackupDevice();
      const { result, snapshot } = await portableBackupService.writeDevicePortfolioSnapshot(
        SELECTED_FOLDER_BACKUP_PROVIDER_ID,
        projects,
        {
          device,
          parentSnapshotId: device.lastSnapshotId,
        }
      );
      const updatedDevice = {
        ...device,
        lastSnapshotId: snapshot.snapshotId,
      };
      await savePersistedPortableBackupDevice(updatedDevice);
      setBackupDevice(updatedDevice);
      return result;
    } finally {
      await refreshBackupFolderStatus();
    }
  }

  async function ensureBackupDevice() {
    if (backupDevice) return backupDevice;

    const storedDevice = await loadPersistedPortableBackupDevice();
    const device = normalizePortableBackupDevice(storedDevice);
    await savePersistedPortableBackupDevice(device);
    setBackupDevice(device);
    return device;
  }

  async function inspectBackupSnapshots() {
    try {
      const device = await ensureBackupDevice();
      const listed = await portableBackupService.listSnapshots(
        SELECTED_FOLDER_BACKUP_PROVIDER_ID
      );
      const externalSnapshots = [];
      const unreadable = [];
      let localSnapshot = null;

      for (const entry of listed) {
        if (entry.unreadable) {
          unreadable.push(entry);
          continue;
        }

        if (!entry.snapshotId || !entry.deviceId) continue;

        try {
          const snapshot = await portableBackupService.readPortfolioSnapshot(
            SELECTED_FOLDER_BACKUP_PROVIDER_ID,
            entry.reference
          );

          if (entry.deviceId === device.id) {
            localSnapshot = snapshot.snapshot;
          } else {
            externalSnapshots.push({
              reference: entry.reference,
              snapshot: snapshot.snapshot,
            });
          }
        } catch (error) {
          unreadable.push({
            ...entry,
            unreadable: true,
            errorCode: error?.code || "invalid_snapshot",
          });
        }
      }

      const review = reviewPortableBackupSnapshots({
        localDevice: device,
        localProjects: projects,
        localSnapshot,
        externalSnapshots,
        unreadable,
      });
      setBackupSnapshotReview(review);
      return review;
    } catch (error) {
      setBackupSnapshotReview({
        state: PORTABLE_SNAPSHOT_REVIEW_STATE.PERMISSION_ERROR,
        candidates: [],
        unreadable: [],
        errorCode: error?.code || "unknown",
      });
      await refreshBackupFolderStatus();
      throw error;
    }
  }

  async function resolveBackupSnapshot(candidate, action, options = {}) {
    const snapshot = {
      ...candidate.snapshot,
      bundle: {
        ...candidate.snapshot.bundle,
        projects: candidate.snapshot.bundle.projects.map((projectDoc) =>
          stripLegacyProjectOwner(
            withProjectOwnerId(projectDoc, userProfile?.id)
          )
        ),
      },
    };
    const result = applyPortableBackupSnapshotDecision(
      { ...candidate, snapshot },
      projects,
      action,
      options
    );

    if (action !== PORTABLE_SNAPSHOT_DECISION.IGNORE) {
      const currentDevice = await ensureBackupDevice();
      let updatedDevice = acknowledgePortableBackupSnapshot(
        currentDevice,
        snapshot.snapshotId
      );

      if (action === PORTABLE_SNAPSHOT_DECISION.RESTORE) {
        updatedDevice = {
          ...updatedDevice,
          lastSnapshotId: snapshot.snapshotId,
        };
      }

      await savePersistedPortableBackupDevice(updatedDevice);
      setBackupDevice(updatedDevice);
    }

    if (
      action === PORTABLE_SNAPSHOT_DECISION.RESTORE ||
      action === PORTABLE_SNAPSHOT_DECISION.COPY
    ) {
      setProjects(result.projects);

      if (!result.projects.some((project) => project.project.id === currentProjectId)) {
        setCurrentProjectId(result.projects[0]?.project?.id || null);
      }
    }

    setBackupSnapshotReview((previous) => {
      if (!previous) return previous;

      const candidates = previous.candidates.filter((entry) =>
        entry.snapshotId !== snapshot.snapshotId
      );
      return {
        ...previous,
        candidates,
        state: summarizePortableBackupReview(candidates, previous.unreadable),
      };
    });

    return result.summary;
  }

  function restoreProjectsFromBundle(inspection, conflictStrategy) {
    if (!inspection?.bundle) {
      validateProjectBundle(null);
    }

    const result = applyProjectBundleRestore(inspection.bundle, projects, {
      conflictStrategy,
    });

    setProjects(result.projects);

    if (!currentProjectId && result.importedProjectIds.length > 0) {
      setCurrentProjectId(result.importedProjectIds[0]);
    }

    return result.summary;
  }

  async function importProjectFromFile(file) {
    const importedProject = stripLegacyProjectOwner(
      withProjectOwnerId(await readJsonFile(file), userProfile?.id)
    );

    if (!importedProject?.project?.id) {
      throw new Error("Le fichier importé ne contient pas de projet valide.");
    }

    const importedId = importedProject.project.id;

    setProjects((prev) => {
      const filtered = prev.filter((p) => p.project.id !== importedId);

      return [
        {
          ...importedProject,
          project: {
            ...importedProject.project,
            updatedAt: new Date().toISOString(),
          },
        },
        ...filtered,
      ];
    });

    setCurrentProjectId(importedId);
  }

  function exportCurrentProjectMarkdown(repositoryResult = null) {
    const project = projects.find((p) => p.project.id === currentProjectId);
    if (!project) return;

    const slug = project.project.slug || project.project.title || "project";
    const safeSlug = slug.toLowerCase().replace(/\s+/g, "-");
    const markdown = projectToMarkdown(project, {
      locale: settings?.language,
      repositoryResult,
    });

    downloadMarkdownFile(`${safeSlug}.md`, markdown);
  }

  const currentProject =
    projects.find((p) => p.project.id === currentProjectId) ?? null;

  return {
    projects,
    settings,
    userProfile,
    backupFolderStatus,
    backupDevice,
    backupSnapshotReview,
    currentProject,
    currentProjectId,
    createProject,
    createGovernedProject,
    installIdeDemoProject,
    createProjectFromIdea,
    openProject,
    deleteProject,
    updateProjectMeta,
    migrateKnownPortfolioProgress,
    setCurrentStage,
    updateStageField,
    addBacklogItem,
    addWorkstream,
    updateWorkstream,
    reorderWorkstream,
    applyWorkstreamTemplate,
    updateBacklogItemWorkstream,
    addJournalEntry,
    addDecision,
    addAttachment,
    updateAttachment,
    removeAttachment,
    updateDecisionStatus,
    linkBacklogItemToStage,
    linkJournalEntryToStage,
    handleDecisionTreeDestination,
    updateSettings,
    updateProjectSettings,
    updateBacklogItemStatus,
    exportCurrentProjectJson,
    exportAllProjectsJson,
    connectBackupFolder,
    reauthorizeBackupFolder,
    disconnectBackupFolder,
    exportAllProjectsToBackupFolder,
    inspectBackupSnapshots,
    resolveBackupSnapshot,
    inspectProjectBundleFile,
    restoreProjectsFromBundle,
    importProjectFromFile,
    exportCurrentProjectMarkdown,
  };
}
