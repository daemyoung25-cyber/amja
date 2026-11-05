import { test } from "node:test";
import assert from "node:assert/strict";
import { SUNEUNG_END, suneungActive, dDay, seasonLine, countLine, packSuneung, gentle } from "../src/logic/suneung.js";
import { parseShare, shareUrl, inviteLine, stripShareParams } from "../src/logic/share.js";

const kst = (m, d, h = 12, min = 0) => Date.UTC(2026, m - 1, d, h - 9, min);

test("the campaign ends by itself at 6pm KST on exam day", () => {
  assert.equal(SUNEUNG_END, kst(11, 19, 18));
  assert.equal(suneungActive(kst(11, 5)), true);
  assert.equal(suneungActive(kst(11, 19, 17, 59)), true);
  assert.equal(suneungActive(kst(11, 19, 18)), false);
  assert.equal(suneungActive(kst(12, 1)), false);
});

test("D-day counts Korean calendar days, changing at KST midnight", () => {
  assert.equal(dDay(kst(11, 5, 14)), 14);
  assert.equal(dDay(kst(11, 5, 23, 59)), 14);
  assert.equal(dDay(kst(11, 6, 0, 0)), 13);
  assert.equal(dDay(kst(11, 18)), 1);
  assert.equal(dDay(kst(11, 19, 8)), 0);
});

test("the entry line follows the countdown and disappears afterwards", () => {
  assert.equal(seasonLine(kst(11, 5)), "수능까지 D-14 · 수험생을 위해 초 한 자루 밝혀 주세요");
  assert.equal(seasonLine(kst(11, 18)), "내일이 수능이에요 · 수험생을 위해 초 한 자루 밝혀 주세요");
  assert.equal(seasonLine(kst(11, 19, 8)), "오늘이 수능이에요 · 평안하게 시험 보기를 함께 빌어요");
  assert.equal(seasonLine(kst(11, 19, 18)), "");
});

test("the count reads as people, and says nothing when there is none", () => {
  assert.equal(countLine(128), "지금까지 128분이 수험생을 위해 초를 밝혔어요");
  assert.equal(countLine(0), "");
  assert.equal(countLine(null), "");
});

test("the bundle in exam season holds chapssal-tteok and yeot", () => {
  assert.equal(packSuneung().text, "찹쌀떡과 엿");
});

test("nothing promises a result", () => {
  for (const t of [seasonLine(kst(11, 5)), seasonLine(kst(11, 18)), seasonLine(kst(11, 19, 8)), countLine(3), gentle]) assert.ok(!/합격|보장|붙|만점|꼭 /.test(t), t);
});

test("a link from the exam page carries the campaign and reads well without names", () => {
  const plain = parseShare("?to=gwan&c=su");
  assert.equal(plain.su, true);
  assert.equal(inviteLine(plain), "수험생을 위해 함께 마음을 모아 주세요");
  const named = parseShare(`?to=gwan&c=su&n=${encodeURIComponent("연화")}&h=f&for=${encodeURIComponent("민수")}`);
  assert.equal(inviteLine(named), "연화보살님이 민수님을 위해 초를 밝혔어요. 함께 마음을 모아 주세요");
  assert.equal(parseShare("?to=gwan").su, false);
  assert.equal(stripShareParams("?to=gwan&c=su&emu=1"), "?emu=1");
  const url = shareUrl("https://www.amja.co.kr/suneung/", { place: "gwan", n: "연화", h: "f", forName: "" });
  assert.ok(url.startsWith("https://www.amja.co.kr/suneung/?to=gwan"));
});
