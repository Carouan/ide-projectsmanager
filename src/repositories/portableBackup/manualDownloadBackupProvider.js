import {
  downloadJsonFile,
  readJsonFile,
  validateProjectBundle,
} from "../../services/jsonTransfer.js";
import {
  PORTABLE_BACKUP_AVAILABILITY,
  PORTABLE_BACKUP_PERMISSION,
} from "./portableBackupProvider.js";

export const MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID = "manual-download";

export function buildManualBackupFilename(bundle) {
  const exportedAt = typeof bundle?.exportedAt === "string"
    ? bundle.exportedAt
    : new Date().toISOString();
  const date = Number.isNaN(Date.parse(exportedAt))
    ? new Date().toISOString().slice(0, 10)
    : exportedAt.slice(0, 10);

  return `ide-projectsmanager-backup-${date}.json`;
}

export function createManualDownloadBackupProvider(options = {}) {
  const download = options.download || downloadJsonFile;
  const readFile = options.readFile || readJsonFile;

  return Object.freeze({
    id: MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
    label: "Manual JSON download and import",
    isFallback: true,

    async inspect() {
      return {
        availability: PORTABLE_BACKUP_AVAILABILITY.AVAILABLE,
        permission: PORTABLE_BACKUP_PERMISSION.GRANTED,
        capabilities: {
          write: true,
          list: false,
          read: true,
        },
      };
    },

    async writeSnapshot(input = {}) {
      const bundle = validateProjectBundle(input.bundle);
      const filename = input.filename || buildManualBackupFilename(bundle);

      download(filename, bundle);

      return {
        providerId: MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
        filename,
        projectCount: bundle.projectCount,
        exportedAt: bundle.exportedAt,
      };
    },

    async readSnapshot(input = {}) {
      const file = input.file || input;
      const bundle = await readFile(file);

      return {
        providerId: MANUAL_DOWNLOAD_BACKUP_PROVIDER_ID,
        reference: file?.name || null,
        bundle,
      };
    },
  });
}
