import assert from "node:assert/strict";
import test from "node:test";

import {
  createProjectBundle,
  PROJECT_BUNDLE_FORMAT,
  PROJECT_BUNDLE_VERSION,
} from "../src/services/jsonTransfer.js";

test("createProjectBundle wraps every project in a versioned JSON document", () => {
  const projects = [
    { project: { id: "project-1", title: "Premier projet" } },
    { project: { id: "project-2", title: "Second projet" } },
  ];
  const exportedAt = "2026-08-20T10:00:00.000Z";

  const bundle = createProjectBundle(projects, { exportedAt });

  assert.deepEqual(bundle, {
    format: PROJECT_BUNDLE_FORMAT,
    version: PROJECT_BUNDLE_VERSION,
    exportedAt,
    projectCount: 2,
    projects,
  });
  assert.deepEqual(JSON.parse(JSON.stringify(bundle)), bundle);
});

test("createProjectBundle safely exports an empty project list", () => {
  const bundle = createProjectBundle(null, {
    exportedAt: "2026-08-20T10:00:00.000Z",
  });

  assert.equal(bundle.projectCount, 0);
  assert.deepEqual(bundle.projects, []);
});
