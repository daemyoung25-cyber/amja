import { test } from "node:test";
import assert from "node:assert/strict";
import { clampToWalkable, resolveTap, floorY, insideHall, COURTYARD, HALL, STATUE, INSIDE, CUSHIONS, ALTAR, DOOR_IN, RAIL_Z, LEAN_Z, PRAYER_SEATS, seatAt, CANDLES, nearCandles, faceCandles, CAVE, insideCave } from "../src/logic/layout.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const inHall = (p) => p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;

test("clampToWalkable keeps points inside the courtyard", () => {
  assert.equal(clampToWalkable({ x: 60, z: 0 }).x, COURTYARD.maxX);
});

test("clampToWalkable takes a point on the hall inside it, in front of the altar", () => {
  const p = clampToWalkable({ x: 3.9, z: 9.9 });
  assert.ok(insideHall(p), JSON.stringify(p));
  assert.ok(p.z <= INSIDE.maxZ);
});

test("clampToWalkable pushes a point off the statue base", () => {
  const p = clampToWalkable({ x: STATUE.x, z: STATUE.z });
  assert.ok(dist(p, STATUE) >= 1.2);
});

test("tapping the sea leans on the railing straight ahead", () => {
  assert.deepEqual(resolveTap({ x: 2, z: RAIL_Z - 14 }), { kind: "lean", to: { x: 2, z: LEAN_Z }, yaw: 0 });
});

test("tapping far out to sea clamps the lean spot to the railing end", () => {
  const r = resolveTap({ x: -80, z: RAIL_Z - 14 });
  assert.equal(r.kind, "lean");
  assert.equal(r.to.x, COURTYARD.minX + 0.5);
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
  assert.deepEqual(routeAround({ x: 2, z: -2 }, { x: 4, z: LEAN_Z }), [{ x: 4, z: LEAN_Z }]);
});

test("walking straight past the statue goes round its base", () => {
  const from = { x: STATUE.x - 3.5, z: STATUE.z }, to = { x: STATUE.x + 4, z: STATUE.z };
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
  const from = { x: -2.5, z: 8.4 }, to = { x: STATUE.x + 1, z: LEAN_Z };
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
  // 탑은 오른쪽 것으로 (왼쪽 탑 바로 옆엔 촛불 공양대가 있어 3m 떨어진 출발점이 공양대 안이다)
  const lantern = YARD.find((o) => o.kind === "lantern"), pagoda = YARD.find((o) => o.kind === "pagoda" && o.x > 0);
  for (const o of [lantern, pagoda]) {
    const from = { x: o.x - 3, z: o.z }, to = { x: o.x + 3, z: o.z };
    const path = routeAround(from, to);
    assert.deepEqual(path.at(-1), to);
    assert.equal(crosses(from, path, inYardStone), null, `${o.kind}: ${JSON.stringify(path)}`);
    assert.ok(path.every(walkable), JSON.stringify(path));
  }
});

