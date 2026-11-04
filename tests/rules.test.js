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
