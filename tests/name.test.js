import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanName, nameTag, cleanSex } from "../src/logic/name.js";

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
