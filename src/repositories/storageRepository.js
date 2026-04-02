import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
} from "../services/storage";

export function loadPersistedProjects() {
  return loadProjects();
}

export function savePersistedProjects(projects) {
  saveProjects(projects);
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
