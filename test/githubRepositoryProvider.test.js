import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import { createGitHubRepositoryProvider } from "../src/repositories/providers/githubRepositoryProvider.js";
import { RepositoryProviderError } from "../src/repositories/providers/repositoryProvider.js";

function jsonResponse(data, { status = 200, headers = {} } = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), String(value)])
  );

  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return normalizedHeaders.get(String(name).toLowerCase()) || null;
      },
    },
    async json() {
      return data;
    },
  };
}

function markdownResponse(markdown, path = "ROADMAP.md") {
  return jsonResponse({
    path,
    encoding: "base64",
    content: Buffer.from(markdown, "utf8").toString("base64"),
    html_url: `https://github.com/Carouan/ide-projectsmanager/blob/main/${path}`,
  });
}

test("GitHub provider returns a normalized public repository snapshot", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });

    if (url.endsWith("/repos/Carouan/ide-projectsmanager")) {
      return jsonResponse(
        {
          id: 42,
          full_name: "Carouan/ide-projectsmanager",
          name: "ide-projectsmanager",
          owner: { login: "Carouan" },
          html_url: "https://github.com/Carouan/ide-projectsmanager",
          visibility: "public",
          private: false,
          default_branch: "main",
          archived: false,
          fork: false,
          pushed_at: "2026-08-20T06:00:00Z",
        },
        { headers: { "x-ratelimit-remaining": "58" } }
      );
    }

    if (url.includes("/pulls?")) {
      return jsonResponse([
        {
          number: 72,
          title: "Define contract",
          html_url: "https://github.com/Carouan/ide-projectsmanager/pull/72",
          user: { login: "Carouan", type: "User" },
          draft: false,
          created_at: "2026-08-20T05:00:00Z",
          updated_at: "2026-08-20T06:00:00Z",
          head: { ref: "feature/contract", sha: "abc123" },
          base: { ref: "main" },
        },
      ]);
    }

    if (url.endsWith("/contents/ROADMAP.md")) {
      return markdownResponse([
        "# Roadmap",
        "- [ ] Portfolio cockpit",
        "  - [x] Delivered objective",
        "  - [ ] Remaining objective <!-- weight:3 -->",
      ].join("\n"));
    }

    if (url.endsWith("/pulls/72")) {
      return jsonResponse({ mergeable: true, mergeable_state: "clean" });
    }

    if (url.endsWith("/commits/abc123/status")) {
      return jsonResponse({
        state: "success",
        statuses: [
          {
            context: "build",
            state: "success",
            description: "Build passed",
            target_url: "https://github.com/example/check",
          },
        ],
      });
    }

    throw new Error(`Unexpected URL: ${url}`);
  };

  const provider = createGitHubRepositoryProvider({ fetchImpl });
  const snapshot = await provider.readRepository({
    provider: "github",
    fullName: "Carouan/ide-projectsmanager",
  });

  assert.equal(snapshot.provider, "github");
  assert.equal(snapshot.repository.defaultBranch, "main");
  assert.equal(snapshot.repository.visibility, "public");
  assert.equal(snapshot.lastActivityAt, "2026-08-20T06:00:00Z");
  assert.equal(snapshot.roadmap.percent, 25);
  assert.equal(snapshot.roadmap.completed, 1);
  assert.equal(snapshot.roadmap.total, 2);
  assert.equal(snapshot.roadmap.totalWeight, 4);
  assert.equal(snapshot.roadmap.sourcePath, "ROADMAP.md");
  assert.equal(snapshot.openPullRequests.length, 1);
  assert.deepEqual(snapshot.openPullRequests[0].statusSummary, {
    state: "success",
    total: 1,
    success: 1,
    pending: 0,
    failure: 0,
    contexts: [
      {
        context: "build",
        state: "success",
        description: "Build passed",
        url: "https://github.com/example/check",
      },
    ],
  });
  assert.equal(snapshot.openPullRequests[0].hasConflicts, false);
  assert.equal(snapshot.warnings.length, 0);
  assert.equal(calls.length, 5);

  for (const call of calls) {
    assert.equal(call.options.method, "GET");
    assert.equal(call.options.credentials, "omit");
    assert.equal("Authorization" in call.options.headers, false);
  }
});

