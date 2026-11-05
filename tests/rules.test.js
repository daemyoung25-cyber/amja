/* 보안 규칙 점검: Firebase 에뮬레이터가 켜져 있을 때만 돈다 (README 참고). */
import { test } from "node:test";
import assert from "node:assert/strict";

const DB = "http://127.0.0.1:9000", NS = "ns=demo-amja-default-rtdb";
const AUTH = "http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key";
const up = await fetch(DB + "/.json?shallow=true&" + NS).then(() => true, () => false);
const opts = { skip: !up && "Firebase 에뮬레이터가 꺼져 있음" };

async function signIn() {
  const r = await (await fetch(AUTH, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ returnSecureToken: true }) })).json();
  return { uid: r.localId, token: r.idToken };
}
const put = (path, body, token) => fetch(`${DB}/${path}.json?${NS}&auth=${token}`, { method: "PUT", body: JSON.stringify(body) }).then((r) => r.status);
const now = Date.now();
const presence = (extra = {}) => ({ c: 1, m: { fx: 0, fz: 0, tx: 1, tz: 1, t: now }, p: "stand", pt: now, s: now, ...extra });

test("a well-formed presence write is accepted", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`presence/${me.uid}`, presence(), me.token), 200);
});

test("presence rejects unknown children", opts, async () => {
  const me = await signIn();
  assert.notEqual(await put(`presence/${me.uid}`, presence({ junk: "x".repeat(1000) }), me.token), 200);
});

test("presence rejects non-numeric move fields and fractional colours", opts, async () => {
  const me = await signIn();
  assert.notEqual(await put(`presence/${me.uid}`, presence({ m: { fx: "a", fz: 0, tx: 1, tz: 1, t: now } }), me.token), 200);
  assert.notEqual(await put(`presence/${me.uid}`, presence({ c: 2.5 }), me.token), 200);
});

test("greeting target must be a short string", opts, async () => {
  const me = await signIn();
  assert.notEqual(await put(`presence/${me.uid}`, presence({ g: { to: "x".repeat(200), at: now } }), me.token), 200);
  assert.equal(await put(`presence/${me.uid}`, presence({ g: { to: "someone", at: now } }), me.token), 200);
});

test("traces and visits reject unknown children", opts, async () => {
  const me = await signIn();
  assert.notEqual(await put(`traces/t-${me.uid}`, { x: 0, z: 0, k: "step", at: now, junk: "x" }, me.token), 200);
  assert.equal(await put(`traces/u-${me.uid}`, { x: 0, z: 0, k: "step", at: now }, me.token), 200);
  assert.notEqual(await put(`visits/${me.uid}`, { at: now, junk: 1 }, me.token), 200);
});

test("nobody can write someone else's presence", opts, async () => {
  const a = await signIn(), b = await signIn();
  assert.notEqual(await put(`presence/${a.uid}`, presence(), b.token), 200);
});

test("sitting on a cushion is an allowed pose", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`presence/${me.uid}`, presence({ p: "sit" }), me.token), 200);
});

test("doing 108 bows is an allowed pose", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`presence/${me.uid}`, presence({ p: "bow108" }), me.token), 200);
});

test("presence may carry a short name, not a long one", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`presence/${me.uid}`, presence({ n: "연화" }), me.token), 200);
  assert.notEqual(await put(`presence/${me.uid}`, presence({ n: "가나다라마바사아자차" }), me.token), 200);
});

test("a wish record holds only place, name and time: a wish text is refused", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`wishes/a${now}`, { slot: 3, n: "연화", h: "f", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/b${now}`, { slot: 3, n: "연화", at: now, text: "소원 글" }, me.token), 200);
  assert.notEqual(await put(`wishes/c${now}`, { slot: 60, n: "연화", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/a${now}`, { slot: 4, n: "남", at: now }, me.token), 200, "걸린 소원은 이레 동안 남이 바꿀 수 없다");
});

test("a shared wish carries its text but no name; numbers and links are refused", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`wishes/p${now}`, { slot: 5, t: "평안하길", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/q${now}`, { slot: 5, t: "평안", n: "연화", at: now }, me.token), 200, "글과 이름을 같이 두지 않는다");
  assert.notEqual(await put(`wishes/r${now}`, { slot: 5, t: "010 1234", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/s${now}`, { slot: 5, t: "www.x.kr", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/t${now}`, { slot: 5, t: "Http 링크", at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/u${now}`, { slot: 5, t: "가".repeat(31), at: now }, me.token), 200);
  assert.notEqual(await put(`wishes/v${now}`, { slot: 5, at: now }, me.token), 200, "글도 이름도 없으면 안 된다");
});

test("praying along: only under my own uid, only for a wish that hangs", opts, async () => {
  const me = await signIn(), other = await signIn();
  await put(`wishes/j${now}`, { slot: 6, t: "합격", at: now }, me.token);
  assert.equal(await put(`wishJoins/j${now}/${other.uid}`, now, other.token), 200);
  assert.notEqual(await put(`wishJoins/j${now}/${me.uid}`, now, other.token), 200, "남의 이름으로는 못 빈다");
  assert.notEqual(await put(`wishJoins/nowish${now}/${other.uid}`, now, other.token), 200, "없는 소원엔 못 빈다");
  assert.notEqual(await put(`wishJoins/j${now}/${other.uid}`, "x", other.token), 200);
});

