import { useState } from "react";
import { BACKLOG_STATUS } from "../constants/backlog";
import { useI18n } from "../i18n/useI18n";

export default function BacklogPanel({
  projectId,
  backlog,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
}) {
  const { t } = useI18n();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  function handleAdd() {
    if (!title.trim()) return;

    onAddBacklogItem(projectId, {
      title: title.trim(),
      description: description.trim(),
      type: "idea",
      priority: "medium",
      status: BACKLOG_STATUS.OPEN,
      source: "manual",
      relatedStage: "v0_0",
    });

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
        <span className="badge">{t("backlog.count", { count: backlog.length })}</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>{t("backlog.form.title")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("backlog.form.titlePlaceholder")}
          />
        </label>

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
        {backlog.length === 0 ? (
          <div className="empty-inline">{t("backlog.empty")}</div>
        ) : (
          backlog.map((item) => (
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
              </div>

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