test("GitHub provider keeps core PR data when optional enrichment fails", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/repos/owner/repo")) {
      return jsonResponse({
        id: 1,
        full_name: "owner/repo",
        name: "repo",
        owner: { login: "owner" },
        html_url: "https://github.com/owner/repo",
        visibility: "public",
        private: false,
        default_branch: "main",
      });
    }

    if (url.includes("/pulls?")) {
      return jsonResponse([
        {
          number: 1,
          title: "Draft",
          draft: true,
          user: { login: "bot", type: "Bot" },
          head: { ref: "draft", sha: "deadbeef" },
          base: { ref: "main" },
        },
      ]);
    }

    return jsonResponse({}, { status: 503 });
  };

  const snapshot = await createGitHubRepositoryProvider({ fetchImpl })
    .readRepository({ provider: "github", fullName: "owner/repo" });

  assert.equal(snapshot.openPullRequests[0].draft, true);
  assert.equal(snapshot.openPullRequests[0].readyForReview, false);
  assert.equal(snapshot.openPullRequests[0].mergeable, null);
  assert.equal(snapshot.openPullRequests[0].statusSummary, null);
  assert.deepEqual(
    snapshot.warnings.map((warning) => warning.capability).sort(),
    ["mergeability", "roadmap", "status"]
  );
  assert.equal(snapshot.roadmap, null);
});

test("GitHub provider reports public API rate limits deterministically", async () => {
  const provider = createGitHubRepositoryProvider({
    fetchImpl: async () =>
      jsonResponse(
        {},
        {
          status: 403,
          headers: {
            "x-ratelimit-remaining": "0",
            "x-ratelimit-reset": "1787200000",
          },
        }
      ),
  });

  await assert.rejects(
    provider.readRepository({ provider: "github", fullName: "owner/repo" }),
    (error) => {
      assert.ok(error instanceof RepositoryProviderError);
      assert.equal(error.code, "rate_limited");
      assert.equal(error.details.status, 403);
      assert.match(error.details.retryAt, /^2026-/);
      return true;
    }
  );
});

test("GitHub provider requires explicit session authorization for non-public repositories", async () => {
  let fetchCount = 0;
  const provider = createGitHubRepositoryProvider({
    fetchImpl: async () => {
      fetchCount += 1;
      return jsonResponse({});
    },
  });

  await assert.rejects(
    provider.readRepository({
      provider: "github",
      fullName: "owner/private-repo",
      visibility: "private",
    }),
    (error) => error.code === "authorization_required"
  );
  assert.equal(fetchCount, 0);
});

