/* 암자 풍경: 하늘, 바다, 절벽, 마당, 법당(안까지), 연등, 풍경, 난간, 관세음보살. 전부 코드로 만든 로우폴리. */
import { COURTYARD, RAIL_Z, HALL, STATUE, CHIME, ALTAR, CUSHIONS, WALLS, FLOOR_Y, CEILING_Y, YARD, BAERYE, PRAYER, PRAYER_BAERYE, PRAYER_SEATS, CANDLES, CAVE, floorY } from "../logic/layout.js";
import { skyAt, sunTimesKST } from "../logic/sky.js";
import { createBuddha } from "./buddha.js";
import { loadStatue } from "./statue.js";
import { sumidanTexture, dancheongBand, cofferTexture, fadedBand } from "./dancheong.js";
import { createGongpo } from "./gongpo.js";
import { decorateHall } from "./hallDecor.js";
import { createYard } from "./yard.js";
import { createCandleRack } from "./candles.js";
import { createCave } from "./cave.js";
import { createLandscape, boulderGeometry } from "./landscape.js";
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

  /* 하늘: 위아래 그라데이션 + 해/달 + 천천히 흐르는 구름 (해 쪽은 은빛 테, 노을엔 물들고, 밤엔 어둡게 별을 가린다) */
  const skyU = {
    top: { value: new THREE.Color() }, horizon: { value: new THREE.Color() },
    sunDir: { value: new THREE.Vector3(0, 1, 0) }, sunColor: { value: new THREE.Color() }, night: { value: 0 }, time: { value: 0 },
  };
  add(new THREE.Mesh(new THREE.SphereGeometry(2200, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: skyU,
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      uniform vec3 top, horizon, sunColor, sunDir; uniform float night, time; varying vec3 vDir;
      float hash(vec3 p){ return fract(sin(dot(p, vec3(12.9898,78.233,37.719))) * 43758.5453); }
      float h2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float vnoise(vec2 p){
        vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(h2(i), h2(i + vec2(1.0, 0.0)), f.x), mix(h2(i + vec2(0.0, 1.0)), h2(i + vec2(1.0, 1.0)), f.x), f.y);
      }
      // 별 한 겹: 방향을 칸으로 나눠 칸마다 드물게 별 하나 (칸 안 아무 데나, 크기·밝기 제각각, 천천히 반짝)
      float star(vec3 dir, float scale, float thresh, float size, float gain){
        vec3 p = dir * scale, id = floor(p), f = fract(p) - 0.5;
        float r = hash(id);
        if (r < thresh) return 0.0;
        float b = (r - thresh) / (1.0 - thresh);
        vec3 off = vec3(hash(id + 1.3), hash(id + 2.7), hash(id + 5.1)) - 0.5;
        float dd = length(f - off * 0.5);
        float tw = 0.75 + 0.25 * sin(time * (1.5 + 3.0 * hash(id + 9.1)) + r * 60.0);
        return smoothstep(size * (0.5 + 0.5 * b), 0.0, dd) * (0.35 + b) * gain * tw;
      }
      float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
      void main(){
        float h = clamp(vDir.y, -0.2, 1.0);
        vec3 c = mix(horizon, top, pow(smoothstep(-0.02, 0.55, h), 0.7));
        float d = max(dot(vDir, normalize(sunDir)), 0.0);
        c += sunColor * (pow(d, 900.0) * 1.6 + pow(d, 12.0) * 0.18 * (1.0 - night));
        // 밤하늘: 밝기가 다른 별 세 겹(밝은 별은 드물게, 희미한 별은 촘촘히), 조용히 반짝이고, 은하수 띠에는 별이 더 많다
        vec3 mwN = normalize(vec3(0.55, 0.35, -0.76));                    // 은하수가 지나는 큰 원의 축
        float mwBand = exp(-pow(dot(vDir, mwN) / 0.2, 2.0));
        float mwCloud = mwBand * (0.55 + 0.45 * vnoise(vec2(atan(vDir.z, vDir.x) * 6.0, vDir.y * 9.0))) * (0.6 + 0.4 * vnoise(vec2(atan(vDir.z, vDir.x) * 19.0, vDir.y * 27.0)));
        float sky0 = smoothstep(0.03, 0.3, h) * night;
        float st = star(vDir, 120.0, 0.982, 0.42, 3.2) + star(vDir, 240.0, 0.968 - 0.04 * mwBand, 0.42, 1.7) + star(vDir, 430.0, 0.95 - 0.08 * mwBand, 0.48, 0.9);
        c += (vec3(st) * vec3(0.95, 0.97, 1.0) + vec3(0.2, 0.21, 0.28) * mwCloud * mwCloud * 1.6) * sky0;
        // 구름: 하늘을 높이 800m쯤의 평면으로 보고 그 위의 노이즈. 바람은 동쪽에서 서쪽으로 아주 천천히
        if (vDir.y > 0.0) {
          vec2 uv = vDir.xz / (vDir.y + 0.06) * 0.55 + vec2(time * 0.0035, time * 0.0012);
          float base = fbm(uv);
          float dens = smoothstep(0.46, 0.76, base) * (1.0 - 0.65 * night);   // 밤엔 구름이 걷혀 별이 잘 보인다
          vec2 toSun = normalize(sunDir.xz + 1e-4) * 0.06;
          float behind = smoothstep(0.46, 0.76, fbm(uv + toSun));        // 해 쪽으로 더 두꺼우면 그늘
          float lit = clamp(1.0 - (behind - dens) * 1.6 - dens * 0.35, 0.25, 1.0);
          vec3 bright = mix(vec3(1.0), sunColor, 0.55) * mix(1.0, 0.13, night);
          vec3 shade = mix(horizon, top, 0.4) * mix(0.75, 0.35, night);
          vec3 cloud = mix(shade, bright, lit) + sunColor * pow(d, 6.0) * 0.35 * (1.0 - dens) * (1.0 - night);   // 해 둘레 은빛 테
          cloud = mix(cloud, horizon, smoothstep(0.25, 0.03, vDir.y) * 0.6);   // 멀리 낮은 구름은 수평선 빛에 녹는다
          c = mix(c, cloud, dens * smoothstep(0.015, 0.14, vDir.y) * 0.92);
        }
        // 햇살: 해 둘레로 부챗살처럼 퍼지는 빛줄기 (해가 낮을수록, 구름 가장자리 사이로 더)
        vec3 sd = normalize(sunDir);
        vec3 ax = normalize(cross(sd, vec3(0.0, 1.0, 0.0)) + 1e-4), ay = cross(ax, sd);
        float ang = atan(dot(vDir, ay), dot(vDir, ax));
        float rays = vnoise(vec2(ang * 7.0, time * 0.04)) * 0.7 + vnoise(vec2(ang * 15.0, 3.0 + time * 0.03)) * 0.3;
        float low = 1.0 - smoothstep(0.15, 0.7, sd.y);
        c += sunColor * pow(d, 10.0) * smoothstep(0.35, 0.95, rays) * (0.1 + 0.22 * low) * (1.0 - night) * step(-0.05, vDir.y);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })));

  /* 바다: 노멀 맵 두 겹을 엇갈려 흘려 잔물결을 만들고, 하늘을 비추는 프레넬 반사와 해 쪽 반짝임.
     멀어질수록 물결을 눕혀(반짝임 깜빡임 방지) 수평선 안개에 녹인다. */
  const waterNormals = new THREE.TextureLoader().load("textures/waternormals.jpg");
  waterNormals.wrapS = waterNormals.wrapT = THREE.RepeatWrapping;
  const seaU = {
    time: { value: 0 }, sea: { value: new THREE.Color() }, horizon: { value: new THREE.Color() }, skyTop: skyU.top,
    sunDir: { value: new THREE.Vector3(0, 1, -1) }, sunColor: { value: new THREE.Color() }, camPos: { value: new THREE.Vector3() },
    normals: { value: waterNormals }, night: skyU.night,
  };
  const sea = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000, 1, 1), new THREE.ShaderMaterial({
    uniforms: seaU,
    vertexShader: `varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
    fragmentShader: `
      uniform float time, night; uniform vec3 sea, horizon, skyTop, sunColor, sunDir, camPos; uniform sampler2D normals; varying vec3 vW;
      vec3 nm(vec2 uv){ return texture2D(normals, uv).rgb * 2.0 - 1.0; }
      void main(){
        vec2 p = vW.xz; float t = time;
        float dist = length(vW.xz - camPos.xz);
        // 잔물결 네 겹 (크기·방향·속도가 다르게)
        vec3 a = nm(p * 0.031 + vec2(t * 0.012, t * 0.007));
        vec3 b = nm(p * 0.047 + vec2(-t * 0.009, t * 0.011));
        vec3 c = nm(p * 0.0081 + vec2(t * 0.004, -t * 0.003));
        vec3 d = nm(p * 0.13 + vec2(t * 0.03, t * 0.021));
        vec2 slope = (a.xy + b.xy) * 0.5 + c.xy * 0.8 + d.xy * 0.25 * (1.0 - smoothstep(30.0, 120.0, dist));
        // 큰 너울
        slope += vec2(0.05 * sin(p.x * 0.035 + p.y * 0.012 + t * 0.8), 0.05 * sin(p.y * 0.04 - p.x * 0.01 + t * 0.65));
        float flat_ = mix(1.0, 0.18, smoothstep(60.0, 900.0, dist));
        vec3 n = normalize(vec3(slope.x * flat_ * 0.55, 1.0, slope.y * flat_ * 0.55));
        vec3 v = normalize(camPos - vW);
        vec3 r = reflect(-v, n);
        // 하늘 비침: 수평선 빛에서 하늘 꼭대기 빛으로
        vec3 skyRef = mix(horizon, skyTop, pow(clamp(r.y, 0.0, 1.0), 0.45));
        float fres = 0.02 + 0.98 * pow(1.0 - max(dot(n, v), 0.0), 5.0);
        // 물빛: 깊은 바다색, 물결 등성이는 살짝 밝은 청록 (빛이 비치는 느낌)
        vec3 deep = sea * 0.55;
        vec3 body = mix(deep, sea * 1.15 + vec3(0.0, 0.05, 0.05) * (1.0 - night), clamp(slope.x * 0.6 + slope.y * 0.4 + 0.35, 0.0, 1.0) * 0.6);
        vec3 col = mix(body, skyRef, clamp(fres * 1.15, 0.0, 1.0));
        // 해 쪽 반짝임: 날카로운 점 + 넓은 윤슬
        vec3 L = normalize(sunDir);
        float s1 = pow(max(dot(r, L), 0.0), 600.0) * 3.0;
        float s2 = pow(max(dot(r, L), 0.0), 40.0) * 0.18;
        col += sunColor * (s1 + s2) * step(0.0, L.y + 0.03);
        col = mix(col, horizon, smoothstep(250.0, 1700.0, dist));
        gl_FragColor = vec4(col, 1.0);
      }`,
  }));
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = SEA_Y;
  add(sea, true);

  /* 둘레 땅: 절이 앉은 만, 양옆 곶, 뒤로 겹겹 산, 먼 바위섬 */
  const landscape = createLandscape(THREE, { seaY: SEA_Y, railZ: RAIL_Z, yard: COURTYARD, flats: [{ minX: CAVE.x - 9, maxX: CAVE.x + 9, minZ: COURTYARD.maxZ, maxZ: CAVE.altar.z + 4 }] });
  scene.add(landscape.group);
  landscape.group.userData.noShadow = true;            // 먼 산은 그림자 지도 밖

  /* 절벽과 마당 */
  const rockDark = mat(0x463a32), stone = mat(0x9b8f7e);
  const W = COURTYARD.maxX - COURTYARD.minX, D = COURTYARD.maxZ - COURTYARD.minZ;
  const ground = add(new THREE.Mesh(new THREE.BoxGeometry(W + 2, 1, D + 2), stone), true);
  ground.position.set(0, -0.5, (COURTYARD.minZ + COURTYARD.maxZ) / 2 + 1);
  // 마당 박석 줄눈
  const lines = new THREE.GridHelper(Math.max(W, D) + 2, 18, 0x7e735f, 0x7e735f);
  lines.position.set(0, 0.01, ground.position.z);
  lines.material.transparent = true; lines.material.opacity = 0.35;
  scene.add(lines);
  const rnd = mulberry32(7);
  // 난간 아래 절벽에 붙은 바위: 두 줄로 엇갈려, 꼭대기는 마당보다 낮게 (바다 보는 눈을 가리지 않게)
  const boulderMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  const boulders = [1, 2, 3, 4, 5, 6].map((sd) => boulderGeometry(THREE, sd));
  const ROCKS = Math.ceil((W + 8) / 1.8);
  for (let row = 0; row < 2; row++) {
    for (let i = 0; i < ROCKS; i++) {
      const w = 3 + rnd() * 3.5, h = 4 + rnd() * 6 + row * 4, dz = 2.2 + rnd() * 1.5;
      const m = new THREE.Mesh(boulders[(i + row * 3) % boulders.length], boulderMat);
      m.scale.set(w / 2, h / 2, dz);
      m.position.set(COURTYARD.minX - 4 + i * 1.8 + row * 0.9 + rnd() * 0.6, -h / 2 - 0.5 - row * (2 + rnd() * 4), RAIL_Z - 1.6 - row * 2.2 - rnd() * 1.2);
      m.rotation.set(rnd() * 0.5, rnd() * 6.3, rnd() * 0.4);
      add(m);
    }
  }
  const cliffBody = add(new THREE.Mesh(new THREE.BoxGeometry(W + 30, 30, 40), rockDark));
  obstacles.push(cliffBody);
  cliffBody.position.set(0, -15.6, COURTYARD.maxZ + 15);
  // 마당 양옆: 낮은 돌담과 그 뒤로 솟은 산자락
  const wallMat = mat(0x8c8273), capMat = mat(0x3a3533);
  for (const side of [-1, 1]) {
    const len = COURTYARD.maxZ - RAIL_Z;
    const sw = add(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.0, len), wallMat));
    sw.position.set(side * (COURTYARD.maxX + 0.5), 0.5, (RAIL_Z + COURTYARD.maxZ) / 2);
    const swCap = add(new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, len + 0.2), capMat));
    swCap.position.set(sw.position.x, 1.05, sw.position.z);
    obstacles.push(sw);
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
  // 넓어진 마당 양옆 담 따라 몇 그루 더
  pine(-17, 9, 6); pine(17, 12, 5.6); pine(-17.2, -3, 4.8); pine(17.2, 1, 5.2); pine(17, -12, 4.4);

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
    // 동굴 법당 천수관음 자리에도 같은 불상을 작게 모신다 (모델을 한 번만 받으려고 복제)
    const small = statue.object.clone();
    small.scale.multiplyScalar(1.6 / BUDDHA_H);
    cave.setStatue(small);
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
  decorateHall(THREE, hall, { FY, W_SIDE, W_FRONT, W_BACK, WT, CEILING_Y, ALTAR, altarTop, TH_W, TH_Y, TH_H, latticeMat: doorMat, sumidanMat: sumiFront, gold, flames });
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

  /* 대웅전 앞마당: 석등 한 쌍, 삼층석탑 한 쌍, 배례석 */
  /* 동굴 법당(관음굴): 마당 왼쪽 뒤 바위 절벽 */
  const cave = createCave(THREE, { cave: CAVE, yardBackZ: COURTYARD.maxZ });
  scene.add(cave.group);
  groundMeshes.push(...cave.pickables);
  obstacles.push(...cave.obstacles);
  const yard = createYard(THREE, { items: YARD, baerye: BAERYE });
  scene.add(yard.group);
  yard.group.traverse((o) => { if (o.isMesh) { groundMeshes.push(o); obstacles.push(o); } });
  // 촛불 공양대 (마당 왼쪽): 누르면 앞에 가서 선다
  const rack = createCandleRack(THREE, CANDLES);
  scene.add(rack.group);
  rack.group.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) { groundMeshes.push(o); obstacles.push(o); } });

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
  const LANTERN_ROWS = [-2.2, -1.4, -0.6, 0.2, 1.0, 1.8, 2.6, 3.4], POLE_X = COURTYARD.maxX + 0.2, STRING_Y = 5.3, SAG = 0.5, LANTERN_GAP = 0.85;
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
    for (let x = -(POLE_X - 0.8) + (LANTERN_ROWS.indexOf(z) % 2) * LANTERN_GAP / 2; x <= POLE_X - 0.79; x += LANTERN_GAP) lanterns.push({ x, y: stringY(x) - 0.2, z, phase: rnd() * 6.28, color: LANTERN_COLORS[Math.floor(rnd() * LANTERN_COLORS.length)] });
  }
  const lanternMesh = new THREE.InstancedMesh(lanternGeo, lanternMat, lanterns.length);
  lanterns.forEach((l, i) => lanternMesh.setColorAt(i, new THREE.Color(l.color)));
  lanternMesh.userData.noShadow = true;            // 종이등은 빛이 비쳐 짙은 그림자를 안 만든다 (수백 개 점박이가 지저분하다)
  scene.add(lanternMesh);
  const lq = new THREE.Quaternion(), le = new THREE.Euler(), lp = new THREE.Vector3(), ls = new THREE.Vector3(1, 1, 1), lm = new THREE.Matrix4();
  function swayLanterns(time) {
    lanterns.forEach((l, i) => {
      le.set(Math.sin(time * 0.8 + l.phase) * 0.05, 0, Math.sin(time * 0.6 + l.phase * 1.3) * 0.07);
      lanternMesh.setMatrixAt(i, lm.compose(lp.set(l.x, l.y, l.z), lq.setFromEuler(le), ls));
    });
    lanternMesh.instanceMatrix.needsUpdate = true;
  }

  /* 해수관음: 높은 팔각 받침과 연꽃 대좌 위에 서서 바다를 바라본다 (-z).
     국가유산청 3D 에셋 분황사 석조관음보살입상(공공누리 1유형)을 흰 화강암 빛으로 밝혀 모신다.
     다 불러오기 전과 못 불러올 때는 코드로 만든 관음상이 그 자리를 지킨다. */
  const statue = new THREE.Group();
  const granite = mat(0xe9e4d8), graniteShade = mat(0xcfc8b8);
  const oct8 = (rTop, rBot, h) => new THREE.CylinderGeometry(rTop, rBot, h, 8);
  let y = 0;
  for (const [r, h] of [[1.2, 0.3], [1.02, 0.25]]) {                  // 두 단 바닥돌
    const s = new THREE.Mesh(oct8(r, r * 1.04, h), graniteShade);
    s.position.y = y + h / 2; y += h; statue.add(s);
  }
  const plinth = new THREE.Mesh(oct8(0.72, 0.78, 0.9), granite);      // 팔각 중대석 (모서리 기둥 새김)
  plinth.position.y = y + 0.45; statue.add(plinth);
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * Math.PI * 2 + Math.PI / 8;
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.9, 0.06), graniteShade);
    post.position.set(Math.sin(a) * 0.74, y + 0.45, Math.cos(a) * 0.74); post.rotation.y = a;
    statue.add(post);
  }
  y += 0.9;
  const cap = new THREE.Mesh(oct8(0.92, 0.8, 0.16), graniteShade);   // 갑석
  cap.position.y = y + 0.08; y += 0.16; statue.add(cap);
  // 연꽃 대좌: 위로 핀 꽃잎 두 겹
  const lotusCore = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.5, 0.36, 16), granite);
  lotusCore.position.y = y + 0.18; statue.add(lotusCore);
  const petalGeo = new THREE.SphereGeometry(1, 8, 6);
  for (const [n, r, size, tilt, off] of [[12, 0.62, 0.24, -0.55, 0], [12, 0.74, 0.2, -0.8, Math.PI / 12]]) {
    for (let k = 0; k < n; k++) {
      const h = new THREE.Group(); h.rotation.y = (k / n) * Math.PI * 2 + off; statue.add(h);
      const pe = new THREE.Mesh(petalGeo, granite);
      pe.scale.set(size * 0.55, size, size * 0.3); pe.position.set(r, y + 0.2, 0); pe.rotation.z = tilt;
      h.add(pe);
    }
  }
  y += 0.36;
  const FIGURE_Y = y, FIGURE_H = 3.6;
  const fallback = new THREE.Group();
  const robePts = [[0.55, 0], [0.62, 0.4], [0.5, 1.4], [0.46, 2.1], [0.5, 2.5], [0.42, 2.8], [0.2, 2.95], [0.0, 2.97]].map(([r, h]) => new THREE.Vector2(r, h));
  const robe = new THREE.Mesh(new THREE.LatheGeometry(robePts, 14), granite);
  robe.position.y = y; fallback.add(robe);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 12, 10), granite);
  head.position.y = y + 3.22; fallback.add(head);
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.24, 0.34, 8), graniteShade);
  crown.position.y = y + 3.55; fallback.add(crown);
  const vase = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 0.32, 6), graniteShade);
  vase.position.set(0.32, y + 1.9, -0.4); fallback.add(vase);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 5), granite);
  hand.position.set(-0.18, y + 2.2, -0.42); fallback.add(hand);
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.04, 6, 24), graniteShade);
  halo.position.set(0, y + 3.3, 0.25); fallback.add(halo);
  statue.add(fallback);
  statue.position.set(STATUE.x, 0, STATUE.z);
  statue.rotation.y = 0;   // 정면(-z)이 바다
  scene.add(statue);
  statue.traverse((o) => { if (o.isMesh) { groundMeshes.push(o); obstacles.push(o); } });
  /* 기도 터: 관음상 앞(바다 쪽)에 박석을 깔고, 배례석과 방석을 놓는다. 방석을 누르면 관음상을 보고 앉는다. */
  const prayerFloor = add(new THREE.Mesh(new THREE.BoxGeometry(PRAYER.maxX - PRAYER.minX, 0.06, PRAYER.maxZ - PRAYER.minZ), mat(0xb9ae9b)), true);
  prayerFloor.position.set((PRAYER.minX + PRAYER.maxX) / 2, 0.03, (PRAYER.minZ + PRAYER.maxZ) / 2);
  const prayerEdge = add(new THREE.Mesh(new THREE.BoxGeometry(PRAYER.maxX - PRAYER.minX + 0.3, 0.04, PRAYER.maxZ - PRAYER.minZ + 0.3), mat(0x8d877b)), true);
  prayerEdge.position.set(prayerFloor.position.x, 0.02, prayerFloor.position.z);
  const pBaerye = add(new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.1, 0.6), granite), true);
  pBaerye.position.set(PRAYER_BAERYE.x, 0.11, PRAYER_BAERYE.z);
  const lotusMark = add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 16), graniteShade), true);
  lotusMark.rotation.x = -Math.PI / 2; lotusMark.position.set(PRAYER_BAERYE.x, 0.165, PRAYER_BAERYE.z);
  const prayerCushion = mat(0x8c2f3a);
  for (const c of PRAYER_SEATS) {
    const cu = add(new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.08, 0.66), prayerCushion), true);
    cu.position.set(c.x, 0.1, c.z);
  }
  loadStatue(THREE, "models/gwaneum.glb", { height: FIGURE_H, metalness: 0, roughness: 0.85, envIntensity: 0.4 }).then((scan) => {
    if (!scan) return;
    scan.object.position.y = FIGURE_Y;
    scan.object.rotation.y = STATUE_FACING;
    statue.remove(fallback);
    statue.add(scan.object);
  });

  /* 빛 */
  const hemi = new THREE.HemisphereLight(0xffffff, 0x444033, 0.8);
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  scene.add(hemi, sun, sun.target);
  // 해(달) 그림자: 마당과 법당 둘레 52m 네모만. 그림자 지도는 1초에 한 번만 다시 그린다 (main.js)
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 40, far: 200 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.04;
  sun.target.position.set(0, 0, 0);
  // 마당 둘레의 물건은 그림자를 드리우고 받는다. 늦게 불러오는 불상도 잡히게 1초마다 새로 온 것만 본다.
  // 사람(userData.noShadow)은 발밑 둥근 그림자로 대신한다 (움직이는 그림자는 매 프레임 비싸서)
  const shadowSeen = new WeakSet(), shBox = new THREE.Box3(), mid = new THREE.Vector3();
  function markShadows() {
    scene.traverse((o) => {
      if (shadowSeen.has(o)) return;
      shadowSeen.add(o);
      if (!o.isMesh || o.material.isShaderMaterial || o.material.isMeshBasicMaterial) return;
      for (let a = o; a; a = a.parent) if (a.userData.noShadow) return;
      shBox.setFromObject(o).getCenter(mid);
      if (Math.abs(mid.x) > 30 || mid.z < -22 || mid.z > 22) return;
      o.castShadow = o.receiveShadow = true;
    });
  }
  scene.fog = new THREE.Fog(0x000000, 120, 2000);  // 먼 산이 하늘빛으로 흐려지는 공기 원근 (금산 1km쯤은 반쯤)

  let skyTimer = 1, t = 0, swing = 0, night = 0;
  const tmp = new THREE.Color(), backWhite = new THREE.Color(1, 1, 1);

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
    sun.intensity = isNight ? 0.25 : 0.3 + 1.5 * s.light;              // 햇빛을 세게, 하늘빛(hemi)은 줄여 그림자가 또렷하게
    hemi.intensity = 0.25 + 0.5 * s.light;
    hemi.color.setRGB(...s.sky).lerp(tmp.setRGB(1, 1, 1), 0.5);
    scene.fog.color.setRGB(...s.horizon).multiplyScalar(1 - 0.75 * night);   // 밤엔 먼 산이 푸르스름하게 뜨지 않게
    // 먼 산 그림: 낮엔 제 빛깔, 해 뜨고 질 땐 햇빛 물, 밤엔 푸르스름한 어둠
    tmp.setRGB(...(isNight ? [0.55, 0.6, 0.8] : s.sun)).lerp(backWhite, 0.55).multiplyScalar((0.12 + 0.88 * s.light) ** 2);   // 선형 빛이라 제곱해야 밤이 밤답다
    landscape.setLight(tmp, night);
    lanternGlow.value = 0.45 + 0.55 * night;
    yard.setNight(night);
    cave.setNight(night);
    rack.setNight(night);
    candleLight.intensity = 5 + 7 * night;
  }

  function update(date, dt, camPos) {
    t += dt;
    seaU.time.value = t;
    skyU.time.value = t;
    landscape.tick(t);
    if (camPos) seaU.camPos.value.copy(camPos);
    skyTimer += dt;
    if (skyTimer >= 1) { skyTimer = 0; applySky(date); markShadows(); }
    swing += dt;
    chime.rotation.z = Math.sin(swing * 1.3) * 0.06 + Math.sin(swing * 0.37) * 0.04;
    chime.rotation.x = Math.sin(swing * 0.9) * 0.03;
    swayLanterns(t);
    rack.update(t);
    cave.update(t);
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

  return { update, groundMeshes, obstacles, seaY: SEA_Y, setTraces, setCandles: rack.setCandles };
}

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
