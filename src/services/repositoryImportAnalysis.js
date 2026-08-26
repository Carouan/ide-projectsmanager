const GITHUB_API_BASE_URL = "https://api.github.com";
const CHECKBOX_LINE = /^(\s*)(?:(?:[-*+])|(?:\d+\.))\s+\[([ xX])\]\s+(.+?)\s*$/u;
const HEADING_LINE = /^(#{1,6})\s+(.+?)\s*$/u;
const FORMAL_ROADMAP_HEADING = /\b(?:roadmap|feuille de route)\b/iu;
const FORMAL_SCOPE = /<!--\s*roadmap-progress\s*:\s*start\s*-->/iu;
const SAFE_GITHUB_OWNER = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/u;
const SAFE_GITHUB_REPOSITORY = /^[a-zA-Z0-9][a-zA-Z0-9_.-]{0,99}$/u;

export class RepositoryImportAnalysisError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RepositoryImportAnalysisError";
    this.code = code;
    Object.assign(this, details);
  }
}

function analysisError(code, message, details) {
  return new RepositoryImportAnalysisError(code, message, details);
}

function indentationWidth(value) {
  return String(value || "").replace(/\t/g, "  ").length;
}

function stripObjectivePrefix(label) {
  return String(label || "")
    .replace(/\s*<!--\s*weight\s*:\s*\d{1,3}\s*-->\s*$/iu, "")
    .trim();
}

export function normalizePublicGitHubRepositoryUrl(value) {
  let url;

  try {
    url = new URL(String(value || "").trim());
  } catch {
    throw analysisError("invalid_repository_url", "The GitHub repository URL is invalid.");
  }

  if (
    url.protocol !== "https:" ||
    url.hostname.toLowerCase() !== "github.com" ||
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.port
  ) {
    throw analysisError(
      "invalid_repository_url",
      "Use a public canonical HTTPS GitHub repository URL."
    );
  }

  const rawParts = url.pathname.split("/").filter(Boolean);
  if (rawParts.length !== 2) {
    throw analysisError(
      "invalid_repository_url",
      "The GitHub URL must contain exactly one owner and one repository."
    );
  }

  let owner;
  let repository;
  try {
    owner = decodeURIComponent(rawParts[0]);
    repository = decodeURIComponent(rawParts[1]).replace(/\.git$/iu, "");
  } catch {
    throw analysisError("invalid_repository_url", "The GitHub repository path is invalid.");
  }

  if (
    !SAFE_GITHUB_OWNER.test(owner) ||
    !SAFE_GITHUB_REPOSITORY.test(repository) ||
    repository.includes("..")
  ) {
    throw analysisError("invalid_repository_url", "The GitHub repository path is unsafe.");
  }

  const fullName = `${owner}/${repository}`;
  return {
    owner,
    name: repository,
    fullName,
    url: `https://github.com/${fullName}`,
    apiPath: `${encodeURIComponent(owner)}/${encodeURIComponent(repository)}`,
  };
}

function classifyChecklist(markdown, sourcePath) {
  const isReadme = /(^|\/)readme\.md$/iu.test(sourcePath);
  const hasFormalHeading = String(markdown || "")
    .split(/\r?\n/)
    .some((line) => {
      const heading = HEADING_LINE.exec(line.trim());
      return heading && FORMAL_ROADMAP_HEADING.test(heading[2]);
    });
  const isFormal = !isReadme || hasFormalHeading || FORMAL_SCOPE.test(markdown);

  return {
    kind: isFormal ? "formal_roadmap" : "indicative_checklist",
    confidence: isFormal ? "high" : "medium",
  };
}

