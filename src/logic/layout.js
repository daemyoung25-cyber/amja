/* 암자 배치. 단위는 미터, z가 음수인 쪽이 바다(남쪽). yaw 0 = 바다를 바라봄. */
export const COURTYARD = { minX: -12, maxX: 12, minZ: -6, maxZ: 10 };
export const RAIL_Z = -6;
export const LEAN_Z = -5.4;
export const HALL = { minX: -4, maxX: 4, minZ: 5.5, maxZ: 10, door: { x: 0, z: 5 } };
export const STATUE = { x: 9, z: -4.5, baseR: 1.2 };
export const CHIME = { x: 3.5, y: 3.2, z: 5.2 };

const MARGIN = 0.3;
const LEAN_X = 11.5;
const LEAN_TRIGGER_Z = -5.2;

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const inCourtyard = (p) => clamp(p.x, COURTYARD.minX, COURTYARD.maxX) === p.x && clamp(p.z, COURTYARD.minZ, COURTYARD.maxZ) === p.z;
const inHall = (p) => p.x > HALL.minX && p.x < HALL.maxX && p.z > HALL.minZ && p.z < HALL.maxZ;

export function clampToWalkable({ x, z }) {
  let p = { x: clamp(x, COURTYARD.minX, COURTYARD.maxX), z: clamp(z, COURTYARD.minZ, COURTYARD.maxZ) };
  if (inHall(p)) {
    const exits = [
      { x: HALL.minX - MARGIN, z: p.z },
      { x: HALL.maxX + MARGIN, z: p.z },
      { x: p.x, z: HALL.minZ - MARGIN },
      { x: p.x, z: HALL.maxZ + MARGIN },
    ].filter(inCourtyard);
    p = exits.reduce((a, b) => (Math.hypot(a.x - p.x, a.z - p.z) <= Math.hypot(b.x - p.x, b.z - p.z) ? a : b));
  }
  const dx = p.x - STATUE.x, dz = p.z - STATUE.z, d = Math.hypot(dx, dz), r = STATUE.baseR + MARGIN;
  if (d < r) {
    const ux = d > 1e-6 ? dx / d : 0, uz = d > 1e-6 ? dz / d : 1;   // 정중앙이면 마당 쪽(+z)으로
    p = { x: STATUE.x + ux * r, z: STATUE.z + uz * r };
  }
  return p;
}

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
  if (p.z < LEAN_TRIGGER_Z) {
    const s = nearestLeanSpot(p);
    return { kind: "lean", to: { x: s.x, z: s.z }, yaw: 0 };
  }
  return { kind: "walk", to: clampToWalkable(p) };
}

/* 걸어가는 길: 불상 받침과 법당을 뚫지 않도록 돌아갈 지점을 끼워 넣는다.
   결과는 거쳐 갈 지점 목록이고 마지막이 목적지다. */
const STATUE_CLEAR = STATUE.baseR + MARGIN, HALL_PAD = MARGIN;
const blockedByStatue = (p) => Math.hypot(p.x - STATUE.x, p.z - STATUE.z) < STATUE_CLEAR;
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

export function routeAround(from, to, depth = 0) {
  if (depth > 3 || clear(from, [to])) return [to];
  const options = [];
  if (hits(from, to, blockedByHall)) {
    const L = { x: HALL.minX - HALL_PAD - 0.4, z: HALL.minZ - HALL_PAD - 0.4 }, R = { x: HALL.maxX + HALL_PAD + 0.4, z: L.z };
    options.push([L, to], [R, to], [L, R, to], [R, L, to]);
  } else {
    // 불상: 지나가는 선에서 가장 가까운 점 쪽과 그 반대쪽, 두 갈래 중 걸을 수 있는 쪽
    const dx = to.x - from.x, dz = to.z - from.z, L2 = dx * dx + dz * dz || 1;
    const t = Math.min(1, Math.max(0, ((STATUE.x - from.x) * dx + (STATUE.z - from.z) * dz) / L2));
    let nx = from.x + dx * t - STATUE.x, nz = from.z + dz * t - STATUE.z;
    const nl = Math.hypot(nx, nz);
    if (nl < 1e-6) { nx = -dz; nz = dx; } 
    const k = (STATUE_CLEAR + 0.6) / (Math.hypot(nx, nz) || 1);
    for (const s of [1, -1]) options.push([{ x: STATUE.x + s * nx * k, z: STATUE.z + s * nz * k }, to]);
  }
  const good = options.filter((pts) => pts.slice(0, -1).every(okPoint) && clear(from, pts));
  if (good.length) return good.sort((a, b) => pathLen(from, a) - pathLen(from, b))[0];
  // 한 번에 안 되면 첫 경유지까지 다시 길을 찾는다
  const firsts = options.filter((pts) => okPoint(pts[0])).sort((a, b) => pathLen(from, a) - pathLen(from, b));
  if (!firsts.length) return [to];
  const w = firsts[0][0];
  return [...routeAround(from, w, depth + 1), ...routeAround(w, to, depth + 1)];
}
