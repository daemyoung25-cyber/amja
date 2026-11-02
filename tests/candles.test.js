import { test } from "node:test";
import assert from "node:assert/strict";
import { CANDLE_LIFE_MS, CANDLE_SLOTS, CANDLE_GAP_MS, liveCandles, pickSlot, burnLeft, canLight } from "../src/logic/candles.js";

const now = 1_800_000_000_000;

test("a candle burns for a day, then is gone", () => {
  const recs = [{ slot: 0, n: "연화", at: now - 1000 }, { slot: 1, n: "자비", at: now - CANDLE_LIFE_MS - 1 }];
  assert.deepEqual(liveCandles(recs, now).map((c) => c.slot), [0]);
});

test("burnLeft goes from 1 when lit to 0 at the end of its life", () => {
  assert.equal(burnLeft({ at: now }, now), 1);
  assert.equal(burnLeft({ at: now - CANDLE_LIFE_MS / 2 }, now), 0.5);
  assert.equal(burnLeft({ at: now - CANDLE_LIFE_MS * 2 }, now), 0);
});

test("liveCandles ignores junk and keeps only the newest candle per slot", () => {
  const recs = [null, { slot: "x", at: now }, { slot: 3, at: now - 5000, n: "a" }, { slot: 3, at: now - 100, n: "b" }, { slot: 99, at: now }];
  const live = liveCandles(recs, now);
  assert.equal(live.length, 1);
  assert.equal(live[0].n, "b");
});

test("a new candle takes the first empty place on the rack", () => {
  assert.equal(pickSlot([], now), 0);
  assert.equal(pickSlot([{ slot: 0, at: now }, { slot: 2, at: now }], now), 1);
});

test("when the rack is full, the candle that has burned longest gives up its place", () => {
  const full = Array.from({ length: CANDLE_SLOTS }, (_, i) => ({ slot: i, at: now - 1000 * (i === 7 ? 50 : 1) }));
  assert.equal(pickSlot(full, now), 7);
});

test("one person lights at most one candle a minute", () => {
  assert.equal(canLight(null, now), true);
  assert.equal(canLight(now - CANDLE_GAP_MS + 1, now), false);
  assert.equal(canLight(now - CANDLE_GAP_MS, now), true);
});
