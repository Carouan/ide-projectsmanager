import { useMemo, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  createGovernedProjectId,
  createGovernedProjectPackage,
} from "../../../services/governedProjectBootstrap";
import { downloadJsonFile } from "../../../services/jsonTransfer";

const INITIAL_DRAFT = Object.freeze({
  title: "",
  objective: "",
  context: "",
  repositoryFullName: "",
  visibility: "private",
  deliverables: "",
  successCriteria: "",
  includedScope: "",
  excludedScope: "",
  constraints: "",
});

function downloadPreparedFile(file) {
  const blob = new Blob([file.content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = url;
  anchor.download = file.path;
  anchor.click();
  URL.revokeObjectURL(url);
}

export default function GovernedProjectBootstrapScreen({
  onBack,
  onCreateProject,
}) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(() => ({ ...INITIAL_DRAFT }));
  const [projectId] = useState(() => createGovernedProjectId());
  const [createdAt] = useState(() => new Date().toISOString());
  const [errorCode, setErrorCode] = useState(null);

  const preparedPackage = useMemo(() => {
    try {
      return createGovernedProjectPackage(draft, { projectId, createdAt });
    } catch {
      return null;
    }
  }, [createdAt, draft, projectId]);

  function updateField(event) {
    const { name, value } = event.target;
    setDraft((current) => ({ ...current, [name]: value }));
    setErrorCode(null);
  }

  function submit(event) {
    event.preventDefault();

    try {
      const safePackage = createGovernedProjectPackage(draft, {
        projectId,
        createdAt,
      });
      onCreateProject(safePackage);
    } catch (error) {
      setErrorCode(error?.code || "generic");
    }
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="project-actions governed-bootstrap-navigation">
          <button className="btn btn-secondary" onClick={onBack} type="button">
            {t("governed.actions.back")}
          </button>
        </div>

        <div className="hero">
          <div>
            <div className="eyebrow">{t("governed.eyebrow")}</div>
            <h1>{t("governed.title")}</h1>
            <p className="hero-text">{t("governed.description")}</p>
          </div>
        </div>

        <form className="governed-bootstrap-layout" onSubmit={submit}>
          <section className="panel governed-bootstrap-form">
            <div className="panel-header">
              <h2>{t("governed.mandate.title")}</h2>
            </div>

            <div className="form-grid">
              <label className="field field-full">
                <span>{t("governed.fields.title")}</span>
                <input name="title" onChange={updateField} value={draft.title} />
              </label>

              <label className="field field-full">
                <span>{t("governed.fields.objective")}</span>
                <textarea
                  name="objective"
                  onChange={updateField}
                  rows={3}
                  value={draft.objective}
                />
              </label>

              <label className="field field-full">
                <span>{t("governed.fields.context")}</span>
                <textarea
                  name="context"
                  onChange={updateField}
                  rows={4}
                  value={draft.context}
                />
              </label>

              <label className="field">
                <span>{t("governed.fields.repository")}</span>
                <input
                  name="repositoryFullName"
                  onChange={updateField}
                  placeholder="Carouan/mon-projet"
                  value={draft.repositoryFullName}
                />
              </label>

              <label className="field">
                <span>{t("governed.fields.visibility")}</span>
                <select
                  name="visibility"
                  onChange={updateField}
                  value={draft.visibility}
                >
                  <option value="private">{t("governed.visibility.private")}</option>
                  <option value="public">{t("governed.visibility.public")}</option>
                </select>
              </label>

              <label className="field">
                <span>{t("governed.fields.deliverables")}</span>
                <textarea
                  name="deliverables"
                  onChange={updateField}
                  rows={4}
                  value={draft.deliverables}
                />
                <small>{t("governed.fields.onePerLine")}</small>
              </label>

              <label className="field">
                <span>{t("governed.fields.successCriteria")}</span>
                <textarea
                  name="successCriteria"
                  onChange={updateField}
                  rows={4}
                  value={draft.successCriteria}
                />
                <small>{t("governed.fields.onePerLine")}</small>
              </label>

              <label className="field">
                <span>{t("governed.fields.includedScope")}</span>
                <textarea
                  name="includedScope"
                  onChange={updateField}
                  rows={3}
                  value={draft.includedScope}
                />
              </label>

              <label className="field">
                <span>{t("governed.fields.excludedScope")}</span>
                <textarea
                  name="excludedScope"
                  onChange={updateField}
                  rows={3}
                  value={draft.excludedScope}
                />
              </label>

              <label className="field field-full">
                <span>{t("governed.fields.constraints")}</span>
                <textarea
                  name="constraints"
                  onChange={updateField}
                  rows={3}
                  value={draft.constraints}
                />
              </label>
            </div>

            {errorCode && (
              <p className="bundle-restore-message bundle-restore-error" role="alert">
                {t("governed.errors." + errorCode)}
              </p>
            )}

            <div className="project-actions governed-bootstrap-actions">
              <button className="btn btn-primary" type="submit">
                {t("governed.actions.create")}
              </button>
              <button className="btn btn-secondary" onClick={onBack} type="button">
                {t("governed.actions.cancel")}
              </button>
            </div>
          </section>

          <aside className="panel governed-package-preview">
            <h2>{t("governed.preview.title")}</h2>
            <p className="muted">{t("governed.preview.description")}</p>
            <p className="governed-no-remote">{t("governed.preview.noRemote")}</p>

            {preparedPackage ? (
              <>
                <dl className="governed-package-identity">
                  <div>
                    <dt>{t("governed.preview.projectId")}</dt>
                    <dd>{preparedPackage.projectId}</dd>
                  </div>
                  <div>
                    <dt>{t("governed.preview.repository")}</dt>
                    <dd>{preparedPackage.repository.fullName}</dd>
                  </div>
                </dl>

                <div className="governed-package-files">
                  {preparedPackage.files.map((file) => (
                    <details className="governed-file-preview" key={file.path}>
                      <summary>{file.path}</summary>
                      <pre>{file.content}</pre>
                      <button
                        className="btn btn-secondary"
                        onClick={() => downloadPreparedFile(file)}
                        type="button"
                      >
                        {t("governed.actions.downloadFile")}
                      </button>
                    </details>
                  ))}
                </div>

                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    downloadJsonFile(
                      "governed-project-" + projectId + ".json",
                      preparedPackage
                    )
                  }
                  type="button"
                >
                  {t("governed.actions.exportPackage")}
                </button>
              </>
            ) : (
              <p className="muted">{t("governed.preview.waiting")}</p>
            )}
          </aside>
        </form>
      </div>
    </div>
  );
}
