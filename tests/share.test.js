import { test } from "node:test";
import assert from "node:assert/strict";
import { SHARE_PLACES, shareUrl, parseShare, shareMessage, cleanFor, inviteLine, stripShareParams } from "../src/logic/share.js";
import { offerPlace, nearCandles, nearWish, clampToWalkable, floorY, faceCandles } from "../src/logic/layout.js";

const BASE = "https://www.amja.co.kr/";
const search = (url) => new URL(url).search;

test("a shared link brings back who, for whom and where", () => {
  const url = shareUrl(BASE, { place: "gwan", n: "연화", h: "f", forName: "민수" });
  assert.ok(url.startsWith(BASE + "?"));
  const got = parseShare(search(url));
  assert.equal(got.place, "gwan"); assert.equal(got.n, "연화"); assert.equal(got.h, "f"); assert.equal(got.forName, "민수");
});

test("the message reads naturally with and without a person, by kind of offering", () => {
  assert.equal(shareMessage({ place: "gwan", n: "연화", h: "f", forName: "민수" }), "연화보살님이 민수님을 위해 초를 밝혔어요. 함께 마음을 모아 주세요");
  assert.equal(shareMessage({ place: "hall", n: "도현", h: "m", forName: "" }), "도현처사님이 향을 피웠어요. 함께 마음을 모아 주세요");
  assert.equal(shareMessage({ place: "wish", n: "연화", h: "f", forName: "우리 아들" }), "연화보살님이 우리 아들님을 위해 소원을 걸었어요. 함께 마음을 모아 주세요");
  assert.equal(shareMessage({ place: "rack", n: null, h: "f", forName: "" }), "누군가 초를 밝혔어요. 함께 마음을 모아 주세요");
});

test("whom it is for must be a short Korean name: no links, numbers or bad words", () => {
  assert.equal(cleanFor(" 우리 아들 "), "우리 아들");
  assert.equal(cleanFor(""), "");
  for (const bad of ["www.evil.com", "http://a", "010 1234", "abc", "가".repeat(11), "시발", "<b>민수</b>"]) assert.equal(cleanFor(bad), null, bad);
});

test("a forged or broken link cannot put anything on the screen", () => {
  assert.equal(parseShare(""), null, "no invite on an ordinary visit");
  assert.equal(parseShare("?debug=1"), null);
  assert.equal(parseShare("?to=nowhere&n=연화"), null, "unknown place");
  const forged = parseShare(`?to=gwan&n=${encodeURIComponent("시발")}&for=${encodeURIComponent("www.evil.com")}`);
  assert.equal(forged.place, "gwan");
  assert.equal(forged.n, null); assert.equal(forged.forName, "");
  assert.equal(inviteLine(forged), "누군가 초를 밝혔어요. 함께 마음을 모아 주세요");
  assert.equal(parseShare(`?to=gwan&h=x`).h, "f");
  assert.equal(parseShare("?to=__proto__"), null);
  assert.equal(parseShare("?to=constructor"), null);
});

test("everyone arrives standing where that same offering's button appears", () => {
  for (const k of ["gwan", "cave", "hall", "herm"]) assert.equal(offerPlace(SHARE_PLACES[k].spot), k, k);
  assert.ok(nearCandles(SHARE_PLACES.rack.spot));
  assert.ok(nearWish(SHARE_PLACES.wish.spot));
  assert.ok(Math.abs(SHARE_PLACES.rack.yaw() - faceCandles(SHARE_PLACES.rack.spot)) < 1e-9);
});

test("arrival spots are walkable ground, not inside anything", () => {
  for (const [k, { spot }] of Object.entries(SHARE_PLACES)) {
    const p = clampToWalkable(spot);
    assert.ok(Math.hypot(p.x - spot.x, p.z - spot.z) < 0.01, `${k} moved to ${p.x},${p.z}`);
    assert.ok(floorY(spot) >= 0);
  }
});

test("after reading, the link's parts leave the address but check flags stay", () => {
  assert.equal(stripShareParams("?to=gwan&n=a&h=f&for=b"), "");
  assert.equal(stripShareParams("?emu=1&to=gwan&n=a&debug=1"), "?emu=1&debug=1");
});
