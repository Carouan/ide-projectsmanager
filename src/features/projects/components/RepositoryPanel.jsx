import { useI18n } from "../../../i18n/useI18n";
import { useRepositorySnapshot } from "../hooks/useRepositorySnapshot.js";
import {
  REPOSITORY_ATTENTION,
  getPullRequestHealth,
  getPullRequestOriginSignal,
  getRepositoryPanelState,
  summarizeRepositoryAttention,
} from "../services/repositoryPanelModel.js";

const ATTENTION_LEVELS = [
  REPOSITORY_ATTENTION.INFORMATION,
  REPOSITORY_ATTENTION.DECISION_REQUIRED,
  REPOSITORY_ATTENTION.VALIDATION_REQUIRED,
  REPOSITORY_ATTENTION.BLOCKING_QUESTION,
];

function formatDate(value, locale) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatCacheAge(ageMs, t) {
  if (!Number.isFinite(ageMs)) return t("repository.freshness.unknown");
  if (ageMs < 60_000) return t("repository.freshness.now");

  const minutes = Math.max(1, Math.round(ageMs / 60_000));
  return t("repository.freshness.minutes", { count: minutes });
}

function StateMessage({ state, result, onRefresh }) {
  const { t, locale } = useI18n();
  const retryAt = formatDate(result?.error?.retryAt, locale);

  return (
    <section className="panel repository-panel" aria-live="polite">
      <div className={`repository-state repository-state-${state}`}>
        <div>
          <div className="eyebrow">{t("repository.eyebrow")}</div>
          <h2>{t(`repository.state.${state}.title`)}</h2>
          <p className="muted">{t(`repository.state.${state}.description`)}</p>
          {retryAt && (
            <p className="muted">
              {t("repository.error.retryAt", { timestamp: retryAt })}
            </p>
          )}
        </div>
        {state !== "unlinked" && state !== "loading" && (
          <button className="btn btn-secondary" type="button" onClick={onRefresh}>
            {t("repository.actions.retry")}
          </button>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ kind, translationKey }) {
  const { t } = useI18n();
  return (
    <span className={`repository-badge repository-badge-${kind}`}>
      {t(translationKey)}
    </span>
  );
}

export default function RepositoryPanel({ projectDoc }) {
  const { t, locale } = useI18n();
  const { isLoading, result, refresh } = useRepositorySnapshot(
    projectDoc?.repository || null
  );
  const panelState = getRepositoryPanelState({ isLoading, result });

  if (["loading", "unlinked", "rate_limited", "offline", "unsupported", "error"].includes(panelState)) {
    return <StateMessage state={panelState} result={result} onRefresh={refresh} />;
  }

  const snapshot = result.snapshot;
  const repository = snapshot.repository;
  const pullRequests = snapshot.openPullRequests || [];
  const attention = summarizeRepositoryAttention(pullRequests);
  const isStale = panelState === "stale";
  const cacheAge = formatCacheAge(result.cache?.ageMs, t);
  const lastActivity = formatDate(snapshot.lastActivityAt, locale);
  const fetchedAt = formatDate(result.cache?.fetchedAt, locale);

  return (
    <section className="panel repository-panel" aria-live="polite">
      <div className="repository-panel-header">
        <div>
          <div className="eyebrow">{t("repository.eyebrow")}</div>
          <h2>{t("repository.title")}</h2>
          <p className="muted">{t("repository.description")}</p>
        </div>
        <div className="repository-actions">
          <button
            className="btn btn-secondary"
            type="button"
            onClick={refresh}
            disabled={isLoading}
          >
            {isLoading
              ? t("repository.actions.refreshing")
              : t("repository.actions.refresh")}
          </button>
          {snapshot.links?.repository && (
            <a
              className="repository-link repository-link-primary"
              href={snapshot.links.repository}
              target="_blank"
              rel="noreferrer"
              aria-label={t("repository.actions.openRepositoryLabel", {
                repository: repository.fullName,
              })}
            >
              {t("repository.actions.openRepository")}
            </a>
          )}
        </div>
      </div>

      {isStale && (
        <div className="repository-notice repository-notice-stale" role="status">
          <strong>{t("repository.stale.title")}</strong>
          <span>
            {t("repository.stale.description", {
              timestamp: fetchedAt || t("repository.freshness.unknown"),
            })}
          </span>
        </div>
      )}

      <div className="repository-separation-note">
        {t("repository.separationNote")}
      </div>

      <div className="repository-overview-grid">
        <article className="repository-summary-card">
          <div className="repository-card-heading">
            <div>
              <div className="repository-card-kicker">
                {t("repository.health.eyebrow")}
              </div>
              <h3>{repository.fullName}</h3>
            </div>
            <StatusBadge
              kind={isStale ? "stale" : "success"}
              translationKey={
                isStale
                  ? "repository.freshness.stale"
                  : "repository.freshness.fresh"
              }
            />
          </div>

          <dl className="repository-details">
            <div>
              <dt>{t("repository.health.defaultBranch")}</dt>
              <dd>{repository.defaultBranch || t("repository.value.unknown")}</dd>
            </div>
            <div>
              <dt>{t("repository.health.visibility")}</dt>
              <dd>{repository.visibility || t("repository.value.unknown")}</dd>
            </div>
            <div>
              <dt>{t("repository.health.lastActivity")}</dt>
              <dd>{lastActivity || t("repository.value.unknown")}</dd>
            </div>
            <div>
              <dt>{t("repository.health.cache")}</dt>
              <dd>{cacheAge}</dd>
            </div>
          </dl>
        </article>

        <article className="repository-summary-card repository-attention-card">
          <div className="repository-card-heading">
            <div>
              <div className="repository-card-kicker">
                {t("repository.attention.eyebrow")}
              </div>
              <h3>{t(`repository.attention.${attention.highest}`)}</h3>
            </div>
            <StatusBadge
              kind={attention.highest}
              translationKey={`repository.attention.${attention.highest}`}
            />
          </div>

          <div className="repository-attention-counts">
            {ATTENTION_LEVELS.map((level) => (
              <div key={level}>
                <span>{t(`repository.attention.${level}`)}</span>
                <strong>{attention.counts[level]}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="repository-pr-header">
        <div>
          <h3>{t("repository.pullRequests.title")}</h3>
          <p className="muted">
            {t("repository.pullRequests.count", { count: pullRequests.length })}
          </p>
        </div>
        {snapshot.links?.pullRequests && (
          <a
            className="repository-link"
            href={snapshot.links.pullRequests}
            target="_blank"
            rel="noreferrer"
          >
            {t("repository.actions.openPullRequests")}
          </a>
        )}
      </div>

      {pullRequests.length === 0 ? (
        <div className="empty-inline">{t("repository.pullRequests.empty")}</div>
      ) : (
        <div className="repository-pr-list">
          {attention.items.map(({ pullRequest, level }) => {
            const health = getPullRequestHealth(pullRequest);
            const origin = getPullRequestOriginSignal(pullRequest);

            return (
              <article className="repository-pr-card" key={pullRequest.number}>
                <div className="repository-pr-title-row">
                  <div>
                    <div className="repository-pr-number">#{pullRequest.number}</div>
                    <h4>
                      {pullRequest.url ? (
                        <a
                          href={pullRequest.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {pullRequest.title}
                        </a>
                      ) : (
                        pullRequest.title
                      )}
                    </h4>
                  </div>
                  <StatusBadge
                    kind={level}
                    translationKey={`repository.attention.${level}`}
                  />
                </div>

                <div className="repository-pr-meta">
                  <span>
                    {t("repository.pullRequests.author", {
                      author:
                        pullRequest.author?.login || t("repository.value.unknown"),
                    })}
                  </span>
                  <span>{t(`repository.origin.${origin}`)}</span>
                  <span>
                    {pullRequest.draft
                      ? t("repository.pullRequests.draft")
                      : t("repository.pullRequests.ready")}
                  </span>
                  <span>{t(`repository.health.pr.${health}`)}</span>
                </div>

                <div className="repository-pr-signals">
                  <StatusBadge
                    kind={health}
                    translationKey={`repository.health.pr.${health}`}
                  />
                  {pullRequest.hasConflicts === false && (
                    <StatusBadge
                      kind="success"
                      translationKey="repository.health.noConflicts"
                    />
                  )}
                  {pullRequest.hasConflicts === null && (
                    <StatusBadge
                      kind="unknown"
                      translationKey="repository.health.conflictsUnknown"
                    />
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
