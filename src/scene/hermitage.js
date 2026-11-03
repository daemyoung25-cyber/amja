/* 섬 암자: 다리 끝 둥근 터 (마당과 같은 박석, 화강암 축대, 흰 돌난간) 뒤쪽에 앉은 작은 법당 한 채.
   낙산사 홍련암처럼 바닷가 벼랑 끝: 정면 세 칸, 꽃살문, 붉은 기둥, 단청 창방, 청록 기와 팔작지붕.
   로컬 좌표는 정면이 +z (layout HERMITAGE.yaw로 다리 쪽을 보게 돌린다). */
import { ISLAND, BRIDGE, HERMITAGE } from "../logic/layout.js";
import { pavingMaterial } from "./paving.js";
import { dancheongBand } from "./dancheong.js";
import { createGongpo } from "./gongpo.js";

export function createHermitage(THREE) {
  const group = new THREE.Group();
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const canvasTex = (w, h, draw) => {
    const c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  };
  const R = ISLAND.r;

  /* 터: 박석 윗면 + 다듬은 화강암을 쌓은 축대 (아래로 갈수록 조금 넓게) */
  const masonry = canvasTex(256, 128, (g, w, h) => {
    g.fillStyle = "#6f675c"; g.fillRect(0, 0, w, h);
    const rows = 4, rh = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = -(r % 2) * 30;
      while (x < w) {
        const bw = 44 + ((x * 7 + r * 13) % 30);
        const v = 140 + ((x * 31 + r * 57) % 40);
        g.fillStyle = `rgb(${v},${v - 6},${v - 16})`;
        g.fillRect(x + 2, r * rh + 2, bw - 4, rh - 4);
        x += bw;
      }
    }
  });
  const WALL_H = 3;
  masonry.repeat.set(Math.round((2 * Math.PI * R) / 2.4), WALL_H / 1.5);
  const top = pavingMaterial(THREE, (2 * R) / 10, (2 * R) / 10);
  const pad = new THREE.Mesh(new THREE.CylinderGeometry(R, R + 0.5, WALL_H, 48), [mat(0xffffff, { map: masonry }), top, mat(0x5a5248)]);
  pad.position.set(ISLAND.x, -WALL_H / 2, ISLAND.z);
  group.add(pad);

  /* 흰 돌난간: 터 둘레, 다리 들머리만 비운다 */
  const white = mat(0xe4dfd3), whiteDark = mat(0xcfc8b8);
  const RR = R - 0.18, gapA = Math.atan2(BRIDGE.b.z - ISLAND.z, BRIDGE.b.x - ISLAND.x), gapHalf = (BRIDGE.w / 2 + 0.45) / RR;
  const arc = 2 * Math.PI - 2 * gapHalf, NS = Math.round((arc * RR) / 1.3), da = arc / NS;
  const posts = [], spans = [];
  for (let i = 0; i <= NS; i++) { posts.push(gapA + gapHalf + i * da); if (i < NS) spans.push([posts[i], posts[i] + da]); }
  const postMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.95, 0.2), white, posts.length);
  const capMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.13, 8, 6), whiteDark, posts.length);
  const d = new THREE.Object3D();
  posts.forEach((a, i) => {
    d.position.set(ISLAND.x + Math.cos(a) * RR, 0.475, ISLAND.z + Math.sin(a) * RR); d.rotation.set(0, -a, 0); d.scale.set(1, 1, 1); d.updateMatrix();
    postMesh.setMatrixAt(i, d.matrix);
    d.position.y = 1.0; d.updateMatrix(); capMesh.setMatrixAt(i, d.matrix);
  });
  const railMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 0.12, 0.14), white, spans.length * 2);
  const balMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.05, 0.06, 0.5, 6), whiteDark, spans.length * 2);
  spans.forEach(([a0, a1], i) => {
    const am = (a0 + a1) / 2, len = 2 * RR * Math.sin((a1 - a0) / 2);
    const cx = ISLAND.x + Math.cos(am) * RR * Math.cos((a1 - a0) / 2), cz = ISLAND.z + Math.sin(am) * RR * Math.cos((a1 - a0) / 2);
    d.rotation.set(0, -am - Math.PI / 2, 0);
    d.scale.set(len, 1, 1);
    d.position.set(cx, 0.82, cz); d.updateMatrix(); railMesh.setMatrixAt(i * 2, d.matrix);
    d.position.set(cx, 0.18, cz); d.updateMatrix(); railMesh.setMatrixAt(i * 2 + 1, d.matrix);
    d.scale.set(1, 1, 1);
    for (let k = 0; k < 2; k++) {
      const a = a0 + (a1 - a0) * (k + 1) / 3;
      d.position.set(ISLAND.x + Math.cos(a) * RR, 0.5, ISLAND.z + Math.sin(a) * RR); d.updateMatrix(); balMesh.setMatrixAt(i * 2 + k, d.matrix);
    }
  });
  group.add(postMesh, capMesh, railMesh, balMesh);

  /* 법당 한 채 */
  const hall = new THREE.Group();
  hall.position.set(HERMITAGE.x, 0, HERMITAGE.z);
  hall.rotation.y = HERMITAGE.yaw;
  group.add(hall);
  const box = (w, h, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.set(x, y, z); hall.add(b); return b; };
  const W = HERMITAGE.w, D = HERMITAGE.d, FY = 0.55, WH = 2.3;
  const granite = mat(0xa59c8c), red = mat(0x8e2f22), plaster = mat(0xefe6d4), green = mat(0x2f6b55);
  box(W + 0.9, FY, D + 0.9, granite, 0, FY / 2, 0);                                  // 기단
  box(2.0, FY / 2, 0.5, granite, 0, FY / 4, D / 2 + 0.7);                            // 디딤돌
  // 꽃살문 (정면 세 칸)
  const lattice = canvasTex(256, 256, (g) => {
    g.fillStyle = "#7a4a2e"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#b07a4c"; g.lineWidth = 3;
    for (let i = -256; i < 256; i += 18) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + 256, 256); g.moveTo(i + 256, 0); g.lineTo(i, 256); g.stroke(); }
    g.strokeStyle = "#2f6b55"; g.lineWidth = 12; g.strokeRect(0, 0, 256, 256);
  });
  lattice.repeat.set(2, 1);
  const doorMat = mat(0xffffff, { map: lattice });
  const bay = W / 3;
  for (let i = 0; i < 3; i++) box(bay - 0.3, WH - 0.35, 0.12, doorMat, -W / 2 + bay * (i + 0.5), FY + (WH - 0.35) / 2, D / 2 - 0.1);
  box(W, 0.35, 0.14, plaster, 0, FY + WH - 0.175, D / 2 - 0.1);                   // 문 위 벽
  box(W, WH, 0.14, plaster, 0, FY + WH / 2, -D / 2 + 0.1);                          // 뒷벽
  for (const sx of [-1, 1]) box(0.14, WH, D - 0.2, plaster, sx * (W / 2 - 0.1), FY + WH / 2, 0);
  // 기둥: 정면 네 개, 뒤 네 개
  for (const z of [D / 2 - 0.1, -D / 2 + 0.1]) for (let i = 0; i <= 3; i++) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, WH, 10), red);
    p.position.set(-W / 2 + bay * i, FY + WH / 2, z); hall.add(p);
  }
  for (const sx of [-1, 1]) for (const z of [-0.4, 0.4]) box(0.08, WH, 0.16, red, sx * (W / 2 - 0.02), FY + WH / 2, z * D);   // 옆벽 샛기둥
  // 창방: 단청 띠로 한 바퀴
  const band = mat(0xffffff, { map: dancheongBand(THREE, 3) });
  box(W + 0.3, 0.38, 0.22, band, 0, FY + WH + 0.1, D / 2);
  box(W + 0.3, 0.38, 0.22, band, 0, FY + WH + 0.1, -D / 2);
  for (const sx of [-1, 1]) box(0.22, 0.38, D + 0.3, band, sx * W / 2, FY + WH + 0.1, 0);
  hall.add(createGongpo(THREE, [0.5, 1.5, 2.5].map((i) => ({ x: -W / 2 + bay * i, z: D / 2 + 0.05, ry: Math.PI })), { y: FY + WH + 0.05, scale: 0.55 }));

  /* 팔작지붕: 오목하게 휜 네 물매 (처마 끝은 완만, 용마루 쪽은 가파르게), 네 귀는 살짝 들리고,
     양옆 위쪽은 세운 합각면. 높이 = min(앞뒤 물매, 옆 물매(합각 안쪽은 제한 없음)) */
  const EAVE = 1.25, Xh = W / 2 + EAVE, Zh = D / 2 + EAVE, H = 2.0, cell = 0.1;
  const XG = -Xh + Math.round((2 * Xh - Zh * 0.5) / cell) * cell;        // 합각 자리 (격자 줄에 맞춰)
  const curve = (t) => H * Math.pow(Math.min(1, Math.max(0, t)), 1.7);
  const F = (z) => curve((Zh - Math.abs(z)) / Zh);
  const S = (x) => (Math.abs(x) <= XG + 1e-6 ? Infinity : curve((Xh - Math.abs(x)) / Zh));
  const nx = Math.round((2 * Xh) / cell), nz = Math.round((2 * Zh) / cell);
  const geo = new THREE.PlaneGeometry(2 * Xh, 2 * Zh, nx, nz);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    let y = Math.min(F(z), S(x));
    const ex = Math.max(0, 1 - (Xh - Math.abs(x)) / 1.8), ez = Math.max(0, 1 - (Zh - Math.abs(z)) / 1.8);
    y += 0.14 * Math.pow(Math.max(ex, ez), 2) + 0.5 * Math.pow(ex * ez, 1.3);   // 처마선이 귀로 갈수록 들린다
    pos.setY(i, y);
    uv.setXY(i, x / 0.28, z / 1.2);
  }
  geo.computeVertexNormals();
  const tiles = canvasTex(64, 64, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, w, 0);
    grd.addColorStop(0, "#2c5f5a"); grd.addColorStop(0.45, "#4f9089"); grd.addColorStop(0.7, "#3c7a74"); grd.addColorStop(1, "#24504c");
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.fillStyle = "rgba(20,40,38,0.35)"; g.fillRect(0, h - 5, w, 5);
  });
  const roofMat = mat(0xffffff, { map: tiles, side: THREE.DoubleSide });
  const roof = new THREE.Mesh(geo, roofMat);
  roof.position.y = FY + WH + 0.28;
  hall.add(roof);
  // 처마 밑 서까래 면 (아래서 올려다볼 때 초록 단청빛)
  const under = new THREE.Mesh(new THREE.BoxGeometry(2 * Xh - 0.6, 0.05, 2 * Zh - 0.6), green);
  under.position.y = FY + WH + 0.3; hall.add(under);
  // 합각: 양옆 위 세운 세모면 (붉은 바탕)
  const HG = curve((Xh - XG) / Zh);
  const gShape = new THREE.Shape();
  const zg = Zh * (1 - Math.pow(HG / H, 1 / 1.7));   // 앞뒤 물매가 합각 밑변 높이에 닿는 곳
  gShape.moveTo(-zg, HG);
  for (let k = 0; k <= 20; k++) { const z = -zg + (2 * zg * k) / 20; gShape.lineTo(z, F(z)); }
  gShape.lineTo(zg, HG); gShape.lineTo(-zg, HG);
  const gGeo = new THREE.ShapeGeometry(gShape);
  for (const sx of [-1, 1]) {
    const gm = new THREE.Mesh(gGeo, mat(0x7a2a20, { side: THREE.DoubleSide }));
    gm.rotation.y = Math.PI / 2; gm.position.set(sx * (XG + cell / 2), FY + WH + 0.28, 0); hall.add(gm);
  }
  // 용마루와 양끝 치미
  const ridgeMat = mat(0x24413e);
  box(2 * XG + 0.3, 0.26, 0.3, ridgeMat, 0, FY + WH + 0.28 + H + 0.08, 0);
  for (const sx of [-1, 1]) {
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.55, 5), ridgeMat);
    tip.position.set(sx * (XG + 0.1), FY + WH + 0.28 + H + 0.35, 0); tip.rotation.z = -sx * 0.35; hall.add(tip);
  }
  return { group };
}
