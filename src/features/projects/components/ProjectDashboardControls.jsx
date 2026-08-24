import { useI18n } from "../../../i18n/useI18n";
import {
  DASHBOARD_ATTENTION_FILTER,
  DASHBOARD_REPOSITORY_FILTER,
  DASHBOARD_SORT_DIRECTION,
  DASHBOARD_SORT_FIELD,
  DASHBOARD_VIEW,
  DEFAULT_DASHBOARD_FILTERS,
  hasActiveDashboardFilters,
} from "../services/projectDashboardModel.js";

const ATTENTION_OPTIONS = [
  DASHBOARD_ATTENTION_FILTER.ALL,
  DASHBOARD_ATTENTION_FILTER.ACTION_REQUIRED,
  DASHBOARD_ATTENTION_FILTER.BLOCKING_QUESTION,
  DASHBOARD_ATTENTION_FILTER.DECISION_REQUIRED,
  DASHBOARD_ATTENTION_FILTER.VALIDATION_REQUIRED,
  DASHBOARD_ATTENTION_FILTER.INFORMATION,
  DASHBOARD_ATTENTION_FILTER.NONE,
];

function attentionLabel(t, value) {
  if (
    [
      DASHBOARD_ATTENTION_FILTER.ALL,
      DASHBOARD_ATTENTION_FILTER.ACTION_REQUIRED,
      DASHBOARD_ATTENTION_FILTER.NONE,
    ].includes(value)
  ) {
    return t(`dashboard.attention.${value}`);
  }

  return t(`repository.attention.${value}`);
}

export default function ProjectDashboardControls({
  filters,
  filterOptions,
  preferences,
  resultCount,
  totalCount,
  onChangeFilters,
  onChangePreferences,
}) {
  const { t } = useI18n();
  const hasActiveFilters = hasActiveDashboardFilters(filters);

  return (
    <section className="dashboard-controls" aria-labelledby="dashboard-projects-title">
      <div className="dashboard-controls-header">
        <div>
          <h2 id="dashboard-projects-title">{t("dashboard.title")}</h2>
          <p className="dashboard-result-count" aria-live="polite">
            {t("dashboard.resultCount", { count: resultCount, total: totalCount })}
          </p>
        </div>

        <div className="dashboard-view-toggle" aria-label={t("dashboard.view.label")}>
          {[DASHBOARD_VIEW.GRID, DASHBOARD_VIEW.LIST].map((view) => (
            <button
              className={`dashboard-view-button${
                preferences.dashboardView === view ? " dashboard-view-button-active" : ""
              }`}
              type="button"
              key={view}
              aria-pressed={preferences.dashboardView === view}
              onClick={() => onChangePreferences({ dashboardView: view })}
            >
              {t(`dashboard.view.${view}`)}
            </button>
          ))}
        </div>
      </div>

      <label className="dashboard-search">
        <span>{t("dashboard.search.label")}</span>
        <input
          type="search"
          value={filters.query}
          placeholder={t("dashboard.search.placeholder")}
          onChange={(event) => onChangeFilters({ query: event.target.value })}
        />
      </label>

      <details className="dashboard-advanced-controls">
        <summary>{t("dashboard.filters.summary")}</summary>

        <div className="dashboard-filter-grid">
          <label className="field">
            <span>{t("dashboard.filters.status")}</span>
            <select
              value={filters.status}
              onChange={(event) => onChangeFilters({ status: event.target.value })}
            >
              <option value="all">{t("dashboard.filters.allStatuses")}</option>
              {filterOptions.statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("dashboard.filters.category")}</span>
            <select
              value={filters.category}
              onChange={(event) => onChangeFilters({ category: event.target.value })}
            >
              <option value="all">{t("dashboard.filters.allCategories")}</option>
              {filterOptions.categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("dashboard.filters.repository")}</span>
            <select
              value={filters.repository}
              onChange={(event) => onChangeFilters({ repository: event.target.value })}
            >
              {Object.values(DASHBOARD_REPOSITORY_FILTER).map((value) => (
                <option key={value} value={value}>
                  {t(`dashboard.repository.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("dashboard.filters.attention")}</span>
            <select
              value={filters.attention}
              onChange={(event) => onChangeFilters({ attention: event.target.value })}
            >
              {ATTENTION_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {attentionLabel(t, value)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("dashboard.sort.label")}</span>
            <select
              value={preferences.dashboardSortField}
              onChange={(event) =>
                onChangePreferences({ dashboardSortField: event.target.value })
              }
            >
              {Object.values(DASHBOARD_SORT_FIELD).map((value) => (
                <option key={value} value={value}>
                  {t(`dashboard.sort.${value}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("dashboard.sort.direction")}</span>
            <select
              value={preferences.dashboardSortDirection}
              onChange={(event) =>
                onChangePreferences({ dashboardSortDirection: event.target.value })
              }
            >
              {Object.values(DASHBOARD_SORT_DIRECTION).map((value) => (
                <option key={value} value={value}>
                  {t(`dashboard.sort.${value}`)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          className="btn btn-secondary dashboard-reset-filters"
          type="button"
          disabled={!hasActiveFilters}
          onClick={() => onChangeFilters(DEFAULT_DASHBOARD_FILTERS)}
        >
          {t("dashboard.filters.reset")}
        </button>
      </details>
    </section>
  );
}
