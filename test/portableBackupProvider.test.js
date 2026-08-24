import assert from "node:assert/strict";
import test from "node:test";

import {
  createManualDownloadBackupProvider,
  MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
} from "../src/repositories/portableBackup/manualDownloadBackupProvider.js";
import {
  createPortableBackupProviderRegistry,
  inspectPortableBackupProvider,
  PORTABLE_BACKUP_AVAILABILITY,
  PORTABLE_BACKUP_ERROR_CODE,
  PORTABLE_BACKUP_OPERATION,
  PORTABLE_BACKUP_PERMISSION,
  PortableBackupProviderError,
  runPortableBackupProviderOperation,
} from "../src/repositories/portableBackup/portableBackupProvider.js";
import { createPortableBackupService } from "../src/services/portableBackupService.js";

const EXPORTED_AT = "2026-08-24T15:00:00.000Z";

function project(id = "project-1") {
  return {
    schemaVersion: "1.0",
    project: { id, title: id },
  };
}

function status(overrides = {}) {
  return {
    availability: PORTABLE_BACKUP_AVAILABILITY.AVAILABLE,
    permission: PORTABLE_BACKUP_PERMISSION.GRANTED,
    capabilities: { write: true, list: true, read: true },
    ...overrides,
  };
}

function provider(overrides = {}) {
  return {
    id: "memory",
    inspect: async () => status(),
    writeSnapshot: async ({ bundle }) => ({ bundle }),
    listSnapshots: async () => [],
    readSnapshot: async ({ bundle }) => ({ bundle }),
    ...overrides,
  };
}

function serviceWith(providers, fallbackProviderId = null) {
  return createPortableBackupService({ providers, fallbackProviderId });
}

test("provider registry requires stable unique providers", () => {
  assert.throws(
    () => createPortableBackupProviderRegistry([{}]),
    (error) =>
      error instanceof PortableBackupProviderError &&
      error.code === PORTABLE_BACKUP_ERROR_CODE.INVALID_PROVIDER
  );
  assert.throws(
    () => createPortableBackupProviderRegistry([provider(), provider()]),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.INVALID_PROVIDER
  );
});

test("provider inspection normalizes capabilities and presentation state", async () => {
  const inspected = await inspectPortableBackupProvider(
    provider({
      label: "Memory mirror",
      inspect: async () =>
        status({
          permission: PORTABLE_BACKUP_PERMISSION.PROMPT,
          capabilities: { write: true, list: false, read: false },
          reason: "Choose a location first.",
        }),
    })
  );

  assert.deepEqual(inspected.capabilities, {
    write: true,
    list: false,
    read: false,
  });
  assert.equal(inspected.label, "Memory mirror");
  assert.equal(inspected.permission, PORTABLE_BACKUP_PERMISSION.PROMPT);
  assert.equal(inspected.reason, "Choose a location first.");
  assert.equal(inspected.error, null);
});

test("inspection failures become deterministic unavailable states", async () => {
  const inspected = await inspectPortableBackupProvider(
    provider({ inspect: async () => { throw new Error("adapter failed"); } })
  );

  assert.equal(inspected.availability, PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE);
  assert.equal(inspected.permission, PORTABLE_BACKUP_PERMISSION.UNKNOWN);
  assert.equal(inspected.error.code, PORTABLE_BACKUP_ERROR_CODE.UNKNOWN);
  assert.equal(inspected.error.providerId, "memory");
});

test("unavailable providers fail without calling their transport", async () => {
  let writes = 0;
  const unavailable = provider({
    inspect: async () =>
      status({
        availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
        reason: "Not supported by this browser.",
      }),
    writeSnapshot: async () => { writes += 1; },
  });

  await assert.rejects(
    runPortableBackupProviderOperation(
      unavailable,
      PORTABLE_BACKUP_OPERATION.WRITE,
      {}
    ),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.PROVIDER_UNAVAILABLE &&
      error.message === "Not supported by this browser."
  );
  assert.equal(writes, 0);
});

test("permission states remain distinct and block transport calls", async () => {
  for (const [permission, code] of [
    [PORTABLE_BACKUP_PERMISSION.PROMPT, PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED],
    [PORTABLE_BACKUP_PERMISSION.UNKNOWN, PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED],
    [PORTABLE_BACKUP_PERMISSION.DENIED, PORTABLE_BACKUP_ERROR_CODE.PERMISSION_DENIED],
  ]) {
    await assert.rejects(
      runPortableBackupProviderOperation(
        provider({ inspect: async () => status({ permission }) }),
        PORTABLE_BACKUP_OPERATION.WRITE,
        {}
      ),
      (error) => error.code === code
    );
  }
});

test("unsupported operations fail explicitly instead of returning empty data", async () => {
  await assert.rejects(
    runPortableBackupProviderOperation(
      provider({
        listSnapshots: undefined,
        inspect: async () => status({ capabilities: { list: false } }),
      }),
      PORTABLE_BACKUP_OPERATION.LIST
    ),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.UNSUPPORTED_OPERATION
  );
});

