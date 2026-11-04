import { test } from "node:test";
import assert from "node:assert/strict";
import { packBongsong, andJosa, RICE_CAKES, FRUITS } from "../src/logic/bongsong.js";
import { BONGSONG, resolveTap, clampToWalkable, nearBongsong, faceBongsong, routeAround } from "../src/logic/layout.js";

test("a bongsong bundle holds one rice cake and one fruit, joined with the right particle", () => {
  assert.equal(packBongsong(() => 0).text, "백설기와 사과");
  assert.equal(packBongsong(() => 0.25).text, "시루떡과 배");
  assert.equal(packBongsong(() => 0.999).text, "약과와 귤");
  for (let i = 0; i < 50; i++) {
    const b = packBongsong();
    assert.ok(RICE_CAKES.includes(b.cake) && FRUITS.includes(b.fruit));
  }
  assert.equal(andJosa("인절미"), "와");
  assert.equal(andJosa("절편"), "과");
});

test("tapping the bosal's table walks to the spot in front of it, facing her", () => {
  const r = resolveTap({ x: BONGSONG.table.x + 0.3, z: BONGSONG.table.z });
  assert.equal(r.kind, "bongsong");
  assert.deepEqual(r.to, BONGSONG.spot);
  assert.ok(nearBongsong(r.to));
  assert.ok(Math.abs(faceBongsong(BONGSONG.spot)) < 1e-9);     // 보살님 쪽 = 바다 쪽(-z, yaw 0)을 보고 선다
});

test("nobody walks through the bosal and her table", () => {
  const p = clampToWalkable({ x: BONGSONG.x, z: BONGSONG.z - 0.2 });
  assert.ok(Math.hypot(p.x - BONGSONG.x, p.z - BONGSONG.z) >= BONGSONG.r);
  const path = routeAround({ x: 0, z: -10 }, { x: 0, z: -20 });
  assert.ok(path.length > 1, "goes round");
});
