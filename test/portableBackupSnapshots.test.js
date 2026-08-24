import assert from "node:assert/strict";
import test from "node:test";

import {
  createSelectedFolderBackupProvider,
  SELECTED_FOLDER_BACKUP_PROVIDER_ID,
} from "../src/repositories/portableBackup/selectedFolderBackupProvider.js";
import {
  PORTABLE_BACKUP_ERROR_CODE,
  PORTABLE_BACKUP_PERMISSION,
} from "../src/repositories/portableBackup/portableBackupProvider.js";
import { createPortableBackupService } from "../src/services/portableBackupService.js";
import {
  buildPortableBackupDeviceSnapshotReference,
  createPortableBackupSnapshot,
  normalizePortableBackupDevice,
  PORTABLE_SNAPSHOT_FORMAT,
  PORTABLE_SNAPSHOT_VERSION,
  validatePortableBackupSnapshot,
} from "../src/services/portableBackupSnapshots.js";

const CREATED_AT = "2026-08-24T20:15:25.120Z";

function project(id = "project-1") {
  return {
    schemaVersion: "1.0",
    project: { id, title: id },
    stages: { v0_2: { notes: "Historical project data must stay intact." } },
    customHistoricalField: { preserve: true },
  };
}

function notFound() {
  const error = new Error("Not found");
  error.name = "NotFoundError";
  return error;
}

function mockFileTree(options = {}) {
  const files = new Map();
  const writes = [];
  const aborts = [];

  function fileHandle(path) {
    return {
      kind: "file",
      name: path.split("/").at(-1),
      async createWritable() {
        let pending = null;
        return {
          async write(content) {
            if (options.failWrite) throw new Error("disk full");
            pending = content;
          },
          async close() {
            files.set(path, pending);
            writes.push(path);
          },
          async abort() {
            pending = null;
            aborts.push(path);
          },
        };
      },
      async getFile() {
        if (!files.has(path)) throw notFound();
        return {
          lastModified: Date.parse(CREATED_AT),
          async text() { return files.get(path); },
        };
      },
    };
  }

  function directoryHandle(path = "") {
    const children = new Map();
    return {
      kind: "directory",
      name: path.split("/").at(-1) || "Backups",
      async queryPermission() { return options.permission || "granted"; },
      async requestPermission() { return options.permission || "granted"; },
      async getDirectoryHandle(name, input = {}) {
        if (!children.has(name) && !input.create) throw notFound();
        if (!children.has(name)) {
          children.set(name, directoryHandle(path ? `${path}/${name}` : name));
        }
        return children.get(name);
      },
      async getFileHandle(name, input = {}) {
        const filePath = path ? `${path}/${name}` : name;
        if (!input.create && !files.has(filePath)) throw notFound();
        return fileHandle(filePath);
      },
      async *entries() {
        for (const [name, handle] of children.entries()) yield [name, handle];
        for (const filePath of files.keys()) {
          const parent = filePath.includes("/")
            ? filePath.slice(0, filePath.lastIndexOf("/"))
            : "";
          if (parent === path) {
            yield [filePath.split("/").at(-1), fileHandle(filePath)];
          }
        }
      },
    };
  }

  return { files, writes, aborts, root: directoryHandle() };
}

async function connectedService(tree) {
  const provider = createSelectedFolderBackupProvider({
    environment: {
      isSecureContext: true,
      async showDirectoryPicker() { return tree.root; },
    },
    loadHandle: async () => null,
    saveHandle: async () => true,
    clearHandle: async () => true,
  });
  await provider.connect();
  return createPortableBackupService({ providers: [provider] });
}

test("device identity is local, stable and contains no account or browser metadata", () => {
  const first = normalizePortableBackupDevice(null, {
    randomUUID: () => "11111111-2222-3333-4444-555555555555",
  });
  const restored = normalizePortableBackupDevice(first);

  assert.equal(first.id, "device_11111111-2222-3333-4444-555555555555");
  assert.equal(first.label, "Device 11111111");
  assert.deepEqual(Object.keys(first), ["id", "label", "lastSnapshotId"]);
  assert.deepEqual(restored, first);
});

