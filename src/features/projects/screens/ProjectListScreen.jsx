import { useI18n } from "../../../i18n/useI18n";
import { formatStageLabel } from "../../../constants/stages";
import { formatDateTime } from "../../../services/dateTimePresentation";
import {
  formatProjectProgress,
  normalizeProjectProgress,
} from "../../../services/projectProgress";
import AttentionInbox from "../components/AttentionInbox";
import ProjectProgressMigrationPreview from "../components/ProjectProgressMigrationPreview";

function ProjectProgressSummary({ progressPercent, t }) {
  const declaredProgress = normalizeProjectProgress(progressPercent);

  return (
    <div className="project-progress">
      <div className="project-progress-header">
        <span>{t("project.progress.label")}</span>
        <strong>
          {formatProjectProgress(
            declaredProgress,
            t("project.progress.undeclared")
          )}
        </strong>
      </div>

      {declaredProgress !== null && (
        <progress
          className="project-progress-bar"
          max="100"
          value={declaredProgress}
          aria-label={t("project.progress.progressBarLabel", {
            value: declaredProgress,
          })}
        />
      )}
    </div>
  );
}

export default function ProjectListScreen({
  projects,
  onCreateProject,
  onInstallDemoProject,
  onOpenProject,
  onDeleteProject,
  onOpenSettings,
  onMigrateKnownPortfolioProgress,
}) {
  const { t, locale } = useI18n();

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
          <div className="card-grid">
            {projects.map((p) => (
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
                  <span>{t("global.meta.status", { status: p.project.status })}</span>
                  <span>
                    {t("global.meta.updated", {
                      timestamp:
                        formatDateTime(p.project.updatedAt, locale) ||
                        t("global.meta.unknownDate"),
                    })}
                  </span>
                </div>

                <ProjectProgressSummary
                  progressPercent={p.project.progressPercent}
                  t={t}
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
      </div>
    </div>
  );
}
