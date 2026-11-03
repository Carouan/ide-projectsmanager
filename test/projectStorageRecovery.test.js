import assert from "node:assert/strict";
import test from "node:test";
import { IDBFactory } from "fake-indexeddb";

const DB = "ide-projet-personnel";
const RECOVERY = "ide-projet-personnel.projects-recovery-v1";
const LEGACY = "ide-projet-personnel.projects";
let nextCase = 0;

function projects(name) {
  return [{ project: { id: "fixture-project", title: name }, attachments: [] }];
}

async function openDatabase(factory) {
  const request = factory.open(DB, 2);
  return new Promise((resolve, reject) => {
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains("project_storage")) {
        request.result.createObjectStore("project_storage");
      }
      if (!request.result.objectStoreNames.contains("app_storage")) {
        request.result.createObjectStore("app_storage");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function rawWrite(factory, name, values) {
  const db = await openDatabase(factory);
  await new Promise((resolve, reject) => {
    const tx = db.transaction("project_storage", "readwrite");
    tx.objectStore("project_storage").put(values, name);
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function rawRead(factory, name) {
  const db = await openDatabase(factory);
  const found = await new Promise((resolve, reject) => {
    const tx = db.transaction("project_storage", "readonly");
    const request = tx.objectStore("project_storage").get(name);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return found;
}

async function environment() {
  const originalIndexedDB = globalThis.indexedDB;
  const originalStorage = globalThis.localStorage;
  const factory = new IDBFactory();
  const map = new Map();
  const control = { failIdbWrites: false, failLocalWrites: false };
  const local = {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      if (control.failLocalWrites) throw new Error("localStorage quota exceeded");
      map.set(key, String(value));
    },
    removeItem: (key) => map.delete(key),
  };
  globalThis.indexedDB = factory;
  globalThis.localStorage = local;
  const originalOpen = factory.open.bind(factory);
  factory.open = (...args) => {
    const request = originalOpen(...args);
    request.addEventListener("success", () => {
      const db = request.result;
      if (db.__testInjected) return;
      db.__testInjected = true;
      const originalTransaction = db.transaction.bind(db);
      db.transaction = (...arguments_) => {
        const transaction = originalTransaction(...arguments_);
        if (arguments_[1] === "readwrite" && control.failIdbWrites) {
          queueMicrotask(() => {
            try { transaction.abort(); } catch { /* already aborted */ }
          });
        }
        return transaction;
      };
    });
    return request;
  };
  const storage = await import("../src/services/storage.js?recovery-case=" + ++nextCase);
  return {
    factory, control, map, storage,
    restore: () => {
      globalThis.indexedDB = originalIndexedDB;
      globalThis.localStorage = originalStorage;
    },
  };
}

test("failed IndexedDB write is acknowledged only through a recoverable fallback; reload prefers it", async () => {
  const ctx = await environment();
  try {
    const previous = projects("Old IndexedDB");
    const newer = projects("New fallback");
    await rawWrite(ctx.factory, "projects", previous);
    assert.deepEqual(await ctx.storage.loadProjects(), previous);
    ctx.control.failIdbWrites = true;
    await ctx.storage.saveProjects(newer);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), previous);
    assert.ok(ctx.map.has(RECOVERY));
    const reloadedModule = await import(
      "../src/services/storage.js?recovery-new-page=" + ++nextCase
    );
    assert.deepEqual(await reloadedModule.loadProjects(), newer,
      "a new page must read the committed recovery snapshot instead of stale IndexedDB");
    ctx.control.failIdbWrites = false;
    // Recovery promotes the journal to IndexedDB and cannot overwrite newer DB revisions.
    assert.deepEqual(await ctx.storage.loadProjects(), newer);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), newer);
    ctx.map.delete(RECOVERY); // simulate local journal becoming unavailable later
    assert.deepEqual(await ctx.storage.loadProjects(), newer);
  } finally { ctx.restore(); }
});

test("an externally advanced IndexedDB revision cannot be silently overwritten by a stale tab", async () => {
  const ctx = await environment();
  try {
    assert.deepEqual(await ctx.storage.loadProjects(), []);
    await ctx.storage.saveProjects(projects("Initial"));
    const storedRevision = await rawRead(ctx.factory, "projects-revision");
    await rawWrite(ctx.factory, "projects", projects("Other tab latest"));
    await rawWrite(ctx.factory, "projects-revision", storedRevision + 100000);
    await assert.rejects(ctx.storage.saveProjects(projects("Stale tab overwrite")),
      (error) => error instanceof ctx.storage.ProjectsStorageConflictError);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), projects("Other tab latest"));
    assert.equal(ctx.map.has(RECOVERY), false);
  } finally { ctx.restore(); }
});

test("fallback recovery detects an independent IndexedDB advance instead of overwriting it", async () => {
  const ctx = await environment();
  try {
    assert.deepEqual(await ctx.storage.loadProjects(), []);
    ctx.control.failIdbWrites = true;
    await ctx.storage.saveProjects(projects("Fallback independently modified"));
    const fallback = JSON.parse(ctx.map.get(RECOVERY));
    assert.equal(fallback.baseIndexedRevision, 0);
    ctx.control.failIdbWrites = false;
    await rawWrite(ctx.factory, "projects", projects("Independent second-tab changes"));
    await rawWrite(ctx.factory, "projects-revision", fallback.baseIndexedRevision + 1);
    await assert.rejects(ctx.storage.loadProjects(),
      (error) => error instanceof ctx.storage.ProjectsStorageConflictError);
    await assert.rejects(ctx.storage.saveProjects(projects("Unsafe overwrite")),
      (error) => error instanceof ctx.storage.ProjectsStorageConflictError);
    assert.deepEqual(await rawRead(ctx.factory, "projects"),
      projects("Independent second-tab changes"));
    assert.equal(JSON.parse(ctx.map.get(RECOVERY)).projects[0].project.title,
      "Fallback independently modified");
  } finally { ctx.restore(); }
});

test("both stores failing never report success and preserve the existing IndexedDB snapshot", async () => {
  const ctx = await environment();
  try {
    await rawWrite(ctx.factory, "projects", projects("Original"));
    await ctx.storage.loadProjects();
    ctx.control.failIdbWrites = true;
    ctx.control.failLocalWrites = true;
    await assert.rejects(ctx.storage.saveProjects(projects("Uncommitted")),
      (error) => error instanceof globalThis.AggregateError && error.errors.length === 2);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), projects("Original"));
    assert.equal(ctx.map.has(RECOVERY), false);
  } finally { ctx.restore(); }
});

