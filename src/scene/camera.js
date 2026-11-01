/* 3인칭 카메라. 기본은 캐릭터 뒤에서 바다(-z) 쪽을 본다.
   한 손가락 끌기 = 둘러보기, 두 손가락 = 확대/축소, 짧게 누르기 = onTap. */
const MIN_D = 3.5, MAX_D = 12, LEAN_D = 3.4, SHOULDER = 0.75, INDOOR_D = 2.6, INDOOR_PITCH = 0.55, INDOOR_AHEAD = 2.4;
const TAP_PX = 8, TAP_MS = 400;

export function createCameraRig(THREE, camera, dom, { onTap, obstacles = [] } = {}) {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  let yaw = 0, pitchUser = 0.3, dist = 6;                 // 사용자가 조절하는 값
  let leaning = false, leanBlend = 0;
  let indoor = false, indoorBlend = 0, yawGoal = null;   // 법당 안: 가까이, 낮게, 불단 쪽으로
  const focus = new THREE.Vector3(0, 1.1, 2), want = new THREE.Vector3(0, 1.1, 2);
  let targetYaw = 0;

  const pts = new Map();
  let downAt = 0, moved = 0, pinch0 = 0, dist0 = dist;

  dom.addEventListener("pointerdown", (e) => {
    dom.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downAt = performance.now(); moved = 0; }
    if (pts.size === 2) { pinch0 = spread(); dist0 = dist; moved = TAP_PX + 1; }
  });
  dom.addEventListener("pointermove", (e) => {
    const p = pts.get(e.pointerId);
    if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 1) {
      moved += Math.abs(dx) + Math.abs(dy);
      if (moved > TAP_PX) {
        yawGoal = null;
        yaw -= dx * 0.006;
        pitchUser = Math.min(1.15, Math.max(0.05, pitchUser + dy * 0.004));
      }
    } else if (pts.size === 2 && pinch0 > 0) {
      dist = Math.min(MAX_D, Math.max(MIN_D, dist0 * pinch0 / Math.max(1, spread())));
    }
  });
  const end = (e) => {
    const had = pts.delete(e.pointerId);
    if (had && pts.size === 0 && moved <= TAP_PX && performance.now() - downAt < TAP_MS && e.type === "pointerup") onTap?.(e.clientX, e.clientY);
  };
  dom.addEventListener("pointerup", end);
  dom.addEventListener("pointercancel", end);
  dom.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.min(MAX_D, Math.max(MIN_D, dist * (1 + Math.sign(e.deltaY) * 0.1))); }, { passive: false });

  function spread() {
    const [a, b] = [...pts.values()];
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function follow({ x, z, yaw: y = 0, y: up = 0 }) { want.set(x, 1.1 + up, z); targetYaw = y; }

  // 들어가면 불단을 바라보고, 나오면 다시 바다 쪽을 본다
  function setIndoor(on, faceYaw = Math.PI) {
    if (on === indoor) return;
    indoor = on;
    yawGoal = on ? faceYaw : 0;
  }
  function turnTo(y) { yawGoal = y; }

  function setLeaning(on) {
    if (on && !leaning) { yaw = targetYaw; yawGoal = null; pitchUser = 0.2; }       // 어깨 너머로 바다
    if (!on && leaning) { pitchUser = Math.max(pitchUser, 0.32); }
    leaning = on;
  }

  function update(dt) {
    leanBlend += ((leaning ? 1 : 0) - leanBlend) * (1 - Math.exp(-dt * 1.6));   // 약 2초에 걸쳐 옮겨 간다
    indoorBlend += ((indoor ? 1 : 0) - indoorBlend) * (1 - Math.exp(-dt * 2));
    if (yawGoal !== null) {
      const diff = Math.atan2(Math.sin(yawGoal - yaw), Math.cos(yawGoal - yaw));
      yaw += diff * (1 - Math.exp(-dt * 2.5));
      if (Math.abs(diff) < 0.01) yawGoal = null;
    }
    focus.lerp(want, 1 - Math.exp(-dt * 5));
    const near = dist + (INDOOR_D - dist) * indoorBlend;
    const pitch = pitchUser + (INDOOR_PITCH - pitchUser) * indoorBlend;   // 안에선 머리 너머로 불단이 보이게
    const d = near + (LEAN_D - near) * leanBlend;
    const fy = focus.y + 0.25 * leanBlend;
    // 기대 있을 땐 오른쪽 어깨 너머로 비켜 서서 바다가 가운데 오게 한다
    const side = SHOULDER * leanBlend;
    const cx = focus.x + Math.sin(yaw) * Math.cos(pitch) * d + Math.cos(yaw) * side;
    const cz = focus.z + Math.cos(yaw) * Math.cos(pitch) * d - Math.sin(yaw) * side;
    const cy = fy + Math.sin(pitch) * d;
    // 법당이나 불상, 뒷산에 가리면 그 앞으로 당겨 온다
    const eye = new THREE.Vector3(focus.x, fy, focus.z);
    dir.set(cx - eye.x, cy - eye.y, cz - eye.z);
    const len = dir.length();
    dir.divideScalar(len);
    ray.set(eye, dir); ray.far = len;
    const hit = obstacles.length ? ray.intersectObjects(obstacles, false)[0] : null;
    const k = hit ? Math.max(0.6, hit.distance - 0.35) / len : 1;
    camera.position.set(eye.x + dir.x * len * k, Math.max(0.4, eye.y + dir.y * len * k), eye.z + dir.z * len * k);
    // 기대 있을 땐 시선을 바다 쪽으로 조금 더 멀리
    const ahead = 4 * leanBlend + INDOOR_AHEAD * indoorBlend;
    camera.lookAt(focus.x - Math.sin(yaw) * ahead + Math.cos(yaw) * side, fy + 0.1 * leanBlend, focus.z - Math.cos(yaw) * ahead - Math.sin(yaw) * side);
  }

  return { follow, setLeaning, setIndoor, turnTo, update };
}
