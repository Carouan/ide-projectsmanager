import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { createReleaseArchive } from "../scripts/release/create-release-archive.mjs";

function createWorkspace(context) {
  const directory = mkdtempSync(path.join(os.tmpdir(), "ide-projectsmanager-release-"));
  context.after(() => rmSync(directory, { recursive: true, force: true }));

  const distDirectory = path.join(directory, "dist");
  const outputDirectory = path.join(directory, "release");
  mkdirSync(distDirectory, { recursive: true });
  writeFileSync(path.join(distDirectory, "index.html"), "<main>Application</main>");
  writeFileSync(path.join(distDirectory, "manifest.webmanifest"), "{}");

  return { directory, distDirectory, outputDirectory };
}

test("release archive includes the static application, guide and exact SHA-256", (context) => {
  const { distDirectory, outputDirectory } = createWorkspace(context);
  const result = createReleaseArchive({
    applicationName: "ide-projectsmanager",
    version: "1.0.0",
    distDirectory,
    outputDirectory,
  });
  const files = execFileSync("unzip", ["-Z", "-1", result.archivePath], {
    encoding: "utf8",
  }).split("\n");
  const expectedHash = createHash("sha256")
    .update(readFileSync(result.archivePath))
    .digest("hex");

  assert.equal(result.archiveName, "ide-projectsmanager-v1.0.0-web.zip");
  assert.ok(files.includes("index.html"));
  assert.ok(files.includes("manifest.webmanifest"));
  assert.ok(files.includes("INSTALLATION.md"));
  assert.equal(result.sha256, expectedHash);
  assert.equal(
    readFileSync(result.checksumPath, "utf8"),
    `${expectedHash}  ${result.archiveName}\n`
  );
});

test("release packaging rejects unsafe application identities and versions", (context) => {
  const { distDirectory, outputDirectory } = createWorkspace(context);

  assert.throws(
    () =>
      createReleaseArchive({
        applicationName: "../unsafe",
        version: "1.0.0",
        distDirectory,
        outputDirectory,
      }),
    /not safe/
  );
  assert.throws(
    () =>
      createReleaseArchive({
        applicationName: "ide-projectsmanager",
        version: "../../unsafe",
        distDirectory,
        outputDirectory,
      }),
    /not a supported release version/
  );
  assert.equal(existsSync(outputDirectory), false);
});

test("release packaging refuses an incomplete web build", (context) => {
  const { directory, outputDirectory } = createWorkspace(context);

  assert.throws(
    () =>
      createReleaseArchive({
        applicationName: "ide-projectsmanager",
        version: "1.0.0",
        distDirectory: path.join(directory, "missing-build"),
        outputDirectory,
      }),
    /Build the application/
  );
});
