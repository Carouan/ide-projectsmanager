import assert from "node:assert/strict";
import test from "node:test";

import {
  createNativeSnapshotTransfer,
  inspectNativeSnapshotTransferSupport,
  NATIVE_SNAPSHOT_TRANSFER_ERROR,
  shareNativeSnapshotTransfer,
} from "../src/services/nativeSnapshotTransfer.js";

const CREATED_AT = "2026-08-26T08:00:00.000Z";

class TestFile {
  constructor(parts, name, options = {}) {
    this.parts = parts;
    this.name = name;
    this.type = options.type || "";
  }
}

function project(id = "project-1") {
  return {
    schemaVersion: "1.0",
    project: { id, title: "Portable project" },
  };
}

function supportedEnvironment(overrides = {}) {
  const shared = [];
  return {
    File: TestFile,
    navigator: {
      canShare: ({ files }) => files?.[0] instanceof TestFile,
      share: async (payload) => {
        shared.push(payload);
      },
      ...overrides,
    },
    shared,
  };
}

test("native transfer support requires both the share sheet and actual file support", () => {
  assert.deepEqual(inspectNativeSnapshotTransferSupport({}), {
    isSupported: false,
    reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.UNAVAILABLE,
  });
  assert.deepEqual(inspectNativeSnapshotTransferSupport({
    navigator: { share() {} },
    File: TestFile,
  }), {
    isSupported: false,
    reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.FILES_UNSUPPORTED,
  });
  assert.equal(inspectNativeSnapshotTransferSupport(supportedEnvironment()).isSupported, true);
});

test("a transfer is a versioned JSON snapshot with explicit device lineage", () => {
  const transfer = createNativeSnapshotTransfer(
    [project()],
    { id: "device_local", label: "Local device", lastSnapshotId: "parent" },
    { createdAt: CREATED_AT, snapshotId: "shared-snapshot" }
  );

  assert.equal(
    transfer.filename,
    "ide-projectsmanager-device_local-2026-08-26T08-00-00Z.snapshot.json"
  );
  assert.equal(transfer.snapshot.snapshotId, "shared-snapshot");
  assert.equal(transfer.snapshot.parentSnapshotId, "parent");
  assert.deepEqual(JSON.parse(transfer.content), transfer.snapshot);
});

test("the native share sheet receives one JSON file and exposes no hidden transport", async () => {
  const environment = supportedEnvironment();
  const transfer = createNativeSnapshotTransfer(
    [project()],
    { id: "device_local", label: "Local device" },
    { createdAt: CREATED_AT, snapshotId: "shared-snapshot" }
  );
  const result = await shareNativeSnapshotTransfer(transfer, environment);

  assert.equal(result.snapshotId, "shared-snapshot");
  assert.equal(environment.shared.length, 1);
  assert.equal(environment.shared[0].files.length, 1);
  assert.equal(environment.shared[0].files[0].type, "application/json");
  assert.equal(environment.shared[0].files[0].name, transfer.filename);
});

test("cancelling or rejecting the native share sheet remains an explicit non-success", async () => {
  const transfer = createNativeSnapshotTransfer(
    [project()],
    { id: "device_local", label: "Local device" },
    { createdAt: CREATED_AT, snapshotId: "shared-snapshot" }
  );
  const cancelled = supportedEnvironment({
    share: async () => {
      const error = new Error("cancelled");
      error.name = "AbortError";
      throw error;
    },
  });
  const failed = supportedEnvironment({
    share: async () => {
      throw new Error("private system failure");
    },
  });

  await assert.rejects(
    shareNativeSnapshotTransfer(transfer, cancelled),
    (error) => error.code === NATIVE_SNAPSHOT_TRANSFER_ERROR.CANCELLED
  );
  await assert.rejects(
    shareNativeSnapshotTransfer(transfer, failed),
    (error) => error.code === NATIVE_SNAPSHOT_TRANSFER_ERROR.FAILED
  );
});
