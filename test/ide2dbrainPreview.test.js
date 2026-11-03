import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";
import {
  MAX_REFERENCE_PROPOSAL_BYTES,
  REFERENCE_PROPOSAL_FORMAT,
  ReferenceProposalError,
  parseReferenceProposal,
  resolveReferenceTarget,
  validateReferenceProposal,
  verifyReferenceProposalFingerprint,
} from "../src/services/ide2dbrainPreview.js";

function makeProposal() {
  const sourceHash = "b".repeat(64);
  const contentReference = createHash("sha256")
    .update(`2dbrain-local-proposal-v1:${sourceHash}`)
    .digest("hex");
  return {
    format: REFERENCE_PROPOSAL_FORMAT,
    version: 1,
    mode: "proposal_only",
    status: "pending",
    source: {
      provider: "local_personal",
      origin: "obsidian",
      ref: contentReference,
      format: "markdown",
      size_bytes: 70,
      metadata_keys: ["tags", "title"],
    },
    classification: {
      category_id: "personal.ict.ai",
      kind: "knowledge",
      mapping_status: "mapped",
    },
    provenance: {
      source_sha256: sourceHash,
      taxonomy_sha256: "c".repeat(64),
      taxonomy_version: "0.2.0",
      extracted_at: "2026-11-03T07:30:00+00:00",
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null,
    relation: null,
    access_granted: false,
    import_ready: false,
    rag_eligible: false,
    ide_import_performed: false,
  };
}

function expectFailure(input, code) {
  assert.throws(
    () => parseReferenceProposal(input),
    (error) => error instanceof ReferenceProposalError && error.code === code,
  );
}

test("accepts a single portable pending proposal, no project lookup or mutation", () => {
  const proposal = makeProposal();
  const input = JSON.stringify(proposal) + "\n";
  assert.deepEqual(parseReferenceProposal(input), proposal);
  assert.deepEqual(parseReferenceProposal("\uFEFF" + input.replace("\n", "\r\n")), proposal);
  assert.equal(proposal.target_project_id, null);
  assert.equal(proposal.import_ready, false);
});

test("rejects malformed, repeated, oversized and unknown JSON content", () => {
  expectFailure("{invalid json}", "invalid_json");
  expectFailure("", "multiple_records");
  expectFailure("{}\n{}", "multiple_records");
  expectFailure("x".repeat(MAX_REFERENCE_PROPOSAL_BYTES + 1), "too_large");
  expectFailure(JSON.stringify({ ...makeProposal(), private_path: "C:/private" }), "invalid_shape");
  expectFailure(JSON.stringify({ ...makeProposal(), format: "ide-projectsmanager.project-bundle" }),
    "unsupported_format");
  expectFailure(JSON.stringify({ ...makeProposal(), version: 2 }), "unsupported_version");
});

test("rejects forged approvals and implicit permissions", () => {
  for (const change of [
    { status: "approved" }, { mode: "import" }, { access_granted: true },
    { target_project_id: "P05" }, { relation: "reference" },
    { import_ready: true }, { ide_import_performed: true },
    { rag_eligible: true },
  ]) {
    expectFailure(JSON.stringify({ ...makeProposal(), ...change }), "invalid_approval");
  }
});

test("source keys, values and size must match the whitelist", () => {
  for (const change of [
    { provider: "github" }, { origin: "m365" }, { format: "html" },
    { ref: "not-a-hash" }, { size_bytes: 256 * 1024 + 1 },
    { metadata_keys: ["tags", "tags"] }, { metadata_keys: ["content"] },
    { path: "C:/private" },
  ]) {
    expectFailure(JSON.stringify({
      ...makeProposal(),
      source: { ...makeProposal().source, ...change },
    }), "invalid_source");
  }
});

test("rejects institutional, unmapped or invented classification", () => {
  for (const change of [
    { category_id: "institutional.admin" },
    { mapping_status: "not_mapped" }, { kind: "code" },
    { scope: "institutional" },
  ]) {
    expectFailure(JSON.stringify({
      ...makeProposal(),
      classification: { ...makeProposal().classification, ...change },
    }), "invalid_classification");
  }
});

test("rejects incorrect source provenance, version or timestamp", () => {
  for (const change of [
    { source_sha256: "unknown" }, { taxonomy_sha256: null },
    { taxonomy_version: "beta" }, { extracted_at: "not-date" },
    { identity_model: "owner_verified" }, { private_path: "C:/secret" },
  ]) {
    expectFailure(JSON.stringify({
      ...makeProposal(),
      provenance: { ...makeProposal().provenance, ...change },
    }), "invalid_provenance");
  }
});

test("requires explicit selection of exactly one existing IDE project ID", () => {
  const projects = [
    { project: { id: "4102ed72-e5be-40b8-a097-c77259ba7315", title: "Existing" } },
    { project: { id: "b7bd35db-210a-4817-a91d-18c836c39ac5", title: "Other" } },
  ];
  assert.deepEqual(resolveReferenceTarget(projects, projects[0].project.id), {
    id: projects[0].project.id,
    title: "Existing",
  });
  for (const selected of ["", "P05", "not-a-real-project"]) {
    assert.throws(() => resolveReferenceTarget(projects, selected),
      (error) => error.code === "unknown_project");
  }
  assert.equal(projects.length, 2);
  assert.equal(projects[0].project.title, "Existing");
  assert.throws(() => resolveReferenceTarget([...projects, projects[0]], projects[0].project.id),
    (error) => error.code === "unknown_project");
});

test("validation is read-only and does not change proposal objects", () => {
  const value = makeProposal();
  const before = JSON.stringify(value);
  assert.equal(validateReferenceProposal(value), value);
  assert.equal(JSON.stringify(value), before);
});

test("validates the content reference against source provenance with Web Crypto", async () => {
  const valid = makeProposal();
  assert.deepEqual(await verifyReferenceProposalFingerprint(valid), valid);
  await assert.rejects(
    verifyReferenceProposalFingerprint({
      ...valid,
      source: { ...valid.source, ref: "a".repeat(64) },
    }),
    (error) => error.code === "invalid_provenance",
  );
});
