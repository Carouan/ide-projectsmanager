import assert from "node:assert/strict";
import test from "node:test";

import { createProjectBundle, validateProjectBundle } from "../src/services/jsonTransfer.js";
import {
  createGovernedProjectDocument,
  createGovernedProjectId,
  createGovernedProjectPackage,
  GovernedProjectBootstrapError,
  GOVERNED_PROJECT_PACKAGE_FORMAT,
  GOVERNED_PROJECT_PACKAGE_VERSION,
  GOVERNED_PROJECT_REQUIRED_FILES,
  normalizeGovernedRepositoryName,
  validateGovernedProjectPackage,
} from "../src/services/governedProjectBootstrap.js";
import { createEmptyProject } from "../src/services/projectFactory.js";

const PROJECT_ID = "b1f69292-c756-455c-af70-480b0135886d";
const CREATED_AT = "2026-08-24T15:00:00.000Z";

function draft(overrides = {}) {
  return {
    title: "Caractérisation des déchets dangereux",
    objective: "Établir une méthode traçable et réutilisable.",
    context: "Les décisions actuelles manquent de critères vérifiables.",
    repositoryFullName: "Carouan/hazardous-waste-characterization",
    visibility: "private",
    deliverables: "Inventaire réglementaire\nMatrice de caractérisation",
    successCriteria: "Sources citées\nMéthode reproductible",
    includedScope: "Déchets dangereux",
    excludedScope: "Collecte de terrain non mandatée",
    constraints: "Conserver les sources réglementaires vérifiables.",
    ...overrides,
  };
}

function prepared(overrides = {}) {
  return createGovernedProjectPackage(draft(overrides), {
    projectId: PROJECT_ID,
    createdAt: CREATED_AT,
  });
}

function file(packageDocument, path) {
  return packageDocument.files.find((entry) => entry.path === path)?.content;
}

test("governed packages require an explicit objective, context, deliverable and success criterion", () => {
  const cases = [
    [{ title: " " }, "missing_title"],
    [{ objective: " " }, "missing_objective"],
    [{ context: " " }, "missing_context"],
    [{ deliverables: "\n " }, "missing_deliverables"],
    [{ successCriteria: "\n " }, "missing_success_criteria"],
    [{ repositoryFullName: " " }, "invalid_repository"],
  ];

  for (const [patch, expectedCode] of cases) {
    assert.throws(
      () => prepared(patch),
      (error) => error instanceof GovernedProjectBootstrapError
        && error.code === expectedCode
    );
  }
});

test("canonical GitHub repository names accept explicit owner/name and safe HTTPS URLs", () => {
  assert.equal(normalizeGovernedRepositoryName("  Carouan/my-project  "), "Carouan/my-project");
  assert.equal(
    normalizeGovernedRepositoryName("https://github.com/Carouan/my-project.git/"),
    "Carouan/my-project"
  );
});

test("canonical repository names reject other origins, credentials, queries and traversal", () => {
  for (const value of [
    "https://example.org/Carouan/my-project",
    "http://github.com/Carouan/my-project",
    "https://github.com:444/Carouan/my-project",
    "https://secret@github.com/Carouan/my-project",
    "https://github.com/Carouan/my-project?token=secret",
    "https://github.com/Carouan/my-project#secret",
    "Carouan/../my-project",
    "Carouan/my-project/extra",
  ]) {
    assert.throws(
      () => normalizeGovernedRepositoryName(value),
      (error) => error.code === "invalid_repository"
    );
  }
});

test("project identifiers remain explicit, stable and safe", () => {
  assert.equal(createGovernedProjectId({ randomUUID: () => PROJECT_ID }), PROJECT_ID);

  for (const value of ["", "../escape", "project with spaces", "x".repeat(129)]) {
    assert.throws(
      () => createGovernedProjectPackage(draft(), { projectId: value }),
      (error) => error.code === "invalid_project_id"
    );
  }
});

test("governed packages use a stable, reviewable and versioned contract", () => {
  const packageDocument = prepared();

  assert.equal(packageDocument.format, GOVERNED_PROJECT_PACKAGE_FORMAT);
  assert.equal(packageDocument.version, GOVERNED_PROJECT_PACKAGE_VERSION);
  assert.equal(packageDocument.projectId, PROJECT_ID);
  assert.equal(packageDocument.createdAt, CREATED_AT);
  assert.deepEqual(
    packageDocument.files.map(({ path }) => path),
    GOVERNED_PROJECT_REQUIRED_FILES
  );
  assert.equal(new Set(packageDocument.files.map(({ path }) => path)).size, 5);
});

