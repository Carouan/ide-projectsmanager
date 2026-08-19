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

test("repository metadata survives a JSON export and import round trip", () => {
  const repository = {
    provider: "github",
    owner: "Carouan",
    name: "ide-projectsmanager",
    defaultBranch: "main",
  };

  const exportedDocument = JSON.stringify({
    schemaVersion: "1.0",
    project: { id: "linked-project" },
    repository,
  });
  const importedDocument = JSON.parse(exportedDocument);

  assert.deepEqual(normalizeRepositoryLink(importedDocument.repository), repository);
});

test("repository normalization is soft for absent or incomplete metadata", () => {
  assert.equal(normalizeRepositoryLink(undefined), null);
  assert.equal(
    normalizeRepositoryLink({ provider: "github", owner: "Carouan" }),
    null
  );
});
