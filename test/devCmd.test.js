import test from "node:test";
import assert from "node:assert/strict";

import {
  buildDevCmdIssueUrl,
  createDevCmdRequest,
  parseDevCmdRequest,
  serializeDevCmdRequest,
} from "../src/services/devCmd.js";

test("DEV-CMD v1 requests round-trip without losing routing fields", () => {
  const request = createDevCmdRequest({
    projectId: "mindspark",
    repositoryFullName: "Carouan/glom-visual-workspace",
    action: "fix",
    requestId: "req-42",
    version: "0.3.14",
    description: "Toolbar overlaps the canvas.",
  });

  const serialized = serializeDevCmdRequest(request);
  const parsed = parseDevCmdRequest(serialized);

  assert.equal(parsed.projectId, "mindspark");
  assert.equal(parsed.action, "FIX");
  assert.equal(parsed.requestId, "req-42");
  assert.equal(parsed.repositoryFullName, "Carouan/glom-visual-workspace");
  assert.equal(parsed.version, "0.3.14");
  assert.equal(parsed.description, "Toolbar overlaps the canvas.");
});

test("DEV-CMD issue links stay on github.com and prefill the dev-cmd label", () => {
  const url = new URL(buildDevCmdIssueUrl(
    "https://github.com/Carouan/glom-visual-workspace",
    {
      projectId: "mindspark",
      action: "ISSUE",
      requestId: "req-1",
      description: "Mobile feedback",
    }
  ));

  assert.equal(url.origin, "https://github.com");
  assert.equal(url.pathname, "/Carouan/glom-visual-workspace/issues/new");
  assert.equal(url.searchParams.get("labels"), "dev-cmd");
  assert.match(url.searchParams.get("title"), /mindspark/u);
  assert.match(url.searchParams.get("body"), /REQUEST-ID: req-1/u);
});

test("DEV-CMD rejects missing project routing", () => {
  assert.throws(() => createDevCmdRequest({ requestId: "req-1" }), TypeError);
  assert.equal(parseDevCmdRequest("normal mail"), null);
  assert.equal(buildDevCmdIssueUrl("https://example.com/repo", {
    projectId: "demo",
    requestId: "req-1",
  }), null);
});