test("GitHub provider accepts a canonical GitHub URL when fullName is absent", async () => {
  const calls = [];
  const provider = createGitHubRepositoryProvider({
    fetchImpl: async (url) => {
      calls.push(url);

      if (url.endsWith("/repos/Carouan/ide-projectsmanager")) {
        return jsonResponse({
          id: 42,
          full_name: "Carouan/ide-projectsmanager",
          name: "ide-projectsmanager",
          owner: { login: "Carouan" },
          html_url: "https://github.com/Carouan/ide-projectsmanager",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }

      if (url.includes("/pulls?")) return jsonResponse([]);
      if (url.endsWith("/contents/ROADMAP.md")) {
        return jsonResponse({}, { status: 404 });
      }
      if (url.endsWith("/readme")) {
        return markdownResponse(
          "# Project\n## Roadmap\n- [x] Delivered\n- [ ] Planned",
          "README.md"
        );
      }
      throw new Error(`Unexpected URL: ${url}`);
    },
  });

  const snapshot = await provider.readRepository({
    provider: "github",
    url: "https://github.com/Carouan/ide-projectsmanager.git",
  });

  assert.equal(snapshot.repository.fullName, "Carouan/ide-projectsmanager");
  assert.equal(snapshot.roadmap.sourcePath, "README.md");
  assert.equal(snapshot.roadmap.percent, 50);
  assert.equal(calls.length, 4);
});

test("GitHub provider bounds optional PR enrichment to protect the public rate limit", async () => {
  const calls = [];
  const pullRequests = [1, 2, 3].map((number) => ({
    number,
    title: `PR ${number}`,
    draft: false,
    user: { login: "Carouan", type: "User" },
    head: { ref: `feature/${number}`, sha: `sha${number}` },
    base: { ref: "main" },
  }));
  const provider = createGitHubRepositoryProvider({
    maxPullRequests: 20,
    maxEnrichedPullRequests: 1,
    fetchImpl: async (url) => {
      calls.push(url);

      if (url.endsWith("/repos/owner/repo")) {
        return jsonResponse({
          id: 1,
          full_name: "owner/repo",
          name: "repo",
          owner: { login: "owner" },
          html_url: "https://github.com/owner/repo",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }
      if (url.includes("/pulls?")) return jsonResponse(pullRequests);
      if (url.endsWith("/contents/ROADMAP.md")) {
        return markdownResponse("- [x] Existing feature");
      }
      if (url.endsWith("/pulls/1")) {
        return jsonResponse({ mergeable: true, mergeable_state: "clean" });
      }
      if (url.endsWith("/commits/sha1/status")) {
        return jsonResponse({ state: "pending", statuses: [] });
      }
      throw new Error(`Unexpected enrichment request: ${url}`);
    },
  });

  const snapshot = await provider.readRepository({
    provider: "github",
    fullName: "owner/repo",
  });

  assert.deepEqual(snapshot.enrichment, {
    pullRequestsListed: 3,
    pullRequestsEnriched: 1,
  });
  assert.equal(snapshot.openPullRequests[0].mergeable, true);
  assert.equal(snapshot.openPullRequests[1].mergeable, null);
  assert.equal(snapshot.openPullRequests[2].statusSummary, null);
  assert.equal(calls.length, 5);
});

test("missing roadmap and README remain normal optional conditions", async () => {
  const provider = createGitHubRepositoryProvider({
    fetchImpl: async (url) => {
      if (url.endsWith("/repos/owner/repo")) {
        return jsonResponse({
          id: 1,
          full_name: "owner/repo",
          name: "repo",
          owner: { login: "owner" },
          html_url: "https://github.com/owner/repo",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }
      if (url.includes("/pulls?")) return jsonResponse([]);
      return jsonResponse({}, { status: 404 });
    },
  });

  const snapshot = await provider.readRepository({
    provider: "github",
    fullName: "owner/repo",
  });

  assert.equal(snapshot.roadmap, null);
  assert.deepEqual(snapshot.warnings, []);
  assert.deepEqual(snapshot.openPullRequests, []);
});

test("a README without a roadmap section never invents project completion", async () => {
  const provider = createGitHubRepositoryProvider({
    fetchImpl: async (url) => {
      if (url.endsWith("/repos/owner/repo")) {
        return jsonResponse({
          id: 1,
          full_name: "owner/repo",
          name: "repo",
          owner: { login: "owner" },
          html_url: "https://github.com/owner/repo",
          visibility: "public",
          private: false,
          default_branch: "main",
        });
      }
      if (url.includes("/pulls?")) return jsonResponse([]);
      if (url.endsWith("/contents/ROADMAP.md")) {
        return jsonResponse({}, { status: 404 });
      }
      return markdownResponse("# Setup\n- [x] Install dependencies", "README.md");
    },
  });

  const snapshot = await provider.readRepository({
    provider: "github",
    fullName: "owner/repo",
  });

  assert.equal(snapshot.roadmap, null);
  assert.deepEqual(snapshot.warnings, []);
});
