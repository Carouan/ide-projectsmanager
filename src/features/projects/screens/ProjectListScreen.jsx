import { useI18n } from "../../../i18n/useI18n";

export default function ProjectListScreen({
  projects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onOpenSettings,
  language,
}) {
  const { t } = useI18n(language);

  return (
    <div className="page-shell">
      <div className="page-container">
        <div className="hero">
          <div>
            <div className="eyebrow">{t("app.eyebrow")}</div>
            <h1>{t("app.title")}</h1>
            <p className="hero-text">{t("app.savedProjects")}</p>
          </div>

          <div className="project-actions">
            <button className="btn btn-secondary" onClick={onOpenSettings}>
              {t("topbar.settings")}
            </button>
            <button className="btn btn-primary" onClick={onCreateProject}>
              {t("buttons.newProject")}
            </button>
          </div>
        </div>

        {projects.length === 0 ? (
          <div className="empty-state">
            <h2>{t("app.emptyProjectsTitle")}</h2>
            <p>{t("app.emptyProjectsDescription")}</p>
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
                  <span>
                    {t("app.status")} : {p.project.status}
                  </span>
                  <span>
                    {t("app.updated")} :{" "}
                    {new Date(p.project.updatedAt).toLocaleString()}
                  </span>
                </div>

                <div className="project-actions">
                  <button
                    className="btn btn-secondary"
                    onClick={() => onOpenProject(p.project.id)}
                  >
                    {t("buttons.open")}
                  </button>
                  <button
                    className="btn btn-danger"
                    onClick={() => onDeleteProject(p.project.id)}
                  >
                    {t("buttons.delete")}
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
