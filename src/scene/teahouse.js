/* 다실: 넓힌 마당(법당을 볼 때 오른쪽, 바다 쪽 끝)의 작은 기와집 한 채. 바다 쪽(-z)은 툇마루처럼 트여 있고,
   안에는 낮은 찻상 둘과 방석 넷. 단청 없이 나무와 흰 벽, 먹빛 기와로 수수하게. 자리는 layout.js의 TEA를 따른다. */
import { TEA } from "../logic/layout.js";

export function makeTeaCup(THREE) {
  const g = new THREE.Group();
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.026, 0.05, 12), new THREE.MeshLambertMaterial({ color: 0xe8e0d0 }));
  const tea = new THREE.Mesh(new THREE.CircleGeometry(0.033, 12), new THREE.MeshLambertMaterial({ color: 0x9a7a2e }));
  tea.rotation.x = -Math.PI / 2; tea.position.y = 0.021;
  g.add(cup, tea);
  return g;
}

export function createTeahouse(THREE) {
  const group = new THREE.Group();
  const passable = [];                                      // 카메라가 통과하는 것 (바닥, 방석, 찻상, 천장)
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const { w: W, d: D, fy: FY, wallH: WH } = TEA;
  group.position.set(TEA.x, 0, TEA.z);
  const box = (bw, h, bd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(bw, h, bd), m); b.position.set(x, y, z); group.add(b); return b; };
  const canvasMat = (cw, ch, draw) => {
    const c = document.createElement("canvas"); c.width = cw; c.height = ch;
    draw(c.getContext("2d"), cw, ch);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return mat(0xffffff, { map: t, emissiveMap: t, emissive: 0x777777 });   // 처마 그늘에서도 글씨가 읽히게
  };
  const granite = mat(0xa59c8c), plaster = mat(0xefe8d8, { emissive: 0x38352e }), timber = mat(0x6d4a30), floorWood = mat(0xa8784e), cushionMat = mat(0x7d8a5c), tableMat = mat(0x54362a);

  /* 기단과 마루, 앞 디딤돌 */
  box(W, FY, D, granite, 0, FY / 2, 0);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), floorWood);
  floor.rotation.x = -Math.PI / 2; floor.position.y = FY + 0.01; group.add(floor); passable.push(floor);
  passable.push(box(4.2, FY / 2, 0.7, granite, 0, FY / 4, -D / 2 - 0.35));

  /* 벽: 뒤와 양옆만. 나무 띠로 칸을 나눈다 */
  const WT = 0.14;
  box(W, WH, WT, plaster, 0, FY + WH / 2, D / 2 - WT / 2);
  for (const sx of [-1, 1]) box(WT, WH, D, plaster, sx * (W / 2 - WT / 2), FY + WH / 2, 0);
  const bay = W / 4;
  // 기둥: 앞은 드나드는 가운데 칸을 넓게 비워 넷, 뒤는 다섯
  for (const [z, xs] of [[-D / 2 + 0.12, [-W / 2, -1.6, 1.6, W / 2]], [D / 2 - 0.1, [0, 1, 2, 3, 4].map((i) => -W / 2 + bay * i)]]) for (const x of xs) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, WH, 8), timber);
    p.position.set(x, FY + WH / 2, z); group.add(p);
  }
  // 바깥 벽 나무 틀: 민벽이 밋밋하지 않게 기둥과 가운데 띠
  for (const sx of [-1, 1]) {
    box(0.1, 0.12, D, timber, sx * (W / 2 + 0.03), FY + 1.0, 0);
    for (const k of [-0.5, 0, 0.5]) box(0.08, WH, 0.16, timber, sx * (W / 2 + 0.02), FY + WH / 2, k * D / 1.5);
  }
  box(W, 0.12, 0.1, timber, 0, FY + 1.0, D / 2 + 0.03);
  for (let i = 0; i <= 4; i++) box(0.16, WH, 0.08, timber, -W / 2 + bay * i, FY + WH / 2, D / 2 + 0.02);
  box(W + 0.16, 0.2, 0.18, timber, 0, FY + WH - 0.1, -D / 2 + 0.12);                  // 앞 도리
  box(W + 0.16, 0.2, 0.18, timber, 0, FY + WH - 0.1, D / 2 - 0.1);
  for (const sx of [-1, 1]) {
    box(0.16, 0.2, D, timber, sx * (W / 2 - 0.06), FY + WH - 0.1, 0);
    box(0.16, 0.12, D, timber, sx * (W / 2 - 0.15), FY + 1.0, 0);                      // 옆벽 가운데 띠
  }

  // 벽 위 둘레 도리: 벽과 지붕 사이가 뜨지 않게 처마 밑까지 막는다
  const PLATE = 0.28;
  box(W + 0.16, PLATE, 0.2, timber, 0, FY + WH + PLATE / 2 - 0.02, -D / 2 + 0.12);
  box(W + 0.16, PLATE, 0.2, timber, 0, FY + WH + PLATE / 2 - 0.02, D / 2 - 0.1);
  for (const sx of [-1, 1]) box(0.2, PLATE, D, timber, sx * (W / 2 - 0.02), FY + WH + PLATE / 2 - 0.02, 0);

  /* 천장 */
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.1, D - 0.1), mat(0xb8956a, { emissive: 0x5a4630 }));   // 아래를 보는 면은 빛을 못 받아 스스로 밝게 (까맣게 뭉치지 않게)
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = FY + WH - 0.02; group.add(ceiling); passable.push(ceiling);

  for (const k of [-0.4, -0.2, 0, 0.2, 0.4]) passable.push(box(0.14, 0.1, D - 0.2, mat(0x6d4a30, { emissive: 0x2a1c12 }), k * W, FY + WH - 0.08, 0));   // 서까래

  /* 뒷벽 족자 끽다거(차 한 잔 드시게)와 앞 현판 */
  const scroll = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 1.5), canvasMat(124, 300, (g, w, h) => {
    g.fillStyle = "#e9dfc6"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#6b4a2e"; g.fillRect(0, 0, w, 16); g.fillRect(0, h - 16, w, 16);
    g.fillStyle = "#26211d"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = '500 62px "Noto Serif KR","Apple SD Gothic Neo",serif';
    ["喫", "茶", "去"].forEach((c, i) => g.fillText(c, w / 2, 70 + i * 80));
  }));
  scroll.rotation.y = Math.PI; scroll.position.set(0, FY + 1.3, D / 2 - WT - 0.01); group.add(scroll);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 0.48), canvasMat(260, 96, (g, w, h) => {
    g.fillStyle = "#3a281c"; g.fillRect(0, 0, w, h);
    g.strokeStyle = "#a88a5a"; g.lineWidth = 5; g.strokeRect(5, 5, w - 10, h - 10);
    g.fillStyle = "#efe6d0"; g.textAlign = "center"; g.textBaseline = "middle"; g.font = '600 56px "Noto Serif KR","Apple SD Gothic Neo",serif';
    g.fillText("다 실", w / 2, h / 2 + 3);
  }));
  sign.rotation.y = Math.PI; sign.position.set(0, FY + WH + 0.1, -D / 2 + 0.01); group.add(sign);

  /* 방석과 찻상: 찻상 위에 찻주전자와 찻잔 둘 */
  const local = (p) => ({ x: p.x - TEA.x, z: p.z - TEA.z });
  for (const c of TEA.seats) {
    const { x, z } = local(c);
    passable.push(box(0.62, 0.08, 0.62, cushionMat, x, FY + 0.05, z));
  }
  const cupGeo = new THREE.CylinderGeometry(0.04, 0.028, 0.05, 10), cupMat = mat(0xe8e0d0);
  for (const t of TEA.tables) {
    const { x, z } = local(t);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.05, 16), tableMat);
    top.position.set(x, FY + 0.3, z); group.add(top); passable.push(top);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.16, 0.28, 8), tableMat);
    leg.position.set(x, FY + 0.14, z); group.add(leg); passable.push(leg);
    const pot = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), mat(0x3a2f28));
    pot.scale.y = 0.8; pot.position.set(x, FY + 0.385, z + 0.1); group.add(pot); passable.push(pot);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), mat(0x3a2f28));
    lid.position.set(x, FY + 0.45, z + 0.1); group.add(lid); passable.push(lid);
    for (const s of [-1, 1]) {
      const cup = new THREE.Mesh(cupGeo, cupMat);
      cup.position.set(x + s * 0.2, FY + 0.35, z - 0.08); group.add(cup); passable.push(cup);
    }
  }

  /* 기와 지붕: 오목한 네 물매에 귀가 살짝 들린다 (격자 성기게, 폰에서 가볍게) */
  const EAVE = 1.0, Xh = W / 2 + EAVE, Zh = D / 2 + EAVE, H = 1.5, cell = 0.25;
  const curve = (t) => H * Math.pow(Math.min(1, Math.max(0, t)), 1.6);
  const geo = new THREE.PlaneGeometry(2 * Xh, 2 * Zh, Math.round((2 * Xh) / cell), Math.round((2 * Zh) / cell));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv, XG = Xh - Zh * 0.55;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const side = Math.abs(x) <= XG ? Infinity : curve((Xh - Math.abs(x)) / (Zh * 0.55) * ((Zh - 0) / Zh));
    const ex = Math.max(0, 1 - (Xh - Math.abs(x)) / 1.4), ez = Math.max(0, 1 - (Zh - Math.abs(z)) / 1.4);
    pos.setY(i, Math.min(curve((Zh - Math.abs(z)) / Zh), side) + 0.1 * Math.max(ex, ez) ** 2 + 0.34 * (ex * ez) ** 1.3);
    uv.setXY(i, x / 0.3, z / 1.2);
  }
  geo.computeVertexNormals();
  const c = document.createElement("canvas"); c.width = c.height = 64;
  const g = c.getContext("2d"), grd = g.createLinearGradient(0, 0, 64, 0);
  grd.addColorStop(0, "#2d2c2c"); grd.addColorStop(0.45, "#5a5856"); grd.addColorStop(0.7, "#474543"); grd.addColorStop(1, "#272625");
  g.fillStyle = grd; g.fillRect(0, 0, 64, 64); g.fillStyle = "rgba(15,14,14,.4)"; g.fillRect(0, 59, 64, 5);
  const tiles = new THREE.CanvasTexture(c); tiles.colorSpace = THREE.SRGBColorSpace; tiles.wrapS = tiles.wrapT = THREE.RepeatWrapping;
  const roofY = FY + WH + 0.2;
  const roof = new THREE.Mesh(geo, mat(0xffffff, { map: tiles, side: THREE.DoubleSide }));
  roof.position.y = roofY; group.add(roof);
  box(2 * Xh - 0.5, 0.04, 2 * Zh - 0.5, mat(0x8a6a4a, { emissive: 0x3a2c1e }), 0, roofY + 0.02, 0);             // 처마 밑
  box(2 * XG + 0.2, 0.2, 0.24, mat(0x232222), 0, roofY + H + 0.06, 0);                   // 용마루

  return { group, passable };
}