test("unsafe device identifiers never become filesystem paths", () => {
  for (const value of ["../outside", "device/a", "device\\a", "", null]) {
    assert.throws(
      () => buildPortableBackupDeviceSnapshotReference(value),
      (error) => error.code === "invalid_device_id"
    );
  }
  assert.equal(
    buildPortableBackupDeviceSnapshotReference("device_windows_01"),
    "snapshots/device_windows_01/latest.json"
  );
});

test("versioned snapshots preserve global bundle and historical project structure", () => {
  const original = project();
  const snapshot = createPortableBackupSnapshot([original], {
    device: { id: "device_windows", label: "Windows" },
    createdAt: CREATED_AT,
    snapshotId: "snapshot_1",
    parentSnapshotId: "snapshot_parent",
  });

  assert.equal(snapshot.format, PORTABLE_SNAPSHOT_FORMAT);
  assert.equal(snapshot.version, PORTABLE_SNAPSHOT_VERSION);
  assert.equal(snapshot.snapshotId, "snapshot_1");
  assert.deepEqual(snapshot.device, { id: "device_windows", label: "Windows" });
  assert.equal(snapshot.createdAt, CREATED_AT);
  assert.equal(snapshot.parentSnapshotId, "snapshot_parent");
  assert.equal(snapshot.bundle.format, "ide-projectsmanager.project-bundle");
  assert.equal(snapshot.bundle.exportedAt, CREATED_AT);
  assert.deepEqual(snapshot.bundle.projects[0], original);
  assert.deepEqual(Object.keys(original), [
    "schemaVersion",
    "project",
    "stages",
    "customHistoricalField",
  ]);
});

test("invalid snapshot metadata is rejected deterministically", () => {
  const valid = createPortableBackupSnapshot([project()], {
    device: { id: "device_a", label: "A" },
    snapshotId: "snapshot_a",
    createdAt: CREATED_AT,
  });
  const cases = [
    [{ ...valid, format: "another-format" }, "unsupported_snapshot_format"],
    [{ ...valid, version: 2 }, "unsupported_snapshot_version"],
    [{ ...valid, snapshotId: "" }, "invalid_snapshot_id"],
    [{ ...valid, device: { ...valid.device, id: "../outside" } }, "invalid_device_id"],
    [{ ...valid, device: { ...valid.device, label: "" } }, "invalid_device_label"],
    [{ ...valid, createdAt: "not-a-date" }, "invalid_snapshot_date"],
    [{ ...valid, parentSnapshotId: 4 }, "invalid_parent_snapshot_id"],
  ];

  for (const [value, code] of cases) {
    assert.throws(() => validatePortableBackupSnapshot(value), (error) => error.code === code);
  }
});

test("two devices save to separate latest.json files without overwriting each other", async () => {
  const tree = mockFileTree();
  const firstDevice = await connectedService(tree);
  const secondDevice = await connectedService(tree);

  await firstDevice.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project("windows-project")],
    {
      device: { id: "device_windows", label: "Windows" },
      snapshotId: "snapshot_windows",
      createdAt: CREATED_AT,
    }
  );
  await secondDevice.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project("android-project")],
    {
      device: { id: "device_android", label: "Android" },
      snapshotId: "snapshot_android",
      createdAt: CREATED_AT,
    }
  );

  assert.deepEqual([...tree.files.keys()].sort(), [
    "snapshots/device_android/latest.json",
    "snapshots/device_windows/latest.json",
  ]);
  assert.equal(
    JSON.parse(tree.files.get("snapshots/device_windows/latest.json"))
      .bundle.projects[0].project.id,
    "windows-project"
  );
  assert.equal(
    JSON.parse(tree.files.get("snapshots/device_android/latest.json"))
      .bundle.projects[0].project.id,
    "android-project"
  );
});

test("device snapshots round-trip through listing and reading without restoring data", async () => {
  const tree = mockFileTree();
  const service = await connectedService(tree);
  const saved = await service.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project()],
    {
      device: { id: "device_a", label: "Laptop" },
      snapshotId: "snapshot_a",
      parentSnapshotId: "snapshot_previous",
      createdAt: CREATED_AT,
    }
  );
  const listed = await service.listSnapshots(SELECTED_FOLDER_BACKUP_PROVIDER_ID);
  const restored = await service.readPortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    listed[0].reference
  );

  assert.equal(listed[0].reference, "snapshots/device_a/latest.json");
  assert.equal(listed[0].snapshotId, "snapshot_a");
  assert.equal(listed[0].deviceLabel, "Laptop");
  assert.equal(listed[0].parentSnapshotId, "snapshot_previous");
  assert.deepEqual(restored.snapshot, saved.snapshot);
  assert.deepEqual(restored.bundle, saved.bundle);
});

