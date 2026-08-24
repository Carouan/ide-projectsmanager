import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualDownloadBackupProvider,
  MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
} from "../src/repositories/portableBackup/manualDownloadBackupProvider.js";
import {
  PORTABLE_BACKUP_AVAILABILITY,
  PORTABLE_BACKUP_ERROR_CODE,
  PORTABLE_BACKUP_PERMISSION,
} from "../src/repositories/portableBackup/portableBackupProvider.js";
import {
  createSelectedFolderBackupProvider,
  isSelectedFolderBackupSupported,
  SELECTED_FOLDER_BACKUP_PROVIDER_ID,
} from "../src/repositories/portableBackup/selectedFolderBackupProvider.js";
import { createPortableBackupService } from "../src/services/portableBackupService.js";

const EXPORTED_AT = "2026-08-24T18:15:25.120Z";

function project(id = "project-1") {
  return { schemaVersion: "1.0", project: { id, title: id } };
}

function mockDirectory(options = {}) {
  const files = new Map();
  const calls = { query: [], request: [], writes: 0, aborts: 0 };
  let permission = options.permission || PORTABLE_BACKUP_PERMISSION.GRANTED;

  function fileHandle(filename) {
    return {
      kind: "file",
      name: filename,
      async createWritable() {
        return {
          async write(content) {
            if (options.failWrite) throw new Error("disk full");
            calls.writes += 1;
            files.set(filename, content);
          },
          async close() {},
          async abort() { calls.aborts += 1; },
        };
      },
      async getFile() {
        return {
          name: filename,
          lastModified: Date.parse(EXPORTED_AT),
          async text() { return files.get(filename); },
        };
      },
    };
  }

  const handle = {
    kind: "directory",
    name: options.name || "Project backups",
    async queryPermission(input) {
      calls.query.push(input);
      return permission;
    },
    async requestPermission(input) {
      calls.request.push(input);
      permission = options.requestResult || PORTABLE_BACKUP_PERMISSION.GRANTED;
      return permission;
    },
    async getFileHandle(filename, input = {}) {
      if (!input.create && !files.has(filename)) {
        throw new Error("file does not exist");
      }
      return fileHandle(filename);
    },
    async *entries() {
      for (const filename of files.keys()) {
        yield [filename, fileHandle(filename)];
      }
    },
  };

  return { calls, files, handle };
}

function configuredProvider(directory, options = {}) {
  const picks = [];
  const saved = [];
  const cleared = [];
  const environment = {
    isSecureContext: true,
    async showDirectoryPicker(input) {
      picks.push(input);
      return directory.handle;
    },
  };
  const provider = createSelectedFolderBackupProvider({
    environment,
    loadHandle: options.loadHandle || (async () => null),
    saveHandle: options.saveHandle || (async (handle) => {
      saved.push(handle);
      return true;
    }),
    clearHandle: options.clearHandle || (async () => {
      cleared.push(true);
      return true;
    }),
  });

  return { provider, picks, saved, cleared };
}

function serviceWith(provider, manualOptions = {}) {
  return createPortableBackupService({
    providers: [provider, createManualDownloadBackupProvider(manualOptions)],
    fallbackProviderId: MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
  });
}

test("selected-folder support requires the picker and a secure context", () => {
  assert.equal(isSelectedFolderBackupSupported({}), false);
  assert.equal(
    isSelectedFolderBackupSupported({
      showDirectoryPicker() {},
      isSecureContext: false,
    }),
    false
  );
  assert.equal(
    isSelectedFolderBackupSupported({
      showDirectoryPicker() {},
      isSecureContext: true,
    }),
    true
  );
});

test("unsupported browsers honestly expose the optional folder as unavailable", async () => {
  const provider = createSelectedFolderBackupProvider({ environment: {} });
  const service = serviceWith(provider, { download() {} });
  const status = await service.inspect(SELECTED_FOLDER_BACKUP_PROVIDER_ID);

  assert.equal(status.availability, PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE);
  assert.equal(status.reason, "unsupported");
  assert.deepEqual(status.capabilities, { write: false, list: false, read: false });
  assert.equal(
    (await service.inspectFallback()).providerId,
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );
});

test("inspection never chooses a folder or requests permission silently", async () => {
  const directory = mockDirectory();
  const { provider, picks } = configuredProvider(directory);
  const status = await provider.inspect();

  assert.equal(status.availability, PORTABLE_BACKUP_AVAILABILITY.AVAILABLE);
  assert.equal(status.permission, PORTABLE_BACKUP_PERMISSION.PROMPT);
  assert.equal(status.reason, "not_connected");
  assert.equal(picks.length, 0);
  assert.equal(directory.calls.request.length, 0);
});

test("an explicit user action chooses and safely remembers a readable/writable folder", async () => {
  const directory = mockDirectory();
  const { provider, picks, saved } = configuredProvider(directory);

  await provider.connect();

  assert.deepEqual(picks, [{
    id: "ide-projectsmanager-portable-backups",
    mode: "readwrite",
  }]);
  assert.equal(saved[0], directory.handle);
  assert.deepEqual(await provider.connectionDetails(), {
    isSupported: true,
    isConnected: true,
    folderName: "Project backups",
    isRemembered: true,
  });
  assert.equal(directory.calls.request.length, 0);
});

