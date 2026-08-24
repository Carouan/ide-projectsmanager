export const REPOSITORY_SNAPSHOT_STATUS = Object.freeze({
  UNLINKED: "unlinked",
  FRESH: "fresh",
  STALE: "stale",
  OFFLINE: "offline",
  UNAUTHORIZED: "unauthorized",
  ERROR: "error",
  UNSUPPORTED: "unsupported",
});

export class RepositoryProviderError extends Error {
  constructor(code, message, details = {}) {
    super(message);
    this.name = "RepositoryProviderError";
    this.code = code;
    this.details = details;
  }
}

export function normalizeRepositoryProviderError(error) {
  if (error instanceof RepositoryProviderError) {
    return {
      code: error.code,
      message: error.message,
      ...error.details,
    };
  }

  return {
    code: "unknown",
    message: error instanceof Error ? error.message : "Unknown provider error",
  };
}

export function createRepositoryProviderRegistry(providers = []) {
  const providersById = new Map();

  for (const provider of providers) {
    if (
      !provider ||
      typeof provider.id !== "string" ||
      typeof provider.readRepository !== "function"
    ) {
      throw new TypeError(
        "Repository providers require an id and a readRepository function"
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
  });
}
