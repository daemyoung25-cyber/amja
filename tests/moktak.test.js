import { test } from "node:test";
import assert from "node:assert/strict";
import { MOKTAK_HITS, CHANT_LEN, strikeLift } from "../src/logic/moktak.js";
import { MONK, CUSHIONS, INSIDE, ALTAR, clampToWalkable } from "../src/logic/layout.js";

test("moktak hits are in order inside the chant loop", () => {
  assert.ok(MOKTAK_HITS.length > 50);
  for (let i = 1; i < MOKTAK_HITS.length; i++) assert.ok(MOKTAK_HITS[i][0] > MOKTAK_HITS[i - 1][0]);
  assert.ok(MOKTAK_HITS.at(-1)[0] < CHANT_LEN);
  for (const [, s] of MOKTAK_HITS) assert.ok(s >= 0 && s <= 1);
});

test("the stick is down on each hit, raised between hits, and resting when the chant is off", () => {
  const hits = [[1, 1], [3, 0.5]], len = 5;
  assert.equal(strikeLift(1, hits, len), 0);
  assert.equal(strikeLift(3, hits, len), 0);
  assert.ok(Math.abs(strikeLift(2, hits, len) - (0.35 + 0.65 * 0.5)) < 1e-9);   // 다음 타격 세기만큼 든다
  assert.ok(strikeLift(2.9, hits, len) < strikeLift(2.7, hits, len));          // 내려치는 중
  assert.ok(strikeLift(4.5, hits, len) > 0 && strikeLift(6, hits, len) === strikeLift(1, hits, len));   // 반복
  assert.equal(strikeLift(null, hits, len), 0);
});

test("the monk sits front and centre before the altar (that cushion is his), clear of every other cushion", () => {
  assert.ok(MONK.x === ALTAR.x && MONK.z < ALTAR.z && MONK.z > INSIDE.minZ);
  assert.equal(CUSHIONS.length, 14);
  for (const c of CUSHIONS) assert.ok(Math.hypot(c.x - MONK.x, c.z - MONK.z) > MONK.r + 0.4, JSON.stringify(c));
  // 경상(스님 앞 0.66m, 반폭 0.48)도 방석과 안 겹친다
  const L = Math.hypot(ALTAR.x - MONK.x, ALTAR.z - MONK.z), dx = MONK.x + (ALTAR.x - MONK.x) / L * 0.66, dz = MONK.z + (ALTAR.z - MONK.z) / L * 0.66;
  for (const c of CUSHIONS) assert.ok(Math.hypot(c.x - dx, c.z - dz) > 0.48 + 0.33, JSON.stringify(c));
  const p = clampToWalkable({ x: MONK.x, z: MONK.z + 0.1 });
  assert.ok(Math.hypot(p.x - MONK.x, p.z - MONK.z) >= MONK.r - 1e-9, JSON.stringify(p));
});

test("every chant track exists, has a unique id, and its moktak hits fit inside it", async () => {
  const { CHANTS, chantById } = await import("../src/logic/chants.js");
  const { existsSync } = await import("node:fs");
  assert.ok(CHANTS.length >= 5);
  assert.equal(new Set(CHANTS.map((c) => c.id)).size, CHANTS.length);
  for (const c of CHANTS) {
    assert.ok(existsSync(new URL("../" + c.url, import.meta.url)), c.url);
    for (let i = 0; i < c.hits.length; i++) {
      assert.ok(c.hits[i][0] >= 0 && c.hits[i][0] < c.len);
      if (i) assert.ok(c.hits[i][0] > c.hits[i - 1][0]);
    }
  }
  assert.equal(chantById("nope").id, CHANTS[0].id);          // 모르는 값이 저장돼 있으면 첫 녹음
});
