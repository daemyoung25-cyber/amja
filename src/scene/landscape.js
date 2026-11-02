/* 암자를 둘러싼 땅: 절이 앉은 작은 만(灣), 양옆으로 바다에 뻗은 곶, 뒤로 겹겹이 높아지는 산줄기, 먼 바위섬.
   노이즈로 만든 높이 지형 한 장에 높이·경사로 색을 칠한다 (숲, 바위 벼랑, 물가 검은 바위). 먼 산은 안개(scene.fog)에 묻혀 푸르게 흐려진다. */
import { mulberry32 } from "./world.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

// 값 노이즈 + 부드러운 보간, 여러 겹(fbm)과 능선형(ridged)
function makeNoise(seed) {
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

export function createLandscape(THREE, { seaY, railZ, yard }) {
  const { fbm, ridged } = makeNoise(11);
  const group = new THREE.Group();

  // 바닷가 선: 절 앞은 난간 바로 아래 절벽, 옆으로 갈수록 바다 쪽으로 뻗어 곶이 된다
  const coastZ = (x) => {
    const ax = Math.abs(x);
    return railZ - 1.2 - 0.5 * Math.max(0, ax - 30) * smooth(30, 120, ax) - 22 * (fbm(x / 70 + 3, 1.7, 3) - 0.5) * smooth(25, 60, ax);
  };
  const height = (x, z) => {
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
    const inYard = smooth(yard.maxX + 10, yard.maxX + 2, Math.abs(x)) * smooth(railZ - 1, railZ + 1, z) * smooth(yard.maxZ + 14, yard.maxZ + 4, z);
    return y + (-0.5 - y) * inYard;
  };

  /* 큰 지형 한 장: 가까운 곳은 촘촘하게 (격자를 가운데로 모은다) */
  const W = 900, SX = 220, SZ = 240, Z_SEA = 260, Z_LAND = 500;   // 앞(바다) 260m, 뒤(산) 500m
  const geo = new THREE.PlaneGeometry(1, 1, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.6);                  // -0.5..0.5 → 가운데 촘촘
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getZ(i);
    const t = v * 2;                                                              // -0.5(바다 쪽) → +0.5(산 쪽), 원래 면 방향 그대로
    const x = warp(u * 2) / 2 * W, z = Math.sign(t) * Math.pow(Math.abs(t), 1.7) * (t > 0 ? Z_LAND : Z_SEA);   // 절벽 둘레를 촘촘하게
    pos.setXYZ(i, x, height(x, z), z);
  }
  geo.computeVertexNormals();
  // 색: 숲은 사진에서 떠 온 단풍 숲 무늬(canopy.webp)를 땅 위에서 내려다보듯 깔고, 꼭짓점 색으로 크게 얼룩지게.
  // 가파른 곳은 무늬를 걷어내고 흰 화강암, 물가는 젖은 검은 바위 (rock 값으로 셰이더가 섞는다)
  const nrm = geo.attributes.normal, col = new Float32Array(pos.count * 3), rockA = new Float32Array(pos.count), uv = geo.attributes.uv;
  const rock = new THREE.Color(0xc9bfae), rockDark = new THREE.Color(0x3d3631), pine = new THREE.Color(0x5d7a48), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), up = nrm.getY(i);
    const f = fbm(x / 14, z / 14, 3), g = fbm(x / 4 + 50, z / 4, 2);
    uv.setXY(i, x / 34, z / 34);
    c.setRGB(1, 1, 1).lerp(pine, smooth(0.42, 0.25, f) * 0.7);                    // 소나무 숲 얼룩
    c.multiplyScalar(0.8 + 0.35 * g);
    const steep = smooth(0.62, 0.42, up);                                         // 아주 가파른 데만 바위가 드러난다
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
  terrainMat.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("void main() {", "attribute float rock; varying float vRock;\nvoid main() {\n  vRock = rock;");
    // 바위에는 숲 무늬의 밝기만 남겨 결처럼
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", "varying float vRock;\nvoid main() {")
      .replace("#include <map_fragment>", `vec4 texel = texture2D( map, vMapUv );
        diffuseColor.rgb *= mix( texel.rgb * 1.5, vec3( 0.7 + 0.8 * dot( texel.rgb, vec3( 0.333 ) ) ), vRock );`);
  };
  const terrain = new THREE.Mesh(geo, terrainMat);
  group.add(terrain);

  /* 먼 바위섬: 가파른 바위에 꼭대기만 소나무 숲 */
  // 먼 섬은 안개를 반쯤만 먹는다: 아침·저녁 밝은 수평선 빛에 하얗게 떠 보이지 않고 어두운 바위 실루엣으로
  const islandMat = capFog(new THREE.MeshLambertMaterial({ vertexColors: true }), 0.45);
  const islands = [[-170, -330, 30, 3], [230, -460, 46, 5], [60, -620, 24, 8], [-380, -560, 40, 13]];
  for (const [ix, iz, r, seed] of islands) {
    const n = makeNoise(seed);
    const ig = new THREE.PlaneGeometry(r * 2.8, r * 2.8, 40, 40);
    ig.rotateX(-Math.PI / 2);
    const ipos = ig.attributes.position;
    for (let i = 0; i < ipos.count; i++) {
      const lx = ipos.getX(i), lz = ipos.getZ(i), d = Math.hypot(lx, lz) / r;
      const edge = 1 - smooth(0.55 + 0.3 * n.fbm(lx / 12, lz / 12, 3), 1.15, d);
      ipos.setY(i, seaY - 3 + edge * r * (0.6 + 0.7 * n.ridged(lx / 25, lz / 25, 4)));
    }
    ig.computeVertexNormals();
    const inrm = ig.attributes.normal, ic = new Float32Array(ipos.count * 3);
    for (let i = 0; i < ipos.count; i++) {
      c.copy(rock).lerp(rockDark, 0.6).lerp(pine.clone().multiplyScalar(0.55), smooth(0.75, 0.9, inrm.getY(i)) * smooth(seaY + 4, seaY + 12, ipos.getY(i)));
      ic.set([c.r, c.g, c.b], i * 3);
    }
    ig.setAttribute("color", new THREE.BufferAttribute(ic, 3));
    const isl = new THREE.Mesh(ig, islandMat);
    isl.position.set(ix, 0, iz);
    group.add(isl);
  }

  /* 먼 산 그림: 절 뒤로 반원보다 조금 넓게 둘러선 화강암 봉우리와 단풍 숲 (북한산 사진, CC0, 단풍빛으로 바꿈).
     사진을 거울로 이어 붙여 두 번 두르고, 빛은 시각에 따라 setLight로 맞춘다. 아래쪽은 3D 산줄기에 가려진다. */
  const R = 640, ARC = Math.PI * 1.25, TILES = 2;
  const tex = new THREE.TextureLoader().load("textures/mountains.webp");
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.MirroredRepeatWrapping;
  tex.repeat.set(TILES, 1);
  tex.offset.x = 0.5;                                          // 거울 이음매가 대웅전 바로 뒤에 오지 않게 (양옆 56° 쪽으로)
  const tileW = (R * ARC) / TILES, tileH = tileW * 960 / 3200;
  const backFog = { value: 0.4 };
  const backMat = capFog(new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.BackSide, depthWrite: false }), backFog);
  const back = new THREE.Mesh(new THREE.CylinderGeometry(R, R, tileH, 96, 1, true, -ARC / 2, ARC), backMat);
  back.position.y = tileH / 2 - 15;
  back.renderOrder = -1;                                       // 하늘 다음, 땅보다 먼저
  group.add(back);
  // 밤에는 안개(수평선 빛)도 거의 안 먹여 하늘보다 어두운 실루엣으로
  const setLight = (color, night) => { backMat.color.copy(color); backFog.value = 0.4 - 0.32 * night; };

  return { group, height, setLight };
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
