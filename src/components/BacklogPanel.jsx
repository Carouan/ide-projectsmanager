import { useState } from "react";
import { BACKLOG_STATUS } from "../constants/backlog";

export default function BacklogPanel({
  projectId,
  backlog,
  onAddBacklogItem,
  onUpdateBacklogItemStatus,
}) {
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
          <h2>Backlog</h2>
          <p className="muted">
            Idées, améliorations et éléments reportés pour plus tard.
          </p>
        </div>
        <span className="badge">{backlog.length} item(s)</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Titre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Ajouter export Markdown"
          />
        </label>

        <label className="field field-full">
          <span>Description</span>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Décris brièvement l'idée"
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            + Ajouter au backlog
          </button>
        </div>
      </div>

      <div className="backlog-list">
        {backlog.length === 0 ? (
          <div className="empty-inline">Aucun item backlog pour le moment.</div>
        ) : (
          backlog.map((item) => (
            <article className="backlog-item" key={item.id}>
              <div className="backlog-item-top">
                <div>
                  <h3>{item.title}</h3>
                  <p className="muted">{item.description || "Sans description"}</p>
                </div>
                <span className="badge">{item.status}</span>
              </div>

              <div className="project-meta">
                <span>Type : {item.type}</span>
                <span>Priorité : {item.priority}</span>
                <span>Source : {item.source}</span>
              </div>

              <div className="project-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.PLANNED)
                  }
                >
                  Planned
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.DONE)
                  }
                >
                  Done
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() =>
                    onUpdateBacklogItemStatus(projectId, item.id, BACKLOG_STATUS.DROPPED)
                  }
                >
                  Dropped
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
