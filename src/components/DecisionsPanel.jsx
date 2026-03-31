import { useI18n } from "../i18n/useI18n";

export default function DecisionsPanel({
  decisions = [],
  onUpdateDecisionStatus,
  projectId,
}) {
  const { t } = useI18n();

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t("decisions.title")}</h2>
          <p className="muted">{t("decisions.description")}</p>
        </div>
      </div>

      {decisions.length === 0 ? (
        <div className="empty-state">
          <h3>{t("decisions.empty.title")}</h3>
          <p>{t("decisions.empty.description")}</p>
        </div>
      ) : (
        <div className="decision-list">
          {decisions.map((decision) => (
            <article key={decision.id} className="decision-card">
              <div className="decision-card-top">
                <div>
                  <h3>{decision.title}</h3>
                  <p className="muted">
                    {t("decisions.item.date", { date: decision.date })}
                    {decision.stage
                      ? ` • ${t("decisions.item.stage", { stage: decision.stage })}`
                      : ""}
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
                  <option value="accepted">{t("decisions.status.accepted")}</option>
                  <option value="pending">{t("decisions.status.pending")}</option>
                  <option value="rejected">{t("decisions.status.rejected")}</option>
                  <option value="superseded">{t("decisions.status.superseded")}</option>
                </select>
              </div>

              {decision.context && (
                <div className="decision-block">
                  <strong>{t("decisions.item.context")}</strong>
                  <p>{decision.context}</p>
                </div>
              )}

              {decision.decision && (
                <div className="decision-block">
                  <strong>{t("decisions.item.decision")}</strong>
                  <p>{decision.decision}</p>
                </div>
              )}

              {Array.isArray(decision.consequences) &&
                decision.consequences.length > 0 && (
                  <div className="decision-block">
                    <strong>{t("decisions.item.consequences")}</strong>
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
