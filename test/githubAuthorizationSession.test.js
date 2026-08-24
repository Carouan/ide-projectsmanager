import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import test from "node:test";

import { createGitHubRepositoryProvider } from "../src/repositories/providers/githubRepositoryProvider.js";
import {
  createRepositoryProviderRegistry,
  REPOSITORY_SNAPSHOT_STATUS,
} from "../src/repositories/providers/repositoryProvider.js";
import {
  createMemoryRepositorySnapshotCache,
  repositorySnapshotCacheKey,
} from "../src/repositories/repositorySnapshotCache.js";
import {
  createGitHubAuthorizationSession,
  GitHubAuthorizationError,
  GITHUB_AUTHORIZATION_STATUS,
} from "../src/services/githubAuthorizationSession.js";
import { createProjectBundle } from "../src/services/jsonTransfer.js";
import { projectToMarkdown } from "../src/services/markdownExport.js";
import { createEmptyProject } from "../src/services/projectFactory.js";
import { createRepositorySnapshotService } from "../src/services/repositorySnapshotService.js";

const TEST_CREDENTIAL = "github" + "_pat_" + "TEST_ONLY_SESSION_SENTINEL_123456789";
const NOW = "2026-08-24T18:00:00.000Z";
const PRIVATE_REPOSITORY = Object.freeze({
  provider: "github",
  fullName: "Carouan/private-project",
  visibility: "private",
  url: "https://github.com/Carouan/private-project",
});

function response(data = {}, { status = 200, headers = {} } = {}) {
  const values = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (key) => values.get(String(key).toLowerCase()) || null },
    async json() {
      return data;
    },
  };
}

function markdownResponse(markdown) {
  return response({
    path: "ROADMAP.md",
    encoding: "base64",
    content: Buffer.from(markdown, "utf8").toString("base64"),
    html_url: "https://github.com/Carouan/private-project/blob/main/ROADMAP.md",
  });
}

function privateFetch(calls = []) {
  return async (url, options) => {
    calls.push({ url, options });

    if (url.endsWith("/repos/Carouan/private-project")) {
      return response({
        id: 72,
        full_name: "Carouan/private-project",
        name: "private-project",
        owner: { login: "Carouan" },
        html_url: PRIVATE_REPOSITORY.url,
        visibility: "private",
        private: true,
        default_branch: "main",
      });
    }

    if (url.includes("/pulls?")) return response([]);
    if (url.endsWith("/contents/ROADMAP.md")) {
      return markdownResponse("# Roadmap\n- [x] Explicit result\n- [ ] Next result");
    }

    return response({}, { status: 404 });
  };
}

test("a new private authorization session contains no credential and performs no request", () => {
  let requests = 0;
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { requests += 1; },
  });

  assert.equal(session.getSnapshot().status, GITHUB_AUTHORIZATION_STATUS.DISCONNECTED);
  assert.equal(session.isAuthorized(), false);
  assert.equal(requests, 0);
  assert.equal(JSON.stringify(session), "{}");
  assert.doesNotMatch(JSON.stringify(session.getSnapshot()), /github_pat_/u);
});

test("authorization accepts fine-grained credentials explicitly and rejects classic or malformed values", () => {
  const session = createGitHubAuthorizationSession({ now: () => NOW });

  for (const value of ["", "ghp_classic_token_123456789012345", "github_pat_short", TEST_CREDENTIAL + " bad"]) {
    assert.throws(
      () => session.connect(value),
      (error) => error instanceof GitHubAuthorizationError
        && error.code === "invalid_credential"
    );
  }

  const status = session.connect(TEST_CREDENTIAL);

  assert.equal(status.status, GITHUB_AUTHORIZATION_STATUS.AUTHORIZED);
  assert.equal(status.connectedAt, NOW);
  assert.ok(session.isAuthorized());
  assert.doesNotMatch(JSON.stringify(status), new RegExp(TEST_CREDENTIAL, "u"));
});

