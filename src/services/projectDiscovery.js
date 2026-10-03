import { githubAuthorizationSession } from "./githubAuthorizationSession.js";

export const IDE_PROJECT_MANIFEST_PATH = ".ide-project.json";
export const IDE_PROJECT_TOPIC = "ide-project";
export const IDE_PROJECT_MANIFEST_VERSION = 1;

const DEFAULT_API_BASE_URL = "https://api.github.com";
const DEFAULT_MAX_REPOSITORIES = 20;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export class ProjectDiscoveryError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "ProjectDiscoveryError";
    this.code = code;
    this.details = details;
  }
}

function normalizedString(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function decodeBase64Utf8(value) {
  const binary = globalThis.atob(String(value || "").replace(/\s+/gu, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function deriveGitHubPagesUrl(repository = {}) {
  const owner = normalizedString(repository.owner?.login || repository.owner);
  const name = normalizedString(repository.name);

  if (!owner || !name || repository.has_pages !== true) return null;

  const ownerPagesRepository = `${owner}.github.io`;
  return name.toLowerCase() === ownerPagesRepository.toLowerCase()
    ? `https://${owner}.github.io/`
    : `https://${owner}.github.io/${name}/`;
}

export function normalizeIdeProjectManifest(rawManifest, repository = {}, options = {}) {
  const raw =
    rawManifest && typeof rawManifest === "object" && !Array.isArray(rawManifest)
      ? rawManifest
      : {};
  const topicOptIn = options.topicOptIn === true;
  const enabled = raw.ide?.enabled !== false;

  if (!enabled || (!topicOptIn && Object.keys(raw).length === 0)) return null;

  const repositoryFullName =
    normalizedString(repository.full_name || repository.fullName) || null;
  const projectId =
    normalizedString(raw.projectId) ||
    repositoryFullName ||
    normalizedString(repository.name);

  if (!projectId) return null;

  const appUrl =
    normalizedString(raw.app?.url) ||
    normalizedString(repository.homepage) ||
    deriveGitHubPagesUrl(repository);

  return {
    schemaVersion: Number(raw.schemaVersion) || IDE_PROJECT_MANIFEST_VERSION,
    projectId,
    name:
      normalizedString(raw.name) ||
      normalizedString(repository.name) ||
      projectId,
    summary:
      normalizedString(raw.summary) ||
      normalizedString(repository.description) ||
      "",
    description: normalizedString(raw.description) || "",
    tags: Array.isArray(raw.tags)
      ? raw.tags.map(normalizedString).filter(Boolean)
      : [],
    ide: {
      enabled: true,
      autoImport: raw.ide?.autoImport !== false,
    },
    app: appUrl
      ? {
          type: normalizedString(raw.app?.type) || "web",
          url: appUrl,
        }
      : null,
    feedback: {
      enabled: raw.feedback?.enabled !== false,
      protocol: normalizedString(raw.feedback?.protocol) || "dev-cmd-v1",
      transport: normalizedString(raw.feedback?.transport) || "github-issues",
    },
  };
}

function candidateFromRepository(repository, manifest) {
  const owner = repository.owner?.login || null;
  const fullName = repository.full_name || (owner && repository.name
    ? `${owner}/${repository.name}`
    : null);

  return {
    projectId: manifest.projectId,
    title: manifest.name,
    summary: manifest.summary,
    description: manifest.description,
    tags: manifest.tags,
    autoImport: manifest.ide.autoImport,
    manifest,
    repository: {
      provider: "github",
      owner,
      name: repository.name || null,
      fullName,
      url: repository.html_url || (fullName ? `https://github.com/${fullName}` : null),
      visibility: repository.visibility || (repository.private ? "private" : "public"),
      defaultBranch: repository.default_branch || null,
      governance: "project-steward",
      externalProjectId: manifest.projectId,
      appUrl: manifest.app?.url || null,
      feedbackProtocol:
        manifest.feedback?.enabled === true ? manifest.feedback.protocol : null,
      feedbackTransport:
        manifest.feedback?.enabled === true ? manifest.feedback.transport : null,
    },
  };
}

export function createGitHubProjectDiscoveryProvider({
  fetchImpl = (...args) => globalThis.fetch(...args),
  authorizationSession = githubAuthorizationSession,
  apiBaseUrl = DEFAULT_API_BASE_URL,
  maxRepositories = DEFAULT_MAX_REPOSITORIES,
  cacheTtlMs = DEFAULT_CACHE_TTL_MS,
  now = () => Date.now(),
} = {}) {
  const safeMaxRepositories = Math.max(
    1,
    Math.min(50, Math.floor(maxRepositories) || DEFAULT_MAX_REPOSITORIES)
  );
  let cache = null;

  async function requestJson(url, { authorized = false, allowNotFound = false } = {}) {
    const options = {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    };

    let response;
    try {
      response = authorized
        ? await authorizationSession.request(url, options)
        : await fetchImpl(url, options);
    } catch (cause) {
      throw new ProjectDiscoveryError(
        cause?.code || "network",
        "GitHub project discovery could not reach GitHub."
      );
    }

    if (allowNotFound && response.status === 404) return null;
    if (!response.ok) {
      throw new ProjectDiscoveryError(
        response.status === 403 || response.status === 429
          ? "rate_limited"
          : "http_error",
        `GitHub project discovery failed with status ${response.status}.`,
        { status: response.status }
      );
    }

    return response.json();
  }

  async function readManifest(repository, authorized) {
    const fullName = repository.full_name;
    if (!fullName) return null;

    const url = `${apiBaseUrl}/repos/${fullName
      .split("/")
      .map(encodeURIComponent)
      .join("/")}/contents/${IDE_PROJECT_MANIFEST_PATH}`;
    const document = await requestJson(url, {
      authorized: authorized && repository.private === true,
      allowNotFound: true,
    });

    if (!document) return null;
    if (document.encoding !== "base64" || typeof document.content !== "string") {
      throw new ProjectDiscoveryError(
        "invalid_manifest",
        `${fullName} contains an unreadable ${IDE_PROJECT_MANIFEST_PATH}.`
      );
    }

    try {
      return JSON.parse(decodeBase64Utf8(document.content));
    } catch {
      throw new ProjectDiscoveryError(
        "invalid_manifest",
        `${fullName} contains invalid JSON in ${IDE_PROJECT_MANIFEST_PATH}.`
      );
    }
  }

  async function discover({ owner, forceRefresh = false } = {}) {
    const normalizedOwner = normalizedString(owner);
    if (!normalizedOwner) {
      throw new ProjectDiscoveryError(
        "owner_required",
        "A GitHub owner is required for project discovery."
      );
    }
    if (!/^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/u.test(normalizedOwner)) {
      throw new ProjectDiscoveryError(
        "invalid_owner",
        "The GitHub owner used for discovery is invalid."
      );
    }

    const authorized = authorizationSession?.isAuthorized?.() === true;
    const cacheKey = `${normalizedOwner.toLowerCase()}:${authorized ? "private" : "public"}`;
    if (
      !forceRefresh &&
      cache?.key === cacheKey &&
      now() - cache.createdAt < cacheTtlMs
    ) {
      return cache.result;
    }

    const query = new URLSearchParams({
      q: `user:${normalizedOwner} fork:false`,
      sort: "updated",
      order: "desc",
      per_page: String(safeMaxRepositories),
    });
    const searchUrl = `${apiBaseUrl}/search/repositories?${query.toString()}`;
    const search = await requestJson(searchUrl, { authorized });
    const repositories = Array.isArray(search?.items) ? search.items : [];
    const candidates = [];
    const warnings = [];

    for (const repository of repositories) {
      const topicOptIn = Array.isArray(repository.topics)
        ? repository.topics.includes(IDE_PROJECT_TOPIC)
        : false;

      try {
        const rawManifest = await readManifest(repository, authorized);
        const manifest = normalizeIdeProjectManifest(rawManifest, repository, {
          topicOptIn,
        });
        if (!manifest) continue;
        candidates.push(candidateFromRepository(repository, manifest));
      } catch (error) {
        warnings.push({
          repository: repository.full_name || repository.name || null,
          code: error?.code || "unknown",
        });
      }
    }

    const result = {
      owner: normalizedOwner,
      candidates,
      warnings,
      authorized,
      discoveredAt: new Date(now()).toISOString(),
    };
    cache = { key: cacheKey, createdAt: now(), result };
    return result;
  }

  return Object.freeze({ discover });
}

export const githubProjectDiscoveryProvider = createGitHubProjectDiscoveryProvider();
