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
import { createHash, randomUUID } from "node:crypto";
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
const RECOVERY_KEY = "ide-projet-personnel.projects-recovery-v1";
const CANCELLED_KEY = "ide-projet-personnel.cancelled-reference-writes-v1";

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

// Fault injection lives solely in an ephemeral Chromium context. It aborts
// actual project-store transactions, rather than mocking the IDE repository.
// A delayed oncomplete simulates a slow durability acknowledgement *after*
// Chrome has committed the transaction, exposing cancellation/rollback races.
async function newFaultContext(browser, contextOptions) {
  const context = await browser.newContext(contextOptions);
  await context.route("**/*", (route) => {
    const address = new URL(route.request().url());
    return address.hostname === "127.0.0.1" ? route.continue() : route.abort();
  });
  await context.addInitScript(() => {
    const defaults = { failIdbWrites: false, failFallbackWrites: false,
      delayNextWriteMs: 0, delayStarted: false };
    const saved = JSON.parse(sessionStorage.getItem("__ideFaults") || "{}");
    window.__ideFaults = { ...defaults, ...saved, delayStarted: false };
    const nativeTransaction = IDBDatabase.prototype.transaction;
    IDBDatabase.prototype.transaction = function (...args) {
      const tx = nativeTransaction.apply(this, args);
      if (this.name !== "ide-projet-personnel" || args[0] !== "project_storage"
          || args[1] !== "readwrite") return tx;
      const faults = window.__ideFaults;
      if (faults.failIdbWrites) {
        queueMicrotask(() => { try { tx.abort(); } catch { /* already completed */ } });
      }
      if (faults.delayNextWriteMs > 0) {
        const delay = faults.delayNextWriteMs;
        faults.delayNextWriteMs = 0;
        let handler;
        Object.defineProperty(tx, "oncomplete", {
          configurable: true,
          get: () => handler,
          set: (callback) => {
            handler = callback;
            tx.addEventListener("complete", (event) => {
              faults.delayStarted = true;
              setTimeout(() => callback.call(tx, event), delay);
            }, { once: true });
          },
        });
      }
      return tx;
    };
    const nativeSetItem = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === "ide-projet-personnel.projects-recovery-v1"
          && window.__ideFaults.failFallbackWrites) {
        throw new DOMException("Synthetic recovery quota exceeded", "QuotaExceededError");
      }
      return nativeSetItem.call(this, key, value);
    };
  });
  return context;
}

async function setFaults(page, patch) {
  await page.evaluate((next) => {
    Object.assign(window.__ideFaults, next);
    sessionStorage.setItem("__ideFaults", JSON.stringify(window.__ideFaults));
  }, patch);
}

async function createFixtureProject(page) {
  await page.goto(BASE);
  await page.getByRole("button", { name: "Nouveau projet" }).first().click();
  await openAttachments(page);
  const saved = await eventually(async () => {
    const entries = await readIndexedDbProjects(page);
    return entries.length === 1 ? entries : null;
  }, "fixture project committed to IndexedDB");
  return saved[0].project.id;
}

async function readRecoveryState(page) {
  return page.evaluate(({ recoveryKey, cancelledKey }) => ({
    recovery: JSON.parse(localStorage.getItem(recoveryKey) || "null"),
    cancelled: JSON.parse(localStorage.getItem(cancelledKey) || "[]"),
  }), { recoveryKey: RECOVERY_KEY, cancelledKey: CANCELLED_KEY });
}

async function exportBundle(page) {
  await page.getByRole("button", { name: "Paramètres" }).first().click();
  const downloadEvent = page.waitForEvent("download");
  await page.getByRole("button", { name: "Télécharger la sauvegarde complète" }).click();
  return JSON.parse(await readFile(await (await downloadEvent).path(), "utf8"));
}

