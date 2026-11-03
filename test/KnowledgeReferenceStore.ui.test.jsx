// @vitest-environment jsdom
import { createHash, webcrypto } from "node:crypto";
import { TextEncoder, TextDecoder } from "node:util";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAppStore } from "../src/store/useAppStore.js";

const ID = "8ccf0c84-f47f-4683-8903-60fc90145630";
const SOURCE_SHA = "b".repeat(64);
const SOURCE_REF = createHash("sha256")
  .update("2dbrain-local-proposal-v1:" + SOURCE_SHA).digest("hex");

const persistence = vi.hoisted(() => ({
  seed: [],
  writes: [],
  save: vi.fn(async (projects) => {
    persistence.writes.push(structuredClone(projects));
  }),
}));

vi.mock("../src/repositories/storageRepository.js", async (importOriginal) => ({
  ...(await importOriginal()),
  loadPersistedProjects: async () => structuredClone(persistence.seed),
  savePersistedProjects: (projects) => persistence.save(projects),
}));

function freshProject() {
  return {
    schemaVersion: "1.0",
    project: {
      id: ID, slug: "fixture", title: "Fixture",
      status: "active", createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(), currentStage: "v0_0",
    },
    attachments: [],
  };
}

function proposal() {
  return {
    format: "ide-2dbrain.reference-proposal.v1", version: 1,
    mode: "proposal_only", status: "pending",
    source: {
      provider: "local_personal", origin: "obsidian", ref: SOURCE_REF,
      format: "markdown", size_bytes: 120, metadata_keys: ["title"],
    },
    classification: {
      category_id: "personal.ict.ai", kind: "knowledge", mapping_status: "mapped",
    },
    provenance: {
      source_sha256: SOURCE_SHA,
      taxonomy_sha256: "c".repeat(64), taxonomy_version: "0.2.0",
      extracted_at: new Date().toISOString(),
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null, relation: null,
    access_granted: false, import_ready: false, rag_eligible: false,
    ide_import_performed: false,
  };
}

function approvedReference(relation = "research", taxonomy = "c".repeat(64)) {
  const p = proposal();
  return {
    format: "ide-2dbrain.approved-reference.v1", version: 1,
    status: "approved", relation,
    source: p.source, classification: p.classification,
    provenance: { ...p.provenance, taxonomy_sha256: taxonomy },
    approvedAt: new Date().toISOString(),
  };
}

function request(override = {}) {
  return {
    proposal: proposal(), projectId: ID, relation: "research",
    confirmed: true, ...override,
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

beforeEach(() => {
  persistence.seed = [freshProject()];
  persistence.writes = [];
  persistence.save.mockReset();
  persistence.save.mockImplementation(async (projects) => {
    persistence.writes.push(structuredClone(projects));
  });
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.stubGlobal("TextDecoder", TextDecoder);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

async function hydratedStore() {
  const result = renderHook(() => useAppStore());
  await waitFor(() => expect(result.result.current.projects).toHaveLength(1));
  await waitFor(() => expect(persistence.save).toHaveBeenCalled());
  return result;
}

function holdFingerprint() {
  const gate = deferred();
  const reached = vi.fn();
  const digest = webcrypto.subtle.digest.bind(webcrypto.subtle);
  vi.stubGlobal("crypto", {
    randomUUID: webcrypto.randomUUID.bind(webcrypto),
    subtle: {
      digest: async (...args) => {
        reached();
        await gate.promise;
        return digest(...args);
      },
    },
  });
  return { gate, reached };
}

describe("actual React store approval receipt", () => {
  it("uses the project state committed after async fingerprint verification, not a stale snapshot", async () => {
    const ui = await hydratedStore();
    const { gate, reached } = holdFingerprint();
    const task = ui.result.current.approveKnowledgeReference(request());
    await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
    act(() => ui.result.current.deleteProject(ID));
    gate.resolve();
    await expect(task).rejects.toMatchObject({ code: "unknown_project" });
    expect(ui.result.current.projects).toHaveLength(0);
    expect(persistence.writes.at(-1)).toHaveLength(0);
  });

  it("reports duplicate if another UI operation attached the same source while hashing", async () => {
    const ui = await hydratedStore();
    const { gate, reached } = holdFingerprint();
    const task = ui.result.current.approveKnowledgeReference(request());
    await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
    const existing = approvedReference();
    act(() => ui.result.current.addAttachment(ID, {
      type: "file_ref", title: "2dBrain · personal.ict.ai",
      content: JSON.stringify(existing),
    }));
    gate.resolve();
    await expect(task).resolves.toBe("duplicate");
    expect(ui.result.current.projects[0].attachments).toHaveLength(1);
  });

  it("rejects changed provenance during hashing and preserves the conflicting reference", async () => {
    const ui = await hydratedStore();
    const { gate, reached } = holdFingerprint();
    const task = ui.result.current.approveKnowledgeReference(request());
    await waitFor(() => expect(reached).toHaveBeenCalledTimes(1));
    act(() => ui.result.current.addAttachment(ID, {
      type: "file_ref", title: "2dBrain · personal.ict.ai",
      content: JSON.stringify(approvedReference("implementation")),
    }));
    gate.resolve();
    await expect(task).rejects.toMatchObject({ code: "reference_conflict" });
    expect(ui.result.current.projects[0].attachments).toHaveLength(1);
  });

  it("only resolves 'added' after the corresponding persistence write completes", async () => {
    const ui = await hydratedStore();
    const saveGate = deferred();
    persistence.save.mockImplementation((projects) => {
      persistence.writes.push(structuredClone(projects));
      return projects[0]?.attachments?.length ? saveGate.promise : Promise.resolve();
    });
    const task = ui.result.current.approveKnowledgeReference(request());
    let finished = false;
    task.finally(() => { finished = true; });
    await waitFor(() => expect(
      persistence.writes.some((list) => list[0]?.attachments?.length === 1)
    ).toBe(true));
    expect(finished).toBe(false);
    saveGate.resolve();
    await expect(task).resolves.toBe("added");
    expect(finished).toBe(true);
  });

  it("never reports a durable save when the storage provider fails", async () => {
    const ui = await hydratedStore();
    persistence.save.mockImplementation(async (projects) => {
      if (projects[0]?.attachments?.length) throw new Error("disk full");
    });
    await expect(ui.result.current.approveKnowledgeReference(request()))
      .rejects.toMatchObject({ code: "persistence_failed" });
    await waitFor(() => expect(ui.result.current.projects[0].attachments).toHaveLength(0));
  });

  it("cancelling while a persistence write is pending removes only its unconfirmed attachment", async () => {
    const ui = await hydratedStore();
    const gate = deferred();
    persistence.save.mockImplementation((projects) =>
      projects[0]?.attachments?.length ? gate.promise : Promise.resolve());
    const controller = new AbortController();
    const task = ui.result.current.approveKnowledgeReference(request({
      signal: controller.signal,
    }));
    await waitFor(() => expect(ui.result.current.projects[0].attachments).toHaveLength(1));
    controller.abort();
    gate.resolve();
    await expect(task).rejects.toMatchObject({ code: "approval_cancelled" });
    await waitFor(() => expect(ui.result.current.projects[0].attachments).toHaveLength(0));
  });
});
