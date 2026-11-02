/* 암자를 둘러싼 땅: 절이 앉은 작은 만(灣), 양옆으로 바다에 뻗은 곶, 뒤로 겹겹이 높아지는 산줄기, 먼 바위섬.
   노이즈로 만든 높이 지형 한 장에 높이·경사로 색을 칠한다 (숲, 바위 벼랑, 물가 검은 바위). 먼 산은 안개(scene.fog)에 묻혀 푸르게 흐려진다. */
import { mulberry32 } from "./world.js";

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

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createLandscape(THREE, { seaY, railZ, yard }) {
  const { fbm, ridged } = makeNoise(11);
  const group = new THREE.Group();

  // 바닷가 선: 절 앞은 난간 바로 아래 절벽, 옆으로 갈수록 바다 쪽으로 뻗어 곶이 된다
  const coastZ = (x) => {
    const ax = Math.abs(x);
    return railZ - 4 - 0.5 * Math.max(0, ax - 30) * smooth(30, 120, ax) - 22 * (fbm(x / 70 + 3, 1.7, 3) - 0.5) * smooth(25, 60, ax);
  };
  const height = (x, z) => {
    const land = z - coastZ(x);
    if (land < 0) return seaY - 6 - Math.min(20, -land * 0.4);                    // 물속
    const d = Math.hypot(x, (z - 2) * 1.2);                                       // 절에서 떨어진 정도
    const behind = smooth(10, 90, z);                                             // 뒤로 갈수록 높아진다
    const amp = (40 + 150 * behind) * smooth(28, 110, d);
    const m = amp * (0.55 * ridged(x / 150, z / 150) + 0.45 * fbm(x / 60 + 9, z / 60 - 4));
    const shoulder = 14 * smooth(24, 70, d) * fbm(x / 25, z / 25, 3);           // 가까운 둔덕
    const cliff = smooth(0, 3 + 9 * smooth(30, 120, Math.abs(x)), land);          // 물가 벼랑: 절 앞은 가파르게
    let y = seaY + (-seaY + m + shoulder) * cliff + 4 * fbm(x / 9, z / 9, 3) * cliff * smooth(8, 40, d);
    // 마당과 그 둘레는 평평하게 비워 둔다 (마당 바닥 조금 아래)
    const inYard = smooth(yard.maxX + 10, yard.maxX + 2, Math.abs(x)) * smooth(railZ - 1, railZ + 1, z) * smooth(yard.maxZ + 14, yard.maxZ + 4, z);
    return y + (-0.5 - y) * inYard;
  };

  /* 큰 지형 한 장: 가까운 곳은 촘촘하게 (격자를 가운데로 모은다) */
  const W = 900, D = 760, SX = 220, SZ = 190, Z0 = -260;
  const geo = new THREE.PlaneGeometry(1, 1, SX, SZ);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const warp = (u) => Math.sign(u) * Math.pow(Math.abs(u), 1.6);                  // -0.5..0.5 → 가운데 촘촘
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), v = pos.getZ(i);
    const x = warp(u * 2) / 2 * W, z = Z0 + (v + 0.5) * D;
    pos.setXYZ(i, x, height(x, z), z);
  }
  geo.computeVertexNormals();
  // 색: 경사와 높이로. 숲(짙은 소나무 초록, 노이즈로 얼룩), 가파른 곳 바위, 물가 젖은 검은 바위
  const nrm = geo.attributes.normal, col = new Float32Array(pos.count * 3);
  const forest = [new THREE.Color(0x2c4227), new THREE.Color(0x3d5a2f), new THREE.Color(0x4f6b38)];
  const rock = new THREE.Color(0x7d7262), rockDark = new THREE.Color(0x3d3631), sand = new THREE.Color(0x8f8676), c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), up = nrm.getY(i);
    const f = fbm(x / 14, z / 14, 3), g = fbm(x / 4 + 50, z / 4, 2);
    c.copy(forest[0]).lerp(forest[1], smooth(0.35, 0.6, f)).lerp(forest[2], smooth(0.62, 0.8, f) * 0.6);
    c.multiplyScalar(0.8 + 0.4 * g);                                              // 나무 한 그루 한 그루 같은 잔 얼룩
    const steep = smooth(0.82, 0.6, up);
    c.lerp(rock.clone().multiplyScalar(0.8 + 0.4 * g), steep);
    c.lerp(rockDark, smooth(seaY + 7, seaY + 1, y));                              // 물가
    if (y > 120) c.lerp(sand, smooth(120, 190, y) * steep * 0.5);
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  geo.setAttribute("color", new THREE.BufferAttribute(col, 3));
  const terrain = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ vertexColors: true }));
  group.add(terrain);

  /* 먼 바위섬: 가파른 바위에 꼭대기만 소나무 숲 */
  const islands = [[-170, -420, 34, 3], [230, -640, 52, 5], [60, -900, 26, 8], [-420, -760, 44, 13]];
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
      c.copy(rock).lerp(rockDark, 0.35).lerp(forest[0], smooth(0.75, 0.9, inrm.getY(i)) * smooth(seaY + 4, seaY + 12, ipos.getY(i)));
      ic.set([c.r, c.g, c.b], i * 3);
    }
    ig.setAttribute("color", new THREE.BufferAttribute(ic, 3));
    const isl = new THREE.Mesh(ig, terrain.material);
    isl.position.set(ix, 0, iz);
    group.add(isl);
  }

  return { group, height };
}
