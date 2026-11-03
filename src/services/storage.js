const STORAGE_KEY = "ide-projet-personnel.projects";
// A single, atomically replaced recovery snapshot. Never treat the legacy
// localStorage array as a newer write when an IndexedDB snapshot also exists.
const PROJECTS_FALLBACK_KEY = "ide-projet-personnel.projects-recovery-v1";
const PROJECTS_FALLBACK_FORMAT = "ide-projectsmanager.local-recovery.v1";
const PROJECTS_CANCELLED_KEY = "ide-projet-personnel.cancelled-reference-writes-v1";
const SETTINGS_STORAGE_KEY = "ide-projet-personnel.settings";
const USER_PROFILE_STORAGE_KEY = "ide-projet-personnel.user-profile";
const REPOSITORY_SNAPSHOTS_STORAGE_KEY =
  "ide-projet-personnel.repository-snapshots";
const PORTABLE_BACKUP_DEVICE_STORAGE_KEY =
  "ide-projet-personnel.portable-backup-device";

const PROJECTS_DB_NAME = "ide-projet-personnel";
const PROJECTS_DB_VERSION = 2;
const PROJECTS_STORE_NAME = "project_storage";
const PROJECTS_RECORD_KEY = "projects";
const PROJECTS_REVISION_KEY = "projects-revision";
const APP_STORE_NAME = "app_storage";
const SETTINGS_RECORD_KEY = "settings";
const USER_PROFILE_RECORD_KEY = "user-profile";
const REPOSITORY_SNAPSHOTS_RECORD_KEY = "repository-snapshots";
const PORTABLE_BACKUP_DIRECTORY_HANDLE_RECORD_KEY =
  "portable-backup-directory-handle";
const PORTABLE_BACKUP_DEVICE_RECORD_KEY = "portable-backup-device";

let projectsDbPromise = null;
let knownProjectsRevision = 0;

export class ProjectsStorageConflictError extends Error {
  constructor(message = "Conflicting project snapshots require manual recovery") {
    super(message);
    this.name = "ProjectsStorageConflictError";
  }
}

function parseProjects(raw) {
  if (raw === null || raw === undefined) return null;
  const projects = JSON.parse(raw);
  if (!Array.isArray(projects)) throw new ProjectsStorageConflictError("Invalid legacy project snapshot");
  return projects;
}

function revisionOf(value) {
  if (value === undefined || value === null) return 0;
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new ProjectsStorageConflictError("Invalid project revision");
  }
  return value;
}

function readRecoverySnapshot() {
  const raw = localStorage.getItem(PROJECTS_FALLBACK_KEY);
  if (raw === null) return null;
  let record;
  try {
    record = JSON.parse(raw);
  } catch {
    throw new ProjectsStorageConflictError("Corrupt project recovery snapshot");
  }
  if (!record || record.format !== PROJECTS_FALLBACK_FORMAT
      || !Array.isArray(record.projects) || revisionOf(record.revision) === 0
      || !Number.isSafeInteger(record.baseIndexedRevision)
      || record.baseIndexedRevision < 0
      || record.baseIndexedRevision >= record.revision) {
    throw new ProjectsStorageConflictError("Invalid project recovery snapshot");
  }
  return record;
}

function readCancellationMarkers() {
  const raw = localStorage.getItem(PROJECTS_CANCELLED_KEY);
  if (raw === null) return [];
  let markers;
  try { markers = JSON.parse(raw); }
  catch { throw new ProjectsStorageConflictError("Corrupt cancellation recovery journal"); }
  if (!Array.isArray(markers) || markers.some((item) =>
    !item || typeof item.projectId !== "string" || typeof item.attachmentId !== "string"
  )) {
    throw new ProjectsStorageConflictError("Invalid cancellation recovery journal");
  }
  return markers;
}

