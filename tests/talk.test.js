import { test } from "node:test";
import assert from "node:assert/strict";
import { talkProblem, shouldShowTalk, cleanTalk, addHidden, removeHidden, QUICK, TALK_MAX } from "../src/logic/talk.js";

const NOW = 1_800_000_000_000;

test("a short kind word can be said", () => {
  assert.equal(talkProblem("  안녕하세요   반가워요 ", 0, NOW), null);
  assert.equal(cleanTalk("  안녕하세요   반가워요 "), "안녕하세요 반가워요");
  for (const q of QUICK) assert.equal(talkProblem(q, 0, NOW), null, q);
});

test("empty, too long, numbers, links and rude words are stopped before sending", () => {
  assert.ok(talkProblem("   ", 0, NOW));
  assert.ok(talkProblem("가".repeat(TALK_MAX + 1), 0, NOW));
  assert.ok(talkProblem("연락 010", 0, NOW));
  assert.ok(talkProblem("www 와 보세요", 0, NOW));
  assert.ok(talkProblem("카톡 open.kakao", 0, NOW));
  assert.ok(talkProblem("시 발", 0, NOW));
});

test("one word every three seconds", () => {
  assert.ok(talkProblem("안녕", NOW - 2000, NOW));
  assert.equal(talkProblem("안녕", NOW - 3000, NOW), null);
});

test("someone's word shows once, only fresh, only nearby, not when hidden or rude", () => {
  const t = { x: "안녕하세요", at: NOW - 1000 };
  const base = { now: NOW, dist: 5 };
  assert.equal(shouldShowTalk(t, base), true);
  assert.equal(shouldShowTalk(t, { ...base, shownAt: t.at }), false, "already shown");
  assert.equal(shouldShowTalk({ ...t, at: NOW - 11000 }, base), false, "said before I came");
  assert.equal(shouldShowTalk(t, { ...base, dist: 16 }), false, "too far");
  assert.equal(shouldShowTalk(t, { ...base, hidden: true }), false);
  assert.equal(shouldShowTalk({ ...t, x: "병신" }, base), false);
  assert.equal(shouldShowTalk({ ...t, x: "010 1234" }, base), false);
  assert.equal(shouldShowTalk({ x: 3, at: NOW }, base), false);
  assert.equal(shouldShowTalk(null, base), false);
});

test("the hidden list keeps each person once and the newest 200", () => {
  let l = addHidden([], "a");
  l = addHidden(l, "a");
  assert.deepEqual(l, ["a"]);
  assert.deepEqual(removeHidden(l, "a"), []);
  for (let i = 0; i < 250; i++) l = addHidden(l, "u" + i);
  assert.equal(l.length, 200);
  assert.equal(l.at(-1), "u249");
});
