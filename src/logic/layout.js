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
