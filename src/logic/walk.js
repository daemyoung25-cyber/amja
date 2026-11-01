/* 이동은 "어디서 어디로 언제 출발" 하나로 표현한다. 받는 쪽도 같은 계산으로 걸음을 그린다. */
import { WALK_SPEED } from "../config.js";

export const startMove = (from, to, nowMs) => ({ fx: from.x, fz: from.z, tx: to.x, tz: to.z, t: nowMs });

// yaw 0 = -z(바다), +x 쪽이면 -PI/2. Three.js rotation.y에 그대로 넣는다.
const yawOf = (dx, dz) => Math.atan2(-dx, -dz);

export function positionAt(m, nowMs, speed = WALK_SPEED) {
  const dx = m.tx - m.fx, dz = m.tz - m.fz, len = Math.hypot(dx, dz);
  if (len < 1e-6) return { x: m.tx, z: m.tz, yaw: 0, arrived: true };
  const yaw = yawOf(dx, dz);
  const k = Math.min(1, Math.max(0, ((nowMs - m.t) / 1000) * speed / len));
  return { x: m.fx + dx * k, z: m.fz + dz * k, yaw, arrived: k >= 1 };
}
