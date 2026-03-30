export default function StageEditor({
  projectId,
  stageKey,
  stage,
  linkedBacklogItems = [],
  linkedJournalEntries = [],
  onUpdateStageField,
}) {
  if (!stage) {
    return (
      <section className="panel">
        <h2>Étape introuvable</h2>
      </section>
    );
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>
            {stage.version} — {stage.title}
          </h2>
          <p className="muted">Clé technique : {stageKey}</p>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Statut</span>
          <select
            value={stage.status || "todo"}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "status", e.target.value)
            }
          >
            <option value="todo">todo</option>
            <option value="in_progress">in_progress</option>
            <option value="blocked">blocked</option>
            <option value="done">done</option>
          </select>
        </label>

        <label className="field field-full">
          <span>Objectif</span>
          <textarea
            rows={4}
            value={stage.goal || ""}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "goal", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>Notes</span>
          <textarea
            rows={8}
            value={stage.notes || ""}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "notes", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>Livrable attendu</span>
          <textarea
            rows={4}
            value={stage.deliverable || ""}
            onChange={(e) =>
              onUpdateStageField(
                projectId,
                stageKey,
                "deliverable",
                e.target.value
              )
            }
          />
        </label>

        <label className="field field-full">
          <span>Definition of Done</span>
          <textarea
            rows={4}
            value={stage.definitionOfDone || ""}
            onChange={(e) =>
              onUpdateStageField(
                projectId,
                stageKey,
                "definitionOfDone",
                e.target.value
              )
            }
          />
        </label>
      </div>

      <div className="linked-grid">
        <section className="linked-panel">
          <div className="linked-panel-header">
            <h3>Éléments backlog liés</h3>
            <span className="linked-count">{linkedBacklogItems.length}</span>
          </div>

          {linkedBacklogItems.length === 0 ? (
            <p className="muted">
              Aucun item backlog lié à cette étape pour le moment.
            </p>
          ) : (
            <div className="linked-list">
              {linkedBacklogItems.map((item) => (
                <article key={item.id} className="linked-card">
                  <div className="linked-card-top">
                    <strong>{item.title}</strong>
                    <span className="badge">{item.status || "todo"}</span>
                  </div>
                  {item.type && <p className="muted">Type : {item.type}</p>}
                  {item.description && <p>{item.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="linked-panel">
          <div className="linked-panel-header">
            <h3>Entrées journal liées</h3>
            <span className="linked-count">{linkedJournalEntries.length}</span>
          </div>

          {linkedJournalEntries.length === 0 ? (
            <p className="muted">
              Aucune entrée journal liée à cette étape pour le moment.
            </p>
          ) : (
            <div className="linked-list">
              {linkedJournalEntries.map((entry) => (
                <article key={entry.id} className="linked-card">
                  <div className="linked-card-top">
                    <strong>{entry.title}</strong>
                    <span className="badge">{entry.type || "note"}</span>
                  </div>
                  {entry.impact && <p className="muted">Impact : {entry.impact}</p>}
                  {entry.content && <p>{entry.content}</p>}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </section>
  );
}