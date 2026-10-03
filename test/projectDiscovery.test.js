import test from "node:test";
import assert from "node:assert/strict";
import { Buffer } from "node:buffer";

import {
  createGitHubProjectDiscoveryProvider,
  deriveGitHubPagesUrl,
  normalizeIdeProjectManifest,
} from "../src/services/projectDiscovery.js";

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return data;
    },
  };
}

test("GitHub Pages URLs are derived only for repositories that publish Pages", () => {
  assert.equal(
    deriveGitHubPagesUrl({ owner: { login: "Carouan" }, name: "TEC_Widget", has_pages: true }),
    "https://Carouan.github.io/TEC_Widget/"
  );
  assert.equal(
    deriveGitHubPagesUrl({ owner: { login: "Carouan" }, name: "private-tool", has_pages: false }),
    null
  );
});

test("manifest normalization keeps explicit app and feedback routing", () => {
  const manifest = normalizeIdeProjectManifest({
    schemaVersion: 1,
    projectId: "mindspark",
    name: "MindSpark",
    ide: { enabled: true, autoImport: true },
    app: { type: "pwa", url: "https://carouan.github.io/glom-visual-workspace/" },
    feedback: { protocol: "dev-cmd-v1", transport: "github-issues" },
  }, {
    full_name: "Carouan/glom-visual-workspace",
    name: "glom-visual-workspace",
  });

  assert.equal(manifest.projectId, "mindspark");
  assert.equal(manifest.app.type, "pwa");
  assert.equal(manifest.ide.autoImport, true);
  assert.equal(manifest.feedback.protocol, "dev-cmd-v1");
});

test("discovery imports manifest-enabled repositories and topic-only repositories", async () => {
  const manifest = {
    schemaVersion: 1,
    projectId: "mindspark",
    name: "MindSpark",
    summary: "Visual workshop",
    ide: { enabled: true, autoImport: true },
    app: { type: "pwa", url: "https://carouan.github.io/glom-visual-workspace/" },
  };
  const repositories = [
    {
      full_name: "Carouan/glom-visual-workspace",
      name: "glom-visual-workspace",
      owner: { login: "Carouan" },
      html_url: "https://github.com/Carouan/glom-visual-workspace",
      visibility: "public",
      private: false,
      default_branch: "main",
      topics: [],
      has_pages: true,
    },
    {
      full_name: "Carouan/TEC_Widget",
      name: "TEC_Widget",
      owner: { login: "Carouan" },
      html_url: "https://github.com/Carouan/TEC_Widget",
      visibility: "public",
      private: false,
      default_branch: "main",
      topics: ["ide-project"],
      has_pages: true,
    },
    {
      full_name: "Carouan/archive",
      name: "archive",
      owner: { login: "Carouan" },
      html_url: "https://github.com/Carouan/archive",
      visibility: "public",
      private: false,
      default_branch: "main",
      topics: [],
      has_pages: false,
    },
  ];
  const calls = [];
  const provider = createGitHubProjectDiscoveryProvider({
    fetchImpl: async (url) => {
      calls.push(url);
      if (url.includes("/search/repositories?")) {
        return response({ items: repositories });
      }
      if (url.includes("/glom-visual-workspace/contents/.ide-project.json")) {
        return response({
          encoding: "base64",
          content: Buffer.from(JSON.stringify(manifest), "utf8").toString("base64"),
        });
      }
      return response({}, 404);
    },
    now: () => Date.parse("2026-10-03T08:00:00Z"),
  });

  const result = await provider.discover({ owner: "Carouan" });

  assert.deepEqual(
    result.candidates.map((candidate) => candidate.repository.fullName),
    ["Carouan/glom-visual-workspace", "Carouan/TEC_Widget"]
  );
  assert.equal(result.candidates[0].repository.appUrl, manifest.app.url);
  assert.equal(result.candidates[1].repository.appUrl, "https://Carouan.github.io/TEC_Widget/");
  assert.equal(result.warnings.length, 0);
  assert.equal(calls.length, 4);
});
