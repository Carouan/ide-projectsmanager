export const PROJECT_BUNDLE_FORMAT = "ide-projectsmanager.project-bundle";
export const PROJECT_BUNDLE_VERSION = 1;
export const PROJECT_BUNDLE_CONFLICT_STRATEGY = {
  SKIP: "skip",
  COPY: "copy",
};

export class ProjectBundleError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProjectBundleError";
    this.code = code;
  }
}

function bundleError(code, message) {
  return new ProjectBundleError(code, message);
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}

function defaultCopyIdFactory(originalId) {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.floor(Math.random() * 100000)}`;

  return `${originalId}-copy-${suffix}`;
}

function createUniqueCopyId(originalId, usedIds, idFactory) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const candidate = String(idFactory(originalId, attempt) || "").trim();

    if (candidate && !usedIds.has(candidate)) {
      return candidate;
    }
  }

  throw bundleError(
    "copy_id_generation_failed",
    "Impossible de générer un identifiant unique pour une copie importée."
  );
}

export function createProjectBundle(projects, options = {}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const exportedAt = options.exportedAt || new Date().toISOString();

  return {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    exportedAt,
    projectCount: safeProjects.length,
    projects: safeProjects,
  };
}

export function validateProjectBundle(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw bundleError("invalid_bundle", "La sauvegarde globale est invalide.");
  }

  if (value.format !== PROJECT_BUNDLE_FORMAT) {
    throw bundleError(
      "unsupported_format",
      "Le fichier ne correspond pas au format de sauvegarde globale attendu."
    );
  }

  if (value.version !== PROJECT_BUNDLE_VERSION) {
    throw bundleError(
      "unsupported_version",
      "Cette version de sauvegarde globale n'est pas prise en charge."
    );
  }

  if (
    typeof value.exportedAt !== "string"
    || Number.isNaN(Date.parse(value.exportedAt))
  ) {
    throw bundleError(
      "invalid_export_date",
      "La date d'export de la sauvegarde globale est invalide."
    );
  }

  if (!Array.isArray(value.projects)) {
    throw bundleError(
      "invalid_projects",
      "La sauvegarde globale ne contient pas de liste de projets valide."
    );
  }

  if (
    !Number.isInteger(value.projectCount)
    || value.projectCount < 0
    || value.projectCount !== value.projects.length
  ) {
    throw bundleError(
      "invalid_project_count",
      "Le nombre de projets déclaré ne correspond pas au contenu de la sauvegarde."
    );
  }

  const projectIds = new Set();

  value.projects.forEach((projectDoc, index) => {
    const projectId = projectDoc?.project?.id;

    if (typeof projectId !== "string" || !projectId.trim()) {
      throw bundleError(
        "invalid_project",
        `Le projet à la position ${index + 1} ne possède pas d'identifiant valide.`
      );
    }

    if (projectIds.has(projectId)) {
      throw bundleError(
        "duplicate_project_id",
        `L'identifiant de projet ${projectId} apparaît plusieurs fois dans la sauvegarde.`
      );
    }

    projectIds.add(projectId);
  });

  return value;
}

export function analyzeProjectBundle(bundle, existingProjects = []) {
  const validatedBundle = validateProjectBundle(bundle);
  const existingIds = new Set(
    (Array.isArray(existingProjects) ? existingProjects : [])
      .map((projectDoc) => projectDoc?.project?.id)
      .filter(Boolean)
  );
  const newProjectIds = [];
  const conflictingProjectIds = [];

  validatedBundle.projects.forEach((projectDoc) => {
    const projectId = projectDoc.project.id;

    if (existingIds.has(projectId)) {
      conflictingProjectIds.push(projectId);
    } else {
      newProjectIds.push(projectId);
    }
  });

  return {
    bundle: validatedBundle,
    projectCount: validatedBundle.projects.length,
    newCount: newProjectIds.length,
    conflictCount: conflictingProjectIds.length,
    newProjectIds,
    conflictingProjectIds,
  };
}

export function restoreProjectBundle(bundle, existingProjects = [], options = {}) {
  const analysis = analyzeProjectBundle(bundle, existingProjects);
  const conflictStrategy = options.conflictStrategy
    || PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP;

  if (!Object.values(PROJECT_BUNDLE_CONFLICT_STRATEGY).includes(conflictStrategy)) {
    throw bundleError(
      "invalid_conflict_strategy",
      "La stratégie choisie pour les conflits n'est pas valide."
    );
  }

  const safeExistingProjects = Array.isArray(existingProjects)
    ? existingProjects
    : [];
  const usedIds = new Set(
    safeExistingProjects
      .map((projectDoc) => projectDoc?.project?.id)
      .filter(Boolean)
  );
  const idFactory = options.idFactory || defaultCopyIdFactory;
  const now = options.now || new Date().toISOString();
  const importedProjects = [];
  const importedProjectIds = [];
  let addedCount = 0;
  let copiedCount = 0;
  let skippedCount = 0;

  analysis.bundle.projects.forEach((projectDoc) => {
    const projectId = projectDoc.project.id;

    if (!usedIds.has(projectId)) {
      const importedProject = cloneJson(projectDoc);
      importedProjects.push(importedProject);
      importedProjectIds.push(projectId);
      usedIds.add(projectId);
      addedCount += 1;
      return;
    }

    if (conflictStrategy === PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP) {
      skippedCount += 1;
      return;
    }

    const copyId = createUniqueCopyId(projectId, usedIds, idFactory);
    const copiedProject = cloneJson(projectDoc);
    const baseSlug = copiedProject.project.slug || copiedProject.project.title || "project";

    copiedProject.project = {
      ...copiedProject.project,
      id: copyId,
      slug: `${baseSlug}-copy`,
      updatedAt: now,
    };

    importedProjects.push(copiedProject);
    importedProjectIds.push(copyId);
    usedIds.add(copyId);
    copiedCount += 1;
  });

  return {
    projects: [...importedProjects, ...safeExistingProjects],
    importedProjectIds,
    summary: {
      projectCount: analysis.projectCount,
      addedCount,
      copiedCount,
      skippedCount,
      resultingProjectCount: safeExistingProjects.length + importedProjects.length,
    },
  };
}

export function downloadJsonFile(filename, data) {
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();

  URL.revokeObjectURL(url);
}

export function readJsonFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        resolve(parsed);
      } catch {
        reject(new Error("Le fichier JSON est invalide."));
      }
    };

    reader.onerror = () => {
      reject(new Error("Impossible de lire le fichier."));
    };

    reader.readAsText(file, "utf-8");
  });
}
