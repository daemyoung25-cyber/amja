import { test } from "node:test";
import assert from "node:assert/strict";
import { NOVICES, NOVICE_SCALE, NOVICE_BED, JEGI, GONGGI, noviceFor, noviceLine } from "../src/logic/novices.js";
import { petAt, isAsleep } from "../src/logic/pets.js";
import { RAIL_Z, COURTYARD, insideCave, insideHermitage } from "../src/logic/layout.js";

const kst = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);
const NOON = kst(2026, 11, 7, 12), MID = kst(2026, 11, 8, 0);

test("there are five novices, smaller than everyone else", () => {
  assert.equal(NOVICES.length, 5);
  assert.ok(NOVICE_SCALE < 0.8);
});

test("every viewer computes the same novice from the same clock, and no two share a spot", () => {
  for (const tl of NOVICES) assert.deepEqual(petAt(tl, NOON + 54321), petAt(tl, NOON + 54321));
  for (let t = NOON; t < NOON + 3600000; t += 7000) {
    const at = NOVICES.map((tl) => petAt(tl, t)).filter((a) => a.state !== "walk"), keys = new Set(at.map((a) => `${a.x},${a.z}`));
    assert.equal(keys.size, at.length, `shared spot at ${t}`);
  }
});

test("by day they stay in the front yard, playing jegi standing and gonggi sitting, in groups", () => {
  const poses = new Set();
  let groups = 0, moments = 0, walks = 0, n = 0;
  for (let t = NOON; t < NOON + 3 * 3600000; t += 3100, moments++) {
    const now = NOVICES.map((tl) => petAt(tl, t));
    for (const a of now) {
      n++;
      assert.ok(a.x > COURTYARD.minX && a.x < COURTYARD.maxX && a.z > RAIL_Z && a.z <= 3.3, `in the yard ${a.x},${a.z}`);
      assert.ok(!insideCave(a) && !insideHermitage(a));
      if (a.state === "walk") walks++; else poses.add(a.pose);
      if (a.pose === "jegi") assert.ok(Math.hypot(a.x - JEGI.x, a.z - JEGI.z) < JEGI.r + 0.1, "jegi at its ring");
      if (a.pose === "gonggi") assert.ok(Math.hypot(a.x - GONGGI.x, a.z - GONGGI.z) < GONGGI.r + 0.1, "gonggi at its circle");
    }
    const c = (p) => now.filter((a) => a.pose === p).length;
    if (c("jegi") >= 2 || c("gonggi") >= 2) groups++;
  }
  for (const p of ["jegi", "gonggi", "hapjang"]) assert.ok(poses.has(p), p);
  assert.ok(groups / moments > 0.6, `playing together ${groups / moments}`);
  assert.ok(walks / n > 0.01 && walks / n < 0.25, `walks ${walks / n}`);
});

test("they change games together: once settled, a round has at least two children at any game being played", () => {
  let rounds = 0;
  for (let n = 0; n < 200; n++) {
    const t = NOON + n * 110000, base = Math.floor(t / 110000) * 110000 + 70000;   // 판 중간, 모두 자리에 앉은 때
    const poses = NOVICES.map((tl) => petAt(tl, base));
    for (const game of ["jegi", "gonggi"]) {
      const c = poses.filter((a) => a.pose === game).length;
      if (c) { assert.ok(c >= 2, `only ${c} at ${game} at ${base}`); rounds++; }
    }
  }
  assert.ok(rounds > 100, `rounds ${rounds}`);
});

test("at midnight they walk into the hall and are out of sight until morning, with no jumps", () => {
  for (const tl of NOVICES) {
    assert.equal(isAsleep(tl, MID - 60000), false);
    const deep = petAt(tl, MID + 3600000);
    assert.equal(deep.inside, true);
    assert.deepEqual([deep.x, deep.z], [NOVICE_BED.x, NOVICE_BED.z]);
    let prev = petAt(tl, MID - 30000);
    for (let t = MID - 29500; t < MID + 600000; t += 500) {
      const a = petAt(tl, t);
      assert.ok(Math.hypot(a.x - prev.x, a.z - prev.z) < 1, `jump at ${t - MID}`);
      prev = a;
    }
  }
});

test("the schedule repeats without a jump", () => {
  for (const tl of NOVICES) {
    const end = tl.total * 1000, base = Math.ceil(NOON / end) * end;
    const a = petAt(tl, base - 200), b = petAt(tl, base + 200);
    assert.ok(Math.hypot(a.x - b.x, a.z - b.z) < 1);
  }
});

test("whoever comes in is greeted by name, by the same novice on every screen", () => {
  assert.equal(noviceFor("연화"), noviceFor("연화"));
  assert.ok(noviceFor("연화") >= 0 && noviceFor("연화") < 5);
  assert.match(noviceLine("연화", "f"), /^연화보살님, /);
  assert.match(noviceLine("법운", "m"), /^법운처사님, /);
  assert.ok(!noviceLine("두툼한보지살", "f").includes("보지"), "a bad name is not said aloud");
});