test("session authorization is sent only as a Bearer header on safe GitHub repository GET requests", async () => {
  const calls = [];
  const session = createGitHubAuthorizationSession({
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      return response({});
    },
  });
  session.connect(TEST_CREDENTIAL);

  await session.request("https://api.github.com/repos/Carouan/private-project/pulls?state=open", {
    headers: { Accept: "application/vnd.github+json" },
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.credentials, "omit");
  assert.equal(calls[0].options.redirect, "error");
  assert.equal(calls[0].options.headers.Authorization, "Bearer " + TEST_CREDENTIAL);
  assert.equal(calls[0].url.includes(TEST_CREDENTIAL), false);
  assert.equal("body" in calls[0].options, false);
});

test("private authorization refuses other origins, redirects, credentials, path escapes and token queries", async () => {
  let calls = 0;
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { calls += 1; return response({}); },
  });
  session.connect(TEST_CREDENTIAL);

  for (const destination of [
    "https://evil.example/repos/Carouan/private-project",
    "https://api.github.com.evil.example/repos/Carouan/private-project",
    "http://api.github.com/repos/Carouan/private-project",
    "https://attacker@api.github.com/repos/Carouan/private-project",
    "https://api.github.com/user",
    "https://api.github.com/repos/Carouan/private%2Fproject",
    "https://api.github.com/repos/Carouan/private-project?access_token=leak",
    "https://api.github.com/repos/Carouan/private-project#leak",
  ]) {
    await assert.rejects(
      session.request(destination),
      (error) => error.code === "unsafe_destination"
    );
  }

  assert.equal(calls, 0);
});

test("private authorization refuses every mutation method and every request body", async () => {
  let calls = 0;
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { calls += 1; return response({}); },
  });
  session.connect(TEST_CREDENTIAL);

  for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
    await assert.rejects(
      session.request("https://api.github.com/repos/Carouan/private-project", { method }),
      (error) => error.code === "unsafe_method"
    );
  }

  await assert.rejects(
    session.request("https://api.github.com/repos/Carouan/private-project", { body: "write" }),
    (error) => error.code === "unsafe_method"
  );
  assert.equal(calls, 0);
});

test("network failures never repeat sensitive underlying error text", async () => {
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { throw new Error("Underlying failure " + TEST_CREDENTIAL); },
  });
  session.connect(TEST_CREDENTIAL);

  await assert.rejects(
    session.request("https://api.github.com/repos/Carouan/private-project"),
    (error) => {
      assert.equal(error.code, "network");
      assert.equal(error.message.includes(TEST_CREDENTIAL), false);
      assert.equal(JSON.stringify(error).includes(TEST_CREDENTIAL), false);
      return true;
    }
  );
});

test("a GitHub 401 immediately clears the credential and reports an expired session", async () => {
  let requests = 0;
  const changes = [];
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { requests += 1; return response({}, { status: 401 }); },
  });
  session.subscribe((state) => changes.push(state.status));
  session.connect(TEST_CREDENTIAL);

  await assert.rejects(
    session.request("https://api.github.com/repos/Carouan/private-project"),
    (error) => error.code === "authorization_expired"
  );
  assert.equal(session.getSnapshot().status, GITHUB_AUTHORIZATION_STATUS.EXPIRED);
  assert.equal(session.isAuthorized(), false);
  assert.deepEqual(changes, ["authorized", "expired"]);

  await assert.rejects(
    session.request("https://api.github.com/repos/Carouan/private-project"),
    (error) => error.code === "authorization_expired"
  );
  assert.equal(requests, 1);
});

test("disconnect and unsubscribe remove access without exposing the previous credential", async () => {
  const changes = [];
  const session = createGitHubAuthorizationSession();
  const unsubscribe = session.subscribe((state) => changes.push(state.status));
  session.connect(TEST_CREDENTIAL);
  session.disconnect();

  assert.equal(session.getSnapshot().status, "disconnected");
  assert.equal(session.isAuthorized(), false);
  assert.deepEqual(changes, ["authorized", "disconnected"]);
  await assert.rejects(
    session.request("https://api.github.com/repos/Carouan/private-project"),
    (error) => error.code === "authorization_required"
  );

  unsubscribe();
  session.connect(TEST_CREDENTIAL);
  assert.deepEqual(changes, ["authorized", "disconnected"]);
});

