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

export function loadPersistedSettings() {
  return loadSettings();
}

export function savePersistedSettings(settings) {
  saveSettings(settings);
}

export function loadPersistedUserProfile() {
  return loadUserProfile();
}

export function savePersistedUserProfile(profile) {
  saveUserProfile(profile);
}
