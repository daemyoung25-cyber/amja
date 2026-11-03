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

test("traces are read with a hard cap of 200 newest records", async () => {
  const { sdk } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk });
  p.onTraces(() => {});
  assert.ok(sdk.db.limits.includes(200), JSON.stringify(sdk.db.limits));
  p.close();
});

test("a late connection is handed to onLate instead of being dropped", async () => {
  const { sdk, log } = fakeSdk();
  let late = null;
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const pending = createPresence({ config: { apiKey: "k" }, loadSdk: () => new Promise((r) => setTimeout(() => r(sdk), 9000)), onLate: (p) => { late = p; } });
    mock.timers.tick(8000);
    assert.equal((await pending).mode, "solo");
    mock.timers.tick(1000);
  } finally { mock.timers.reset(); }
  await flush();
  assert.equal(late?.mode, "shared");
  assert.ok(!log.remove.includes("presence/me"));
  late.close();
});

test("the chosen name and 보살/처사 are written with presence so others can see them", async () => {
  const { sdk, log } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk, me: { c: 1, m: { fx: 0, fz: 0, tx: 0, tz: 0, t: 0 }, p: "stand", n: "법운", h: "m" } });
  await flush();
  const w = log.set.filter((s) => s.path === "presence/me").at(-1);
  assert.equal(w.v.n, "법운");
  assert.equal(w.v.h, "m");
  p.close();
});

test("every 합장 greeting is delivered, even two within a few seconds, but never twice", async () => {
  const { sdk, fire } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk, me: { c: 1, m: { fx: 0, fz: 0, tx: 0, tz: 0, t: 0 }, p: "stand" } });
  const got = [];
  p.onGreeted((from) => got.push(from));
  const t = p.now();
  fire("presence", { you: { g: { to: "me", at: t - 3000 } } });
  fire("presence", { you: { g: { to: "me", at: t - 3000 } } });      // 같은 인사가 다시 들려도 한 번
  fire("presence", { you: { g: { to: "me", at: t - 500 } } });       // 몇 초 뒤 또 합장
  assert.deepEqual(got, ["you", "you"]);
  p.close();
});

test("lighting a candle writes slot, name and server time under candles/, and the rack reads at most 96", async () => {
  const { sdk, log } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk });
  p.lightCandle({ slot: 5, n: "법운", h: "m" });
  assert.equal(log.push.at(-1).path, "candles");
  assert.deepEqual({ ...log.push.at(-1).v, at: 0 }, { slot: 5, n: "법운", h: "m", at: 0 });
  assert.equal(typeof log.push.at(-1).v.at, "number");
  p.onCandles(() => {});
  assert.ok(sdk.db.limits.includes(96), JSON.stringify(sdk.db.limits));
  p.close();
});

test("hanging a wish writes only slot, name and server time under wishes/ (never the wish text), and reads at most 120", async () => {
  const { sdk, log } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk });
  p.hangWish({ slot: 4, n: "법운", h: "m", text: "이건 올라가면 안 됨" });
  assert.equal(log.push.at(-1).path, "wishes");
  assert.deepEqual({ ...log.push.at(-1).v, at: 0 }, { slot: 4, n: "법운", h: "m", at: 0 });
  p.onWishes(() => {});
  assert.ok(sdk.db.limits.includes(120), JSON.stringify(sdk.db.limits));
  p.close();
});

test("a wish shared for reading is written with its text but without name, and returns its id", async () => {
  const { sdk, log } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk });
  const id = p.hangWish({ slot: 2, n: "법운", h: "m", text: "평안하길", pub: true });
  assert.equal(log.push.at(-1).path, "wishes");
  assert.deepEqual({ ...log.push.at(-1).v, at: 0 }, { slot: 2, t: "평안하길", at: 0 });
  assert.equal(id, log.push.at(-1).key);
  p.close();
});

test("praying along with a wish writes my uid under wishJoins/{wish}, and wishes come with their ids", async () => {
  const { sdk, log, fire } = fakeSdk();
  const p = await createPresence({ config: { apiKey: "k" }, loadSdk: async () => sdk });
  p.joinWish("w1");
  assert.equal(log.set.at(-1).path, "wishJoins/w1/me");
  assert.equal(typeof log.set.at(-1).v, "number");
  let got = null;
  p.onWishes((list) => { got = list; });
  fire("wishes", { w9: { slot: 1, at: 5, t: "x" } });
  assert.deepEqual(got, [{ id: "w9", slot: 1, at: 5, t: "x" }]);
  let joins = null;
  p.onWishJoins("w9", (n) => { joins = n; });
  fire("wishJoins/w9", { u1: 1, u2: 2 });
  assert.equal(joins, 2);
  p.close();
});

test("solo mode can hang a wish without a connection", async () => {
  const p = await createPresence({ config: { apiKey: "" } });
  p.hangWish({ slot: 0, n: "연화" });
  p.onWishes(() => {});
  p.joinWish("x");
  p.onWishJoins("x", () => {});
});

test("solo mode can light a candle without a connection", async () => {
  const p = await createPresence({ config: { apiKey: "" } });
  p.lightCandle({ slot: 0, n: "연화" });
  p.onCandles(() => {});
});
