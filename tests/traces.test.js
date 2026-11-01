import { test } from "node:test";
import assert from "node:assert/strict";
import { visibleTraces, shouldWriteTrace, recentVisitorCount, staleIds } from "../src/logic/traces.js";

const NOW = 1_800_000_000_000, MIN = 60000;
const near = (a, b) => assert.ok(Math.abs(a - b) <= 0.001, `${a} vs ${b}`);

test("a fresh lean trace is 0.35 opaque, a 30-minute step trace 0.1, an hour-old one is gone", () => {
  const r = visibleTraces([
    { x: 0, z: 0, k: "lean", at: NOW },
    { x: 1, z: 0, k: "step", at: NOW - 30 * MIN },
    { x: 2, z: 0, k: "step", at: NOW - 60 * MIN - 1000 },
  ], NOW);
  assert.equal(r.length, 2);
  near(r.find((t) => t.k === "lean").opacity, 0.35);
  near(r.find((t) => t.k === "step").opacity, 0.1);
});

test("at most 200 traces are kept, newest first", () => {
  const recs = Array.from({ length: 250 }, (_, i) => ({ x: i, z: 0, k: "step", at: NOW - i * 1000 }));
  const r = visibleTraces(recs, NOW);
  assert.equal(r.length, 200);
  assert.equal(r[0].x, 0);
  assert.equal(r[199].x, 199);
});

test("a trace is written at most every 15 s", () => {
  assert.equal(shouldWriteTrace(null, NOW), true);
  assert.equal(shouldWriteTrace(NOW - 14000, NOW), false);
  assert.equal(shouldWriteTrace(NOW - 15000, NOW), true);
});

test("visitors in the last hour are counted, older ones are not", () => {
  assert.equal(recentVisitorCount({ a: { at: NOW - 59 * MIN }, b: { at: NOW - 59 * MIN }, c: { at: NOW - 61 * MIN } }, NOW), 2);
  assert.equal(recentVisitorCount(null, NOW), 0);
});

test("only records older than two hours are stale", () => {
  assert.deepEqual(staleIds({ old: { at: NOW - 120 * MIN - 1000 }, kept: { at: NOW - 119 * MIN } }, NOW), ["old"]);
});

import { bucketTraces, OPACITY_LEVELS } from "../src/logic/traces.js";

test("traces are grouped into a few opacity buckets per kind so drawing stays cheap", () => {
  const list = Array.from({ length: 200 }, (_, i) => ({ x: i, z: 0, k: i % 2 ? "lean" : "step", opacity: 0.35 * (1 - i / 200) }));
  const groups = bucketTraces(list);
  assert.ok(Object.keys(groups).length <= 2 * OPACITY_LEVELS, String(Object.keys(groups).length));
  assert.equal(Object.values(groups).reduce((s, g) => s + g.items.length, 0), 200);
  for (const g of Object.values(groups)) for (const t of g.items) assert.ok(Math.abs(t.opacity - g.opacity) <= 0.35 / OPACITY_LEVELS);
});
