export const IDE_PROJECT_MANIFEST_PATH = ".ide-project.yml";
export const IDE_PROJECT_TOPIC = "ide-project";
export const IDE_PROJECT_MANIFEST_VERSION = 1;

function scalar(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return "";
  if (trimmed === "true") return true;
  if (trimmed === "false") return false;
  if (/^-?\d+(?:\.\d+)?$/u.test(trimmed)) return Number(trimmed);
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).replace(/\\(["'\\])/gu, "$1");
  }
  return trimmed;
}

export function parseSimpleYaml(source) {
  const root = {};
  const stack = [{ indent: -1, value: root }];

  for (const rawLine of String(source || "").split(/\r?\n/u)) {
    if (!rawLine.trim() || /^\s*#/u.test(rawLine)) continue;
    const match = rawLine.match(/^(\s*)([A-Za-z0-9_.-]+):(?:\s*(.*))?$/u);
    if (!match) continue;

    const indent = match[1].replace(/\t/gu, "  ").length;
    const key = match[2];
    const rawValue = match[3] ?? "";

    while (stack.length > 1 && indent <= stack.at(-1).indent) stack.pop();
    const parent = stack.at(-1).value;

    if (!rawValue.trim()) {
      parent[key] = {};
      stack.push({ indent, value: parent[key] });
    } else {
      parent[key] = scalar(rawValue);
    }
  }

  return root;
}

function cleanUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    if (!["http:", "https:", "mailto:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeProjectManifest(value) {
  const version = Number(value?.version ?? value?.schemaVersion ?? 0);
  if (version !== IDE_PROJECT_MANIFEST_VERSION) return null;

  const projectId = String(value?.project?.id || value?.projectId || "").trim();
  const name = String(value?.project?.name || value?.name || "").trim();

  return {
    version,
    project: {
      id: projectId || null,
      name: name || null,
    },
    ide: {
      enabled: value?.ide?.enabled !== false,
    },
    app: {
      type: String(value?.app?.type || "").trim() || null,
      url: cleanUrl(value?.app?.url),
    },
    feedback: {
      enabled: value?.feedback?.enabled === true,
      protocol: String(value?.feedback?.protocol || "").trim() || null,
      transport: String(value?.feedback?.transport || "").trim() || null,
      label: String(value?.feedback?.label || "dev-cmd").trim() || "dev-cmd",
      email: cleanUrl(value?.feedback?.email),
    },
  };
}

export function parseProjectManifest(source) {
  return normalizeProjectManifest(parseSimpleYaml(source));
}

export function renderProjectManifest({
  projectId,
  name,
  appType = "pwa",
  appUrl = "",
  feedbackEnabled = true,
  feedbackTransport = "github-issues",
} = {}) {
  const quote = (value) => JSON.stringify(String(value || ""));
  return [
    "version: 1",
    "project:",
    `  id: ${quote(projectId)}`,
    `  name: ${quote(name)}`,
    "ide:",
    "  enabled: true",
    "app:",
    `  type: ${quote(appType)}`,
    `  url: ${quote(appUrl)}`,
    "feedback:",
    `  enabled: ${feedbackEnabled ? "true" : "false"}`,
    '  protocol: "dev-cmd-v1"',
    `  transport: ${quote(feedbackTransport)}`,
    '  label: "dev-cmd"',
    "",
  ].join("\n");
}
