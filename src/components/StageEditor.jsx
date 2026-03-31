import { useI18n } from "../i18n/useI18n";

const STAGE_STATUS_OPTIONS = ["todo", "in_progress", "blocked", "done"];

export default function StageEditor({
  projectId,
  stageKey,
  stage,
  linkedBacklogItems = [],
  linkedJournalEntries = [],
  onUpdateStageField,
}) {
  const { t } = useI18n();

  if (!stage) {
    return (
      <section className="panel">
        <h2>{t("project.stage.notFound")}</h2>
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
          <p className="muted">
            {t("project.stage.technicalKey", { key: stageKey })}
          </p>
        </div>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>{t("project.stage.fields.status")}</span>
          <select
            value={stage.status || "todo"}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "status", e.target.value)
            }
          >
            {STAGE_STATUS_OPTIONS.map((statusKey) => (
              <option key={statusKey} value={statusKey}>
                {t(`project.stage.status.${statusKey}`)}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-full">
          <span>{t("project.stage.fields.goal")}</span>
          <textarea
            rows={4}
            value={stage.goal || ""}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "goal", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>{t("project.stage.fields.notes")}</span>
          <textarea
            rows={8}
            value={stage.notes || ""}
            onChange={(e) =>
              onUpdateStageField(projectId, stageKey, "notes", e.target.value)
            }
          />
        </label>

        <label className="field field-full">
          <span>{t("project.stage.fields.deliverable")}</span>
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
          <span>{t("project.stage.fields.definitionOfDone")}</span>
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
            <h3>{t("project.stage.linkedBacklog.title")}</h3>
            <span className="linked-count">{linkedBacklogItems.length}</span>
          </div>

          {linkedBacklogItems.length === 0 ? (
            <p className="muted">{t("project.stage.linkedBacklog.empty")}</p>
          ) : (
            <div className="linked-list">
              {linkedBacklogItems.map((item) => (
                <article key={item.id} className="linked-card">
                  <div className="linked-card-top">
                    <strong>{item.title}</strong>
                    <span className="badge">{item.status || "todo"}</span>
                  </div>
                  {item.type && (
                    <p className="muted">
                      {t("project.stage.linkedBacklog.type", { type: item.type })}
                    </p>
                  )}
                  {item.description && <p>{item.description}</p>}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="linked-panel">
          <div className="linked-panel-header">
            <h3>{t("project.stage.linkedJournal.title")}</h3>
            <span className="linked-count">{linkedJournalEntries.length}</span>
          </div>

          {linkedJournalEntries.length === 0 ? (
            <p className="muted">{t("project.stage.linkedJournal.empty")}</p>
          ) : (
            <div className="linked-list">
              {linkedJournalEntries.map((entry) => (
                <article key={entry.id} className="linked-card">
                  <div className="linked-card-top">
                    <strong>{entry.title}</strong>
                    <span className="badge">{entry.type || "note"}</span>
                  </div>
                  {entry.impact && (
                    <p className="muted">
                      {t("project.stage.linkedJournal.impact", {
                        impact: entry.impact,
                      })}
                    </p>
                  )}
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
