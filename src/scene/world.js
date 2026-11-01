/* 암자 풍경: 하늘, 바다, 절벽, 마당, 법당(안까지), 연등, 풍경, 난간, 관세음보살. 전부 코드로 만든 로우폴리. */
import { COURTYARD, RAIL_Z, HALL, STATUE, CHIME, ALTAR, CUSHIONS, WALLS, FLOOR_Y, CEILING_Y, floorY } from "../logic/layout.js";
import { skyAt, sunTimesKST } from "../logic/sky.js";
import { createBuddha } from "./buddha.js";
import { loadStatue } from "./statue.js";
import { sumidanTexture, dancheongBand, cofferTexture, fadedBand } from "./dancheong.js";
import { createGongpo } from "./gongpo.js";
import { bucketTraces, TRACE_MAX } from "../logic/traces.js";

const SEA_Y = -28;
const STATUE_FACING = Math.PI;
const BUDDHA_H = 3.0, BODHI_H = 2.5, BODHI_X = 2.0;   // 삼존 높이와 가운데에서 협시보살까지      // 스캔 모델은 +z가 정면이라 돌려서 문(-z) 쪽을 보게 한다
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
  pine(-11.2, 9, 5.5); pine(-11, 14.5, 4.6); pine(11.2, 10, 5); pine(11, 15.2, 4.2);

  /* 법당: 단청 두른 처마, 붉은 기둥, 꽃살문. 가운데 문으로 들어갈 수 있다. 크기는 layout.js의 WALLS를 따른다. */
  const hall = new THREE.Group();
  const hallGround = [];                      // 눌러서 걸어갈 수 있는 법당 바닥과 방석 (카메라는 통과)
  const paintedBands = [];
  const hw = HALL.maxX - HALL.minX, hd = HALL.maxZ - HALL.minZ, hz = (HALL.minZ + HALL.maxZ) / 2;
  const FY = FLOOR_Y, WALL_H = WALLS.height, WT = 0.2;
  const W_FRONT = WALLS.front, W_BACK = WALLS.back, W_SIDE = WALLS.side, DOOR_W = WALLS.doorW, DOOR_H = WALLS.doorH;
  const ROOM_W = W_SIDE * 2, ROOM_D = W_BACK - W_FRONT, ROOM_Z = (W_FRONT + W_BACK) / 2;
  const box = (w, h, d, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(x, y, z); hall.add(b); return b; };
  const dancheong = mat(0x2f6b55), danRed = mat(0x8e2f22), danBlue = mat(0x3c5a8c), plaster = mat(0xefe6d4), gold = mat(0xd2a948);
  box(hw + 0.8, FY, hd + 0.6, mat(0x8a7f70), 0, FY / 2, hz);                 // 기단
  box(3.6, 0.25, 0.4, mat(0x9b8f7e), 0, 0.125, HALL.door.z + 0.1);           // 디딤돌
  // 꽃살문: 나무 바탕에 마름모 살, 초록 테두리 (문짝 여러 칸으로 되풀이)
  const lattice = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#7a4a2e"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#b07a4c"; g.lineWidth = 3;
    for (let i = -256; i < 256; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); }
    g.strokeStyle = "#2f6b55"; g.lineWidth = 12;
    g.strokeRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = THREE.RepeatWrapping; t.repeat.set(Math.round((W_SIDE - DOOR_W / 2) / 1.4), 1);
    return t;
  })();
  const doorMat = new THREE.MeshLambertMaterial({ map: lattice });
  const sideW = W_SIDE - DOOR_W / 2;
  for (const sx of [-1, 1]) box(sideW, WALL_H, WT, doorMat, sx * (DOOR_W / 2 + sideW / 2), FY + WALL_H / 2, W_FRONT);
  box(DOOR_W, WALL_H - DOOR_H, WT, danRed, 0, FY + DOOR_H + (WALL_H - DOOR_H) / 2, W_FRONT);
  for (const sx of [-1, 1]) box(0.16, DOOR_H, WT + 0.08, danRed, sx * DOOR_W / 2, FY + DOOR_H / 2, W_FRONT);
  box(ROOM_W, WALL_H, WT, plaster, 0, FY + WALL_H / 2, W_BACK);
  for (const sx of [-1, 1]) box(WT, WALL_H, ROOM_D, plaster, sx * W_SIDE, FY + WALL_H / 2, ROOM_Z);
  // 처마 밑 단청 띠와 기둥 위 창방
  box(ROOM_W + 0.4, 0.5, ROOM_D + 0.4, dancheong, 0, FY + WALL_H - 0.2, ROOM_Z);
  const blocks = Math.floor(ROOM_W / 0.8);
  for (let i = 0; i < blocks; i++) box(0.3, 0.2, 0.04, i % 2 ? danRed : danBlue, -ROOM_W / 2 + 0.4 + i * 0.8, FY + WALL_H - 0.2, W_FRONT - 0.22);
  const PILLARS = 6;
  for (let i = 0; i < PILLARS; i++) {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, WALL_H + 0.1, 10), danRed);
    pillar.position.set(-(hw / 2 - 0.6) + (i * (hw - 1.2)) / (PILLARS - 1), FY + WALL_H / 2, HALL.minZ + 0.35);
    hall.add(pillar);
  }
  box(hw + 0.4, 0.36, 0.36, dancheong, 0, FY + WALL_H - 0.15, HALL.minZ + 0.35);
  const roofMat = mat(0x3b4048);
  const ROOF_H = 3.4, EAVE = 2.2;
  const roofShape = new THREE.Shape();
  roofShape.moveTo(-(hd / 2 + EAVE), 0); roofShape.quadraticCurveTo(-(hd / 2) + 0.8, 0.3, -1.0, ROOF_H);
  roofShape.lineTo(1.0, ROOF_H); roofShape.quadraticCurveTo(hd / 2 - 0.8, 0.3, hd / 2 + EAVE, 0); roofShape.lineTo(-(hd / 2 + EAVE), 0);
  const roof = new THREE.Mesh(new THREE.ExtrudeGeometry(roofShape, { depth: hw + EAVE * 2, bevelEnabled: false }), roofMat);
  roof.rotation.y = Math.PI / 2;
  roof.position.set(-(hw + EAVE * 2) / 2, FY + WALL_H + 0.05, hz);
  hall.add(roof);
  for (const x of [-(hw / 2 + EAVE - 0.4), hw / 2 + EAVE - 0.4]) for (const z of [HALL.minZ - EAVE + 0.4, HALL.maxZ + EAVE - 0.4]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 4), roofMat);
    tip.position.set(x, FY + WALL_H + 0.4, z);
    tip.rotation.set(z < hz ? -0.7 : 0.7, 0, x < 0 ? 0.5 : -0.5);
    hall.add(tip);
  }
  box(hw + EAVE * 2 + 0.4, 0.4, 0.5, roofMat, 0, FY + WALL_H + ROOF_H + 0.05, hz);
  // 안: 마루, 우물반자 천장, 수미단, 삼존, 탱화, 촛불, 방석
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), mat(0x9a6b45));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(0, FY + 0.005, ROOM_Z);
  const coffer = cofferTexture(THREE, [Math.round(ROOM_W / 2.4), Math.round(ROOM_D / 2.4)]);
  // 아래를 보는 면이라 빛을 덜 받으니, 무늬가 스스로 조금 밝게 보이게
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_W, ROOM_D), new THREE.MeshLambertMaterial({ map: coffer, emissiveMap: coffer, emissive: 0x505050, side: THREE.DoubleSide }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(0, CEILING_Y, ROOM_Z);   // 처마 단청 상자 바닥보다 아래에 (겹치면 폰에서 깜빡인다)
  hall.add(floor, ceiling);
  // 천장을 가로지르는 대들보: 단청 칠한 굵은 보 (멀리서 비스듬히 봐도 천장 구조가 보이게)
  const beamMat = new THREE.MeshLambertMaterial({ map: fadedBand(THREE, 10) });
  for (const dz of [-ROOM_D / 3, 0, ROOM_D / 3]) box(ROOM_W, 0.5, 0.45, beamMat, 0, CEILING_Y - 0.25, ROOM_Z + dz);
  const beamWood = mat(0x5a2a1f);
  for (const dx of [-ROOM_W / 4, ROOM_W / 4]) box(0.35, 0.3, ROOM_D, beamWood, dx, CEILING_Y - 0.15, ROOM_Z);
  // 공포: 안쪽 네 벽 위로 줄지어 (살미는 방 안쪽으로), 바깥 앞 처마 밑 기둥 줄에도
  const GP = 1.3, inSpots = [];
  for (let x = -W_SIDE + 0.9; x <= W_SIDE - 0.9 + 1e-6; x += GP) { inSpots.push({ x, z: W_FRONT + 0.45, ry: Math.PI }); inSpots.push({ x, z: W_BACK - 0.45, ry: 0 }); }
  for (let z = W_FRONT + 1.4; z <= W_BACK - 1.4 + 1e-6; z += GP) { inSpots.push({ x: -W_SIDE + 0.45, z, ry: -Math.PI / 2 }); inSpots.push({ x: W_SIDE - 0.45, z, ry: Math.PI / 2 }); }
  hall.add(createGongpo(THREE, inSpots, { y: CEILING_Y - 0.72, scale: 0.85 }));
  const outSpots = [];
  for (let x = -(hw / 2 - 0.6); x <= hw / 2 - 0.6 + 1e-6; x += GP) outSpots.push({ x, z: HALL.minZ + 0.35, ry: 0 });
  hall.add(createGongpo(THREE, outSpots, { y: FY + WALL_H - 0.45, scale: 0.8 }));
  hallGround.push(floor);
  const ALTAR_H = 1.0, ALTAR_W = 7.6, ALTAR_D = 1.3, altarTop = FY + ALTAR_H;
  // 수미단: 받침, 연꽃 칸을 그린 몸통, 색띠 두른 윗판 (앞면만 그림, 정면은 -z)
  const sumiRed = mat(0x7c2019), sumiFront = new THREE.MeshLambertMaterial({ map: sumidanTexture(THREE) });
  sumiFront.map.wrapS = THREE.RepeatWrapping; sumiFront.map.repeat.set(2, 1);
  const bandFront = new THREE.MeshLambertMaterial({ map: dancheongBand(THREE, 6) });
  const faced = (front, side) => [side, side, side, side, side, front];
  box(ALTAR_W + 0.3, 0.2, ALTAR_D + 0.15, sumiRed, ALTAR.x, FY + 0.1, ALTAR.z);
  box(ALTAR_W, 0.62, ALTAR_D, faced(sumiFront, sumiRed), ALTAR.x, FY + 0.2 + 0.31, ALTAR.z);
  box(ALTAR_W + 0.3, 0.18, ALTAR_D + 0.1, faced(bandFront, gold), ALTAR.x, FY + 0.82 + 0.09, ALTAR.z);
  // 벽 위쪽을 두르는 단청 띠 (안쪽 네 면)
  const bandH = 0.6, bandY = CEILING_Y - bandH / 2 + 0.02;
  for (const [w, x, z, ry, rep] of [[ROOM_W, 0, W_BACK - WT / 2 - 0.015, Math.PI, 8], [ROOM_W, 0, W_FRONT + WT / 2 + 0.015, 0, 8],
    [ROOM_D, -W_SIDE + WT / 2 + 0.015, ROOM_Z, Math.PI / 2, 4], [ROOM_D, W_SIDE - WT / 2 - 0.015, ROOM_Z, -Math.PI / 2, 4]]) {
    const band = new THREE.Mesh(new THREE.PlaneGeometry(w, bandH), new THREE.MeshLambertMaterial({ map: fadedBand(THREE, rep) }));
    band.rotation.y = ry; band.position.set(x, bandY, z);
    hall.add(band);
    paintedBands.push(band);
  }
  // 후불탱화: 조선 불화 (클리블랜드 미술관 CC0), 붉은 바탕에 금테. 단청 띠 바로 아래.
  const TH_W = 6.2, TH_H = TH_W * 940 / 1536, TH_Y = bandY - bandH / 2 - 0.15 - TH_H / 2;
  const painting = new THREE.TextureLoader().load("textures/taenghwa.jpg");
  painting.colorSpace = THREE.SRGBColorSpace; painting.anisotropy = 4;
  const taenghwa = new THREE.Mesh(new THREE.PlaneGeometry(TH_W, TH_H), new THREE.MeshLambertMaterial({ map: painting }));
  taenghwa.rotation.y = Math.PI;
  taenghwa.position.set(0, TH_Y, W_BACK - WT / 2 - 0.02);
  const thFrame = new THREE.Mesh(new THREE.PlaneGeometry(TH_W + 0.36, TH_H + 0.36), mat(0x7c2019));
  thFrame.rotation.y = Math.PI;
  thFrame.position.set(0, TH_Y, W_BACK - WT / 2 - 0.01);
  hall.add(thFrame, taenghwa);
  const buddha = createBuddha(THREE, { scale: 0.72 * BUDDHA_H / 1.62 });
  buddha.position.set(ALTAR.x, altarTop + 0.03, ALTAR.z);
  hall.add(buddha);
  // 국가유산청 3D 에셋 금동제여래좌상(공공누리 1유형). 다 불러오면 코드로 만든 부처님과 자리를 바꾼다.
  loadStatue(THREE, "models/buddha.glb", { height: BUDDHA_H }).then((statue) => {
    if (!statue) return;
    statue.object.position.set(ALTAR.x, altarTop, ALTAR.z);
    statue.object.rotation.y = STATUE_FACING;
    hall.remove(buddha);
    hall.add(statue.object);
  });
  // 양옆 협시보살: 국가유산청 3D 에셋 선림원지 금동보살입상(공공누리 1유형).
  loadStatue(THREE, "models/bodhisattva.glb", { height: BODHI_H, doubleSided: true }).then((statue) => {
    if (!statue) return;
    for (const sx of [-1, 1]) {
      // 불러온 원본은 그대로 두고 복제본만 쓴다 (원본을 직접 놓으면 뒷모습이 보였다)
      const o = statue.object.clone();
      o.position.set(ALTAR.x + sx * BODHI_X, altarTop, ALTAR.z + 0.1);
      o.rotation.y = STATUE_FACING;
      if (sx > 0) o.scale.x = -1;                // 오른쪽은 거울로 뒤집어 두 분이 마주 보게
      hall.add(o);
    }
  });
  const flames = [];
  for (const sx of [-1, 1]) {
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.5, 8), mat(0xf4efe4));
    candle.position.set(sx * 1.05, altarTop + 0.25, ALTAR.z - 0.5);
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.15, 6), new THREE.MeshBasicMaterial({ color: 0xffc35a }));
    flame.position.set(candle.position.x, altarTop + 0.58, candle.position.z);
    hall.add(candle, flame);
    flames.push(flame);
  }
  const cushionMat = mat(0x8c2f3a);
  for (const c of CUSHIONS) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.66), cushionMat);
    cushion.position.set(c.x, FY + 0.04, c.z);
    hall.add(cushion);
    hallGround.push(cushion);
  }
  const candleLight = new THREE.PointLight(0xffb46b, 6, 16, 1.4);
  candleLight.position.set(0, FY + 3.0, ALTAR.z - 3);
  hall.add(candleLight);
  scene.add(hall);
  const noBlock = new Set([...hallGround, ceiling, ...flames, taenghwa, thFrame, ...paintedBands]);
  hall.traverse((o) => { if (o.isMesh) { groundMeshes.push(o); if (!noBlock.has(o)) obstacles.push(o); } });

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

  /* 연등: 마당 위로 줄 세 가닥, 연꽃 모양 등이 줄줄이. 해가 지면 불이 켜진 듯 밝아진다. */
  const LANTERN_ROWS = [-2.2, -1.4, -0.6, 0.2, 1.0, 1.8, 2.6, 3.4], POLE_X = 12.2, STRING_Y = 5.3, SAG = 0.5, LANTERN_GAP = 0.85;
  const LANTERN_COLORS = [0xf28fb0, 0xf5a35c, 0xf3dd7a, 0x9fd38a, 0xe0574a, 0xf7f1e3];
  const stringY = (x) => STRING_Y - SAG * (1 - (x / POLE_X) ** 2);
  // 꽃잎 끝이 위로 들린 연꽃 모양
  const lanternGeo = new THREE.LatheGeometry([[0, -0.15], [0.09, -0.14], [0.15, -0.07], [0.16, 0.02], [0.13, 0.1], [0.17, 0.15], [0.06, 0.12], [0, 0.13]].map(([r, h]) => new THREE.Vector2(r, h)), 8);
  const lanternMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const lanternGlow = { value: 0 };                 // 밤에 등 안에서 불이 켜진 듯: 제 색으로 빛난다
  lanternMat.onBeforeCompile = (sh) => {
    sh.uniforms.glow = lanternGlow;
    sh.fragmentShader = "uniform float glow;\n" + sh.fragmentShader.replace("#include <emissivemap_fragment>", "#include <emissivemap_fragment>\n  totalEmissiveRadiance += diffuseColor.rgb * glow;");
  };
  const lanterns = [];
  for (const z of LANTERN_ROWS) {
    for (const sx of [-1, 1]) {
      const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, STRING_Y + 0.2, 6), wood));
      pole.position.set(sx * POLE_X, (STRING_Y + 0.2) / 2, z);
    }
    const pts = [];
    for (let i = 0; i <= 24; i++) { const x = -POLE_X + (2 * POLE_X * i) / 24; pts.push(new THREE.Vector3(x, stringY(x), z)); }
    add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x2a2622 })));
    for (let x = -11.4 + (LANTERN_ROWS.indexOf(z) % 2) * LANTERN_GAP / 2; x <= 11.41; x += LANTERN_GAP) lanterns.push({ x, y: stringY(x) - 0.2, z, phase: rnd() * 6.28, color: LANTERN_COLORS[Math.floor(rnd() * LANTERN_COLORS.length)] });
  }
  const lanternMesh = new THREE.InstancedMesh(lanternGeo, lanternMat, lanterns.length);
  lanterns.forEach((l, i) => lanternMesh.setColorAt(i, new THREE.Color(l.color)));
  scene.add(lanternMesh);
  const lq = new THREE.Quaternion(), le = new THREE.Euler(), lp = new THREE.Vector3(), ls = new THREE.Vector3(1, 1, 1), lm = new THREE.Matrix4();
  function swayLanterns(time) {
    lanterns.forEach((l, i) => {
      le.set(Math.sin(time * 0.8 + l.phase) * 0.05, 0, Math.sin(time * 0.6 + l.phase * 1.3) * 0.07);
      lanternMesh.setMatrixAt(i, lm.compose(lp.set(l.x, l.y, l.z), lq.setFromEuler(le), ls));
    });
    lanternMesh.instanceMatrix.needsUpdate = true;
  }

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

  let skyTimer = 1, t = 0, swing = 0, night = 0;
  const tmp = new THREE.Color();

  function applySky(date) {
    const s = skyAt(date);
    skyU.top.value.setRGB(...s.sky);
    skyU.horizon.value.setRGB(...s.horizon);
    seaU.sea.value.setRGB(...s.sea);
    seaU.horizon.value.setRGB(...s.horizon);
    night = 1 - Math.min(1, Math.max(0, (s.sunElevation + 10) / 10));
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
    lanternGlow.value = 0.45 + 0.55 * night;
    candleLight.intensity = 5 + 7 * night;
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
    swayLanterns(t);
    for (const [i, f] of flames.entries()) f.scale.y = 1 + Math.sin(t * 13 + i * 2) * 0.12 + Math.sin(t * 7.3 + i) * 0.08;
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
        mesh.setMatrixAt(i, m4.compose(at.set(t.x, floorY(t) + 0.015, t.z), q, one));
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
