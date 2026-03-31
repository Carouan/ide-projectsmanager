import { useState } from "react";
import { STAGE_DEFINITIONS } from "../constants/stages";
import { useI18n } from "../i18n/useI18n";

export default function JournalPanel({
  projectId,
  journal,
  onAddJournalEntry,
}) {
  const { t } = useI18n();
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("v0_0");
  const [content, setContent] = useState("");
  const [impact, setImpact] = useState("");

  function handleAdd() {
    if (!title.trim() && !content.trim()) return;

    onAddJournalEntry(projectId, {
      type,
      title: title.trim() || t("journal.item.untitled"),
      stage,
      content: content.trim(),
      impact: impact.trim(),
      source: "manual",
      links: [],
    });

    setType("note");
    setTitle("");
    setStage("v0_0");
    setContent("");
    setImpact("");
  }

  const sortedJournal = [...(journal || [])].sort(
    (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
  );

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t("journal.title")}</h2>
          <p className="muted">{t("journal.description")}</p>
        </div>
        <span className="badge">
          {t("journal.count", { count: sortedJournal.length })}
        </span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>{t("journal.form.type")}</span>
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="note">note</option>
            <option value="decision">decision</option>
            <option value="meeting">meeting</option>
            <option value="question">question</option>
            <option value="research">research</option>
            <option value="llm_extract">llm_extract</option>
          </select>
        </label>

        <label className="field">
          <span>{t("journal.form.stage")}</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            {STAGE_DEFINITIONS.map((stageDefinition) => (
              <option key={stageDefinition.key} value={stageDefinition.key}>
                {stageDefinition.shortTitle}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-full">
          <span>{t("journal.form.title")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t("journal.form.titlePlaceholder")}
          />
        </label>

        <label className="field field-full">
          <span>{t("journal.form.content")}</span>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t("journal.form.contentPlaceholder")}
          />
        </label>

        <label className="field field-full">
          <span>{t("journal.form.impact")}</span>
          <textarea
            rows={3}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            placeholder={t("journal.form.impactPlaceholder")}
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            {t("journal.form.add")}
          </button>
        </div>
      </div>

      <div className="backlog-list">
        {sortedJournal.length === 0 ? (
          <div className="empty-inline">{t("journal.empty")}</div>
        ) : (
          sortedJournal.map((entry) => (
            <article className="backlog-item" key={entry.id}>
              <div className="backlog-item-top">
                <div>
                  <h3>{entry.title}</h3>
                  <p className="muted">
                    {entry.type} · {entry.stage} ·{" "}
                    {entry.createdAt
                      ? new Date(entry.createdAt).toLocaleString()
                      : t("journal.item.unknownDate")}
                  </p>
                </div>
                <span className="badge">{entry.type}</span>
              </div>

              <div className="journal-content-block">
                <strong>{t("journal.item.content")}</strong>
                <p>{entry.content || t("journal.item.noContent")}</p>
              </div>

              {entry.impact ? (
                <div className="journal-impact-block">
                  <strong>{t("journal.item.impact")}</strong>
                  <p>{entry.impact}</p>
                </div>
              ) : null}
            </article>
          ))
        )}
      </div>
    </section>
  );
}
