// @vitest-environment jsdom
import { createHash, webcrypto } from "node:crypto";
import { TextDecoder, TextEncoder } from "node:util";
import { useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { I18nProvider } from "../src/i18n/useI18n.jsx";
import ReferenceProposalPreview from "../src/features/projects/components/ReferenceProposalPreview.jsx";
import AttachmentsPanel from "../src/components/AttachmentsPanel.jsx";
import {
  addApprovedReferenceToProjects,
  prepareKnowledgeReference,
} from "../src/services/knowledgeReferences.js";

const ID = "8ccf0c84-f47f-4683-8903-60fc90145630";
const OTHER_ID = "f82cb2cc-b9af-4eb5-815d-207866dd8e29";

function makeProposal(extractedAt = new Date().toISOString()) {
  const sha = "a".repeat(64);
  return {
    format: "ide-2dbrain.reference-proposal.v1", version: 1,
    mode: "proposal_only", status: "pending",
    source: {
      provider: "local_personal", origin: "obsidian",
      ref: createHash("sha256").update("2dbrain-local-proposal-v1:" + sha).digest("hex"),
      format: "markdown", size_bytes: 100, metadata_keys: ["tags"],
    },
    classification: {
      category_id: "personal.ict.ai", kind: "knowledge", mapping_status: "mapped",
    },
    provenance: {
      source_sha256: sha, taxonomy_sha256: "b".repeat(64),
      taxonomy_version: "0.2.0", extracted_at: extractedAt,
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null, relation: null, access_granted: false,
    import_ready: false, rag_eligible: false, ide_import_performed: false,
  };
}

function chooseProposal(data = makeProposal()) {
  const raw = new TextEncoder().encode(JSON.stringify(data));
  fireEvent.change(screen.getByLabelText(/Choisir un export local/), {
    target: { files: [{ size: raw.byteLength, arrayBuffer: async () => raw.buffer }] },
  });
}

function Demo({ approveOverride }) {
  const [docs, setDocs] = useState([
    { project: { id: ID, title: "Projet de test" }, attachments: [] },
    { project: { id: OTHER_ID, title: "Autre projet" }, attachments: [] },
  ]);
  async function approve(request) {
    if (approveOverride) return approveOverride(request);
    const reference = await prepareKnowledgeReference(request.proposal, request);
    if (request.signal?.aborted) return "cancelled";
    const result = addApprovedReferenceToProjects(docs, request.projectId, reference);
    setDocs((current) => request.signal?.aborted ? current
      : addApprovedReferenceToProjects(current, request.projectId, reference).projects);
    return result.status;
  }
  return (
    <I18nProvider locale="fr">
      <ReferenceProposalPreview projectDocuments={docs} onApproveReference={approve} />
      <AttachmentsPanel projectId={ID} attachments={docs[0].attachments}
        onAddAttachment={() => { throw new Error("unexpected add"); }}
        onUpdateAttachment={() => { throw new Error("unexpected edit"); }}
        onRemoveAttachment={(projectId, attachmentId) => {
          setDocs((current) => current.map((doc) => doc.project.id !== projectId
            ? doc : { ...doc, attachments: doc.attachments.filter((a) => a.id !== attachmentId) }));
        }} />
    </I18nProvider>
  );
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

async function showProposal() {
  chooseProposal();
  await screen.findByText("Proposition contrôlée");
  fireEvent.change(screen.getByLabelText(/Projet IDE existant/), {
    target: { value: ID },
  });
}

describe("C1 explicit approval UI", () => {
  it("never presents a tampered or incomplete restored attachment as approved", () => {
    const proposal = makeProposal();
    const valid = {
      format: "ide-2dbrain.approved-reference.v1", version: 1,
      status: "approved", relation: "research",
      source: { ...proposal.source, ref: "f".repeat(64) },
      classification: proposal.classification,
      provenance: proposal.provenance,
      approvedAt: new Date().toISOString(),
    };
    for (const content of [JSON.stringify(valid), JSON.stringify({
      ...valid, provenance: undefined,
    })]) {
      const ui = render(
        <I18nProvider locale="fr">
          <AttachmentsPanel projectId={ID} attachments={[{
            id: "att_tampered", type: "file_ref", title: "2dBrain · personal.ict.ai",
            description: "2dBrain: research", content, createdAt: new Date().toISOString(),
          }]}
            onAddAttachment={() => { throw new Error("unexpected mutation"); }}
            onUpdateAttachment={() => { throw new Error("unexpected mutation"); }}
            onRemoveAttachment={() => { throw new Error("unexpected mutation"); }}
          />
        </I18nProvider>,
      );
      expect(screen.getByRole("alert").textContent).toMatch(/invalide ou altérée/);
      expect(screen.queryByText("Référence 2dBrain approuvée")).toBeNull();
      expect(screen.queryByRole("button", { name: "Modifier" })).toBeNull();
      expect(screen.getByRole("button", { name: "Supprimer" })).toBeTruthy();
      ui.unmount();
    }
  });

  it("requires project, relationship and distinct checkbox before saving one persistent attachment", async () => {
    render(<Demo />);
    await showProposal();
    const confirm = screen.getByRole("button", { name: /Confirmer et enregistrer ce lien/ });
    expect(confirm.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText(/Type de relation/), {
      target: { value: "research" },
    });
    expect(confirm.disabled).toBe(true);
    fireEvent.click(screen.getByLabelText(/Je confirme ce lien/));
    expect(confirm.disabled).toBe(false);
    fireEvent.click(confirm);
    await screen.findByText("Référence 2dBrain approuvée");
    expect(screen.getByText(/Relation : research/)).toBeTruthy();
    expect(screen.getByText(/Référence enregistrée dans les pièces jointes/)).toBeTruthy();
    fireEvent.click(confirm);
    await screen.findByText(/Aucun doublon ajouté/);
    expect(screen.getAllByText("Référence 2dBrain approuvée")).toHaveLength(1);
    expect(screen.queryByText(/C:\\Users/)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Supprimer/ }));
    await waitFor(() => expect(screen.queryByText("Référence 2dBrain approuvée")).toBeNull());
  });

  it("cancellation, invalid relationship and new target require a fresh explicit choice", async () => {
    render(<Demo />);
    await showProposal();
    fireEvent.change(screen.getByLabelText(/Type de relation/), {
      target: { value: "reference" },
    });
    fireEvent.click(screen.getByLabelText(/Je confirme ce lien/));
    fireEvent.change(screen.getByLabelText(/Projet IDE existant/), {
      target: { value: OTHER_ID },
    });
    expect(screen.getByRole("button", { name: /Confirmer et enregistrer ce lien/ }).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: "Effacer cet aperçu" }));
    expect(screen.queryByText("Proposition contrôlée")).toBeNull();
    expect(screen.queryByText("Référence 2dBrain approuvée")).toBeNull();
  });

  it("refuses an old proposal without adding any reference", async () => {
    render(<Demo />);
    chooseProposal(makeProposal("2000-01-01T00:00:00Z"));
    await screen.findByText("Proposition contrôlée");
    fireEvent.change(screen.getByLabelText(/Projet IDE existant/), {
      target: { value: ID },
    });
    fireEvent.change(screen.getByLabelText(/Type de relation/), {
      target: { value: "research" },
    });
    fireEvent.click(screen.getByLabelText(/Je confirme ce lien/));
    fireEvent.click(screen.getByRole("button", { name: /Confirmer et enregistrer ce lien/ }));
    await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("périmée"));
    expect(screen.queryByText("Référence 2dBrain approuvée")).toBeNull();
  });

  it("can abort a pending approval without showing a success result", async () => {
    let signal;
    let unblock;
    const deferred = new Promise((resolve) => { unblock = resolve; });
    render(<Demo approveOverride={async (request) => {
      signal = request.signal;
      await deferred;
      return signal.aborted ? "cancelled" : "added";
    }} />);
    await showProposal();
    fireEvent.change(screen.getByLabelText(/Type de relation/), {
      target: { value: "reference" },
    });
    fireEvent.click(screen.getByLabelText(/Je confirme ce lien/));
    fireEvent.click(screen.getByRole("button", { name: /Confirmer et enregistrer ce lien/ }));
    fireEvent.click(screen.getByRole("button", { name: "Effacer cet aperçu" }));
    expect(signal.aborted).toBe(true);
    unblock();
    await waitFor(() => expect(screen.queryByText(/Référence enregistrée dans les pièces jointes/)).toBeNull());
  });
});
