import { test } from "node:test";
import assert from "node:assert/strict";
import { packSession, readSession, SESSION_TTL_MS, AWAY_MS } from "../src/logic/session.js";
import { cleanName, cleanSex } from "../src/logic/name.js";
import { peersFromSnapshot } from "../src/logic/peers.js";

const NOW = 1_800_000_000_000;
const names = { cleanName, cleanSex };
const saved = (extra = {}, at = NOW) => JSON.stringify({ ...packSession({ name: "연화", sex: "f", color: 3, x: 1.5, z: -12, yaw: 0.4, base: "sit", bundle: 2 }, at), ...extra });

test("a recent session comes back with name, place, pose and bundle", () => {
  assert.deepEqual(readSession(saved(), NOW + 60000, names), { name: "연화", sex: "f", color: 3, x: 1.5, z: -12, yaw: 0.4, base: "sit", bundle: 2 });
});

test("an old, broken or tampered session is ignored", () => {
  assert.equal(readSession(saved({}, NOW - SESSION_TTL_MS - 1), NOW, names), null);
  assert.equal(readSession("{", NOW, names), null);
  assert.equal(readSession(null, NOW, names), null);
  assert.equal(readSession(saved({ name: "두툼한보지살" }), NOW, names), null);
  assert.equal(readSession(saved({ x: "a" }), NOW, names), null);
  assert.equal(readSession(saved({ color: 9 }), NOW, names), null);
});

test("passing poses like walking or bowing come back as standing; a bad bundle is dropped", () => {
  assert.equal(packSession({ name: "연화", sex: "f", color: 0, x: 0, z: 0, yaw: 0, base: "bow108" }, NOW).base, "stand");
  const s = readSession(saved({ base: "walk", bundle: 7 }), NOW, names);
  assert.equal(s.base, "stand");
  assert.equal(s.bundle, null);
});

test("someone who stepped away stays on others' screens for ten minutes, marked away", () => {
  const m = { fx: 1, fz: 1, tx: 1, tz: 1, t: NOW - 600000 };
  const away = { c: 1, m, p: "stand", s: NOW - 5 * 60000, a: NOW - 5 * 60000 };
  const gone = { c: 1, m, p: "stand", s: NOW - AWAY_MS - 1000, a: NOW - AWAY_MS - 1000 };
  const r = peersFromSnapshot({ away, gone }, "me", NOW, { x: 0, z: 0 });
  assert.deepEqual(r.map((p) => [p.uid, p.away]), [["away", true]]);
});
