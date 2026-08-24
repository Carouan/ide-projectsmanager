import { useI18n } from "../../../i18n/useI18n";
import {
  formatProjectProgress,
  previewKnownPortfolioProgressMigrations,
} from "../../../services/projectProgress";

export default function ProjectProgressMigrationPreview({ projects, onApply }) {
  const { t } = useI18n();
  const migrations = previewKnownPortfolioProgressMigrations(projects);

  if (migrations.length === 0) return null;

  return (
    <details className="progress-migration-preview">
      <summary>
        <strong>
          {t("project.progress.migration.summary", {
            count: migrations.length,
          })}
        </strong>
        <span>{t("project.progress.migration.summaryHint")}</span>
      </summary>

      <div className="progress-migration-content">
        <p className="muted">{t("project.progress.migration.description")}</p>

        <ul className="progress-migration-list">
          {migrations.map((migration) => (
            <li key={migration.projectId}>
              <span>{migration.projectTitle}</span>
              <strong>{formatProjectProgress(migration.progressPercent)}</strong>
            </li>
          ))}
        </ul>

        <button className="btn btn-secondary" type="button" onClick={onApply}>
          {t("project.progress.migration.applyAll", {
            count: migrations.length,
          })}
        </button>
      </div>
    </details>
  );
}
