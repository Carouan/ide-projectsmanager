import { useMemo, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import { useAttentionInbox } from "../hooks/useAttentionInbox.js";
import {
  ATTENTION_FILTER,
  deriveAttentionItems,
  filterAttentionItems,
  summarizeAttentionItems,
} from "../services/attentionInboxModel.js";

const FILTERS = [
  ATTENTION_FILTER.ALL,
  ATTENTION_FILTER.BLOCKING_QUESTION,
  ATTENTION_FILTER.DECISION_REQUIRED,
  ATTENTION_FILTER.VALIDATION_REQUIRED,
  ATTENTION_FILTER.INFORMATION,
];

function formatDate(value, locale) {
  const date = new Date(value || "");
  if (Number.isNaN(date.getTime())) return null;

  return new Intl.DateTimeFormat(locale === "fr" ? "fr-BE" : "en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function filterTranslationKey(filter) {
  return filter === ATTENTION_FILTER.ALL
    ? "attentionInbox.filters.all"
    : `repository.attention.${filter}`;
}

export default function AttentionInbox({ projects, onOpenProject }) {
  const { t, locale } = useI18n();
  const [filter, setFilter] = useState(ATTENTION_FILTER.ALL);
  const { isLoading, repositoryResults, refreshedAt, refresh } =
    useAttentionInbox(projects);
  const items = useMemo(
    () => deriveAttentionItems(projects, repositoryResults),
    [projects, repositoryResults]
  );
  const summary = useMemo(() => summarizeAttentionItems(items), [items]);
  const visibleItems = useMemo(
    () => filterAttentionItems(items, filter),
    [items, filter]
  );
  const linkedProjectCount = projects.filter(
    (projectDoc) => projectDoc?.repository
  ).length;
  const lastRefresh = formatDate(refreshedAt, locale);

  return (
    <section className="attention-inbox" aria-labelledby="attention-inbox-title">
      <div className="attention-inbox-header">
        <div>
          <div className="eyebrow">{t("attentionInbox.eyebrow")}</div>
          <h2 id="attention-inbox-title">{t("attentionInbox.title")}</h2>
          <p className="muted">{t("attentionInbox.description")}</p>
        </div>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={refresh}
          disabled={isLoading}
        >
          {isLoading
            ? t("attentionInbox.actions.refreshing")
            : t("attentionInbox.actions.refresh")}
        </button>
      </div>

      <div className="attention-inbox-note">
        <span>{t("attentionInbox.readOnlyNote")}</span>
        <span>
          {t("attentionInbox.repositoryCoverage", {
            count: linkedProjectCount,
          })}
          {lastRefresh
            ? ` · ${t("attentionInbox.lastRefresh", {
                timestamp: lastRefresh,
              })}`
            : ""}
        </span>
      </div>

      <div className="attention-counter-grid" aria-label={t("attentionInbox.counters.label")}>
        <button
          className={`attention-counter attention-counter-total ${
            filter === ATTENTION_FILTER.ALL ? "attention-counter-active" : ""
          }`}
          type="button"
          onClick={() => setFilter(ATTENTION_FILTER.ALL)}
          aria-pressed={filter === ATTENTION_FILTER.ALL}
        >
          <span>{t("attentionInbox.counters.actionable")}</span>
          <strong>{summary.actionable}</strong>
          <small>{t("attentionInbox.counters.total", { count: summary.total })}</small>
        </button>

        {FILTERS.slice(1).map((category) => (
          <button
            className={`attention-counter attention-counter-${category} ${
              filter === category ? "attention-counter-active" : ""
            }`}
            type="button"
            key={category}
            onClick={() => setFilter(category)}
            aria-pressed={filter === category}
          >
            <span>{t(`repository.attention.${category}`)}</span>
            <strong>{summary.counts[category]}</strong>
          </button>
        ))}
      </div>

      <div className="attention-filter-row" aria-label={t("attentionInbox.filters.label")}>
        {FILTERS.map((filterKey) => (
          <button
            className={`attention-filter ${
              filter === filterKey ? "attention-filter-active" : ""
            }`}
            type="button"
            key={filterKey}
            onClick={() => setFilter(filterKey)}
            aria-pressed={filter === filterKey}
          >
            {t(filterTranslationKey(filterKey))}
          </button>
        ))}
      </div>

      <div className="attention-list" aria-live="polite" aria-busy={isLoading}>
        {isLoading && items.length === 0 ? (
          <div className="attention-loading">
            <strong>{t("attentionInbox.loading.title")}</strong>
            <span>{t("attentionInbox.loading.description")}</span>
          </div>
        ) : visibleItems.length === 0 ? (
          <div className="attention-empty">
            <strong>{t("attentionInbox.empty.title")}</strong>
            <span>{t("attentionInbox.empty.description")}</span>
          </div>
        ) : (
          visibleItems.map((item) => (
            <article
              className={`attention-item attention-item-${item.severity}`}
              key={item.id}
            >
              <div className="attention-item-heading">
                <div>
                  <div className="attention-project-name">{item.projectTitle}</div>
                  <h3>{item.title}</h3>
                </div>
                <div className="attention-item-badges">
                  <span className={`repository-badge repository-badge-${item.category}`}>
                    {t(`repository.attention.${item.category}`)}
                  </span>
                  <span className={`attention-severity attention-severity-${item.severity}`}>
                    {t(`attentionInbox.severity.${item.severity}`)}
                  </span>
                  {item.stale && (
                    <span className="repository-badge repository-badge-stale">
                      {t("repository.freshness.stale")}
                    </span>
                  )}
                </div>
              </div>

              <p>{t(`attentionInbox.reason.${item.reason}`)}</p>

              <div className="attention-item-footer">
                <span>{t(`attentionInbox.source.${item.source}`)}</span>
                <div className="attention-item-actions">
                  <button
                    className="btn btn-secondary"
                    type="button"
                    onClick={() => onOpenProject(item.projectId)}
                  >
                    {t("attentionInbox.actions.openProject")}
                  </button>
                  {item.targetUrl && (
                    <a
                      className="repository-link"
                      href={item.targetUrl}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t("attentionInbox.actions.openGitHub")}
                    </a>
                  )}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