test("tapping on a stone lantern or pagoda stands beside it", () => {
  for (const o of YARD.filter((y) => y.kind !== "candles")) {   // 촛대는 앞에 가서 선다 (아래)
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

test("the front yard also has a 괘불대 pair, lotus pots in mirrored pairs, and a wish-tile stand", () => {
  for (const kind of ["gwaebul", "pot"]) {
    const all = YARD.filter((o) => o.kind === kind);
    assert.ok(all.length >= 2 && all.length % 2 === 0, kind);
    for (const o of all) assert.ok(all.some((m) => m.x === -o.x && m.z === o.z), `${kind} mirror of ${o.x}`);
  }
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
  for (let x = -5; x <= 5; x += 1) for (const z of [-10, -8.5, -7]) {
    const from = { x, z }, to = { x: 0, z: 9 };
    const path = routeAround(from, to);
    assert.deepEqual(path.at(-1), to);
    assert.equal(crosses(from, path, inYardStone), null, `${x},${z}: ${JSON.stringify(path)}`);
  }
});

test("and the way back out from the door to the railing goes round them too", () => {
  for (let x = COURTYARD.minX + 1; x <= COURTYARD.maxX - 1; x += 2.5) {
    const from = { x: 0, z: 9 }, to = { x, z: LEAN_Z };
    const path = routeAround(from, to);
    assert.equal(crosses(from, path, inYardStone), null, `${x}: ${JSON.stringify(path)}`);
  }
});

const FORMER_YARD = (12 - -12) * (5.5 - -6);   // 처음 앞마당: 폭 24m, 난간~법당 11.5m
test("the front yard is about three times as big as it first was", () => {
  const area = (COURTYARD.maxX - COURTYARD.minX) * (HALL.minZ - RAIL_Z);
  assert.ok(area >= FORMER_YARD * 2.9 && area <= FORMER_YARD * 3.3, String(area / FORMER_YARD));
});

test("the sea-facing Gwaneum stands on the left (9 o'clock looking out to sea), between the railing and the hall", () => {
  assert.ok(STATUE.x < COURTYARD.minX / 2, String(STATUE.x));
  assert.ok(STATUE.z > RAIL_Z + 6 && STATUE.z < HALL.minZ - 4, String(STATUE.z));
});

test("in front of the Gwaneum, on the sea side, there are prayer cushions to sit on facing her", () => {
  assert.ok(PRAYER_SEATS.length >= 4);
  for (const c of PRAYER_SEATS) {
    assert.ok(c.z < STATUE.z - STATUE.baseR, JSON.stringify(c));
    assert.ok(dist(c, STATUE) <= STATUE.baseR + 3, "합장할 수 있는 거리");
    const r = resolveTap({ x: c.x + 0.15, z: c.z + 0.1 });
    assert.equal(r.kind, "sit");
    assert.deepEqual(r.to, { x: c.x, z: c.z });
    assert.ok(Math.abs(r.yaw - Math.atan2(-(STATUE.x - c.x), -(STATUE.z - c.z))) < 1e-9);
    assert.equal(seatAt(r.to), c);
  }
});

test("walking from the middle of the yard to a prayer cushion goes round the statue and the stones", () => {
  for (const c of PRAYER_SEATS) {
    const from = { x: 0, z: -8 }, path = routeAround(from, c);
    assert.deepEqual(path.at(-1), { x: c.x, z: c.z });
    assert.equal(crosses(from, path, inStatue), null, JSON.stringify(path));
  }
});

test("the censer is gone so nothing stands in the way of the steps, and the pagodas are smaller", () => {
  assert.equal(YARD.filter((o) => o.kind === "censer").length, 0);
  for (const o of YARD.filter((y) => y.kind === "pagoda")) assert.ok(o.r < 1.1, String(o.r));
  const from = { x: 0, z: -8 }, path = routeAround(from, HALL.door);
  assert.deepEqual(path, [HALL.door]);
});

test("on the left of the yard, between the Gwaneum and the hall, there is a candle rack with a place to stand in front", () => {
  const rack = YARD.find((o) => o.kind === "candles");
  assert.ok(rack, "촛대");
  assert.deepEqual({ x: rack.x, z: rack.z }, { x: CANDLES.x, z: CANDLES.z });
  assert.ok(rack.x < COURTYARD.minX / 2 && rack.z > STATUE.z + STATUE.baseR + 2 && rack.z + rack.r < HALL.minZ, JSON.stringify(rack));
  assert.ok(CANDLES.spot.z < rack.z - rack.r, "앞(바다 쪽)에 선다");
  assert.deepEqual(clampToWalkable(CANDLES.spot), CANDLES.spot);
  assert.equal(nearCandles(CANDLES.spot), true);
  assert.equal(nearCandles({ x: 0, z: -8 }), false);
  assert.ok(Math.cos(faceCandles(CANDLES.spot)) < -0.95, "촛대(산 쪽)를 본다");
});

test("tapping the candle rack walks to the place in front of it", () => {
  const r = resolveTap({ x: CANDLES.x + 0.2, z: CANDLES.z });
  assert.equal(r.kind, "candle");
  assert.deepEqual(r.to, CANDLES.spot);
  const from = { x: 0, z: -8 }, path = routeAround(from, r.to);
  assert.deepEqual(path.at(-1), CANDLES.spot);
  assert.equal(crosses(from, path, inYardStone), null, JSON.stringify(path));
});

// 동굴 법당 (관음굴): 마당 왼쪽 뒤 바위 언덕 속, 돌계단으로 올라간다
test("the cave hall sits up behind the left end of the yard, a little above it", () => {
  assert.ok(CAVE.x < HALL.minX && CAVE.x > COURTYARD.minX, String(CAVE.x));
  assert.ok(CAVE.door.z > COURTYARD.maxZ && CAVE.inside.minZ >= CAVE.door.z, JSON.stringify(CAVE));
  assert.ok(CAVE.floor >= 1 && CAVE.floor <= 3, String(CAVE.floor));
  assert.ok(CAVE.foot.z <= COURTYARD.maxZ && Math.abs(CAVE.foot.x - CAVE.x) < 0.01);
});

test("the stone steps rise steadily from the yard to the cave floor, and inside is level", () => {
  let last = -1;
  for (let z = CAVE.foot.z; z <= CAVE.door.z; z += 0.25) {
    const y = floorY({ x: CAVE.x, z });
    assert.ok(y >= last - 1e-9 && y >= 0 && y <= CAVE.floor, `${z}: ${y}`);
    last = y;
  }
  assert.equal(floorY({ x: CAVE.x, z: CAVE.door.z }), CAVE.floor);
  assert.equal(floorY({ x: CAVE.x + 1, z: (CAVE.inside.minZ + CAVE.inside.maxZ) / 2 }), CAVE.floor);
  assert.ok(insideCave({ x: CAVE.x, z: (CAVE.inside.minZ + CAVE.inside.maxZ) / 2 }));
  assert.ok(!insideCave({ x: 0, z: -8 }));
});

test("tapping the cave rock walks inside it, up the steps through the mouth", () => {
  const r = resolveTap({ x: CAVE.x + 1.5, z: CAVE.inside.maxZ + 2 });
  assert.equal(r.kind, "walk");
  assert.ok(insideCave(r.to), JSON.stringify(r.to));
  const from = { x: 0, z: -8 }, path = routeAround(from, r.to);
  assert.deepEqual(path.at(-1), r.to);
  const i = path.findIndex((p) => p.x === CAVE.foot.x && p.z === CAVE.foot.z), j = path.findIndex((p) => p.x === CAVE.door.x && p.z === CAVE.door.z);
  assert.ok(i >= 0 && j > i, JSON.stringify(path));
  assert.equal(crosses(from, path.slice(0, i + 1), inYardStone), null, JSON.stringify(path));
});

test("leaving the cave for the railing goes out through the mouth and down the steps", () => {
  const from = { x: CAVE.x, z: CAVE.inside.maxZ - 1 }, path = routeAround(from, { x: 3, z: LEAN_Z });
  assert.deepEqual(path.slice(0, 2), [CAVE.door, CAVE.foot]);
  assert.deepEqual(path.at(-1), { x: 3, z: LEAN_Z });
});

test("in the cave there are cushions to sit on facing its Buddha", () => {
  assert.ok(CAVE.seats.length >= 2);
  for (const c of CAVE.seats) {
    assert.ok(insideCave(c), JSON.stringify(c));
    const r = resolveTap({ x: c.x + 0.1, z: c.z - 0.1 });
    assert.equal(r.kind, "sit");
    assert.deepEqual(r.to, { x: c.x, z: c.z });
    assert.ok(Math.abs(r.yaw - Math.atan2(-(CAVE.altar.x - c.x), -(CAVE.altar.z - c.z))) < 1e-9);
    assert.equal(seatAt(r.to), c);
  }
});
