import test from "node:test";
import assert from "node:assert/strict";

import { getProjectLaunchLinks } from "../src/services/projectLaunchLinks.js";

test("project launch links expose repository, Pages, issues, PRs and DEV-CMD", () => {
  const links = getProjectLaunchLinks({
    project: { id: "local-id" },
    repository: {
      fullName: "Carouan/glom-visual-workspace",
      url: "https://github.com/Carouan/glom-visual-workspace",
      externalProjectId: "mindspark",
      appUrl: "https://carouan.github.io/glom-visual-workspace/",
      feedbackProtocol: "dev-cmd-v1",
      feedbackTransport: "github-issues",
    },
  }, { requestIdFactory: () => "req-42" });

  assert.equal(links.repository, "https://github.com/Carouan/glom-visual-workspace");
  assert.equal(links.app, "https://carouan.github.io/glom-visual-workspace/");
  assert.equal(links.issues, "https://github.com/Carouan/glom-visual-workspace/issues");
  assert.equal(links.pullRequests, "https://github.com/Carouan/glom-visual-workspace/pulls");
  assert.match(links.feedback, /labels=dev-cmd/u);
  assert.match(decodeURIComponent(links.feedback), /REQUEST-ID: req-42/u);
});

test("local projects do not invent launch links", () => {
  assert.deepEqual(getProjectLaunchLinks({ project: { id: "local" } }), {
    repository: null,
    app: null,
    issues: null,
    pullRequests: null,
    feedback: null,
  });
});
