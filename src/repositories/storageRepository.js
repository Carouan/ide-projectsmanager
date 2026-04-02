import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
} from "../services/storage";

export async function loadPersistedProjects() {
  return loadProjects();
}

export async function savePersistedProjects(projects) {
  await saveProjects(projects);
}

export async function loadPersistedSettings() {
  return loadSettings();
}

export async function savePersistedSettings(settings) {
  await saveSettings(settings);
}

export async function loadPersistedUserProfile() {
  return loadUserProfile();
}

export async function savePersistedUserProfile(profile) {
  await saveUserProfile(profile);
}
