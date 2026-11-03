/**
 * Read-only contract for a user-selected local 2dBrain reference proposal.
 * This does not grant access to the original file or write any IDE project.
 */
export const REFERENCE_PROPOSAL_FORMAT = "ide-2dbrain.reference-proposal.v1";
export const REFERENCE_PROPOSAL_VERSION = 1;
export const MAX_REFERENCE_PROPOSAL_BYTES = 32 * 1024;

const HEX_SHA256 = /^[a-f0-9]{64}$/;
const PERSONAL_CATEGORY = /^personal\.[a-z0-9_.-]+$/;
const SEMVER = /^\d+\.\d+\.\d+$/;
const METADATA_KEYS = new Set(["title", "tags", "aliases", "created", "updated"]);

export class ReferenceProposalError extends Error {
  constructor(code) {
    super(code);
    this.name = "ReferenceProposalError";
    this.code = code;
  }
}

function reject(code) {
  throw new ReferenceProposalError(code);
}

function exactFields(value, expected, code) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    reject(code);
  }
  const actual = Object.keys(value);
  if (actual.length !== expected.length || expected.some((key) => !Object.hasOwn(value, key))) {
    reject(code);
  }
}

/**
 * Format validation is not authenticity or consent verification.
 * A source fingerprint can only be refreshed by reselecting the source with permission.
 */
export function validateReferenceProposal(value) {
  exactFields(value, [
    "format", "version", "mode", "status", "source", "classification",
    "provenance", "target_project_id", "relation",
    "access_granted", "import_ready", "rag_eligible", "ide_import_performed",
  ], "invalid_shape");
  if (value.format !== REFERENCE_PROPOSAL_FORMAT) reject("unsupported_format");
  if (value.version !== REFERENCE_PROPOSAL_VERSION) reject("unsupported_version");
  if (value.mode !== "proposal_only" || value.status !== "pending"
      || value.target_project_id !== null || value.relation !== null
      || value.access_granted !== false || value.import_ready !== false
      || value.rag_eligible !== false || value.ide_import_performed !== false) {
    reject("invalid_approval");
  }
  exactFields(value.source, [
    "provider", "origin", "ref", "format", "size_bytes", "metadata_keys",
  ], "invalid_source");
  if (value.source.provider !== "local_personal"
      || value.source.origin !== "obsidian"
      || value.source.format !== "markdown"
      || !HEX_SHA256.test(value.source.ref)
      || !Number.isSafeInteger(value.source.size_bytes)
      || value.source.size_bytes < 0 || value.source.size_bytes > 256 * 1024
      || !Array.isArray(value.source.metadata_keys)
      || value.source.metadata_keys.length > METADATA_KEYS.size
      || new Set(value.source.metadata_keys).size !== value.source.metadata_keys.length
      || value.source.metadata_keys.some((key) => !METADATA_KEYS.has(key))) {
    reject("invalid_source");
  }
  exactFields(value.classification, [
    "category_id", "kind", "mapping_status",
  ], "invalid_classification");
  if (!PERSONAL_CATEGORY.test(value.classification.category_id)
      || value.classification.kind !== "knowledge"
      || value.classification.mapping_status !== "mapped") {
    reject("invalid_classification");
  }
  exactFields(value.provenance, [
    "source_sha256", "taxonomy_sha256", "taxonomy_version",
    "extracted_at", "identity_model",
  ], "invalid_provenance");
  if (!HEX_SHA256.test(value.provenance.source_sha256)
      || !HEX_SHA256.test(value.provenance.taxonomy_sha256)
      || !SEMVER.test(value.provenance.taxonomy_version)
      || typeof value.provenance.extracted_at !== "string"
      || !/Z$|\+00:00$/.test(value.provenance.extracted_at)
      || Number.isNaN(Date.parse(value.provenance.extracted_at))
      || value.provenance.identity_model !== "content_sha256_not_ownership_proof") {
    reject("invalid_provenance");
  }
  return value;
}

export function parseReferenceProposal(text) {
  if (typeof text !== "string" || text.length > MAX_REFERENCE_PROPOSAL_BYTES
      || new TextEncoder().encode(text).byteLength > MAX_REFERENCE_PROPOSAL_BYTES) {
    reject("too_large");
  }
  const lines = text.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim());
  if (lines.length !== 1) reject("multiple_records");
  let value;
  try {
    value = JSON.parse(lines[0]);
  } catch {
    reject("invalid_json");
  }
  return validateReferenceProposal(value);
}

export async function verifyReferenceProposalFingerprint(proposal, cryptoProvider = globalThis.crypto) {
  if (!cryptoProvider?.subtle?.digest) reject("invalid_provenance");
  const identityBytes = new TextEncoder().encode(
    `2dbrain-local-proposal-v1:${proposal.provenance.source_sha256}`,
  );
  let hash;
  try {
    hash = await cryptoProvider.subtle.digest("SHA-256", identityBytes);
  } catch {
    reject("invalid_provenance");
  }
  const computed = Array.from(new Uint8Array(hash),
    (byte) => byte.toString(16).padStart(2, "0")).join("");
  if (computed !== proposal.source.ref) reject("invalid_provenance");
  return proposal;
}

export function resolveReferenceTarget(projectDocs, selectedId) {
  if (typeof selectedId !== "string" || !selectedId) reject("unknown_project");
  const matching = Array.isArray(projectDocs)
    ? projectDocs.filter((doc) => doc?.project?.id === selectedId)
    : [];
  if (matching.length !== 1 || typeof matching[0]?.project?.title !== "string") {
    reject("unknown_project");
  }
  return { id: selectedId, title: matching[0].project.title };
}
