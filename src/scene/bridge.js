/* 출렁다리: 마당 왼쪽 앞 난간 틈에서 섬 꼭대기 터까지. 양끝에 화강암 문기둥, 굵은 밧줄 손잡이 두 줄,
   그 아래 줄에 매단 나무 디딤판. 디딤판 높이는 layout.js의 bridgeDeckY를 그대로 따른다 (걷는 높이와 같게).
   섬 터는 마당 높이의 둥근 박석 터 (뒷날 작은 암자 자리). */
import { BRIDGE, ISLAND, bridgeAt, bridgeDeckY } from "../logic/layout.js";

export function createBridge(THREE) {
  const group = new THREE.Group();
  const hits = [];                                   // 눌러서 걸어갈 수 있는 면 (보이지 않는 판)
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const granite = mat(0xa59c8c), graniteDark = mat(0x857c6e), plankMat = mat(0x8a6644), ropeMat = mat(0x6b5236);
  const { a, b, w } = BRIDGE;
  const L = Math.hypot(b.x - a.x, b.z - a.z), ux = (b.x - a.x) / L, uz = (b.z - a.z) / L;
  const nx = -uz, nz = ux;                           // 다리 옆 방향
  const yaw = Math.atan2(ux, uz);                    // 로컬 +z가 다리 방향
  const at = (t, side = 0, y = 0) => { const c = bridgeAt(t); return new THREE.Vector3(c.x + nx * side, bridgeDeckY(t) + y, c.z + nz * side); };

  /* 양끝 문기둥: 화강암 네모 기둥 한 쌍 + 머릿돌. 밧줄이 기둥 머리에 묶인다 */
  const POST_H = 1.9, half = w / 2 + 0.22;
  for (const t of [0, 1]) {
    for (const s of [-1, 1]) {
      const p = at(t, s * half);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.34, POST_H, 0.34), granite);
      post.position.set(p.x, POST_H / 2, p.z); post.rotation.y = yaw; group.add(post);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.14, 0.46), graniteDark);
      cap.position.set(p.x, POST_H + 0.07, p.z); cap.rotation.y = yaw; group.add(cap);
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.3, 0.6), graniteDark);
      base.position.set(p.x, 0.0, p.z); base.rotation.y = yaw; group.add(base);
    }
  }

  /* 밧줄: 손잡이 두 줄(기둥 머리에서 처져 손 높이로), 디딤판 받치는 아래 두 줄 */
  const N = 120;
  const rail = (t) => 1.0 + 0.75 * Math.exp(-t * 40) + 0.75 * Math.exp(-(1 - t) * 40);   // 기둥 가까이선 위로 묶인다
  const rope = (side, yOf, r) => {
    const pts = [];
    for (let i = 0; i <= N; i++) { const t = i / N; pts.push(at(t, side, yOf(t))); }
    const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, r, 5, false), ropeMat);
    group.add(m);
  };
  for (const s of [-1, 1]) {
    rope(s * half, rail, 0.04);
    rope(s * (w / 2 - 0.08), () => -0.06, 0.035);
  }

  /* 디딤판: 0.32m마다 나무판 하나, 판 사이 틈. 세로 줄(달대)은 1.6m마다 양옆 */
  const STEP = 0.32, count = Math.floor(L / STEP);
  const planks = new THREE.InstancedMesh(new THREE.BoxGeometry(w, 0.05, 0.24), plankMat, count);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count, p = at(t, 0, -0.025), q = at(Math.min(1, t + 0.01), 0, -0.025);
    dummy.position.copy(p); dummy.lookAt(q); dummy.updateMatrix();
    planks.setMatrixAt(i, dummy.matrix);
  }
  group.add(planks);
  const HANG = 1.6, hn = Math.floor(L / HANG);
  const hangers = new THREE.InstancedMesh(new THREE.BoxGeometry(0.018, 1, 0.018), ropeMat, hn * 2);
  let k = 0;
  for (let i = 1; i <= hn; i++) {
    const t = i / (hn + 1);
    for (const s of [-1, 1]) {
      const top = at(t, s * half, rail(t)), bot = at(t, s * (w / 2 - 0.08), -0.06);
      dummy.position.copy(top).add(bot).multiplyScalar(0.5);
      dummy.lookAt(top); dummy.rotateX(Math.PI / 2);
      dummy.scale.set(1, top.distanceTo(bot), 1); dummy.updateMatrix();
      hangers.setMatrixAt(k++, dummy.matrix);
      dummy.scale.set(1, 1, 1);
    }
  }
  group.add(hangers);

  /* 누를 수 있는 판: 다리를 20토막으로 (디딤판 높이를 따라) */
  const hitMat = new THREE.MeshBasicMaterial({ visible: false });
  for (let i = 0; i < 20; i++) {
    const p = at((i + 0.5) / 20), seg = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.1, L / 20 + 0.05), hitMat);
    seg.position.copy(p); seg.rotation.y = yaw; group.add(seg); hits.push(seg);
  }

  /* 섬 터: 마당 높이의 둥근 박석 터와 낮은 돌테 */
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(ISLAND.r, ISLAND.r + 0.4, 1.2, 32), mat(0x9b8f7e));
  pad.position.set(ISLAND.x, -0.6, ISLAND.z); group.add(pad); hits.push(pad);
  const edge = new THREE.Mesh(new THREE.TorusGeometry(ISLAND.r - 0.1, 0.12, 6, 40), graniteDark);
  edge.rotation.x = -Math.PI / 2; edge.position.set(ISLAND.x, 0.04, ISLAND.z); group.add(edge);

  return { group, hits };
}
