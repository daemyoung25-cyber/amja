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
// 촛불 공양대와 소원걸이: 해수관음 맞은편 마당 끝(오른쪽 담)에 붙여, 앞면이 해수관음을 본다.
// 앞에 서서 걸이를 마주 보면 소원걸이는 공양대 왼쪽(바다 쪽)이다. yaw는 걸이 앞면 방향(사람 yaw와 같은 규칙).
const facingStatue = (x, z, r, gap) => {
  const ux = STATUE.x - x, uz = STATUE.z - z, L = Math.hypot(ux, uz);
  return { x, z, r, yaw: Math.atan2(-ux, -uz), spot: { x: x + (ux / L) * gap, z: z + (uz / L) * gap } };
};
export const CANDLES = facingStatue(24.6, -3.5, 1.05, 1.4);
export const WISH = facingStatue(24.4, -8, 1.3, 1.7);
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
// 섬과 출렁다리: 마당 왼쪽 앞바다의 섬 꼭대기를 마당 높이로 고른 터(ISLAND, 뒷날 작은 암자 자리)에
// 왼쪽 앞 난간 틈(a)에서 출렁다리가 건너간다. 다리 끝(b)은 터 가장자리. 디딤판은 양끝이 마당 높이, 가운데가 sag만큼 처진다.
// (2026-11-03) 곶 안쪽 숲 한가운데에서 바다 쪽 끝 숲자리로 옮김: 다리가 뭍 위가 아니라 바다 위로 건너가고, 터 둘레 숲은 비운다
// (2026-11-03) 터를 r 8로 넓히고 뒤쪽에 작은 암자(홍련암 모티브)를 앉힘
// (2026-11-03) 다리가 길어 건너는 데 한참 걸려서 거리를 절반으로: 곶 끝에서 바다 위 바위섬(hermitage.js가 바다에서 솟은 바위를 만든다)으로
export const ISLAND = { x: -54, z: -69.5, r: 8 };
export const BRIDGE = (() => {
  const a = { x: -20, z: RAIL_Z };
  const dx = a.x - ISLAND.x, dz = a.z - ISLAND.z, L = Math.hypot(dx, dz);
  const b = { x: ISLAND.x + (dx / L) * ISLAND.r, z: ISLAND.z + (dz / L) * ISLAND.r };
  return { a, b, w: 1.4, sag: 1.6, head: { x: a.x, z: RAIL_Z + 0.8 } };
})();
// 섬 암자: 터 서쪽(뭍 쪽)에 물러앉아 정면이 동쪽 바다(+x)를 본다. 정면 세 칸, 가운데 칸이 문.
// 바깥에서 걸을 수 있는 곳은 터 둥근 판 가운데 '앞줄(front)'보다 바다 쪽만 (볼록해서 곧은 길이 암자를 뚫지 않는다).
// 안: 문(door) - 문 안(doorIn) - 마루(inside), 뒤쪽 불단에 부처님, 앞에 방석 세 개.
export const HERMITAGE = (() => {
  const x = ISLAND.x - 3.6, z = ISLAND.z, w = 6.6, d = 4.8, fy = 0.55;
  const plinth = { minX: x - d / 2 - 0.45, maxX: x + d / 2 + 0.45, minZ: z - w / 2 - 0.45, maxZ: z + w / 2 + 0.45 };
  return {
    x, z, w, d, fy, wallH: 2.3, yaw: Math.PI / 2, u: { x: -1, z: 0 }, front: 0.3, plinth,
    door: { x: plinth.maxX + 0.45, z }, doorIn: { x: x + d / 2 - 0.35, z },
    inside: { minX: x - d / 2 + 1.3, maxX: x + d / 2 - 0.35, minZ: z - w / 2 + 0.35, maxZ: z + w / 2 - 0.35 },
    altar: { x: x - d / 2 + 0.65, z },
    seats: [-1.3, 0, 1.3].map((dz) => ({ x: x + 0.2, z: z + dz })),
  };
})();
const islandS = (p) => (p.x - ISLAND.x) * HERMITAGE.u.x + (p.z - ISLAND.z) * HERMITAGE.u.z;
export const insideHermitage = (p) => p.x >= HERMITAGE.inside.minX && p.x <= HERMITAGE.inside.maxX && p.z >= HERMITAGE.inside.minZ && p.z <= HERMITAGE.inside.maxZ;
const onHermPlinth = (p) => p.x >= HERMITAGE.plinth.minX && p.x <= HERMITAGE.plinth.maxX && p.z >= HERMITAGE.plinth.minZ && p.z <= HERMITAGE.plinth.maxZ;
export const faceHermAltar = (p) => Math.atan2(-(HERMITAGE.altar.x - p.x), -(HERMITAGE.altar.z - p.z));
// 암자 안에 있을 때 카메라가 머무를 상자
export const HERM_ROOM = { minX: HERMITAGE.x - HERMITAGE.d / 2 + 0.2, maxX: HERMITAGE.x + HERMITAGE.d / 2 - 0.1, minZ: HERMITAGE.z - HERMITAGE.w / 2 + 0.2, maxZ: HERMITAGE.z + HERMITAGE.w / 2 - 0.2, maxY: HERMITAGE.fy + HERMITAGE.wallH - 0.15 };
export const bridgeAt = (t) => ({ x: BRIDGE.a.x + (BRIDGE.b.x - BRIDGE.a.x) * t, z: BRIDGE.a.z + (BRIDGE.b.z - BRIDGE.a.z) * t });
const BR_LEN2 = (BRIDGE.b.x - BRIDGE.a.x) ** 2 + (BRIDGE.b.z - BRIDGE.a.z) ** 2;
const bridgeT = (p) => ((p.x - BRIDGE.a.x) * (BRIDGE.b.x - BRIDGE.a.x) + (p.z - BRIDGE.a.z) * (BRIDGE.b.z - BRIDGE.a.z)) / BR_LEN2;
const bridgeOff = (p) => { const t = bridgeT(p), c = bridgeAt(t); return Math.hypot(p.x - c.x, p.z - c.z); };
export const onBridge = (p) => { const t = bridgeT(p); return t >= 0 && t <= 1 && bridgeOff(p) <= BRIDGE.w / 2 + 0.05; };
export const onIsland = (p) => Math.hypot(p.x - ISLAND.x, p.z - ISLAND.z) <= ISLAND.r;
export const bridgeDeckY = (t) => -BRIDGE.sag * 4 * t * (1 - t);
const inBridgeArea = (p) => onIsland(p) || onBridge(p);
// 다리 근처를 누르면 다리 가운데 줄 위로, 섬 둘레를 누르면 섬 터 안으로
function clampToBridge(p) {
  if (Math.hypot(p.x - ISLAND.x, p.z - ISLAND.z) <= ISLAND.r + 3) {
    const dx = p.x - ISLAND.x, dz = p.z - ISLAND.z, d = Math.hypot(dx, dz), m = ISLAND.r - 0.3;
    const q = d <= m ? { x: p.x, z: p.z } : { x: ISLAND.x + (dx / d) * m, z: ISLAND.z + (dz / d) * m };
    if (onHermPlinth(q)) { const r = HERMITAGE.inside; return { x: clamp(q.x, r.minX, r.maxX), z: clamp(q.z, r.minZ, r.maxZ) }; }   // 암자를 누르면 안으로
    const over = islandS(q) - HERMITAGE.front;          // 암자 뒤나 옆을 누르면 앞마당으로
    return over > 0 ? { x: q.x - HERMITAGE.u.x * over, z: q.z - HERMITAGE.u.z * over } : q;
  }
  const t = bridgeT(p);
  if (p.z < RAIL_Z && t > 0 && t <= 1.02 && bridgeOff(p) <= 4) return bridgeAt(Math.min(1, Math.max(0.005, t)));
  return null;
}
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
  { kind: "wish", x: WISH.x, z: WISH.z, r: WISH.r },
];
// 바라는 점 방명록: 대웅전 문 오른쪽 중간(마당에서 법당을 볼 때 오른쪽 = -x), 법당 앞 디딤 자리 앞. 앞에 서서 법당 쪽을 보며 적는다
export const GUESTBOOK = { x: -4.0, z: 3.6, r: 0.55, spot: { x: -4.0, z: 2.65 } };   // 법당 앞을 돌아가는 길(z 4.8)과 석등 옆은 비운다
YARD.push({ kind: "guestbook", x: GUESTBOOK.x, z: GUESTBOOK.z, r: GUESTBOOK.r });
export const faceNote = (p) => Math.atan2(-(GUESTBOOK.x - p.x), -(GUESTBOOK.z - p.z));
export const nearNote = (p) => Math.hypot(p.x - GUESTBOOK.spot.x, p.z - GUESTBOOK.spot.z) <= 1.2;
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
// 맨 앞줄 가운데(0, 11.8)는 스님 자리라 방석 열넷
export const CUSHIONS = [-4, -2, 0, 2, 4].flatMap((x) => [{ x, z: 8.6 }, { x, z: 10.2 }, { x, z: 11.8 }]).filter((c) => !(c.x === 0 && c.z === 11.8));
export const FLOOR_Y = 0.5;
// 스님 자리: 맨 앞줄 가운데, 부처님 바로 앞. 늘 앉아 목탁을 치며 염불한다 (앞에 경상). r은 못 들어가는 반지름
export const MONK = { x: 0, z: 11.8, r: 0.85 };
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
const SEATS = [...CUSHIONS, ...PRAYER_SEATS, ...CAVE.seats, ...HERMITAGE.seats];
const faceCandles = (p) => Math.atan2(-(CANDLES.x - p.x), -(CANDLES.z - p.z));
export const nearCandles = (p) => Math.hypot(p.x - CANDLES.spot.x, p.z - CANDLES.spot.z) <= 1.8;
export { faceCandles };
export const faceWish = (p) => Math.atan2(-(WISH.x - p.x), -(WISH.z - p.z));
export const nearWish = (p) => Math.hypot(p.x - WISH.spot.x, p.z - WISH.spot.z) <= 1.8;
// 앉는 방향: 법당 안이면 부처님, 밖(기도 터)이면 해수관음
export const faceSeat = (p) => (insideHall(p) ? faceAltar(p) : insideCave(p) ? faceCaveAltar(p) : insideHermitage(p) ? faceHermAltar(p) : faceStatue(p));
// 향·초 공양을 올리는 곳: 대웅전·섬 암자 안이면 향, 동굴 법당 안과 해수관음 앞(기도 터나 받침 둘레)이면 초
const inPrayer = (p) => p.x >= PRAYER.minX && p.x <= PRAYER.maxX && p.z >= PRAYER.minZ && p.z <= PRAYER.maxZ;
export function offerPlace(p) {
  if (insideHall(p)) return "hall";
  if (insideHermitage(p)) return "herm";
  if (insideCave(p)) return "cave";
  if (inPrayer(p) || Math.hypot(p.x - STATUE.x, p.z - STATUE.z) <= STATUE.baseR + 1.6) return "gwan";
  return null;
}
export const faceOffer = (p, k) => (k === "hall" ? faceAltar(p) : k === "herm" ? faceHermAltar(p) : k === "cave" ? faceCaveAltar(p) : faceStatue(p));

