/* 암자 풍경: 하늘, 바다, 절벽, 마당, 법당, 풍경, 난간, 관세음보살. 전부 코드로 만든 로우폴리. */
import { COURTYARD, RAIL_Z, HALL, STATUE, CHIME } from "../logic/layout.js";
import { skyAt, sunTimesKST } from "../logic/sky.js";
import { bucketTraces, TRACE_MAX } from "../logic/traces.js";

const SEA_Y = -28;
const KST_MS = 9 * 3600000;

export function createWorld(THREE, scene) {
  const groundMeshes = [];
  const obstacles = [];         // 카메라가 뚫고 들어가면 안 되는 것
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
  const add = (mesh, pickable = false) => { scene.add(mesh); if (pickable) groundMeshes.push(mesh); return mesh; };

  /* 하늘: 위아래 그라데이션 + 해/달 */
  const skyU = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color() }, night: { value: 0 },
  };
  add(new THREE.Mesh(new THREE.SphereGeometry(900, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, horizon, sunColor, sunDir; uniform float night; varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizon, top, pow(smoothstep(-0.02, 0.55, h), 0.7));
        float d = max(dot(vDir, normalize(sunDir)), 0.0);
        c += sunColor * (pow(d, 900.0) * 1.6 + pow(d, 12.0) * 0.18 * (1.0 - night));
        float st = step(0.9975, hash(floor(vDir * 420.0))) * smoothstep(0.08, 0.4, h) * night;
        c += vec3(st * 0.8);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));

  /* 바다: 잔물결은 셰이더로, 해 쪽으로 반짝이는 띠 */
  const seaU = {
    time: { value: 0 }, sea: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, -1) }, sunColor: { value: new THREE.Color() }, camPos: { value: new THREE.Vector3() },
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.ShaderMaterial({
    uniforms: seaU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float time; uniform vec3 sea, horizon, sunColor, sunDir, camPos; varying vec3 vW;
      void main(){
        vec2 p = vW.xz;
        float t = time;
        vec3 n = normalize(vec3(
          0.10*sin(p.x*0.07 + t*0.9) + 0.06*sin(p.x*0.21 + p.y*0.13 + t*1.7) + 0.03*sin(p.x*0.6 - p.y*0.4 + t*2.6),
          1.0,
          0.10*sin(p.y*0.09 + t*0.7) + 0.06*sin(p.y*0.23 - p.x*0.11 + t*1.5) + 0.03*sin(p.y*0.7 + p.x*0.3 + t*2.3)));
        vec3 v = normalize(camPos - vW);
        float fres = pow(1.0 - max(dot(n, v), 0.0), 3.0);
        vec3 c = mix(sea, horizon, clamp(fres * 0.9, 0.0, 1.0));
        vec3 r = reflect(-v, n);
        float s = pow(max(dot(r, normalize(sunDir)), 0.0), 220.0);
        c += sunColor * s * 1.4 * step(0.0, sunDir.y + 0.03);
        float dist = length(vW.xz - camPos.xz);
        c = mix(c, horizon, smoothstep(300.0, 1600.0, dist));
        gl_FragColor = vec4(c, 1.0);
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_Y;
  add(sea, true);

  /* 절벽과 마당 */
  const rock = mat(0x5a4b40), rockDark = mat(0x463a32), stone = mat(0x9b8f7e), grass = mat(0x4b5a3c);
  const W = COURTYARD.maxX - COURTYARD.minX, D = COURTYARD.maxZ - COURTYARD.minZ;
  const ground = add(new THREE.Mesh(new THREE.BoxGeometry(W + 2, 1, D + 2), stone), true);
  ground.position.set(0, -0.5, (COURTYARD.minZ + COURTYARD.maxZ) / 2 + 1);
  // 마당 박석 줄눈
  const lines = new THREE.GridHelper(Math.max(W, D) + 2, 18, 0x7e735f, 0x7e735f);
  lines.position.set(0, 0.01, ground.position.z);
  lines.material.transparent = true; lines.material.opacity = 0.35;
  scene.add(lines);
  // 바다 쪽으로 깎아지른 절벽: 겹친 바위 덩어리
  const rnd = mulberry32(7);
  for (let i = 0; i < 14; i++) {
    const w = 6 + rnd() * 6, h = 10 + rnd() * 18;
    const g = new THREE.DodecahedronGeometry(1, 0);
    const m = new THREE.Mesh(g, rnd() > 0.5 ? rock : rockDark);
    m.scale.set(w / 2, h / 2, 4 + rnd() * 3);
    m.position.set(-16 + i * 2.6 + rnd(), -h / 2 - 0.6 + rnd() * 2, RAIL_Z - 2.2 - rnd() * 2.5);
    m.rotation.set(rnd() * 0.4, rnd() * 3, rnd() * 0.3);
    add(m);
  }
  const cliffBody = add(new THREE.Mesh(new THREE.BoxGeometry(W + 30, 30, 40), rockDark));
  obstacles.push(cliffBody);
  cliffBody.position.set(0, -15.6, COURTYARD.maxZ + 15);
  // 뒤쪽 산자락과 옆 해안
  for (let i = 0; i < 9; i++) {
    const hill = add(new THREE.Mesh(new THREE.ConeGeometry(14 + rnd() * 16, 14 + rnd() * 18, 7), mat(i % 2 ? 0x3d4a33 : 0x34412d)));
    hill.position.set(-70 + i * 18 + rnd() * 6, 2, 30 + rnd() * 20);
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 6; i++) {
      const r = add(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), rnd() > 0.5 ? rock : rockDark));
      const s = 8 + rnd() * 10;
      r.scale.set(s, s * (1 + rnd()), s);
      r.position.set(side * (26 + i * 9 + rnd() * 4), SEA_Y + s * 0.6, -6 - i * 10 - rnd() * 8);
      const cap = add(new THREE.Mesh(new THREE.ConeGeometry(s * 0.9, s * 0.8, 6), grass));
      cap.position.set(r.position.x, r.position.y + s * 1.25, r.position.z);
    }
  }
  // 마당 양옆: 낮은 돌담과 그 뒤로 솟은 산자락
  const wallMat = mat(0x8c8273), capMat = mat(0x3a3533);
  for (const side of [-1, 1]) {
    const len = COURTYARD.maxZ - RAIL_Z;
    const sw = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, len), wallMat));
    sw.position.set(side * (COURTYARD.maxX + 0.5), 0.5, (RAIL_Z + COURTYARD.maxZ) / 2);
    const swCap = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, len + 0.2), capMat));
    swCap.position.set(sw.position.x, 1.05, sw.position.z);
    obstacles.push(sw);
    for (let i = 0; i < 4; i++) {
      const s = 5 + rnd() * 3;
      const slope = add(new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), i % 2 ? grass : mat(0x56643f)));
      slope.scale.set(s * 1.1, s * (0.7 + rnd() * 0.5), s);
      slope.position.set(side * (COURTYARD.maxX + 3 + s * 0.6), -1 + rnd(), RAIL_Z + 2 + i * 4.5);
      obstacles.push(slope);
    }
  }

  // 멀리 작은 섬 둘
  for (const [x, z, s] of [[-180, -520, 26], [240, -760, 40]]) {
    const isl = add(new THREE.Mesh(new THREE.ConeGeometry(s * 2.2, s, 7), mat(0x2e3a3a)));
    isl.position.set(x, SEA_Y + s * 0.3, z);
  }

  /* 소나무 몇 그루 */
  const pine = (x, z, h) => {
    const trunk = add(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, h * 0.5, 5), mat(0x5b4030)));
    trunk.position.set(x, h * 0.25, z);
    for (let k = 0; k < 3; k++) {
      const leaf = add(new THREE.Mesh(new THREE.ConeGeometry(h * (0.34 - k * 0.07), h * 0.32, 6), mat(0x2f4a33)));
      leaf.position.set(x, h * (0.48 + k * 0.17), z);
    }
  };
  pine(-11, 8.5, 5.5); pine(-9.5, 9.6, 4.2); pine(11.2, 8.8, 5);

  /* 법당: 흰 벽, 기둥, 짙은 기와지붕, 들린 처마 */
  const hall = new THREE.Group();
  const hw = HALL.maxX - HALL.minX, hd = HALL.maxZ - HALL.minZ, hz = (HALL.minZ + HALL.maxZ) / 2;
  const base = new THREE.Mesh(new THREE.BoxGeometry(hw + 0.8, 0.5, hd + 0.6), mat(0x8a7f70));
  base.position.set(0, 0.25, hz);
  const wall = new THREE.Mesh(new THREE.BoxGeometry(hw - 0.4, 2.8, hd - 1.2), mat(0xefe6d4));
  wall.position.set(0, 1.9, hz + 0.4);
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.1, 0.05), mat(0x5a3d29));
  door.position.set(0, 1.55, HALL.minZ + 0.98);
  const doorGlow = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.8), new THREE.MeshBasicMaterial({ color: 0xffc97a, transparent: true, opacity: 0 }));
  doorGlow.position.set(0, 1.5, HALL.minZ + 1.01);
  hall.add(base, wall, door, doorGlow);
  for (const x of [-3.4, -1.15, 1.15, 3.4]) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.15, 2.9, 8), mat(0x7a3b2a));
    pillar.position.set(x, 1.95, HALL.minZ + 0.3);
    hall.add(pillar);
  }
  const roofMat = mat(0x2d2a2a);
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-(hd / 2 + 1.5), 0); roofShape.quadraticCurveTo(-(hd / 2) + 0.4, 0.15, -0.6, 1.9);
  roofShape.lineTo(0.6, 1.9); roofShape.quadraticCurveTo(hd / 2 - 0.4, 0.15, hd / 2 + 1.5, 0); roofShape.lineTo(-(hd / 2 + 1.5), 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: hw + 2.4, bevelEnabled: false }), roofMat);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-(hw + 2.4) / 2, 3.25, hz);
  hall.add(roof);
  for (const x of [-(hw / 2 + 1.1), hw / 2 + 1.1]) for (const z of [HALL.minZ - 0.9, HALL.maxZ + 0.9]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.7, 4), roofMat);
    tip.position.set(x, 3.45, z);
    tip.rotation.set(z < hz ? -0.7 : 0.7, 0, x < 0 ? 0.5 : -0.5);
    hall.add(tip);
  }
  const ridge = new THREE.Mesh(new THREE.BoxGeometry(hw + 2.8, 0.22, 0.3), roofMat);
  ridge.position.set(0, 5.2, hz);
  hall.add(ridge);
  scene.add(hall);
  hall.traverse((o) => { if (o.isMesh && o !== doorGlow) { groundMeshes.push(o); obstacles.push(o); } });

  /* 풍경: 처마 끝에 매달린 종과 물고기 */
  const chime = new THREE.Group();
  const bronze = mat(0x8a7346);
  const bell = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.13, 0.22, 8, 1, true), bronze);
  bell.material.side = THREE.DoubleSide;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.32, 3), mat(0x222222));
  string.position.y = -0.27;
  const fish = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.14, 0.2), bronze);
  fish.position.y = -0.48;
  chime.add(bell, string, fish);
  chime.position.set(CHIME.x, CHIME.y, CHIME.z);
  scene.add(chime);

  /* 난간 */
  const wood = mat(0x4a3426);
  const railLen = W;
  for (let x = COURTYARD.minX; x <= COURTYARD.maxX + 0.01; x += 1.5) {
    const post = add(new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.1, 0.12), wood));
    post.position.set(x, 0.55, RAIL_Z + 0.1);
  }
  for (const y of [1.05, 0.55]) {
    const rail = add(new THREE.Mesh(new THREE.BoxGeometry(railLen, 0.08, 0.1), wood));
    rail.position.set(0, y, RAIL_Z + 0.1);
  }
  const railHit = new THREE.Mesh(new THREE.BoxGeometry(railLen, 1.4, 0.8), new THREE.MeshBasicMaterial({ visible: false }));
  railHit.position.set(0, 0.7, RAIL_Z - 0.1);
  add(railHit, true);

  /* 관세음보살: 연꽃 받침 위에 서서 바다를 바라본다 (-z) */
  const statue = new THREE.Group();
  const granite = mat(0xe9e4d8), graniteShade = mat(0xcfc8b8);
  const steps = [[1.2, 0.35], [1.0, 0.3], [0.85, 0.25]];
  let y = 0;
  for (const [r, h] of steps) {
    const s = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 1.04, h, 12), graniteShade);
    s.position.y = y + h / 2; y += h; statue.add(s);
  }
  const lotus = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.5, 0.35, 12), granite);
  lotus.position.y = y + 0.17; y += 0.35; statue.add(lotus);
  const robePts = [[0.55, 0], [0.62, 0.4], [0.5, 1.4], [0.46, 2.1], [0.5, 2.5], [0.42, 2.8], [0.2, 2.95], [0.0, 2.97]].map(([r, h]) => new THREE.Vector2(r, h));
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 14), granite);
  robe.position.y = y; statue.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), granite);
  head.position.y = y + 3.22; statue.add(head);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.34, 8), graniteShade);
  crown.position.y = y + 3.55; statue.add(crown);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.32, 6), graniteShade);
  vase.position.set(0.32, y + 1.9, -0.4); statue.add(vase);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), granite);
  hand.position.set(-0.18, y + 2.2, -0.42); statue.add(hand);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 24), graniteShade);
  halo.position.set(0, y + 3.3, 0.25); statue.add(halo);
  statue.position.set(STATUE.x, 0, STATUE.z);
  statue.rotation.y = 0;   // 정면(-z)이 바다
  scene.add(statue);
  statue.traverse((o) => { if (o.isMesh) { groundMeshes.push(o); obstacles.push(o); } });

  /* 빛 */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444033, 0.8);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(hemi, sun, sun.target);
  scene.fog = new THREE.Fog(0x000000, 120, 900);

  let skyTimer = 1, t = 0, swing = 0;
  const tmp = new THREE.Color();

  function applySky(date) {
    const s = skyAt(date);
    skyU.top.value.setRGB(...s.sky);
    skyU.horizon.value.setRGB(...s.horizon);
    seaU.sea.value.setRGB(...s.sea);
    seaU.horizon.value.setRGB(...s.horizon);
    const night = 1 - Math.min(1, Math.max(0, (s.sunElevation + 10) / 10));
    skyU.night.value = night;

    // 해: 동(+x) → 남(-z, 바다 위) → 서(-x). 밤에는 반대편에서 달이 같은 길을 간다.
    const { sunrise, sunset } = sunTimesKST(date);
    const kstMin = ((date.getTime() + KST_MS) / 60000) % 1440;
    let f = (kstMin - sunrise) / (sunset - sunrise);
    const isNight = f < 0 || f > 1;
    if (isNight) f = (((kstMin - sunset + 1440) % 1440) / (1440 - (sunset - sunrise)));
    const az = Math.PI * f;                                     // 0: 동, PI: 서
    const el = Math.max(isNight ? 0.25 : -0.12, Math.abs(s.sunElevation) * Math.PI / 180) * (isNight ? 1 : Math.sign(s.sunElevation) || 1);
    const dir = new THREE.Vector3(Math.cos(az) * Math.cos(el), Math.sin(el), -Math.sin(az) * Math.cos(el)).normalize();
    skyU.sunDir.value.copy(dir);
    seaU.sunDir.value.copy(dir);
    if (isNight) { skyU.sunColor.value.setRGB(0.5, 0.52, 0.6); seaU.sunColor.value.setRGB(0.35, 0.38, 0.5); }
    else { skyU.sunColor.value.setRGB(...s.sun); seaU.sunColor.value.setRGB(...s.sun); }

    sun.position.copy(dir).multiplyScalar(100);
    sun.color.setRGB(...(isNight ? [0.55, 0.6, 0.8] : s.sun));
    sun.intensity = isNight ? 0.25 : 0.3 + 1.1 * s.light;
    hemi.intensity = 0.25 + 0.75 * s.light;
    hemi.color.setRGB(...s.sky).lerp(tmp.setRGB(1, 1, 1), 0.5);
    scene.fog.color.setRGB(...s.horizon);
    doorGlow.material.opacity = night * 0.8;
  }

  function update(date, dt, camPos) {
    t += dt;
    seaU.time.value = t;
    if (camPos) seaU.camPos.value.copy(camPos);
    skyTimer += dt;
    if (skyTimer >= 1) { skyTimer = 0; applySky(date); }
    swing += dt;
    chime.rotation.z = Math.sin(swing * 1.3) * 0.06 + Math.sin(swing * 0.37) * 0.04;
    chime.rotation.x = Math.sin(swing * 0.9) * 0.03;
  }

  /* 다녀간 흔적: 발자국 한 쌍(step) 또는 난간 앞 옅은 원(lean). 소리는 없다.
     투명도를 몇 단계로 묶어 종류×단계마다 InstancedMesh 하나로 그린다 (최대 12번 그리기). */
  const feet = [];
  for (const [ox, oz] of [[-0.09, 0.04], [0.09, -0.04]]) {
    const sh = new THREE.Shape();
    sh.absellipse(ox, oz, 0.07, 0.11, 0, Math.PI * 2, false, 0);
    feet.push(sh);
  }
  const traceGeo = { step: new THREE.ShapeGeometry(feet, 6), lean: new THREE.RingGeometry(0.22, 0.3, 20) };
  for (const g of Object.values(traceGeo)) g.rotateX(-Math.PI / 2);
  const traceMeshes = new Map();          // "k:level" -> InstancedMesh
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1), at = new THREE.Vector3();
  function setTraces(list) {
    const groups = bucketTraces(list);
    for (const mesh of traceMeshes.values()) mesh.count = 0;
    for (const [key, g] of Object.entries(groups)) {
      let mesh = traceMeshes.get(key);
      if (!mesh) {
        mesh = new THREE.InstancedMesh(traceGeo[g.k] || traceGeo.step, new THREE.MeshBasicMaterial({ color: 0x3e372f, transparent: true, depthWrite: false, opacity: g.opacity }), TRACE_MAX);
        mesh.frustumCulled = false;
        scene.add(mesh);
        traceMeshes.set(key, mesh);
      }
      g.items.forEach((t, i) => {
        q.setFromAxisAngle(up, (t.x * 7.31 + t.z * 3.17) % (Math.PI * 2));   // 자리마다 다른 방향 (매번 같게)
        mesh.setMatrixAt(i, m4.compose(at.set(t.x, 0.015, t.z), q, one));
      });
      mesh.count = g.items.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  return { update, groundMeshes, obstacles, seaY: SEA_Y, setTraces };
}

function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