function applyCancellationMarkers(projects) {
  const markers = readCancellationMarkers();
  if (!markers.length) return projects;
  let changed = false;
  const masked = projects.map((doc) => {
    const attachments = doc.attachments || [];
    const filtered = attachments.filter((attachment) => !markers.some((marker) =>
      marker.projectId === doc.project?.id && marker.attachmentId === attachment.id
    ));
    if (filtered.length === attachments.length) return doc;
    changed = true;
    return { ...doc, attachments: filtered };
  });
  return changed ? masked : projects;
}

/**
 * A synchronous cancellation write-ahead marker survives tab closure during
 * a pending IndexedDB transaction. On reload the cancelled attachment is
 * hidden and its removal is recovered by the normal hydration save.
 */
export function rememberCancelledReference({ projectId, attachmentId }) {
  if (!projectId || !attachmentId) throw new TypeError("Cancellation needs a specific attachment");
  const markers = readCancellationMarkers();
  if (markers.some((m) => m.projectId === projectId && m.attachmentId === attachmentId)) return;
  const payload = JSON.stringify([...markers, { projectId, attachmentId }]);
  localStorage.setItem(PROJECTS_CANCELLED_KEY, payload);
  if (localStorage.getItem(PROJECTS_CANCELLED_KEY) !== payload) {
    throw new Error("Cancellation could not be committed to local recovery");
  }
}

export function clearCancelledReference({ projectId, attachmentId }) {
  const markers = readCancellationMarkers();
  const remaining = markers.filter((m) =>
    m.projectId !== projectId || m.attachmentId !== attachmentId
  );
  if (remaining.length === markers.length) return;
  // A failed cleanup leaves the conservative tombstone intact.
  localStorage.setItem(PROJECTS_CANCELLED_KEY, JSON.stringify(remaining));
}

function sameProjects(a, b) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function checkRecoveryConflict(recovery, indexed) {
  if (!recovery || !indexed || indexed.projects === undefined) return;
  // If IndexedDB advanced independently since the fallback branched, neither
  // snapshot may be silently promoted over the other. Preserve both and stop.
  if (indexed.revision > recovery.baseIndexedRevision
      && indexed.revision < recovery.revision
      && !sameProjects(indexed.projects, recovery.projects)) {
    throw new ProjectsStorageConflictError(
      "Both project stores changed since fallback; manual reconciliation is required"
    );
  }
}

function durableRevision(current) {
  return Math.max(Date.now() * 1000, knownProjectsRevision + 1, current + 1);
}

function openProjectsDb() {
  if (projectsDbPromise) return projectsDbPromise;

  projectsDbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }

    const request = indexedDB.open(PROJECTS_DB_NAME, PROJECTS_DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PROJECTS_STORE_NAME)) {
        db.createObjectStore(PROJECTS_STORE_NAME);
      }
      if (!db.objectStoreNames.contains(APP_STORE_NAME)) {
        db.createObjectStore(APP_STORE_NAME);
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => {
        db.close();
        projectsDbPromise = null;
      };
      db.onclose = () => { projectsDbPromise = null; };
      resolve(db);
    };
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  }).catch((error) => {
    projectsDbPromise = null; // A transient open failure must be retryable.
    throw error;
  });

  return projectsDbPromise;
}

function runProjectStore(mode, action) {
  return openProjectsDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        let tx;
        try {
          tx = db.transaction(PROJECTS_STORE_NAME, mode);
        } catch (error) {
          projectsDbPromise = null;
          reject(error);
          return;
        }
        const store = tx.objectStore(PROJECTS_STORE_NAME);

        let settled = false;
        let requestResult;
        const resolveOnce = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };

        const rejectOnce = (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };

        tx.oncomplete = () => resolveOnce(requestResult);
        tx.onerror = () => rejectOnce(tx.error || new Error("IndexedDB transaction failed"));
        tx.onabort = () => rejectOnce(tx.error || new Error("IndexedDB transaction aborted"));

        try {
          // Request success records a value, but cannot acknowledge durability.
          action(store, (value) => { requestResult = value; }, rejectOnce, tx);
        } catch (error) {
          rejectOnce(error);
          try { tx.abort(); } catch { /* Transaction may already have failed. */ }
        }
      })
  );
}

