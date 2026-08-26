import { createAttachment } from "./attachments.js";
import { createEmptyProject } from "./projectFactory.js";
import { normalizeRepositoryLink } from "./repositoryLink.js";

export const GOVERNED_PROJECT_PACKAGE_FORMAT =
  "ide-projectsmanager.governed-project-bootstrap";
export const GOVERNED_PROJECT_PACKAGE_VERSION = 1;
export const GOVERNED_PROJECT_TEMPLATE_REPOSITORY = "Carouan/ai-project-template";
export const GOVERNED_PROJECT_STEWARD_REPOSITORY = "Carouan/ai-project-steward";
export const GOVERNED_PROJECT_REQUIRED_FILES = Object.freeze([
  "PROJECT_MANDATE.md",
  "PROJECT_CONTEXT.md",
  "PROJECT_STATUS.md",
  ".project-steward.yml",
  "README.md",
]);

const REPOSITORY_NAME = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,38})\/[a-zA-Z0-9_.-]+$/u;

export class GovernedProjectBootstrapError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GovernedProjectBootstrapError";
    this.code = code;
  }
}

function bootstrapError(code, message) {
  return new GovernedProjectBootstrapError(code, message);
}

function trimmed(value) {
  return typeof value === "string" ? value.trim() : "";
}

function requiredText(value, code, message) {
  const text = trimmed(value);
  if (!text) throw bootstrapError(code, message);
  return text;
}

function explicitLines(value) {
  const lines = Array.isArray(value) ? value : String(value || "").split(/\r?\n/u);
  return lines.map((line) => trimmed(line).replace(/^[-*]\s+/u, "")).filter(Boolean);
}

function renderList(lines, empty = "Non renseigné — à préciser.") {
  return (lines.length > 0 ? lines : [empty]).map((line) => `- ${line}`).join("\n");
}

function yamlString(value) {
  return JSON.stringify(String(value));
}

export function normalizeGovernedRepositoryName(value) {
  let input = trimmed(value);

  if (/^https?:\/\//iu.test(input)) {
    let url;
    try {
      url = new URL(input);
    } catch {
      throw bootstrapError("invalid_repository", "The canonical GitHub repository is invalid.");
    }

    if (
      url.origin.toLowerCase() !== "https://github.com" ||
      url.username ||
      url.password ||
      url.search ||
      url.hash
    ) {
      throw bootstrapError("invalid_repository", "Use a canonical HTTPS GitHub repository.");
    }

    input = url.pathname.replace(/^\/+|\/+$/gu, "").replace(/\.git$/u, "");
  }

  if (!REPOSITORY_NAME.test(input) || input.includes("..")) {
    throw bootstrapError("invalid_repository", "Use an explicit GitHub owner/repository name.");
  }

  return input;
}

export function createGovernedProjectId(options = {}) {
  const randomUUID = options.randomUUID || globalThis.crypto?.randomUUID;
  if (typeof randomUUID === "function") return randomUUID.call(globalThis.crypto);

  return `project_${Date.now().toString(36)}_${Math.floor(
    Math.random() * 1_000_000_000
  ).toString(36)}`;
}

function validateProjectId(value) {
  const projectId = trimmed(value);
  if (!/^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,127}$/u.test(projectId)) {
    throw bootstrapError("invalid_project_id", "The governed project needs a stable explicit identifier.");
  }
  return projectId;
}

function normalizedDraft(input = {}, options = {}) {
  const title = requiredText(input.title, "missing_title", "A project title is required.");
  const objective = requiredText(
    input.objective,
    "missing_objective",
    "An explicit project objective is required."
  );
  const context = requiredText(
    input.context,
    "missing_context",
    "Explicit project context is required."
  );
  const deliverables = explicitLines(input.deliverables);
  const successCriteria = explicitLines(input.successCriteria);

  if (deliverables.length === 0) {
    throw bootstrapError("missing_deliverables", "At least one explicit deliverable is required.");
  }
  if (successCriteria.length === 0) {
    throw bootstrapError("missing_success_criteria", "At least one explicit success criterion is required.");
  }

  const repositoryFullName = normalizeGovernedRepositoryName(input.repositoryFullName);
  const visibility = ["public", "private", "internal"].includes(input.visibility)
    ? input.visibility
    : "private";
  const createdAt = options.createdAt || input.createdAt || new Date().toISOString();

  if (typeof createdAt !== "string" || Number.isNaN(Date.parse(createdAt))) {
    throw bootstrapError("invalid_created_at", "The governed project creation date is invalid.");
  }

  return {
    projectId: validateProjectId(options.projectId || input.projectId),
    title,
    objective,
    context,
    deliverables,
    successCriteria,
    includedScope: explicitLines(input.includedScope),
    excludedScope: explicitLines(input.excludedScope),
    constraints: trimmed(input.constraints),
    repositoryFullName,
    visibility,
    createdAt,
  };
}