test("recovery journal can be reopened after a temporary IndexedDB outage", async () => {
  const ctx = await environment();
  try {
    assert.deepEqual(await ctx.storage.loadProjects(), []);
    ctx.control.failIdbWrites = true;
    await ctx.storage.saveProjects(projects("Offline"));
    assert.deepEqual(await ctx.storage.loadProjects(), projects("Offline"));
    ctx.control.failIdbWrites = false;
    assert.deepEqual(await ctx.storage.loadProjects(), projects("Offline"));
    assert.deepEqual(await rawRead(ctx.factory, "projects"), projects("Offline"));
  } finally { ctx.restore(); }
});

test("two divergent unversioned records stop hydration rather than silently overwriting newer data", async () => {
  const ctx = await environment();
  try {
    await rawWrite(ctx.factory, "projects", projects("IndexedDB legacy"));
    ctx.map.set(LEGACY, JSON.stringify(projects("Other local legacy")));
    await assert.rejects(ctx.storage.loadProjects(),
      (error) => error instanceof ctx.storage.ProjectsStorageConflictError);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), projects("IndexedDB legacy"));
    assert.equal(ctx.map.get(LEGACY), JSON.stringify(projects("Other local legacy")));
  } finally { ctx.restore(); }
});

test("invalid recovery journal blocks stale reads and leaves both snapshots intact", async () => {
  const ctx = await environment();
  try {
    await rawWrite(ctx.factory, "projects", projects("IndexedDB original"));
    ctx.map.set(RECOVERY, "{broken");
    await assert.rejects(ctx.storage.loadProjects(),
      (error) => error instanceof ctx.storage.ProjectsStorageConflictError);
    assert.deepEqual(await rawRead(ctx.factory, "projects"), projects("IndexedDB original"));
    assert.equal(ctx.map.get(RECOVERY), "{broken");
  } finally { ctx.restore(); }
});

test("cancellation tombstone masks an in-flight committed reference after simulated tab closure", async () => {
  const ctx = await environment();
  try {
    const reference = { id: "attachment_pending", type: "file_ref", content: "synthetic-only" };
    const committed = projects("Fixture");
    committed[0].attachments = [reference];
    await rawWrite(ctx.factory, "projects", committed);
    const receipt = { projectId: committed[0].project.id, attachmentId: reference.id };
    ctx.storage.rememberCancelledReference(receipt); // synchronous and durable before closing
    assert.deepEqual((await ctx.storage.loadProjects())[0].attachments, []);
    assert.equal((await rawRead(ctx.factory, "projects"))[0].attachments.length, 1,
      "the in-flight write may still be physically present in IndexedDB");
    // Simulated new tab's hydration writes back the masked snapshot.
    await ctx.storage.saveProjects(await ctx.storage.loadProjects());
    assert.equal((await rawRead(ctx.factory, "projects"))[0].attachments.length, 0);
    ctx.storage.clearCancelledReference(receipt);
    assert.equal((await ctx.storage.loadProjects({ maskCancelled: false }))[0].attachments.length, 0);
  } finally { ctx.restore(); }
});
