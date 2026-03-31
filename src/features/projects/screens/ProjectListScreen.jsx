import { useI18n } from "../../../i18n/useI18n";

export default function ProjectListScreen({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onOpenSettings,
}) {
  const { t } = useI18n();

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

        {projects.length === 0 ? (
          <div className="empty-state">
            <h2>{t("global.empty.title")}</h2>
            <p>{t("global.empty.description")}</p>
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
                  <span className="badge">{p.project.currentStage}</span>
                </div>

                <div className="project-meta">
                  <span>{t("global.meta.status", { status: p.project.status })}</span>
                  <span>
                    {t("global.meta.updated", {
                      timestamp: new Date(p.project.updatedAt).toLocaleString(),
                    })}
                  </span>
                </div>

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