function renderMandate(draft) {
  return `# Project Mandate\n\n## Objective\n\n${draft.objective}\n\n## Problem to solve\n\n${draft.context}\n\n## Expected deliverables\n\n${renderList(draft.deliverables)}\n\n## Success criteria\n\n${renderList(draft.successCriteria)}\n\n## Scope boundaries\n\n### Must include\n\n${renderList(draft.includedScope)}\n\n### Must not include\n\n${renderList(draft.excludedScope)}\n\n## Domain-specific requirements\n\n${draft.constraints || "Non renseigné — à préciser avant toute décision engageante."}\n\n## Sources and inputs initially provided\n\n- Mandat et contexte explicitement renseignés dans IDE-projectsmanager.\n\n## Desired phases / milestones\n\n1. Valider le mandat, le contexte et les premiers critères de réussite.\n\n## Initial questions to resolve\n\n- Identifier les informations manquantes avant la première itération gouvernée.\n\n## Owner instructions\n\n- Préserver les objectifs, contraintes et décisions explicites du mandat.\n`;
}

function renderContext(draft) {
  return `# Contexte du projet\n\n## Objectif\n\n${draft.objective}\n\n## Contexte explicite\n\n${draft.context}\n\n## Périmètre\n\n### Inclus\n\n${renderList(draft.includedScope)}\n\n### Hors périmètre\n\n${renderList(draft.excludedScope)}\n\n## Contraintes\n\n${draft.constraints || "Non renseignées — à préciser."}\n\n## Identité stable\n\n- Identifiant projet : \`${draft.projectId}\`.\n- Dépôt canonique prévu : \`${draft.repositoryFullName}\`.\n- Visibilité déclarée : \`${draft.visibility}\`.\n- Dépôt modèle : \`${GOVERNED_PROJECT_TEMPLATE_REPOSITORY}\`.\n\n## Gouvernance\n\nLe dépôt canonique constitue la source de vérité une fois créé. La méthode de\ngouvernance est définie exclusivement par \`${GOVERNED_PROJECT_STEWARD_REPOSITORY}\` ;\nelle n'est pas recopiée dans ces fichiers.\n\n## Mandat spécifique du projet\n\nVoir \`PROJECT_MANDATE.md\`.\n`;
}

function renderStatus(draft) {
  const date = draft.createdAt.slice(0, 10);
  return `# Project Status\n\nLast updated: ${date}\nCurrent phase: Bootstrap\nCurrent milestone: Validate mandate and repository preparation\nOverall state: Prepared locally; repository existence not verified\n\n## Confirmed\n\n- Mandate, context and success criteria were explicitly provided.\n- Project identifier: \`${draft.projectId}\`.\n- Intended canonical repository: \`${draft.repositoryFullName}\`.\n\n## Working hypotheses\n\n- Repository creation and visibility remain subject to explicit human action.\n\n## Open questions\n\n- Has the canonical repository already been created and populated?\n- Which first milestone should be prioritized?\n\n## Current priority\n\nReview the generated files before creating or populating the canonical repository.\n\n## Blockers\n\n- Repository creation or publication has not been verified by IDE-projectsmanager.\n\n## Decisions awaiting owner input\n\n- Confirm the canonical repository and its declared visibility before publication.\n\n## Next actions\n\n1. Review \`PROJECT_MANDATE.md\` and \`PROJECT_CONTEXT.md\`.\n2. Create or explicitly select the intended canonical repository.\n3. Add the reviewed files and activate Project Steward separately.\n4. Start the first governed iteration.\n\n## Most relevant files\n\n- \`PROJECT_MANDATE.md\`\n- \`PROJECT_CONTEXT.md\`\n- \`.project-steward.yml\`\n`;
}

function renderStewardManifest(draft) {
  return `project_steward:\n  methodology_repository: ${yamlString(GOVERNED_PROJECT_STEWARD_REPOSITORY)}\n  skill_file: "SKILL.md"\n  language_policy_file: "LANGUAGE_POLICY.md"\n  version: "v1-draft"\n  canonical_repository_is_source_of_truth: true\n  executive_summary_max_words: 800\n  decision_record_prefix: "DR"\n  handoff_file: ".project/HANDOFF.md"\n  language:\n    human_facing_default: "fr"\n    technical_default: "en"\n\n  dashboard:\n    contract_version: "1"\n    enabled: true\n    project_id: ${yamlString(draft.projectId)}\n    canonical_repository:\n      provider: "github"\n      full_name: ${yamlString(draft.repositoryFullName)}\n      url: ${yamlString(`https://github.com/${draft.repositoryFullName}`)}\n      default_branch: "main"\n      visibility: ${yamlString(draft.visibility)}\n    executive_status_file: "PROJECT_STATUS.md"\n`;
}

