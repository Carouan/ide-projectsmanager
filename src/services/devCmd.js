export const DEV_CMD_PROTOCOL = "dev-cmd-v1";

export const DEV_CMD_ACTIONS = Object.freeze({
  ISSUE: "ISSUE",
  ANALYZE: "ANALYZE",
  FIX: "FIX",
  CONTINUE: "CONTINUE",
  REVIEW: "REVIEW",
  MERGE: "MERGE",
});

const VALID_ACTIONS = new Set(Object.values(DEV_CMD_ACTIONS));

function normalizedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizedAction(value) {
  const action = String(value || DEV_CMD_ACTIONS.ISSUE).trim().toUpperCase();
  return VALID_ACTIONS.has(action) ? action : DEV_CMD_ACTIONS.ISSUE;
}

export function createDevCmdRequest({
  projectId,
  repositoryFullName = null,
  action = DEV_CMD_ACTIONS.ISSUE,
  requestId = globalThis.crypto?.randomUUID?.() || `dev-${Date.now()}`,
  version = null,
  description = "",
} = {}) {
  const normalizedProjectId = normalizedString(projectId);

  if (!normalizedProjectId) {
    throw new TypeError("DEV-CMD requires a project identifier.");
  }

  return {
    protocol: DEV_CMD_PROTOCOL,
    projectId: normalizedProjectId,
    repositoryFullName: normalizedString(repositoryFullName),
    action: normalizedAction(action),
    requestId: normalizedString(requestId),
    version: normalizedString(version),
    description: String(description || "").trim(),
  };
}

export function serializeDevCmdRequest(request) {
  const normalized = createDevCmdRequest(request);
  const lines = [
    "[DEV-CMD]",
    "",
    "PROTOCOL: DEV-CMD/1",
    `PROJECT: ${normalized.projectId}`,
    `ACTION: ${normalized.action}`,
    `REQUEST-ID: ${normalized.requestId}`,
  ];

  if (normalized.repositoryFullName) {
    lines.push(`REPOSITORY: ${normalized.repositoryFullName}`);
  }
  if (normalized.version) {
    lines.push(`VERSION: ${normalized.version}`);
  }

  lines.push("", "DESCRIPTION:", normalized.description);

  return lines.join("\n");
}

export function parseDevCmdRequest(value) {
  const text = typeof value === "string" ? value : "";
  if (!text.includes("[DEV-CMD]")) return null;

  const field = (name) => {
    const match = text.match(new RegExp(`^${name}:\\s*(.+)$`, "imu"));
    return match?.[1]?.trim() || null;
  };
  const descriptionMatch = text.match(/\nDESCRIPTION:\s*\n([\s\S]*)$/iu);
  const projectId = field("PROJECT");
  const requestId = field("REQUEST-ID");

  if (!projectId || !requestId) return null;

  return createDevCmdRequest({
    projectId,
    repositoryFullName: field("REPOSITORY"),
    action: field("ACTION"),
    requestId,
    version: field("VERSION"),
    description: descriptionMatch?.[1] || "",
  });
}

export function buildDevCmdIssueUrl(repositoryUrl, request = {}) {
  const base = normalizedString(repositoryUrl);
  if (!base) return null;

  let repository;
  try {
    repository = new URL(base);
  } catch {
    return null;
  }

  if (!["github.com", "www.github.com"].includes(repository.hostname.toLowerCase())) {
    return null;
  }

  const normalized = createDevCmdRequest(request);
  const destination = new URL(
    repository.pathname.replace(/\/$/u, "") + "/issues/new",
    "https://github.com"
  );
  destination.searchParams.set("labels", "dev-cmd");
  destination.searchParams.set(
    "title",
    `[DEV-CMD] ${normalized.action} — ${normalized.projectId}`
  );
  destination.searchParams.set("body", serializeDevCmdRequest(normalized));

  return destination.toString();
}
