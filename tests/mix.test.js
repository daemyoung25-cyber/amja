import { test } from "node:test";
import assert from "node:assert/strict";
import { layerGains } from "../src/logic/mix.js";
import { COURTYARD, CHIME, LEAN_Z } from "../src/logic/layout.js";

const ALL = { waves: true, chime: true, chant: true };
const near = (a, b, eps) => assert.ok(Math.abs(a - b) <= eps, `${a} vs ${b}`);

test("at the railing the waves are loud and the chant at most a third of them", () => {
  const g = layerGains({ x: 0, z: LEAN_Z }, ALL);
  assert.ok(g.waves >= 0.95, String(g.waves));
  assert.ok(g.chant <= g.waves / 3, `${g.chant} > ${g.waves}/3`);
});

test("at the hall door the chant is clear but never above 0.6", () => {
  const g = layerGains({ x: 0, z: 5 }, ALL);
  near(g.chant, 0.6, 0.01);
  near(g.waves, 0.35, 0.05);
});

test("chant never exceeds 0.6 anywhere and every gain stays in 0..1", () => {
  for (let i = 0; i <= 30; i++) for (let j = 0; j <= 30; j++) {
    const p = { x: COURTYARD.minX + (COURTYARD.maxX - COURTYARD.minX) * i / 30, z: COURTYARD.minZ + (COURTYARD.maxZ - COURTYARD.minZ) * j / 30 };
    const g = layerGains(p, ALL);
    assert.ok(g.chant <= 0.6 + 1e-9);
    for (const v of Object.values(g)) assert.ok(v >= 0 && v <= 1);
  }
});

test("the wind chime is 0.45 under the eaves and 0.3 at the railing", () => {
  near(layerGains({ x: CHIME.x, z: CHIME.z }, ALL).chime, 0.45, 1e-9);
  near(layerGains({ x: 0, z: LEAN_Z }, ALL).chime, 0.3, 1e-9);
});

test("a switched-off layer is silent and the others are unchanged", () => {
  const on = layerGains({ x: 2, z: 1 }, ALL);
  const off = layerGains({ x: 2, z: 1 }, { ...ALL, chant: false });
  assert.equal(off.chant, 0);
  assert.equal(off.waves, on.waves);
  assert.equal(off.chime, on.chime);
});

test("inside the hall the chant is full and the waves are far off", () => {
  const g = layerGains({ x: 0, z: 8 }, ALL);
  near(g.chant, 0.6, 1e-9);
  assert.ok(g.waves <= 0.3, String(g.waves));
});

test("the evening service plays everywhere, a little softer inside the hall", () => {
  const out = layerGains({ x: 0, z: -2 }, { ...ALL, evening: true });
  const inside = layerGains({ x: 0, z: 9 }, { ...ALL, evening: true });
  assert.ok(out.evening > 0.4 && out.evening <= 1, String(out.evening));
  assert.ok(inside.evening > 0 && inside.evening < out.evening, `${inside.evening} vs ${out.evening}`);
  assert.equal(layerGains({ x: 0, z: -2 }, ALL).evening, 0);
});
