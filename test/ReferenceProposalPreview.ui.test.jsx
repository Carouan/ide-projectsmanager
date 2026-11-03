// @vitest-environment jsdom
import { createHash, webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/useI18n.jsx";
import ReferenceProposalPreview from "../src/features/projects/components/ReferenceProposalPreview.jsx";

const PROJECT_ID = "fa382c5b-6069-4b1b-9b92-0458b9487a76";
const OTHER_ID = "580988e4-f5ef-46d7-a6f6-62955564a0e2";

function referenceProposal(overrides = {}) {
  const sourceSha = "b".repeat(64);
  const ref = createHash("sha256")
    .update("2dbrain-local-proposal-v1:" + sourceSha).digest("hex");
  return {
    format: "ide-2dbrain.reference-proposal.v1", version: 1,
    mode: "proposal_only", status: "pending",
    source: {
      provider: "local_personal", origin: "obsidian",
      ref, format: "markdown", size_bytes: 54, metadata_keys: ["title"],
    },
    classification: {
      category_id: "personal.ict.ai", kind: "knowledge", mapping_status: "mapped",
    },
    provenance: {
      source_sha256: sourceSha, taxonomy_sha256: "c".repeat(64),
      taxonomy_version: "0.2.0", extracted_at: "2026-11-03T07:30:00+00:00",
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null, relation: null,
    access_granted: false, import_ready: false,
    rag_eligible: false, ide_import_performed: false,
    ...overrides,
  };
}

function fixtureFile(text, name = "proposal.jsonl") {
  const bytes = new TextEncoder().encode(text);
  return {
    name, size: bytes.byteLength,
    arrayBuffer: vi.fn(async () => bytes.buffer),
  };
}

const projects = Object.freeze([
  Object.freeze({ project: Object.freeze({ id: PROJECT_ID, title: "Existing project" }) }),
  Object.freeze({ project: Object.freeze({ id: OTHER_ID, title: "Second project" }) }),
]);

function renderPanel(projectDocuments = projects) {
  return render(
    <I18nProvider locale="fr">
      <ReferenceProposalPreview projectDocuments={projectDocuments} />
    </I18nProvider>,
  );
}

function inputFile(file) {
  fireEvent.change(screen.getByLabelText(/Choisir un export local/), {
    target: { files: [file] },
  });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.stubGlobal("crypto", webcrypto);
  vi.stubGlobal("TextEncoder", TextEncoder);
  vi.stubGlobal("TextDecoder", TextDecoder);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("2dBrain React read-only preview", () => {
  it("loads JSONL asynchronously, selects an existing UUID and never mutates storage", async () => {
    const storageSpy = vi.spyOn(Storage.prototype, "setItem");
    const idbSpy = vi.fn();
    vi.stubGlobal("indexedDB", { open: idbSpy });
    const selected = fixtureFile(JSON.stringify(referenceProposal()) + "\n");
    renderPanel();
    expect(screen.queryByText("Proposition contrôlée")).toBeNull();
    inputFile(selected);
    await screen.findByText("Proposition contrôlée");
    expect(selected.arrayBuffer).toHaveBeenCalledTimes(1);
    expect(screen.getByText(/Catégorie : personal.ict.ai/)).toBeTruthy();
    const selector = screen.getByLabelText(/Projet IDE existant/);
    expect(selector.value).toBe("");
    expect(selector.options.length).toBe(3);
    fireEvent.change(selector, { target: { value: PROJECT_ID } });
    expect(screen.getByText(new RegExp(PROJECT_ID))).toBeTruthy();
    expect(screen.getByText(/Aucune liaison enregistrée/)).toBeTruthy();
    expect(storageSpy).not.toHaveBeenCalled();
    expect(idbSpy).not.toHaveBeenCalled();
    expect(projects[0].project.title).toBe("Existing project");
  });

  it("cancels a pending read and ignores late completion", async () => {
    const pending = deferred();
    const file = fixtureFile(JSON.stringify(referenceProposal()));
    file.arrayBuffer = vi.fn(() => pending.promise);
    renderPanel();
    inputFile(file);
    expect(screen.getByText("Vérification de la proposition…")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Effacer cet aperçu" }));
    pending.resolve(new TextEncoder().encode(JSON.stringify(referenceProposal())).buffer);
    await waitFor(() => {
      expect(screen.queryByText("Vérification de la proposition…")).toBeNull();
      expect(screen.queryByText("Proposition contrôlée")).toBeNull();
    });
  });

  it("replaces an in-flight request without showing the earlier file", async () => {
    const pending = deferred();
    const older = fixtureFile(JSON.stringify(referenceProposal()));
    older.arrayBuffer = vi.fn(() => pending.promise);
    const current = fixtureFile(JSON.stringify(referenceProposal({
      classification: { category_id: "personal.ict.app", kind: "knowledge", mapping_status: "mapped" },
    })));
    renderPanel();
    inputFile(older);
    inputFile(current);
    await screen.findByText(/Catégorie : personal.ict.app/);
    pending.resolve(new TextEncoder().encode(JSON.stringify(referenceProposal())).buffer);
    await waitFor(() => expect(screen.getByText(/Catégorie : personal.ict.app/)).toBeTruthy());
    expect(screen.queryByText(/Catégorie : personal.ict.ai/)).toBeNull();
  });

  it("rejects malformed JSON, implicit approvals and tampered provenance", async () => {
    renderPanel();
    inputFile(fixtureFile(JSON.stringify(referenceProposal())));
    await screen.findByText("Proposition contrôlée");
    const cases = [
      ["{broken", /Le contenu n’est pas un JSON valide/],
      [JSON.stringify(referenceProposal({ access_granted: true })), /approbation ou un droit implicite interdit/],
      [JSON.stringify(referenceProposal({
        source: { ...referenceProposal().source, ref: "a".repeat(64) },
      })), /Empreinte ou provenance/],
    ];
    for (const [content, expectedError] of cases) {
      inputFile(fixtureFile(content));
      await waitFor(() => expect(screen.getByRole("alert").textContent).toMatch(expectedError));
      expect(screen.queryByText("Proposition contrôlée")).toBeNull();
      expect(screen.queryByLabelText(/Projet IDE existant/)).toBeNull();
    }
    fireEvent.click(screen.getByRole("button", { name: "Effacer cet aperçu" }));
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("recovers from a failed asynchronous read without leaking its exception", async () => {
    renderPanel();
    const failed = fixtureFile("ignored");
    failed.arrayBuffer = vi.fn(async () => { throw new Error("private path"); });
    inputFile(failed);
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("contrat attendu"));
    expect(screen.getByRole("alert").textContent).not.toContain("private path");
    inputFile(fixtureFile(JSON.stringify(referenceProposal())));
    await screen.findByText("Proposition contrôlée");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("flags a selected project that disappears after preview", async () => {
    const ui = renderPanel();
    inputFile(fixtureFile(JSON.stringify(referenceProposal())));
    await screen.findByText("Proposition contrôlée");
    fireEvent.change(screen.getByLabelText(/Projet IDE existant/), {
      target: { value: OTHER_ID },
    });
    expect(screen.getByText(new RegExp(OTHER_ID))).toBeTruthy();
    ui.rerender(
      <I18nProvider locale="fr">
        <ReferenceProposalPreview projectDocuments={[projects[0]]} />
      </I18nProvider>,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/n’existe plus/);
    expect(screen.queryByText(new RegExp(OTHER_ID))).toBeNull();
  });
});
