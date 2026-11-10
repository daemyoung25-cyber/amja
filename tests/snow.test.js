import { test } from "node:test";
import assert from "node:assert/strict";
import { SNOW_END, snowAmount, snowActive, snowLine } from "../src/logic/snow.js";

const kst = (m, d, h = 12, min = 0) => Date.UTC(2026, m - 1, d, h - 9, min);

test("the first snow stops by itself at 3pm KST on Nov 11", () => {
  assert.equal(SNOW_END, kst(11, 11, 15));
  assert.equal(snowActive(kst(11, 10, 20)), true);
  assert.equal(snowActive(kst(11, 11, 14, 59)), true);
  assert.equal(snowActive(kst(11, 11, 15)), false);
  assert.equal(snowActive(kst(11, 12)), false);
});

test("it falls fully until the last ten minutes, then eases off", () => {
  assert.equal(snowAmount(kst(11, 10, 20)), 1);
  assert.equal(snowAmount(kst(11, 11, 14, 50)), 1);
  assert.equal(snowAmount(kst(11, 11, 14, 55)), 0.5);
  assert.equal(snowAmount(kst(11, 11, 15, 1)), 0);
});

test("the notice shows only while it snows", () => {
  assert.match(snowLine(kst(11, 10, 20)), /첫눈/);
  assert.equal(snowLine(kst(11, 11, 15)), "");
});
