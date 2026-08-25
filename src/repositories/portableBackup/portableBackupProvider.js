export const PORTABLE_BACKUP_AVAILABILITY = Object.freeze({
  AVAILABLE: "available",
  UNAVAILABLE: "unavailable",
});

export const PORTABLE_BACKUP_PERMISSION = Object.freeze({
  GRANTED: "granted",
  PROMPT: "prompt",
  DENIED: "denied",
  UNKNOWN: "unknown",
});

export const PORTABLE_BACKUP_OPERATION = Object.freeze({
  WRITE: "writeSnapshot",
  LIST: "listSnapshots",
  READ: "readSnapshot",
});

export const PORTABLE_BACKUP_ERROR_CODE = Object.freeze({
  INVALID_PROVIDER: "invalid_provider",
  UNKNOWN_PROVIDER: "unknown_provider",
  PROVIDER_UNAVAILABLE: "provider_unavailable",
  SELECTION_ABORTED: "selection_aborted",
  SECURITY_RESTRICTION: "security_restriction",
  INVALID_PICKER_OPTIONS: "invalid_picker_options",
  PERMISSION_REQUIRED: "permission_required",
  PERMISSION_DENIED: "permission_denied",
  UNSUPPORTED_OPERATION: "unsupported_operation",
  WRITE_FAILED: "write_failed",
  LIST_FAILED: "list_failed",
  READ_FAILED: "read_failed",
  INVALID_SNAPSHOT: "invalid_snapshot",
  UNKNOWN: "unknown",
});

const OPERATION_ERROR_CODES = Object.freeze({
  [PORTABLE_BACKUP_OPERATION.WRITE]: PORTABLE_BACKUP_ERROR_CODE.WRITE_FAILED,
  [PORTABLE_BACKUP_OPERATION.LIST]: PORTABLE_BACKUP_ERROR_CODE.LIST_FAILED,
  [PORTABLE_BACKUP_OPERATION.READ]: PORTABLE_BACKUP_ERROR_CODE.READ_FAILED,
});

export class PortableBackupProviderError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "PortableBackupProviderError";
    this.code = code;
    this.providerId = details.providerId || null;
    this.operation = details.operation || null;
    this.recoverable = details.recoverable !== false;
    this.fallbackProviderId = details.fallbackProviderId || null;
    this.causeCode = details.causeCode || null;
  }
}

function providerError(code, message, details = {}) {
  return new PortableBackupProviderError(code, message, details);
}

function normalizedCapabilities(provider, declaredCapabilities = {}) {
  return {
    write:
      declaredCapabilities.write === true ||
      (declaredCapabilities.write !== false &&
        typeof provider?.[PORTABLE_BACKUP_OPERATION.WRITE] === "function"),
    list:
      declaredCapabilities.list === true ||
      (declaredCapabilities.list !== false &&
        typeof provider?.[PORTABLE_BACKUP_OPERATION.LIST] === "function"),
    read:
      declaredCapabilities.read === true ||
      (declaredCapabilities.read !== false &&
        typeof provider?.[PORTABLE_BACKUP_OPERATION.READ] === "function"),
  };
}

function normalizedAvailability(value) {
  return value === PORTABLE_BACKUP_AVAILABILITY.AVAILABLE
    ? PORTABLE_BACKUP_AVAILABILITY.AVAILABLE
    : PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE;
}

function normalizedPermission(value) {
  return Object.values(PORTABLE_BACKUP_PERMISSION).includes(value)
    ? value
    : PORTABLE_BACKUP_PERMISSION.UNKNOWN;
}

function validateProvider(provider) {
  if (
    !provider ||
    typeof provider.id !== "string" ||
    !provider.id.trim() ||
    typeof provider.inspect !== "function"
  ) {
    throw providerError(
      PORTABLE_BACKUP_ERROR_CODE.INVALID_PROVIDER,
      "Portable backup providers require a stable id and an inspect function.",
      { recoverable: false }
    );
  }

  return provider;
}

export function normalizePortableBackupProviderError(error, context = {}) {
  const details = {
    providerId: context.providerId || error?.providerId || null,
    operation: context.operation || error?.operation || null,
    fallbackProviderId:
      context.fallbackProviderId || error?.fallbackProviderId || null,
    recoverable: error?.recoverable !== false,
    causeCode: context.causeCode || error?.causeCode || null,
  };

  if (error instanceof PortableBackupProviderError) {
    return new PortableBackupProviderError(error.code, error.message, details);
  }

  const code =
    OPERATION_ERROR_CODES[details.operation] ||
    PORTABLE_BACKUP_ERROR_CODE.UNKNOWN;

  return new PortableBackupProviderError(
    code,
    error instanceof Error ? error.message : "Unknown portable backup error.",
    details
  );
}

