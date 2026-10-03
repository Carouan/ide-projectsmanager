import test from "node:test";
import assert from "node:assert/strict";
import {
  parseProjectManifest,
  renderProjectManifest,
} from "../src/services/projectManifest.js";

test("project manifest parses IDE, app and DEV-CMD settings", () => {
  const manifest = parseProjectManifest(`
version: 1
project:
  id: "mindspark"
  name: "MindSpark"
ide:
  enabled: true
app:
  type: "pwa"
  url: "https://example.test/app/"
feedback:
  enabled: true
  protocol: "dev-cmd-v1"
  transport: "github-issues"
  label: "dev-cmd"
`);

  assert.equal(manifest.version, 1);
  assert.equal(manifest.project.id, "mindspark");
  assert.equal(manifest.app.url, "https://example.test/app/");
  assert.equal(manifest.feedback.enabled, true);
  assert.equal(manifest.feedback.protocol, "dev-cmd-v1");
  assert.equal(manifest.feedback.label, "dev-cmd");
});

test("rendered project manifest round-trips through the parser", () => {
  const source = renderProjectManifest({
    projectId: "tec-widget",
    name: "TEC Widget",
    appUrl: "https://example.test/tec/",
  });
  const manifest = parseProjectManifest(source);

  assert.equal(manifest.project.id, "tec-widget");
  assert.equal(manifest.project.name, "TEC Widget");
  assert.equal(manifest.app.type, "pwa");
  assert.equal(manifest.app.url, "https://example.test/tec/");
  assert.equal(manifest.feedback.transport, "github-issues");
});

test("unsupported manifest versions are ignored", () => {
  assert.equal(parseProjectManifest("version: 99\nide:\n  enabled: true\n"), null);
});
