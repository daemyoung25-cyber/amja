/* 마당의 작은 새, 연꽃에 앉았다 나는 나비, 바다 위 갈매기의 움직임. 그림은 scene/critters.js.
   서버 시계(초)만으로 자리가 정해져 모두의 화면에서 같다. 사람에 따라 달라지는 반응은 넣지 않는다. */
import { RAIL_Z, YARD, STATUE, PRAYER } from "./layout.js";
import { mulberry32, dist2, lineClear, pickStep, headingOf, makeTimeline, segAt } from "./itinerary.js";

/* ---------- 마당의 작은 새: 쉬기(콕콕·두리번) - 총총 - 낮게 날기 ---------- */
const GROUND = { minX: -14, maxX: 14, minZ: -20, maxZ: 3.2 };   // 사람이 많이 다니는 가운데: 넓은 마당에서 두 마리를 만날 수 있게
const ROUNDS = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD];
const PAD = 0.35;
const inPrayer = (p) => p.x > PRAYER.minX - PAD && p.x < PRAYER.maxX + PAD && p.z > PRAYER.minZ - PAD && p.z < PRAYER.maxZ + PAD;

export const birdSpotOk = (p) => p.x >= GROUND.minX && p.x <= GROUND.maxX && p.z >= GROUND.minZ && p.z <= GROUND.maxZ
  && !inPrayer(p) && ROUNDS.every((o) => dist2(p, o) >= (o.r + PAD) ** 2);

const HOP_AIR = 0.2, HOP_GAP = 0.08, HOP_LEN = 0.22, HOP_H = 0.07, FLY_SPEED = 3.2;
const BIRD_HOURS = 2;

function buildBird(seed, start) {
  const rnd = mulberry32(seed), tl = makeTimeline();
  let at = start, yaw = rnd() * 6.28;
  const rest = () => tl.add({ kind: "rest", at, yaw, dur: 0.6 + rnd() * 1.8, pecking: rnd() < 0.6 });
  const go = (kind, to) => {
    const len = Math.sqrt(dist2(at, to));
    yaw = headingOf(at, to);
    tl.add(kind === "hop"
      ? { kind, from: at, to, len, yaw, dur: Math.ceil(len / HOP_LEN) * (HOP_AIR + HOP_GAP) }
      : { kind, from: at, to, len, yaw, dur: len / FLY_SPEED, top: 0.6 + rnd() * 0.6 });
    at = to;
  };
  rest();
  while (tl.total < BIRD_HOURS * 3600) {
    const hop = rnd() < 0.72;
    const to = pickStep(at, rnd, birdSpotOk, hop ? { min: 0.8, max: 2.6 } : { min: 3, max: 8 });
    if (to) go(hop ? "hop" : "fly", to);
    rest();
  }
  // 한 바퀴 끝에 처음 자리로 돌아와야 일정이 되풀이될 때 튀지 않는다
  while (at.x !== start.x || at.z !== start.z) {
    if (lineClear(at, start, birdSpotOk)) go("fly", start);
    else { const to = pickStep(at, rnd, birdSpotOk, { min: 3, max: 8, toward: start }); if (to) go("fly", to); }
    rest();
  }
  return tl;
}

export const BIRDS = [buildBird(101, { x: -3.4, z: -6.5 }), buildBird(202, { x: 4.6, z: -3.2 })];

