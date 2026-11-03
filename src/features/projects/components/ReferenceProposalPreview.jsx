import { useRef, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  MAX_REFERENCE_PROPOSAL_BYTES,
  ReferenceProposalError,
  parseReferenceProposal,
  resolveReferenceTarget,
  verifyReferenceProposalFingerprint,
} from "../../../services/ide2dbrainPreview.js";

const ERRORS = new Set([
  "too_large", "invalid_encoding", "invalid_json", "multiple_records",
  "invalid_shape", "unsupported_format", "unsupported_version",
  "invalid_source", "invalid_classification", "invalid_provenance",
  "invalid_approval", "unknown_project",
]);

export default function ReferenceProposalPreview({ projectDocuments = [] }) {
  const { t, locale } = useI18n();
  const [proposal, setProposal] = useState(null);
  const [selectedId, setSelectedId] = useState("");
  const [errorCode, setErrorCode] = useState(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const requestId = useRef(0);

  const projectOptions = projectDocuments
    .filter((doc) => typeof doc?.project?.id === "string" && doc.project.id
      && typeof doc?.project?.title === "string");
  const selectedProject = selectedId
    ? (() => {
      try {
        return resolveReferenceTarget(projectOptions, selectedId);
      } catch {
        return null;
      }
    })()
    : null;

  function clearPreview() {
    requestId.current += 1;
    setProposal(null);
    setSelectedId("");
    setErrorCode(null);
    setLoading(false);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function inspectFile(event) {
    const file = event.target.files?.[0];
    const current = ++requestId.current;
    setProposal(null);
    setSelectedId("");
    setErrorCode(null);
    setLoading(Boolean(file));
    if (!file) return;
    try {
      if (file.size > MAX_REFERENCE_PROPOSAL_BYTES) {
        throw new ReferenceProposalError("too_large");
      }
      const bytes = await file.arrayBuffer();
      if (current !== requestId.current) return;
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      const inspected = await verifyReferenceProposalFingerprint(
        parseReferenceProposal(text),
      );
      if (current !== requestId.current) return;
      setProposal(inspected);
    } catch (error) {
      if (current !== requestId.current) return;
      const code = error instanceof TypeError ? "invalid_encoding" : error?.code;
      setErrorCode(ERRORS.has(code) ? code : "invalid_shape");
    } finally {
      if (current === requestId.current) setLoading(false);
      if (current === requestId.current && inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t("ide2dbrain.preview.title")}</h2>
          <p className="muted">{t("ide2dbrain.preview.description")}</p>
        </div>
        <span className="badge">{t("ide2dbrain.preview.readOnly")}</span>
      </div>

      <div className="form-grid">
        <label className="field field-full">
          <span>{t("ide2dbrain.preview.fileLabel")}</span>
          <input ref={inputRef} type="file" accept=".jsonl,.json,application/json"
            onChange={inspectFile} />
        </label>
      </div>
      <p className="muted">{t("ide2dbrain.preview.securityNotice")}</p>

      {loading && <p role="status">{t("ide2dbrain.preview.loading")}</p>}
      {(loading || proposal || errorCode) && (
        <div className="field-actions">
          <button className="btn btn-secondary" type="button" onClick={clearPreview}>
            {t("ide2dbrain.preview.clear")}
          </button>
        </div>
      )}
      {errorCode && (
        <p role="alert">{t(`ide2dbrain.errors.${errorCode}`)}</p>
      )}
      {proposal && (
        <div className="form-grid">
          <div className="field field-full">
            <strong>{t("ide2dbrain.preview.proposalTitle")}</strong>
            <p>{t("ide2dbrain.preview.category", {
              category: proposal.classification.category_id,
            })}</p>
            <p>{t("ide2dbrain.preview.origin", {
              origin: proposal.source.origin,
            })}</p>
            <p>{t("ide2dbrain.preview.status", { status: proposal.status })}</p>
            <p>{t("ide2dbrain.preview.fingerprint", {
              fingerprint: proposal.source.ref.slice(0, 12),
            })}</p>
            <p>{t("ide2dbrain.preview.provenance", {
              time: new Date(proposal.provenance.extracted_at).toLocaleString(locale),
            })}</p>
            <p className="muted">{t("ide2dbrain.preview.freshnessNotice")}</p>
          </div>

          <label className="field field-full">
            <span>{t("ide2dbrain.preview.target")}</span>
            <select value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
              <option value="">{t("ide2dbrain.preview.chooseTarget")}</option>
              {projectOptions.map((doc) => (
                <option key={doc.project.id} value={doc.project.id}>
                  {doc.project.title}
                </option>
              ))}
            </select>
          </label>

          {selectedProject && (
            <p className="field field-full" role="status">
              {t("ide2dbrain.preview.selectedTarget", {
                title: selectedProject.title,
                id: selectedProject.id,
              })}
            </p>
          )}
          {selectedId && !selectedProject && (
            <p role="alert">{t("ide2dbrain.errors.unknown_project")}</p>
          )}
        </div>
      )}
    </section>
  );
}
