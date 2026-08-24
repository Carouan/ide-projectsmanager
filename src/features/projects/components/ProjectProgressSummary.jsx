import { formatStageLabel } from "../../../constants/stages";
import { useI18n } from "../../../i18n/useI18n";
import {
  formatProjectProgress,
  resolveProjectProgress,
} from "../../../services/projectProgress";

export default function ProjectProgressSummary({ projectDoc, repositoryResult }) {
  const { t } = useI18n();
  const progress = resolveProjectProgress(projectDoc, repositoryResult);
  const sourceDescription =
    progress.source === "roadmap"
      ? t("project.progress.source.roadmap", {
          completed: progress.completed,
          total: progress.total,
        })
      : progress.source === "stage"
        ? t("project.progress.source.stage", {
            stage: formatStageLabel(progress.stageKey),
          })
        : t(`project.progress.source.${progress.source}`);

  return (
    <div className="project-progress">
      <div className="project-progress-header">
        <span>{t("project.progress.effectiveLabel")}</span>
        <strong>
          {formatProjectProgress(
            progress.percent,
            t("project.progress.undeclared")
          )}
        </strong>
      </div>

      {progress.percent !== null && (
        <progress
          className="project-progress-bar"
          max="100"
          value={progress.percent}
          aria-label={t("project.progress.progressBarLabel", {
            value: progress.percent,
          })}
        />
      )}

      <div className="project-progress-source">
        <span>{sourceDescription}</span>
        {progress.stale && (
          <span className="project-progress-stale">
            {t("project.progress.source.stale")}
          </span>
        )}
        {progress.source === "roadmap" && progress.url && (
          <a href={progress.url} target="_blank" rel="noreferrer">
            {t("project.progress.source.openRoadmap")}
          </a>
        )}
      </div>
    </div>
  );
}
