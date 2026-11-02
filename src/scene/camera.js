/* 3인칭 카메라. 기본은 캐릭터 뒤에서 바다(-z) 쪽을 본다.
   한 손가락 끌기 = 둘러보기(위로 끌면 하늘을 올려다본다), 두 손가락 = 확대/축소, 짧게 누르기 = onTap. */
const MIN_D = 3.5, MAX_D = 12, LEAN_D = 3.4, SHOULDER = 0.75, INDOOR_D = 3.2, INDOOR_PITCH = 0.45, INDOOR_AHEAD = 3.5, INDOOR_FOV = 75;
const TAP_PX = 12, TAP_MS = 700;   // 손가락 떨림과 짧은 누름을 넉넉히
const LOOK_UP = 1.25, LOW_PITCH = 0.05;   // 0보다 낮게 끌면 카메라는 낮게 머물고 시선만 하늘로 (최대 약 70°)

export function createCameraRig(THREE, camera, dom, { onTap, obstacles = [] } = {}) {
  const ray = new THREE.Raycaster();
  const dir = new THREE.Vector3();
  let yaw = 0, pitchUser = 0.3, dist = 6;                 // 사용자가 조절하는 값
  let leaning = false, leanBlend = 0;
  let indoor = false, indoorBlend = 0, yawGoal = null;
  const baseFov = camera.fov;                          // 법당 안에선 넓게 봐야 삼존이 한눈에 든다   // 법당 안: 가까이, 낮게, 불단 쪽으로
  const focus = new THREE.Vector3(0, 1.1, 2), want = new THREE.Vector3(0, 1.1, 2);
  const target = new THREE.Vector3();
  let placed = false;
  let targetYaw = 0;

  const pts = new Map();
  let downAt = 0, moved = 0, pinch0 = 0, dist0 = dist;

  dom.addEventListener("pointerdown", (e) => {
    dom.setPointerCapture?.(e.pointerId);
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.size === 1) { downAt = e.timeStamp; moved = 0; }   // 처리 시각이 아니라 실제로 누른 시각 (화면이 바쁘면 처리가 늦다)
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
        pitchUser = Math.min(1.15, Math.max(-LOOK_UP, pitchUser + dy * 0.004));
      }
    } else if (pts.size === 2 && pinch0 > 0) {
      dist = Math.min(MAX_D, Math.max(MIN_D, dist0 * pinch0 / Math.max(1, spread())));
    }
  });
  const end = (e) => {
    const had = pts.delete(e.pointerId);
    if (had && pts.size === 0 && moved <= TAP_PX && e.timeStamp - downAt < TAP_MS && e.type === "pointerup") onTap?.(e.clientX, e.clientY);
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
  let room = null;
  function setIndoor(on, faceYaw = Math.PI, box = null) {
    room = box;
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
    const fov = baseFov + (INDOOR_FOV - baseFov) * indoorBlend;
    if (Math.abs(fov - camera.fov) > 0.01) { camera.fov = fov; camera.updateProjectionMatrix(); }
    if (yawGoal !== null) {
      const diff = Math.atan2(Math.sin(yawGoal - yaw), Math.cos(yawGoal - yaw));
      yaw += diff * (1 - Math.exp(-dt * 2.5));
      if (Math.abs(diff) < 0.01) yawGoal = null;
    }
    focus.lerp(want, 1 - Math.exp(-dt * 5));
    const near = dist + (INDOOR_D - dist) * indoorBlend;
    const up = Math.max(0, -pitchUser) * (1 - indoorBlend);               // 하늘 올려다보기 (법당 안에선 안 한다)
    const orbit = Math.max(LOW_PITCH, pitchUser);
    const pitch = orbit + (INDOOR_PITCH - orbit) * indoorBlend;   // 안에선 머리 너머로 불단이 보이게
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
    // 법당 안: 벽에 부딪혀 보는 대신 방 안 상자에 가둔다 (문틀에 걸렸다 풀렸다 하며 화면이 튀지 않게)
    const inRoom = indoor && room;
    const hit = !inRoom && obstacles.length ? ray.intersectObjects(obstacles, false)[0] : null;
    const k = hit ? Math.max(0.6, hit.distance - 0.35) / len : 1;
    target.set(eye.x + dir.x * len * k, Math.max(0.4, eye.y + dir.y * len * k), eye.z + dir.z * len * k);
    if (inRoom) target.set(Math.min(room.maxX, Math.max(room.minX, target.x)), Math.min(room.maxY, target.y), Math.min(room.maxZ, Math.max(room.minZ, target.z)));
    // 갑자기 튀지 않게 조금씩 따라간다 (처음 한 번은 바로)
    if (!placed) { camera.position.copy(target); placed = true; }
    else camera.position.lerp(target, 1 - Math.exp(-dt * 10));
    // 기대 있을 땐 시선을 바다 쪽으로 조금 더 멀리
    const ahead = 4 * leanBlend + INDOOR_AHEAD * indoorBlend;
    // 올려다볼 땐 머리 앞쪽 먼 곳을 위로 들어 본다
    const reach = ahead + 6 * Math.min(1, up * 3);
    camera.lookAt(focus.x - Math.sin(yaw) * reach + Math.cos(yaw) * side, fy + 0.1 * leanBlend + Math.tan(up) * (reach + d), focus.z - Math.cos(yaw) * reach - Math.sin(yaw) * side);
  }

  return { follow, setLeaning, setIndoor, turnTo, update };
}
