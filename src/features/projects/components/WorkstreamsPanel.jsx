import { useMemo, useState } from "react";
import { formatStageLabel } from "../../../constants/stages";
import { useI18n } from "../../../i18n/useI18n";
import {
  WORKSTREAM_PROJECT_TYPE,
  WORKSTREAM_STATUS,
} from "../../../services/projectWorkstreams";
import { deriveWorkstreamPlanning } from "../services/workstreamPlanningModel";
import WorkstreamStageMatrix from "./WorkstreamStageMatrix";

const INITIAL_FORM = Object.freeze({
  title: "",
  description: "",
  category: "",
  icon: "",
  color: "#8b5cf6",
  status: WORKSTREAM_STATUS.ACTIVE,
});

function WorkstreamSummary({ planning, t }) {
  const items = [
    { key: "total", value: planning.summary.total, accent: "purple" },
    { key: "active", value: planning.summary.active, accent: "green" },
    { key: "openAssigned", value: planning.summary.openAssigned, accent: "blue" },
    { key: "blocked", value: planning.summary.blocked, accent: "red" },
  ];

  return (
    <dl className="workstream-summary-grid">
      {items.map((item) => (
        <div
          className={`workstream-summary-card workstream-summary-${item.accent}`}
          key={item.key}
        >
          <dt>{t(`workstreams.summary.${item.key}`)}</dt>
          <dd>{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function WorkstreamFocus({ focus, onOpenBacklog, t }) {
  if (!focus) return null;

  return (
    <article className="workstream-focus">
      <div className="workstream-focus-copy">
        <div className="workstream-focus-eyebrow">
          {t("workstreams.focus.eyebrow")}
        </div>
        <h3>{focus.workstream.title}</h3>
        <p>{focus.nextAction?.title}</p>
        <button
          className="workstream-focus-action"
          type="button"
          onClick={() => onOpenBacklog(focus.workstream.id)}
        >
          {t("workstreams.focus.openBacklog")} <span aria-hidden="true">→</span>
        </button>
      </div>
      <div className="workstream-focus-meta">
        <span
          className={`workstream-status workstream-status-${focus.workstream.status}`}
        >
          {t(`workstreams.status.${focus.workstream.status}`)}
        </span>
        <strong>{focus.openCount}</strong>
        <span>{t("workstreams.focus.openActions")}</span>
      </div>
    </article>
  );
}

function WorkstreamCard({ row, index, total, onEdit, onReorder, onUpdate, onOpenBacklog, t }) {
  const { workstream } = row;

  return (
    <article
      className={`workstream-card${workstream.archived ? " workstream-card-archived" : ""}`}
      style={{ "--workstream-accent": workstream.color || "#8b5cf6" }}
    >
      <div className="workstream-card-top">
        <div>
          {workstream.category && (
            <span className="workstream-category">{workstream.category}</span>
          )}
          <h3>
            {workstream.icon && (
              <span aria-hidden="true" className="workstream-card-icon">
                {workstream.icon}
              </span>
            )}
            {workstream.title}
          </h3>
        </div>
        <span className={`workstream-status workstream-status-${workstream.status}`}>
          {workstream.archived
            ? t("workstreams.status.archived")
            : t(`workstreams.status.${workstream.status}`)}
        </span>
      </div>

      {workstream.description && (
        <p className="muted workstream-card-description">{workstream.description}</p>
      )}

      {row.nextAction ? (
        <div className="workstream-next-action">
          <span>{t("workstreams.card.nextAction")}</span>
          <strong>{row.nextAction.title}</strong>
        </div>
      ) : (
        <p className="muted workstream-card-quiet">{t("workstreams.card.noAction")}</p>
      )}

      <div className="workstream-card-counts">
        <span>{t("workstreams.card.openCount", { count: row.openCount })}</span>
        <span>{t("workstreams.card.totalCount", { count: row.totalCount })}</span>
      </div>

      <div className="workstream-card-actions">
        <button className="btn btn-secondary" type="button" onClick={() => onEdit(workstream)}>
          {t("workstreams.actions.edit")}
        </button>
        <button
          className="btn btn-secondary workstream-icon-button"
          type="button"
          disabled={index === 0}
          aria-label={t("workstreams.actions.moveUp", { title: workstream.title })}
          onClick={() => onReorder(workstream.id, "up")}
        >
          ↑
        </button>
        <button
          className="btn btn-secondary workstream-icon-button"
          type="button"
          disabled={index === total - 1}
          aria-label={t("workstreams.actions.moveDown", { title: workstream.title })}
          onClick={() => onReorder(workstream.id, "down")}
        >
          ↓
        </button>
        <button
          className="btn btn-secondary"
          type="button"
          onClick={() => onUpdate(workstream.id, { archived: !workstream.archived })}
        >
          {t(
            workstream.archived
              ? "workstreams.actions.reactivate"
              : "workstreams.actions.archive"
          )}
        </button>
        {row.totalCount > 0 && (
          <button
            className="btn btn-secondary"
            type="button"
            onClick={() => onOpenBacklog(workstream.id)}
          >
            {t("workstreams.actions.viewTasks")}
          </button>
        )}
      </div>
    </article>
  );
}

export default function WorkstreamsPanel({
  projectDoc,
  onAddWorkstream,
  onUpdateWorkstream,
  onReorderWorkstream,
  onApplyTemplate,
  onOpenBacklog,
}) {
  const { t, locale } = useI18n();
  const [showArchived, setShowArchived] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [templateType, setTemplateType] = useState("");
  const [form, setForm] = useState(INITIAL_FORM);
  const [error, setError] = useState("");
  const planning = useMemo(
    () => deriveWorkstreamPlanning(projectDoc, { includeArchived: showArchived }),
    [projectDoc, showArchived]
  );
  const projectId = projectDoc.project.id;

  function updateField(field, value) {
    setForm((previous) => ({ ...previous, [field]: value }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(INITIAL_FORM);
    setError("");
  }

  function editWorkstream(workstream) {
    setEditingId(workstream.id);
    setForm({
      title: workstream.title,
      description: workstream.description || "",
      category: workstream.category || "",
      icon: workstream.icon || "",
      color: workstream.color || INITIAL_FORM.color,
      status: workstream.status,
    });
    setError("");
  }

  function handleSubmit(event) {
    event.preventDefault();

    if (!form.title.trim()) {
      setError(t("workstreams.errors.titleRequired"));
      return;
    }

    const payload = {
      ...form,
      title: form.title.trim(),
      category: form.category.trim(),
      icon: form.icon.trim(),
      description: form.description.trim(),
    };

    if (editingId) {
      onUpdateWorkstream(projectId, editingId, payload);
    } else {
      onAddWorkstream(projectId, payload);
    }

    resetForm();
  }

  return (
    <section className="panel workstreams-panel">
      <div className="panel-header workstream-section-header">
        <div>
          <div className="eyebrow">{t("workstreams.eyebrow")}</div>
          <h2>{t("workstreams.title")}</h2>
          <p className="muted">
            {t("workstreams.description", {
              stage: formatStageLabel(planning.currentStageKey),
            })}
          </p>
        </div>

        {planning.summary.archived > 0 && (
          <button
            className="btn btn-secondary"
            type="button"
            aria-pressed={showArchived}
            onClick={() => setShowArchived((previous) => !previous)}
          >
            {t(
              showArchived
                ? "workstreams.actions.hideArchived"
                : "workstreams.actions.showArchived",
              { count: planning.summary.archived }
            )}
          </button>
        )}
      </div>

      <WorkstreamSummary planning={planning} t={t} />
      <WorkstreamFocus focus={planning.focus} onOpenBacklog={onOpenBacklog} t={t} />

      {planning.summary.unassigned > 0 && planning.summary.total > 0 && (
        <p className="workstream-unassigned-note">
          {t("workstreams.summary.unassigned", {
            count: planning.summary.unassigned,
          })}
          <button type="button" onClick={() => onOpenBacklog("unassigned")}>
            {t("workstreams.actions.viewUnassigned")}
          </button>
        </p>
      )}

      <details className="workstream-templates" open={planning.summary.total === 0 || undefined}>
        <summary>{t("workstreams.templates.title")}</summary>
        <p className="muted">{t("workstreams.templates.description")}</p>
        <div className="workstream-template-controls">
          <label className="field">
            <span>{t("workstreams.templates.type")}</span>
            <select value={templateType} onChange={(event) => setTemplateType(event.target.value)}>
              <option value="">{t("workstreams.templates.choose")}</option>
              {Object.values(WORKSTREAM_PROJECT_TYPE).map((projectType) => (
                <option key={projectType} value={projectType}>
                  {t(`workstreams.templates.${projectType}`)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="btn btn-secondary"
            type="button"
            disabled={!templateType}
            onClick={() => onApplyTemplate(projectId, templateType, locale)}
          >
            {t("workstreams.templates.apply")}
          </button>
        </div>
      </details>

      <form className="workstream-form" onSubmit={handleSubmit}>
        <div className="workstream-section-header">
          <h3>
            {t(editingId ? "workstreams.form.editTitle" : "workstreams.form.newTitle")}
          </h3>
          {editingId && (
            <button className="btn btn-secondary" type="button" onClick={resetForm}>
              {t("workstreams.actions.cancel")}
            </button>
          )}
        </div>

        <div className="form-grid workstream-form-grid">
          <label className="field">
            <span>{t("workstreams.form.title")}</span>
            <input
              value={form.title}
              onChange={(event) => updateField("title", event.target.value)}
              placeholder={t("workstreams.form.titlePlaceholder")}
            />
          </label>

          <label className="field">
            <span>{t("workstreams.form.status")}</span>
            <select
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
            >
              {Object.values(WORKSTREAM_STATUS).map((status) => (
                <option key={status} value={status}>
                  {t(`workstreams.status.${status}`)}
                </option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>{t("workstreams.form.category")}</span>
            <input
              value={form.category}
              onChange={(event) => updateField("category", event.target.value)}
              placeholder={t("workstreams.form.categoryPlaceholder")}
            />
          </label>

          <div className="workstream-form-appearance">
            <label className="field">
              <span>{t("workstreams.form.icon")}</span>
              <input
                value={form.icon}
                onChange={(event) => updateField("icon", event.target.value)}
                placeholder="✦"
                maxLength={8}
              />
            </label>
            <label className="field workstream-color-field">
              <span>{t("workstreams.form.color")}</span>
              <input
                type="color"
                value={form.color}
                onChange={(event) => updateField("color", event.target.value)}
              />
            </label>
          </div>

          <label className="field field-full">
            <span>{t("workstreams.form.description")}</span>
            <textarea
              rows={3}
              value={form.description}
              onChange={(event) => updateField("description", event.target.value)}
              placeholder={t("workstreams.form.descriptionPlaceholder")}
            />
          </label>
        </div>

        {error && <p className="workstream-form-error">{error}</p>}

        <button className="btn btn-primary" type="submit">
          {t(editingId ? "workstreams.actions.save" : "workstreams.actions.add")}
        </button>
      </form>

      {planning.rows.length > 0 && (
        <section className="workstream-list" aria-labelledby="workstream-list-title">
          <div className="workstream-section-header">
            <div>
              <div className="eyebrow">{t("workstreams.list.eyebrow")}</div>
              <h3 id="workstream-list-title">{t("workstreams.list.title")}</h3>
            </div>
          </div>

          <div className="workstream-card-grid">
            {planning.rows.map((row, index) => (
              <WorkstreamCard
                index={index}
                key={row.workstream.id}
                row={row}
                total={planning.rows.length}
                onEdit={editWorkstream}
                onOpenBacklog={onOpenBacklog}
                onReorder={(workstreamId, direction) =>
                  onReorderWorkstream(projectId, workstreamId, direction)
                }
                onUpdate={(workstreamId, patch) =>
                  onUpdateWorkstream(projectId, workstreamId, patch)
                }
                t={t}
              />
            ))}
          </div>
        </section>
      )}

      <WorkstreamStageMatrix planning={planning} />
    </section>
  );
}
