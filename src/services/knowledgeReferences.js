import { createAttachment } from "./attachments.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";
import {
  ReferenceProposalError,
  validateReferenceProposal,
  verifyReferenceProposalFingerprint,
} from "./ide2dbrainPreview.js";

export const APPROVED_REFERENCE_FORMAT = "ide-2dbrain.approved-reference.v1";
export const MAX_PROPOSAL_AGE_MS = 7 * 24 * 60 * 60 * 1000;
export const REFERENCE_RELATIONS = Object.freeze(["reference", "research", "implementation"]);

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const FIELDS = ["format", "version", "status", "relation", "source",
  "classification", "provenance", "approvedAt"];

function fail(code) {
  throw new ReferenceProposalError(code);
}

function sameKeys(object, fields) {
  return object && typeof object === "object" && !Array.isArray(object)
    && Object.keys(object).length === fields.length
    && fields.every((key) => Object.hasOwn(object, key));
}

function pendingContract(reference) {
  return {
    format: "ide-2dbrain.reference-proposal.v1",
    version: 1, mode: "proposal_only", status: "pending",
    source: reference.source, classification: reference.classification,
    provenance: reference.provenance,
    target_project_id: null, relation: null,
    access_granted: false, import_ready: false,
    rag_eligible: false, ide_import_performed: false,
  };
}

/**
 * This is the same content-reference derivation used by A1 and B1.
 * Synchronous verification is intentional: restored attachments are rendered
 * immediately and must never appear approved during an asynchronous gap.
 */
export function referenceFingerprintMatches(reference) {
  const hash = reference?.provenance?.source_sha256;
  const ref = reference?.source?.ref;
  if (typeof hash !== "string" || !/^[0-9a-f]{64}$/.test(hash)
      || typeof ref !== "string" || !/^[0-9a-f]{64}$/.test(ref)) {
    return false;
  }
  const expected = bytesToHex(sha256(
    new TextEncoder().encode("2dbrain-local-proposal-v1:" + hash)
  ));
  return expected === ref;
}

export function validateApprovedReference(reference) {
  if (!sameKeys(reference, FIELDS)
      || reference.format !== APPROVED_REFERENCE_FORMAT
      || reference.version !== 1 || reference.status !== "approved"
      || !REFERENCE_RELATIONS.includes(reference.relation)
      || typeof reference.approvedAt !== "string"
      || !Number.isFinite(Date.parse(reference.approvedAt))) {
    fail("invalid_reference");
  }
  validateReferenceProposal(pendingContract(reference));
  if (!referenceFingerprintMatches(reference)) {
    fail("invalid_provenance");
  }
  return reference;
}

export function isKnowledgeReferenceAttachment(attachment) {
  return attachment?.type === "file_ref"
    && (
      (typeof attachment.title === "string" && attachment.title.startsWith("2dBrain · "))
      || (typeof attachment.description === "string" && attachment.description.startsWith("2dBrain:"))
      || (typeof attachment.content === "string"
        && attachment.content.includes("ide-2dbrain.approved-reference."))
    );
}

export function readKnowledgeReference(attachment) {
  if (!isKnowledgeReferenceAttachment(attachment)) return null;
  if (typeof attachment.content !== "string") fail("invalid_reference");
  let value;
  try {
    value = JSON.parse(attachment.content);
  } catch {
    fail("invalid_reference");
  }
  return validateApprovedReference(value);
}

export async function prepareKnowledgeReference(proposal, {
  projectId, relation, confirmed, now = new Date(),
} = {}) {
  if (confirmed !== true) fail("approval_required");
  if (typeof projectId !== "string" || !UUID.test(projectId)) fail("unknown_project");
  if (!REFERENCE_RELATIONS.includes(relation)) fail("invalid_relation");
  validateReferenceProposal(proposal);
  const current = new Date(now).getTime();
  const extracted = Date.parse(proposal.provenance.extracted_at);
  if (!Number.isFinite(current) || !Number.isFinite(extracted)
      || extracted > current + 5 * 60 * 1000
      || current - extracted > MAX_PROPOSAL_AGE_MS) {
    fail("stale_proposal");
  }
  await verifyReferenceProposalFingerprint(proposal);
  return validateApprovedReference({
    format: APPROVED_REFERENCE_FORMAT, version: 1, status: "approved",
    relation, source: structuredClone(proposal.source),
    classification: structuredClone(proposal.classification),
    provenance: structuredClone(proposal.provenance),
    approvedAt: new Date(current).toISOString(),
  });
}

function sameReference(left, right) {
  return left.source.ref === right.source.ref
    && left.source.provider === right.source.provider
    && left.provenance.source_sha256 === right.provenance.source_sha256
    && left.provenance.taxonomy_sha256 === right.provenance.taxonomy_sha256
    && left.classification.category_id === right.classification.category_id
    && left.relation === right.relation;
}

/**
 * Pure, functional state transition. Repeated approvals never create duplicates.
 * The containing project ID is authoritative (and may change on JSON restore-as-copy).
 */
export function addApprovedReferenceToProjects(projectDocuments, projectId, reference) {
  validateApprovedReference(reference);
  if (!Array.isArray(projectDocuments) || !UUID.test(projectId)) {
    return { projects: projectDocuments, status: "unknown_project" };
  }
  const targets = projectDocuments.filter((doc) => doc?.project?.id === projectId);
  if (targets.length !== 1) return { projects: projectDocuments, status: "unknown_project" };
  const existing = targets[0].attachments || [];
  for (const attachment of existing) {
    if (!isKnowledgeReferenceAttachment(attachment)) continue;
    let saved;
    try { saved = readKnowledgeReference(attachment); }
    catch { return { projects: projectDocuments, status: "reference_conflict" }; }
    if (saved.source.ref !== reference.source.ref) continue;
    if (!sameReference(saved, reference)) {
      return { projects: projectDocuments, status: "reference_conflict" };
    }
    return { projects: projectDocuments, status: "duplicate" };
  }
  const attachment = createAttachment({
    type: "file_ref",
    title: "2dBrain · " + reference.classification.category_id,
    description: "2dBrain: " + reference.relation,
    content: JSON.stringify(reference),
  });
  return {
    status: "added",
    projects: projectDocuments.map((doc) => doc.project.id === projectId ? {
      ...doc,
      project: { ...doc.project, updatedAt: new Date().toISOString() },
      attachments: [attachment, ...(doc.attachments || [])],
    } : doc),
  };
}
