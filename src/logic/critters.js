/* 마당의 작은 새, 연꽃 화분 곁 나비, 바다 위 갈매기의 움직임. 그림은 scene/critters.js.
   서버에 올리지 않고 사람마다 자기 화면에서 따로 돈다. */
import { COURTYARD, RAIL_Z, YARD, STATUE, PRAYER } from "./layout.js";

const clampDt = (dt) => Math.min(dt, 0.1);          // 탭을 오래 비웠다 와도 한 걸음에 멀리 튀지 않게

/* ---------- 마당의 작은 새: 쉬기(콕콕) - 총총 - 낮게 날기 ---------- */
const GROUND = { minX: COURTYARD.minX + 1, maxX: COURTYARD.maxX - 1, minZ: RAIL_Z + 1, maxZ: 3.2 };   // 법당 앞 석등 줄보다 바다 쪽
const ROUNDS = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD];
const PAD = 0.35;
const inPrayer = (p) => p.x > PRAYER.minX - PAD && p.x < PRAYER.maxX + PAD && p.z > PRAYER.minZ - PAD && p.z < PRAYER.maxZ + PAD;

export const birdSpotOk = (p) => p.x >= GROUND.minX && p.x <= GROUND.maxX && p.z >= GROUND.minZ && p.z <= GROUND.maxZ
  && !inPrayer(p) && ROUNDS.every((o) => Math.hypot(p.x - o.x, p.z - o.z) >= o.r + PAD);

function lineClear(a, b) {
  const L = Math.hypot(b.x - a.x, b.z - a.z), n = Math.max(1, Math.ceil(L / 0.25));
  for (let i = 1; i <= n; i++) if (!birdSpotOk({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n })) return false;
  return true;
}

const PLAYER_NEAR = 1.5, PLAYER_FAR = 14, LAND_GAP = 3;
const inYard = (p) => !!p && p.x >= COURTYARD.minX && p.x <= COURTYARD.maxX && p.z >= RAIL_Z && p.z <= 4;

// 방향(라디안)과 거리 범위 안에서 갈 수 있는 곳을 찾는다. 사람 바로 곁에는 내려앉지 않는다
function pickSpot(b, rnd, { dir = null, spread = Math.PI, min, max, player }) {
  for (let i = 0; i < 24; i++) {
    const a = (dir ?? 0) + (rnd() * 2 - 1) * spread, d = min + rnd() * (max - min);
    const to = { x: b.x + Math.sin(a) * d, z: b.z + Math.cos(a) * d };
    if (!birdSpotOk(to) || !lineClear(b, to)) continue;
    if (inYard(player) && Math.hypot(to.x - player.x, to.z - player.z) < LAND_GAP) continue;
    return to;
  }
  return null;
}

const face = (b, to) => { b.yaw = Math.atan2(-(to.x - b.x), -(to.z - b.z)); };

function rest(b, rnd) {
  Object.assign(b, { state: "rest", y: 0, timer: 0.6 + rnd() * 1.8, pecking: rnd() < 0.6, wing: 0 });
}
function startFly(b, to, rnd) {
  face(b, to);
  Object.assign(b, { state: "fly", from: { x: b.x, z: b.z }, to, u: 0, len: Math.hypot(to.x - b.x, to.z - b.z), top: 0.6 + rnd() * 0.6, peck: 0 });
}
function startHop(b, to) {
  face(b, to);
  Object.assign(b, { state: "hop", to, cycle: 0, peck: 0, wing: 0 });
}

export function newBird(rnd = Math.random) {
  let x = 0, z = -8;
  for (let i = 0; i < 40; i++) {
    const p = { x: GROUND.minX + rnd() * (GROUND.maxX - GROUND.minX), z: GROUND.minZ + rnd() * (GROUND.maxZ - GROUND.minZ) };
    if (birdSpotOk(p)) { x = p.x; z = p.z; break; }
  }
  const b = { x, z, y: 0, yaw: rnd() * Math.PI * 2, clock: rnd() * 10, peck: 0, wing: 0 };
  rest(b, rnd);
  return b;
}

function next(b, player, rnd) {
  const far = inYard(player) && Math.hypot(player.x - b.x, player.z - b.z) > PLAYER_FAR;
  if (far) {                                        // 넓은 마당에서 영영 못 만나지 않게, 멀리 있으면 사람 쪽으로 날아온다
    const to = pickSpot(b, rnd, { dir: Math.atan2(player.x - b.x, player.z - b.z), spread: 0.6, min: 8, max: 12, player });
    if (to) return startFly(b, to, rnd);
  }
  if (rnd() < 0.72) {
    const to = pickSpot(b, rnd, { min: 0.8, max: 2.6, player });
    if (to) return startHop(b, to);
  } else {
    const to = pickSpot(b, rnd, { min: 3, max: 8, player });
    if (to) return startFly(b, to, rnd);
  }
  rest(b, rnd);
}