test("successive snapshots keep their known parent and replace only their own latest", async () => {
  const tree = mockFileTree();
  const service = await connectedService(tree);
  const device = { id: "device_a", label: "Laptop" };

  await service.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project("first")],
    { device, snapshotId: "snapshot_1", createdAt: CREATED_AT }
  );
  await service.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project("second")],
    {
      device,
      snapshotId: "snapshot_2",
      parentSnapshotId: "snapshot_1",
      createdAt: "2026-08-24T20:20:00.000Z",
    }
  );

  const current = JSON.parse(tree.files.get("snapshots/device_a/latest.json"));
  assert.equal(tree.files.size, 1);
  assert.equal(current.snapshotId, "snapshot_2");
  assert.equal(current.parentSnapshotId, "snapshot_1");
  assert.equal(current.bundle.projects[0].project.id, "second");
});

test("snapshot writes require an open authorized provider and never prompt silently", async () => {
  const tree = mockFileTree({ permission: PORTABLE_BACKUP_PERMISSION.DENIED });
  const service = await connectedService(tree);

  await assert.rejects(
    service.writeDevicePortfolioSnapshot(
      SELECTED_FOLDER_BACKUP_PROVIDER_ID,
      [project()],
      { device: { id: "device_a", label: "Laptop" } }
    ),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.PERMISSION_DENIED
  );
  assert.equal(tree.files.size, 0);
  assert.equal(tree.writes.length, 0);
});

test("failed snapshot writes abort and leave the previously committed file intact", async () => {
  const tree = mockFileTree();
  const initial = await connectedService(tree);
  await initial.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project("safe")],
    {
      device: { id: "device_a", label: "Laptop" },
      snapshotId: "snapshot_safe",
      createdAt: CREATED_AT,
    }
  );
  const previousContent = tree.files.get("snapshots/device_a/latest.json");
  const originalGetDirectory = tree.root.getDirectoryHandle.bind(tree.root);
  const snapshotsDirectory = await originalGetDirectory("snapshots");
  const deviceDirectory = await snapshotsDirectory.getDirectoryHandle("device_a");
  const originalGetFile = deviceDirectory.getFileHandle.bind(deviceDirectory);
  deviceDirectory.getFileHandle = async (...args) => {
    const handle = await originalGetFile(...args);
    const originalCreateWritable = handle.createWritable.bind(handle);
    handle.createWritable = async () => {
      const writable = await originalCreateWritable();
      writable.write = async () => { throw new Error("disk full"); };
      return writable;
    };
    return handle;
  };

  await assert.rejects(
    initial.writeDevicePortfolioSnapshot(
      SELECTED_FOLDER_BACKUP_PROVIDER_ID,
      [project("unsafe")],
      {
        device: { id: "device_a", label: "Laptop" },
        snapshotId: "snapshot_unsafe",
        createdAt: CREATED_AT,
      }
    ),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.WRITE_FAILED
  );

  assert.equal(tree.files.get("snapshots/device_a/latest.json"), previousContent);
  assert.deepEqual(tree.aborts, ["snapshots/device_a/latest.json"]);
});

test("device-directory mismatches are rejected without importing untrusted content", async () => {
  const tree = mockFileTree();
  const service = await connectedService(tree);
  const saved = await service.writeDevicePortfolioSnapshot(
    SELECTED_FOLDER_BACKUP_PROVIDER_ID,
    [project()],
    {
      device: { id: "device_a", label: "Laptop" },
      snapshotId: "snapshot_a",
      createdAt: CREATED_AT,
    }
  );
  tree.files.set(
    "snapshots/device_a/latest.json",
    JSON.stringify({
      ...saved.snapshot,
      device: { id: "device_other", label: "Other device" },
    })
  );

  await assert.rejects(
    service.readPortfolioSnapshot(
      SELECTED_FOLDER_BACKUP_PROVIDER_ID,
      "snapshots/device_a/latest.json"
    ),
    (error) => error.code === PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT
  );
});
