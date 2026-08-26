import { useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import {
  PORTABLE_SNAPSHOT_DECISION,
  PORTABLE_SNAPSHOT_REVIEW_STATE,
} from "../../../services/portableBackupReview";
import { formatDateTime } from "../../../services/dateTimePresentation";

const MAX_PREVIEW_LENGTH = 160;

function previewComparisonValue(entry, t) {
  if (!entry?.present) return t("settings.backup.review.comparison.value.absent");
  if (entry.value === null) return "null";

  const value = typeof entry.value === "string"
    ? entry.value
    : JSON.stringify(entry.value);
  const readable = value || t("settings.backup.review.comparison.value.empty");

  return readable.length > MAX_PREVIEW_LENGTH
    ? `${readable.slice(0, MAX_PREVIEW_LENGTH)}…`
    : readable;
}

function ProjectComparison({ comparison, error, t }) {
  if (error) {
    return (
      <div className="bundle-restore-message bundle-restore-error" role="alert">
        {t("settings.backup.review.comparison.error")}
      </div>
    );
  }

  if (!comparison) return null;

  const summaryEntries = [
    ["identical", comparison.summary.identical],
    ["added", comparison.summary.added],
    ["deleted", comparison.summary.deleted],
    ["modified", comparison.summary.modified],
    ["conflicts", comparison.summary.conflicts],
    ["unverified", comparison.summary.unverified],
  ];

  return (
    <details className="snapshot-project-comparison">
      <summary>{t("settings.backup.review.comparison.open")}</summary>
      <div className="snapshot-project-comparison-content">
        <p className={`snapshot-comparison-baseline snapshot-comparison-baseline-${comparison.baseline.status}`}>
          {t(`settings.backup.review.comparison.baseline.${comparison.baseline.status}`, {
            snapshotId: comparison.baseline.snapshotId,
          })}
        </p>

        <dl className="bundle-restore-stats snapshot-comparison-stats">
          {summaryEntries.map(([name, value]) => (
            <div key={name}>
              <dt>{t(`settings.backup.review.comparison.summary.${name}`)}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="snapshot-comparison-projects">
          {comparison.projects.map((project) => (
            <details className={`snapshot-comparison-project snapshot-comparison-project-${project.state}`} key={project.projectId}>
              <summary>
                <span>{project.title}</span>
                <span className="snapshot-review-badge">
                  {t(`settings.backup.review.comparison.state.${project.state}`)}
                </span>
              </summary>

              <div className="snapshot-comparison-project-content">
                {project.decisions.length > 0 ? (
                  <p className="snapshot-comparison-decisions">
                    <strong>{t("settings.backup.review.comparison.decisions")}</strong>{" "}
                    {project.decisions.map((decision) => (
                      <span className="snapshot-comparison-decision" key={decision}>
                        {t(`settings.backup.review.comparison.decision.${decision}`)}
                      </span>
                    ))}
                  </p>
                ) : (
                  <p className="muted">{t("settings.backup.review.comparison.noDecision")}</p>
                )}

                {project.changes.length > 0 && (
                  <div className="snapshot-comparison-table-wrapper">
                    <table className="snapshot-comparison-table">
                      <thead>
                        <tr>
                          <th>{t("settings.backup.review.comparison.field")}</th>
                          <th>{t("settings.backup.review.comparison.origin")}</th>
                          <th>{t("settings.backup.review.comparison.base")}</th>
                          <th>{t("settings.backup.review.comparison.local")}</th>
                          <th>{t("settings.backup.review.comparison.external")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {project.changes.map((change) => (
                          <tr key={`${project.projectId}-${change.path}`}>
                            <th scope="row"><code>{change.path}</code></th>
                            <td>{t(`settings.backup.review.comparison.change.${change.state}`)}</td>
                            <td><code>{previewComparisonValue(change.base, t)}</code></td>
                            <td><code>{previewComparisonValue(change.local, t)}</code></td>
                            <td><code>{previewComparisonValue(change.external, t)}</code></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </details>
          ))}
        </div>

        <p className="muted snapshot-comparison-notice">
          {t("settings.backup.review.comparison.previewOnly")}
        </p>
      </div>
    </details>
  );
}

function ReviewCandidate({
  candidate,
  isBusy,
  onDecision,
  locale,
  t,
}) {
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const isSame = candidate.state === PORTABLE_SNAPSHOT_REVIEW_STATE.SAME;

  return (
    <article className={`snapshot-review-card snapshot-review-${candidate.state}`}>
      <div className="snapshot-review-card-header">
        <div>
          <strong>{candidate.deviceLabel}</strong>
          <div className="muted">{formatDateTime(candidate.createdAt, locale)}</div>
        </div>
        <span className="snapshot-review-badge">
          {t(`settings.backup.review.state.${candidate.state}`)}
        </span>
      </div>

      <p className="snapshot-review-explanation">
        {t(`settings.backup.review.explanation.${candidate.state}`)}
      </p>

      <dl className="bundle-restore-stats snapshot-review-stats">
        <div>
          <dt>{t("settings.backup.review.stats.projects")}</dt>
          <dd>{candidate.projectCount}</dd>
        </div>
        <div>
          <dt>{t("settings.backup.review.stats.new")}</dt>
          <dd>{candidate.newCount}</dd>
        </div>
        <div>
          <dt>{t("settings.backup.review.stats.replaced")}</dt>
          <dd>{candidate.conflictCount}</dd>
        </div>
        <div>
          <dt>{t("settings.backup.review.stats.removed")}</dt>
          <dd>{candidate.removedCount}</dd>
        </div>
      </dl>

      <ProjectComparison
        comparison={candidate.projectComparison}
        error={candidate.comparisonError}
        t={t}
      />

      {isConfirming && (
        <div className="snapshot-restore-confirmation">
          <strong>{t("settings.backup.review.confirm.title")}</strong>
          <p>{t("settings.backup.review.confirm.description", {
            replaced: candidate.conflictCount,
            removed: candidate.removedCount,
          })}</p>
          <label>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            <span>{t("settings.backup.review.confirm.acknowledge")}</span>
          </label>
          <div className="folder-actions">
            <button
              className="btn btn-primary"
              type="button"
              disabled={isBusy || !confirmed}
              onClick={() => onDecision(
                candidate,
                PORTABLE_SNAPSHOT_DECISION.RESTORE,
                { confirmed: true }
              )}
            >
              {t("settings.backup.review.confirm.apply")}
            </button>
            <button
              className="btn btn-secondary"
              type="button"
              disabled={isBusy}
              onClick={() => {
                setIsConfirming(false);
                setConfirmed(false);
              }}
            >
              {t("settings.backup.review.confirm.cancel")}
            </button>
          </div>
        </div>
      )}

      {!isConfirming && (
        <div className="folder-actions">
          {!isSame && (
            <>
              <button
                className="btn btn-secondary"
                type="button"
                disabled={isBusy}
                onClick={() => setIsConfirming(true)}
              >
                {t("settings.backup.review.actions.restore")}
              </button>
              <button
                className="btn btn-primary"
                type="button"
                disabled={isBusy || candidate.projectCount === 0}
                onClick={() => onDecision(candidate, PORTABLE_SNAPSHOT_DECISION.COPY)}
              >
                {t("settings.backup.review.actions.copy")}
              </button>
            </>
          )}
          <button
            className="btn btn-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => onDecision(candidate, PORTABLE_SNAPSHOT_DECISION.KEEP)}
          >
            {t("settings.backup.review.actions.keep")}
          </button>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={isBusy}
            onClick={() => onDecision(candidate, PORTABLE_SNAPSHOT_DECISION.IGNORE)}
          >
            {t("settings.backup.review.actions.ignore")}
          </button>
        </div>
      )}
    </article>
  );
}

export default function BackupSnapshotReviewPanel({
  status,
  review,
  onInspect,
  onDecision,
}) {
  const { t, locale } = useI18n();
  const [isBusy, setIsBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const canInspect = status?.isConnected && status?.permission === "granted";

  async function inspect() {
    setIsBusy(true);
    setFeedback(null);

    try {
      await onInspect();
    } catch {
      setFeedback({
        kind: "error",
        message: t("settings.backup.review.errors.inspection"),
      });
    } finally {
      setIsBusy(false);
    }
  }

  async function decide(candidate, action, options = {}) {
    setIsBusy(true);
    setFeedback(null);

    try {
      const result = await onDecision(candidate, action, options);
      setFeedback({
        kind: "success",
        message: t(`settings.backup.review.result.${action}`, result),
      });
    } catch (error) {
      const code = error?.code === "confirmation_required"
        ? "confirmation"
        : "decision";
      setFeedback({
        kind: "error",
        message: t(`settings.backup.review.errors.${code}`),
      });
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section className="panel settings-snapshot-review-panel">
      <div>
        <div className="eyebrow">{t("settings.backup.review.eyebrow")}</div>
        <h2>{t("settings.backup.review.title")}</h2>
        <p className="hero-text">{t("settings.backup.review.description")}</p>
      </div>

      <div className="folder-actions">
        <button
          className="btn btn-secondary"
          type="button"
          disabled={!canInspect || isBusy}
          onClick={inspect}
        >
          {t(
            isBusy
              ? "settings.backup.review.actions.inspecting"
              : "settings.backup.review.actions.inspect"
          )}
        </button>
      </div>

      {feedback && (
        <div
          className={`bundle-restore-message bundle-restore-${feedback.kind}`}
          role={feedback.kind === "error" ? "alert" : "status"}
        >
          {feedback.message}
        </div>
      )}

      {review && (
        <div className="snapshot-review-results" aria-live="polite">
          <strong>{t(`settings.backup.review.summary.${review.state}`)}</strong>

          {review.candidates.map((candidate) => (
            <ReviewCandidate
              key={candidate.snapshotId}
              candidate={candidate}
              isBusy={isBusy}
              onDecision={decide}
              locale={locale}
              t={t}
            />
          ))}

          {review.unreadable.map((entry) => (
            <div
              key={entry.reference}
              className="bundle-restore-message bundle-restore-error"
              role="alert"
            >
              {t("settings.backup.review.unreadable", {
                reference: entry.reference,
              })}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
