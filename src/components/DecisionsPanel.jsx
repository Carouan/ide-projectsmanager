export default function DecisionsPanel({
  decisions = [],
  onUpdateDecisionStatus,
  projectId,
}) {
  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>Décisions</h2>
          <p className="muted">
            Vue condensée des arbitrages importants du projet.
          </p>
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className="empty-state">
          <h3>Aucune décision structurée</h3>
          <p>
            Les décisions importantes créées depuis l’arbre apparaîtront ici.
          </p>
        </div>
      ) : (
        <div className="decision-list">
          {decisions.map((decision) => (
            <article key={decision.id} className="decision-card">
              <div className="decision-card-top">
                <div>
                  <h3>{decision.title}</h3>
                  <p className="muted">
                    Date : {decision.date}
                    {decision.stage ? ` • Étape : ${decision.stage}` : ""}
                  </p>
                </div>

                <select
                  value={decision.status || "accepted"}
                  onChange={(e) =>
                    onUpdateDecisionStatus(
                      projectId,
                      decision.id,
                      e.target.value
                    )
                  }
                >
                  <option value="accepted">accepted</option>
                  <option value="pending">pending</option>
                  <option value="rejected">rejected</option>
                  <option value="superseded">superseded</option>
                </select>
              </div>

              {decision.context && (
                <div className="decision-block">
                  <strong>Contexte</strong>
                  <p>{decision.context}</p>
                </div>
              )}

              {decision.decision && (
                <div className="decision-block">
                  <strong>Décision</strong>
                  <p>{decision.decision}</p>
                </div>
              )}

              {Array.isArray(decision.consequences) &&
                decision.consequences.length > 0 && (
                  <div className="decision-block">
                    <strong>Conséquences</strong>
                    <ul>
                      {decision.consequences.map((item, index) => (
                        <li key={index}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
            </article>
          ))}
        </div>
      )}
    </section>
  );
}