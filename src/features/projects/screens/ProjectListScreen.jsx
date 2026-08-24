import { useMemo, useState } from "react";
import { useI18n } from "../../../i18n/useI18n";
import { formatStageLabel } from "../../../constants/stages";
import { formatDateTime } from "../../../services/dateTimePresentation";
import AttentionInbox from "../components/AttentionInbox";
import ProjectDashboardControls from "../components/ProjectDashboardControls";
import ProjectProgressMigrationPreview from "../components/ProjectProgressMigrationPreview";
import ProjectProgressSummary from "../components/ProjectProgressSummary";
import { useAttentionInbox } from "../hooks/useAttentionInbox.js";
import {
  DEFAULT_DASHBOARD_FILTERS,
  createDashboardProjectRows,
  deriveDashboardFilterOptions,
  normalizeDashboardPreferences,
  selectDashboardProjects,
} from "../services/projectDashboardModel.js";

export default function ProjectListScreen({
  projects,
  onCreateProject,
  onInstallDemoProject,
  onOpenProject,
  onDeleteProject,
  onOpenSettings,
  onMigrateKnownPortfolioProgress,
  settings,
  onUpdateSettings,
}) {
  const { t, locale } = useI18n();
  const attentionInbox = useAttentionInbox(projects);
  const [filters, setFilters] = useState(() => ({ ...DEFAULT_DASHBOARD_FILTERS }));
  const preferences = useMemo(() => normalizeDashboardPreferences(settings), [settings]);
  const projectRows = useMemo(
    () => createDashboardProjectRows(projects, attentionInbox.repositoryResults),
    [projects, attentionInbox.repositoryResults]
  );
  const filterOptions = useMemo(
    () => deriveDashboardFilterOptions(projectRows, locale),
    [projectRows, locale]
  );
  const visibleRows = useMemo(
    () => selectDashboardProjects(projectRows, { filters, preferences, locale }),
    [projectRows, filters, preferences, locale]
  );

  function updateFilters(patch) {
    setFilters((current) => ({ ...current, ...patch }));
  }

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="hero">
          <div>
            <div className="eyebrow">{t("global.hero.eyebrow")}</div>
            <h1>{t("global.hero.title")}</h1>
            <p className="hero-text">{t("global.hero.description")}</p>
          </div>

          <div className="project-actions">
            <button className="btn btn-secondary" onClick={onOpenSettings}>
              {t("global.actions.settings")}
            </button>
            <button className="btn btn-primary" onClick={onCreateProject}>
              {t("global.actions.newProject")}
            </button>
          </div>
        </div>

        {projects.length > 0 && (
          <>
            <AttentionInbox
              projects={projects}
              onOpenProject={onOpenProject}
              inbox={attentionInbox}
            />
            <ProjectProgressMigrationPreview
              projects={projects}
              onApply={onMigrateKnownPortfolioProgress}
            />
          </>
        )}

        {projects.length === 0 ? (
          <div className="empty-state">
            <h2>{t("global.empty.title")}</h2>
            <p>{t("global.empty.description")}</p>
            <p className="muted">{t("global.empty.demoDescription")}</p>
            <div className="project-actions empty-state-actions">
              <button
                className="btn btn-secondary"
                onClick={onInstallDemoProject}
              >
                {t("global.actions.installDemo")}
              </button>
              <button className="btn btn-primary" onClick={onCreateProject}>
                {t("global.actions.newProject")}
              </button>
            </div>
          </div>
        ) : (
          <>
            <ProjectDashboardControls
              filters={filters}
              filterOptions={filterOptions}
              preferences={preferences}
              resultCount={visibleRows.length}
              totalCount={projects.length}
              onChangeFilters={updateFilters}
              onChangePreferences={onUpdateSettings}
            />

            {visibleRows.length === 0 ? (
              <div className="empty-state dashboard-filtered-empty">
                <h3>{t("dashboard.empty.title")}</h3>
                <p>{t("dashboard.empty.description")}</p>
                <button
                  className="btn btn-secondary"
                  type="button"
                  onClick={() => updateFilters(DEFAULT_DASHBOARD_FILTERS)}
                >
                  {t("dashboard.filters.reset")}
                </button>
              </div>
            ) : (
              <div
                className={`card-grid project-collection-${preferences.dashboardView}`}
              >
                {visibleRows.map(({ projectDoc: p, repositoryResult }) => (
                  <article className="project-card" key={p.project.id}>
                    <div className="project-card-header">
                      <div>
                        <h3>{p.project.title}</h3>
                        <p className="muted">{p.project.summary}</p>
                      </div>
                      <span className="badge">
                        {formatStageLabel(p.project.currentStage)}
                      </span>
                    </div>

                    <div className="project-meta">
                      <span>
                        {t("global.meta.status", { status: p.project.status })}
                      </span>
                      <span>
                        {t("global.meta.updated", {
                          timestamp:
                            formatDateTime(p.project.updatedAt, locale) ||
                            t("global.meta.unknownDate"),
                        })}
                      </span>
                    </div>

                    <ProjectProgressSummary
                      projectDoc={p}
                      repositoryResult={repositoryResult}
                    />

                    <div className="project-actions">
                      <button
                        className="btn btn-secondary"
                        onClick={() => onOpenProject(p.project.id)}
                      >
                        {t("global.actions.open")}
                      </button>
                      <button
                        className="btn btn-danger"
                        onClick={() => onDeleteProject(p.project.id)}
                      >
                        {t("global.actions.delete")}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