test("presence accepts the bongsong give pose and a carried bundle colour 0-5, nothing else", opts, async () => {
  const me = await signIn();
  assert.equal(await put(`presence/${me.uid}`, presence({ p: "give", b: 2 }), me.token), 200);
  for (const b of [6, -1, 1.5, "red"]) assert.notEqual(await put(`presence/${me.uid}`, presence({ b }), me.token), 200, String(b));
});

test("anyone signed in can pet the dog as themselves, but not as someone else or too often", opts, async () => {
  const me = await signIn(), other = await signIn(), at = Date.now();
  assert.notEqual(await put("dogPet", { at, u: other.uid }, me.token), 200, "not in someone else's name");
  assert.notEqual(await put("dogPet", { at, u: me.uid, junk: 1 }, me.token), 200, "no extra fields");
  assert.notEqual(await put("dogPet", { at: at - 3600000, u: me.uid }, me.token), 200, "not an old time");
  await new Promise((r) => setTimeout(r, 3100));   // 앞선 테스트의 쓰다듬기가 3초 지나도록
  assert.equal(await put("dogPet", { at: Date.now(), u: me.uid }, me.token), 200);
  assert.notEqual(await put("dogPet", { at: Date.now(), u: other.uid }, other.token), 200, "too soon after the last pet");
  assert.notEqual(await put("dogPet", null, other.token), 200, "cannot delete");
});

test("feeding and patting signal per animal, as yourself, with the right act, not too often", opts, async () => {
  const me = await signIn(), other = await signIn(), at = Date.now();
  assert.notEqual(await put("petAct/dog", { at, u: other.uid, a: "treat" }, me.token), 200, "not in someone else's name");
  assert.notEqual(await put("petAct/dog", { at, u: me.uid, a: "churu" }, me.token), 200, "the dog gets no churu");
  assert.notEqual(await put("petAct/cat", { at, u: me.uid, a: "treat" }, me.token), 200, "the cat gets churu, not treats");
  assert.notEqual(await put("petAct/cow", { at, u: me.uid, a: "pet" }, me.token), 200, "no other animals");
  assert.notEqual(await put("petAct/cat", { at, u: me.uid, a: "pat", junk: 1 }, me.token), 200, "no extra fields");
  assert.notEqual(await put("petAct/cat", { at: at - 3600000, u: me.uid, a: "pat" }, me.token), 200, "not an old time");
  assert.equal(await put("petAct/cat", { at: Date.now(), u: me.uid, a: "pat" }, me.token), 200);
  assert.notEqual(await put("petAct/cat", { at: Date.now(), u: other.uid, a: "churu" }, other.token), 200, "too soon on the same animal");
  assert.equal(await put("petAct/baek", { at: Date.now(), u: other.uid, a: "treat" }, other.token), 200, "another animal is free");
  assert.notEqual(await put("petAct/cat", null, other.token), 200, "cannot delete");
});

test("a visitor can mark only their own day, nobody can read the list, and the day must look like a date", opts, async () => {
  const me = await signIn(), other = await signIn(), at = Date.now();
  assert.equal(await put(`visitDays/20261105/${me.uid}`, at, me.token), 200);
  assert.notEqual(await put(`visitDays/20261105/${other.uid}`, at, me.token), 200, "not someone else");
  assert.notEqual(await put(`visitDays/hello/${me.uid}`, at, me.token), 200, "not a date");
  assert.notEqual(await put(`visitDays/20261105/${me.uid}`, "x", me.token), 200, "a time, not text");
  assert.notEqual(await put(`visitDays/20261105/${me.uid}`, at - 3600000, me.token), 200, "not an old time");
  const read = await fetch(`${DB}/visitDays.json?${NS}&auth=${me.token}`).then((r) => r.status);
  assert.notEqual(read, 200, "visitors cannot read the list");
});

test("each device adds one to the exam candle count, by exactly one, and no more", opts, async () => {
  const me = await signIn(), other = await signIn();
  const count = async () => (await fetch(`${DB}/suneungCount.json?${NS}&auth=${me.token}`).then((r) => r.json())) || 0;
  const n = await count();
  assert.notEqual(await put("suneungCount", n + 5, me.token), 200, "not by more than one");
  assert.equal(await put("suneungCount", n + 1, me.token), 200);
  assert.notEqual(await put(`suneungBy/${other.uid}`, Date.now(), me.token), 200, "not for someone else");
  assert.equal(await put(`suneungBy/${me.uid}`, Date.now(), me.token), 200);
  assert.notEqual(await put("suneungCount", n + 2, me.token), 200, "the same device cannot count twice");
  assert.notEqual(await put(`suneungBy/${me.uid}`, Date.now(), me.token), 200, "cannot erase or rewrite the mark");
  assert.equal(await put("suneungCount", n + 2, other.token), 200, "another device can");
  assert.notEqual(await put("suneungReported", true, other.token), 200, "only the mail job marks the report");
});
