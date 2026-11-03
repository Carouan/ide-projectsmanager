#!/usr/bin/env node
/**
 * Reproducible, read-only-source M1 validation on synthetic JSONL and two
 * isolated Chromium contexts. Uses the local production build and browser.
 *
 * Prerequisites: npm run build; npm run test:e2e
 * Optional: IDE_TEST_CHROME=path/to/chrome.exe
 * No real file system source, user profile, GitHub connection or deployment.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const CHROME = process.env.IDE_TEST_CHROME || [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
].find((candidate) => existsSync(candidate));
const BASE = "http://127.0.0.1:5179/ide-projectsmanager/";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function fixtureProposal({ stale = false, tampered = false } = {}) {
  const sha = "1".repeat(64);
  const ref = createHash("sha256").update("2dbrain-local-proposal-v1:" + sha).digest("hex");
  return {
    format: "ide-2dbrain.reference-proposal.v1", version: 1,
    mode: "proposal_only", status: "pending",
    source: {
      provider: "local_personal", origin: "obsidian",
      ref: tampered ? "a".repeat(64) : ref,
      format: "markdown", size_bytes: 130, metadata_keys: ["tags", "title"],
    },
    classification: {
      category_id: "personal.ict.ai", kind: "knowledge", mapping_status: "mapped",
    },
    provenance: {
      source_sha256: sha, taxonomy_sha256: "2".repeat(64), taxonomy_version: "0.2.0",
      extracted_at: stale ? "2000-01-01T00:00:00Z" : new Date().toISOString(),
      identity_model: "content_sha256_not_ownership_proof",
    },
    target_project_id: null, relation: null, access_granted: false,
    import_ready: false, rag_eligible: false, ide_import_performed: false,
  };
}

async function eventually(assertion, label, maxAttempts = 60) {
  let latest;
  for (let i = 0; i < maxAttempts; i += 1) {
    try {
      const value = await assertion();
      if (value) return value;
    } catch (error) {
      latest = error;
    }
    await new Promise((done) => setTimeout(done, 150));
  }
  throw new Error("Timed out: " + label + (latest ? " (" + latest.message + ")" : ""));
}

async function readIndexedDbProjects(page) {
  return page.evaluate(async () => {
    const db = await new Promise((res, rej) => {
      const request = indexedDB.open("ide-projet-personnel", 2);
      request.onsuccess = () => res(request.result);
      request.onerror = () => rej(request.error);
    });
    try {
      return await new Promise((res, rej) => {
        const request = db.transaction("project_storage", "readonly")
          .objectStore("project_storage").get("projects");
        request.onsuccess = () => res(request.result || []);
        request.onerror = () => rej(request.error);
      });
    } finally { db.close(); }
  });
}

async function selectJsonl(page, value) {
  const raw = typeof value === "string" ? value : JSON.stringify(value) + "\n";
  await page.locator("input[accept^='.jsonl']").setInputFiles({
    name: "synthetic-proposal.jsonl", mimeType: "application/json",
    buffer: Buffer.from(raw, "utf8"),
  });
}

async function previewAndSelect(page, proposal, projectId) {
  await selectJsonl(page, proposal);
  await page.getByText("Proposition contrôlée").waitFor();
  await page.getByLabel(/Projet IDE existant/).selectOption(projectId);
  await page.getByText(/Aperçu destiné/).waitFor();
}

async function confirm(page, relation = "research") {
  await page.getByLabel(/Type de relation/).selectOption(relation);
  await page.getByLabel(/Je confirme ce lien/).check();
  await page.getByRole("button", { name: "Confirmer et enregistrer ce lien" }).click();
}

async function openAttachments(page) {
  await page.getByRole("button", { name: "Pièces jointes" }).click();
  await page.getByRole("heading", { name: "Références 2dBrain" }).waitFor();
}

function references(project) {
  return (project?.attachments || []).filter((item) =>
    item.type === "file_ref" && item.content?.includes("ide-2dbrain.approved-reference.v1"));
}

async function waitForStoredReference(page, count) {
  return eventually(async () => {
    const records = await readIndexedDbProjects(page);
    return records.length > 0 && references(records[0]).length === count ? records : null;
  }, "IndexedDB reference count " + count);
}

async function main() {
  if (!CHROME || !existsSync(CHROME)) throw new Error("Chromium/Chrome is unavailable; set IDE_TEST_CHROME");
  if (!existsSync(resolve(ROOT, "dist/index.html"))) throw new Error("Run npm run build first");
  const vite = spawn(process.execPath,
    [resolve(ROOT, "node_modules/vite/bin/vite.js"), "preview",
      "--host", "127.0.0.1", "--port", "5179", "--strictPort"],
    { cwd: ROOT, stdio: ["ignore", "pipe", "pipe"], windowsHide: true });
  let serverErrors = "";
  vite.stderr.on("data", (bytes) => { serverErrors += String(bytes).slice(0, 1000); });
  let browser;
  try {
    await eventually(async () => {
      if (vite.exitCode !== null) throw new Error("Vite preview failed: " + serverErrors);
      try { return (await fetch(BASE)).ok; } catch { return false; }
    }, "Vite preview started");
    browser = await chromium.launch({
      executablePath: CHROME, headless: true,
      args: ["--disable-extensions", "--disable-background-networking"],
    });
    const contextOptions = { acceptDownloads: true, serviceWorkers: "block" };
    const first = await browser.newContext(contextOptions);
    const second = await browser.newContext(contextOptions);
    for (const context of [first, second]) {
      await context.route("**/*", (route) => {
        const address = new URL(route.request().url());
        if (address.hostname === "127.0.0.1") return route.continue();
        return route.abort();
      });
    }
    const page = await first.newPage();
    await page.goto(BASE);
    await page.getByRole("button", { name: "Nouveau projet" }).first().click();
    await openAttachments(page);
    const initial = await eventually(async () => {
      const records = await readIndexedDbProjects(page);
      return records.length === 1 ? records : null;
    }, "new project saved");
    const projectId = initial[0].project.id;
    assert.match(projectId, UUID);
    assert.equal(references(initial[0]).length, 0);

    // Failed previews and cancellation do not touch any stored project.
    await selectJsonl(page, "{malformed");
    await page.getByRole("alert").getByText(/JSON valide/).waitFor();
    await selectJsonl(page, fixtureProposal({ tampered: true }));
    await page.getByRole("alert").getByText(/Empreinte ou provenance/).waitFor();
    await previewAndSelect(page, fixtureProposal(), projectId);
    await page.getByRole("button", { name: "Effacer cet aperçu" }).click();
    assert.equal(JSON.stringify(await readIndexedDbProjects(page)), JSON.stringify(initial));

    // Expired proposals are inspected but never approved.
    await previewAndSelect(page, fixtureProposal({ stale: true }), projectId);
    await confirm(page);
    await page.getByRole("alert").getByText(/périmée/).waitFor();
    assert.equal(JSON.stringify(await readIndexedDbProjects(page)), JSON.stringify(initial));

    // Explicit approval and double click: one record only, same source hash.
    await previewAndSelect(page, fixtureProposal(), projectId);
    await confirm(page);
    await page.getByText("Référence 2dBrain approuvée").waitFor();
    const saved = await waitForStoredReference(page, 1);
    const approved = JSON.parse(references(saved[0])[0].content);
    assert.equal(approved.status, "approved");
    assert.equal(approved.provenance.source_sha256, "1".repeat(64));
    assert.equal(approved.relation, "research");
    assert.equal(approved.source.ref, fixtureProposal().source.ref);
    await page.getByRole("button", { name: "Confirmer et enregistrer ce lien" }).click();
    await page.getByText(/Aucun doublon ajouté/).waitFor();
    assert.equal(references((await readIndexedDbProjects(page))[0]).length, 1);

    // Reload the same isolated user profile: durable IndexedDB linkage.
    await page.reload();
    await page.getByRole("button", { name: "Ouvrir" }).first().click();
    await openAttachments(page);
    await page.getByText("Référence 2dBrain approuvée").waitFor();
    assert.equal(references((await readIndexedDbProjects(page))[0]).length, 1);

    // Existing global JSON v1 backup, not a new export contract.
    await page.getByRole("button", { name: "Paramètres" }).first().click();
    const downloadEvent = page.waitForEvent("download");
    await page.getByRole("button", { name: "Télécharger la sauvegarde complète" }).click();
    const download = await downloadEvent;
    const bundle = JSON.parse(await readFile(await download.path(), "utf8"));
    assert.equal(bundle.format, "ide-projectsmanager.project-bundle");
    assert.equal(bundle.version, 1);
    assert.equal(bundle.projectCount, 1);
    assert.equal(JSON.parse(references(bundle.projects[0])[0].content).source.ref,
      approved.source.ref);

    // Restore into a SECOND browser context with empty independent IndexedDB.
    const pageCopy = await second.newPage();
    await pageCopy.goto(BASE);
    await pageCopy.getByRole("button", { name: "Paramètres" }).click();
    const upload = pageCopy.locator(".settings-restore-panel input[type=file]");
    const snapshotBuffer = Buffer.from(JSON.stringify(bundle));
    await upload.setInputFiles({
      name: "synthetic-portfolio-v1.json", mimeType: "application/json",
      buffer: snapshotBuffer,
    });
    await pageCopy.getByText("Aperçu de la restauration").waitFor();
    assert.equal((await readIndexedDbProjects(pageCopy)).length, 0);
    await pageCopy.getByRole("button", { name: "Appliquer la restauration" }).click();
    await pageCopy.getByText(/Restauration terminée/).waitFor();
    await eventually(async () => {
      const entries = await readIndexedDbProjects(pageCopy);
      return entries.length === 1 && references(entries[0]).length === 1;
    }, "restoration on isolated copy");
    await pageCopy.reload();
    const restored = await readIndexedDbProjects(pageCopy);
    assert.equal(restored.length, 1);
    assert.equal(JSON.parse(references(restored[0])[0].content).source.ref,
      approved.source.ref);

    // Same bundle as copy: preserve both projects and source provenance.
    await pageCopy.getByRole("button", { name: "Paramètres" }).click();
    await upload.setInputFiles({
      name: "synthetic-portfolio-v1.json", mimeType: "application/json",
      buffer: snapshotBuffer,
    });
    await pageCopy.getByText("Aperçu de la restauration").waitFor();
    await pageCopy.getByLabel(/Importer comme copies/).check();
    await pageCopy.getByRole("button", { name: "Appliquer la restauration" }).click();
    await pageCopy.getByText(/Restauration terminée/).waitFor();
    const two = await eventually(async () => {
      const entries = await readIndexedDbProjects(pageCopy);
      return entries.length === 2 ? entries : null;
    }, "restore-as-copy");
    assert.notEqual(two[0].project.id, two[1].project.id);
    for (const entry of two) {
      assert.equal(JSON.parse(references(entry)[0].content).source.ref, approved.source.ref);
    }

    process.stdout.write("D1_BROWSER_OK: isolated Chrome, malformed/tampered/stale/cancelled, approval, duplicate, reload, JSON v1 export and isolated restore/copy.\n");
  } finally {
    if (browser) await browser.close();
    if (vite.exitCode === null) vite.kill();
  }
}

await main();