test("private GitHub repositories remain unreadable until explicitly authorized", async () => {
  let calls = 0;
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { calls += 1; return response({}); },
  });
  const provider = createGitHubRepositoryProvider({ authorizationSession: session });

  await assert.rejects(
    provider.readRepository(PRIVATE_REPOSITORY),
    (error) => error.code === "authorization_required"
  );
  assert.equal(calls, 0);
});

test("authorized private repositories expose read-only roadmap and PR facts without credential leakage", async () => {
  const calls = [];
  const session = createGitHubAuthorizationSession({ fetchImpl: privateFetch(calls) });
  session.connect(TEST_CREDENTIAL);
  const provider = createGitHubRepositoryProvider({ authorizationSession: session });
  const snapshot = await provider.readRepository(PRIVATE_REPOSITORY);

  assert.equal(snapshot.repository.fullName, PRIVATE_REPOSITORY.fullName);
  assert.equal(snapshot.repository.visibility, "private");
  assert.equal(snapshot.roadmap.percent, 50);
  assert.deepEqual(snapshot.openPullRequests, []);
  assert.equal(JSON.stringify(snapshot).includes(TEST_CREDENTIAL), false);
  assert.equal(calls.length, 3);
  assert.ok(calls.every(({ options }) => options.method === "GET"));
  assert.ok(calls.every(({ options }) => options.headers.Authorization === "Bearer " + TEST_CREDENTIAL));
});

test("public repositories never receive an active private session credential", async () => {
  const calls = [];
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => { throw new Error("Private transport must not be used"); },
  });
  session.connect(TEST_CREDENTIAL);

  const provider = createGitHubRepositoryProvider({
    authorizationSession: session,
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith("/repos/Carouan/public-project")) {
        return response({
          id: 1,
          full_name: "Carouan/public-project",
          name: "public-project",
          owner: { login: "Carouan" },
          html_url: "https://github.com/Carouan/public-project",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }
      if (url.includes("/pulls?")) return response([]);
      return response({}, { status: 404 });
    },
  });

  const snapshot = await provider.readRepository({
    provider: "github",
    fullName: "Carouan/public-project",
    visibility: "public",
  });

  assert.equal(snapshot.repository.visibility, "public");
  assert.ok(calls.length >= 3);
  assert.ok(calls.every(({ options }) => !("Authorization" in options.headers)));
});

test("private authorization expiry reaches the repository adapter without secret-bearing errors", async () => {
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => response({}, { status: 401 }),
  });
  session.connect(TEST_CREDENTIAL);
  const provider = createGitHubRepositoryProvider({ authorizationSession: session });

  await assert.rejects(
    provider.readRepository(PRIVATE_REPOSITORY),
    (error) => {
      assert.equal(error.code, "authorization_expired");
      assert.equal(JSON.stringify(error).includes(TEST_CREDENTIAL), false);
      return true;
    }
  );
  assert.equal(session.isAuthorized(), false);
});

test("insufficient private permissions fail safely without claiming repository access", async () => {
  const session = createGitHubAuthorizationSession({
    fetchImpl: async () => response({}, { status: 403 }),
  });
  session.connect(TEST_CREDENTIAL);

  await assert.rejects(
    createGitHubRepositoryProvider({ authorizationSession: session })
      .readRepository(PRIVATE_REPOSITORY),
    (error) => error.code === "forbidden" && error.details.status === 403
  );
  assert.equal(session.isAuthorized(), true);
});

