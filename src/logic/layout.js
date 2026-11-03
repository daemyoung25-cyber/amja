/* 암자 배치. 단위는 미터, z가 음수인 쪽이 바다(남쪽). yaw 0 = 바다를 바라봄. */
// 앞마당(난간~법당)은 폭 52m, 깊이 32.5m: 그 전(36m×23m)의 두 배. 법당은 그대로 두고 난간을 바다 쪽으로 물렸다
export const COURTYARD = { minX: -26, maxX: 26, minZ: -27, maxZ: 16.5 };
export const RAIL_Z = -27;
export const LEAN_Z = RAIL_Z + 0.6;
export const HALL = { minX: -9, maxX: 9, minZ: 5.5, maxZ: 15.5, door: { x: 0, z: 5 } };
// 해수관음: 바다를 보고 섰을 때 왼쪽(9시). 앞(바다 쪽)에 기도 터가 있다.
export const STATUE = { x: -17, z: -12, baseR: 1.2 };
export const PRAYER = { minX: STATUE.x - 3.4, maxX: STATUE.x + 3.4, minZ: STATUE.z - 5.6, maxZ: STATUE.z - 1.3 };   // 박석 깐 기도 터
export const PRAYER_BAERYE = { x: STATUE.x, z: STATUE.z - 1.75 };
export const PRAYER_SEATS = [2.7, 3.7, 4.7].flatMap((dz) => [-2.4, -1.2, 0, 1.2, 2.4].map((dx) => ({ x: STATUE.x + dx, z: STATUE.z - dz })));   // 다섯 자리씩 세 줄, 15석
// 촛불 공양대: 마당 왼쪽, 해수관음과 법당 사이. 바다 쪽 앞에 서서 초를 켜 올린다.
export const CANDLES = { x: -18, z: 0.5, r: 1.05, spot: { x: -18, z: -0.9 } };
// 동굴 법당(관음굴): 마당 왼쪽 뒤 바위 언덕 속. 마당 뒤끝(foot)에서 돌계단으로 1.6m 올라 굴 어귀(door)를 지나 안으로.
export const CAVE = (() => {
  const x = -13.5;
  return {
    x, z: 27.2, floor: 1.6, foot: { x, z: 16.2 }, door: { x, z: 23.4 },
    inside: { minX: x - 2.8, maxX: x + 2.8, minZ: 24.0, maxZ: 30.2 },
    altar: { x, z: 31.0 },
    seats: [-1.1, 0, 1.1].map((dx) => ({ x: x + dx, z: 28.2 })),
  };
})();
// 굴 안에 있을 때 카메라가 머무를 상자
export const CAVE_ROOM = { minX: CAVE.inside.minX - 0.1, maxX: CAVE.inside.maxX + 0.1, minZ: CAVE.door.z, maxZ: CAVE.inside.maxZ + 0.5, maxY: CAVE.floor + 2.7 };
const STEP_HALF = 0.9;
// 대웅전 앞마당: 법당 양 끝 앞에 석등 한 쌍, 마당 양옆에 삼층석탑 한 쌍 (r은 못 들어가는 반지름)
export const YARD = [
  { kind: "lantern", x: -8, z: 3.9, r: 0.6 }, { kind: "lantern", x: 8, z: 3.9, r: 0.6 },
  { kind: "pagoda", x: -21, z: 3.0, r: 0.95 }, { kind: "pagoda", x: 21, z: 3.0, r: 0.95 },   // 마당 양옆 담 가까이
  // 양 끝 연꽃 화분 줄, 소원 기와 쌓은 단
  ...[3.2, 1.6, 0].flatMap((z) => [{ kind: "pot", x: -24.8, z, r: 0.35 }, { kind: "pot", x: 24.8, z, r: 0.35 }]),
  { kind: "giwa", x: 19, z: -11, r: 0.8 },
  { kind: "candles", x: CANDLES.x, z: CANDLES.z, r: CANDLES.r },
];
export const BAERYE = { x: 0, z: 4.15 };   // 계단 앞 배례석 (밟고 지나가도 되는 납작한 돌)
// 걸어서 비켜 가야 하는 둥근 것들: 관세음보살 받침과 앞마당 돌들
const ROUND = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD];
export const CHIME = { x: 6.5, y: 4.9, z: 4.4 };
// 법당 안: 걸을 수 있는 곳, 문 안팎, 불단, 방석
// 법당 벽: 앞·뒤 벽의 z, 옆벽의 |x|, 벽 높이, 가운데 문 크기
export const WALLS = { front: 6.6, back: 15.0, side: 8.4, height: 4.8, doorW: 2.4, doorH: 3.4 };
export const INSIDE = { minX: -8.0, maxX: 8.0, minZ: 6.95, maxZ: 12.6 };
export const DOOR_IN = { x: 0, z: 7.1 };
export const ALTAR = { x: 0, z: 13.9 };
export const CUSHIONS = [-4, -2, 0, 2, 4].flatMap((x) => [{ x, z: 8.6 }, { x, z: 10.2 }, { x, z: 11.8 }]);
export const FLOOR_Y = 0.5;
export const CEILING_Y = FLOOR_Y + WALLS.height - 0.6;   // 바깥 처마 단청 상자(벽 위 0.45m부터)보다 아래
// 법당 안에 있을 때 카메라가 머무를 상자 (벽·천장 안쪽). 문으로 빠져나가면 문틀에 걸려 깜빡인다.
export const ROOM = { minX: -8.1, maxX: 8.1, minZ: 6.95, maxZ: 14.7, maxY: CEILING_Y - 0.2 };

