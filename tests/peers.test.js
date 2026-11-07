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

test("a spoken word is passed on only when well-formed", () => {
  const r = peersFromSnapshot({ a: at(1, 0, { t: { x: "안녕", at: NOW } }), b: at(2, 0, { t: { x: 5, at: NOW } }), c: at(3, 0) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.t), [{ x: "안녕", at: NOW }, null, null]);
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

test("a peer carries m (처사) or f (보살), defaulting to f", () => {
  const r = peersFromSnapshot({ a: at(1, 0, { h: "m" }), b: at(2, 0, { h: "zz" }), c: at(3, 0) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.h), ["m", "f", "f"]);
});

test("a carried bongsong bundle colour comes through only as a whole number 0-5", () => {
  const r = peersFromSnapshot({ a: at(1, 1, { b: 3 }), b: at(2, 2, { b: 9 }), c: at(3, 3, { b: 1.5 }), d: at(4, 4) }, "me", NOW, ME);
  assert.deepEqual(r.map((p) => p.b), [3, null, null, null]);
});
