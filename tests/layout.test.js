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

import { YARD, BAERYE } from "../src/logic/layout.js";
const inYardStone = (p) => YARD.some((o) => Math.hypot(p.x - o.x, p.z - o.z) < o.r);

test("the hall front has a pair of stone lanterns and a pair of pagodas, mirrored", () => {
  for (const kind of ["lantern", "pagoda"]) {
    const two = YARD.filter((o) => o.kind === kind);
    assert.equal(two.length, 2, kind);
    assert.equal(two[0].x, -two[1].x);
    assert.equal(two[0].z, two[1].z);
  }
});

test("walking straight across the front yard goes round the stones, not through them", () => {
  const lantern = YARD.find((o) => o.kind === "lantern"), pagoda = YARD.find((o) => o.kind === "pagoda");
  for (const o of [lantern, pagoda]) {
    const from = { x: o.x - 3, z: o.z }, to = { x: o.x + 3, z: o.z };
    const path = routeAround(from, to);
    assert.deepEqual(path.at(-1), to);
    assert.equal(crosses(from, path, inYardStone), null, `${o.kind}: ${JSON.stringify(path)}`);
    assert.ok(path.every(walkable), JSON.stringify(path));
  }
});

test("tapping on a stone lantern or pagoda stands beside it", () => {
  for (const o of YARD) {
    const r = resolveTap({ x: o.x, z: o.z });
    assert.equal(r.kind, "walk");
    assert.ok(!inYardStone(r.to), `${o.kind}: ${JSON.stringify(r.to)}`);
  }
});

test("the path from the courtyard into the hall still goes through the door past the lanterns", () => {
  const from = { x: 0, z: 0 }, to = { x: 0, z: 9 };
  const path = routeAround(from, to);
  assert.equal(crosses(from, path, inYardStone), null, JSON.stringify(path));
});

test("the front yard also has a 괘불대 pair, lotus pots in mirrored pairs, a bronze censer on the axis and a wish-tile stand", () => {
  for (const kind of ["gwaebul", "pot"]) {
    const all = YARD.filter((o) => o.kind === kind);
    assert.ok(all.length >= 2 && all.length % 2 === 0, kind);
    for (const o of all) assert.ok(all.some((m) => m.x === -o.x && m.z === o.z), `${kind} mirror of ${o.x}`);
  }
  const censer = YARD.filter((o) => o.kind === "censer");
  assert.equal(censer.length, 1);
  assert.equal(censer[0].x, 0);
  assert.ok(censer[0].z < BAERYE.z, "향로는 배례석 앞(바다 쪽)");
  assert.equal(YARD.filter((o) => o.kind === "giwa").length, 1);
});

test("nothing in the front yard overlaps another thing or the hall", () => {
  const all = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD];
  for (let i = 0; i < all.length; i++) {
    for (let j = i + 1; j < all.length; j++) assert.ok(Math.hypot(all[i].x - all[j].x, all[i].z - all[j].z) > all[i].r + all[j].r + 0.6, `${JSON.stringify(all[i])} ~ ${JSON.stringify(all[j])}`);
    assert.ok(all[i].z + all[i].r < HALL.minZ, JSON.stringify(all[i]));
    assert.ok(walkable({ x: all[i].x - all[i].r, z: all[i].z }) && walkable({ x: all[i].x + all[i].r, z: all[i].z }), JSON.stringify(all[i]));
  }
});

test("from anywhere people arrive, the way into the hall goes round every yard stone", () => {
  for (let x = -4; x <= 4; x += 1) for (const z of [-2.5, -1.5, -0.5]) {
    const from = { x, z }, to = { x: 0, z: 9 };
    const path = routeAround(from, to);
    assert.deepEqual(path.at(-1), to);
    assert.equal(crosses(from, path, inYardStone), null, `${x},${z}: ${JSON.stringify(path)}`);
  }
});

test("and the way back out from the door to the railing goes round them too", () => {
  for (let x = -10; x <= 10; x += 2.5) {
    const from = { x: 0, z: 9 }, to = { x, z: -5.4 };
    const path = routeAround(from, to);
    assert.equal(crosses(from, path, inYardStone), null, `${x}: ${JSON.stringify(path)}`);
  }
});
