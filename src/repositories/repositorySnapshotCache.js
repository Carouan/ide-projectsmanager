import {
  loadPersistedRepositorySnapshots,
  savePersistedRepositorySnapshots,
} from "./storageRepository.js";

export function repositorySnapshotCacheKey(repository) {
  const provider = String(repository?.provider || "unknown").toLowerCase();
  const identity = repository?.fullName || repository?.url || "unlinked";
  const normalizedIdentity =
    provider === "github" ? String(identity).toLowerCase() : String(identity);
  return `${provider}:${normalizedIdentity}`;
}

export function createMemoryRepositorySnapshotCache(initialEntries = {}) {
  const entries = new Map(Object.entries(initialEntries));

  return {
    async get(key) {
      return entries.get(key) || null;
    },
    async set(key, entry) {
      entries.set(key, entry);
      return entry;
    },
    clear() {
      entries.clear();
    },
  };
}

let persistedSnapshotsPromise = null;
let persistenceQueue = Promise.resolve();

function loadPersistedSnapshotMap() {
  if (!persistedSnapshotsPromise) {
    persistedSnapshotsPromise = loadPersistedRepositorySnapshots().then(
      (snapshots) => snapshots || {}
    );
  }

  return persistedSnapshotsPromise;
}

export const persistentRepositorySnapshotCache = Object.freeze({
  async get(key) {
    const snapshots = await loadPersistedSnapshotMap();
    return snapshots[key] || null;
  },
  async set(key, entry) {
    persistenceQueue = persistenceQueue.catch(() => {}).then(async () => {
      const snapshots = await loadPersistedSnapshotMap();
      const nextSnapshots = {
        ...snapshots,
        [key]: entry,
      };

      await savePersistedRepositorySnapshots(nextSnapshots);
      persistedSnapshotsPromise = Promise.resolve(nextSnapshots);
    });

    await persistenceQueue;
    return entry;
  },
});
