import { RepositoryProviderError } from "./repositoryProvider.js";

const DEFAULT_API_BASE_URL = "https://api.github.com";
const DEFAULT_MAX_PULL_REQUESTS = 20;
const DEFAULT_MAX_ENRICHED_PULL_REQUESTS = 5;
const FAILURE_STATES = new Set(["error", "failure"]);

function parseRepositoryIdentity(repository) {
  let candidate = String(repository?.fullName || "").trim();

  if (!candidate && repository?.url) {
    try {
      const url = new URL(repository.url);
      const isGitHubHost = ["github.com", "www.github.com"].includes(
        url.hostname.toLowerCase()
      );
      const pathParts = url.pathname.split("/").filter(Boolean);

      if (isGitHubHost && pathParts.length >= 2) {
        candidate = `${pathParts[0]}/${pathParts[1].replace(/\.git$/i, "")}`;
      }
    } catch {
      candidate = "";
    }
  }

  const parts = candidate.split("/");

  if (parts.length !== 2 || parts.some((part) => !part.trim())) {
    throw new RepositoryProviderError(
      "invalid_repository",
      "GitHub repositories require a fullName in owner/name form"
    );
  }

  const normalizedParts = parts.map((part) => part.trim());

  return {
    fullName: normalizedParts.join("/"),
    apiPath: normalizedParts.map(encodeURIComponent).join("/"),
  };
}

function parseRateLimit(headers) {
  const remainingValue = headers?.get?.("x-ratelimit-remaining");
  const resetValue = headers?.get?.("x-ratelimit-reset");
  const remaining = Number.parseInt(remainingValue, 10);
  const resetSeconds = Number.parseInt(resetValue, 10);

  return {
    remaining: Number.isFinite(remaining) ? remaining : null,
    resetAt: Number.isFinite(resetSeconds)
      ? new Date(resetSeconds * 1000).toISOString()
      : null,
  };
}

function summarizeStatuses(combinedStatus) {
  const statuses = Array.isArray(combinedStatus?.statuses)
    ? combinedStatus.statuses
    : [];
  const success = statuses.filter((status) => status.state === "success").length;
  const pending = statuses.filter((status) => status.state === "pending").length;
  const failure = statuses.filter((status) =>
    FAILURE_STATES.has(status.state)
  ).length;

  return {
    state: statuses.length > 0 ? combinedStatus.state || "unknown" : "unknown",
    total: statuses.length,
    success,
    pending,
    failure,
    contexts: statuses.map((status) => ({
      context: status.context || null,
      state: status.state || "unknown",
      description: status.description || null,
      url: status.target_url || null,
    })),
  };
}

function mapPullRequest(pullRequest, detail, combinedStatus) {
  const mergeState = detail?.mergeable_state || null;
  const mergeable =
    typeof detail?.mergeable === "boolean" ? detail.mergeable : null;

  return {
    number: pullRequest.number,
    title: pullRequest.title || "",
    url: pullRequest.html_url || null,
    author: {
      login: pullRequest.user?.login || null,
      type: pullRequest.user?.type || null,
    },
    draft: pullRequest.draft === true,
    readyForReview: pullRequest.draft !== true,
    createdAt: pullRequest.created_at || null,
    updatedAt: pullRequest.updated_at || null,
    headRef: pullRequest.head?.ref || null,
    headSha: pullRequest.head?.sha || null,
    baseRef: pullRequest.base?.ref || null,
    mergeable,
    mergeState,
    hasConflicts:
      mergeState === "dirty" || mergeable === false
        ? true
        : mergeable === true
          ? false
          : null,
    statusSummary: combinedStatus
      ? summarizeStatuses(combinedStatus)
      : null,
  };
}

function combineRateLimits(rateLimits) {
  const knownRemaining = rateLimits
    .map((rateLimit) => rateLimit.remaining)
    .filter(Number.isFinite);
  const resetAt = rateLimits
    .map((rateLimit) => rateLimit.resetAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    remaining:
      knownRemaining.length > 0 ? Math.min(...knownRemaining) : null,
    resetAt: resetAt || null,
  };
}