// 법당 받침 위는 반 미터 높고, 앞쪽 디딤돌에서 비스듬히 오른다
const BASE = { minX: HALL.minX - 0.4, maxX: HALL.maxX + 0.4, minZ: 5.2, maxZ: HALL.maxZ + 0.3 }, STEP_Z = 4.9;
export function floorY({ x, z }) {
  if (onHermPlinth({ x, z })) return HERMITAGE.fy;
  if (Math.abs(z - HERMITAGE.z) <= 1.0 && x > HERMITAGE.plinth.maxX && x < HERMITAGE.door.x) return HERMITAGE.fy * (HERMITAGE.door.x - x) / (HERMITAGE.door.x - HERMITAGE.plinth.maxX);   // 디딤돌
  if (onIsland({ x, z })) return 0;
  if (onBridge({ x, z })) return bridgeDeckY(bridgeT({ x, z }));
  if (insideCave({ x, z })) return CAVE.floor;
  if (onCaveSteps({ x, z })) return CAVE.floor * clamp((z - COURTYARD.maxZ) / (CAVE.door.z - COURTYARD.maxZ), 0, 1);
  if (x < BASE.minX || x > BASE.maxX || z < STEP_Z || z > BASE.maxZ) return 0;
  return z >= BASE.minZ ? FLOOR_Y : FLOOR_Y * (z - STEP_Z) / (BASE.minZ - STEP_Z);
}

