import {
  createPortableBackupProviderRegistry,
  inspectPortableBackupProvider,
  normalizePortableBackupProviderError,
  PORTABLE_BACKUP_AVAILABILITY,
  PORTABLE_BACKUP_ERROR_CODE,
  PortableBackupProviderError,
  PORTABLE_BACKUP_OPERATION,
  PORTABLE_BACKUP_PERMISSION,
  runPortableBackupProviderOperation,
} from "../repositories/portableBackup/portableBackupProvider.js";
import {
  createProjectBundle,
  ProjectBundleError,
  validateProjectBundle,
} from "./jsonTransfer.js";

function unavailableFallbackStatus() {
  return {
    providerId: null,
    label: "",
    isFallback: false,
    availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
    permission: PORTABLE_BACKUP_PERMISSION.UNKNOWN,
    capabilities: { write: false, list: false, read: false },
    reason: "No fallback provider is registered.",
    error: new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.UNKNOWN_PROVIDER,
      "No manual portable backup fallback is registered.",
      { recoverable: false }
    ),
  };
}

export function createPortableBackupService(options = {}) {
  const registry = createPortableBackupProviderRegistry(options.providers || []);
  const fallbackProviderId = options.fallbackProviderId || null;

  if (fallbackProviderId && !registry.has(fallbackProviderId)) {
    throw new PortableBackupProviderError(
      PORTABLE_BACKUP_ERROR_CODE.UNKNOWN_PROVIDER,
      `Portable backup fallback ${fallbackProviderId} is not registered.`,
      { providerId: fallbackProviderId, recoverable: false }
    );
  }

  function providerOrThrow(providerId) {
    const provider = registry.get(providerId);

    if (!provider) {
      throw new PortableBackupProviderError(
        PORTABLE_BACKUP_ERROR_CODE.UNKNOWN_PROVIDER,
        `Portable backup provider ${providerId || "(empty)"} is not registered.`,
        { providerId, fallbackProviderId }
      );
    }

    return provider;
  }

  async function inspect(providerId) {
    const provider = registry.get(providerId);

    if (!provider) {
      return {
        providerId: providerId || null,
        label: "",
        isFallback: false,
        availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
        permission: PORTABLE_BACKUP_PERMISSION.UNKNOWN,
        capabilities: { write: false, list: false, read: false },
        reason: "The requested provider is not registered.",
        error: new PortableBackupProviderError(
          PORTABLE_BACKUP_ERROR_CODE.UNKNOWN_PROVIDER,
          `Portable backup provider ${providerId || "(empty)"} is not registered.`,
          { providerId, fallbackProviderId }
        ),
      };
    }

    return inspectPortableBackupProvider(provider);
  }

  async function inspectFallback() {
    return fallbackProviderId
      ? inspect(fallbackProviderId)
      : unavailableFallbackStatus();
  }

  async function run(providerId, operation, input) {
    try {
      return await runPortableBackupProviderOperation(
        providerOrThrow(providerId),
        operation,
        input,
        { fallbackProviderId }
      );
    } catch (error) {
      throw normalizePortableBackupProviderError(error, {
        providerId,
        operation,
        fallbackProviderId,
      });
    }
  }

  async function writePortfolioSnapshot(providerId, projects, writeOptions = {}) {
    const bundle = createProjectBundle(projects, {
      exportedAt: writeOptions.exportedAt,
    });
    const result = await run(providerId, PORTABLE_BACKUP_OPERATION.WRITE, {
      bundle,
      filename: writeOptions.filename,
    });

    return { bundle, result };
  }

  return Object.freeze({
    async inspect(providerId) {
      return inspect(providerId);
    },

    async inspectAll() {
      return Promise.all(registry.list().map((provider) => inspect(provider.id)));
    },

    async inspectFallback() {
      return inspectFallback();
    },

    async writePortfolioSnapshot(providerId, projects, writeOptions = {}) {
      return writePortfolioSnapshot(providerId, projects, writeOptions);
    },

    async writeFallbackSnapshot(projects, writeOptions = {}) {
      if (!fallbackProviderId) {
        throw unavailableFallbackStatus().error;
      }

      return writePortfolioSnapshot(
        fallbackProviderId,
        projects,
        writeOptions
      );
    },

    async listSnapshots(providerId) {
      const snapshots = await run(
        providerId,
        PORTABLE_BACKUP_OPERATION.LIST
      );

      if (!Array.isArray(snapshots)) {
        throw new PortableBackupProviderError(
          PORTABLE_BACKUP_ERROR_CODE.LIST_FAILED,
          `Portable backup provider ${providerId} returned an invalid snapshot list.`,
          {
            providerId,
            operation: PORTABLE_BACKUP_OPERATION.LIST,
            fallbackProviderId,
          }
        );
      }

      return snapshots;
    },

    async readPortfolioSnapshot(providerId, reference) {
      try {
        const result = await run(
          providerId,
          PORTABLE_BACKUP_OPERATION.READ,
          reference
        );
        const bundle = validateProjectBundle(result?.bundle || result);

        return {
          providerId: result?.providerId || providerId,
          reference: result?.reference || null,
          bundle,
        };
      } catch (error) {
        if (error instanceof ProjectBundleError) {
          throw new PortableBackupProviderError(
            PORTABLE_BACKUP_ERROR_CODE.INVALID_SNAPSHOT,
            error.message,
            {
              providerId,
              operation: PORTABLE_BACKUP_OPERATION.READ,
              fallbackProviderId,
              causeCode: error.code,
            }
          );
        }

        throw error;
      }
    },
  });
}
