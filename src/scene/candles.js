/* 촛불 공양대: 돌 받침 위 붉은 나무 장, 네 단 계단 선반(단마다 12칸), 작은 기와지붕.
   초는 유리컵 속 흰 초, 하루 동안 짧아진다. 불꽃은 깜빡이고 둘레에 빛무리. 앞(바다 쪽, -z)에서 올린다. */
import { CANDLE_SLOTS } from "../logic/candles.js";

const COLS = 12, TIERS = CANDLE_SLOTS / COLS;
const ORDER = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11];          // 가운데부터 바깥으로 채운다

// 칸 번호 → 공양대 안의 자리 (앞 단부터)
function slotPos(slot) {
  const tier = Math.floor(slot / COLS), col = ORDER[slot % COLS];
  return { x: (col - (COLS - 1) / 2) * 0.15, y: 0.78 + tier * 0.2, z: -0.22 + tier * 0.13 };
}

export function createCandleRack(THREE, { x, z }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const stone = mat(0x9a9285), wood = mat(0x7a2a1e), shelfMat = mat(0x5a3a26), roofMat = mat(0x2e3138), gold = mat(0xb08a3a);
  const box = (w, h, d, m, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); group.add(o); return o; };

  box(2.1, 0.3, 0.9, stone, 0, 0.15, 0);                       // 돌 받침
  box(2.0, 0.36, 0.8, wood, 0, 0.48, 0);                       // 장 아랫단
  for (let i = 0; i < TIERS; i++) {                            // 계단 선반
    const p = slotPos(i * COLS);
    box(1.9, 0.04, 0.16, shelfMat, 0, p.y - 0.02, p.z);
    box(1.9, p.y - 0.66, 0.03, shelfMat, 0, (p.y + 0.66) / 2 - 0.02, p.z + 0.08);
  }
  box(2.0, 1.25, 0.06, wood, 0, 1.13, 0.37);                   // 뒤판
  for (const sx of [-1, 1]) box(0.08, 1.6, 0.08, wood, sx * 0.98, 1.1, -0.36);   // 앞기둥
  for (const sx of [-1, 1]) box(0.06, 1.25, 0.76, wood, sx * 0.98, 1.13, 0);     // 옆판
  box(2.0, 0.1, 0.1, wood, 0, 1.8, -0.36);                     // 앞 도리
  // 기와지붕: 앞뒤로 기운 두 장 + 용마루
  for (const s of [-1, 1]) {
    const r = box(2.5, 0.06, 0.75, roofMat, 0, 2.0, s * 0.27);
    r.rotation.x = s * 0.42;
  }
  box(2.55, 0.08, 0.08, roofMat, 0, 2.15, 0);
  box(0.5, 0.12, 0.02, gold, 0, 1.68, -0.4);                   // 현판 자리

  /* 초: 컵(투명한 듯 연한 호박빛), 초, 불꽃은 칸 수만큼 인스턴스로 */
  const cupGeo = new THREE.CylinderGeometry(0.045, 0.04, 0.1, 10);
  const waxGeo = new THREE.CylinderGeometry(0.032, 0.032, 1, 10); waxGeo.translate(0, 0.5, 0);
  const flameGeo = new THREE.SphereGeometry(1, 8, 6);
  const cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshLambertMaterial({ color: 0xe7c98f, transparent: true, opacity: 0.75 }), CANDLE_SLOTS);
  const wax = new THREE.InstancedMesh(waxGeo, new THREE.MeshLambertMaterial({ color: 0xf7f1e4, emissive: 0x3a2a10 }), CANDLE_SLOTS);
  const flames = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xffc35a }), CANDLE_SLOTS);
  for (const m of [cups, wax, flames]) { m.count = 0; m.frustumCulled = false; group.add(m); }

  // 빛무리: 부드러운 원 그림을 점으로 (더해지는 빛)
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, "rgba(255,200,110,1)"); grad.addColorStop(0.35, "rgba(255,160,60,0.35)"); grad.addColorStop(1, "rgba(255,140,40,0)");
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(CANDLE_SLOTS * 3), 3));
  haloGeo.setDrawRange(0, 0);
  const haloMat = new THREE.PointsMaterial({ map: new THREE.CanvasTexture(c), size: 0.35, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
  const halos = new THREE.Points(haloGeo, haloMat);
  halos.frustumCulled = false;
  group.add(halos);

  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let tips = [];                                               // 불꽃 자리 (흔들기용)
  function setCandles(list) {                                  // list: [{ slot, left (0..1) }]
    tips = [];
    const hp = haloGeo.attributes.position;
    list.forEach((cd, i) => {
      const p = slotPos(cd.slot), h = 0.03 + 0.11 * cd.left;
      cups.setMatrixAt(i, m4.compose(v.set(p.x, p.y + 0.05, p.z), q, s.set(1, 1, 1)));
      wax.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s.set(1, h, 1)));
      tips.push({ x: p.x, y: p.y + h + 0.03, z: p.z, ph: cd.slot * 1.7 });
      hp.setXYZ(i, p.x, p.y + h + 0.04, p.z);
    });
    cups.count = wax.count = flames.count = list.length;
    cups.instanceMatrix.needsUpdate = wax.instanceMatrix.needsUpdate = true;
    hp.needsUpdate = true;
    haloGeo.setDrawRange(0, list.length);
  }

  let night = 0;
  function update(t) {
    tips.forEach((p, i) => {
      const f = 1 + Math.sin(t * 11 + p.ph) * 0.12 + Math.sin(t * 6.3 + p.ph * 2) * 0.08;
      flames.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s.set(0.014, 0.032 * f, 0.014)));
    });
    if (tips.length) flames.instanceMatrix.needsUpdate = true;
    haloMat.opacity = 0.25 + 0.55 * night;
  }
  function setNight(k) { night = k; }

  return { group, setCandles, update, setNight };
}
