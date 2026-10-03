import {
  IDE_PROJECT_MANIFEST_PATH,
  IDE_PROJECT_TOPIC,
  parseProjectManifest,
} from "./projectManifest.js";

const DEFAULT_API_BASE_URL = "https://api.github.com";

function decodeBase64(document) {
  if (document?.encoding !== "base64" || typeof document.content !== "string") return "";
  const binary = globalThis.atob(document.content.replace(/\s+/gu, ""));
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export async function discoverGitHubProjects({
  owner = "Carouan",
  fetchImpl = (...args) => globalThis.fetch(...args),
  apiBaseUrl = DEFAULT_API_BASE_URL,
} = {}) {
  const query = encodeURIComponent(`topic:${IDE_PROJECT_TOPIC} user:${owner}`);
  const response = await fetchImpl(
    `${apiBaseUrl}/search/repositories?q=${query}&sort=updated&order=desc&per_page=50`,
    {
      method: "GET",
      credentials: "omit",
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    }
  );

  if (!response.ok) {
    const error = new Error(`GitHub discovery failed with status ${response.status}`);
    error.code = response.status === 403 ? "rate_limited" : "github_error";
    throw error;
  }

  const payload = await response.json();
  const repositories = Array.isArray(payload?.items) ? payload.items : [];

  const results = await Promise.all(
    repositories.map(async (repository) => {
      let manifest = null;
      try {
        const manifestResponse = await fetchImpl(
          `${apiBaseUrl}/repos/${encodeURIComponent(repository.owner.login)}/${encodeURIComponent(repository.name)}/contents/${IDE_PROJECT_MANIFEST_PATH}`,
          {
            method: "GET",
            credentials: "omit",
            headers: {
              Accept: "application/vnd.github+json",
              "X-GitHub-Api-Version": "2022-11-28",
            },
          }
        );
        if (manifestResponse.ok) {
          manifest = parseProjectManifest(decodeBase64(await manifestResponse.json()));
        }
      } catch {
        manifest = null;
      }

      return {
        repository: {
          provider: "github",
          owner: repository.owner?.login || owner,
          name: repository.name,
          fullName: repository.full_name,
          url: repository.html_url,
          defaultBranch: repository.default_branch || null,
          visibility: repository.visibility || "public",
          archived: repository.archived === true,
          updatedAt: repository.updated_at || null,
        },
        manifest,
        title: manifest?.project?.name || repository.name,
        projectId: manifest?.project?.id || null,
        appUrl: manifest?.app?.url || repository.homepage || null,
      };
    })
  );

  return results.filter((candidate) => candidate.manifest?.ide?.enabled !== false);
}
