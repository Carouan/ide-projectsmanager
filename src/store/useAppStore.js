import { useEffect, useState } from "react";
import {
  loadPersistedProjects,
  savePersistedProjects,
  loadPersistedSettings,
  savePersistedSettings,
  loadPersistedUserProfile,
  savePersistedUserProfile,
} from "../repositories/storageRepository";
import { createEmptyProject } from "../services/projectFactory";
import { downloadJsonFile, readJsonFile } from "../services/jsonTransfer";
import {
  projectToMarkdown,
  downloadMarkdownFile,
} from "../services/markdownExport";
import { ensureProjectStages } from "../constants/stages";
import { BACKLOG_STATUS, normalizeBacklogStatus } from "../constants/backlog";
import { DEFAULT_SETTINGS } from "../constants/settings";
import {
  createAttachment,
  normalizeAttachments,
  patchAttachment,
} from "../services/attachments";
import { normalizeUserProfile } from "../services/userProfile";

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
  const normalized = ensureProjectStages(projectDoc);

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
    settings: {
      ...DEFAULT_SETTINGS,
      ...(normalized.settings || {}),
    },
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

  const { owner, ...projectWithoutLegacyOwner } = projectDoc.project;

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
  const [currentProjectId, setCurrentProjectId] = useState(null);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    let isCancelled = false;

async function hydrateStore() {
  try {
    const storedProjects = await loadPersistedProjects();
    const storedSettings = loadPersistedSettings();
    const storedUserProfile = loadPersistedUserProfile();

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
      loadPersistedUserProfile()
    );

    const fallbackSettings = {
      ...DEFAULT_SETTINGS,
      ...(loadPersistedSettings() || {}),
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
    if (!isHydrated) return;
    savePersistedProjects(projects).catch((error) => {   console.error("Failed to persist projects", error); });
  }, [projects, isHydrated]);

  useEffect(() => {
    if (!isHydrated) return;
    savePersistedSettings(settings);
  }, [settings, isHydrated]);

  useEffect(() => {
    if (!isHydrated || !userProfile) return;
    savePersistedUserProfile(userProfile);
  }, [userProfile, isHydrated]);

  function createProject() {
    const newProject = stripLegacyProjectOwner(
      withProjectOwnerId(createEmptyProject(userProfile?.id), userProfile?.id)
    );
    setProjects((prev) => [newProject, ...prev]);
    setCurrentProjectId(newProject.project.id);
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
    setProjects((prev) =>
      prev.map((p) =>
        p.project.id === projectId
          ? {
              ...p,
              project: {
                ...p.project,
                ...patch,
                updatedAt: new Date().toISOString(),
              },
            }
          : p
      )
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

        return {
          ...p,
          project: {
            ...p.project,
            updatedAt: new Date().toISOString(),
          },
          backlog: [backlogItem, ...p.backlog],
        };
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
            ? `Idée capturée depuis l'étape ${sourceStageKey}`
            : "Idée capturée sans étape source explicite",
          "Repositionnement du projet vers v0.3",
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
        decision: "Retour en v0.0 pour recadrage du besoin",
        consequences: [
          sourceStageKey
            ? `Idée capturée depuis l'étape ${sourceStageKey}`
            : "Idée capturée sans étape source explicite",
          "Repositionnement du projet vers v0.0",
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

  function exportCurrentProjectMarkdown() {
    const project = projects.find((p) => p.project.id === currentProjectId);
    if (!project) return;

    const slug = project.project.slug || project.project.title || "project";
    const safeSlug = slug.toLowerCase().replace(/\s+/g, "-");
    const markdown = projectToMarkdown(project);

    downloadMarkdownFile(`${safeSlug}.md`, markdown);
  }

  const currentProject =
    projects.find((p) => p.project.id === currentProjectId) ?? null;

  return {
    projects,
    settings,
    userProfile,
    currentProject,
    currentProjectId,
    createProject,
    createProjectFromIdea,
    openProject,
    deleteProject,
    updateProjectMeta,
    setCurrentStage,
    updateStageField,
    addBacklogItem,
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
    importProjectFromFile,
    exportCurrentProjectMarkdown,
  };
}
