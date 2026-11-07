/* 접속 정보(presence 스냅샷) → 화면에 그릴 사람 목록. */
import { positionAt } from "./walk.js";
import { MAX_PEERS } from "../config.js";
import { cleanName, cleanSex } from "./name.js";
import { AWAY_MS } from "./session.js";

const STALE_MS = 90000;
const num = (v) => typeof v === "number" && Number.isFinite(v);
const validMove = (m) => m && ["fx", "fz", "tx", "tz", "t"].every((k) => num(m[k]));

export function peersFromSnapshot(val, myUid, nowMs, me) {
  if (!val || typeof val !== "object") return [];
  const out = [];
  for (const [uid, v] of Object.entries(val)) {
    if (uid === myUid || !v || typeof v !== "object") continue;
    const away = num(v.a) && nowMs - v.a <= AWAY_MS;          // 잠깐 다른 화면에 간 분: 하트비트가 멈춰도 남긴다
    if (!validMove(v.m) || !num(v.s) || (nowMs - v.s > STALE_MS && !away)) continue;
    const pos = positionAt(v.m, nowMs);
    out.push({ uid, c: num(v.c) ? v.c : 0, m: v.m, p: typeof v.p === "string" ? v.p : "stand", pt: num(v.pt) ? v.pt : 0, g: v.g, away, b: Number.isInteger(v.b) && v.b >= 0 && v.b <= 5 ? v.b : null, t: v.t && typeof v.t.x === "string" && num(v.t.at) ? { x: v.t.x, at: v.t.at } : null, n: cleanName(v.n) || "", h: cleanSex(v.h), d: Math.hypot(pos.x - me.x, pos.z - me.z) });
  }
  out.sort((a, b) => a.d - b.d);
  return out.slice(0, MAX_PEERS).map(({ d, ...p }) => p);
}

export function nearestPeerWithin(peers, me, nowMs, range) {
  let best = null, bestD = range;
  for (const p of peers) {
    const pos = positionAt(p.m, nowMs);
    const d = Math.hypot(pos.x - me.x, pos.z - me.z);
    if (d <= bestD) { best = p.uid; bestD = d; }
  }
  return best;
}