export function analyzeMarkdownObjectives(markdown, options = {}) {
  const sourcePath = options.sourcePath || "README.md";
  const sourceUrl = options.sourceUrl || null;
  const lines = String(markdown || "").split(/\r?\n/);
  const classification = classifyChecklist(markdown, sourcePath);
  const objectives = [];
  const stack = [];
  let inFence = false;
  let section = null;

  for (const [index, line] of lines.entries()) {
    if (/^\s*(```|~~~)/u.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const heading = HEADING_LINE.exec(line.trim());
    if (heading) {
      section = heading[2].trim();
      continue;
    }

    const checkbox = CHECKBOX_LINE.exec(line);
    if (!checkbox) continue;

    const label = stripObjectivePrefix(checkbox[3]);
    if (!label) continue;

    const indentation = indentationWidth(checkbox[1]);
    while (stack.length > 0 && stack.at(-1).indentation >= indentation) {
      stack.pop();
    }

    const parent = stack.at(-1) || null;
    const objective = {
      id: `objective-${index + 1}`,
      label,
      completed: checkbox[2].toLowerCase() === "x",
      line: index + 1,
      indentation,
      depth: stack.length,
      parentId: parent?.id || null,
      childIds: [],
      section,
      provenance: {
        sourcePath,
        sourceUrl,
        line: index + 1,
        confidence: classification.confidence,
      },
    };

    if (parent) parent.childIds.push(objective.id);
    objectives.push(objective);
    stack.push(objective);
  }

  const leafObjectives = objectives.filter(({ childIds }) => childIds.length === 0);
  const completedLeafObjectives = leafObjectives.filter(({ completed }) => completed);

  return {
    sourcePath,
    sourceUrl,
    classification,
    objectives,
    leafObjectives,
    counts: {
      checkboxLines: objectives.length,
      leafObjectives: leafObjectives.length,
      completedLeaves: completedLeafObjectives.length,
      openLeaves: leafObjectives.length - completedLeafObjectives.length,
    },
    percent: leafObjectives.length > 0
      ? Math.round((completedLeafObjectives.length / leafObjectives.length) * 100)
      : null,
  };
}

function firstMarkdownTitle(markdown) {
  for (const line of String(markdown || "").split(/\r?\n/)) {
    const heading = HEADING_LINE.exec(line.trim());
    if (heading?.[1].length === 1) return heading[2].trim();
  }
  return null;
}

function firstMarkdownParagraph(markdown) {
  const lines = String(markdown || "").split(/\r?\n/);
  const paragraph = [];
  let passedTitle = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!passedTitle && /^#\s+/u.test(trimmed)) {
      passedTitle = true;
      continue;
    }
    if (!passedTitle || !trimmed || /^[-=]{3,}$/u.test(trimmed)) {
      if (paragraph.length > 0) break;
      continue;
    }
    if (/^(?:[-*+]\s+|\d+\.\s+|#{1,6}\s+)/u.test(trimmed)) break;
    paragraph.push(trimmed);
  }

  return paragraph.join(" ") || null;
}

function decodeGitHubContent(document) {
  if (typeof document?.content !== "string" || document.encoding !== "base64") {
    return null;
  }

  try {
    const binary = globalThis.atob(document.content.replace(/\s+/g, ""));
    const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    throw analysisError("invalid_document_encoding", "A GitHub document could not be decoded.");
  }
}

export function buildPublicRepositoryImportAnalysis({
  identity,
  repository,
  readme = null,
  roadmapDocuments = [],
}) {
  const documents = [...roadmapDocuments, ...(readme ? [readme] : [])]
    .map((document) => ({
      sourcePath: document.path,
      sourceUrl: document.url,
      markdown: document.markdown,
      objectiveAnalysis: analyzeMarkdownObjectives(document.markdown, {
        sourcePath: document.path,
        sourceUrl: document.url,
      }),
    }));
  const measurableDocuments = documents.filter(({ objectiveAnalysis }) =>
    objectiveAnalysis.counts.leafObjectives > 0
  );
  const primaryObjectives = measurableDocuments.find(({ objectiveAnalysis }) =>
    objectiveAnalysis.classification.kind === "formal_roadmap"
  ) || measurableDocuments.find(({ sourcePath }) => /readme\.md$/iu.test(sourcePath)) || null;
  const readmeMarkdown = readme?.markdown || "";

  return {
    repository: {
      provider: "github",
      fullName: repository.full_name || identity.fullName,
      owner: repository.owner?.login || identity.owner,
      name: repository.name || identity.name,
      url: repository.html_url || identity.url,
      visibility: repository.visibility || "public",
      defaultBranch: repository.default_branch || null,
      archived: repository.archived === true,
      description: repository.description || null,
      provenance: {
        sourceUrl: repository.html_url || identity.url,
        confidence: "high",
      },
    },
    suggested: {
      title: firstMarkdownTitle(readmeMarkdown) || repository.name || identity.name,
      summary:
        repository.description ||
        firstMarkdownParagraph(readmeMarkdown) ||
        `Existing project from ${identity.fullName}`,
      description:
        firstMarkdownParagraph(readmeMarkdown) ||
        repository.description ||
        `Existing project from ${identity.fullName}`,
    },
    documents,
    primaryObjectives,
    confidence: {
      repository: "high",
      content: readme ? "high" : "low",
      objectives: primaryObjectives?.objectiveAnalysis.classification.confidence || "low",
    },
    readOnly: true,
  };
}

export function createPublicGitHubProjectImportProvider({
  fetchImpl = (...args) => globalThis.fetch(...args),
  apiBaseUrl = GITHUB_API_BASE_URL,
} = {}) {
  async function requestJson(path, { optional = false } = {}) {
    let response;

    try {
      response = await fetchImpl(`${apiBaseUrl}${path}`, {
        method: "GET",
        credentials: "omit",
        headers: {
          Accept: "application/vnd.github+json",
          "X-GitHub-Api-Version": "2022-11-28",
        },
      });
    } catch {
      throw analysisError("network", "GitHub could not be reached.");
    }

    if (optional && response.status === 404) return null;
    if (!response.ok) {
      const code = response.status === 404
        ? "not_found"
        : response.status === 403
          ? "forbidden"
          : "http_error";
      throw analysisError(code, "GitHub could not provide the requested public data.", {
        status: response.status,
      });
    }

    return response.json();
  }

  async function inspect(repositoryUrl) {
    const identity = normalizePublicGitHubRepositoryUrl(repositoryUrl);
    const repository = await requestJson(`/repos/${identity.apiPath}`);

    if (repository.private === true || repository.visibility === "private") {
      throw analysisError(
        "public_repository_required",
        "This import path reads public repositories only."
      );
    }

    const [readmeDocument, rootRoadmap, docsRoadmap] = await Promise.all([
      requestJson(`/repos/${identity.apiPath}/readme`, { optional: true }),
      requestJson(`/repos/${identity.apiPath}/contents/ROADMAP.md`, { optional: true }),
      requestJson(`/repos/${identity.apiPath}/contents/docs/ROADMAP.md`, { optional: true }),
    ]);
    const normalizeDocument = (document, fallbackPath) => {
      if (!document) return null;
      const markdown = decodeGitHubContent(document);
      if (typeof markdown !== "string") {
        throw analysisError(
          "invalid_document_encoding",
          "A GitHub document did not use the expected text encoding."
        );
      }
      return {
        path: document.path || fallbackPath,
        url: document.html_url || `${identity.url}/blob/${repository.default_branch || "main"}/${fallbackPath}`,
        markdown,
      };
    };
    const readme = normalizeDocument(readmeDocument, "README.md");
    const roadmapDocuments = [
      normalizeDocument(rootRoadmap, "ROADMAP.md"),
      normalizeDocument(docsRoadmap, "docs/ROADMAP.md"),
    ].filter(Boolean);

    return buildPublicRepositoryImportAnalysis({
      identity,
      repository,
      readme,
      roadmapDocuments,
    });
  }

  return Object.freeze({ inspect });
}
