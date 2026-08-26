import { formatStageLabel } from "../../../constants/stages";
import { useI18n } from "../../../i18n/useI18n";

function MatrixCell({ cell, workstreamTitle, t }) {
  return (
    <td
      className={`workstream-matrix-cell workstream-matrix-cell-${cell.state}`}
      aria-label={t("workstreams.matrix.cell", {
        title: workstreamTitle,
        stage: formatStageLabel(cell.stageKey),
        total: cell.totalCount,
        open: cell.openCount,
      })}
    >
      {cell.state === "empty" ? (
        <span aria-hidden="true">—</span>
      ) : (
        <span className="workstream-matrix-cell-count">
          {cell.state === "completed" ? "✓" : cell.openCount}
        </span>
      )}
    </td>
  );
}

export default function WorkstreamStageMatrix({ planning }) {
  const { t } = useI18n();

  if (planning.rows.length === 0) return null;

  return (
    <section className="workstream-matrix" aria-labelledby="workstream-matrix-title">
      <div className="workstream-section-header">
        <div>
          <div className="eyebrow">{t("workstreams.matrix.eyebrow")}</div>
          <h3 id="workstream-matrix-title">{t("workstreams.matrix.title")}</h3>
          <p className="muted">{t("workstreams.matrix.description")}</p>
        </div>
        <span className="badge">
          {t("workstreams.matrix.currentStage", {
            stage: formatStageLabel(planning.currentStageKey),
          })}
        </span>
      </div>

      <div className="workstream-matrix-desktop">
        <table>
          <caption className="workstream-visually-hidden">
            {t("workstreams.matrix.title")}
          </caption>
          <thead>
            <tr>
              <th scope="col">{t("workstreams.matrix.workstream")}</th>
              {planning.stages.map((stage) => (
                <th
                  key={stage.key}
                  scope="col"
                  className={
                    stage.key === planning.currentStageKey
                      ? "workstream-matrix-current-stage"
                      : undefined
                  }
                >
                  {formatStageLabel(stage.key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {planning.rows.map((row) => (
              <tr
                className={row.workstream.archived ? "workstream-row-archived" : ""}
                key={row.workstream.id}
              >
                <th scope="row">
                  <span
                    className="workstream-matrix-title-dot"
                    style={{ "--workstream-accent": row.workstream.color || "#8b5cf6" }}
                  />
                  {row.workstream.title}
                </th>
                {row.cells.map((cell) => (
                  <MatrixCell
                    cell={cell}
                    key={cell.stageKey}
                    t={t}
                    workstreamTitle={row.workstream.title}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="workstream-matrix-mobile">
        {planning.rows.map((row) => {
          const occupiedCells = row.cells.filter((cell) => cell.totalCount > 0);

          return (
            <article className="workstream-mobile-card" key={row.workstream.id}>
              <div className="workstream-mobile-card-heading">
                <strong>{row.workstream.title}</strong>
                <span
                  className={`workstream-status workstream-status-${row.workstream.status}`}
                >
                  {t(`workstreams.status.${row.workstream.status}`)}
                </span>
              </div>

              {occupiedCells.length === 0 ? (
                <p className="muted workstream-mobile-empty">
                  {t("workstreams.matrix.noLinkedStages")}
                </p>
              ) : (
                <div className="workstream-mobile-stages">
                  {occupiedCells.map((cell) => (
                    <div className="workstream-mobile-stage" key={cell.stageKey}>
                      <span>{formatStageLabel(cell.stageKey)}</span>
                      <strong>
                        {cell.state === "completed"
                          ? t("workstreams.matrix.complete")
                          : t("workstreams.matrix.openCount", {
                              count: cell.openCount,
                            })}
                      </strong>
                    </div>
                  ))}
                </div>
              )}

              {row.unscheduledCount > 0 && (
                <p className="muted workstream-mobile-unscheduled">
                  {t("workstreams.matrix.unscheduled", {
                    count: row.unscheduledCount,
                  })}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
