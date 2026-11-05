import { test } from "node:test";
import assert from "node:assert/strict";
import { TEA, TEA_ROOM, COURTYARD, HALL, RAIL_Z, BAEK_KENNEL, BRIDGE, insideTea, teaSeatAt, seatAt, faceSeat, floorY, resolveTap, clampToWalkable, routeAround, nearestLeanSpot, LEAN_Z } from "../src/logic/layout.js";
import { petSpotOk, careSpot, DOG, BAEK, CAT } from "../src/logic/pets.js";

const left = TEA.x - TEA.w / 2, right = TEA.x + TEA.w / 2, front = TEA.z - TEA.d / 2, back = TEA.z + TEA.d / 2;
const inBuilding = (p) => p.x > left && p.x < right && p.z > front && p.z < back;

test("the yard grows only to the right of the hall and the sugar dog's house stays where it was", () => {
  assert.equal(COURTYARD.minX, -40);
  assert.equal(COURTYARD.maxX, 26);
  assert.equal(BAEK_KENNEL.x, -19.75);
  assert.equal(clampToWalkable({ x: -80, z: 0 }).x, COURTYARD.minX);
});

test("the tea room stands in the new part at the sea end, clear of the bridge", () => {
  assert.ok(right < -26 && left > COURTYARD.minX, `${left} ${right}`);
  assert.ok(front > RAIL_Z + 3 && front < RAIL_Z + 6, String(front));
  assert.ok(right < BRIDGE.a.x - 4);
});

test("tapping a cushion sits you down facing the sea", () => {
  assert.equal(TEA.seats.length, 4);
  for (const c of TEA.seats) {
    assert.ok(insideTea(c));
    const r = resolveTap({ x: c.x + 0.2, z: c.z - 0.2 });
    assert.equal(r.kind, "sit");
    assert.deepEqual(r.to, c);
    assert.equal(seatAt(c), c);
    assert.equal(teaSeatAt(c), c);
    assert.ok(Math.abs(faceSeat(c)) < 1e-9, "faces the sea");
  }
  assert.equal(teaSeatAt({ x: 0, z: 8.6 }), null, "a hall cushion is not a tea seat");
});

test("the seats do not sit on the tea tables and the door path to them is free", () => {
  for (const t of TEA.tables) for (const c of TEA.seats) assert.ok(Math.hypot(t.x - c.x, t.z - c.z) > t.r + 0.35);
  for (const c of TEA.seats) for (const t of TEA.tables) {
    const dx = c.x - TEA.door.x, dz = c.z - TEA.door.z, u = Math.max(0, Math.min(1, ((t.x - TEA.door.x) * dx + (t.z - TEA.door.z) * dz) / (dx * dx + dz * dz)));
    assert.ok(Math.hypot(TEA.door.x + dx * u - t.x, TEA.door.z + dz * u - t.z) > t.r);
  }
});

test("the floor rises from the ground up the front step to the raised floor", () => {
  assert.equal(floorY(TEA.door), 0);
  assert.equal(floorY({ x: TEA.x, z: TEA.z }), TEA.fy);
  const mid = floorY({ x: TEA.x, z: front - 0.35 });
  assert.ok(mid > 0 && mid < TEA.fy, String(mid));
  assert.equal(floorY({ x: right + 0.5, z: TEA.z }), 0);
});

test("tapping a wall or the roof takes you inside, never into a wall", () => {
  for (const p of [{ x: TEA.x, z: back - 0.05 }, { x: left + 0.05, z: TEA.z }, { x: right - 0.05, z: TEA.z - 1 }]) {
    const to = clampToWalkable(p);
    assert.ok(insideTea(to), JSON.stringify(to));
  }
});

