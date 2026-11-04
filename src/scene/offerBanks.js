/* 사람들이 올린 초와 향을 그리는 묶음. 담 공양대·동굴 불단 앞 촛대·해수관음 받침(초)과
   대웅전·섬 암자 향로(향)가 같이 쓴다. 모두 parent 그룹의 좌표로 놓인다 (y가 위).
   setItems([{ slot, left 0..1 }]) 로 바꾸고, update(t) 로 흔들고, setNight(0..1) 로 밤빛을 맞춘다. */

// 부드러운 원 그림 (빛무리·연기 공용)
function softDot(THREE, inner, mid, outer) {
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, inner); grad.addColorStop(0.35, mid); grad.addColorStop(1, outer);
  g.fillStyle = grad; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

/* 초: 유리컵 속 흰 초, 하루 동안 짧아지고, 불꽃은 깜빡이며 둘레에 빛무리. slotPos(slot) → {x, y, z} (컵 바닥) */
export function candleBank(THREE, parent, slotPos, slots, { cup = true, scale = 1 } = {}) {
  const cupGeo = new THREE.CylinderGeometry(0.045 * scale, 0.04 * scale, 0.1 * scale, 10);
  const waxGeo = new THREE.CylinderGeometry(0.032 * scale, 0.032 * scale, 1, 10); waxGeo.translate(0, 0.5, 0);
  const flameGeo = new THREE.SphereGeometry(1, 8, 6);
  const cups = new THREE.InstancedMesh(cupGeo, new THREE.MeshLambertMaterial({ color: 0xe7c98f, transparent: true, opacity: 0.75 }), slots);
  const wax = new THREE.InstancedMesh(waxGeo, new THREE.MeshLambertMaterial({ color: 0xf7f1e4, emissive: 0x3a2a10 }), slots);
  const flames = new THREE.InstancedMesh(flameGeo, new THREE.MeshBasicMaterial({ color: 0xffc35a }), slots);
  for (const m of [cups, wax, flames]) { m.count = 0; m.frustumCulled = false; }
  parent.add(wax, flames);
  if (cup) parent.add(cups);

  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(slots * 3), 3));
  haloGeo.setDrawRange(0, 0);
  const haloMat = new THREE.PointsMaterial({ map: softDot(THREE, "rgba(255,200,110,1)", "rgba(255,160,60,0.35)", "rgba(255,140,40,0)"), size: 0.35 * scale, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.5 });
  const halos = new THREE.Points(haloGeo, haloMat);
  halos.frustumCulled = false;
  parent.add(halos);

  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3();
  let tips = [];
  function setItems(list) {
    tips = [];
    const hp = haloGeo.attributes.position;
    list.forEach((cd, i) => {
      const p = slotPos(cd.slot), h = (0.03 + 0.11 * cd.left) * scale;
      cups.setMatrixAt(i, m4.compose(v.set(p.x, p.y + 0.05 * scale, p.z), q, s.set(1, 1, 1)));
      wax.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s.set(1, h, 1)));
      tips.push({ x: p.x, y: p.y + h + 0.03 * scale, z: p.z, ph: cd.slot * 1.7 });
      hp.setXYZ(i, p.x, p.y + h + 0.04 * scale, p.z);
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
      flames.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s.set(0.014 * scale, 0.032 * f * scale, 0.014 * scale)));
    });
    if (tips.length) flames.instanceMatrix.needsUpdate = true;
    haloMat.opacity = 0.25 + 0.55 * night;
  }
  return { setItems, update, setNight: (k) => { night = k; } };
}

/* 향: 향로 재에 꽂힌 가는 향, 끝에 붉은 불씨, 위로 가늘게 피어오르다 흩어지는 연기.
   한 시간 동안 짧아진다. c = 향로 놓인 자리 {x, y(향로 바닥), z}, 향로 입 반지름 약 0.12 */
