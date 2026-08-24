import {
  createProjectBundle,
  validateProjectBundle,
} from "./jsonTransfer.js";

export const PORTABLE_SNAPSHOT_FORMAT =
  "ide-projectsmanager.portfolio-snapshot";
export const PORTABLE_SNAPSHOT_VERSION = 1;

const SAFE_DEVICE_ID = /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u;

export class PortableBackupSnapshotError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PortableBackupSnapshotError";
    this.code = code;
  }
}

function snapshotError(code, message) {
  return new PortableBackupSnapshotError(code, message);
}

function nonSecretIdentifier(prefix, options = {}) {
  const randomId = options.randomUUID?.() || globalThis.crypto?.randomUUID?.();
  if (randomId) return `${prefix}_${randomId}`;

  const timestamp = Number.isFinite(options.now) ? options.now : Date.now();
  const random = Math.floor(Math.random() * 1_000_000_000);
  return `${prefix}_${timestamp.toString(36)}_${random.toString(36)}`;
}

export function isSafePortableBackupDeviceId(value) {
  return typeof value === "string" && SAFE_DEVICE_ID.test(value);
}

export function normalizePortableBackupDevice(value, options = {}) {
  const candidate = value && typeof value === "object" ? value : {};
  const id = isSafePortableBackupDeviceId(candidate.id)
    ? candidate.id
    : nonSecretIdentifier("device", options);
  const label = typeof candidate.label === "string" && candidate.label.trim()
    ? candidate.label.trim().slice(0, 80)
    : `Device ${id.replace(/^device_/u, "").slice(0, 8)}`;

  return {
    id,
    label,
    lastSnapshotId:
      typeof candidate.lastSnapshotId === "string" && candidate.lastSnapshotId.trim()
        ? candidate.lastSnapshotId.trim()
        : null,
  };
}

export function buildPortableBackupDeviceSnapshotReference(deviceId) {
  if (!isSafePortableBackupDeviceId(deviceId)) {
    throw snapshotError("invalid_device_id", "The backup device identifier is invalid.");
  }

  return `snapshots/${deviceId}/latest.json`;
}

export function createPortableBackupSnapshot(projects, options = {}) {
  const device = normalizePortableBackupDevice(options.device, options);
  const createdAt = options.createdAt || new Date().toISOString();
  const snapshotId = options.snapshotId || nonSecretIdentifier("snapshot", options);
  const bundle = options.bundle || createProjectBundle(projects, {
    exportedAt: createdAt,
  });

  return validatePortableBackupSnapshot({
    format: PORTABLE_SNAPSHOT_FORMAT,
    version: PORTABLE_SNAPSHOT_VERSION,
    snapshotId,
    device: {
      id: device.id,
      label: device.label,
    },
    createdAt,
    parentSnapshotId:
      typeof options.parentSnapshotId === "string" && options.parentSnapshotId.trim()
        ? options.parentSnapshotId.trim()
        : null,
    bundle,
  });
}

export function validatePortableBackupSnapshot(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw snapshotError("invalid_snapshot", "The portfolio snapshot must be an object.");
  }

  if (value.format !== PORTABLE_SNAPSHOT_FORMAT) {
    throw snapshotError("unsupported_snapshot_format", "The portfolio snapshot format is unsupported.");
  }

  if (value.version !== PORTABLE_SNAPSHOT_VERSION) {
    throw snapshotError("unsupported_snapshot_version", "The portfolio snapshot version is unsupported.");
  }

  if (typeof value.snapshotId !== "string" || !value.snapshotId.trim()) {
    throw snapshotError("invalid_snapshot_id", "The portfolio snapshot identifier is invalid.");
  }

  if (!isSafePortableBackupDeviceId(value.device?.id)) {
    throw snapshotError("invalid_device_id", "The portfolio snapshot device identifier is invalid.");
  }

  if (typeof value.device?.label !== "string" || !value.device.label.trim()) {
    throw snapshotError("invalid_device_label", "The portfolio snapshot device label is invalid.");
  }

  if (typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt))) {
    throw snapshotError("invalid_snapshot_date", "The portfolio snapshot creation date is invalid.");
  }

  if (
    value.parentSnapshotId !== null &&
    value.parentSnapshotId !== undefined &&
    (typeof value.parentSnapshotId !== "string" || !value.parentSnapshotId.trim())
  ) {
    throw snapshotError("invalid_parent_snapshot_id", "The portfolio snapshot parent identifier is invalid.");
  }

  validateProjectBundle(value.bundle);
  return value;
}
