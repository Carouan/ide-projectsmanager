import { useState } from "react";
import { STAGE_DEFINITIONS } from "../../../constants/stages.js";
import { createPublicGitHubProjectImportProvider } from "../../../services/repositoryImportAnalysis.js";
import { createPublicRepositoryImportDraft } from "../../../services/publicRepositoryProjectImport.js";
import { useI18n } from "../../../i18n/useI18n.jsx";

const provider = createPublicGitHubProjectImportProvider();

export default function PublicRepositoryImportPanel({ onConfirm }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function cancel() {
    setOpen(false);
    setUrl("");
    setDraft(null);
    setError("");
  }

  async function analyze(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      setDraft(createPublicRepositoryImportDraft(await provider.inspect(url)));
    } catch (caught) {
      setDraft(null);
      setError(t(`repositoryImport.errors.${caught.code || "generic"}`));
    } finally {
      setBusy(false);
    }
  }

  function update(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function confirmImport() {
    setError("");
    try {
      onConfirm(draft);
    } catch (caught) {
      setError(t(`repositoryImport.errors.${caught.code || "generic"}`));
    }
  }

  if (!open) {
    return <button className="btn btn-secondary" type="button" onClick={() => setOpen(true)}>{t("repositoryImport.open")}</button>;
  }

  return (
    <section className="repository-import-panel" aria-labelledby="repository-import-title">
      <div>
        <div className="eyebrow">{t("repositoryImport.eyebrow")}</div>
        <h2 id="repository-import-title">{t("repositoryImport.title")}</h2>
        <p className="muted">{t("repositoryImport.description")}</p>
      </div>
      <form onSubmit={analyze} className="repository-import-form">
        <label>{t("repositoryImport.url")}<input type="url" required value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://github.com/owner/repository" /></label>
        <div className="project-actions">
          <button className="btn btn-primary" disabled={busy}>{busy ? t("repositoryImport.analyzing") : t("repositoryImport.analyze")}</button>
          <button className="btn btn-secondary" type="button" onClick={cancel}>{t("repositoryImport.cancel")}</button>
        </div>
      </form>
      {error && <p className="form-error" role="alert">{error}</p>}
      {draft && (
        <div className="repository-import-preview">
          <div className="repository-import-evidence">
            <strong>{draft.analysis.repository.fullName}</strong>
            <span>{t("repositoryImport.source", { source: draft.analysis.primaryObjectives?.sourcePath || t("repositoryImport.noObjectives") })}</span>
            <span>{t("repositoryImport.confidence", { confidence: t(`repositoryImport.confidence.${draft.analysis.confidence.objectives}`) })}</span>
            <span>{t("repositoryImport.progress", { percent: draft.analysis.primaryObjectives?.objectiveAnalysis.percent ?? "—" })}</span>
          </div>
          <div className="repository-import-fields">
            <label>{t("repositoryImport.fields.title")}<input value={draft.title} onChange={(event) => update("title", event.target.value)} /></label>
            <label>{t("repositoryImport.fields.summary")}<input value={draft.summary} onChange={(event) => update("summary", event.target.value)} /></label>
            <label>{t("repositoryImport.fields.description")}<textarea value={draft.description} onChange={(event) => update("description", event.target.value)} /></label>
            <label>{t("repositoryImport.fields.repository")}<input value={draft.repositoryUrl} onChange={(event) => update("repositoryUrl", event.target.value)} /></label>
            <label>{t("repositoryImport.fields.stage")}<select value={draft.currentStage} onChange={(event) => update("currentStage", event.target.value)}>{STAGE_DEFINITIONS.map((stage) => <option key={stage.key} value={stage.key}>{stage.version} — {stage.title}</option>)}</select></label>
          </div>
          <div className="repository-import-structure">
            <p>{t("repositoryImport.structure", { workstreams: draft.workstreams.length, tasks: draft.tasks.length })}</p>
            {draft.workstreams.map((workstream, index) => <label key={workstream.id}>{t("repositoryImport.workstream", { number: index + 1 })}<input value={workstream.title} onChange={(event) => update("workstreams", draft.workstreams.map((item) => item.id === workstream.id ? { ...item, title: event.target.value } : item))} /></label>)}
            <details><summary>{t("repositoryImport.tasks", { count: draft.tasks.length })}</summary><div className="repository-import-task-list">{draft.tasks.map((task) => <label key={task.id}><span className="muted">{task.provenance.sourcePath}:{task.provenance.line}</span><input value={task.title} onChange={(event) => update("tasks", draft.tasks.map((item) => item.id === task.id ? { ...item, title: event.target.value } : item))} /></label>)}</div></details>
          </div>
          <p className="muted">{t("repositoryImport.confirmNotice")}</p>
          <div className="project-actions">
            <button className="btn btn-primary" type="button" disabled={!draft.title.trim() || !draft.summary.trim()} onClick={confirmImport}>{t("repositoryImport.confirm")}</button>
            <button className="btn btn-secondary" type="button" onClick={cancel}>{t("repositoryImport.cancel")}</button>
          </div>
        </div>
      )}
    </section>
  );
}