test("transport errors receive operation-specific normalized codes", async () => {
  await assert.rejects(
    runPortableBackupProviderOperation(
      provider({ writeSnapshot: async () => { throw new Error("disk full"); } }),
      PORTABLE_BACKUP_OPERATION.WRITE,
      {}
    ),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.WRITE_FAILED &&
      error.providerId === "memory" &&
      error.operation === PORTABLE_BACKUP_OPERATION.WRITE
  );
});

test("manual provider is always available and exposes honest capabilities", async () => {
  const manual = createManualDownloadBackupProvider({
    download: () => {},
    readFile: async () => ({}),
  });
  const inspected = await inspectPortableBackupProvider(manual);

  assert.equal(inspected.providerId, MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID);
  assert.equal(inspected.isFallback, true);
  assert.equal(inspected.availability, PORTABLE_BACKUP_AVAILABILITY.AVAILABLE);
  assert.equal(inspected.permission, PORTABLE_BACKUP_PERMISSION.GRANTED);
  assert.deepEqual(inspected.capabilities, {
    write: true,
    list: false,
    read: true,
  });
});

test("manual fallback writes the existing global bundle without changing its schema", async () => {
  const downloads = [];
  const manual = createManualDownloadBackupProvider({
    download: (filename, bundle) => downloads.push({ filename, bundle }),
  });
  const backupService = serviceWith(
    [manual],
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );

  const written = await backupService.writeFallbackSnapshot([project()], {
    exportedAt: EXPORTED_AT,
  });

  assert.equal(downloads.length, 1);
  assert.equal(downloads[0].filename, "ide-projectsmanager-backup-2026-08-24.json");
  assert.equal(downloads[0].bundle.format, "ide-projectsmanager.project-bundle");
  assert.equal(downloads[0].bundle.version, 1);
  assert.equal(downloads[0].bundle.projectCount, 1);
  assert.deepEqual(written.bundle, downloads[0].bundle);
});

test("manual fallback reads and validates the selected portfolio backup", async () => {
  const expectedBundle = {
    format: "ide-projectsmanager.project-bundle",
    version: 1,
    exportedAt: EXPORTED_AT,
    projectCount: 1,
    projects: [project()],
  };
  const file = { name: "backup.json" };
  const manual = createManualDownloadBackupProvider({
    readFile: async (receivedFile) => {
      assert.equal(receivedFile, file);
      return expectedBundle;
    },
  });
  const backupService = serviceWith(
    [manual],
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );

  const read = await backupService.readPortfolioSnapshot(
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
    { file }
  );

  assert.equal(read.reference, "backup.json");
  assert.equal(read.bundle, expectedBundle);
});

test("invalid imported snapshots use the portable invalid-snapshot error", async () => {
  const manual = createManualDownloadBackupProvider({
    readFile: async () => ({ format: "unknown" }),
  });
  const backupService = serviceWith(
    [manual],
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );

  await assert.rejects(
    backupService.readPortfolioSnapshot(
      MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
      { file: { name: "invalid.json" } }
    ),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT &&
      error.providerId === MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID &&
      error.causeCode === "unsupported_format"
  );
});

test("known snapshots can be listed and read through a transport-neutral service", async () => {
  const expectedBundle = {
    format: "ide-projectsmanager.project-bundle",
    version: 1,
    exportedAt: EXPORTED_AT,
    projectCount: 1,
    projects: [project("portable")],
  };
  const memory = provider({
    listSnapshots: async () => [{ id: "snapshot-1", createdAt: EXPORTED_AT }],
    readSnapshot: async (reference) => ({ reference, bundle: expectedBundle }),
  });
  const backupService = serviceWith([memory]);

  assert.deepEqual(await backupService.listSnapshots("memory"), [
    { id: "snapshot-1", createdAt: EXPORTED_AT },
  ]);
  assert.deepEqual(
    (await backupService.readPortfolioSnapshot("memory", "snapshot-1")).bundle,
    expectedBundle
  );
});

test("invalid provider lists fail rather than looking like an empty backup", async () => {
  const backupService = serviceWith([
    provider({ listSnapshots: async () => ({ id: "not-a-list" }) }),
  ]);

  await assert.rejects(
    backupService.listSnapshots("memory"),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.LIST_FAILED
  );
});

test("unavailable providers advertise the explicit manual fallback without invoking it", async () => {
  let downloads = 0;
  const manual = createManualDownloadBackupProvider({
    download: () => { downloads += 1; },
  });
  const unavailable = provider({
    id: "folder",
    inspect: async () =>
      status({ availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE }),
  });
  const backupService = serviceWith(
    [unavailable, manual],
    MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );

  await assert.rejects(
    backupService.writePortfolioSnapshot("folder", [project()], {
      exportedAt: EXPORTED_AT,
    }),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.PROVIDER_UNAVAILABLE &&
      error.fallbackProviderId === MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID
  );
  const fallback = await backupService.inspectFallback();

  assert.equal(fallback.providerId, MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID);
  assert.equal(fallback.availability, PORTABLE_BACKUP_AVAILABILITY.AVAILABLE);
  assert.equal(downloads, 0);
});

test("a missing fallback is rejected at service construction", () => {
  assert.throws(
    () => serviceWith([provider()], "missing"),
    (error) =>
      error.code === PORTABLE_BACKUP_ERROR_CODE.UNKNOWN_PROVIDER &&
      error.recoverable === false
  );
});
