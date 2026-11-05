import { test } from "node:test";
import assert from "node:assert/strict";
import { newBird, stepBird, birdSpotOk, butterflyAt, BUTTERFLIES, gullAt, GULLS, critterDay } from "../src/logic/critters.js";
import { COURTYARD, HALL, RAIL_Z, YARD, STATUE, ISLAND, PRAYER, insideHall, insideCave, insideHermitage } from "../src/logic/layout.js";
import { mulberry32 } from "./helpers-rng.js";

const run = (seed, seconds, player = null, each = () => {}) => {
  const rnd = mulberry32(seed);
  const b = newBird(rnd);
  for (let i = 0; i < seconds * 30; i++) { stepBird(b, 1 / 30, player, rnd); each(b); }
  return b;
};

test("a yard bird stays in the open yard, never in a hall, cave, hermitage or an object", () => {
  for (const seed of [1, 2, 3, 4]) {
    run(seed, 300, null, (b) => {
      assert.ok(b.x > COURTYARD.minX && b.x < COURTYARD.maxX && b.z > RAIL_Z && b.z < HALL.minZ, `in yard ${b.x},${b.z}`);
      const p = { x: b.x, z: b.z };
      assert.ok(!insideHall(p) && !insideCave(p) && !insideHermitage(p));
      for (const o of [...YARD, { x: STATUE.x, z: STATUE.z, r: STATUE.baseR }]) assert.ok(Math.hypot(b.x - o.x, b.z - o.z) >= o.r, `${o.kind} ${b.x},${b.z}`);
      assert.ok(!(b.x > PRAYER.minX && b.x < PRAYER.maxX && b.z > PRAYER.minZ && b.z < PRAYER.maxZ), "not on the prayer cushions");
    });
  }
});

test("a yard bird both hops on the ground and flies low, and rests on the ground", () => {
  const seen = new Set();
  let top = 0;
  run(7, 300, null, (b) => {
    seen.add(b.state);
    top = Math.max(top, b.y);
    if (b.state === "rest") assert.equal(b.y, 0);
    if (b.state === "hop") assert.ok(b.y <= 0.1, "a hop stays near the ground");
    assert.ok(b.y >= 0);
  });
  assert.deepEqual([...seen].sort(), ["fly", "hop", "rest"]);
  assert.ok(top > 0.4 && top <= 1.5, `flies low, top ${top}`);
});

test("a yard bird flies away from someone who comes very close", () => {
  const rnd = mulberry32(11);
  const b = newBird(rnd);
  b.x = 5; b.z = -10; b.state = "rest"; b.timer = 5;
  const player = { x: 5.5, z: -10 };
  stepBird(b, 1 / 30, player, rnd);
  assert.equal(b.state, "fly");
  for (let i = 0; i < 600 && b.state === "fly"; i++) stepBird(b, 1 / 30, player, rnd);
  assert.ok(Math.hypot(b.x - player.x, b.z - player.z) > 2.5, "lands farther away");
});

test("a yard bird far from someone in the yard drifts toward them, so it can be seen in the big yard", () => {
  const player = { x: 20, z: -20 };
  const rnd = mulberry32(5);
  const b = newBird(rnd);
  b.x = -20; b.z = 0;
  const start = Math.hypot(b.x - player.x, b.z - player.z);
  let closest = start;
  for (let i = 0; i < 30 * 180; i++) { stepBird(b, 1 / 30, player, rnd); closest = Math.min(closest, Math.hypot(b.x - player.x, b.z - player.z)); }
  assert.ok(closest < 12, `closest ${closest}`);
});

test("a huge frame gap (tab came back) does not throw a bird out of the yard", () => {
  const rnd = mulberry32(3);
  const b = newBird(rnd);
  for (let i = 0; i < 200; i++) stepBird(b, 60, null, rnd);
  assert.ok(birdSpotOk(b) || b.state !== "rest");
  assert.ok(b.x > COURTYARD.minX && b.x < COURTYARD.maxX);
});

test("butterflies flutter by the lotus pots without passing through the stone things", () => {
  assert.equal(BUTTERFLIES.length, 2);
  const solid = [...YARD.filter((o) => o.kind !== "pot")];
  for (const home of BUTTERFLIES) {
    let lo = Infinity, hi = -Infinity;
    for (let t = 0; t < 1200; t += 0.1) {
      const f = butterflyAt(home, t);
      lo = Math.min(lo, f.y); hi = Math.max(hi, f.y);
      assert.ok(Math.abs(f.x) < COURTYARD.maxX, `inside the wall ${f.x}`);
      for (const o of solid) assert.ok(Math.hypot(f.x - o.x, f.z - o.z) > o.r, `${o.kind} ${f.x},${f.z}`);
      assert.ok(f.wing >= 0 && f.wing <= 1);
    }
    assert.ok(lo > 0.6 && hi < 2, `height ${lo}..${hi}`);
    assert.ok(Math.hypot(home.x - 24.8 * Math.sign(home.x), home.z - 1.6) < 3, "by the pots");
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
