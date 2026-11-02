import { test } from "node:test";
import assert from "node:assert/strict";
import { decodeDem, demSampler } from "../src/logic/dem.js";

// 픽셀 하나 = (R*256+G)/10 - 20 m
const px = (h) => { const v = Math.round((h + 20) * 10); return [v >> 8, v & 255, 0, 255]; };

test("heights come back from the R,G bytes in decimetres with a 20 m offset", () => {
  const rgba = new Uint8ClampedArray([...px(0), ...px(692), ...px(-9.1), ...px(12.3)]);
  const d = decodeDem(rgba, 2, 2);
  assert.deepEqual([...d].map((v) => Math.round(v * 10) / 10), [0, 692, -9.1, 12.3]);
});

test("the sampler puts the origin pixel at (0,0), north (+z) is up the image, and scales both ways", () => {
  // 3x3, origin in the middle; the row above (north) is 100 m, the middle 10 m, below (south) 0
  const data = Float32Array.from([100, 100, 100, 10, 10, 10, 0, 0, 0]);
  const s = demSampler({ data, w: 3, h: 3, originX: 1, originY: 1, mpp: 30, sh: 0.5, sv: 0.4 });
  assert.equal(s(0, 0), 10 * 0.4);
  assert.equal(s(0, 15), 100 * 0.4);         // 15 m in the scene = 30 m real = one pixel north
  assert.equal(s(0, -15), 0);
  assert.equal(s(0, 7.5), 55 * 0.4);         // half way, bilinear
});

test("outside the map is open sea", () => {
  const s = demSampler({ data: Float32Array.from([5, 5, 5, 5]), w: 2, h: 2, originX: 0, originY: 0, mpp: 30, sh: 1, sv: 1 });
  assert.equal(s(-1000, 0), 0);
  assert.equal(s(0, -1000), 0);
});
