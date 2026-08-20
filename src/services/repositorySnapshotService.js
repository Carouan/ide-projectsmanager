import { normalizeRepositoryLink } from "./repositoryLink.js";
import {
  REPOSITORY_SNAPSHOT_STATUS,
  createRepositoryProviderRegistry,
  normalizeRepositoryProviderError,
} from "../repositories/providers/repositoryProvider.js";
import { createGitHubRepositoryProvider } from "../repositories/providers/githubRepositoryProvider.js";
import {
  persistentRepositorySnapshotCache,
  repositorySnapshotCacheKey,
} from "../repositories/repositorySnapshotCache.js";

export const DEFAULT_REPOSITORY_CACHE_MAX_AGE_MS = 15 * 60 * 1000;

function defaultIsOnline() {
  return typeof navigator === "undefined" ? true : navigator.onLine !== false;
}

function readCacheMetadata(key, entry, nowMs, maxAgeMs, forceStale = false) {
  const fetchedAtMs = Date.parse(entry?.fetchedAt || "");
  const hasValidTimestamp = Number.isFinite(fetchedAtMs);
  const ageMs = hasValidTimestamp ? Math.max(0, nowMs - fetchedAtMs) : null;

  return {
    key,
    fetchedAt: entry?.fetchedAt || null,
    ageMs,
    stale:
      forceStale || !hasValidTimestamp || ageMs > Math.max(0, maxAgeMs),
  };
}

function buildResult({
  status,
  source = null,
  snapshot = null,
  cache = null,
  error = null,
}) {
  return {
    status,
    source,
    snapshot,
    cache,
    error,
  };
}

export function createRepositorySnapshotService({
  providerRegistry = createRepositoryProviderRegistry([
    createGitHubRepositoryProvider(),
  ]),
  cache = persistentRepositorySnapshotCache,
  now = () => Date.now(),
  isOnline = defaultIsOnline,
  maxAgeMs = DEFAULT_REPOSITORY_CACHE_MAX_AGE_MS,
} = {}) {
  return Object.freeze({
    async read(repositoryLink, { forceRefresh = false } = {}) {
      const repository = normalizeRepositoryLink(repositoryLink);

      if (!repository) {
        return buildResult({ status: REPOSITORY_SNAPSHOT_STATUS.UNLINKED });
      }

      const provider = providerRegistry.get(repository.provider);

      if (!provider) {
        return buildResult({
          status: REPOSITORY_SNAPSHOT_STATUS.UNSUPPORTED,
          error: {
            code: "unsupported_provider",
            message: `No repository provider is available for ${repository.provider}`,
          },
        });
      }

      const key = repositorySnapshotCacheKey(repository);
      let cachedEntry = null;
      let cacheReadError = null;

      try {
        cachedEntry = await cache.get(key);
      } catch (error) {
        cacheReadError = normalizeRepositoryProviderError(error);
      }

      const nowMs = now();
      const cachedMetadata = cachedEntry
        ? readCacheMetadata(key, cachedEntry, nowMs, maxAgeMs)
        : null;

      if (!isOnline()) {
        if (cachedEntry?.snapshot) {
          return buildResult({
            status: REPOSITORY_SNAPSHOT_STATUS.STALE,
            source: "cache",
            snapshot: cachedEntry.snapshot,
            cache: readCacheMetadata(key, cachedEntry, nowMs, maxAgeMs, true),
            error: {
              code: "offline",
              message: "Repository data cannot be refreshed while offline",
            },
          });
        }

        return buildResult({
          status: REPOSITORY_SNAPSHOT_STATUS.OFFLINE,
          cache: { key, fetchedAt: null, ageMs: null, stale: true },
          error: {
            code: "offline",
            message: "Repository data is unavailable while offline",
          },
        });
      }

      if (cachedEntry?.snapshot && cachedMetadata && !cachedMetadata.stale && !forceRefresh) {
        return buildResult({
          status: REPOSITORY_SNAPSHOT_STATUS.FRESH,
          source: "cache",
          snapshot: cachedEntry.snapshot,
          cache: cachedMetadata,
          error: cacheReadError,
        });
      }

      try {
        const snapshot = await provider.readRepository(repository);
        const fetchedAt = new Date(nowMs).toISOString();
        const entry = { fetchedAt, snapshot };
        let cacheWriteError = null;

        try {
          await cache.set(key, entry);
        } catch (error) {
          cacheWriteError = normalizeRepositoryProviderError(error);
        }

        return buildResult({
          status: REPOSITORY_SNAPSHOT_STATUS.FRESH,
          source: "network",
          snapshot,
          cache: readCacheMetadata(key, entry, nowMs, maxAgeMs),
          error: cacheWriteError || cacheReadError,
        });
      } catch (error) {
        const providerError = normalizeRepositoryProviderError(error);

        if (cachedEntry?.snapshot) {
          return buildResult({
            status: REPOSITORY_SNAPSHOT_STATUS.STALE,
            source: "cache",
            snapshot: cachedEntry.snapshot,
            cache: readCacheMetadata(key, cachedEntry, nowMs, maxAgeMs, true),
            error: providerError,
          });
        }

        const unsupported =
          providerError.code === "unsupported_visibility" ||
          providerError.code === "unsupported_provider";

        return buildResult({
          status: unsupported
            ? REPOSITORY_SNAPSHOT_STATUS.UNSUPPORTED
            : REPOSITORY_SNAPSHOT_STATUS.ERROR,
          cache: { key, fetchedAt: null, ageMs: null, stale: true },
          error: providerError,
        });
      }
    },
  });
}

export const repositorySnapshotService = createRepositorySnapshotService();
