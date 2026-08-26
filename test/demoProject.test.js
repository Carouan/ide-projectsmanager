import test from "node:test";
import assert from "node:assert/strict";

import {
  IDE_DEMO_PROJECT_ID,
  createIdeDemoProject,
  installIdeDemoProject,
} from "../src/services/demoProject.js";

const NOW = "2026-08-20T18:56:29.000Z";

test("the IDE demo is a normal repository-backed project document", () => {
  const projectDoc = createIdeDemoProject({
    now: NOW,
    ownerId: "local-user",
  });

  assert.equal(projectDoc.project.id, IDE_DEMO_PROJECT_ID);
  assert.equal(projectDoc.project.ownerId, "local-user");
  assert.equal(projectDoc.project.currentStage, "v0_7");
  assert.equal(projectDoc.project.createdAt, NOW);
  assert.equal(projectDoc.repository.fullName, "Carouan/ide-projectsmanager");
  assert.equal(projectDoc.repository.visibility, "public");
  assert.equal(projectDoc.repository.governance, "project-steward");
  assert.equal(projectDoc.stages.v0_7.status, "in_progress");
  assert.deepEqual(
    projectDoc.workstreams.map(({ id }) => id),
    ["ws_software_product", "ws_software_ui_ux", "ws_software_quality"]
  );
  assert.equal(projectDoc.backlog.length, 2);
  assert.equal(projectDoc.backlog[0].workstreamId, "ws_software_quality");
  assert.equal(projectDoc.backlog[0].stageKey, "v0_7");
  assert.equal(projectDoc.journal.length, 1);
});

test("installing the demo is explicit and preserves existing projects", () => {
  const existingProject = {
    project: { id: "existing-project", title: "Existing" },
  };
  const result = installIdeDemoProject([existingProject], { now: NOW });

  assert.equal(result.installed, true);
  assert.equal(result.project.project.id, IDE_DEMO_PROJECT_ID);
  assert.equal(result.projects.length, 2);
  assert.equal(result.projects[1], existingProject);
});

test("installing the demo twice opens the existing copy without overwriting it", () => {
  const customizedDemo = createIdeDemoProject({ now: NOW });
  customizedDemo.project.title = "Ma démonstration personnalisée";

  const result = installIdeDemoProject([customizedDemo], {
    now: "2026-08-21T00:00:00.000Z",
  });

  assert.equal(result.installed, false);
  assert.equal(result.projects.length, 1);
  assert.equal(result.project, customizedDemo);
  assert.equal(result.project.project.title, "Ma démonstration personnalisée");
  assert.equal(result.project.project.updatedAt, NOW);
});

test("an unavailable project list degrades safely to the demo only", () => {
  const result = installIdeDemoProject(null, { now: NOW });

  assert.equal(result.installed, true);
  assert.equal(result.projects.length, 1);
  assert.equal(result.projects[0].project.id, IDE_DEMO_PROJECT_ID);
});
