import {
  loadProjects,
  saveProjects,
  loadSettings,
  saveSettings,
  loadUserProfile,
  saveUserProfile,
  loadRepositorySnapshots,
  saveRepositorySnapshots,
  loadPortableBackupDirectoryHandle,
  savePortableBackupDirectoryHandle,
  clearPortableBackupDirectoryHandle,
} from "../services/storage.js";

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

export async function loadPersistedRepositorySnapshots() {
  return loadRepositorySnapshots();
}

export async function savePersistedRepositorySnapshots(snapshots) {
  await saveRepositorySnapshots(snapshots);
}

export async function loadPersistedPortableBackupDirectoryHandle() {
  return loadPortableBackupDirectoryHandle();
}

export async function savePersistedPortableBackupDirectoryHandle(handle) {
  return savePortableBackupDirectoryHandle(handle);
}

export async function clearPersistedPortableBackupDirectoryHandle() {
  return clearPortableBackupDirectoryHandle();
}
