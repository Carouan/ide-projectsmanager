const STORAGE_KEY = "ide-projet-personnel.projects";
const SETTINGS_STORAGE_KEY = "ide-projet-personnel.settings";
const USER_PROFILE_STORAGE_KEY = "ide-projet-personnel.user-profile";

export function loadProjects() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];

  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveProjects(projects) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
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