const MARGIN = 0.3;
const LEAN_X = COURTYARD.maxX - 0.5;
const LEAN_TRIGGER_Z = LEAN_Z + 0.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const inCourtyard = (p) => clamp(p.x, COURTYARD.minX, COURTYARD.maxX) === p.x && clamp(p.z, COURTYARD.minZ, COURTYARD.maxZ) === p.z;
const inHall = (p) => p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;
export const insideCave = (p) => p.x >= CAVE.inside.minX && p.x <= CAVE.inside.maxX && p.z >= CAVE.inside.minZ && p.z <= CAVE.inside.maxZ;
const onCaveSteps = (p) => Math.abs(p.x - CAVE.x) <= STEP_HALF && p.z > COURTYARD.maxZ && p.z < CAVE.inside.minZ;
const inCaveArea = (p) => insideCave(p) || onCaveSteps(p);
const faceCaveAltar = (p) => Math.atan2(-(CAVE.altar.x - p.x), -(CAVE.altar.z - p.z));
export { faceCaveAltar };
export const insideHall = (p) => p.x >= INSIDE.minX && p.x <= INSIDE.maxX && p.z >= INSIDE.minZ && p.z <= INSIDE.maxZ;
const SEAT_R = 0.5;
const faceAltar = (p) => Math.atan2(-(ALTAR.x - p.x), -(ALTAR.z - p.z));
const faceStatue = (p) => Math.atan2(-(STATUE.x - p.x), -(STATUE.z - p.z));
const SEATS = [...CUSHIONS, ...PRAYER_SEATS, ...CAVE.seats];
const faceCandles = (p) => Math.atan2(-(CANDLES.x - p.x), -(CANDLES.z - p.z));
export const nearCandles = (p) => Math.hypot(p.x - CANDLES.spot.x, p.z - CANDLES.spot.z) <= 1.8;
export { faceCandles };
// 앉는 방향: 법당 안이면 부처님, 밖(기도 터)이면 해수관음
export const faceSeat = (p) => (insideHall(p) ? faceAltar(p) : insideCave(p) ? faceCaveAltar(p) : faceStatue(p));

// 법당 받침 위는 반 미터 높고, 앞쪽 디딤돌에서 비스듬히 오른다
const BASE = { minX: HALL.minX - 0.4, maxX: HALL.maxX + 0.4, minZ: 5.2, maxZ: HALL.maxZ + 0.3 }, STEP_Z = 4.9;
export function floorY({ x, z }) {
  if (insideCave({ x, z })) return CAVE.floor;
  if (onCaveSteps({ x, z })) return CAVE.floor * clamp((z - COURTYARD.maxZ) / (CAVE.door.z - COURTYARD.maxZ), 0, 1);
  if (x < BASE.minX || x > BASE.maxX || z < STEP_Z || z > BASE.maxZ) return 0;
  return z >= BASE.minZ ? FLOOR_Y : FLOOR_Y * (z - STEP_Z) / (BASE.minZ - STEP_Z);
}