export function createGitHubRepositoryProvider({
  fetchImpl = (...args) => globalThis.fetch(...args),
  apiBaseUrl = DEFAULT_API_BASE_URL,
  maxPullRequests = DEFAULT_MAX_PULL_REQUESTS,
  maxEnrichedPullRequests = DEFAULT_MAX_ENRICHED_PULL_REQUESTS,
} = {}) {
  const safeMaxPullRequests = Math.max(
    1,
    Math.min(30, Math.floor(maxPullRequests) || DEFAULT_MAX_PULL_REQUESTS)
  );
  const requestedMaxEnrichedPullRequests = Number(maxEnrichedPullRequests);
  const safeMaxEnrichedPullRequests = Number.isFinite(
    requestedMaxEnrichedPullRequests
  )
    ? Math.max(
        0,
        Math.min(
          safeMaxPullRequests,
          Math.floor(requestedMaxEnrichedPullRequests)
        )
      )
    : DEFAULT_MAX_ENRICHED_PULL_REQUESTS;

  async function readRepository(repository) {
    if (repository?.visibility === "private" || repository?.visibility === "internal") {
      throw new RepositoryProviderError(
        "unsupported_visibility",
        "Only public GitHub repositories are supported"
      );
    }

    const repositoryIdentity = parseRepositoryIdentity(repository);
    const fullName = repositoryIdentity.apiPath;
    const rateLimits = [];

    async function requestJson(path) {
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
      } catch (cause) {
        throw new RepositoryProviderError(
          "network",
          "GitHub could not be reached",
          { cause: cause instanceof Error ? cause.message : String(cause) }
        );
      }

      const rateLimit = parseRateLimit(response.headers);
      rateLimits.push(rateLimit);

      if (!response.ok) {
        const isRateLimited =
          response.status === 429 ||
          (response.status === 403 && rateLimit.remaining === 0);

        if (isRateLimited) {
          throw new RepositoryProviderError(
            "rate_limited",
            "GitHub API rate limit reached",
            { retryAt: rateLimit.resetAt, status: response.status }
          );
        }

        const errorCodes = {
          403: "forbidden",
          404: "not_found",
        };

        throw new RepositoryProviderError(
          errorCodes[response.status] || "http_error",
          `GitHub API request failed with status ${response.status}`,
          { status: response.status }
        );
      }

      return response.json();
    }

    const repositoryData = await requestJson(`/repos/${fullName}`);

    if (repositoryData.private === true) {
      throw new RepositoryProviderError(
        "unsupported_visibility",
        "Only public GitHub repositories are supported"
      );
    }

    const pullRequests = await requestJson(
      `/repos/${fullName}/pulls?state=open&sort=updated&direction=desc&per_page=${safeMaxPullRequests}`
    );

    const warnings = [];
    const enrichedPullRequests = await Promise.all(
      (Array.isArray(pullRequests) ? pullRequests : []).map(async (pullRequest, index) => {
        if (index >= safeMaxEnrichedPullRequests) {
          return mapPullRequest(pullRequest, null, null);
        }

        const [detailResult, statusResult] = await Promise.allSettled([
          requestJson(`/repos/${fullName}/pulls/${pullRequest.number}`),
          requestJson(
            `/repos/${fullName}/commits/${encodeURIComponent(
              pullRequest.head?.sha || ""
            )}/status`
          ),
        ]);

        for (const [capability, result] of [
          ["mergeability", detailResult],
          ["status", statusResult],
        ]) {
          if (result.status === "rejected") {
            warnings.push({
              capability,
              pullRequestNumber: pullRequest.number,
              code: result.reason?.code || "unknown",
            });
          }
        }

        return mapPullRequest(
          pullRequest,
          detailResult.status === "fulfilled" ? detailResult.value : null,
          statusResult.status === "fulfilled" ? statusResult.value : null
        );
      })
    );

    return {
      provider: "github",
      repository: {
        id: repositoryData.id || null,
        fullName: repositoryData.full_name || repositoryIdentity.fullName,
        owner: repositoryData.owner?.login || null,
        name: repositoryData.name || null,
        url: repositoryData.html_url || repository.url || null,
        visibility: repositoryData.visibility || "public",
        defaultBranch: repositoryData.default_branch || null,
        archived: repositoryData.archived === true,
        fork: repositoryData.fork === true,
      },
      lastActivityAt:
        repositoryData.pushed_at || repositoryData.updated_at || null,
      openPullRequests: enrichedPullRequests,
      enrichment: {
        pullRequestsListed: enrichedPullRequests.length,
        pullRequestsEnriched: Math.min(
          enrichedPullRequests.length,
          safeMaxEnrichedPullRequests
        ),
      },
      links: {
        repository: repositoryData.html_url || repository.url || null,
        pullRequests: repositoryData.html_url
          ? `${repositoryData.html_url}/pulls`
          : null,
      },
      rateLimit: combineRateLimits(rateLimits),
      warnings,
    };
  }

  return Object.freeze({
    id: "github",
    readRepository,
  });
}
