import { test } from "node:test";
import assert from "node:assert/strict";
import { BOWS, BOW108_SECONDS, bowPhase, bowsDone } from "../src/logic/bows.js";

test("108배 전체 길이: 처음 반배 + 큰절 108번 + 마지막 반배", () => {
  assert.equal(BOWS, 108);
  assert.ok(Math.abs(BOW108_SECONDS - (2.4 + 108 * 7.2 + 1.6)) < 1e-9);
});

test("처음엔 반배, 그 뒤로 큰절 한 번(2.4~9.6초 구간)을 되풀이한다", () => {
  assert.equal(bowPhase(1), 1);
  assert.ok(Math.abs(bowPhase(2.4 + 3) - 5.4) < 1e-9);
  assert.ok(Math.abs(bowPhase(2.4 + 7.2 * 5 + 3) - 5.4) < 1e-9);
});

test("108번을 마치면 마지막 반배로 끝난다", () => {
  const end = 2.4 + 108 * 7.2;
  assert.ok(Math.abs(bowPhase(end + 0.5) - 10.1) < 1e-9);
  assert.equal(bowPhase(BOW108_SECONDS + 5), 11.2);
});

test("몇 번 했는지: 일어서야 한 번으로 센다, 108을 넘지 않는다", () => {
  assert.equal(bowsDone(0), 0);
  assert.equal(bowsDone(2.4 + 7.1), 0);
  assert.equal(bowsDone(2.4 + 7.2), 1);
  assert.equal(bowsDone(2.4 + 7.2 * 36 + 1), 36);
  assert.equal(bowsDone(BOW108_SECONDS + 100), 108);
});