export function clampToWalkable({ x, z }) {
  // 굴 둘레 바위를 누르면 굴 안으로, 돌계단 위면 계단 위로
  if (Math.abs(x - CAVE.x) <= 5 && z > CAVE.door.z - 0.5 && z < CAVE.inside.maxZ + 5) {
    const m = 0.3;
    return { x: clamp(x, CAVE.inside.minX + m, CAVE.inside.maxX - m), z: clamp(z, CAVE.inside.minZ + m, CAVE.inside.maxZ - m) };
  }
  if (z > COURTYARD.maxZ && Math.abs(x - CAVE.x) <= STEP_HALF + 0.6) return { x: clamp(x, CAVE.x - STEP_HALF + 0.2, CAVE.x + STEP_HALF - 0.2), z };
  let p = { x: clamp(x, COURTYARD.minX, COURTYARD.maxX), z: clamp(z, COURTYARD.minZ, COURTYARD.maxZ) };
  // 법당을 누르면 안으로 들어간다 (불단 앞까지)
  if (inHall(p)) return { x: clamp(p.x, INSIDE.minX, INSIDE.maxX), z: clamp(p.z, INSIDE.minZ, INSIDE.maxZ) };
  for (const o of ROUND) {
    const dx = p.x - o.x, dz = p.z - o.z, d = Math.hypot(dx, dz), r = o.r + MARGIN;
    if (d < r) {
      const ux = d > 1e-6 ? dx / d : 0, uz = d > 1e-6 ? dz / d : (o.z < 0 ? 1 : -1);   // 정중앙이면 마당 가운데 쪽으로
      p = { x: o.x + ux * r, z: o.z + uz * r };
    }
  }
  return p;
}

export const seatAt = (p) => SEATS.find((c) => Math.hypot(p.x - c.x, p.z - c.z) < 0.05) || null;
export { faceAltar };

export function nearestLeanSpot({ x }) {
  let lx = clamp(x, -LEAN_X, LEAN_X);
  const dz = LEAN_Z - STATUE.z, r = STATUE.baseR + MARGIN;
  if (Math.abs(dz) < r) {
    const half = Math.sqrt(r * r - dz * dz);
    if (Math.abs(lx - STATUE.x) < half) lx = lx <= STATUE.x ? STATUE.x - half : STATUE.x + half;
  }
  return { x: lx, z: LEAN_Z, yaw: 0 };
}

export function resolveTap(p) {
  const seat = SEATS.find((c) => Math.hypot(p.x - c.x, p.z - c.z) < SEAT_R);
  if (seat) return { kind: "sit", to: { x: seat.x, z: seat.z }, yaw: faceSeat(seat) };
  if (Math.hypot(p.x - CANDLES.x, p.z - CANDLES.z) < CANDLES.r + 0.2) return { kind: "candle", to: { ...CANDLES.spot }, yaw: faceCandles(CANDLES.spot) };
  if (p.z < LEAN_TRIGGER_Z) {
    const s = nearestLeanSpot(p);
    return { kind: "lean", to: { x: s.x, z: s.z }, yaw: 0 };
  }
  return { kind: "walk", to: clampToWalkable(p) };
}

/* 걸어가는 길: 불상 받침과 법당을 뚫지 않도록 돌아갈 지점을 끼워 넣는다.
   결과는 거쳐 갈 지점 목록이고 마지막이 목적지다. */
