import { useState } from "react";

export default function JournalPanel({
  projectId,
  journal,
  onAddJournalEntry,
}) {
  const [type, setType] = useState("note");
  const [title, setTitle] = useState("");
  const [stage, setStage] = useState("v0_0");
  const [content, setContent] = useState("");
  const [impact, setImpact] = useState("");

  function handleAdd() {
    if (!title.trim() && !content.trim()) return;

    onAddJournalEntry(projectId, {
      type,
      title: title.trim() || "Entrée sans titre",
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
          <h2>Journal du projet</h2>
          <p className="muted">
            Notes, décisions, comptes-rendus et éléments de contexte.
          </p>
        </div>
        <span className="badge">{sortedJournal.length} entrée(s)</span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>Type</span>
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
          <span>Étape</span>
          <select value={stage} onChange={(e) => setStage(e.target.value)}>
            <option value="v0_0">v0_0</option>
            <option value="v0_1">v0_1</option>
            <option value="v0_2">v0_2</option>
            <option value="v0_3">v0_3</option>
            <option value="v0_4">v0_4</option>
            <option value="v1_0">v1_0</option>
          </select>
        </label>

        <label className="field field-full">
          <span>Titre</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex. Décision sur le format JSON natif"
          />
        </label>

        <label className="field field-full">
          <span>Contenu</span>
          <textarea
            rows={5}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Décris la décision, la note ou le compte-rendu"
          />
        </label>

        <label className="field field-full">
          <span>Impact</span>
          <textarea
            rows={3}
            value={impact}
            onChange={(e) => setImpact(e.target.value)}
            placeholder="Ex. simplifie le MVP, reporte le backend, clarifie le schéma..."
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleAdd}>
            + Ajouter au journal
          </button>
        </div>
      </div>

      <div className="backlog-list">
        {sortedJournal.length === 0 ? (
          <div className="empty-inline">Aucune entrée de journal pour le moment.</div>
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
                      : "date inconnue"}
                  </p>
                </div>
                <span className="badge">{entry.type}</span>
              </div>

              <div className="journal-content-block">
                <strong>Contenu</strong>
                <p>{entry.content || "Sans contenu"}</p>
              </div>

              {entry.impact ? (
                <div className="journal-impact-block">
                  <strong>Impact</strong>
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