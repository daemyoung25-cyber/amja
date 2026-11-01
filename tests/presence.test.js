import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { createPresence } from "../src/net/presence.js";

test("an empty apiKey means solo mode and sends are harmless", async () => {
  const p = await createPresence({ config: { apiKey: "" } });
  assert.equal(p.mode, "solo");
  p.sendMove({ fx: 0, fz: 0, tx: 1, tz: 1, t: 0 });
  p.sendPose("lean");
  p.greet("someone");
  p.close();
});

test("a failing SDK load falls back to solo", async () => {
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: () => Promise.reject(new Error("offline")) });
  assert.equal(p.mode, "solo");
});

test("an SDK load that never finishes falls back to solo after 8 s", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const pending = createPresence({ config: { apiKey: "k" }, loadSdk: () => new Promise(() => {}) });
    mock.timers.tick(8000);
    const p = await pending;
    assert.equal(p.mode, "solo");
  } finally {
    mock.timers.reset();
  }
});

import { fakeSdk } from "./fake-firebase.js";
const flush = async () => { for (let i = 0; i < 20; i++) await new Promise((r) => setImmediate(r)); };

test("a connection that finishes after the 8 s fallback removes itself (no frozen ghost)", async () => {
  const { sdk, log } = fakeSdk();
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const pending = createPresence({ config: { apiKey: "k" }, loadSdk: () => new Promise((r) => setTimeout(() => r(sdk), 9000)) });
    mock.timers.tick(8000);
    assert.equal((await pending).mode, "solo");
    mock.timers.tick(1000);
  } finally { mock.timers.reset(); }
  await flush();
  assert.ok(log.remove.includes("presence/me"), JSON.stringify(log));
});

test("after a reconnect the presence node is written again in full", async () => {
  const { sdk, log, fire } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk, me: { c: 1, m: { fx: 0, fz: 0, tx: 0, tz: 0, t: 0 }, p: "stand" } });
  assert.equal(p.mode, "shared");
  const before = log.set.filter((s) => s.path === "presence/me").length;
  fire(".info/connected", false);
  fire(".info/connected", true);
  await flush();
  const writes = log.set.filter((s) => s.path === "presence/me");
  assert.ok(writes.length > before, "no full rewrite after reconnect");
  assert.deepEqual(Object.keys(writes.at(-1).v).sort().slice(0, 4), ["c", "m", "p", "pt"]);
  p.close();
});