async function readProjectsFromIndexedDb() {
  return runProjectStore("readonly", (store, resolve, reject) => {
    let projects;
    let revision;
    let received = 0;
    const complete = () => {
      received += 1;
      if (received === 2) resolve({ projects, revision: revisionOf(revision) });
    };
    const dataRequest = store.get(PROJECTS_RECORD_KEY);
    dataRequest.onsuccess = () => {
      projects = dataRequest.result;
      if (projects !== undefined && !Array.isArray(projects)) {
        reject(new ProjectsStorageConflictError("Invalid IndexedDB project snapshot"));
        return;
      }
      complete();
    };
    dataRequest.onerror = () => reject(dataRequest.error || new Error("Failed to read projects"));
    const revisionRequest = store.get(PROJECTS_REVISION_KEY);
    revisionRequest.onsuccess = () => {
      try { revision = revisionOf(revisionRequest.result); complete(); }
      catch (error) { reject(error); }
    };
    revisionRequest.onerror = () => reject(revisionRequest.error || new Error("Failed to read revision"));
  });
}

async function writeProjectsToIndexedDb(projects, revision, expectedMax) {
  await runProjectStore("readwrite", (store, resolve, reject, transaction) => {
    const previousRequest = store.get(PROJECTS_REVISION_KEY);
    previousRequest.onsuccess = () => {
      let previous;
      try { previous = revisionOf(previousRequest.result); }
      catch (error) { reject(error); transaction.abort(); return; }
      if (previous > expectedMax) {
        reject(new ProjectsStorageConflictError("IndexedDB has a newer project revision"));
        transaction.abort();
        return;
      }
      const dataRequest = store.put(projects, PROJECTS_RECORD_KEY);
      dataRequest.onerror = () => reject(dataRequest.error || new Error("Failed to write projects"));
      const revisionRequest = store.put(revision, PROJECTS_REVISION_KEY);
      revisionRequest.onerror = () => reject(revisionRequest.error || new Error("Failed to write revision"));
    };
    previousRequest.onerror = () => reject(previousRequest.error || new Error("Failed to inspect revision"));
  });
}

function runAppStore(mode, action) {
  return openProjectsDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(APP_STORE_NAME, mode);
        const store = tx.objectStore(APP_STORE_NAME);

        let settled = false;
        const resolveOnce = (value) => {
          if (settled) return;
          settled = true;
          resolve(value);
        };

        const rejectOnce = (error) => {
          if (settled) return;
          settled = true;
          reject(error);
        };

        tx.oncomplete = () => resolveOnce();
        tx.onerror = () => rejectOnce(tx.error || new Error("IndexedDB transaction failed"));
        tx.onabort = () => rejectOnce(tx.error || new Error("IndexedDB transaction aborted"));

        action(store, resolveOnce, rejectOnce);
      })
  );
}

async function readAppValueFromIndexedDb(recordKey) {
  return runAppStore("readonly", (store, resolve, reject) => {
    const request = store.get(recordKey);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to read app record"));
  });
}

