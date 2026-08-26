const ATTACHMENT_TYPES = ["url", "note", "snippet", "file_ref"];

function newAttachmentId() {
  return `att_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

function asString(value) {
  if (typeof value === "string") return value;
  if (value === null || value === undefined) return "";
  return String(value);
}

function normalizeType(type) {
  return ATTACHMENT_TYPES.includes(type) ? type : "note";
}

export function normalizeAttachment(attachment, fallback = {}) {
  if (!attachment || typeof attachment !== "object") {
    return null;
  }

  return {
    id: asString(attachment.id) || fallback.id || newAttachmentId(),
    type: normalizeType(attachment.type),
    title: asString(attachment.title),
    description: asString(attachment.description),
    url: asString(attachment.url),
    fileName: asString(attachment.fileName),
    content: asString(attachment.content),
    createdAt: asString(attachment.createdAt) || fallback.createdAt || new Date().toISOString(),
  };
}

export function normalizeAttachments(attachments) {
  if (!Array.isArray(attachments)) return [];

  return attachments
    .map((attachment) => normalizeAttachment(attachment))
    .filter(Boolean);
}

export function createAttachment(payload = {}) {
  return normalizeAttachment(payload, {
    id: newAttachmentId(),
    createdAt: new Date().toISOString(),
  });
}

export function patchAttachment(existingAttachment, patch = {}) {
  return normalizeAttachment(
    {
      ...existingAttachment,
      ...patch,
      id: existingAttachment?.id,
      createdAt: existingAttachment?.createdAt,
    },
    {
      id: existingAttachment?.id,
      createdAt: existingAttachment?.createdAt,
    }
  );
}

export { ATTACHMENT_TYPES };
