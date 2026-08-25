import {
  clearPersistedPortableBackupDirectoryHandle,
  loadPersistedPortableBackupDirectoryHandle,
  savePersistedPortableBackupDirectoryHandle,
} from "../storageRepository.js";
import { validateProjectBundle } from "../../services/jsonTransfer.js";
import {
  buildPortableBackupDeviceSnapshotReference,
  isSafePortableBackupDeviceId,
  validatePortableBackupSnapshot,
} from "../../services/portableBackupSnapshots.js";
import {
  PORTABLE_BACKUP_AVAILABILITY,
  PORTABLE_BACKUP_ERROR_CODE,
  PORTABLE_BACKUP_PERMISSION,
  PortableBackupProviderError,
} from "./portableBackupProvider.js";

export const SELECTED_FOLDER_BACKUP_PROVIDER_ID = "selected-folder";

const DIRECTORY_PERMISSION_OPTIONS = Object.freeze({ mode: "readwrite" });
// File System Access limits picker identifiers to 32 characters.
const DIRECTORY_PICKER_ID = "ide-projectsmanager-backups";

function directoryPickerError(error) {
  const causeCode = typeof error?.name === "string" ? error.name : "UnknownError";
  const details = {
    providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    causeCode,
  };

  if (causeCode === "AbortError") {
    return new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.SELECTION_ABORTED,
      "Folder selection was cancelled or the selected location was restricted.",
      details
    );
  }

  if (causeCode === "SecurityError") {
    return new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.SECURITY_RESTRICTION,
      "The browser blocked folder selection because of its security context.",
      details
    );
  }

  if (causeCode === "NotAllowedError") {
    return new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.PERMISSION_DENIED,
      "The browser denied access to the selected folder.",
      details
    );
  }

  if (causeCode === "TypeError") {
    return new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.INVALID_PICKER_OPTIONS,
      "The folder picker received an invalid internal option.",
      { ...details, recoverable: false }
    );
  }

  return new PortableBackupProviderError(
    PORTABLE_BACKUP_ERROR_CODE.UNKNOWN,
    error instanceof Error ? error.message : "Unknown folder picker error.",
    details
  );
}

export function isSelectedFolderBackupSupported(environment = globalThis) {
  return (
    typeof environment?.showDirectoryPicker === "function" &&
    environment?.isSecureContext !== false
  );
}

function validDirectoryHandle(handle) {
  return (
    handle &&
    handle.kind === "directory" &&
    typeof handle.getFileHandle === "function"
  );
}

function safeSnapshotFilename(value, bundle) {
  const fallback = `ide-projectsmanager-backup-${bundle.exportedAt.replace(
    /[:.]/g,
    "-"
  )}.json`;
  const filename = typeof value === "string" && value.trim()
    ? value.trim()
    : fallback;

  if (filename.includes("/") || filename.includes("\\") || !filename.endsWith(".json")) {
    throw new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
      "Portable backup filenames must identify a JSON file in the selected folder.",
      { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
    );
  }

  return filename;
}

function normalizedPermission(value) {
  return Object.values(PORTABLE_BACKUP_PERMISSION).includes(value)
    ? value
    : PORTABLE_BACKUP_PERMISSION.UNKNOWN;
}

async function writeJsonFile(fileHandle, value) {
  const writable = await fileHandle.createWritable();

  try {
    await writable.write(`${JSON.stringify(value, null, 2)}\n`);
    await writable.close();
  } catch (error) {
    await writable.abort?.().catch(() => {});
    throw error;
  }
}

function snapshotFileMetadata(file, overrides = {}) {
  return {
    modifiedAt: Number.isFinite(file.lastModified)
      ? new Date(file.lastModified).toISOString()
      : null,
    ...overrides,
  };
}