function renderReadme(draft) {
  return `# ${draft.title}\n\n${draft.objective}\n\n## Contexte\n\n${draft.context}\n\n## Livrables attendus\n\n${renderList(draft.deliverables)}\n\n## Critères de réussite\n\n${renderList(draft.successCriteria)}\n\n## Gouvernance\n\n- Dépôt canonique prévu : \`${draft.repositoryFullName}\`.\n- Identifiant projet stable : \`${draft.projectId}\`.\n- Template : https://github.com/${GOVERNED_PROJECT_TEMPLATE_REPOSITORY}\n- Méthodologie Project Steward : https://github.com/${GOVERNED_PROJECT_STEWARD_REPOSITORY}\n\nLa création du dépôt et la publication des fichiers restent des actions humaines\nexplicites. Aucun dépôt n'est créé automatiquement par IDE-projectsmanager.\n`;
}

export function createGovernedProjectPackage(input = {}, options = {}) {
  const draft = normalizedDraft(input, options);

  return {
    format: GOVERNED_PROJECT_PACKAGE_FORMAT,
    version: GOVERNED_PROJECT_PACKAGE_VERSION,
    createdAt: draft.createdAt,
    projectId: draft.projectId,
    title: draft.title,
    objective: draft.objective,
    context: draft.context,
    deliverables: draft.deliverables,
    successCriteria: draft.successCriteria,
    includedScope: draft.includedScope,
    excludedScope: draft.excludedScope,
    constraints: draft.constraints,
    repository: {
      provider: "github",
      fullName: draft.repositoryFullName,
      url: `https://github.com/${draft.repositoryFullName}`,
      defaultBranch: "main",
      visibility: draft.visibility,
      governance: `${GOVERNED_PROJECT_STEWARD_REPOSITORY}@v1-draft`,
      externalProjectId: draft.projectId,
      provisioningState: "planned",
    },
    files: [
      { path: "PROJECT_MANDATE.md", content: renderMandate(draft) },
      { path: "PROJECT_CONTEXT.md", content: renderContext(draft) },
      { path: "PROJECT_STATUS.md", content: renderStatus(draft) },
      { path: ".project-steward.yml", content: renderStewardManifest(draft) },
      { path: "README.md", content: renderReadme(draft) },
    ],
  };
}

export function validateGovernedProjectPackage(value) {
  if (!value || value.format !== GOVERNED_PROJECT_PACKAGE_FORMAT) {
    throw bootstrapError("invalid_package", "The governed project package is invalid.");
  }
  if (value.version !== GOVERNED_PROJECT_PACKAGE_VERSION) {
    throw bootstrapError("unsupported_package_version", "The governed project package version is unsupported.");
  }

  const reconstructed = createGovernedProjectPackage({
    ...value,
    repositoryFullName: value.repository?.fullName,
    visibility: value.repository?.visibility,
    projectId: value.projectId,
    createdAt: value.createdAt,
  });

  if (
    JSON.stringify(value.repository) !== JSON.stringify(reconstructed.repository) ||
    JSON.stringify(value.files) !== JSON.stringify(reconstructed.files)
  ) {
    throw bootstrapError("inconsistent_package", "The generated files and canonical repository do not describe the same project.");
  }

  return reconstructed;
}

function slugify(value) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/gu, "")
    .toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-+|-+$/gu, "") || "governed-project";
}

export function createGovernedProjectDocument(value, options = {}) {
  const prepared = validateGovernedProjectPackage(value);
  const project = createEmptyProject(options.ownerId || null);
  const now = prepared.createdAt;

  return {
    ...project,
    project: {
      ...project.project,
      id: prepared.projectId,
      slug: slugify(prepared.title),
      title: prepared.title,
      summary: prepared.objective,
      description: prepared.context,
      tags: ["project-steward", "governed"],
      createdAt: now,
      updatedAt: now,
    },
    stages: {
      ...project.stages,
      v0_0: {
        ...project.stages.v0_0,
        status: "in_progress",
        goal: prepared.objective,
        notes: prepared.context,
        deliverable: prepared.deliverables.join("\n"),
        definitionOfDone: prepared.successCriteria.join("\n"),
      },
    },
    repository: normalizeRepositoryLink(prepared.repository),
    attachments: prepared.files.map((file) => createAttachment({
      type: "snippet",
      title: file.path,
      fileName: file.path,
      description: "Repository-ready governed project file; review before publishing.",
      content: file.content,
      createdAt: now,
    })),
    journal: [{
      id: `governed-bootstrap-${prepared.projectId}`,
      createdAt: now,
      type: "note",
      title: "Governed project prepared locally",
      content: `Canonical repository explicitly declared: ${prepared.repository.fullName}. No repository was created automatically.`,
      stage: "v0_0",
    }],
  };
}
