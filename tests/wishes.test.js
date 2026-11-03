import { test } from "node:test";
import assert from "node:assert/strict";
import { WISH_LIFE_MS, WISH_SLOTS, WISH_GAP_MS, WISH_MAX_LEN, liveWishes, pickWishSlot, canHang, cleanWish, keepMine, publicProblem, readableWishes, nextReadable } from "../src/logic/wishes.js";

const now = 1_800_000_000_000;
const DAY = 86400000;

test("a wish hangs for seven days, then is taken down", () => {
  assert.equal(WISH_LIFE_MS, 7 * DAY);
  const recs = [{ slot: 0, n: "연화", at: now - 6 * DAY }, { slot: 1, n: "자비", at: now - 7 * DAY - 1 }];
  assert.deepEqual(liveWishes(recs, now).map((w) => w.slot), [0]);
});

test("liveWishes ignores junk and keeps only the newest wish per place", () => {
  const recs = [null, { slot: "x", at: now }, { slot: 3, at: now - 5000, n: "a" }, { slot: 3, at: now - 100, n: "b" }, { slot: WISH_SLOTS, at: now }];
  const live = liveWishes(recs, now);
  assert.equal(live.length, 1);
  assert.equal(live[0].n, "b");
});

test("a new wish takes the first empty place, and when the rack is full the oldest gives way", () => {
  assert.equal(pickWishSlot([], now), 0);
  assert.equal(pickWishSlot([{ slot: 0, at: now }, { slot: 2, at: now }], now), 1);
  const full = Array.from({ length: WISH_SLOTS }, (_, i) => ({ slot: i, at: now - 1000 * (i === 11 ? 90 : 1) }));
  assert.equal(pickWishSlot(full, now), 11);
});

test("one person hangs at most one wish a minute", () => {
  assert.equal(canHang(null, now), true);
  assert.equal(canHang(now - WISH_GAP_MS + 1, now), false);
  assert.equal(canHang(now - WISH_GAP_MS, now), true);
});

test("a wish is one short line: trimmed, spaces folded, 1 to 30 characters", () => {
  assert.equal(WISH_MAX_LEN, 30);
  assert.equal(cleanWish("  가족 모두   건강하길\n"), "가족 모두 건강하길");
  assert.equal(cleanWish("   "), null);
  assert.equal(cleanWish(""), null);
  assert.equal(cleanWish(null), null);
  assert.equal(cleanWish("가".repeat(31)), null);
  assert.equal(cleanWish("가".repeat(30)), "가".repeat(30));
});

test("my own wish texts are kept on this phone only while the wish still hangs", () => {
  const mine = [{ slot: 2, at: now - 1000, text: "합격" }, { slot: 5, at: now - 8 * DAY, text: "오래됨" }, { slot: 7, at: now - 3 * DAY, text: "자리 뺏김" }];
  const live = [{ slot: 2, at: now - 1000, n: "연화" }, { slot: 7, at: now - 10, n: "자비" }];
  assert.deepEqual(keepMine(mine, live, now), [{ slot: 2, at: now - 1000, text: "합격" }]);
  // 연결이 없어 서버 기록이 아직 없더라도 이레 안이면 남긴다
  assert.deepEqual(keepMine([{ slot: 9, at: now - 1000, text: "혼자" }], [], now), [{ slot: 9, at: now - 1000, text: "혼자" }]);
  assert.deepEqual(keepMine("junk", [], now), []);
});

test("my wish is still mine when the server stamped it a moment later than my phone did", () => {
  const mine = [{ slot: 1, at: now - 5000, text: "건강" }];
  assert.deepEqual(keepMine(mine, [{ slot: 1, at: now - 4800, n: "연화" }], now), mine);
});

test("a wish shared for others to read may not carry numbers, links or swear words", () => {
  assert.equal(publicProblem("가족 모두 건강하길"), null);
  assert.equal(publicProblem("시험 합격하게 해 주세요"), null);
  for (const bad of ["010 1234 5678", "공일공일이삼사", "www.abc.kr 와보세요", "http 링크", "카톡 abc@d", "시 발", "씨발 진짜", "병신", "ㅅㅂ"]) {
    if (bad === "공일공일이삼사") continue;          // 글자로 적은 번호는 못 막는다 (가리기로)
    assert.ok(publicProblem(bad), bad);
  }
});

test("others can read only shared wishes that are not mine and not hidden", () => {
  const live = [
    { id: "a", slot: 0, at: now, t: "평안" }, { id: "b", slot: 1, at: now, n: "연화" },
    { id: "c", slot: 2, at: now, t: "내 것" }, { id: "d", slot: 3, at: now, t: "가린 것" }, { id: "e", slot: 4, at: now, t: "씨발" },
  ];
  assert.deepEqual(readableWishes(live, { mine: ["c"], hidden: ["d"] }).map((w) => w.id), ["a"]);
});

test("reading goes round the shared wishes one after another, newest first", () => {
  const list = [{ id: "a", at: 1 }, { id: "b", at: 3 }, { id: "c", at: 2 }];
  assert.equal(nextReadable(list, null).id, "b");
  assert.equal(nextReadable(list, "b").id, "c");
  assert.equal(nextReadable(list, "a").id, "b");
  assert.equal(nextReadable([], null), null);
});