async function writeAppValueToIndexedDb(recordKey, value) {
  await runAppStore("readwrite", (store, resolve, reject) => {
    const request = store.put(value, recordKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to write app record"));
  });
}

async function deleteAppValueFromIndexedDb(recordKey) {
  await runAppStore("readwrite", (store, resolve, reject) => {
    const request = store.delete(recordKey);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to delete app record"));
  });
}

export async function loadProjects({ maskCancelled = true } = {}) {
  // Read the recovery journal even if IndexedDB is available. A committed
  // localStorage fallback may be newer than the last IndexedDB transaction.
  const recovery = readRecoverySnapshot();
  const legacy = parseProjects(localStorage.getItem(STORAGE_KEY));
  let indexed;
  let idbError;
  try { indexed = await readProjectsFromIndexedDb(); }
  catch (error) { idbError = error; }
  if (idbError instanceof ProjectsStorageConflictError) throw idbError;
  checkRecoveryConflict(recovery, indexed);
  const stored = indexed?.projects;
  const revision = indexed?.revision || 0;
  if (recovery && (revision < recovery.revision || stored === undefined)) {
    knownProjectsRevision = Math.max(knownProjectsRevision, recovery.revision);
    // Recover without overwriting a newer IndexedDB record. If promotion
    // fails, the local journal stays authoritative for the next reload.
    if (!idbError) {
      try {
        await writeProjectsToIndexedDb(recovery.projects, recovery.revision, revision);
      } catch (error) {
        if (error instanceof ProjectsStorageConflictError) throw error;
      }
    }
    return maskCancelled ? applyCancellationMarkers(recovery.projects) : recovery.projects;
  }
  if (stored !== undefined) {
    if (recovery && revision === recovery.revision
        && !sameProjects(stored, recovery.projects)) {
      throw new ProjectsStorageConflictError("Equal project revisions have different contents");
    }
    if (revision === 0 && !recovery && legacy !== null
        && !sameProjects(stored, legacy)) {
      throw new ProjectsStorageConflictError(
        "Two divergent unversioned project records; refusing an automatic choice"
      );
    }
    knownProjectsRevision = Math.max(knownProjectsRevision, revision);
    return maskCancelled ? applyCancellationMarkers(stored) : stored;
  }
  if (legacy !== null) {
    // Preserve the unversioned original. A fresh versioned write is done by
    // the normal store effect after hydration, not by a silent migration.
    return maskCancelled ? applyCancellationMarkers(legacy) : legacy;
  }
  if (idbError) {
    // Missing IndexedDB is not proof of an empty portfolio.
    throw idbError;
  }
  return maskCancelled ? applyCancellationMarkers([]) : [];
}

export async function saveProjects(projects) {
  if (!Array.isArray(projects)) throw new TypeError("Project snapshot must be an array");
  const recovery = readRecoverySnapshot();
  let indexed;
  let idbError;
  try { indexed = await readProjectsFromIndexedDb(); }
  catch (error) { idbError = error; }
  if (idbError instanceof ProjectsStorageConflictError) throw idbError;
  checkRecoveryConflict(recovery, indexed);
  const newest = Math.max(indexed?.revision || 0, recovery?.revision || 0);
  if (newest > knownProjectsRevision) {
    throw new ProjectsStorageConflictError("A newer project snapshot exists; reload before writing");
  }
  const revision = durableRevision(newest);
  try {
    if (idbError) throw idbError;
    await writeProjectsToIndexedDb(projects, revision, newest);
  } catch (error) {
    if (error instanceof ProjectsStorageConflictError) throw error;
    const baseIndexedRevision = recovery && recovery.revision > (indexed?.revision || 0)
      ? recovery.baseIndexedRevision : (indexed?.revision || 0);
    const payload = JSON.stringify({
      format: PROJECTS_FALLBACK_FORMAT, revision, baseIndexedRevision, projects,
    });
    try {
      localStorage.setItem(PROJECTS_FALLBACK_KEY, payload);
      if (localStorage.getItem(PROJECTS_FALLBACK_KEY) !== payload) {
        throw new Error("Project recovery snapshot could not be verified");
      }
    } catch (fallbackError) {
      throw new globalThis.AggregateError([error, fallbackError],
        "Neither IndexedDB nor the recovery journal committed the project snapshot");
    }
  }
  knownProjectsRevision = revision;
}

function parseJsonObject(raw) {
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function loadSettings() {
  try {
    const indexedDbSettings = await readAppValueFromIndexedDb(SETTINGS_RECORD_KEY);

    if (indexedDbSettings && typeof indexedDbSettings === "object") {
      return indexedDbSettings;
    }

    const rawLegacySettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
    const legacySettings = parseJsonObject(rawLegacySettings);

    if (rawLegacySettings !== null && legacySettings) {
      await writeAppValueToIndexedDb(SETTINGS_RECORD_KEY, legacySettings);
    }

    return legacySettings;
  } catch {
    return parseJsonObject(localStorage.getItem(SETTINGS_STORAGE_KEY));
  }
}

export async function saveSettings(settings) {
  try {
    await writeAppValueToIndexedDb(SETTINGS_RECORD_KEY, settings);
  } catch {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }
}

export async function loadUserProfile() {
  try {
    const indexedDbUserProfile = await readAppValueFromIndexedDb(USER_PROFILE_RECORD_KEY);

    if (indexedDbUserProfile && typeof indexedDbUserProfile === "object") {
      return indexedDbUserProfile;
    }

    const rawLegacyUserProfile = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
    const legacyUserProfile = parseJsonObject(rawLegacyUserProfile);

    if (rawLegacyUserProfile !== null && legacyUserProfile) {
      await writeAppValueToIndexedDb(USER_PROFILE_RECORD_KEY, legacyUserProfile);
    }

    return legacyUserProfile;
  } catch {
    return parseJsonObject(localStorage.getItem(USER_PROFILE_STORAGE_KEY));
  }
}

export async function saveUserProfile(profile) {
  try {
    await writeAppValueToIndexedDb(USER_PROFILE_RECORD_KEY, profile);
  } catch {
    localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
  }
}

export async function loadRepositorySnapshots() {
  try {
    const snapshots = await readAppValueFromIndexedDb(
      REPOSITORY_SNAPSHOTS_RECORD_KEY
    );

    if (snapshots && typeof snapshots === "object" && !Array.isArray(snapshots)) {
      return snapshots;
    }

    return (
      parseJsonObject(localStorage.getItem(REPOSITORY_SNAPSHOTS_STORAGE_KEY)) ||
      {}
    );
  } catch {
    return (
      parseJsonObject(localStorage.getItem(REPOSITORY_SNAPSHOTS_STORAGE_KEY)) ||
      {}
    );
  }
}

export async function saveRepositorySnapshots(snapshots) {
  const safeSnapshots =
    snapshots && typeof snapshots === "object" && !Array.isArray(snapshots)
      ? snapshots
      : {};

  try {
    await writeAppValueToIndexedDb(
      REPOSITORY_SNAPSHOTS_RECORD_KEY,
      safeSnapshots
    );
  } catch {
    localStorage.setItem(
      REPOSITORY_SNAPSHOTS_STORAGE_KEY,
      JSON.stringify(safeSnapshots)
    );
  }
}

export async function loadPortableBackupDirectoryHandle() {
  try {
    return (
      (await readAppValueFromIndexedDb(
        PORTABLE_BACKUP_DIRECTORY_HANDLE_RECORD_KEY
      )) || null
    );
  } catch {
    return null;
  }
}

export async function savePortableBackupDirectoryHandle(handle) {
  if (!handle || typeof indexedDB === "undefined") return false;

  try {
    await writeAppValueToIndexedDb(
      PORTABLE_BACKUP_DIRECTORY_HANDLE_RECORD_KEY,
      handle
    );
    return true;
  } catch {
    return false;
  }
}

export async function clearPortableBackupDirectoryHandle() {
  try {
    await deleteAppValueFromIndexedDb(
      PORTABLE_BACKUP_DIRECTORY_HANDLE_RECORD_KEY
    );
    return true;
  } catch {
    return false;
  }
}

export async function loadPortableBackupDevice() {
  try {
    const storedDevice = await readAppValueFromIndexedDb(
      PORTABLE_BACKUP_DEVICE_RECORD_KEY
    );

    if (storedDevice && typeof storedDevice === "object") {
      return storedDevice;
    }

    return parseJsonObject(localStorage.getItem(PORTABLE_BACKUP_DEVICE_STORAGE_KEY));
  } catch {
    try {
      return parseJsonObject(localStorage.getItem(PORTABLE_BACKUP_DEVICE_STORAGE_KEY));
    } catch {
      return null;
    }
  }
}

export async function savePortableBackupDevice(device) {
  try {
    await writeAppValueToIndexedDb(PORTABLE_BACKUP_DEVICE_RECORD_KEY, device);
  } catch {
    localStorage.setItem(PORTABLE_BACKUP_DEVICE_STORAGE_KEY, JSON.stringify(device));
  }
}
