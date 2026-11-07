import { test } from "node:test";
import assert from "node:assert/strict";
import { GIWA_SLOTS, GIWA_ROWS, liveGiwa, pickGiwaSlot, canPlaceGiwa, giwaCell } from "../src/logic/giwa.js";
import { GIWA, GIWA_WALL, WISH, COURTYARD, resolveTap, clampToWalkable, nearGiwa, faceGiwa } from "../src/logic/layout.js";

test("tiles pile up one at a time: the bottom course of a column first, then upward, then the next column", () => {
  assert.deepEqual(giwaCell(0), { col: 0, row: 0 });
  assert.deepEqual(giwaCell(GIWA_ROWS - 1), { col: 0, row: GIWA_ROWS - 1 });
  assert.deepEqual(giwaCell(GIWA_ROWS), { col: 1, row: 0 });
  assert.equal(pickGiwaSlot([]), 0);
  assert.equal(pickGiwaSlot([{ slot: 0, at: 1 }, { slot: 1, at: 2 }]), 2);
  assert.equal(pickGiwaSlot([{ slot: 1, at: 2 }]), 0, "a gap is filled first");
});

test("when the wall is full the oldest tile's place is used; each place shows its newest tile", () => {
  const full = Array.from({ length: GIWA_SLOTS }, (_, slot) => ({ slot, at: 1000 + slot }));
  full[7].at = 5;
  assert.equal(pickGiwaSlot(full), 7);
  const live = liveGiwa([{ slot: 3, at: 1, n: "옛" }, { slot: 3, at: 2, n: "새" }, { slot: 999, at: 1 }, { slot: 1.5, at: 1 }, null]);
  assert.deepEqual(live.map((g) => g.n), ["새"]);
});

test("one tile a minute from each person", () => {
  assert.equal(canPlaceGiwa(null, 1000), true);
  assert.equal(canPlaceGiwa(1000, 30000), false);
  assert.equal(canPlaceGiwa(1000, 62000), true);
});

test("the table stands by the old tile stand in front of the wish rack, and you can walk up to it", () => {
  assert.ok(Math.hypot(GIWA.x - WISH.x, GIWA.z - WISH.z) < 9);
  const p = clampToWalkable(GIWA.spot);
  assert.ok(Math.hypot(p.x - GIWA.spot.x, p.z - GIWA.spot.z) < 0.01, "the spot is free");
  const tap = resolveTap({ x: GIWA.x, z: GIWA.z });
  assert.equal(tap.kind, "giwa");
  assert.deepEqual(tap.to, GIWA.spot);
  assert.ok(nearGiwa(GIWA.spot));
  assert.ok(!nearGiwa({ x: 0, z: 0 }));
  assert.ok(Math.abs(faceGiwa(GIWA.spot) + Math.PI / 2) < 0.2, "faces the table and the wall behind it");
});

test("the pile lies along the wall behind the table, inside the yard", () => {
  assert.ok(GIWA_WALL.x > GIWA.x && GIWA_WALL.x < COURTYARD.maxX + 0.2);
  assert.ok(GIWA_WALL.z - 36 * 0.3 > -27, "does not run past the rail");
});