async function restoreBundle(page, bundle) {
  await page.goto(BASE);
  await page.getByRole("button", { name: "Paramètres" }).click();
  await page.locator(".settings-restore-panel input[type=file]").setInputFiles({
    name: "recovered-synthetic-v1.json", mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(bundle)),
  });
  await page.getByText("Aperçu de la restauration").waitFor();
  await page.getByRole("button", { name: "Appliquer la restauration" }).click();
  await page.getByText(/Restauration terminée/).waitFor();
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
    await page.getByText(/Référence enregistrée dans les pièces jointes/).waitFor();
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

    // Import compromised and incomplete v1 attachments as untouched raw records
    // on the isolated copy. They must NEVER render as approved, and a new
    // approval must fail closed instead of silently overwriting them.
    const makeDamagedProject = (title, mutator) => {
      const copied = structuredClone(bundle.projects[0]);
      copied.project.id = randomUUID();
      copied.project.title = title;
      const link = references(copied)[0];
      link.content = JSON.stringify(mutator(JSON.parse(link.content)));
      return copied;
    };
    const damaged = makeDamagedProject("Fixture incohérente", (reference) => ({
      ...reference,
      provenance: { ...reference.provenance, source_sha256: "f".repeat(64) },
    }));
    const incomplete = makeDamagedProject("Fixture historique incomplète", (reference) => {
      const copy = { ...reference };
      delete copy.provenance;
      return copy;
    });
    const damagedBundle = {
      ...bundle, projects: [damaged, incomplete], projectCount: 2,
    };
    await upload.setInputFiles({
      name: "synthetic-damaged-reference-v1.json", mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(damagedBundle), "utf8"),
    });
    await pageCopy.getByText("Aperçu de la restauration").waitFor();
    await pageCopy.getByRole("button", { name: "Appliquer la restauration" }).click();
    await pageCopy.getByText(/Restauration terminée/).waitFor();
    await eventually(async () => {
      const all = await readIndexedDbProjects(pageCopy);
      return all.length === 4 ? all : null;
    }, "damaged fixture import preserved");
    await pageCopy.reload();
    const restoredDamaged = await readIndexedDbProjects(pageCopy);
    assert.equal(restoredDamaged.length, 4);
    for (const project of [damaged, incomplete]) {
      const found = restoredDamaged.find((entry) => entry.project.id === project.project.id);
      assert.ok(found, "original damaged record was not silently dropped");
      assert.equal(references(found)[0].content, references(project)[0].content);
    }
    for (const title of ["Fixture incohérente", "Fixture historique incomplète"]) {
      await pageCopy.locator("article.project-card").filter({ hasText: title })
        .getByRole("button", { name: "Ouvrir" }).click();
      await openAttachments(pageCopy);
      await pageCopy.getByRole("alert")
        .getByText(/Référence 2dBrain invalide ou altérée/).waitFor();
      assert.equal(await pageCopy.getByText("Référence 2dBrain approuvée").count(), 0);
      // The corrupted link is retained, protected from generic editing.
      assert.equal(await pageCopy.getByRole("button", { name: "Modifier" }).count(), 0);
      if (title === "Fixture incohérente") {
        await previewAndSelect(pageCopy, fixtureProposal(), damaged.project.id);
        await confirm(pageCopy);
        await pageCopy.getByRole("alert")
          .getByText(/déjà une référence différente ou altérée/).waitFor();
        const still = (await readIndexedDbProjects(pageCopy))
          .find((doc) => doc.project.id === damaged.project.id);
        assert.equal(still.attachments.length, damaged.attachments.length);
      }
      await pageCopy.getByRole("button", { name: "Retour" }).first().click();
    }

    // A committed older IndexedDB snapshot must not conceal a successful
    // localStorage recovery when the next real IndexedDB transaction aborts.
    const fallbackContext = await newFaultContext(browser, contextOptions);
    const fallbackPage = await fallbackContext.newPage();
    const fallbackProjectId = await createFixtureProject(fallbackPage);
    const olderIndexed = await readIndexedDbProjects(fallbackPage);
    assert.equal(references(olderIndexed[0]).length, 0);
    await setFaults(fallbackPage, { failIdbWrites: true });
    await previewAndSelect(fallbackPage, fixtureProposal(), fallbackProjectId);
    await confirm(fallbackPage);
    await fallbackPage.getByText(/Référence enregistrée dans les pièces jointes/).waitFor();
    const fallbackState = await readRecoveryState(fallbackPage);
    assert.equal(fallbackState.recovery.format, "ide-projectsmanager.local-recovery.v1");
    assert.equal(references(fallbackState.recovery.projects[0]).length, 1);
    assert.equal(references((await readIndexedDbProjects(fallbackPage))[0]).length, 0,
      "the IndexedDB write must actually fail, leaving the old snapshot intact");

    await fallbackPage.reload(); // The injected failure persists in sessionStorage.
    await fallbackPage.getByRole("button", { name: "Ouvrir" }).first().click();
    await openAttachments(fallbackPage);
    await fallbackPage.getByText("Référence 2dBrain approuvée").waitFor();
    assert.equal(references((await readIndexedDbProjects(fallbackPage))[0]).length, 0);
    assert.equal(references((await readRecoveryState(fallbackPage)).recovery.projects[0]).length, 1);

    await setFaults(fallbackPage, { failIdbWrites: false });
    await fallbackPage.reload();
    const recovered = await waitForStoredReference(fallbackPage, 1);
    assert.equal(recovered[0].project.id, fallbackProjectId);
    assert.equal(JSON.parse(references(recovered[0])[0].content).source.ref,
      fixtureProposal().source.ref);
    const recoveredBundle = await exportBundle(fallbackPage);
    assert.equal(recoveredBundle.format, "ide-projectsmanager.project-bundle");
    assert.equal(recoveredBundle.version, 1);
    assert.equal(references(recoveredBundle.projects[0]).length, 1);
    const recoveredCopyContext = await browser.newContext(contextOptions);
    await recoveredCopyContext.route("**/*", (route) =>
      new URL(route.request().url()).hostname === "127.0.0.1"
        ? route.continue() : route.abort());
    const recoveredCopyPage = await recoveredCopyContext.newPage();
    await restoreBundle(recoveredCopyPage, recoveredBundle);
    await waitForStoredReference(recoveredCopyPage, 1);
    await recoveredCopyPage.reload();
    assert.equal(references((await readIndexedDbProjects(recoveredCopyPage))[0]).length, 1);
    await recoveredCopyContext.close();
    await fallbackContext.close();

    // The initial IndexedDB transaction has physically committed, but its
    // completion callback is delayed. Dismissing the preview must write a
    // tombstone immediately and wait for a second, durable rollback commit.
    const cancelContext = await newFaultContext(browser, contextOptions);
    const cancelPage = await cancelContext.newPage();
    const cancelId = await createFixtureProject(cancelPage);
    await previewAndSelect(cancelPage, fixtureProposal(), cancelId);
    await setFaults(cancelPage, { delayNextWriteMs: 1800 });
    await confirm(cancelPage);
    await eventually(() => cancelPage.evaluate(() => window.__ideFaults.delayStarted),
      "slow IndexedDB write has committed but is awaiting acknowledgement");
    assert.equal(references((await readIndexedDbProjects(cancelPage))[0]).length, 1);
    await cancelPage.getByRole("button", { name: "Effacer cet aperçu" }).click();
    assert.equal((await readRecoveryState(cancelPage)).cancelled.length, 1,
      "closing a pending approval must synchronously journal cancellation");
    await eventually(async () => {
      const physical = await readIndexedDbProjects(cancelPage);
      const journal = await readRecoveryState(cancelPage);
      return references(physical[0]).length === 0 && journal.cancelled.length === 0;
    }, "durable rollback transaction and tombstone clearance", 100);
    await cancelPage.reload();
    assert.equal(references((await readIndexedDbProjects(cancelPage))[0]).length, 0);
    await cancelContext.close();

    // If both rollback stores reject, the warning survives dismissing the
    // preview. The tombstone protects a subsequent browser restart until the
    // unmasked IndexedDB record has been physically removed.
    const failureContext = await newFaultContext(browser, contextOptions);
    const failurePage = await failureContext.newPage();
    const failureId = await createFixtureProject(failurePage);
    await previewAndSelect(failurePage, fixtureProposal(), failureId);
    await setFaults(failurePage, { delayNextWriteMs: 1800 });
    await confirm(failurePage);
    await eventually(() => failurePage.evaluate(() => window.__ideFaults.delayStarted),
      "unacknowledged approval preceding rollback failure");
    await failurePage.getByRole("button", { name: "Effacer cet aperçu" }).click();
    await setFaults(failurePage, { failIdbWrites: true, failFallbackWrites: true });
    await failurePage.getByRole("alert").getByText(/Annulation non confirmée/)
      .waitFor({ timeout: 12000 });
    assert.equal(references((await readIndexedDbProjects(failurePage))[0]).length, 1,
      "rollback failure must not pretend IndexedDB deleted the reference");
    assert.equal((await readRecoveryState(failurePage)).cancelled.length, 1);
    await setFaults(failurePage, { failIdbWrites: false, failFallbackWrites: false });
    await failurePage.reload(); // Simulated tab closure/reopening, same isolated profile.
    await eventually(async () =>
      references((await readIndexedDbProjects(failurePage))[0]).length === 0,
    "hydration physically recovers the cancelled reference", 100);
    assert.equal((await failurePage.getByText("Référence 2dBrain approuvée").count()), 0);
    await failureContext.close();

    process.stdout.write("D1_BROWSER_OK: isolated Chrome, approval/duplicate/reload, JSON v1 export/restore/copy, tamper detection, actual aborted IndexedDB fallback and recovery, durable slow-write cancellation, failed rollback warning and restart recovery.\n");
  } finally {
    if (browser) await browser.close();
    if (vite.exitCode === null) vite.kill();
  }
}

await main();
