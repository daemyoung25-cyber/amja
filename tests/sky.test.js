import { test } from "node:test";
import assert from "node:assert/strict";
import { sunTimesKST, skyAt } from "../src/logic/sky.js";

const within = (v, target, tol) => assert.ok(Math.abs(v - target) <= tol, `${v} not within ${tol} of ${target}`);

test("Busan summer solstice: sunrise ~05:10, sunset ~19:42 KST", () => {
  const t = sunTimesKST(new Date("2026-06-21T03:00:00Z"));
  within(t.sunrise, 5 * 60 + 10, 5);
  within(t.sunset, 19 * 60 + 42, 5);
});

test("Busan winter solstice: sunrise ~07:32, sunset ~17:18 KST", () => {
  const t = sunTimesKST(new Date("2026-12-21T03:00:00Z"));
  within(t.sunrise, 7 * 60 + 32, 5);
  within(t.sunset, 17 * 60 + 18, 5);
});

test("KST noon is day, KST 23:00 is night, KST sunset is dusk", () => {
  assert.equal(skyAt(new Date("2026-06-21T03:00:00Z")).phase, "day");
  assert.equal(skyAt(new Date("2026-06-21T14:00:00Z")).phase, "night");
  assert.equal(skyAt(new Date("2026-06-21T10:42:00Z")).phase, "dusk");
});

test("sky colour does not jump across KST midnight", () => {
  const a = skyAt(new Date("2026-06-21T14:59:00Z")).sky;
  const b = skyAt(new Date("2026-06-21T15:01:00Z")).sky;
  for (let i = 0; i < 3; i++) assert.ok(Math.abs(a[i] - b[i]) <= 0.02);
});

test("all colour components stay within 0..1 across a day", () => {
  for (let m = 0; m < 24 * 60; m += 7) {
    const s = skyAt(new Date(Date.UTC(2026, 2, 20, 15, m)));
    for (const k of ["sky", "horizon", "sea", "sun"]) for (const c of s[k]) assert.ok(c >= 0 && c <= 1, `${k} ${c}`);
    assert.ok(s.light >= 0 && s.light <= 1);
  }
});