export function clampToWalkable({ x, z }) {
  const br = clampToBridge({ x, z });
  if (br) return br;
  // 굴 둘레 바위를 누르면 굴 안으로, 돌계단 위면 계단 위로
  if (Math.abs(x - CAVE.x) <= 5 && z > CAVE.door.z - 0.5 && z < CAVE.inside.maxZ + 5) {
    const m = 0.3;
    return { x: clamp(x, CAVE.inside.minX + m, CAVE.inside.maxX - m), z: clamp(z, CAVE.inside.minZ + m, CAVE.inside.maxZ - m) };
  }
  if (z > COURTYARD.maxZ && Math.abs(x - CAVE.x) <= STEP_HALF + 0.6) return { x: clamp(x, CAVE.x - STEP_HALF + 0.2, CAVE.x + STEP_HALF - 0.2), z };
  let p = { x: clamp(x, COURTYARD.minX, COURTYARD.maxX), z: clamp(z, COURTYARD.minZ, COURTYARD.maxZ) };
  // 법당을 누르면 안으로 들어간다 (불단 앞까지)
  if (inHall(p)) {
    const q = { x: clamp(p.x, INSIDE.minX, INSIDE.maxX), z: clamp(p.z, INSIDE.minZ, INSIDE.maxZ) };
    const dx = q.x - MONK.x, dz = q.z - MONK.z, d = Math.hypot(dx, dz);   // 스님 자리를 누르면 스님 옆(바깥쪽 둘레)으로
    if (d < MONK.r) return d > 1e-6 ? { x: MONK.x + (dx / d) * MONK.r, z: MONK.z + (dz / d) * MONK.r } : { x: MONK.x, z: MONK.z - MONK.r };
    return q;
  }
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
  const gap = BRIDGE.w / 2 + 0.3;                     // 다리 들머리 난간 틈엔 기대지 않는다
  if (Math.abs(lx - BRIDGE.a.x) < gap) lx = lx <= BRIDGE.a.x ? BRIDGE.a.x - gap : BRIDGE.a.x + gap;
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
  if (Math.hypot(p.x - WISH.x, p.z - WISH.z) < WISH.r + 0.2) return { kind: "wish", to: { ...WISH.spot }, yaw: faceWish(WISH.spot) };
  if (Math.hypot(p.x - GUESTBOOK.x, p.z - GUESTBOOK.z) < GUESTBOOK.r + 0.3) return { kind: "note", to: { ...GUESTBOOK.spot }, yaw: faceNote(GUESTBOOK.spot) };
  const br = clampToBridge(p);
  if (br) return { kind: "walk", to: br };
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
  // 섬과 다리로 오가는 길: 마당 안 들머리(head) - 난간 틈(a) - 다리 - 섬 쪽 끝(b) - 섬
  const ba = inBridgeArea(from), bb = inBridgeArea(to);
  // 섬 안에서는 암자 문(door) - 문 안(doorIn)을 거쳐 드나든다
  const outOfHerm = (p) => (insideHermitage(p) ? [HERMITAGE.doorIn, HERMITAGE.door] : []);
  const intoHerm = (p) => (insideHermitage(p) ? [HERMITAGE.door, HERMITAGE.doorIn] : []);
  const toEdge = (p) => (onIsland(p) ? [...outOfHerm(p), BRIDGE.b] : []);
  const fromEdge = (p) => (onIsland(p) ? [BRIDGE.b, ...intoHerm(p)] : []);
  if (ba && bb) {
    if (onIsland(from) && onIsland(to)) return insideHermitage(from) === insideHermitage(to) ? [to] : [...outOfHerm(from), ...intoHerm(to), to];
    return onIsland(from) ? [...toEdge(from), to] : [...fromEdge(to), to];
  }
  if (ba) return [...toEdge(from), BRIDGE.a, BRIDGE.head, ...routeAround(BRIDGE.head, to)];
  if (bb) return [...routeAround(from, BRIDGE.head), BRIDGE.a, ...fromEdge(to), to];
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
