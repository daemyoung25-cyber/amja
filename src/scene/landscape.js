/* 암자를 둘러싼 땅: 실제 지형(남해 금산 남쪽 바닷가, SRTM)을 가로 0.23배·세로 0.38배로 줄여 깔고,
   절 둘레 150m 안쪽만 손으로 다듬은 지형(난간 아래 벼랑, 평평한 마당)으로 이어 붙인다.
   뒤로 금산이 솟고 앞바다 오른쪽에 실제 섬들이 떠 있다. 높이 지도는 PNG라 받아 온 뒤에 땅을 짓는다. */
import { mulberry32 } from "./world.js";
import { decodeDem, demSampler } from "../logic/dem.js";

// 높이 지도: 31.4m 간격 350×288칸, 절 자리(금산 남쪽 상주 바닷가)가 (175, 160)
export const DEM = { url: "textures/terrain-namhae.png", originX: 175, originY: 160, mpp: 31.41, sh: 0.23, sv: 0.38 };
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// 값 노이즈 + 부드러운 보간, 여러 겹(fbm)과 능선형(ridged)
export function makeNoise(seed) {
  const rnd = mulberry32(seed), P = new Uint8Array(512), perm = [...Array(256).keys()];
  for (let i = 255; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [perm[i], perm[j]] = [perm[j], perm[i]]; }
  for (let i = 0; i < 512; i++) P[i] = perm[i & 255];
  const V = Float32Array.from({ length: 256 }, () => rnd());
  const fade = (t) => t * t * t * (t * (t * 6 - 15) + 10);
  const n2 = (x, z) => {
    const xi = Math.floor(x), zi = Math.floor(z), xf = x - xi, zf = z - zi;
    const a = V[P[(xi & 255) + P[zi & 255]]], b = V[P[((xi + 1) & 255) + P[zi & 255]]];
    const c = V[P[(xi & 255) + P[(zi + 1) & 255]]], d = V[P[((xi + 1) & 255) + P[(zi + 1) & 255]]];
    const u = fade(xf), v = fade(zf);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;   // 0..1
  };
  const fbm = (x, z, oct = 5) => { let s = 0, amp = 0.5, f = 1, norm = 0; for (let i = 0; i < oct; i++) { s += amp * n2(x * f, z * f); norm += amp; amp *= 0.5; f *= 2.03; } return s / norm; };
  const ridged = (x, z, oct = 5) => { let s = 0, amp = 0.5, f = 1, norm = 0, w = 1; for (let i = 0; i < oct; i++) { const r = 1 - Math.abs(2 * n2(x * f, z * f) - 1); const rr = r * r * w; s += amp * rr; w = Math.min(1, rr * 1.6); norm += amp; amp *= 0.5; f *= 2.1; } return s / norm; };
  return { n2, fbm, ridged };
}

