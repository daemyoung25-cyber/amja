/* 이동은 "어디서 어디로 언제 출발" 하나로 표현한다. 받는 쪽도 같은 계산으로 걸음을 그린다. */
import { WALK_SPEED } from "../config.js";

// walked: 멈추지 않고 이어 걷는 중이면 지금까지 걸은 거리(m). 있을 때만 w로 싣는다
export const startMove = (from, to, nowMs, walked = 0) => {
  const m = { fx: from.x, fz: from.z, tx: to.x, tz: to.z, t: nowMs };
  if (walked > 0) m.w = Math.round(walked * 100) / 100;
  return m;
};

// 새로 걷기 시작할 때 이어 갈 거리: 멈춰 있었으면(도착했고 남은 경유지도 없으면) 0
export const carriedWalk = (here, routeLeft) => (here.arrived && !routeLeft ? 0 : here.walked);

// 이어 걸은 거리가 BRISK_AFTER를 넘으면 BRISK배로 걷는다
export const BRISK_AFTER = 3, BRISK = 1.5;
function distanceIn(sec, already, speed) {
  const slowLeft = Math.max(0, BRISK_AFTER - already), slowSec = slowLeft / speed;
  return sec <= slowSec ? sec * speed : slowLeft + (sec - slowSec) * speed * BRISK;
}

// yaw 0 = -z(바다), +x 쪽이면 -PI/2. Three.js rotation.y에 그대로 넣는다.
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);

export function positionAt(m, nowMs, speed = WALK_SPEED) {
  const dx = m.tx - m.fx, dz = m.tz - m.fz, len = Math.hypot(dx, dz);
  const already = typeof m.w === "number" && m.w > 0 ? m.w : 0;
  if (len < 1e-6) return { x: m.tx, z: m.tz, yaw: 0, arrived: true, walked: already };
  const yaw = yawOf(dx, dz);
  const k = Math.min(1, distanceIn(Math.max(0, (nowMs - m.t) / 1000), already, speed) / len);
  return { x: m.fx + dx * k, z: m.fz + dz * k, yaw, arrived: k >= 1, walked: already + len * k };
}
