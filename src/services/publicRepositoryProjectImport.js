import { BACKLOG_STATUS } from "../constants/backlog.js";
import { createEmptyProject } from "./projectFactory.js";
import { normalizePublicGitHubRepositoryUrl } from "./repositoryImportAnalysis.js";

function slugify(value) {
  return String(value || "project")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "") || "project";
}

function suggestedStage(analysis) {
  if (analysis.repository.archived) return "v1_0";
  if (analysis.primaryObjectives?.objectiveAnalysis.classification.kind === "formal_roadmap") {
    return "v0_2";
  }
  return "v0_1";
}

export function createPublicRepositoryImportDraft(analysis) {
  const objectiveAnalysis = analysis.primaryObjectives?.objectiveAnalysis || null;
  const objectives = objectiveAnalysis?.objectives || [];
  const rootsById = new Map(
    objectives
      .filter((objective) => objective.parentId === null && objective.childIds.length > 0)
      .map((objective) => [objective.id, objective])
  );

  function rootFor(objective) {
    let cursor = objective;
    while (cursor?.parentId) {
      const parent = objectives.find(({ id }) => id === cursor.parentId);
      if (!parent) break;
      cursor = parent;
    }
    return rootsById.get(cursor?.id) || null;
  }

  const workstreams = [...rootsById.values()].map((objective, index) => ({
    id: `ws_import_${index + 1}`,
    sourceObjectiveId: objective.id,
    title: objective.label,
    description: objective.section || "",
    status: "active",
    order: index * 10,
    archived: false,
  }));
  const workstreamByRoot = new Map(
    workstreams.map((workstream) => [workstream.sourceObjectiveId, workstream.id])
  );

  return {
    analysis,
    title: analysis.suggested.title,
    summary: analysis.suggested.summary,
    description: analysis.suggested.description || analysis.suggested.summary,
    repositoryUrl: analysis.repository.url,
    currentStage: suggestedStage(analysis),
    workstreams,
    tasks: (objectiveAnalysis?.leafObjectives || []).map((objective) => {
      const root = rootFor(objective);
      return {
        id: objective.id,
        title: objective.label,
        status: objective.completed ? BACKLOG_STATUS.DONE : BACKLOG_STATUS.OPEN,
        workstreamId: root ? workstreamByRoot.get(root.id) : null,
        provenance: { ...objective.provenance },
      };
    }),
  };
}

export function materializePublicRepositoryProject(draft, options = {}) {
  const repositoryIdentity = normalizePublicGitHubRepositoryUrl(draft.repositoryUrl);
  const project = createEmptyProject(options.ownerId || null);
  const now = new Date().toISOString();
  const workstreamIds = new Set(draft.workstreams.map(({ id }) => id));

  return {
    ...project,
    project: {
      ...project.project,
      title: String(draft.title || "").trim(),
      slug: slugify(draft.title),
      summary: String(draft.summary || "").trim(),
      description: String(draft.description || "").trim(),
      currentStage: draft.currentStage,
      updatedAt: now,
    },
    repository: {
      ...draft.analysis.repository,
      owner: repositoryIdentity.owner,
      name: repositoryIdentity.name,
      fullName: repositoryIdentity.fullName,
      url: repositoryIdentity.url,
    },
    workstreams: draft.workstreams.map((workstream) => ({
      id: workstream.id,
      title: workstream.title,
      description: workstream.description,
      status: workstream.status,
      order: workstream.order,
      archived: workstream.archived,
    })),
    backlog: draft.tasks.map((task) => ({
      id: crypto.randomUUID(),
      createdAt: now,
      title: String(task.title || "").trim(),
      description: "",
      status: task.status,
      stageKey: draft.currentStage,
      workstreamId: workstreamIds.has(task.workstreamId) ? task.workstreamId : null,
      source: {
        kind: "github_markdown_objective",
        ...task.provenance,
      },
    })),
  };
}
