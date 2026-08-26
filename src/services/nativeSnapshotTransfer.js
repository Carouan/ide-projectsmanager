import {
  createPortableBackupSnapshot,
  validatePortableBackupSnapshot,
} from "./portableBackupSnapshots.js";

export const NATIVE_SNAPSHOT_TRANSFER_ERROR = Object.freeze({
  UNAVAILABLE: "native_share_unavailable",
  FILES_UNSUPPORTED: "native_share_files_unsupported",
  CANCELLED: "native_share_cancelled",
  FAILED: "native_share_failed",
});

export class NativeSnapshotTransferError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "NativeSnapshotTransferError";
    this.code = code;
  }
}

function transferError(code, message) {
  return new NativeSnapshotTransferError(code, message);
}

function safeTimestamp(value) {
  return String(value || "")
    .replace(/\.\d{3}Z$/, "Z")
    .replace(/[:]/g, "-");
}

function createProbeFile(FileConstructor) {
  return new FileConstructor(["{}"], "snapshot.json", {
    type: "application/json",
  });
}

export function inspectNativeSnapshotTransferSupport(environment = globalThis) {
  const navigatorObject = environment.navigator;
  const FileConstructor = environment.File;

  if (typeof navigatorObject?.share !== "function") {
    return { isSupported: false, reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.UNAVAILABLE };
  }

  if (
    typeof navigatorObject.canShare !== "function" ||
    typeof FileConstructor !== "function"
  ) {
    return { isSupported: false, reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.FILES_UNSUPPORTED };
  }

  try {
    const file = createProbeFile(FileConstructor);
    return navigatorObject.canShare({ files: [file] })
      ? { isSupported: true, reason: null }
      : { isSupported: false, reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.FILES_UNSUPPORTED };
  } catch {
    return { isSupported: false, reason: NATIVE_SNAPSHOT_TRANSFER_ERROR.FILES_UNSUPPORTED };
  }
}

export function createNativeSnapshotTransfer(projects, device, options = {}) {
  const snapshot = createPortableBackupSnapshot(projects, {
    device,
    parentSnapshotId: device?.lastSnapshotId || null,
    createdAt: options.createdAt,
    snapshotId: options.snapshotId,
  });
  const filename = `ide-projectsmanager-${snapshot.device.id}-${safeTimestamp(snapshot.createdAt)}.snapshot.json`;

  return {
    filename,
    mimeType: "application/json",
    snapshot,
    content: JSON.stringify(snapshot, null, 2),
  };
}

export async function shareNativeSnapshotTransfer(transfer, environment = globalThis) {
  const support = inspectNativeSnapshotTransferSupport(environment);
  if (!support.isSupported) {
    throw transferError(support.reason, "Native file sharing is unavailable.");
  }

  const snapshot = validatePortableBackupSnapshot(transfer?.snapshot);
  const file = new environment.File(
    [transfer.content || JSON.stringify(snapshot, null, 2)],
    transfer.filename,
    { type: transfer.mimeType || "application/json" }
  );

  if (!environment.navigator.canShare({ files: [file] })) {
    throw transferError(
      NATIVE_SNAPSHOT_TRANSFER_ERROR.FILES_UNSUPPORTED,
      "The native share sheet does not accept snapshot files."
    );
  }

  try {
    await environment.navigator.share({
      title: "IDE Projects Manager",
      text: "IDE Projects Manager portable snapshot",
      files: [file],
    });
  } catch (error) {
    if (error?.name === "AbortError") {
      throw transferError(
        NATIVE_SNAPSHOT_TRANSFER_ERROR.CANCELLED,
        "The native share sheet was cancelled."
      );
    }

    throw transferError(
      NATIVE_SNAPSHOT_TRANSFER_ERROR.FAILED,
      "The native share sheet could not transfer the snapshot."
    );
  }

  return {
    snapshotId: snapshot.snapshotId,
    filename: transfer.filename,
    deviceId: snapshot.device.id,
  };
}
