import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, nameTag, cleanSex, nameProblem, whoTag, greeting } from "../src/logic/name.js";

test("a Korean name of one to eight syllables is accepted (spaces trimmed)", () => {
  assert.equal(cleanName(" 연화 "), "연화");
  assert.equal(cleanName("가나다라마바사아"), "가나다라마바사아");
});

test("empty, too long, or non-Hangul names are rejected", () => {
  for (const bad of ["", "   ", "가나다라마바사아자", "abc", "연화1", "연 화", "ㅇㅇ", null, undefined, 3]) assert.equal(cleanName(bad), null, String(bad));
});

test("the tag above the head reads name + 보살", () => {
  assert.equal(nameTag("연화"), "연화보살");
  assert.equal(nameTag(""), "");
});

test("men are called 처사 and women 보살; anything unknown stays 보살", () => {
  assert.equal(nameTag("연화", "f"), "연화보살");
  assert.equal(nameTag("법운", "m"), "법운처사");
  assert.equal(nameTag("연화", "x"), "연화보살");
  assert.equal(cleanSex("m"), "m");
  for (const bad of ["", "M", "male", null, 1]) assert.equal(cleanSex(bad), "f", String(bad));
});

test("names with swear, sexual or hateful words, or posing as staff, are refused with a reason", () => {
  for (const bad of ["두툼한보지살", "씨발", "개새끼", "존나착함", "섹스왕", "자지", "일베회원", "운영자", "관리자님", "주지스님"]) {
    assert.equal(cleanName(bad), null, bad);
    assert.match(nameProblem(bad), /쓸 수 없는/, bad);
  }
  assert.match(nameProblem("abc"), /한글/);
  for (const ok of ["연화", "법운", "보리", "지혜", "자비", "바다", "보현", "수지", "보살핌"]) assert.equal(nameProblem(ok), null, ok);
});

test("someone else's bad name is not shown: no tag, and notices say 누군가", () => {
  assert.equal(nameTag("두툼한보지살", "f"), "");
  assert.equal(whoTag("두툼한보지살", "f"), "누군가");
  assert.equal(whoTag("연화", "f"), "연화보살님이");
  assert.equal(whoTag("", "m"), "누군가");
});

test("공양주 보살님 calls you by name and title when you come in", () => {
  assert.equal(greeting("연화", "f"), "연화보살님, 어서오세요~");
  assert.equal(greeting("법운", "m"), "법운처사님, 어서오세요~");
  assert.equal(greeting("두툼한보지살", "f"), "어서오세요~");
});
