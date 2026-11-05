import { test } from "node:test";
import assert from "node:assert/strict";
import { BIRDS, birdAt, birdSpotOk, butterflyAt, BUTTERFLIES, gullAt, GULLS, critterDay } from "../src/logic/critters.js";
import { mulberry32, segAt } from "../src/logic/itinerary.js";
import { COURTYARD, HALL, RAIL_Z, YARD, STATUE, ISLAND, PRAYER, insideHall, insideCave, insideHermitage } from "../src/logic/layout.js";

const T0 = 1793800000;   // 2026년 11월쯤의 서버 시계(초)

test("every viewer computes the same bird from the same clock", () => {
  for (const t of [T0, T0 + 123.4, T0 + 99999.9]) assert.deepEqual(birdAt(BIRDS[0], t), birdAt(BIRDS[0], t));
  const a = birdAt(BIRDS[0], T0), b = birdAt(BIRDS[1], T0);
  assert.ok(a.x !== b.x || a.z !== b.z, "the two birds are in different places");
});

test("a yard bird stays in the open yard, never in a hall, cave, hermitage or an object", () => {
  for (const tl of BIRDS) {
    for (let t = T0; t < T0 + tl.total; t += 0.7) {
      const b = birdAt(tl, t), p = { x: b.x, z: b.z };
      assert.ok(b.x > COURTYARD.minX && b.x < COURTYARD.maxX && b.z > RAIL_Z && b.z < HALL.minZ, `in yard ${b.x},${b.z}`);
      assert.ok(!insideHall(p) && !insideCave(p) && !insideHermitage(p));
      for (const o of [...YARD, { x: STATUE.x, z: STATUE.z, r: STATUE.baseR }]) assert.ok(Math.hypot(b.x - o.x, b.z - o.z) >= o.r, `${o.kind} ${b.x},${b.z}`);
      assert.ok(!(b.x > PRAYER.minX && b.x < PRAYER.maxX && b.z > PRAYER.minZ && b.z < PRAYER.maxZ), "not on the prayer cushions");
    }
  }
});

test("a yard bird rests, hops and flies low, resting on the ground", () => {
  const seen = new Set();
  let top = 0;
  for (let t = T0; t < T0 + 1800; t += 0.05) {
    const b = birdAt(BIRDS[0], t);
    seen.add(b.state);
    top = Math.max(top, b.y);
    if (b.state === "rest") assert.equal(b.y, 0);
    if (b.state === "hop") assert.ok(b.y <= 0.1, "a hop stays near the ground");
    assert.ok(b.y >= 0);
  }
  assert.deepEqual([...seen].sort(), ["fly", "hop", "rest"]);
  assert.ok(top > 0.4 && top <= 1.5, `flies low, top ${top}`);
});

test("a bird never jumps, even where its schedule repeats", () => {
  for (const tl of BIRDS) {
    const start = Math.ceil(T0 / tl.total) * tl.total - 600;
    let prev = birdAt(tl, start);
    for (let t = start + 0.1; t < start + 1200; t += 0.1) {
      const b = birdAt(tl, t);
      assert.ok(Math.hypot(b.x - prev.x, b.z - prev.z) < 0.6, `jump at ${t - start}`);
      prev = b;
    }
  }
});

test("a butterfly mostly flutters but sometimes sits on a lotus flower, slowly opening and closing", () => {
  assert.equal(BUTTERFLIES.length, 2);
  for (const h of BUTTERFLIES) {
    let sits = 0, n = 0, slowest = 0, prevSit = null;
    for (let t = T0; t < T0 + h.tl.total; t += 0.1, n++) {
      const f = butterflyAt(h, t);
      if (f.state !== "sit") { prevSit = null; continue; }
      sits++;
      assert.ok(YARD.some((o) => o.kind === "pot" && Math.abs(o.x - f.x) < 0.1 && Math.abs(o.z - f.z) < 0.01), `on a pot's flower ${f.x},${f.z}`);
      assert.ok(Math.abs(f.y - 0.93) < 0.01);
      if (prevSit != null) slowest = Math.max(slowest, Math.abs(f.wing - prevSit));
      prevSit = f.wing;
    }
    assert.ok(sits / n > 0.15 && sits / n < 0.4, `sits ${sits / n}`);
    assert.ok(slowest < 0.06, `slow wings ${slowest}`);
  }
});

test("butterflies never jump, and stay by the pots without passing through stone things", () => {
  const solid = YARD.filter((o) => o.kind !== "pot");
  for (const h of BUTTERFLIES) {
    const start = Math.ceil(T0 / h.tl.total) * h.tl.total - 300;
    let prev = butterflyAt(h, start);
    for (let t = start; t < start + h.tl.total; t += 0.1) {
      const f = butterflyAt(h, t);
      assert.ok(Math.hypot(f.x - prev.x, f.y - prev.y, f.z - prev.z) < 0.35, `jump at ${t - start}`);
      assert.ok(Math.abs(f.x) < COURTYARD.maxX, `inside the wall ${f.x}`);
      assert.ok(f.y > 0.6 && f.y < 2, `height ${f.y}`);
      for (const o of solid) assert.ok(Math.hypot(f.x - o.x, f.z - o.z) > o.r, `${o.kind} ${f.x},${f.z}`);
      assert.ok(f.wing >= 0 && f.wing <= 1);
      prev = f;
    }
  }
});

test("gulls stay out over the sea, clear of the island, and mostly glide", () => {
  assert.ok(GULLS.length >= 4 && GULLS.length <= 5);
  for (const g of GULLS) {
    let gliding = 0, n = 0;
    for (let t = 0; t < 600; t += 0.1, n++) {
      const a = gullAt(g, t);
      assert.ok(a.z < RAIL_Z - 8, `over the sea ${a.z}`);
      assert.ok(Math.hypot(a.x - ISLAND.x, a.z - ISLAND.z) > ISLAND.r + 8, "clear of the island");
      assert.ok(a.y > 5, `above the bridge and hermitage ${a.y}`);
      if (a.flapping === 0) gliding++;
    }
    assert.ok(gliding / n > 0.6, `glides ${gliding / n}`);
  }
});

test("a gull's heading follows the way it is actually going", () => {
  const g = GULLS[0];
  const a = gullAt(g, 10), b = gullAt(g, 10.05);
  const want = Math.atan2(-(b.x - a.x), -(b.z - a.z));
  assert.ok(Math.abs(Math.atan2(Math.sin(a.yaw - want), Math.cos(a.yaw - want))) < 0.05);
});

test("the creatures are out by day and gone at night", () => {
  assert.equal(critterDay(30), true);
  assert.equal(critterDay(0), true);
  assert.equal(critterDay(-6), false);
});

test("the seeded numbers are pure integer math, so every browser builds the same schedule", () => {
  const r = mulberry32(1);
  assert.deepEqual([r(), r()], [0.6270739405881613, 0.002735721180215478]);
  assert.ok(segAt(BIRDS[0], T0).seg);
  assert.ok(birdSpotOk({ x: 1, z: -8 }));
});