export function createSelectedFolderBackupProvider(options = {}) {
  const environment = options.environment || globalThis;
  const loadHandle = options.loadHandle || loadPersistedPortableBackupDirectoryHandle;
  const saveHandle = options.saveHandle || savePersistedPortableBackupDirectoryHandle;
  const clearHandle = options.clearHandle || clearPersistedPortableBackupDirectoryHandle;
  let directoryHandle = null;
  let handleLoaded = false;
  let handleLoadPromise = null;
  let handleRemembered = false;

  async function ensureHandleLoaded() {
    if (handleLoaded) return directoryHandle;
    if (handleLoadPromise) return handleLoadPromise;

    if (!isSelectedFolderBackupSupported(environment)) {
      handleLoaded = true;
      return null;
    }

    handleLoadPromise = (async () => {
      try {
        const persistedHandle = await loadHandle();
        if (validDirectoryHandle(persistedHandle)) {
          directoryHandle = persistedHandle;
          handleRemembered = true;
        }
      } catch {
        directoryHandle = null;
        handleRemembered = false;
      } finally {
        handleLoaded = true;
      }

      return directoryHandle;
    })();

    return handleLoadPromise;
  }

  async function queryPermission() {
    if (!directoryHandle) return PORTABLE_BACKUP_PERMISSION.PROMPT;
    if (typeof directoryHandle.queryPermission !== "function") {
      return PORTABLE_BACKUP_PERMISSION.UNKNOWN;
    }

    try {
      return normalizedPermission(
        await directoryHandle.queryPermission(DIRECTORY_PERMISSION_OPTIONS)
      );
    } catch {
      return PORTABLE_BACKUP_PERMISSION.UNKNOWN;
    }
  }

  async function inspect() {
    const supported = isSelectedFolderBackupSupported(environment);
    if (!supported) {
      return {
        availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
        permission: PORTABLE_BACKUP_PERMISSION.UNKNOWN,
        capabilities: { write: false, list: false, read: false },
        reason: "unsupported",
      };
    }

    await ensureHandleLoaded();
    return {
      availability: PORTABLE_BACKUP_AVAILABILITY.AVAILABLE,
      permission: await queryPermission(),
      capabilities: { write: true, list: true, read: true },
      reason: directoryHandle ? "" : "not_connected",
    };
  }

  async function connect() {
    if (!isSelectedFolderBackupSupported(environment)) {
      throw new PortableBackupProviderError(
        PORTABLE_BACKUP_ERROR_CODE.PROVIDER_UNAVAILABLE,
        "This browser does not support selecting a local backup folder.",
        { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
      );
    }

    let selectedHandle;

    try {
      selectedHandle = await environment.showDirectoryPicker({
        id: DIRECTORY_PICKER_ID,
        mode: "readwrite",
      });
    } catch (error) {
      throw directoryPickerError(error);
    }

    if (!validDirectoryHandle(selectedHandle)) {
      throw new PortableBackupProviderError(
        PORTABLE_BACKUP_ERROR_CODE.INVALID_PROVIDER,
        "The selected location is not a usable directory.",
        { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
      );
    }

    directoryHandle = selectedHandle;
    handleLoaded = true;

    try {
      handleRemembered = (await saveHandle(directoryHandle)) === true;
    } catch {
      handleRemembered = false;
    }

    return inspect();
  }

  async function reauthorize() {
    await ensureHandleLoaded();

    if (!directoryHandle || typeof directoryHandle.requestPermission !== "function") {
      throw new PortableBackupProviderError(
        PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED,
        "Choose a backup folder before requesting its permission.",
        { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
      );
    }

    await directoryHandle.requestPermission(DIRECTORY_PERMISSION_OPTIONS);
    return inspect();
  }

  async function disconnect() {
    directoryHandle = null;
    handleLoaded = true;
    handleRemembered = false;
    await clearHandle();
    return inspect();
  }

  return Object.freeze({
    id: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    label: "User-selected local backup folder",
    inspect,
    connect,
    reauthorize,
    disconnect,

    async connectionDetails() {
      await ensureHandleLoaded();
      return {
        isSupported: isSelectedFolderBackupSupported(environment),
        isConnected: Boolean(directoryHandle),
        folderName: directoryHandle?.name || null,
        isRemembered: handleRemembered,
      };
    },

    async writeSnapshot(input = {}) {
      const bundle = validateProjectBundle(input.bundle);

      if (input.snapshot) {
        const snapshot = validatePortableBackupSnapshot(input.snapshot);
        const snapshotDirectory = await directoryHandle.getDirectoryHandle(
          "snapshots",
          { create: true }
        );
        const deviceDirectory = await snapshotDirectory.getDirectoryHandle(
          snapshot.device.id,
          { create: true }
        );
        const fileHandle = await deviceDirectory.getFileHandle("latest.json", {
          create: true,
        });

        await writeJsonFile(fileHandle, snapshot);

        return {
          providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
          filename: "latest.json",
          reference: buildPortableBackupDeviceSnapshotReference(snapshot.device.id),
          snapshotId: snapshot.snapshotId,
          deviceId: snapshot.device.id,
          deviceLabel: snapshot.device.label,
          parentSnapshotId: snapshot.parentSnapshotId,
          createdAt: snapshot.createdAt,
          projectCount: bundle.projectCount,
          exportedAt: bundle.exportedAt,
        };
      }

      const filename = safeSnapshotFilename(input.filename, bundle);
      const fileHandle = await directoryHandle.getFileHandle(filename, {
        create: true,
      });
      await writeJsonFile(fileHandle, bundle);

      return {
        providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
        filename,
        projectCount: bundle.projectCount,
        exportedAt: bundle.exportedAt,
      };
    },

    async listSnapshots() {
      const snapshots = [];

      for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind !== "file" || !name.endsWith(".json")) continue;
        const file = await handle.getFile();
        snapshots.push(snapshotFileMetadata(file, {
          reference: name,
          filename: name,
        }));
      }

      if (typeof directoryHandle.getDirectoryHandle === "function") {
        let snapshotDirectory = null;

        try {
          snapshotDirectory = await directoryHandle.getDirectoryHandle("snapshots");
        } catch (error) {
          if (error?.name !== "NotFoundError") throw error;
        }

        if (snapshotDirectory) {
          for await (const [deviceId, deviceDirectory] of snapshotDirectory.entries()) {
            if (
              deviceDirectory.kind !== "directory" ||
              !isSafePortableBackupDeviceId(deviceId)
            ) continue;

            let fileHandle;
            try {
              fileHandle = await deviceDirectory.getFileHandle("latest.json");
            } catch (error) {
              if (error?.name === "NotFoundError") continue;
              throw error;
            }

            const file = await fileHandle.getFile();
            const reference = buildPortableBackupDeviceSnapshotReference(deviceId);

            try {
              const snapshot = validatePortableBackupSnapshot(
                JSON.parse(await file.text())
              );

              if (snapshot.device.id !== deviceId) {
                throw new PortableBackupProviderError(
                  PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
                  "The snapshot device does not match its own directory.",
                  { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
                );
              }

              snapshots.push(snapshotFileMetadata(file, {
                reference,
                filename: "latest.json",
                snapshotId: snapshot.snapshotId,
                deviceId,
                deviceLabel: snapshot.device.label,
                parentSnapshotId: snapshot.parentSnapshotId,
                createdAt: snapshot.createdAt,
                projectCount: snapshot.bundle.projectCount,
              }));
            } catch (error) {
              snapshots.push(snapshotFileMetadata(file, {
                reference,
                filename: "latest.json",
                deviceId,
                unreadable: true,
                errorCode: error?.code || PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
              }));
            }
          }
        }
      }

      return snapshots.sort((left, right) =>
        (right.createdAt || right.filename).localeCompare(
          left.createdAt || left.filename
        )
      );
    },

    async readSnapshot(input = {}) {
      const reference = typeof input === "string"
        ? input
        : input.reference || input.filename;

      const nestedSnapshot = typeof reference === "string"
        ? /^snapshots\/([a-zA-Z0-9][a-zA-Z0-9_-]{0,127})\/latest\.json$/u.exec(reference)
        : null;

      if (
        typeof reference !== "string" ||
        reference.includes("\\") ||
        (reference.includes("/") && !nestedSnapshot)
      ) {
        throw new PortableBackupProviderError(
          PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
          "Choose a JSON backup or a valid device-specific snapshot.",
          { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
        );
      }

      let handle;

      if (nestedSnapshot) {
        const snapshotDirectory = await directoryHandle.getDirectoryHandle("snapshots");
        const deviceDirectory = await snapshotDirectory.getDirectoryHandle(
          nestedSnapshot[1]
        );
        handle = await deviceDirectory.getFileHandle("latest.json");
      } else {
        handle = await directoryHandle.getFileHandle(reference);
      }

      const file = await handle.getFile();
      const content = JSON.parse(await file.text());

      if (nestedSnapshot) {
        const snapshot = validatePortableBackupSnapshot(content);
        if (snapshot.device.id !== nestedSnapshot[1]) {
          throw new PortableBackupProviderError(
            PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
            "The snapshot device does not match its own directory.",
            { providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID }
          );
        }

        return {
          providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
          reference,
          snapshot,
          bundle: snapshot.bundle,
        };
      }

      return {
        providerId: SELECTED_FOLDER_BACKUP_PROVIDER_ID,
        reference,
        bundle: content,
      };
    },
  });
}
