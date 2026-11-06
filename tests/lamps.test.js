import { test } from "node:test";
import assert from "node:assert/strict";
import { LAMPS, lampPower } from "../src/logic/lamps.js";
import { ISLAND, YARD } from "../src/logic/layout.js";

test("there are at most four night lamps, so phones are not asked to draw more", () => {
  assert.ok(LAMPS.length <= 4);
});

test("the lamps are off by day, come up with dusk, and are full at night", () => {
  for (const l of LAMPS) {
    assert.equal(lampPower(l, 0), 0);
    assert.equal(lampPower(l, 0.5), l.power / 2);
    assert.equal(lampPower(l, 1), l.power);
  }
});

test("the yard lamps sit at the stone lanterns, and one lights the island hermitage", () => {
  for (const s of YARD.filter((o) => o.kind === "lantern")) assert.ok(LAMPS.some((l) => l.x === s.x && Math.abs(l.z - s.z) < 1), `lantern at ${s.x}`);
  assert.ok(LAMPS.some((l) => Math.hypot(l.x - ISLAND.x, l.z - ISLAND.z) < ISLAND.r), "one on the island");
});
