import { getStageDefinition } from "../constants/stages.js";

export const WORKSTREAM_STATUS = Object.freeze({
  PLANNED: "planned",
  ACTIVE: "active",
  PAUSED: "paused",
  BLOCKED: "blocked",
  COMPLETED: "completed",
});

export const WORKSTREAM_PROJECT_TYPE = Object.freeze({
  SOFTWARE: "software",
  RESEARCH: "research",
  ASSOCIATION: "association",
  PERSONAL: "personal",
});

const WORKSTREAM_TEMPLATES = Object.freeze({
  [WORKSTREAM_PROJECT_TYPE.SOFTWARE]: [
    { key: "product", fr: "Produit", en: "Product" },
    { key: "ui_ux", fr: "UI / UX", en: "UI / UX" },
    { key: "frontend", fr: "Frontend", en: "Frontend" },
    { key: "backend", fr: "Backend", en: "Backend" },
    { key: "data", fr: "Données", en: "Data" },
    { key: "quality", fr: "Qualité et tests", en: "Quality and testing" },
    { key: "deployment", fr: "Déploiement", en: "Deployment" },
  ],
  [WORKSTREAM_PROJECT_TYPE.RESEARCH]: [
    { key: "literature", fr: "État de l'art", en: "Literature review" },
    { key: "method", fr: "Méthodologie", en: "Methodology" },
    { key: "collection", fr: "Collecte des données", en: "Data collection" },
    { key: "analysis", fr: "Analyse", en: "Analysis" },
    { key: "ethics", fr: "Éthique", en: "Ethics" },
    { key: "dissemination", fr: "Diffusion", en: "Dissemination" },
  ],
  [WORKSTREAM_PROJECT_TYPE.ASSOCIATION]: [
    { key: "legal", fr: "Juridique", en: "Legal" },
    { key: "finance", fr: "Finances", en: "Finance" },
    { key: "operations", fr: "Opérations", en: "Operations" },
    { key: "communication", fr: "Communication", en: "Communication" },
    { key: "partnerships", fr: "Partenariats", en: "Partnerships" },
  ],
  [WORKSTREAM_PROJECT_TYPE.PERSONAL]: [
    { key: "planning", fr: "Planification", en: "Planning" },
    { key: "purchases", fr: "Achats", en: "Purchases" },
    { key: "production", fr: "Production", en: "Production" },
    { key: "documentation", fr: "Documentation", en: "Documentation" },
  ],
});

export class ProjectWorkstreamError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProjectWorkstreamError";
    this.code = code;
  }
}