const HOP_AIR = 0.2, HOP_GAP = 0.08, HOP_LEN = 0.22, HOP_H = 0.07, FLY_SPEED = 3.2;

export function stepBird(b, rawDt, player, rnd = Math.random) {
  const dt = clampDt(rawDt);
  b.clock += dt;
  if (b.state !== "fly" && inYard(player) && Math.hypot(player.x - b.x, player.z - b.z) < PLAYER_NEAR) {
    const to = pickSpot(b, rnd, { dir: Math.atan2(b.x - player.x, b.z - player.z), spread: 1.1, min: 3, max: 6, player });
    if (to) { startFly(b, to, rnd); return b; }
  }
  if (b.state === "rest") {
    b.timer -= dt;
    b.peck = b.pecking ? Math.max(0, Math.sin(b.clock * 9)) : 0;
    if (b.timer <= 0) next(b, player, rnd);
  } else if (b.state === "hop") {
    b.cycle = (b.cycle + dt) % (HOP_AIR + HOP_GAP);
    if (b.cycle < HOP_AIR) {
      const left = Math.hypot(b.to.x - b.x, b.to.z - b.z), step = (HOP_LEN / HOP_AIR) * dt;
      if (left <= step) { b.x = b.to.x; b.z = b.to.z; rest(b, rnd); return b; }
      b.x += ((b.to.x - b.x) / left) * step;
      b.z += ((b.to.z - b.z) / left) * step;
      const u = b.cycle / HOP_AIR;
      b.y = HOP_H * 4 * u * (1 - u);
    } else b.y = 0;
  } else {
    b.u = Math.min(1, b.u + (dt * FLY_SPEED) / Math.max(b.len, 0.1));
    b.x = b.from.x + (b.to.x - b.from.x) * b.u;
    b.z = b.from.z + (b.to.z - b.from.z) * b.u;
    b.y = b.top * Math.sin(Math.PI * b.u) ** 0.7;
    b.wing = Math.sin(b.clock * 34);
    if (b.u >= 1) { b.x = b.to.x; b.z = b.to.z; rest(b, rnd); }
  }
  return b;
}

/* ---------- 나비: 양쪽 연꽃 화분 곁에서 팔랑팔랑 (오른쪽 공양대와 양쪽 석탑에 닿지 않는 넓이) ---------- */
export const BUTTERFLIES = [
  { x: -24, z: 0.9, ph: 0.7, color: 0xf3d25a },
  { x: 24, z: 0.9, ph: 3.1, color: 0xf6f1df },
];
const flyPos = (h, t) => ({
  x: h.x + 1.0 * Math.sin(0.43 * t + h.ph) + 0.5 * Math.sin(1.1 * t + h.ph * 2),
  z: h.z + 1.3 * Math.sin(0.31 * t + h.ph * 1.7) + 0.7 * Math.sin(0.9 * t + h.ph * 0.6),
  y: 1.3 + 0.3 * Math.sin(0.6 * t + h.ph) + 0.1 * Math.sin(7 * t + h.ph),
});
export function butterflyAt(h, t) {
  const p = flyPos(h, t), q = flyPos(h, t + 0.05);
  return { ...p, yaw: Math.atan2(-(q.x - p.x), -(q.z - p.z)), wing: Math.abs(Math.sin(t * 13 + h.ph)) };
}

/* ---------- 갈매기: 난간 너머 바다 위에서 큰 원. 주로 활공하고 날갯짓은 가끔 ---------- */
export const GULLS = [
  { x: 12, z: -62, r: 20, speed: 6, y: 11, dir: 1, ph: 0.4 },
  { x: -8, z: -52, r: 14, speed: 5, y: 13, dir: 1, ph: 2.2 },
  { x: 32, z: -56, r: 17, speed: 6.5, y: 15, dir: -1, ph: 4.1 },
  { x: -12, z: -82, r: 22, speed: 5.5, y: 18, dir: 1, ph: 1.3 },
  { x: 48, z: -90, r: 26, speed: 6, y: 21, dir: -1, ph: 5.2 },
];
export function gullAt(g, t) {
  const th = g.ph + (g.dir * g.speed * t) / g.r;
  const vx = -Math.sin(th) * g.dir, vz = Math.cos(th) * g.dir;
  const flapping = Math.max(0, (Math.sin(t * 0.55 + g.ph * 3) - 0.7) / 0.3);
  return {
    x: g.x + g.r * Math.cos(th), z: g.z + g.r * Math.sin(th), y: g.y + 1.5 * Math.sin(t * 0.23 + g.ph),
    yaw: Math.atan2(-vx, -vz), roll: 0.24 * g.dir, flapping,
    wing: 0.14 + 0.03 * Math.sin(t * 0.9 + g.ph) + flapping * 0.55 * Math.sin(t * 6 + g.ph),
  };
}

/* 해가 지면 들어가고 아침에 다시 나온다 (해 고도, 도) */
export const critterDay = (sunElevation) => sunElevation > -3;
