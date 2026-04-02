const DEFAULT_SYNC_METADATA = {
  localVersion: 1,
  remoteVersion: 0,
  lastSyncedAt: "",
  dirty: true,
};

function normalizeVersion(value, fallback) {
  if (!Number.isFinite(value)) return fallback;

  const safeValue = Math.floor(value);
  return safeValue >= 0 ? safeValue : fallback;
}

export function buildDefaultSyncMetadata() {
  return {
    ...DEFAULT_SYNC_METADATA,
  };
}

export function normalizeSyncMetadata(syncMetadata) {
  const sync = syncMetadata || {};

  return {
    localVersion: normalizeVersion(sync.localVersion, DEFAULT_SYNC_METADATA.localVersion),
    remoteVersion: normalizeVersion(sync.remoteVersion, DEFAULT_SYNC_METADATA.remoteVersion),
    lastSyncedAt:
      typeof sync.lastSyncedAt === "string"
        ? sync.lastSyncedAt
        : DEFAULT_SYNC_METADATA.lastSyncedAt,
    dirty:
      typeof sync.dirty === "boolean" ? sync.dirty : DEFAULT_SYNC_METADATA.dirty,
  };
}