export async function inspectPortableBackupProvider(provider) {
  let validatedProvider;

  try {
    validatedProvider = validateProvider(provider);
  } catch (error) {
    return {
      providerId: provider?.id || null,
      label: provider?.label || provider?.id || "",
      isFallback: provider?.isFallback === true,
      availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
      permission: PORTABLE_BACKUP_PERMISSION.UNKNOWN,
      capabilities: normalizedCapabilities(provider),
      error: normalizePortableBackupProviderError(error),
    };
  }

  try {
    const inspected = (await validatedProvider.inspect()) || {};

    return {
      providerId: validatedProvider.id,
      label: validatedProvider.label || validatedProvider.id,
      isFallback: validatedProvider.isFallback === true,
      availability: normalizedAvailability(inspected.availability),
      permission: normalizedPermission(inspected.permission),
      capabilities: normalizedCapabilities(
        validatedProvider,
        inspected.capabilities
      ),
      reason: typeof inspected.reason === "string" ? inspected.reason : "",
      error: null,
    };
  } catch (error) {
    return {
      providerId: validatedProvider.id,
      label: validatedProvider.label || validatedProvider.id,
      isFallback: validatedProvider.isFallback === true,
      availability: PORTABLE_BACKUP_AVAILABILITY.UNAVAILABLE,
      permission: PORTABLE_BACKUP_PERMISSION.UNKNOWN,
      capabilities: normalizedCapabilities(validatedProvider),
      reason: "",
      error: normalizePortableBackupProviderError(error, {
        providerId: validatedProvider.id,
      }),
    };
  }
}

export function createPortableBackupProviderRegistry(providers = []) {
  const providersById = new Map();

  for (const candidate of providers) {
    const provider = validateProvider(candidate);

    if (providersById.has(provider.id)) {
      throw providerError(
        PORTABLE_BACKUP_ERROR_CODE.INVALID_PROVIDER,
        `Portable backup provider ${provider.id} is registered more than once.`,
        { providerId: provider.id, recoverable: false }
      );
    }

    providersById.set(provider.id, provider);
  }

  return Object.freeze({
    get(providerId) {
      return providersById.get(providerId) || null;
    },
    has(providerId) {
      return providersById.has(providerId);
    },
    list() {
      return [...providersById.values()];
    },
  });
}

function capabilityForOperation(operation) {
  if (operation === PORTABLE_BACKUP_OPERATION.WRITE) return "write";
  if (operation === PORTABLE_BACKUP_OPERATION.LIST) return "list";
  if (operation === PORTABLE_BACKUP_OPERATION.READ) return "read";
  return null;
}

export async function runPortableBackupProviderOperation(
  provider,
  operation,
  input,
  options = {}
) {
  const status = await inspectPortableBackupProvider(provider);
  const context = {
    providerId: status.providerId,
    operation,
    fallbackProviderId: options.fallbackProviderId || null,
  };

  if (status.error) {
    throw normalizePortableBackupProviderError(status.error, context);
  }

  if (status.availability !== PORTABLE_BACKUP_AVAILABILITY.AVAILABLE) {
    throw providerError(
      PORTABLE_BACKUP_ERROR_CODE.PROVIDER_UNAVAILABLE,
      status.reason || `Portable backup provider ${status.providerId} is unavailable.`,
      context
    );
  }

  if (status.permission === PORTABLE_BACKUP_PERMISSION.DENIED) {
    throw providerError(
      PORTABLE_BACKUP_ERROR_CODE.PERMISSION_DENIED,
      `Portable backup provider ${status.providerId} permission was denied.`,
      context
    );
  }

  if (
    status.permission === PORTABLE_BACKUP_PERMISSION.PROMPT ||
    status.permission === PORTABLE_BACKUP_PERMISSION.UNKNOWN
  ) {
    throw providerError(
      PORTABLE_BACKUP_ERROR_CODE.PERMISSION_REQUIRED,
      `Portable backup provider ${status.providerId} requires an explicit permission.`,
      context
    );
  }

  const capability = capabilityForOperation(operation);
  if (
    !capability ||
    status.capabilities[capability] !== true ||
    typeof provider?.[operation] !== "function"
  ) {
    throw providerError(
      PORTABLE_BACKUP_ERROR_CODE.UNSUPPORTED_OPERATION,
      `Portable backup provider ${status.providerId} does not support ${operation}.`,
      context
    );
  }

  try {
    return await provider[operation](input, options);
  } catch (error) {
    throw normalizePortableBackupProviderError(error, context);
  }
}
