const STORAGE_KEY = "ide-projet-personnel.projects";
const SETTINGS_STORAGE_KEY = "ide-projet-personnel.settings";
const USER_PROFILE_STORAGE_KEY = "ide-projet-personnel.user-profile";

const PROJECTS_DB_NAME = "ide-projet-personnel";
const PROJECTS_DB_VERSION = 1;
const PROJECTS_STORE_NAME = "project_storage";
const PROJECTS_RECORD_KEY = "projects";

let projectsDbPromise = null;

function parseProjects(raw) {
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
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
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to open IndexedDB"));
  });

  return projectsDbPromise;
}

function runProjectStore(mode, action) {
  return openProjectsDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(PROJECTS_STORE_NAME, mode);
        const store = tx.objectStore(PROJECTS_STORE_NAME);

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

async function readProjectsFromIndexedDb() {
  return runProjectStore("readonly", (store, resolve, reject) => {
    const request = store.get(PROJECTS_RECORD_KEY);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error("Failed to read projects"));
  });
}

async function writeProjectsToIndexedDb(projects) {
  await runProjectStore("readwrite", (store, resolve, reject) => {
    const request = store.put(projects, PROJECTS_RECORD_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error || new Error("Failed to write projects"));
  });
}

export async function loadProjects() {
  try {
    const indexedDbProjects = await readProjectsFromIndexedDb();

    if (Array.isArray(indexedDbProjects)) {
      return indexedDbProjects;
    }

    const rawLegacyProjects = localStorage.getItem(STORAGE_KEY);
    const legacyProjects = parseProjects(rawLegacyProjects);

    if (rawLegacyProjects !== null) {
      await writeProjectsToIndexedDb(legacyProjects);
    }

    return legacyProjects;
  } catch {
    return parseProjects(localStorage.getItem(STORAGE_KEY));
  }
}

export async function saveProjects(projects) {
  try {
    await writeProjectsToIndexedDb(projects);
  } catch {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
  }
}

export function loadSettings() {
  const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveSettings(settings) {
  localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}

export function loadUserProfile() {
  const raw = localStorage.getItem(USER_PROFILE_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveUserProfile(profile) {
  localStorage.setItem(USER_PROFILE_STORAGE_KEY, JSON.stringify(profile));
}