// 먼 것도 안개를 반쯤만 먹게: 아침·저녁 밝은 수평선 빛에 하얗게 떠 보이지 않고 제 색이 남는다
function capFog(mat, cap) {
  const fogCap = typeof cap === "number" ? { value: cap } : cap;   // { value } 이면 밖에서 바꿀 수 있다
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.fogCap = fogCap;
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", "uniform float fogCap;\nvoid main() {")
      .replace("#include <fog_fragment>", `#ifdef USE_FOG
      float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
      gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, min( fogFactor, fogCap ) );
    #endif`);
  };
  return mat;
}

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createLandscape(THREE, { seaY, railZ, yard, flats = [], clear = () => false }) {
  const { fbm, ridged } = makeNoise(11);
  const group = new THREE.Group();

  // 바닷가 선: 절 앞은 난간 바로 아래 절벽, 옆으로 갈수록 바다 쪽으로 뻗어 곶이 된다
  const coastZ = (x) => {
    const ax = Math.abs(x);
    return railZ - 1.2 - 0.5 * Math.max(0, ax - 38) * smooth(38, 130, ax) - 22 * (fbm(x / 70 + 3, 1.7, 3) - 0.5) * smooth(34, 70, ax);
  };
  const foamTimeRef = { value: 0 };
  let real = () => 0;                                                             // 실제 지형 (높이 지도를 받기 전엔 바다)
  // 평평하게 비워 둘 곳 (동굴 법당 둘레): 땅을 마당 바닥 높이로 눌러 굴 안으로 산이 파고들지 않게
  const flatK = (x, z) => flats.reduce((k, f) => Math.max(k, smooth(f.minX - 4, f.minX, x) * smooth(f.maxX + 4, f.maxX, x) * smooth(f.minZ - 4, f.minZ, z) * smooth(f.maxZ + 4, f.maxZ, z)), 0);
  const height = (x, z) => {
    const h = rawHeight(x, z), k = flatK(x, z);
    return k > 0 ? h + (-0.5 - h) * k : h;
  };
  const rawHeight = (x, z) => {
    const near = Math.hypot(x, z * 0.8);
    const r = real(x, z), landK = smooth(0.2, 3, r);
    // 실제 바닷가는 낮아서(5m쯤) 절 둘레 땅을 언덕처럼 마당 높이까지 부드럽게 들어 올린다 (뭍에만)
    const lift = (-seaY + 6) * smooth(260, 40, near) * landK;
    // 높이 지도는 31m 간격이라 물가가 넓적한 판처럼 나온다: 2m 아래는 물에 잠기게 하고 물가를 가파르게
    const realY = seaY + Math.max(-30, (r - 2) * 1.25) + lift;
    const w = smooth(44, 92, near);                                               // 마당·난간 벼랑만 다듬은 땅
    if (w >= 1) return realY;
    return designed(x, z) * (1 - w) + realY * w;
  };
  const designed = (x, z) => {
    const land = z - coastZ(x);
    if (land < 0) return seaY - 6 - Math.min(20, -land * 0.4);                    // 물속
    const d = Math.hypot(x, (z - 2) * 1.2);                                       // 절에서 떨어진 정도
    // 산은 겹겹이 물러난다: 절 둘레 낮은 숲 둔덕 → 가운데 산줄기(z≈130) → 먼 높은 산(z>250, 안개에 푸르게)
    const band = (zc, w) => Math.exp(-(((z - zc) / w) ** 2));
    const near = 12 * smooth(24, 80, d) * fbm(x / 45, z / 45, 4);
    const mid = 38 * band(130, 55) * (0.35 + ridged(x / 120 + 3, z / 120, 5));
    const far = 50 * smooth(190, 330, z) * (0.3 + ridged(x / 220 + 7, z / 220, 5));
    const capes = 34 * smooth(35, 130, Math.abs(x)) * smooth(160, 40, z) * fbm(x / 55 - 2, z / 55 + 5, 4);   // 양옆 곶
    const m = (near + mid + far + capes + 8 * smooth(30, 200, z)) * smooth(24, 60, d);
    const cliff = smooth(0, 1 + 11 * smooth(25, 120, Math.abs(x)), land);         // 물가 벼랑: 난간 바로 아래서 깎아지른다
    let y = seaY + (-seaY + m) * cliff + 4 * fbm(x / 9, z / 9, 3) * cliff * smooth(8, 40, d);
    // 마당과 그 둘레는 평평하게 비워 둔다 (마당 바닥 조금 아래)
    const inYard = (x < 0 ? smooth(yard.minX - 10, yard.minX - 2, x) : smooth(yard.maxX + 10, yard.maxX + 2, x)) * smooth(railZ - 1, railZ + 1, z) * smooth(yard.maxZ + 14, yard.maxZ + 4, z);
    return y + (-0.5 - y) * inYard;
  };

  /* 큰 지형 한 장: 가까운 곳은 촘촘하게 (격자를 가운데로 모은다). 높이 지도를 받은 뒤에 짓는다. */
  const build = () => {
  const W = 2500, SX = 260, SZ = 260, Z_SEA = 900, Z_LAND = 1150;   // 동서 2.5km, 앞(바다) 900m, 뒤(산) 1.15km
  const geo = new THREE.PlaneGeometry(1, 1, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 2.0);                  // -0.5..0.5 → 가운데 촘촘
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getZ(i);
    const t = v * 2;                                                              // -0.5(바다 쪽) → +0.5(산 쪽), 원래 면 방향 그대로
    const x = warp(u * 2) / 2 * W, z = Math.sign(t) * Math.pow(Math.abs(t), 2.0) * (t > 0 ? Z_LAND : Z_SEA);   // 절벽 둘레를 촘촘하게
    pos.setXYZ(i, x, height(x, z), z);
  }
  geo.computeVertexNormals();
  // 색: 숲은 사진에서 떠 온 단풍 숲 무늬(canopy.webp)를 땅 위에서 내려다보듯 깔고, 꼭짓점 색으로 크게 얼룩지게.
  // 가파른 곳은 무늬를 걷어내고 흰 화강암, 물가는 젖은 검은 바위 (rock 값으로 셰이더가 섞는다)
  const nrm = geo.attributes.normal, col = new Float32Array(pos.count * 3), rockA = new Float32Array(pos.count), uv = geo.attributes.uv;
  const rock = new THREE.Color(0xa59b8a), rockDark = new THREE.Color(0x3d3631), pine = new THREE.Color(0x5d7a48), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), up = nrm.getY(i);
    const f = fbm(x / 14, z / 14, 3), g = fbm(x / 4 + 50, z / 4, 2);
    uv.setXY(i, x / 34, z / 34);
    c.setRGB(1, 1, 1).lerp(pine, smooth(0.42, 0.25, f) * 0.7);                    // 소나무 숲 얼룩
    c.multiplyScalar(0.8 + 0.35 * g);
    const steep = smooth(0.52, 0.4, up);                                          // 아주 가파른 데만 바위가 드러난다 (숲과 넓게 섞이면 안개처럼 뿌옇다)
    const wet = smooth(seaY + 7, seaY + 1, y);                                    // 물가
    c.lerp(rock.clone().multiplyScalar(0.75 + 0.4 * g), steep).lerp(rockDark, wet);
    rockA[i] = Math.max(steep, wet);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  geo.setAttribute("rock", new THREE.BufferAttribute(rockA, 1));
  const canopy = new THREE.TextureLoader().load("textures/canopy.webp");
  canopy.colorSpace = THREE.SRGBColorSpace;
  canopy.wrapS = canopy.wrapT = THREE.MirroredRepeatWrapping;                     // 거울로 이어 붙여 이음매가 없다
  canopy.anisotropy = 4;
  const terrainMat = new THREE.MeshLambertMaterial({ vertexColors: true, map: canopy });
  const seaLevel = { value: seaY }, foamTime = foamTimeRef;
  terrainMat.onBeforeCompile = (sh) => {
    sh.uniforms.seaLevel = seaLevel; sh.uniforms.foamTime = foamTime;
    sh.vertexShader = sh.vertexShader.replace("void main() {", "attribute float rock; varying float vRock; varying vec3 vWp;\nvoid main() {\n  vRock = rock;\n  vWp = (modelMatrix * vec4(position, 1.0)).xyz;");
    // 바위: 숲 무늬의 밝기에 가로 결(층리)과 얼룩을 더해 회칠한 벽처럼 보이지 않게. 물가엔 하얀 물거품 띠가 일렁인다
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", `varying float vRock; varying vec3 vWp; uniform float seaLevel, foamTime;
      float th(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float tn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(th(i), th(i + vec2(1, 0)), f.x), mix(th(i + vec2(0, 1)), th(i + vec2(1, 1)), f.x), f.y); }
      void main() {`)
      .replace("#include <map_fragment>", `vec4 texel = texture2D( map, vMapUv );
        vec2 rp = vec2(vWp.x + vWp.z, vWp.y);
        float strata = tn(vec2(rp.x * 0.05, rp.y * 0.9)) * 0.55 + tn(rp * 0.35) * 0.3 + tn(rp * 1.7) * 0.15;
        vec3 rockTone = vec3(0.4 + 0.75 * strata) * (0.8 + 0.4 * dot(texel.rgb, vec3(0.333)));
        diffuseColor.rgb *= mix( texel.rgb * 1.5, rockTone, vRock );
        float above = vWp.y - seaLevel;
        float foam = smoothstep(1.4, 0.2, above) * smoothstep(-0.6, 0.1, above) * (0.55 + 0.45 * sin(foamTime * 1.3 + tn(vWp.xz * 0.15) * 9.0));
        diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.6), foam * 0.75);`);
  };
  const terrain = new THREE.Mesh(geo, terrainMat);
  group.add(terrain);
  group.add(plantTrees(THREE, { height, seaY, railZ, yard, fbm, realAt: (x, z) => real(x, z), flats, clear }));
  };
  const ready = new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const cv = document.createElement("canvas"); cv.width = img.width; cv.height = img.height;
      const g = cv.getContext("2d", { willReadFrequently: true });
      g.drawImage(img, 0, 0);
      real = demSampler({ data: decodeDem(g.getImageData(0, 0, img.width, img.height).data, img.width, img.height), w: img.width, h: img.height, ...DEM });
      build();
      resolve();
    };
    img.onerror = () => { build(); resolve(); };                                 // 못 받으면 다듬은 땅만이라도
    img.src = DEM.url;
  });

  /* 먼 산 그림: 절 뒤로 반원보다 조금 넓게 둘러선 화강암 봉우리와 단풍 숲 (북한산 사진, CC0, 단풍빛으로 바꿈).
     사진을 거울로 이어 붙여 두 번 두르고, 빛은 시각에 따라 setLight로 맞춘다. 아래쪽은 3D 산줄기에 가려진다. */
  const R = 1700, ARC = Math.PI * 0.9, TILES = 2;             // 실제 지형(1.2km)보다 바깥, 하늘(2.2km)보다 안. 뭍 쪽(북)만
  const tex = new THREE.TextureLoader().load("textures/mountains.webp");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.repeat.set(TILES, 1);
  tex.offset.x = 0.35;                                          // 거울 이음매가 대웅전 바로 뒤에 오지 않게 (양옆 56° 쪽으로)
  const tileW = (R * ARC) / TILES, tileH = tileW * 960 / 3200;
  const backFog = { value: 0.4 };
  const backMat = capFog(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false }), backFog);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(R, R, tileH, 96, 1, true, -ARC / 2, ARC), backMat);
  // 양 끝은 하늘로 스르르 사라지게 (잘린 모서리가 보이지 않게)
  const prevCompile = backMat.onBeforeCompile;
  backMat.onBeforeCompile = (sh) => {
    prevCompile(sh);
    // vMapUv.x = 2u + 0.35 (거울 두 장 + 이음매 옮김) → 둘레 위치 u (0..1).
    // 양 끝에서는 반투명하게 흐리지 않고, 산줄기를 아래로 눌러 수평선으로 내려앉게 한다 (유령처럼 겹쳐 보이지 않게)
    sh.fragmentShader = sh.fragmentShader.replace("#include <map_fragment>", `
      float arcU = (vMapUv.x - ${tex.offset.x.toFixed(2)}) / ${TILES.toFixed(1)};
      float keep = max(0.001, smoothstep(0.0, 0.22, arcU) * smoothstep(0.0, 0.22, 1.0 - arcU));
      vec2 squash = vec2(vMapUv.x, vMapUv.y / keep);
      if (squash.y > 1.0) discard;
      diffuseColor *= texture2D( map, squash );`);
  };
  back.position.y = tileH / 2 - 40;
  back.renderOrder = -1;                                       // 하늘 다음, 땅보다 먼저
  group.add(back);
  // 밤에는 안개(수평선 빛)도 거의 안 먹여 하늘보다 어두운 실루엣으로
  const setLight = (color, night) => { backMat.color.copy(color); backFog.value = 0.4 - 0.32 * night; };

  const tick = (t) => { foamTimeRef.value = t; };
  return { group, height, setLight, ready, tick };
}

/* 둥글게 닳은 바위 덩어리: 잘게 나눈 정이십면체를 노이즈로 울퉁불퉁하게, 색은 바위 결 따라 얼룩지게 (매끈한 음영) */
export function boulderGeometry(THREE, seed) {
  const n = makeNoise(seed);
  const ico = new THREE.IcosahedronGeometry(1, 3);   // 바위 60여 개라 폰에서도 가볍게
  ico.deleteAttribute("normal"); ico.deleteAttribute("uv");
  const g = mergeVertices(ico);                                   // 꼭짓점을 이어 붙여야 음영이 매끈해진다
  const pos = g.attributes.position, v = new THREE.Vector3(), col = new Float32Array(pos.count * 3);
  const light = new THREE.Color(0x6e6153), dark = new THREE.Color(0x3a322c), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const k = 0.78 + 0.32 * n.fbm(v.x * 1.3 + v.y * 0.7 + 5, v.z * 1.3 - v.y * 0.5, 4) + 0.08 * n.ridged(v.x * 3 + v.y, v.z * 3, 3);
    v.multiplyScalar(k);
    pos.setXYZ(i, v.x, v.y, v.z);
    c.copy(dark).lerp(light, smooth(0.35, 0.75, n.fbm(v.x * 2 + 11, v.y * 4 + v.z, 3)));   // 가로 결
    col.set([c.r, c.g, c.b], i * 3);
  }
  g.setAttribute("color", new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/* 가까운 산비탈의 숲: 둥근 단풍나무(주황·다홍·노랑, 무리 지어)와 짙은 소나무 수천 그루.
   잎 덩어리는 정이십면체 세 개를 겹친 낮은 폴리곤에 둥근 법선을 줘서 부드러운 공처럼 보이게.
   방향별 8묶음으로 나눠 등 뒤 묶음은 그리지 않는다. 멀수록 크게 심어 빈틈을 메운다. */
function plantTrees(THREE, { height, seaY, railZ, yard, fbm, realAt, flats, clear }) {
  const rnd = mulberry32(23);
  // 잎 덩어리: 크기 1 언저리, 바닥이 y=0
  const blobs = [[0, 0.62, 0, 0.55], [-0.28, 0.45, 0.12, 0.4], [0.27, 0.48, -0.1, 0.42]];
  const crownParts = blobs.map(([x, y, z, r]) => {
    const g = new THREE.IcosahedronGeometry(r, 0);
    g.translate(x, y, z);
    return g;
  });
  const crown = mergeParts(THREE, crownParts, (p) => p.clone().sub(new THREE.Vector3(0, 0.5, 0)).normalize());
  const pine = new THREE.ConeGeometry(0.42, 1.25, 7, 1);
  pine.translate(0, 0.62, 0);
  const pineTop = new THREE.ConeGeometry(0.3, 0.8, 7, 1);
  pineTop.translate(0, 1.05, 0);
  const pineGeo = mergeParts(THREE, [pine, pineTop], null);

  const autumn = [0x9c2f12, 0xb84a14, 0xc9701c, 0xd49a2a, 0xb9a23a, 0x7f2510].map((c) => new THREE.Color(c));
  const pineCols = [0x3f5a30, 0x4a6436, 0x36502b].map((c) => new THREE.Color(c));
  const SECTORS = 8, leaf = [], conifer = [];
  for (let i = 0; i < SECTORS; i++) { leaf.push([]); conifer.push([]); }

  const inYardZone = (x, z) => x > yard.minX - 12 && x < yard.maxX + 12 && z > railZ - 3 && z < yard.maxZ + 14;   // 마당 둘레는 비워 바다·산이 보이게
  for (let k = 0; k < 8000; k++) {                              // 폰에서도 가볍게: 나무 약 4,700그루
    const a = rnd() * Math.PI * 2, r = 24 + 300 * Math.pow(rnd(), 1.5);
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (inYardZone(x, z) || clear(x, z)) continue;                 // 다리 길과 섬 터 둘레는 비운다
    if (flats.some((f, g = f.treeGap ?? 9) => x > f.minX - g && x < f.maxX + g && z > f.minZ - g && z < f.maxZ + g)) continue;   // 굴 둘레엔 큰 나무가 바위를 뚫지 않게 (섬 터는 바로 둘레만 비운다)
    const y = height(x, z);
    if (y < seaY + 18 || (r > 150 && y < seaY + 32)) continue;   // 갯바위섬처럼 낮은 땅엔 나무 대신 바위와 풀빛만
                                      // 물가·바다, 낮은 갯바위섬엔 안 심는다
    const sx = height(x + 2, z) - height(x - 2, z), sz = height(x, z + 2) - height(x, z - 2);
    if (Math.hypot(sx, sz) / 4 > 0.9) continue;                     // 깎아지른 벼랑엔 안 자란다
    const grow = 1.15 + Math.max(0, r - 40) / 80;                    // 멀수록 크게 (빈틈 없이), 가까운 나무는 실제 크기
    const isPine = fbm(x / 40 - 7, z / 40 + 3, 3) < 0.3 || rnd() < 0.07;   // 단풍이 주인공, 소나무는 군데군데
    const sector = Math.floor(((a / (Math.PI * 2)) * SECTORS) % SECTORS);
    // 땅 격자는 멀수록 성기다: 둘레 네 곳 중 가장 낮은 높이에 심어야 봉우리 위에 떠 보이지 않는다
    const sp = 3 + r * 0.035;
    const baseY = Math.min(y, height(x + sp, z), height(x - sp, z), height(x, z + sp), height(x, z - sp));
    const t = { x, y: baseY - 0.4, z, s: (isPine ? 3.6 + rnd() * 2 : 2.6 + rnd() * 1.6) * grow, ry: rnd() * 6.28 };
    if (isPine) { t.c = pineCols[Math.floor(rnd() * pineCols.length)]; conifer[sector].push(t); }
    else {
      const f = fbm(x / 18 + 11, z / 18 - 4, 3);                    // 같은 빛깔끼리 무리 지어
      const i = Math.min(autumn.length - 1, Math.floor(Math.max(0, f - 0.25) * 2 * autumn.length + rnd() * 1.5));
      t.c = autumn[i].clone().multiplyScalar(0.85 + rnd() * 0.3);
      leaf[sector].push(t);
    }
  }

  const g = new THREE.Group();
  const leafMat = new THREE.MeshLambertMaterial(), pineMat = new THREE.MeshLambertMaterial();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), v = new THREE.Vector3(), sc = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  const build = (list, geo, mat, wide) => {
    if (!list.length) return;
    const mesh = new THREE.InstancedMesh(geo, mat, list.length);
    list.forEach((t, i) => {
      mesh.setMatrixAt(i, m4.compose(v.set(t.x, t.y, t.z), q.setFromAxisAngle(up, t.ry), sc.set(t.s * wide, t.s, t.s * wide)));
      mesh.setColorAt(i, t.c);
    });
    mesh.computeBoundingSphere();
    g.add(mesh);
  };
  for (let i = 0; i < SECTORS; i++) { build(leaf[i], crown, leafMat, 1.25); build(conifer[i], pineGeo, pineMat, 0.9); }
  g.userData.count = leaf.flat().length + conifer.flat().length;
  return g;
}

// 여러 조각을 한 지오메트리로. normalFn이 있으면 법선을 그 방향으로 (둥근 잎 덩어리)
function mergeParts(THREE, parts, normalFn) {
  const pos = [], nrm = [], v = new THREE.Vector3();
  for (const p of parts) {
    const g = p.index ? p.toNonIndexed() : p;
    g.computeVertexNormals();
    const pa = g.attributes.position, na = g.attributes.normal;
    for (let i = 0; i < pa.count; i++) {
      v.fromBufferAttribute(pa, i);
      pos.push(v.x, v.y, v.z);
      const n = normalFn ? normalFn(v) : v.fromBufferAttribute(na, i);
      nrm.push(n.x, n.y, n.z);
    }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute("normal", new THREE.Float32BufferAttribute(nrm, 3));
  return out;
}
