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
