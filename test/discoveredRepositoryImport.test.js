import test from "node:test";
import assert from "node:assert/strict";

import { materializeDiscoveredRepositoryProject } from "../src/services/publicRepositoryProjectImport.js";

test("discovered repositories become backward-compatible local project documents", () => {
  const project = materializeDiscoveredRepositoryProject({
    projectId: "mindspark",
    title: "MindSpark — Atelier visuel",
    summary: "Visual workshop",
    tags: ["pwa", "visual"],
    repository: {
      provider: "github",
      owner: "Carouan",
      name: "glom-visual-workspace",
      fullName: "Carouan/glom-visual-workspace",
      url: "https://github.com/Carouan/glom-visual-workspace",
      visibility: "public",
      defaultBranch: "main",
      externalProjectId: "mindspark",
      appUrl: "https://carouan.github.io/glom-visual-workspace/",
      feedbackProtocol: "dev-cmd-v1",
      feedbackTransport: "github-issues",
    },
  }, { ownerId: "local-owner" });

  assert.equal(project.schemaVersion, "1.0");
  assert.equal(project.project.title, "MindSpark — Atelier visuel");
  assert.equal(project.project.currentStage, "v0_1");
  assert.equal(project.project.ownerId, "local-owner");
  assert.deepEqual(project.project.tags, ["pwa", "visual"]);
  assert.equal(project.repository.fullName, "Carouan/glom-visual-workspace");
  assert.equal(project.repository.externalProjectId, "mindspark");
  assert.equal(project.repository.appUrl, "https://carouan.github.io/glom-visual-workspace/");
  assert.deepEqual(project.backlog, []);
});
