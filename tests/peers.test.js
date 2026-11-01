import { test } from "node:test";
import assert from "node:assert/strict";
import { peersFromSnapshot, nearestPeerWithin } from "../src/logic/peers.js";

const NOW = 1_800_000_000_000;
const at = (x, z, extra = {}) => ({ c: 1, m: { fx: x, fz: z, tx: x, tz: z, t: NOW - 5000 }, p: "stand", pt: NOW - 5000, s: NOW - 1000, ...extra });
const ME = { x: 0, z: 0 };

test("my own entry is left out", () => {
  const r = peersFromSnapshot({ me: at(1, 1), you: at(2, 2) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.uid), ["you"]);
});

test("entries not seen for over 90 s are dropped", () => {
  const r = peersFromSnapshot({ old: at(1, 1, { s: NOW - 91000 }), fresh: at(1, 1, { s: NOW - 89000 }) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.uid), ["fresh"]);
});

test("with 40 people only the 30 nearest are kept", () => {
  const val = {};
  for (let i = 0; i < 40; i++) val["u" + i] = at(i, 0);
  const r = peersFromSnapshot(val, "me", NOW, ME);
  assert.equal(r.length, 30);
  assert.deepEqual(new Set(r.map((p) => p.uid)), new Set(Array.from({ length: 30 }, (_, i) => "u" + i)));
});

test("an empty snapshot gives nobody", () => {
  assert.deepEqual(peersFromSnapshot(null, "me", NOW, ME), []);
});

test("malformed entries are skipped without throwing", () => {
  const r = peersFromSnapshot({ bad: { c: 1, p: "stand", s: NOW }, worse: "x", ok: at(1, 0) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.uid), ["ok"]);
});

test("nearestPeerWithin returns the closest uid inside the range, else null", () => {
  const peers = peersFromSnapshot({ a: at(3, 0), b: at(2, 0), far: at(9, 0) }, "me", NOW, ME);
  assert.equal(nearestPeerWithin(peers, ME, NOW, 4), "b");
  assert.equal(nearestPeerWithin(peers, { x: 20, z: 0 }, NOW, 4), null);
});

test("a peer carries their name only when it is a valid Korean name", () => {
  const r = peersFromSnapshot({ a: at(1, 0, { n: "연화" }), b: at(2, 0, { n: "<script>" }), c: at(3, 0) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.n), ["연화", "", ""]);
});
