import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToWalkable, resolveTap, floorY, insideHall, COURTYARD, HALL, STATUE, INSIDE, CUSHIONS, ALTAR, DOOR_IN } from "../src/logic/layout.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const inHall = (p) => p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;

test("clampToWalkable keeps points inside the courtyard", () => {
  assert.equal(clampToWalkable({ x: 30, z: 0 }).x, 12);
});

test("clampToWalkable takes a point on the hall inside it, in front of the altar", () => {
  const p = clampToWalkable({ x: 3.9, z: 9.9 });
  assert.ok(insideHall(p), JSON.stringify(p));
  assert.ok(p.z <= INSIDE.maxZ);
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

import { routeAround } from "../src/logic/layout.js";

// 경로를 촘촘히 짚어 보며 장애물 안을 지나는지 본다
function crosses(from, path, test) {
  let a = from;
  for (const b of path) {
    for (let i = 0; i <= 100; i++) {
      const p = { x: a.x + (b.x - a.x) * i / 100, z: a.z + (b.z - a.z) * i / 100 };
      if (test(p)) return p;
    }
    a = b;
  }
  return null;
}
const inStatue = (p) => dist(p, STATUE) < STATUE.baseR;
const walkable = (p) => p.x >= COURTYARD.minX && p.x <= COURTYARD.maxX && p.z >= COURTYARD.minZ && p.z <= COURTYARD.maxZ;

test("a straight path with nothing in the way is just the destination", () => {
  assert.deepEqual(routeAround({ x: -5, z: -2 }, { x: 2, z: -5.4 }), [{ x: 2, z: -5.4 }]);
});

test("walking along the railing past the statue goes round its landward side", () => {
  const from = { x: 6, z: -5.4 }, to = { x: 11, z: -5.4 };
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.equal(crosses(from, path, inStatue), null);
  assert.ok(path.every(walkable), JSON.stringify(path));
});

test("crossing behind the hall goes round its front", () => {
  const from = { x: -10.6, z: 12 }, to = { x: 10.6, z: 12 };
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.equal(crosses(from, path, inHall), null, JSON.stringify(path));
  assert.ok(path.every(walkable), JSON.stringify(path));
});

// 법당 벽: 바닥 받침 안쪽이면서 법당 안도 문간도 아닌 곳
const inWall = (p) => inHall(p) && !insideHall(p) && !(Math.abs(p.x) < 0.6 && p.z < DOOR_IN.z + 0.01);

test("walking from the courtyard into the hall goes through the door", () => {
  const from = { x: -6, z: 0 }, to = { x: 2, z: 8 };
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.equal(crosses(from, path, inWall), null, JSON.stringify(path));
  assert.ok(path.some((p) => insideHall(p) && Math.abs(p.x) < 0.6), JSON.stringify(path));
});

test("walking from inside the hall to the railing goes out through the door", () => {
  const from = { x: -2.5, z: 8.4 }, to = { x: 5, z: -5.4 };
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.equal(crosses(from, path, inWall), null, JSON.stringify(path));
  assert.equal(crosses(from, path, inStatue), null, JSON.stringify(path));
});

test("moving around inside the hall is a straight line", () => {
  assert.deepEqual(routeAround({ x: -2, z: 7.2 }, { x: 2, z: 8.3 }), [{ x: 2, z: 8.3 }]);
});

test("tapping a cushion sits on it facing the altar", () => {
  const c = CUSHIONS[0];
  const r = resolveTap({ x: c.x + 0.2, z: c.z - 0.1 });
  assert.equal(r.kind, "sit");
  assert.deepEqual(r.to, { x: c.x, z: c.z });
  assert.ok(Math.abs(r.yaw - Math.atan2(-(ALTAR.x - c.x), -(ALTAR.z - c.z))) < 1e-9);
});

test("the hall floor is half a metre up and the courtyard is level", () => {
  assert.equal(floorY({ x: 0, z: 0 }), 0);
  assert.equal(floorY({ x: 1, z: 8 }), 0.5);
  const step = floorY({ x: 0, z: 5.05 });
  assert.ok(step > 0 && step < 0.5, String(step));
});

test("a new tap while standing in the doorway steps straight in or out", () => {
  const mid = { x: 0, z: 6 };
  assert.deepEqual(routeAround(mid, { x: 1, z: 8 })[0], DOOR_IN);
  const out = routeAround(mid, { x: -8, z: 0 });
  assert.deepEqual(out[0], HALL.door);
  assert.equal(crosses(mid, out, inWall), null, JSON.stringify(out));
});