test("persisted folder handles are reopened without silently renewing permission", async () => {
  const directory = mockDirectory({ permission: PORTABLE_BACKUP_PERMISSION.PROMPT });
  const { provider, picks } = configuredProvider(directory, {
    loadHandle: async () => directory.handle,
  });

  const status = await provider.inspect();

  assert.equal(status.permission, PORTABLE_BACKUP_PERMISSION.PROMPT);
  assert.equal((await provider.connectionDetails()).isRemembered, true);
  assert.equal(picks.length, 0);
  assert.equal(directory.calls.request.length, 0);
});

test("concurrent startup inspections share one persisted handle lookup", async () => {
  const directory = mockDirectory();
  let loads = 0;
  const { provider } = configuredProvider(directory, {
    loadHandle: async () => {
      loads += 1;
      await Promise.resolve();
      return directory.handle;
    },
  });

  const [status, details] = await Promise.all([
    provider.inspect(),
    provider.connectionDetails(),
  ]);

  assert.equal(loads, 1);
  assert.equal(status.permission, PORTABLE_BACKUP_PERMISSION.GRANTED);
  assert.equal(details.isConnected, true);
});

test("unsupported handle persistence keeps a connected folder in memory only", async () => {
  const directory = mockDirectory();
  const { provider } = configuredProvider(directory, {
    saveHandle: async () => false,
  });

  await provider.connect();

  assert.equal((await provider.connectionDetails()).isConnected, true);
  assert.equal((await provider.connectionDetails()).isRemembered, false);
});

test("denied permissions are visible and can be renewed only by an explicit action", async () => {
  const directory = mockDirectory({
    permission: PORTABLE_BACKUP_PERMISSION.DENIED,
    requestResult: PORTABLE_BACKUP_PERMISSION.GRANTED,
  });
  const { provider } = configuredProvider(directory);

  await provider.connect();
  assert.equal((await provider.inspect()).permission, PORTABLE_BACKUP_PERMISSION.DENIED);
  assert.equal(directory.calls.request.length, 0);

  await provider.reauthorize();

  assert.deepEqual(directory.calls.request, [{ mode: "readwrite" }]);
  assert.equal((await provider.inspect()).permission, PORTABLE_BACKUP_PERMISSION.GRANTED);
});

test("folder snapshots preserve the existing global bundle schema and can be listed/read", async () => {
  const directory = mockDirectory();
  const { provider } = configuredProvider(directory);
  const service = serviceWith(provider);
  await provider.connect();

  const written = await service.writePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project()],
    { exportedAt: EXPORTED_AT }
  );
  const filename = "ide-projectsmanager-backup-2026-08-24T18-15-25-120Z.json";

  assert.equal(written.result.filename, filename);
  assert.deepEqual(JSON.parse(directory.files.get(filename)), written.bundle);
  assert.equal(written.bundle.version, 1);
  assert.equal((await service.listSnapshots(SELECTED_FOLDER_BACKUP_PROVIDER_ID))[0].reference, filename);
  assert.deepEqual(
    (await service.readPortfolioSnapshot(SELECTED_FOLDER_BACKUP_PROVIDER_ID, filename)).bundle,
    written.bundle
  );
});

test("permission-required folders never write and manual download remains functional", async () => {
  const downloads = [];
  const directory = mockDirectory({ permission: PORTABLE_BACKUP_PERMISSION.PROMPT });
  const { provider } = configuredProvider(directory);
  const service = serviceWith(provider, {
    download(filename, bundle) { downloads.push({ filename, bundle }); },
  });
  await provider.connect();

  await assert.rejects(
    service.writePortfolioSnapshot(SELECTED_FOLDER_BACKUP_PROVIDER_ID, [project()]),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED
  );
  await service.writeFallbackSnapshot([project()], { exportedAt: EXPORTED_AT });

  assert.equal(directory.calls.writes, 0);
  assert.equal(directory.calls.request.length, 0);
  assert.equal(downloads.length, 1);
});

test("write failures abort writable files and retain normalized recoverable errors", async () => {
  const directory = mockDirectory({ failWrite: true });
  const { provider } = configuredProvider(directory);
  const service = serviceWith(provider);
  await provider.connect();

  await assert.rejects(
    service.writePortfolioSnapshot(SELECTED_FOLDER_BACKUP_PROVIDER_ID, [project()]),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.WRITE_FAILED &&
      error.fallbackProviderId === MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );
  assert.equal(directory.calls.aborts, 1);
});

test("unsafe snapshot names cannot escape the explicitly selected folder", async () => {
  const directory = mockDirectory();
  const { provider } = configuredProvider(directory);
  const service = serviceWith(provider);
  await provider.connect();

  await assert.rejects(
    service.writePortfolioSnapshot(SELECTED_FOLDER_BACKUP_PROVIDER_ID, [project()], {
      filename: "../outside.json",
    }),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT
  );
  assert.equal(directory.calls.writes, 0);
});

test("disconnect clears remembered access without affecting the universal fallback", async () => {
  const directory = mockDirectory();
  const { provider, cleared } = configuredProvider(directory);
  await provider.connect();

  const status = await provider.disconnect();

  assert.equal(cleared.length, 1);
  assert.equal(status.reason, "not_connected");
  assert.equal((await provider.connectionDetails()).isConnected, false);
});
