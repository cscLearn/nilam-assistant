import assert from "node:assert/strict";
import worker from "./index.js";

function kv() {
  const store = new Map();
  return {
    async get(key, type) {
      const value = store.get(key);
      return type === "json" && value ? JSON.parse(value) : value;
    },
    async put(key, value) {
      store.set(key, value);
    }
  };
}

async function json(response) {
  assert.equal(response.headers.get("content-type"), "application/json");
  return response.json();
}

const env = { NILAM_PROGRESS: kv() };
const session = await json(await worker.fetch(new Request("https://worker.test/session?profile=test-user"), env));

assert.deepEqual(session.bookCursors, { bm: 0, en: 0, zh: 0 });

const advanced = await json(await worker.fetch(new Request("https://worker.test/advance", {
  method: "POST",
  body: JSON.stringify({ profile: "test-user", lang: "zh", session: session.currentSession })
}), env));

assert.equal(advanced.bookCursors.zh, 1);
assert.equal(advanced.bookCursors.bm, 0);
assert.equal(advanced.bookCursors.en, 0);

console.log("worker cursor self-test OK");