const HALL_PAD = MARGIN;
const inRound = (p, o) => Math.hypot(p.x - o.x, p.z - o.z) < o.r + MARGIN;
const blockedByStatue = (p) => ROUND.some((o) => inRound(p, o));       // 둥근 것 아무거나
const blockedByHall = (p) => p.x > HALL.minX - HALL_PAD && p.x < HALL.maxX + HALL_PAD && p.z > HALL.minZ - HALL_PAD && p.z < HALL.maxZ + HALL_PAD;
const okPoint = (p) => inCourtyard(p) && !blockedByStatue(p) && !blockedByHall(p);
const len = (a, b) => Math.hypot(b.x - a.x, b.z - a.z);
function hits(a, b, blocked) {
  const n = Math.max(2, Math.ceil(len(a, b) / 0.05));
  for (let i = 1; i < n; i++) if (blocked({ x: a.x + (b.x - a.x) * i / n, z: a.z + (b.z - a.z) * i / n })) return true;
  return false;
}
const pathLen = (a, pts) => pts.reduce((s, p, i) => s + len(i ? pts[i - 1] : a, p), 0);
const clear = (a, pts) => pts.every((p, i) => !hits(i ? pts[i - 1] : a, p, blockedByStatue) && !hits(i ? pts[i - 1] : a, p, blockedByHall));

export function routeAround(from, to) {
  // 굴로 오가는 길: 마당 뒤끝(foot) - 돌계단 - 굴 어귀(door) - 굴 안
  const ca = inCaveArea(from), cb = inCaveArea(to);
  if (ca && cb) return insideCave(from) === insideCave(to) ? [to] : [CAVE.door, to];
  if (ca) return [...(insideCave(from) ? [CAVE.door] : []), CAVE.foot, ...routeAround(CAVE.foot, to)];
  if (cb) return [...routeAround(from, CAVE.foot), ...(insideCave(to) ? [CAVE.door] : []), to];
  const a = insideHall(from), b = insideHall(to);
  const inDoorway = Math.abs(from.x) < 0.7 && from.z > HALL.door.z && from.z < DOOR_IN.z;
  if (inDoorway) return b ? [DOOR_IN, to] : [HALL.door, ...routeOutside(HALL.door, to)];
  if (a && b) return [to];
  if (a) return [DOOR_IN, HALL.door, ...routeOutside(HALL.door, to)];
  if (b) return [...routeOutside(from, HALL.door), DOOR_IN, to];
  return routeOutside(from, to);
}

function routeOutside(from, to, depth = 0) {
  if (depth > 3 || clear(from, [to])) return [to];
  const options = [];
  if (hits(from, to, blockedByHall)) {
    const L = { x: HALL.minX - HALL_PAD - 0.4, z: HALL.minZ - HALL_PAD - 0.4 }, R = { x: HALL.maxX + HALL_PAD + 0.4, z: L.z };
    options.push([L, to], [R, to], [L, R, to], [R, L, to]);
  } else {
    // 둥근 것(불상 받침·석등·석탑): 길을 막는 것 가운데 가장 먼저 닿는 것을 양쪽으로 비켜 간다
    const dx = to.x - from.x, dz = to.z - from.z, L2 = dx * dx + dz * dz || 1;
    const along = (o) => Math.min(1, Math.max(0, ((o.x - from.x) * dx + (o.z - from.z) * dz) / L2));
    const o = ROUND.filter((c) => hits(from, to, (p) => inRound(p, c))).sort((a, b) => along(a) - along(b))[0];
    if (o) {
      const t = along(o);
      let nx = from.x + dx * t - o.x, nz = from.z + dz * t - o.z;
      if (Math.hypot(nx, nz) < 1e-6) { nx = -dz; nz = dx; }
      const k = (o.r + MARGIN + 0.6) / (Math.hypot(nx, nz) || 1);
      for (const s of [1, -1]) options.push([{ x: o.x + s * nx * k, z: o.z + s * nz * k }, to]);
    }
  }
  const good = options.filter((pts) => pts.slice(0, -1).every(okPoint) && clear(from, pts));
  if (good.length) return good.sort((a, b) => pathLen(from, a) - pathLen(from, b))[0];
  // 한 번에 안 되면 첫 경유지까지 다시 길을 찾는다
  const firsts = options.filter((pts) => okPoint(pts[0])).sort((a, b) => pathLen(from, a) - pathLen(from, b));
  if (!firsts.length) return [to];
  const w = firsts[0][0];
  return [...routeOutside(from, w, depth + 1), ...routeOutside(w, to, depth + 1)];
}