function normalizedString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function workstreamSlug(value) {
  return normalizedString(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function normalizeWorkstreamStatus(status) {
  if (Object.values(WORKSTREAM_STATUS).includes(status)) return status;
  if (status === "in_progress") return WORKSTREAM_STATUS.ACTIVE;
  if (status === "todo") return WORKSTREAM_STATUS.PLANNED;
  if (status === "done") return WORKSTREAM_STATUS.COMPLETED;
  if (status === "archived") return WORKSTREAM_STATUS.PAUSED;

  return WORKSTREAM_STATUS.ACTIVE;
}

function normalizeWorkstreamEntry(value, index, usedIds) {
  const raw = typeof value === "string" ? { title: value } : value;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;

  const originalId = normalizedString(raw.id);
  const title =
    normalizedString(raw.title) || originalId || `Workstream ${index + 1}`;
  const baseId = originalId || `ws_${workstreamSlug(title) || "workstream"}_${index + 1}`;
  let id = baseId;
  let duplicateNumber = 2;

  while (usedIds.has(id)) {
    id = `${baseId}_${duplicateNumber}`;
    duplicateNumber += 1;
  }

  usedIds.add(id);

  const normalized = {
    ...raw,
    id,
    title,
    description: typeof raw.description === "string" ? raw.description : "",
    status: normalizeWorkstreamStatus(raw.status),
    order:
      Number.isInteger(raw.order) && raw.order >= 0 ? raw.order : index * 10,
    archived: raw.archived === true || raw.status === "archived",
  };

  for (const field of ["category", "icon", "color"]) {
    if (Object.prototype.hasOwnProperty.call(raw, field)) {
      normalized[field] = normalizedString(raw[field]) || null;
    }
  }

  return normalized;
}

export function normalizeWorkstreams(workstreams) {
  if (!Array.isArray(workstreams)) return [];

  const usedIds = new Set();

  return workstreams
    .map((workstream, index) => ({
      workstream: normalizeWorkstreamEntry(workstream, index, usedIds),
      index,
    }))
    .filter(({ workstream }) => workstream)
    .sort((left, right) => left.workstream.order - right.workstream.order || left.index - right.index)
    .map(({ workstream }) => workstream);
}

function normalizeOptionalReference(value) {
  return normalizedString(value) || null;
}

export function normalizeBacklogWorkstreamReferences(item) {
  if (!item || typeof item !== "object") return item;

  const normalized = { ...item };

  for (const field of ["workstreamId", "stageKey"]) {
    if (Object.prototype.hasOwnProperty.call(item, field)) {
      normalized[field] = normalizeOptionalReference(item[field]);
    }
  }

  return normalized;
}

export function normalizeProjectWorkstreams(projectDoc) {
  if (!projectDoc?.project) return projectDoc;

  return {
    ...projectDoc,
    workstreams: normalizeWorkstreams(projectDoc.workstreams),
    backlog: Array.isArray(projectDoc.backlog)
      ? projectDoc.backlog.map(normalizeBacklogWorkstreamReferences)
      : [],
  };
}

export function inspectProjectWorkstreamReferences(projectDoc) {
  const workstreamIds = new Set(
    normalizeWorkstreams(projectDoc?.workstreams).map(({ id }) => id)
  );
  const backlog = Array.isArray(projectDoc?.backlog) ? projectDoc.backlog : [];
  const problems = [];

  for (const item of backlog) {
    const workstreamId = normalizedString(item?.workstreamId);
    const stageKey = normalizedString(item?.stageKey);

    if (workstreamId && !workstreamIds.has(workstreamId)) {
      problems.push({
        code: "unknown_workstream",
        backlogId: item.id || null,
        workstreamId,
      });
    }

    if (stageKey && !getStageDefinition(stageKey)) {
      problems.push({
        code: "unknown_stage",
        backlogId: item.id || null,
        stageKey,
      });
    }
  }

  return problems;
}

function defaultWorkstreamIdFactory() {
  return `ws_${
    globalThis.crypto?.randomUUID?.() ||
    `${Date.now()}_${Math.floor(Math.random() * 100000)}`
  }`;
}

export function createProjectWorkstream(payload = {}, options = {}) {
  const title = normalizedString(payload.title);
  if (!title) {
    throw new ProjectWorkstreamError(
      "invalid_workstream_title",
      "A workstream requires a non-empty title."
    );
  }

  const existing = normalizeWorkstreams(options.existingWorkstreams);
  const id = normalizedString(payload.id) || normalizedString(
    (options.idFactory || defaultWorkstreamIdFactory)()
  );

  if (!id) {
    throw new ProjectWorkstreamError(
      "invalid_workstream_id",
      "A workstream requires a stable identifier."
    );
  }

  if (existing.some((workstream) => workstream.id === id)) {
    throw new ProjectWorkstreamError(
      "duplicate_workstream_id",
      `Workstream identifier ${id} already exists.`
    );
  }

  const nextOrder = existing.reduce(
    (maximum, workstream) => Math.max(maximum, workstream.order + 10),
    0
  );

  return normalizeWorkstreamEntry(
    { ...payload, id, title, order: payload.order ?? nextOrder },
    existing.length,
    new Set()
  );
}

export function suggestProjectWorkstreams(projectType, options = {}) {
  const definitions = WORKSTREAM_TEMPLATES[projectType];
  if (!definitions) return [];

  const locale = options.locale === "en" ? "en" : "fr";

  return normalizeWorkstreams(
    definitions.map((definition, index) => ({
      id: `ws_${projectType}_${definition.key}`,
      title: definition[locale],
      description: "",
      category: projectType,
      status: WORKSTREAM_STATUS.PLANNED,
      order: index * 10,
      archived: false,
    }))
  );
}