const PUFFS = 14;                 // 향 하나에 연기 알갱이
export function incenseBank(THREE, parent, c, slots) {
  const ASH = c.y + 0.13, FULL = 0.24;
  // 칸 자리: 안쪽 고리부터 바깥 고리로, 조금씩 기울게
  const spots = Array.from({ length: slots }, (_, i) => {
    const inner = i < 4, k = inner ? i : i - 4, n = inner ? 4 : slots - 4;
    const a = (k / n) * Math.PI * 2 + (inner ? 0.4 : 0), r = inner ? 0.03 : 0.07;
    return { x: c.x + Math.cos(a) * r, z: c.z + Math.sin(a) * r, lean: 0.06 + (i % 3) * 0.03, dir: a + 0.3 * (i % 2 ? 1 : -1) };
  });
  const stickGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 1, 4); stickGeo.translate(0, 0.5, 0);
  const sticks = new THREE.InstancedMesh(stickGeo, new THREE.MeshLambertMaterial({ color: 0x6e2a1c }), slots);
  const embers = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 6, 4), new THREE.MeshBasicMaterial({ color: 0xff5a1e }), slots);
  for (const m of [sticks, embers]) { m.count = 0; m.frustumCulled = false; parent.add(m); }

  // 연기: 알갱이마다 투명도·크기가 달라 작은 셰이더로 그린다
  const N = slots * PUFFS;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(N * 3), 3));
  geo.setAttribute("aA", new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.setAttribute("aS", new THREE.BufferAttribute(new Float32Array(N), 1));
  geo.setDrawRange(0, 0);
  const smokeMat = new THREE.ShaderMaterial({
    uniforms: { map: { value: softDot(THREE, "rgba(255,255,255,1)", "rgba(255,255,255,0.5)", "rgba(255,255,255,0)") }, color: { value: new THREE.Color(0xeeece6) }, scale: { value: 400 }, dim: { value: 1 } },
    vertexShader: `attribute float aA; attribute float aS; uniform float scale; varying float vA;
      void main() { vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = aS * scale / -mv.z; gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform sampler2D map; uniform vec3 color; uniform float dim; varying float vA;
      void main() { float a = texture2D(map, gl_PointCoord).a * vA; if (a < 0.003) discard; gl_FragColor = vec4(color * dim, a); }`,
    transparent: true, depthWrite: false,
  });
  const smoke = new THREE.Points(geo, smokeMat);
  smoke.frustumCulled = false;
  smoke.renderOrder = 5;
  parent.add(smoke);

  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), s = new THREE.Vector3(), e = new THREE.Euler();
  let tips = [];
  function setItems(list) {
    tips = [];
    list.forEach((it, i) => {
      const sp = spots[it.slot % slots], L = 0.03 + (FULL - 0.03) * it.left;
      e.set(Math.sin(sp.dir) * sp.lean, 0, -Math.cos(sp.dir) * sp.lean);
      q.setFromEuler(e);
      sticks.setMatrixAt(i, m4.compose(v.set(sp.x, ASH, sp.z), q, s.set(1, L, 1)));
      const tip = new THREE.Vector3(0, L, 0).applyQuaternion(q).add(v.set(sp.x, ASH, sp.z));
      tips.push({ x: tip.x, y: tip.y, z: tip.z, ph: it.slot * 2.3 });
    });
    q.identity();
    sticks.count = embers.count = list.length;
    sticks.instanceMatrix.needsUpdate = true;
    geo.setDrawRange(0, list.length * PUFFS);
  }
  const RISE = 1.1, SPEED = 0.07;               // 연기가 오르는 높이(m)와 빠르기(한 바퀴/초)
  function update(t) {
    if (!tips.length) return;
    smokeMat.uniforms.scale.value = (window.innerHeight * Math.min(window.devicePixelRatio || 1, 2)) / 2;
    const pos = geo.attributes.position, A = geo.attributes.aA, S = geo.attributes.aS;
    tips.forEach((p, i) => {
      const glow = 1 + Math.sin(t * 2.1 + p.ph) * 0.25;
      embers.setMatrixAt(i, m4.compose(v.set(p.x, p.y, p.z), q, s.set(0.006 * glow, 0.009 * glow, 0.006 * glow)));
      for (let j = 0; j < PUFFS; j++) {
        const u = (t * SPEED + j / PUFFS + p.ph * 0.13) % 1, h = u * RISE;   // 0에서 1로 오르며
        const sway = Math.sin(h * 7 + t * 0.7 + p.ph) * 0.035 * u + Math.sin(t * 0.23 + p.ph) * 0.06 * u * u;
        const k = i * PUFFS + j;
        pos.setXYZ(k, p.x + sway, p.y + 0.01 + h, p.z + Math.cos(h * 5 + t * 0.5 + p.ph) * 0.025 * u);
        A.setX(k, 0.6 * Math.min(1, u * 6) * (1 - u) ** 1.3);                    // 피어올라 흩어진다
        S.setX(k, 0.03 + 0.24 * u);
      }
    });
    embers.instanceMatrix.needsUpdate = true;
    pos.needsUpdate = A.needsUpdate = S.needsUpdate = true;
  }
  return { setItems, update, setNight: (k) => { smokeMat.uniforms.dim.value = 1 - 0.65 * k; } };
}