test("you walk in and out through the open front and around the walls", () => {
  const starts = [{ x: 0, z: -10 }, { x: -20, z: 12 }, { x: -38, z: -15 }, { x: -38, z: -25 }, { x: -28, z: -25 }, { x: -33, z: -10 }, { x: -33, z: -16 }, { x: -13.5, z: 28 }, { x: 0, z: 9 }, BRIDGE.head, { x: -28, z: -18 }];
  const seat = TEA.seats[0];
  const crosses = (a, b) => { for (let i = 1; i < 200; i++) if (inBuilding({ x: a.x + (b.x - a.x) * i / 200, z: a.z + (b.z - a.z) * i / 200 })) return true; return false; };
  for (const s of starts) {
    const way = routeAround(s, seat), pts = [s, ...way];
    assert.deepEqual(way[way.length - 1], seat);
    assert.ok(pts.some((p) => p === TEA.door), `through the door from ${JSON.stringify(s)}`);
    for (let i = 1; i < pts.length; i++) if (pts[i - 1] !== TEA.door && pts[i] !== seat) assert.ok(!crosses(pts[i - 1], pts[i]), `in ${JSON.stringify(s)} ${i} ${JSON.stringify(pts)}`);
    const out = routeAround(seat, s);
    assert.equal(out[0], TEA.door, "leaves by the door");
    const opts = [TEA.door, ...out];
    for (let i = 1; i < opts.length; i++) assert.ok(!crosses(opts[i - 1], opts[i]), `out ${JSON.stringify(s)} ${JSON.stringify(opts)}`);
  }
  const far = routeAround({ x: -38, z: -20 }, { x: -27, z: -20 });
  const pts = [{ x: -38, z: -20 }, ...far];
  for (let i = 1; i < pts.length; i++) assert.ok(!crosses(pts[i - 1], pts[i]), `past ${JSON.stringify(pts)}`);
});

test("you can lean on the new stretch of the railing", () => {
  assert.deepEqual(nearestLeanSpot({ x: -35 }), { x: -35, z: LEAN_Z, yaw: 0 });
  assert.equal(nearestLeanSpot({ x: -90 }).x, COURTYARD.minX + 0.5);
  assert.equal(nearestLeanSpot({ x: 90 }).x, COURTYARD.maxX - 0.5);
});

test("the animals walk the new yard but stay out of the tea room", () => {
  assert.equal(petSpotOk({ x: TEA.x, z: TEA.z }), false);
  assert.equal(petSpotOk({ x: TEA.x, z: front - 0.3 }), false, "not on the step");
  assert.equal(petSpotOk({ x: -35, z: -10 }), true);
  let reached = 0;
  for (const tl of [DOG, BAEK, CAT]) {
    for (const s of tl.segs) {
      const spots = s.kind === "rest" ? [s.at] : [0.25, 0.5, 0.75].map((u) => ({ x: s.from.x + (s.to.x - s.from.x) * u, z: s.from.z + (s.to.z - s.from.z) * u }));
      for (const p of spots) {
        assert.ok(!inBuilding(p), JSON.stringify(p));
        if (p.x < -26) reached++;
      }
    }
  }
  assert.ok(reached > 0, "someone visits the new yard");
});

test("walking up to an animal outside never ends inside the tea room", () => {
  for (const tl of [DOG, BAEK, CAT]) for (const seg of tl.segs.filter((s) => s.kind === "rest")) for (let k = 0; k < 16; k++) {
    const a = (k / 16) * Math.PI * 2, me = clampToWalkable({ x: seg.at.x + Math.cos(a) * 2.6, z: seg.at.z + Math.sin(a) * 2.6 });
    if (insideTea(me)) continue;
    const spot = careSpot(seg.at, me);
    if (spot) assert.ok(!insideTea(clampToWalkable(spot)), JSON.stringify([seg.at, me]));
  }
});

test("the camera stays under the roof inside", () => {
  assert.ok(TEA_ROOM.maxY < TEA.fy + TEA.wallH);
  assert.ok(TEA_ROOM.maxZ < back && TEA_ROOM.minX > left && TEA_ROOM.maxX < right);
  assert.ok(HALL.minX > COURTYARD.minX);
});
