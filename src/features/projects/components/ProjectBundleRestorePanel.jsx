import { useRef, useState } from "react";
import { PROJECT_BUNDLE_CONFLICT_STRATEGY } from "../../../services/jsonTransfer";
import { useI18n } from "../../../i18n/useI18n";

const KNOWN_ERROR_CODES = new Set([
  "invalid_bundle",
  "unsupported_format",
  "unsupported_version",
  "invalid_export_date",
  "invalid_projects",
  "invalid_project_count",
  "invalid_project",
  "duplicate_project_id",
  "invalid_conflict_strategy",
  "copy_id_generation_failed",
]);

export default function ProjectBundleRestorePanel({
  onInspectProjectBundle,
  onRestoreProjectBundle,
}) {
  const { t } = useI18n();
  const fileInputRef = useRef(null);
  const [inspection, setInspection] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const [conflictStrategy, setConflictStrategy] = useState(
    PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP
  );
  const [result, setResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [isInspecting, setIsInspecting] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  function translateError(error) {
    const code = KNOWN_ERROR_CODES.has(error?.code) ? error.code : "generic";
    return t(`settings.backup.restore.errors.${code}`);
  }

  async function handleFileChange(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsInspecting(true);
    setInspection(null);
    setResult(null);
    setErrorMessage("");
    setSelectedFileName(file.name);
    setConflictStrategy(PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP);

    try {
      const nextInspection = await onInspectProjectBundle(file);
      setInspection(nextInspection);
    } catch (error) {
      setErrorMessage(translateError(error));
    } finally {
      setIsInspecting(false);
      event.target.value = "";
    }
  }

  async function handleRestore() {
    if (!inspection) return;

    setIsRestoring(true);
    setResult(null);
    setErrorMessage("");

    try {
      const summary = await onRestoreProjectBundle(
        inspection,
        conflictStrategy
      );
      setResult(summary);
      setInspection(null);
      setSelectedFileName("");
    } catch (error) {
      setErrorMessage(translateError(error));
    } finally {
      setIsRestoring(false);
    }
  }

  const restoreWouldChangeNothing = inspection
    && inspection.newCount === 0
    && (
      inspection.conflictCount === 0
      || conflictStrategy === PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP
    );

  return (
    <section className="panel settings-restore-panel">
      <div>
        <div className="eyebrow">{t("settings.backup.restore.eyebrow")}</div>
        <h2>{t("settings.backup.restore.title")}</h2>
        <p className="hero-text">
          {t("settings.backup.restore.description")}
        </p>
      </div>

      <div className="bundle-restore-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={isInspecting || isRestoring}
          onClick={() => fileInputRef.current?.click()}
        >
          {isInspecting
            ? t("settings.backup.restore.inspecting")
            : t("settings.backup.restore.chooseFile")}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          className="visually-hidden"
          aria-label={t("settings.backup.restore.chooseFile")}
          onChange={handleFileChange}
        />
      </div>

      {errorMessage ? (
        <div className="bundle-restore-message bundle-restore-error" role="alert">
          {errorMessage}
        </div>
      ) : null}

      {result ? (
        <div className="bundle-restore-message bundle-restore-success" role="status">
          {t("settings.backup.restore.result", result)}
        </div>
      ) : null}

      {inspection ? (
        <div className="bundle-restore-preview" aria-live="polite">
          <div>
            <strong>{t("settings.backup.restore.previewTitle")}</strong>
            <div className="muted">{selectedFileName}</div>
          </div>

          <dl className="bundle-restore-stats">
            <div>
              <dt>{t("settings.backup.restore.total")}</dt>
              <dd>{inspection.projectCount}</dd>
            </div>
            <div>
              <dt>{t("settings.backup.restore.new")}</dt>
              <dd>{inspection.newCount}</dd>
            </div>
            <div>
              <dt>{t("settings.backup.restore.conflicts")}</dt>
              <dd>{inspection.conflictCount}</dd>
            </div>
          </dl>

          {inspection.projectCount === 0 ? (
            <p className="muted">{t("settings.backup.restore.empty")}</p>
          ) : null}

          {inspection.conflictCount > 0 ? (
            <fieldset className="bundle-restore-strategies">
              <legend>{t("settings.backup.restore.strategyTitle")}</legend>
              <label>
                <input
                  type="radio"
                  name="bundle-conflict-strategy"
                  value={PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP}
                  checked={conflictStrategy === PROJECT_BUNDLE_CONFLICT_STRATEGY.SKIP}
                  onChange={(event) => setConflictStrategy(event.target.value)}
                />
                <span>
                  <strong>{t("settings.backup.restore.strategy.skip.title")}</strong>
                  <small>{t("settings.backup.restore.strategy.skip.description")}</small>
                </span>
              </label>
              <label>
                <input
                  type="radio"
                  name="bundle-conflict-strategy"
                  value={PROJECT_BUNDLE_CONFLICT_STRATEGY.COPY}
                  checked={conflictStrategy === PROJECT_BUNDLE_CONFLICT_STRATEGY.COPY}
                  onChange={(event) => setConflictStrategy(event.target.value)}
                />
                <span>
                  <strong>{t("settings.backup.restore.strategy.copy.title")}</strong>
                  <small>{t("settings.backup.restore.strategy.copy.description")}</small>
                </span>
              </label>
            </fieldset>
          ) : null}

          <div className="bundle-restore-actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isRestoring || restoreWouldChangeNothing}
              onClick={handleRestore}
            >
              {isRestoring
                ? t("settings.backup.restore.restoring")
                : t("settings.backup.restore.apply")}
            </button>
            {restoreWouldChangeNothing && inspection.projectCount > 0 ? (
              <span className="muted">
                {t("settings.backup.restore.noChange")}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}
    </section>
  );
}
