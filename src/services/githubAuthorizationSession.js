export const GITHUB_AUTHORIZATION_STATUS = Object.freeze({
  DISCONNECTED: "disconnected",
  AUTHORIZED: "authorized",
  EXPIRED: "expired",
});

export class GitHubAuthorizationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GitHubAuthorizationError";
    this.code = code;
  }
}

function authorizationError(code, message) {
  return new GitHubAuthorizationError(code, message);
}

function normalizedCredential(value) {
  const candidate = typeof value === "string" ? value.trim() : "";

  if (
    candidate.length < 24 ||
    candidate.length > 512 ||
    !/^github_pat_[a-zA-Z0-9_]+$/u.test(candidate)
  ) {
    throw authorizationError(
      "invalid_credential",
      "Use a GitHub fine-grained personal access token."
    );
  }

  return candidate;
}

function validateDestination(value, options = {}) {
  let destination;

  try {
    destination = new URL(String(value || ""));
  } catch {
    throw authorizationError("unsafe_destination", "The GitHub API destination is invalid.");
  }

  const pathParts = destination.pathname.split("/").filter(Boolean);
  const method = String(options.method || "GET").toUpperCase();

  if (
    destination.origin !== "https://api.github.com" ||
    destination.username ||
    destination.password ||
    destination.hash ||
    pathParts.length < 3 ||
    pathParts[0] !== "repos" ||
    pathParts.slice(1, 3).some((part) => !part || /%2f|%5c/iu.test(part)) ||
    [...destination.searchParams.keys()].some((key) => /token|secret|credential|authorization/iu.test(key))
  ) {
    throw authorizationError(
      "unsafe_destination",
      "Private authorization is restricted to repository endpoints on api.github.com."
    );
  }

  if (method !== "GET" || options.body != null) {
    throw authorizationError("unsafe_method", "Private GitHub authorization permits GET requests only.");
  }

  return destination;
}

export function createGitHubAuthorizationSession({
  fetchImpl = (...args) => globalThis.fetch(...args),
  now = () => new Date().toISOString(),
} = {}) {
  let credential = null;
  let revision = 0;
  let snapshot = Object.freeze({
    status: GITHUB_AUTHORIZATION_STATUS.DISCONNECTED,
    connectedAt: null,
    revision,
  });
  const listeners = new Set();

  function update(status, connectedAt = null) {
    revision += 1;
    snapshot = Object.freeze({ status, connectedAt, revision });

    for (const listener of listeners) listener(snapshot);

    return snapshot;
  }

  function clearAuthorization(status = GITHUB_AUTHORIZATION_STATUS.DISCONNECTED) {
    credential = null;
    return update(status);
  }

  async function request(url, options = {}) {
    if (!credential || snapshot.status !== GITHUB_AUTHORIZATION_STATUS.AUTHORIZED) {
      throw authorizationError(
        snapshot.status === GITHUB_AUTHORIZATION_STATUS.EXPIRED
          ? "authorization_expired"
          : "authorization_required",
        "Explicit private GitHub authorization is required for this session."
      );
    }

    const destination = validateDestination(url, options);
    let response;

    try {
      response = await fetchImpl(destination.toString(), {
        ...options,
        method: "GET",
        credentials: "omit",
        redirect: "error",
        headers: {
          ...(options.headers || {}),
          Authorization: "Bearer " + credential,
        },
      });
    } catch {
      throw authorizationError("network", "GitHub could not be reached safely.");
    }

    if (response?.status === 401) {
      clearAuthorization(GITHUB_AUTHORIZATION_STATUS.EXPIRED);
      throw authorizationError(
        "authorization_expired",
        "The private GitHub authorization expired or was revoked."
      );
    }

    return response;
  }

  return Object.freeze({
    connect(value) {
      credential = normalizedCredential(value);
      return update(GITHUB_AUTHORIZATION_STATUS.AUTHORIZED, now());
    },
    disconnect() {
      return clearAuthorization();
    },
    request,
    isAuthorized() {
      return Boolean(credential) && snapshot.status === GITHUB_AUTHORIZATION_STATUS.AUTHORIZED;
    },
    getSnapshot() {
      return snapshot;
    },
    subscribe(listener) {
      if (typeof listener !== "function") {
        throw new TypeError("A GitHub authorization listener must be a function.");
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  });
}

export const githubAuthorizationSession = createGitHubAuthorizationSession();