test("private repository snapshots use a volatile cache and never touch the persistent public cache", async () => {
  let persistentCalls = 0;
  let providerCalls = 0;
  const session = createGitHubAuthorizationSession();
  session.connect(TEST_CREDENTIAL);
  const privateCache = createMemoryRepositorySnapshotCache();
  const service = createRepositorySnapshotService({
    authorizationSession: session,
    cache: {
      async get() { persistentCalls += 1; return null; },
      async set() { persistentCalls += 1; },
    },
    privateCache,
    providerRegistry: createRepositoryProviderRegistry([{
      id: "github",
      async readRepository() {
        providerCalls += 1;
        return { provider: "github", repository: { fullName: PRIVATE_REPOSITORY.fullName } };
      },
    }]),
    now: () => Date.parse(NOW),
  });

  const first = await service.read(PRIVATE_REPOSITORY);
  const second = await service.read(PRIVATE_REPOSITORY);

  assert.equal(first.source, "network");
  assert.equal(second.source, "cache");
  assert.equal(providerCalls, 1);
  assert.equal(persistentCalls, 0);
  assert.equal(JSON.stringify(first).includes(TEST_CREDENTIAL), false);
});

test("revoked authorization clears private cache and never returns a previously cached private snapshot", async () => {
  const key = repositorySnapshotCacheKey(PRIVATE_REPOSITORY);
  const cachedSnapshot = { provider: "github", repository: { fullName: PRIVATE_REPOSITORY.fullName } };
  const privateCache = createMemoryRepositorySnapshotCache({
    [key]: { fetchedAt: NOW, snapshot: cachedSnapshot },
  });
  const session = createGitHubAuthorizationSession();
  session.connect(TEST_CREDENTIAL);
  session.disconnect();
  let providerCalls = 0;

  const service = createRepositorySnapshotService({
    authorizationSession: session,
    privateCache,
    providerRegistry: createRepositoryProviderRegistry([{
      id: "github",
      async readRepository() { providerCalls += 1; return cachedSnapshot; },
    }]),
    now: () => Date.parse(NOW),
  });
  const result = await service.read(PRIVATE_REPOSITORY);

  assert.equal(result.status, REPOSITORY_SNAPSHOT_STATUS.UNAUTHORIZED);
  assert.equal(result.error.code, "authorization_required");
  assert.equal(result.snapshot, null);
  assert.equal(await privateCache.get(key), null);
  assert.equal(providerCalls, 0);
});

test("an authorized private snapshot may be shown offline only within the current session", async () => {
  const key = repositorySnapshotCacheKey(PRIVATE_REPOSITORY);
  const snapshot = { provider: "github", repository: { fullName: PRIVATE_REPOSITORY.fullName } };
  const privateCache = createMemoryRepositorySnapshotCache({
    [key]: { fetchedAt: NOW, snapshot },
  });
  const session = createGitHubAuthorizationSession();
  session.connect(TEST_CREDENTIAL);
  const service = createRepositorySnapshotService({
    authorizationSession: session,
    privateCache,
    isOnline: () => false,
    now: () => Date.parse(NOW),
  });

  const authorized = await service.read(PRIVATE_REPOSITORY);
  assert.equal(authorized.status, REPOSITORY_SNAPSHOT_STATUS.STALE);
  assert.deepEqual(authorized.snapshot, snapshot);

  session.disconnect();
  const disconnected = await service.read(PRIVATE_REPOSITORY);
  assert.equal(disconnected.status, REPOSITORY_SNAPSHOT_STATUS.UNAUTHORIZED);
  assert.equal(disconnected.snapshot, null);
});

test("session credentials never enter project JSON, global backups, Markdown or authorization status", () => {
  const session = createGitHubAuthorizationSession({ now: () => NOW });
  session.connect(TEST_CREDENTIAL);
  const project = createEmptyProject("local-owner");
  project.repository = { ...PRIVATE_REPOSITORY };
  const bundle = createProjectBundle([project], { exportedAt: NOW });

  for (const exported of [
    JSON.stringify(project),
    JSON.stringify(bundle),
    projectToMarkdown(project),
    JSON.stringify(session.getSnapshot()),
    JSON.stringify(session),
  ]) {
    assert.equal(exported.includes(TEST_CREDENTIAL), false);
  }
});