test("the project mandate preserves explicit objectives, exclusions and measurable criteria", () => {
  const mandate = file(prepared(), "PROJECT_MANDATE.md");

  assert.match(mandate, /## Objective\n\nÉtablir une méthode traçable/u);
  assert.match(mandate, /- Inventaire réglementaire/u);
  assert.match(mandate, /- Matrice de caractérisation/u);
  assert.match(mandate, /- Sources citées/u);
  assert.match(mandate, /- Méthode reproductible/u);
  assert.match(mandate, /### Must not include\n\n- Collecte de terrain non mandatée/u);
});

test("the steward manifest binds the same identifier, repository and versioned dashboard contract", () => {
  const manifest = file(prepared(), ".project-steward.yml");

  assert.match(manifest, /methodology_repository: "Carouan\/ai-project-steward"/u);
  assert.match(manifest, /contract_version: "1"/u);
  assert.match(manifest, new RegExp("project_id: \"" + PROJECT_ID + "\"", "u"));
  assert.match(manifest, /full_name: "Carouan\/hazardous-waste-characterization"/u);
  assert.match(manifest, /visibility: "private"/u);
  assert.match(manifest, /executive_status_file: "PROJECT_STATUS.md"/u);
});

test("generated files reference stewardship without embedding its methodology or asserting remote creation", () => {
  const packageDocument = prepared();
  const status = file(packageDocument, "PROJECT_STATUS.md");
  const readme = file(packageDocument, "README.md");

  assert.match(status, /repository existence not verified/u);
  assert.match(status, /has not been verified/u);
  assert.match(readme, /Aucun dépôt n'est créé automatiquement/u);
  assert.ok(!packageDocument.files.some(({ path }) => path === "SKILL.md"));
});

test("governed project creation preserves the local project schema and saves every file as a snippet", () => {
  const projectDocument = createGovernedProjectDocument(prepared(), { ownerId: "local-owner" });

  assert.equal(projectDocument.schemaVersion, "1.0");
  assert.equal(projectDocument.project.id, PROJECT_ID);
  assert.equal(projectDocument.project.ownerId, "local-owner");
  assert.equal(projectDocument.project.currentStage, "v0_0");
  assert.equal(projectDocument.stages.v0_0.status, "in_progress");
  assert.match(projectDocument.stages.v0_0.definitionOfDone, /Méthode reproductible/u);
  assert.equal(projectDocument.repository.externalProjectId, PROJECT_ID);
  assert.equal(projectDocument.repository.provisioningState, "planned");
  assert.deepEqual(projectDocument.attachments.map(({ fileName }) => fileName), GOVERNED_PROJECT_REQUIRED_FILES);
  assert.ok(projectDocument.attachments.every(({ type }) => type === "snippet"));
  assert.match(projectDocument.journal[0].content, /No repository was created automatically/u);
});

test("existing quick local project creation remains independent and repository-free", () => {
  const projectDocument = createEmptyProject("owner");

  assert.equal(projectDocument.repository, null);
  assert.deepEqual(projectDocument.attachments, []);
  assert.equal(projectDocument.project.ownerId, "owner");
});

test("governed packages and governed projects survive normal JSON backup round trips", () => {
  const packageDocument = prepared();
  const copiedPackage = JSON.parse(JSON.stringify(packageDocument));
  const projectDocument = createGovernedProjectDocument(copiedPackage);
  const bundle = createProjectBundle([projectDocument], { exportedAt: CREATED_AT });
  const copiedBundle = validateProjectBundle(JSON.parse(JSON.stringify(bundle)));

  assert.deepEqual(validateGovernedProjectPackage(copiedPackage), packageDocument);
  assert.equal(copiedBundle.projects[0].project.id, PROJECT_ID);
  assert.equal(copiedBundle.projects[0].attachments.length, 5);
});

test("tampered files and canonical repository links are rejected before project creation", () => {
  const alteredFiles = prepared();
  alteredFiles.files[0].content += "\nUnreviewed change";

  const alteredRepository = prepared();
  alteredRepository.repository.url = "https://github.com/other/repository";

  for (const value of [alteredFiles, alteredRepository]) {
    assert.throws(
      () => createGovernedProjectDocument(value),
      (error) => error.code === "inconsistent_package"
    );
  }
});

test("invalid package formats, versions and timestamps fail explicitly", () => {
  const packageDocument = prepared();

  assert.throws(
    () => validateGovernedProjectPackage({ ...packageDocument, format: "other" }),
    (error) => error.code === "invalid_package"
  );
  assert.throws(
    () => validateGovernedProjectPackage({ ...packageDocument, version: 999 }),
    (error) => error.code === "unsupported_package_version"
  );
  assert.throws(
    () => createGovernedProjectPackage(draft(), { projectId: PROJECT_ID, createdAt: "invalid" }),
    (error) => error.code === "invalid_created_at"
  );
});

test("missing optional scope stays honest and repositories default to private", () => {
  const packageDocument = prepared({
    visibility: "unknown",
    includedScope: "",
    excludedScope: "",
    constraints: "",
  });

  assert.equal(packageDocument.repository.visibility, "private");
  assert.deepEqual(packageDocument.includedScope, []);
  assert.deepEqual(packageDocument.excludedScope, []);
  assert.match(file(packageDocument, "PROJECT_MANDATE.md"), /Non renseigné — à préciser/u);
});

test("preparing or cancelling a draft does not modify the caller's existing projects or draft", () => {
  const existingProjects = [createEmptyProject("owner")];
  const existingBefore = JSON.stringify(existingProjects);
  const providedDraft = draft();
  const draftBefore = JSON.stringify(providedDraft);

  createGovernedProjectPackage(providedDraft, { projectId: PROJECT_ID, createdAt: CREATED_AT });

  assert.equal(JSON.stringify(existingProjects), existingBefore);
  assert.equal(JSON.stringify(providedDraft), draftBefore);
});
