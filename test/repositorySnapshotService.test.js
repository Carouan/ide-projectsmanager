import test from "node:test";
import assert from "node:assert/strict";

import {
  REPOSITORY_SNAPSHOT_STATUS,
  RepositoryProviderError,
  createRepositoryProviderRegistry,
} from "../src/repositories/providers/repositoryProvider.js";
import { createMemoryRepositorySnapshotCache } from "../src/repositories/repositorySnapshotCache.js";
import { createRepositorySnapshotService } from "../src/services/repositorySnapshotService.js";

const REPOSITORY = {
  provider: "github",
  fullName: "Carouan/ide-projectsmanager",
};
const NOW = Date.parse("2026-08-20T08:00:00.000Z");

function createService({
  cache = createMemoryRepositorySnapshotCache(),
  isOnline = () => true,
  readRepository = async () => ({ provider: "github", repository: {} }),
  maxAgeMs = 15 * 60 * 1000,
} = {}) {
  return createRepositorySnapshotService({
    providerRegistry: createRepositoryProviderRegistry([
      { id: "github", readRepository },
    ]),
    cache,
    isOnline,
    now: () => NOW,
    maxAgeMs,
  });
}

test("local-only projects remain unlinked without touching provider or cache", async () => {
  let providerCalls = 0;
  let cacheCalls = 0;
  const service = createService({
    cache: {
      async get() {
        cacheCalls += 1;
        return null;
      },
    },
    readRepository: async () => {
      providerCalls += 1;
      return {};
    },
  });

  const result = await service.read(null);

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.UNLINKED);
  assert.equal(result.snapshot, null);
  assert.equal(providerCalls, 0);
  assert.equal(cacheCalls, 0);
});

test("network snapshots are cached separately with explicit freshness metadata", async () => {
  let providerCalls = 0;
  const cache = createMemoryRepositorySnapshotCache();
  const snapshot = { provider: "github", repository: { fullName: REPOSITORY.fullName } };
  const service = createService({
    cache,
    readRepository: async () => {
      providerCalls += 1;
      return snapshot;
    },
  });

  const networkResult = await service.read(REPOSITORY);
  const cachedResult = await service.read(REPOSITORY);

  assert.equal(networkResult.status, REPOSITORY_SNAPSHOT_STATUS.FRESH);
  assert.equal(networkResult.source, "network");
  assert.equal(networkResult.cache.stale, false);
  assert.equal(networkResult.cache.fetchedAt, "2026-08-20T08:00:00.000Z");
  assert.equal(cachedResult.status, REPOSITORY_SNAPSHOT_STATUS.FRESH);
  assert.equal(cachedResult.source, "cache");
  assert.deepEqual(cachedResult.snapshot, snapshot);
  assert.equal(providerCalls, 1);
});

test("offline reads return a cached snapshot as explicitly stale", async () => {
  const cache = createMemoryRepositorySnapshotCache({
    "github:carouan/ide-projectsmanager": {
      fetchedAt: "2026-08-20T07:59:00.000Z",
      snapshot: { provider: "github", repository: { fullName: REPOSITORY.fullName } },
    },
  });
  const service = createService({ cache, isOnline: () => false });

  const result = await service.read(REPOSITORY);

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.STALE);
  assert.equal(result.source, "cache");
  assert.equal(result.cache.stale, true);
  assert.equal(result.error.code, "offline");
});

test("offline reads without a cache are deterministic", async () => {
  const result = await createService({ isOnline: () => false }).read(REPOSITORY);

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.OFFLINE);
  assert.equal(result.snapshot, null);
  assert.equal(result.cache.stale, true);
  assert.equal(result.error.code, "offline");
});

test("provider failures preserve a stale cache and expose the error", async () => {
  const cache = createMemoryRepositorySnapshotCache({
    "github:carouan/ide-projectsmanager": {
      fetchedAt: "2026-08-20T07:00:00.000Z",
      snapshot: { provider: "github", repository: { fullName: REPOSITORY.fullName } },
    },
  });
  const service = createService({
    cache,
    readRepository: async () => {
      throw new RepositoryProviderError("rate_limited", "Rate limit reached", {
        retryAt: "2026-08-20T09:00:00.000Z",
      });
    },
  });

  const result = await service.read(REPOSITORY, { forceRefresh: true });

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.STALE);
  assert.equal(result.source, "cache");
  assert.equal(result.cache.stale, true);
  assert.equal(result.error.code, "rate_limited");
  assert.equal(result.error.retryAt, "2026-08-20T09:00:00.000Z");
});

test("provider failures without a cache return an error state", async () => {
  const service = createService({
    readRepository: async () => {
      throw new RepositoryProviderError("not_found", "Repository not found", {
        status: 404,
      });
    },
  });

  const result = await service.read(REPOSITORY);

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.ERROR);
  assert.equal(result.snapshot, null);
  assert.equal(result.error.code, "not_found");
  assert.equal(result.error.status, 404);
});

test("declared private repositories return an unsupported state", async () => {
  const service = createService({
    readRepository: async () => {
      throw new RepositoryProviderError(
        "unsupported_visibility",
        "Only public repositories are supported"
      );
    },
  });

  const result = await service.read({ ...REPOSITORY, visibility: "private" });

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.UNSUPPORTED);
  assert.equal(result.error.code, "unsupported_visibility");
});
