import assert from "node:assert/strict";
import test from "node:test";
import { IDBFactory } from "fake-indexeddb";

test("saveProjects acknowledges the actual IndexedDB transaction, not its put request", async () => {
  const originalIndexedDB = globalThis.indexedDB;
  const originalStorage = globalThis.localStorage;
  const factory = new IDBFactory();
  const values = new Map();
  globalThis.indexedDB = factory;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };
  try {
    const { saveProjects, loadProjects } =
      await import("../src/services/storage.js?transaction-commit");
    assert.deepEqual(await loadProjects(), []);
    const projects = [{ project: { id: "fixture" } }];
    await saveProjects(projects);
    assert.deepEqual(await loadProjects(), projects);
    const request = factory.open("ide-projet-personnel", 2);
    const database = await new Promise((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const committed = await new Promise((resolve, reject) => {
      const tx = database.transaction("project_storage", "readonly");
      const get = tx.objectStore("project_storage").get("projects");
      get.onsuccess = () => resolve(get.result);
      get.onerror = () => reject(get.error);
    });
    assert.deepEqual(committed, projects);
    database.close();
  } finally {
    globalThis.indexedDB = originalIndexedDB;
    globalThis.localStorage = originalStorage;
  }
});
