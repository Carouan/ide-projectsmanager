import {
  STAGE_GUIDANCE_FIELD_KEYS,
  asGuidanceList,
  getStageGuidanceKeys,
  getUserGuideUrl,
} from "../../../constants/guidance.js";
import { getStageDefinition } from "../../../constants/stages.js";
import { useI18n } from "../../../i18n/useI18n";

function GuideLink() {
  const { locale, t } = useI18n();

  return (
    <a
      className="guidance-link"
      href={getUserGuideUrl(locale)}
      target="_blank"
      rel="noreferrer"
    >
      {t("guidance.actions.fullGuide")}
    </a>
  );
}

export function ProjectStartGuide() {
  const { t } = useI18n();
  const steps = asGuidanceList(t("guidance.project.steps"));

  return (
    <details className="guidance-card project-start-guide">
      <summary>
        <strong>{t("guidance.project.title")}</strong>
        <span>{t("guidance.project.summary")}</span>
      </summary>

      <div className="guidance-content">
        <p>{t("guidance.project.intro")}</p>
        <ol>
          {steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="guidance-note">{t("guidance.project.ideaCapture")}</p>
        <GuideLink />
      </div>
    </details>
  );
}

export function StageGuidance({ stageKey }) {
  const { t } = useI18n();
  const definition = getStageDefinition(stageKey);
  const keys = getStageGuidanceKeys(stageKey);
  const questions = asGuidanceList(t(keys.questions));

  if (!definition || questions.length === 0) return null;

  return (
    <details className="guidance-card stage-guidance">
      <summary>
        <strong>
          {t("guidance.stage.title", {
            version: definition.shortTitle,
          })}
        </strong>
        <span>{t("guidance.stage.summary")}</span>
      </summary>

      <div className="guidance-content">
        <section>
          <h3>{t("guidance.stage.why")}</h3>
          <p>{t(keys.why)}</p>
        </section>

        <section>
          <h3>{t("guidance.stage.questions")}</h3>
          <ul>
            {questions.map((question) => (
              <li key={question}>{question}</li>
            ))}
          </ul>
        </section>

        <section>
          <h3>{t("guidance.stage.fields")}</h3>
          <div className="guidance-field-grid">
            {STAGE_GUIDANCE_FIELD_KEYS.map((fieldKey) => (
              <article key={fieldKey}>
                <strong>{t(`guidance.fields.${fieldKey}.label`)}</strong>
                <p>{t(`guidance.fields.${fieldKey}.description`)}</p>
              </article>
            ))}
          </div>
        </section>

        <aside className="guidance-example">
          <strong>{t("guidance.stage.example")}</strong>
          <p>{t(keys.example)}</p>
        </aside>

        <GuideLink />
      </div>
    </details>
  );
}
