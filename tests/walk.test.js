import { test } from "node:test";
import assert from "node:assert/strict";
import { startMove, positionAt, carriedWalk, BRISK_AFTER, BRISK } from "../src/logic/walk.js";

const near = (a, b, eps = 0.01) => Math.abs(a - b) <= eps;

test("the first 3 m are at 1.4 m/s, unchanged", () => {
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -14 }, 1000);
  const p = positionAt(m, 2000);
  assert.ok(near(p.z, -1.4), String(p.z));
  assert.equal(p.arrived, false);
  assert.equal(positionAt(startMove({ x: 0, z: 0 }, { x: 0, z: -2.8 }, 0), 2000).arrived, true, "a short walk takes as long as before");
});

test("past 3 m the walker goes half as fast again", () => {
  assert.equal(BRISK_AFTER, 3); assert.equal(BRISK, 1.5);
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -30 }, 0);
  const at3 = (3 / 1.4) * 1000;
  assert.ok(near(positionAt(m, at3).z, -3), "reaches 3 m on time");
  assert.ok(near(positionAt(m, at3 + 1000).z, -5.1), "then 2.1 m in a second");
  assert.ok(near(positionAt(m, at3 + 2000).z, -7.2));
});

test("14 m arrives sooner than before, exactly when the sums say", () => {
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -14 }, 0), sec = 3 / 1.4 + 11 / 2.1;
  assert.equal(positionAt(m, (sec - 0.05) * 1000).arrived, false);
  const p = positionAt(m, (sec + 0.05) * 1000);
  assert.equal(p.arrived, true);
  assert.ok(near(p.z, -14));
});

test("turning or going round something mid-walk keeps the quicker pace; stopping starts over", () => {
  const first = startMove({ x: 0, z: 0 }, { x: 0, z: -20 }, 0);
  const mid = positionAt(first, 4000);
  assert.ok(mid.walked > 3 && !mid.arrived);
  const next = startMove(mid, { x: 20, z: mid.z }, 4000, mid.walked);
  assert.ok(near(positionAt(next, 5000).x, 2.1), "still brisk after the turn");
  const fresh = startMove({ x: 0, z: 0 }, { x: 20, z: 0 }, 0);
  assert.ok(near(positionAt(fresh, 1000).x, 1.4), "after a stop it is the walking pace again");
  assert.equal("w" in fresh, false, "nothing extra is sent for a fresh walk");
});

test("only a walk still under way carries over; someone standing still starts fresh", () => {
  const m = startMove({ x: 0, z: 0 }, { x: 0, z: -10 }, 0);
  const walking = positionAt(m, 3000), stopped = positionAt(m, 60000);
  assert.equal(carriedWalk(walking, 0), walking.walked);
  assert.equal(stopped.arrived, true);
  assert.equal(carriedWalk(stopped, 0), 0, "stopped, so back to the walking pace");
  assert.equal(carriedWalk(stopped, 1), stopped.walked, "at a waypoint with more to go, still walking");
});

test("a move from an older tab or with a bad w is read as a fresh walk", () => {
  const m = { fx: 0, fz: 0, tx: 0, tz: -14, t: 0 };
  assert.ok(near(positionAt(m, 1000).z, -1.4));
  assert.ok(near(positionAt({ ...m, w: "9" }, 1000).z, -1.4));
  assert.ok(near(positionAt({ ...m, w: -5 }, 1000).z, -1.4));
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
