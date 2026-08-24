const KNOWN_PORTFOLIO_PROGRESS_LINE =
  /^Progression déclarée\s*:\s*(\d{1,3})\s*%\s*$/u;

export function normalizeProjectProgress(value) {
  if (value === null || value === undefined || value === "") return null;

  let normalizedValue = value;

  if (typeof value === "string") {
    const trimmedValue = value.trim();
    if (!/^\d{1,3}$/.test(trimmedValue)) return null;
    normalizedValue = Number(trimmedValue);
  }

  if (
    typeof normalizedValue !== "number" ||
    !Number.isInteger(normalizedValue) ||
    normalizedValue < 0 ||
    normalizedValue > 100
  ) {
    return null;
  }

  return normalizedValue;
}

export function normalizeProjectProgressDocument(projectDoc) {
  if (!projectDoc?.project) return projectDoc;

  return {
    ...projectDoc,
    project: {
      ...projectDoc.project,
      progressPercent: normalizeProjectProgress(projectDoc.project.progressPercent),
    },
  };
}

export function formatProjectProgress(value, undeclaredLabel = "—") {
  const progressPercent = normalizeProjectProgress(value);
  return progressPercent === null ? undeclaredLabel : `${progressPercent} %`;
}

function findKnownJournalProgressValues(journal) {
  const values = new Set();

  for (const entry of Array.isArray(journal) ? journal : []) {
    for (const source of [entry?.title, entry?.content]) {
      if (typeof source !== "string") continue;

      for (const line of source.split(/\r?\n/)) {
        const match = KNOWN_PORTFOLIO_PROGRESS_LINE.exec(line.trim());
        if (!match) continue;

        const progressPercent = normalizeProjectProgress(match[1]);
        if (progressPercent !== null) values.add(progressPercent);
      }
    }
  }

  return [...values];
}

export function previewKnownProjectProgressMigration(projectDoc) {
  if (!projectDoc?.project?.id) return null;
  if (normalizeProjectProgress(projectDoc.project.progressPercent) !== null) {
    return null;
  }

  const knownValues = findKnownJournalProgressValues(projectDoc.journal);
  if (knownValues.length !== 1) return null;

  return {
    projectId: projectDoc.project.id,
    projectTitle: projectDoc.project.title || projectDoc.project.id,
    progressPercent: knownValues[0],
  };
}

export function previewKnownPortfolioProgressMigrations(projects) {
  if (!Array.isArray(projects)) return [];

  return projects
    .map((projectDoc) => previewKnownProjectProgressMigration(projectDoc))
    .filter(Boolean);
}

export function applyKnownPortfolioProgressMigrations(projects, options = {}) {
  const safeProjects = Array.isArray(projects) ? projects : [];
  const migrations = previewKnownPortfolioProgressMigrations(safeProjects);

  if (migrations.length === 0) {
    return { projects: safeProjects, migrations: [], migratedCount: 0 };
  }

  const migrationsByProjectId = new Map(
    migrations.map((migration) => [migration.projectId, migration])
  );
  const updatedAt = options.now || new Date().toISOString();

  return {
    projects: safeProjects.map((projectDoc) => {
      const migration = migrationsByProjectId.get(projectDoc?.project?.id);
      if (!migration) return projectDoc;

      return {
        ...projectDoc,
        project: {
          ...projectDoc.project,
          progressPercent: migration.progressPercent,
          updatedAt,
        },
      };
    }),
    migrations,
    migratedCount: migrations.length,
  };
}
