import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import { createAttachment, normalizeAttachments, patchAttachment } from "../src/services/attachments.js";
import { createProjectBundle, restoreProjectBundle } from "../src/services/jsonTransfer.js";
import {
  APPROVED_REFERENCE_FORMAT,
  addApprovedReferenceToProjects,
  isKnowledgeReferenceAttachment,
  prepareKnowledgeReference,
  readKnowledgeReference,
} from "../src/services/knowledgeReferences.js";

const UUID = "d8e0d8a5-0c1c-4c84-ac2e-6b678bb41a9a";
const SHA = "b".repeat(64);
const REF = createHash("sha256").update("2dbrain-local-proposal-v1:" + SHA).digest("hex");

function proposal(overrides = {}) {
  return {
    format: "ide-2dbrain.reference-proposal.v1", version: 1,
    mode: "proposal_only", status: "pending",
    source: {
      provider: "local_personal", origin: "obsidian", ref: REF,
      format: "markdown", size_bytes: 200, metadata_keys: ["tags"],
    },
    classification: {
      category_id: "personal.ict.ai", kind: "knowledge", mapping_status: "mapped",
    },
    provenance: {
      source_sha256: SHA, taxonomy_sha256: "c".repeat(64),
      taxonomy_version: "0.2.0",
      extracted_at: new Date().toISOString(),
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null, relation: null, access_granted: false,
    import_ready: false, rag_eligible: false, ide_import_performed: false,
    ...overrides,
  };
}

function project(id = UUID) {
  return {
    schemaVersion: "1.0",
    project: { id, title: "Existing", slug: "existing" },
    attachments: [createAttachment({ title: "Preexisting note", type: "note", content: "Keep" })],
  };
}

async function approved(value = proposal(), details = {}) {
  return prepareKnowledgeReference(value, {
    projectId: UUID, relation: "research", confirmed: true,
    ...details,
  });
}

test("confirmation requires an actual UUID, relation and independent permission", async () => {
  for (const changes of [
    { confirmed: false }, { projectId: "P05" },
    { projectId: "" }, { relation: "" }, { relation: "auto" },
  ]) {
    await assert.rejects(approved(proposal(), changes));
  }
  assert.equal((await approved()).format, APPROVED_REFERENCE_FORMAT);
});

test("stale and future proposals fail closed before approval, altered source fingerprint fails", async () => {
  for (const date of ["2000-01-01T00:00:00.000Z", "2090-01-01T00:00:00.000Z"]) {
    await assert.rejects(approved(proposal({
      provenance: { ...proposal().provenance, extracted_at: date },
    })), (error) => error.code === "stale_proposal");
  }
  await assert.rejects(approved(proposal({
    source: { ...proposal().source, ref: "a".repeat(64) },
  })), (error) => error.code === "invalid_provenance");
});

test("approved reference is stable, pathless, readable and survives attachments normalization", async () => {
  const reference = await approved();
  const original = [project()];
  const transition = addApprovedReferenceToProjects(original, UUID, reference);
  assert.equal(transition.status, "added");
  assert.equal(original[0].attachments.length, 1);
  assert.equal(transition.projects[0].attachments.length, 2);
  const attachment = transition.projects[0].attachments[0];
  assert.ok(isKnowledgeReferenceAttachment(attachment));
  assert.equal(readKnowledgeReference(attachment).source.ref, REF);
  const normalized = normalizeAttachments(transition.projects[0].attachments);
  assert.equal(normalized[0].content, attachment.content);
  assert.equal(patchAttachment(attachment, { description: "Updated description" }).content,
    attachment.content);
  for (const sensitive of ["C:/Users", "private.md", "I_AUTHORIZE", "P05"]) {
    assert.ok(!attachment.content.includes(sensitive));
  }
  assert.equal(normalized[1].content, "Keep");
});

test("double-approval is idempotent; conflicting provenance or relation never changes data", async () => {
  const initial = [project()];
  const reference = await approved();
  const first = addApprovedReferenceToProjects(initial, UUID, reference);
  const second = addApprovedReferenceToProjects(first.projects, UUID, reference);
  assert.equal(second.status, "duplicate");
  assert.equal(second.projects, first.projects);
  for (const changed of [
    { ...reference, relation: "implementation" },
    { ...reference, provenance: { ...reference.provenance, taxonomy_sha256: "0".repeat(64) } },
  ]) {
    const conflicting = addApprovedReferenceToProjects(first.projects, UUID, changed);
    assert.equal(conflicting.status, "reference_conflict");
    assert.equal(conflicting.projects, first.projects);
  }
  assert.equal(addApprovedReferenceToProjects(initial, "P05", reference).status, "unknown_project");
  assert.equal(addApprovedReferenceToProjects([], UUID, reference).status, "unknown_project");
});

test("malformed stored references are preserved but rejected, never silently approved", async () => {
  const reference = await approved();
  const link = createAttachment({ type: "file_ref", content: JSON.stringify(reference) });
  for (const content of [
    "{\"format\":\"ide-2dbrain.approved-reference.v1\",invalid",
    JSON.stringify({ ...reference, version: 9 }),
    JSON.stringify({ ...reference, path: "C:/secret" }),
  ]) {
    const altered = { ...link, content };
    assert.ok(isKnowledgeReferenceAttachment(altered));
    assert.throws(() => readKnowledgeReference(altered));
    assert.equal(normalizeAttachments([altered])[0].content, content);
    const blocked = addApprovedReferenceToProjects([{
      ...project(), attachments: [altered],
    }], UUID, reference);
    assert.equal(blocked.status, "reference_conflict");
  }
});

test("legacy project-bundle v1 skip and restore-as-copy preserve reference and provenance", async () => {
  const linked = addApprovedReferenceToProjects([project()], UUID, await approved()).projects;
  const bundle = createProjectBundle(linked, { exportedAt: new Date().toISOString() });
  assert.equal(bundle.version, 1);
  const restored = restoreProjectBundle(JSON.parse(JSON.stringify(bundle)), [project()], {
    conflictStrategy: "copy", idFactory: () => "copied-project-uuid",
  });
  assert.equal(restored.summary.copiedCount, 1);
  assert.equal(restored.projects.length, 2);
  const copy = restored.projects[0];
  assert.equal(copy.project.id, "copied-project-uuid");
  const copied = normalizeAttachments(copy.attachments)[0];
  assert.equal(readKnowledgeReference(copied).provenance.source_sha256, SHA);
  assert.equal(readKnowledgeReference(copied).source.ref, REF);
  assert.equal(restoreProjectBundle(bundle, [project()], {
    conflictStrategy: "skip",
  }).summary.skippedCount, 1);
});
