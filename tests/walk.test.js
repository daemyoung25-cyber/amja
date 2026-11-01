import { test } from "node:test";
import assert from "node:assert/strict";
import { startMove, positionAt } from "../src/logic/walk.js";

const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test("walking 14 m at 1.4 m/s arrives after 10 s", () => {
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -14 }, 1000);
  const p = positionAt(m, 11000);
  assert.ok(near(p.x, 0) && near(p.z, -14));
  assert.equal(p.arrived, true);
});

test("halfway through the walk is halfway along the line", () => {
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -14 }, 1000);
  const p = positionAt(m, 6000);
  assert.ok(near(p.z, -7), String(p.z));
  assert.equal(p.arrived, false);
});

test("before the start time the walker is at the start", () => {
  const m = startMove({ x: 1, z: 2 }, { x: 5, z: 2 }, 5000);
  const p = positionAt(m, 1000);
  assert.ok(near(p.x, 1) && near(p.z, 2));
});

test("yaw is 0 facing the sea (-z) and -PI/2 facing +x", () => {
  assert.ok(near(positionAt(startMove({ x: 0, z: 0 }, { x: 0, z: -5 }, 0), 1000).yaw, 0));
  assert.ok(near(positionAt(startMove({ x: 0, z: 0 }, { x: 5, z: 0 }, 0), 1000).yaw, -Math.PI / 2));
});

test("a zero-length move is arrived immediately without NaN", () => {
  const p = positionAt(startMove({ x: 3, z: 3 }, { x: 3, z: 3 }, 0), 0);
  assert.equal(p.arrived, true);
  for (const v of [p.x, p.z, p.yaw]) assert.ok(Number.isFinite(v));
});
