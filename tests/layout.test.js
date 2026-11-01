import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToWalkable, resolveTap, HALL, STATUE } from "../src/logic/layout.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const inHall = (p) => p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;

test("clampToWalkable keeps points inside the courtyard", () => {
  assert.equal(clampToWalkable({ x: 30, z: 0 }).x, 12);
});

test("clampToWalkable pushes a point out of the hall to the nearest side", () => {
  const p = clampToWalkable({ x: 0, z: 7 });
  assert.ok(!inHall(p), JSON.stringify(p));
  assert.ok(dist(p, { x: 0, z: 7 }) <= 2.6);
});

test("clampToWalkable pushes a point off the statue base", () => {
  const p = clampToWalkable({ x: 9, z: -4.5 });
  assert.ok(dist(p, STATUE) >= 1.2);
});

test("tapping the sea leans on the railing straight ahead", () => {
  assert.deepEqual(resolveTap({ x: 2, z: -20 }), { kind: "lean", to: { x: 2, z: -5.4 }, yaw: 0 });
});

test("tapping far out to sea clamps the lean spot to the railing end", () => {
  const r = resolveTap({ x: -50, z: -20 });
  assert.equal(r.kind, "lean");
  assert.equal(r.to.x, -11.5);
});

test("a lean spot next to the statue stays clear of its base", () => {
  const r = resolveTap({ x: 9, z: -5.8 });
  assert.equal(r.kind, "lean");
  assert.ok(dist(r.to, STATUE) >= 1.2);
});

test("tapping the courtyard walks there", () => {
  assert.deepEqual(resolveTap({ x: 0, z: 0 }), { kind: "walk", to: { x: 0, z: 0 } });
});
