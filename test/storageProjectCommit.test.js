import assert from "node:assert/strict";
import test from "node:test";
import { setImmediate } from "node:timers/promises";

function installMockIndexedDb() {
  const request = { error: null, onsuccess: null, onerror: null };
  const transaction = {
    oncomplete: null, onerror: null, onabort: null, error: null,
    objectStore: () => ({ put: () => request }),
  };
  const db = { transaction: () => transaction };
  const open = { result: db, onsuccess: null, onerror: null };
  globalThis.indexedDB = {
    open: () => {
      queueMicrotask(() => open.onsuccess());
      return open;
    },
  };
  return { request, transaction };
}

test("a successful IndexedDB put request does not acknowledge durability before transaction completion", async () => {
  const oldIndexedDB = globalThis.indexedDB;
  const { request, transaction } = installMockIndexedDb();
  try {
    const { saveProjects } = await import("../src/services/storage.js?commit-test");
    let completed = false;
    const saving = saveProjects([{ project: { id: "synthetic" } }]).then(() => {
      completed = true;
    });
    await setImmediate();
    assert.equal(typeof transaction.oncomplete, "function");
    request.onsuccess?.();
    await setImmediate();
    assert.equal(completed, false, "request success must not be treated as durable");
    transaction.oncomplete();
    await saving;
    assert.equal(completed, true);
  } finally {
    globalThis.indexedDB = oldIndexedDB;
  }
});
