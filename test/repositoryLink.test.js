import test from "node:test";
import assert from "node:assert/strict";

import { normalizeRepositoryLink } from "../src/services/repositoryLink.js";

test("legacy project documents without repository metadata remain importable", () => {
  const legacyDocument = JSON.parse(
    JSON.stringify({
      schemaVersion: "1.0",
      project: { id: "legacy-project", title: "Legacy" },
    })
  );

  assert.equal(normalizeRepositoryLink(legacyDocument.repository), null);
  assert.equal(legacyDocument.project.id, "legacy-project");
});

test("repository metadata survives a normalized JSON round trip", () => {
  const repository = {
    provider: " github ",
    fullName: " Carouan/ide-projectsmanager ",
    defaultBranch: " main ",
    visibility: "public",
    governance: " project-steward ",
    externalProjectId: "project-62",
  };

  const exportedDocument = JSON.stringify({
    schemaVersion: "1.0",
    project: { id: "linked-project" },
    repository,
  });
  const importedDocument = JSON.parse(exportedDocument);

  assert.deepEqual(normalizeRepositoryLink(importedDocument.repository), {
    provider: "github",
    fullName: "Carouan/ide-projectsmanager",
    defaultBranch: "main",
    visibility: "public",
    governance: "project-steward",
    externalProjectId: "project-62",
    url: "https://github.com/Carouan/ide-projectsmanager",
  });
});

test("repository normalization is soft for absent or incomplete metadata", () => {
  assert.equal(normalizeRepositoryLink(undefined), null);
  assert.equal(normalizeRepositoryLink([]), null);
  assert.equal(normalizeRepositoryLink("github"), null);
  assert.equal(normalizeRepositoryLink(42), null);
  assert.equal(
    normalizeRepositoryLink({ provider: "github", owner: "Carouan" }),
    null
  );
});

test("legacy owner and name metadata remains representable", () => {
  assert.deepEqual(
    normalizeRepositoryLink({
      provider: "github",
      owner: "Carouan",
      name: "ide-projectsmanager",
      defaultBranch: "   ",
    }),
    {
      provider: "github",
      owner: "Carouan",
      name: "ide-projectsmanager",
      fullName: "Carouan/ide-projectsmanager",
      url: "https://github.com/Carouan/ide-projectsmanager",
      defaultBranch: null,
      visibility: null,
      governance: null,
    }
  );
});

test("unknown providers are rejected", () => {
  assert.equal(
    normalizeRepositoryLink({ provider: "unknown", fullName: "owner/repo" }),
    null
  );
});
