import { useMemo, useState } from "react";
import { ATTACHMENT_TYPES } from "../services/attachments";
import { useI18n } from "../i18n/useI18n";

const DEFAULT_FORM = {
  type: "note",
  title: "",
  description: "",
  url: "",
  fileName: "",
  content: "",
};

export default function AttachmentsPanel({
  projectId,
  attachments = [],
  onAddAttachment,
  onUpdateAttachment,
  onRemoveAttachment,
}) {
  const { t } = useI18n();
  const [form, setForm] = useState(DEFAULT_FORM);
  const [editingId, setEditingId] = useState(null);

  const sortedAttachments = useMemo(
    () =>
      [...attachments].sort(
        (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
      ),
    [attachments]
  );

  const editingAttachment =
    sortedAttachments.find((attachment) => attachment.id === editingId) || null;

  function updateFormField(field, value) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function startEdit(attachment) {
    setEditingId(attachment.id);
    setForm({
      type: attachment.type || "note",
      title: attachment.title || "",
      description: attachment.description || "",
      url: attachment.url || "",
      fileName: attachment.fileName || "",
      content: attachment.content || "",
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(DEFAULT_FORM);
  }

  function handleSubmit() {
    if (!form.title.trim() && !form.content.trim() && !form.url.trim()) return;

    const payload = {
      type: form.type,
      title: form.title.trim(),
      description: form.description.trim(),
      url: form.url.trim(),
      fileName: form.fileName.trim(),
      content: form.content.trim(),
    };

    if (editingAttachment) {
      onUpdateAttachment(projectId, editingAttachment.id, payload);
    } else {
      onAddAttachment(projectId, payload);
    }

    resetForm();
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <h2>{t("attachments.title")}</h2>
          <p className="muted">{t("attachments.description")}</p>
        </div>
        <span className="badge">
          {t("attachments.count", { count: sortedAttachments.length })}
        </span>
      </div>

      <div className="form-grid">
        <label className="field">
          <span>{t("attachments.form.type")}</span>
          <select
            value={form.type}
            onChange={(event) => updateFormField("type", event.target.value)}
          >
            {ATTACHMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>

        <label className="field">
          <span>{t("attachments.form.title")}</span>
          <input
            value={form.title}
            onChange={(event) => updateFormField("title", event.target.value)}
            placeholder={t("attachments.form.titlePlaceholder")}
          />
        </label>

        <label className="field field-full">
          <span>{t("attachments.form.description")}</span>
          <textarea
            rows={2}
            value={form.description}
            onChange={(event) =>
              updateFormField("description", event.target.value)
            }
            placeholder={t("attachments.form.descriptionPlaceholder")}
          />
        </label>

        <label className="field">
          <span>{t("attachments.form.url")}</span>
          <input
            value={form.url}
            onChange={(event) => updateFormField("url", event.target.value)}
            placeholder={t("attachments.form.urlPlaceholder")}
          />
        </label>

        <label className="field">
          <span>{t("attachments.form.fileName")}</span>
          <input
            value={form.fileName}
            onChange={(event) =>
              updateFormField("fileName", event.target.value)
            }
            placeholder={t("attachments.form.fileNamePlaceholder")}
          />
        </label>

        <label className="field field-full">
          <span>{t("attachments.form.content")}</span>
          <textarea
            rows={4}
            value={form.content}
            onChange={(event) =>
              updateFormField("content", event.target.value)
            }
            placeholder={t("attachments.form.contentPlaceholder")}
          />
        </label>

        <div className="field-actions">
          <button className="btn btn-primary" onClick={handleSubmit}>
            {editingAttachment
              ? t("attachments.form.save")
              : t("attachments.form.add")}
          </button>
          {editingAttachment ? (
            <button className="btn btn-secondary" onClick={resetForm}>
              {t("attachments.form.cancel")}
            </button>
          ) : null}
        </div>
      </div>

      <div className="backlog-list">
        {sortedAttachments.length === 0 ? (
          <div className="empty-inline">{t("attachments.empty")}</div>
        ) : (
          sortedAttachments.map((attachment) => (
            <article className="backlog-item" key={attachment.id}>
              <div className="backlog-item-top">
                <div>
                  <h3>{attachment.title || t("attachments.item.untitled")}</h3>
                  <p className="muted">
                    {t("attachments.item.type", { type: attachment.type })}
                    {" · "}
                    {attachment.createdAt
                      ? new Date(attachment.createdAt).toLocaleString()
                      : t("attachments.item.unknownDate")}
                  </p>
                </div>
                <span className="badge">{attachment.type}</span>
              </div>

              {attachment.description ? <p>{attachment.description}</p> : null}
              {attachment.url ? (
                <p>
                  <strong>{t("attachments.item.url")}: </strong>
                  <a href={attachment.url} target="_blank" rel="noreferrer">
                    {attachment.url}
                  </a>
                </p>
              ) : null}
              {attachment.fileName ? (
                <p>
                  <strong>{t("attachments.item.fileName")}: </strong>
                  {attachment.fileName}
                </p>
              ) : null}
              {attachment.content ? (
                <p>
                  <strong>{t("attachments.item.content")}: </strong>
                  {attachment.content}
                </p>
              ) : null}

              <div className="project-actions">
                <button
                  className="btn btn-secondary"
                  onClick={() => startEdit(attachment)}
                >
                  {t("attachments.actions.edit")}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => onRemoveAttachment(projectId, attachment.id)}
                >
                  {t("attachments.actions.delete")}
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
