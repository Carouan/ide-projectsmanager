import assert from "node:assert/strict";
import test from "node:test";

import {
  analyzeProjectBundle,
  createProjectBundle,
  PROJECT_BUNDLE_CONFLICT_STRATEGY,
  PROJECT_BUNDLE_FORMAT,
  PROJECT_BUNDLE_VERSION,
  ProjectBundleError,
  restoreProjectBundle,
  validateProjectBundle,
} from "../src/services/jsonTransfer.js";

function project(id, title = id) {
  return {
    schemaVersion: "1.0",
    project: {
      id,
      slug: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      createdAt: "2026-08-20T10:00:00.000Z",
      updatedAt: "2026-08-20T10:00:00.000Z",
    },
  };
}

function bundle(projects) {
  return createProjectBundle(projects, {
    exportedAt: "2026-08-20T10:00:00.000Z",
  });
}

test("createProjectBundle wraps every project in a versioned JSON document", () => {
  const projects = [
    { project: { id: "project-1", title: "Premier projet" } },
    { project: { id: "project-2", title: "Second projet" } },
  ];
  const exportedAt = "2026-08-20T10:00:00.000Z";

  const bundle = createProjectBundle(projects, { exportedAt });

  assert.deepEqual(bundle, {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    exportedAt,
    projectCount: 2,
    projects,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(bundle)), bundle);
});

test("createProjectBundle safely exports an empty project list", () => {
  const bundle = createProjectBundle(null, {
    exportedAt: "2026-08-20T10:00:00.000Z",
  });

  assert.equal(bundle.projectCount, 0);
  assert.deepEqual(bundle.projects, []);
});

test("validateProjectBundle accepts an exported empty bundle", () => {
  const exportedBundle = bundle([]);

  assert.equal(validateProjectBundle(exportedBundle), exportedBundle);
});

test("validateProjectBundle rejects unknown formats and versions", () => {
  assert.throws(
    () => validateProjectBundle({ ...bundle([]), format: "unknown" }),
    (error) => error instanceof ProjectBundleError
      && error.code === "unsupported_format"
  );
  assert.throws(
    () => validateProjectBundle({ ...bundle([]), version: 2 }),
    (error) => error instanceof ProjectBundleError
      && error.code === "unsupported_version"
  );
});

test("validateProjectBundle rejects malformed counts and projects", () => {
  assert.throws(
    () => validateProjectBundle({ ...bundle([]), projectCount: 1 }),
    (error) => error.code === "invalid_project_count"
  );
  assert.throws(
    () => validateProjectBundle(bundle([{ project: {} }])),
    (error) => error.code === "invalid_project"
  );
});

test("validateProjectBundle rejects duplicate project identifiers", () => {
  assert.throws(
    () => validateProjectBundle(bundle([project("same"), project("same")])),
    (error) => error.code === "duplicate_project_id"
  );
});

test("analyzeProjectBundle separates new projects from conflicts", () => {
  const analysis = analyzeProjectBundle(
    bundle([project("existing"), project("new")]),
    [project("existing")]
  );

  assert.deepEqual(analysis.newProjectIds, ["new"]);
  assert.deepEqual(analysis.conflictingProjectIds, ["existing"]);
  assert.equal(analysis.newCount, 1);
  assert.equal(analysis.conflictCount, 1);
});

test("restoreProjectBundle skips conflicts without overwriting local projects", () => {
  const localProject = project("existing", "Version locale");
  const backupProject = project("existing", "Version sauvegardée");
  const newProject = project("new", "Nouveau");

  const result = restoreProjectBundle(
    bundle([backupProject, newProject]),
    [localProject],
    { conflictStrategy: PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP }
  );

  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[1].project.title, "Version locale");
  assert.deepEqual(result.summary, {
    projectCount: 2,
    addedCount: 1,
    copiedCount: 0,
    skippedCount: 1,
    resultingProjectCount: 2,
  });
});

test("restoreProjectBundle imports conflicts as copies with new identifiers", () => {
  const localProject = project("existing", "Version locale");
  const backupProject = project("existing", "Version sauvegardée");

  const result = restoreProjectBundle(
    bundle([backupProject]),
    [localProject],
    {
      conflictStrategy: PROJECT_BUNDLE_CONFLICT_STRATEGY.COPY,
      idFactory: () => "existing-copy-1",
      now: "2026-08-20T12:00:00.000Z",
    }
  );

  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[0].project.id, "existing-copy-1");
  assert.equal(result.projects[0].project.title, "Version sauvegardée");
  assert.equal(result.projects[0].project.updatedAt, "2026-08-20T12:00:00.000Z");
  assert.equal(result.projects[1].project.title, "Version locale");
  assert.equal(backupProject.project.id, "existing");
  assert.equal(result.summary.copiedCount, 1);
  assert.equal(result.summary.skippedCount, 0);
});

test("restoreProjectBundle rejects an unknown conflict strategy", () => {
  assert.throws(
    () => restoreProjectBundle(bundle([project("existing")]), [], {
      conflictStrategy: "replace",
    }),
    (error) => error.code === "invalid_conflict_strategy"
  );
});

test("restoreProjectBundle handles an empty bundle deterministically", () => {
  const localProjects = [project("existing")];
  const result = restoreProjectBundle(bundle([]), localProjects);

  assert.deepEqual(result.projects, localProjects);
  assert.deepEqual(result.summary, {
    projectCount: 0,
    addedCount: 0,
    copiedCount: 0,
    skippedCount: 0,
    resultingProjectCount: 1,
  });
});
