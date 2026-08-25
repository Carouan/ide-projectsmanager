import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../../", import.meta.url));
const defaultGuide = path.join(repositoryRoot, "docs/releases/INSTALLATION.md");

export function createReleaseArchive({
  applicationName,
  version,
  distDirectory,
  outputDirectory,
  installationGuide = defaultGuide,
}) {
  if (!/^[a-z0-9][a-z0-9._-]*$/.test(applicationName ?? "")) {
    throw new Error("The application name is not safe for a release archive.");
  }

  if (!/^\d+\.\d+\.\d+(?:-[a-z\d][a-z\d.-]*)?$/i.test(version ?? "")) {
    throw new Error("The application version is not a supported release version.");
  }

  if (!existsSync(path.join(distDirectory, "index.html"))) {
    throw new Error("Build the application before creating its release archive.");
  }

  if (!existsSync(path.join(distDirectory, "manifest.webmanifest"))) {
    throw new Error("The build is missing its installable PWA manifest.");
  }

  if (!existsSync(installationGuide)) {
    throw new Error("The release installation guide is missing.");
  }

  mkdirSync(outputDirectory, { recursive: true });
  const archiveName = `${applicationName}-v${version}-web.zip`;
  const archivePath = path.resolve(outputDirectory, archiveName);
  const checksumPath = `${archivePath}.sha256`;

  if (existsSync(archivePath)) {
    unlinkSync(archivePath);
  }

  execFileSync("zip", ["-q", "-r", archivePath, "."], {
    cwd: distDirectory,
  });
  execFileSync("zip", ["-q", "-j", archivePath, installationGuide]);

  const archive = readFileSync(archivePath);
  const sha256 = createHash("sha256").update(archive).digest("hex");
  writeFileSync(checksumPath, `${sha256}  ${archiveName}\n`, "utf8");

  return {
    archiveName,
    archivePath,
    checksumPath,
    sha256,
    size: archive.byteLength,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const metadata = JSON.parse(
    readFileSync(path.join(repositoryRoot, "package.json"), "utf8")
  );
  const result = createReleaseArchive({
    applicationName: metadata.name,
    version: metadata.version,
    distDirectory: path.join(repositoryRoot, "dist"),
    outputDirectory: path.join(repositoryRoot, "release"),
  });

  process.stdout.write(`Created ${result.archiveName} (${result.size} bytes).\n`);
  process.stdout.write(`SHA-256: ${result.sha256}\n`);
}
