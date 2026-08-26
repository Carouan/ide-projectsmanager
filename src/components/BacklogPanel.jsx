import { useMemo, useState } from "react";
import { BACKLOG_STATUS } from "../constants/backlog";
import { formatStageLabel, STAGE_DEFINITIONS } from "../constants/stages";
import {
  filterWorkstreamBacklog,
  WORKSTREAM_BACKLOG_FILTER,
} from "../features/projects/services/workstreamPlanningModel";
import { useI18n } from "../i18n/useI18n";
import { normalizeWorkstreams } from "../services/projectWorkstreams";

export default function BacklogPanel({
  projectId,
  backlog,
  workstreams = [],
  currentStageKey = "v0_0",
  workstreamFilter = WORKSTREAM_BACKLOG_FILTER.ALL,
  onChangeWorkstreamFilter,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
  onUpdateBacklogItemWorkstream,
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedWorkstreamId, setSelectedWorkstreamId] = useState("");
  const [selectedStageKey, setSelectedStageKey] = useState(currentStageKey);
  const normalizedWorkstreams = useMemo(
    () => normalizeWorkstreams(workstreams),
    [workstreams]
  );
  const availableWorkstreams = normalizedWorkstreams.filter(
    (workstream) => !workstream.archived
  );
  const visibleBacklog = filterWorkstreamBacklog(backlog, workstreamFilter);
  const hasWorkstreams = normalizedWorkstreams.length > 0;

  function handleAdd() {
    if (!title.trim()) return;

    const item = {
      title: title.trim(),
      description: description.trim(),
      type: "idea",
      priority: "medium",
      status: BACKLOG_STATUS.OPEN,
      source: "manual",
      relatedStage: currentStageKey,
    };

    if (hasWorkstreams) {
      item.workstreamId = selectedWorkstreamId || null;
      item.stageKey = selectedStageKey || null;
      item.relatedStage = selectedStageKey || null;
    }

    onAddBacklogItem(projectId, item);

    setTitle("");
    setDescription("");
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t("backlog.title")}</h2>
          <p className="muted">{t("backlog.description")}</p>
        </div>
        <span className="badge">
          {workstreamFilter === WORKSTREAM_BACKLOG_FILTER.ALL
            ? t("backlog.count", { count: backlog.length })
            : t("backlog.workstreams.filteredCount", {
                count: visibleBacklog.length,
                total: backlog.length,
              })}
        </span>
      </div>

      {hasWorkstreams && (
        <label className="field backlog-workstream-filter">
          <span>{t("backlog.workstreams.filter")}</span>
          <select
            value={workstreamFilter}
            onChange={(event) => onChangeWorkstreamFilter?.(event.target.value)}
          >
            <option value={WORKSTREAM_BACKLOG_FILTER.ALL}>
              {t("backlog.workstreams.all")}
            </option>
            <option value={WORKSTREAM_BACKLOG_FILTER.UNASSIGNED}>
              {t("backlog.workstreams.unassigned")}
            </option>
            {normalizedWorkstreams.map((workstream) => (
              <option key={workstream.id} value={workstream.id}>
                {workstream.title}
                {workstream.archived ? ` · ${t("workstreams.status.archived")}` : ""}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="form-grid">
        <label className="field">
          <span>{t("backlog.form.title")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("backlog.form.titlePlaceholder")}
          />
        </label>

        {hasWorkstreams && (
          <>
            <label className="field">
              <span>{t("backlog.workstreams.assignment")}</span>
              <select
                value={selectedWorkstreamId}
                onChange={(event) => setSelectedWorkstreamId(event.target.value)}
              >
                <option value="">{t("backlog.workstreams.noWorkstream")}</option>
                {availableWorkstreams.map((workstream) => (
                  <option key={workstream.id} value={workstream.id}>
                    {workstream.title}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>{t("backlog.workstreams.stage")}</span>
              <select
                value={selectedStageKey}
                onChange={(event) => setSelectedStageKey(event.target.value)}
              >
                <option value="">{t("backlog.workstreams.noStage")}</option>
                {STAGE_DEFINITIONS.map((stage) => (
                  <option key={stage.key} value={stage.key}>
                    {formatStageLabel(stage.key)} — {stage.title}
                  </option>
                ))}
              </select>
            </label>
          </>
        )}

        <label className="field field-full">
          <span>{t("backlog.form.description")}</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("backlog.form.descriptionPlaceholder")}
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            {t("backlog.form.add")}
          </button>
        </div>
      </div>

      <div className="backlog-list">
        {visibleBacklog.length === 0 ? (
          <div className="empty-inline">
            {t(backlog.length === 0 ? "backlog.empty" : "backlog.workstreams.noMatches")}
          </div>
        ) : (
          visibleBacklog.map((item) => (
            <article className="backlog-item" key={item.id}>
              <div className="backlog-item-top">
                <div>
                  <h3>{item.title}</h3>
                  <p className="muted">
                    {item.description || t("backlog.item.noDescription")}
                  </p>
                </div>
                <span className="badge">{item.status}</span>
              </div>

              <div className="project-meta">
                <span>{t("backlog.item.type", { type: item.type })}</span>
                <span>{t("backlog.item.priority", { priority: item.priority })}</span>
                <span>{t("backlog.item.source", { source: item.source })}</span>
                {(item.stageKey || item.relatedStage) && (
                  <span>
                    {t("backlog.item.stage", {
                      stage: formatStageLabel(item.stageKey || item.relatedStage),
                    })}
                  </span>
                )}
                {item.workstreamId && (
                  <span>
                    {t("backlog.workstreams.itemLabel", {
                      title:
                        normalizedWorkstreams.find(
                          (workstream) => workstream.id === item.workstreamId
                        )?.title || t("backlog.workstreams.missing"),
                    })}
                  </span>
                )}
              </div>

              {hasWorkstreams && (
                <div className="backlog-workstream-assignment">
                  <label className="field">
                    <span>{t("backlog.workstreams.assignment")}</span>
                    <select
                      value={item.workstreamId || ""}
                      onChange={(event) =>
                        onUpdateBacklogItemWorkstream(projectId, item.id, {
                          workstreamId: event.target.value || null,
                        })
                      }
                    >
                      <option value="">{t("backlog.workstreams.noWorkstream")}</option>
                      {item.workstreamId &&
                        !normalizedWorkstreams.some(
                          (workstream) => workstream.id === item.workstreamId
                        ) && (
                          <option value={item.workstreamId}>
                            {t("backlog.workstreams.missing")}
                          </option>
                        )}
                      {normalizedWorkstreams.map((workstream) => (
                        <option
                          disabled={workstream.archived}
                          key={workstream.id}
                          value={workstream.id}
                        >
                          {workstream.title}
                          {workstream.archived
                            ? ` · ${t("workstreams.status.archived")}`
                            : ""}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="field">
                    <span>{t("backlog.workstreams.stage")}</span>
                    <select
                      value={item.stageKey || item.relatedStage || ""}
                      onChange={(event) =>
                        onUpdateBacklogItemWorkstream(projectId, item.id, {
                          stageKey: event.target.value || null,
                        })
                      }
                    >
                      <option value="">{t("backlog.workstreams.noStage")}</option>
                      {STAGE_DEFINITIONS.map((stage) => (
                        <option key={stage.key} value={stage.key}>
                          {formatStageLabel(stage.key)} — {stage.title}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}

              <div className="project-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.PLANNED)
                  }
                >
                  {t("backlog.actions.planned")}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.DONE)
                  }
                >
                  {t("backlog.actions.done")}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.DROPPED)
                  }
                >
                  {t("backlog.actions.dropped")}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