export function birdAt(tl, t) {
  const { seg, e } = segAt(tl, t);
  if (seg.kind === "rest") {
    return { state: "rest", x: seg.at.x, z: seg.at.z, y: 0, yaw: seg.yaw, peck: seg.pecking ? Math.max(0, Math.sin(t * 9)) : 0, look: seg.pecking ? 0 : Math.sin(t * 1.7) * 0.6, wing: 0 };
  }
  if (seg.kind === "hop") {
    const cycle = HOP_AIR + HOP_GAP, n = Math.floor(e / cycle), c = e - n * cycle, air = c < HOP_AIR;
    const u = Math.min(1, ((n + (air ? c / HOP_AIR : 1)) * HOP_LEN) / Math.max(seg.len, 0.01));
    const a = air ? c / HOP_AIR : 0;
    return { state: "hop", x: seg.from.x + (seg.to.x - seg.from.x) * u, z: seg.from.z + (seg.to.z - seg.from.z) * u, y: u < 1 ? HOP_H * 4 * a * (1 - a) : 0, yaw: seg.yaw, peck: 0, look: 0, wing: 0 };
  }
  const u = Math.min(1, e / seg.dur);
  return { state: "fly", x: seg.from.x + (seg.to.x - seg.from.x) * u, z: seg.from.z + (seg.to.z - seg.from.z) * u, y: seg.top * Math.sin(Math.PI * u) ** 0.7, yaw: seg.yaw, peck: 0, look: 0, wing: Math.sin(t * 34) };
}

/* ---------- 나비: 화분 곁을 팔랑이다 가끔 연꽃에 앉아 천천히 날개를 여닫으며 쉰다 ---------- */
const FLOWER_Y = 0.93;                               // 연꽃 봉오리 끝 (scene/yard.js lotusPot)
const flowers = (side) => [0, 1.6, 3.2].map((z) => ({ x: side * 24.8 + 0.05, z }));
const flyPos = (h, t) => ({
  x: h.x + 1.0 * Math.sin(0.43 * t + h.ph) + 0.5 * Math.sin(1.1 * t + h.ph * 2),
  z: h.z + 1.3 * Math.sin(0.31 * t + h.ph * 1.7) + 0.7 * Math.sin(0.9 * t + h.ph * 0.6),
  y: 1.3 + 0.3 * Math.sin(0.6 * t + h.ph) + 0.1 * Math.sin(7 * t + h.ph),
});
const smooth = (u) => u * u * (3 - 2 * u);
const LIFT = 2.5, LAND = 3;

function buildButterfly(seed, side) {
  const rnd = mulberry32(seed), tl = makeTimeline(), list = flowers(side);
  const first = list[Math.floor(rnd() * 3)];
  let on = first;
  do {
    tl.add({ kind: "lift", flower: on, dur: LIFT });
    tl.add({ kind: "fly", dur: 18 + rnd() * 27 });
    const next = tl.total > 3600 ? first : list[Math.floor(rnd() * 3)];
    tl.add({ kind: "land", flower: next, dur: LAND });
    tl.add({ kind: "sit", flower: next, dur: 7 + rnd() * 8, yaw: rnd() * 6.28 });
    on = next;
  } while (tl.total <= 3600 || on !== first);
  return tl;
}

export const BUTTERFLIES = [
  { x: -24, z: 0.9, ph: 0.7, color: 0xf3d25a, tl: buildButterfly(303, -1) },
  { x: 24, z: 0.9, ph: 3.1, color: 0xf6f1df, tl: buildButterfly(404, 1) },
];

export function butterflyAt(h, t) {
  const { seg, e, local } = segAt(h.tl, t);
  const slow = { state: "sit", wing: 0.55 + 0.35 * Math.sin(t * 1.5) };
  const quick = Math.abs(Math.sin(t * 13 + h.ph));
  if (seg.kind === "sit") return { x: seg.flower.x, y: FLOWER_Y, z: seg.flower.z, yaw: seg.yaw, ...slow };
  const p = flyPos(h, local), q = flyPos(h, local + 0.05);
  const yaw = Math.atan2(-(q.x - p.x), -(q.z - p.z));
  if (seg.kind === "fly") return { ...p, yaw, state: "fly", wing: quick };
  const s = smooth(e / seg.dur), k = seg.kind === "lift" ? s : 1 - s;   // k: 0 = 꽃 위, 1 = 나는 길 위
  const lerp = (a, b) => a + (b - a) * k;
  return { x: lerp(seg.flower.x, p.x), y: lerp(FLOWER_Y, p.y), z: lerp(seg.flower.z, p.z), yaw, state: seg.kind, wing: quick };
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
