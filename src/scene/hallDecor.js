/* 대웅전 안 꾸밈: 우리 절 법당에서 흔히 보는 것들.
   - 후불탱화 양옆 여백: 천불(작은 금불상이 칸칸이 모셔진 벽)
   - 왼쪽 벽: 지장보살·시왕도와 영단 / 오른쪽 벽: 신중탱화와 신중단 (각각 작은 단에 촛불·과일·향로)
   - 옆벽 앞쪽: 꽃살 창
   - 천장 아래: 이름표를 단 작은 연등(인등) 줄
   - 불단 위: 향로와 과일 공양 / 불단 왼쪽 앞: 스님 자리 방석과 경상 (스님은 main.js) */
import { MONK } from "../logic/layout.js";
export function decorateHall(THREE, hall, d) {
  const { FY, W_SIDE, W_FRONT, W_BACK, WT, CEILING_Y, ALTAR, altarTop, TH_W, TH_Y, TH_H, latticeMat, sumidanMat, gold } = d;
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
  const add = (o) => { hall.add(o); return o; };
  const box = (w, h, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.set(x, y, z); return add(b); };
  const loadTex = (url) => { const t = new THREE.TextureLoader().load(url); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; };
  const deepRed = mat(0x6b1f17), bronze = mat(0x7a6033);
  const m4 = new THREE.Matrix4();

  /* 천불: 붉은 칸막이 안에 작은 금불상 */
  const shelfTex = (() => {
    const c = document.createElement("canvas"); c.width = 256; c.height = 256;
    const g = c.getContext("2d");
    g.fillStyle = "#3a120d"; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = "#c9993f"; g.lineWidth = 10; g.strokeRect(5, 5, 246, 246);
    g.fillStyle = "#5a1d14"; g.beginPath(); g.ellipse(128, 120, 80, 100, 0, 0, Math.PI * 2); g.fill();   // 감실 안쪽
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  })();
  const CELL_W = 0.3, CELL_H = 0.34;
  const x0 = TH_W / 2 + 0.45, x1 = W_SIDE - 0.55, yTop = TH_Y + TH_H / 2, yBot = altarTop + 0.2;
  const cols = Math.floor((x1 - x0) / CELL_W), rows = Math.floor((yTop - yBot) / CELL_H);
  const wallW = cols * CELL_W, wallH = rows * CELL_H, wallZ = W_BACK - WT / 2 - 0.12;
  const figureBody = new THREE.LatheGeometry([[0, 0], [0.085, 0.005], [0.09, 0.035], [0.05, 0.06], [0.045, 0.13], [0.025, 0.155], [0, 0.16]].map(([r, h]) => new THREE.Vector2(r, h)), 8);
  const figureHead = new THREE.SphereGeometry(0.035, 8, 6);
  const goldStd = new THREE.MeshStandardMaterial({ color: 0xd8ae4f, metalness: 0.8, roughness: 0.4 });
  const nFig = cols * rows * 2;
  const bodies = new THREE.InstancedMesh(figureBody, goldStd, nFig), heads = new THREE.InstancedMesh(figureHead, goldStd, nFig);
  let n = 0;
  for (const sx of [-1, 1]) {
    const cx = sx * (x0 + wallW / 2);
    const shelfMat = new THREE.MeshLambertMaterial({ map: shelfTex.clone() });
    shelfMat.map.repeat.set(cols, rows); shelfMat.map.needsUpdate = true;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(wallW, wallH), shelfMat);
    back.rotation.y = Math.PI; back.position.set(cx, yBot + wallH / 2, wallZ);
    add(back);
    box(wallW + 0.16, 0.08, 0.3, gold, cx, yBot + wallH + 0.04, wallZ - 0.1);       // 위아래 금테
    box(wallW + 0.16, 0.1, 0.3, gold, cx, yBot - 0.05, wallZ - 0.1);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
      const fx = cx - wallW / 2 + CELL_W * (c + 0.5), fy = yBot + CELL_H * r + 0.06;
      bodies.setMatrixAt(n, m4.makeTranslation(fx, fy, wallZ - 0.06));
      heads.setMatrixAt(n, m4.makeTranslation(fx, fy + 0.19, wallZ - 0.06));
      n++;
    }
  }
  add(bodies); add(heads);

  /* 옆벽 탱화와 작은 단: 왼쪽은 지장보살·시왕도(영단), 오른쪽은 신중탱화(신중단) */
  const sideZ = (W_FRONT + W_BACK) / 2 + 1.6;
  for (const [sx, url, aspect, w] of [[-1, "textures/jijang.jpg", 1135 / 1280, 3.2], [1, "textures/sinjung.jpg", 1262 / 1100, 2.6]]) {
    const h = w * aspect, wallX = sx * (W_SIDE - WT / 2 - 0.02), cy = FY + 1.25 + h / 2;
    const face = -sx * Math.PI / 2;                       // 방 안쪽을 보게
    const frame = new THREE.Mesh(new THREE.PlaneGeometry(w + 0.3, h + 0.3), deepRed);
    frame.rotation.y = face; frame.position.set(wallX, cy, sideZ);
    const pic = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: loadTex(url) }));
    pic.rotation.y = face; pic.position.set(wallX - sx * 0.01, cy, sideZ);
    add(frame); add(pic);
    // 작은 단: 연꽃 칸 앞판, 금색 윗판, 촛불 둘·과일·향로
    const ax = sx * (W_SIDE - 0.55);
    box(0.7, 0.8, 2.6, [sumidanMat, sumidanMat, gold, deepRed, deepRed, deepRed], ax, FY + 0.4, sideZ);
    for (const dz of [-0.9, 0.9]) {
      box(0.06, 0.32, 0.06, mat(0xf4efe4), ax, FY + 0.96, sideZ + dz);
      const f = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 6), new THREE.MeshBasicMaterial({ color: 0xffc35a }));
      f.position.set(ax, FY + 1.18, sideZ + dz); add(f); d.flames.push(f);
    }
    fruitStack(ax, FY + 0.8, sideZ - 0.4, 0xe0802a);
    fruitStack(ax, FY + 0.8, sideZ + 0.4, 0xc23a2a);
    censer(ax, FY + 0.8, sideZ);
  }

  /* 옆벽 앞쪽 꽃살 창 (양쪽 둘씩) */
  for (const sx of [-1, 1]) for (const z of [W_FRONT + 1.3, W_FRONT + 3.0]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(1.3, 1.5), latticeMat);
    win.rotation.y = -sx * Math.PI / 2; win.position.set(sx * (W_SIDE - WT / 2 - 0.02), FY + 2.4, z);
    add(win);
    box(0.08, 0.08, 1.45, deepRed, sx * (W_SIDE - WT / 2 - 0.05), FY + 1.62, z);   // 창턱
  }

  /* 천장 아래 인등: 작은 연등 줄과 흰 이름표 */
  const lampGeo = new THREE.LatheGeometry([[0, -0.11], [0.07, -0.1], [0.11, -0.05], [0.12, 0.01], [0.09, 0.07], [0.11, 0.1], [0.03, 0.08], [0, 0.09]].map(([r, h]) => new THREE.Vector2(r, h)), 8);
  const lampMat = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const tagMat = new THREE.MeshLambertMaterial({ color: 0xf4f0e6 });
  const LAMP_COLORS = [0xf28fb0, 0xf5a35c, 0xf3dd7a, 0x9fd38a, 0xf7f1e3, 0xe0574a];
  const spots = [];
  for (let z = W_FRONT + 0.9; z <= ALTAR.z - 2.4; z += 1.1) for (let x = -W_SIDE + 1.0; x <= W_SIDE - 1.0 + 1e-6; x += 0.75) spots.push([x, z]);
  const lamps = new THREE.InstancedMesh(lampGeo, lampMat, spots.length), tags = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.12, 0.005), tagMat, spots.length);
  const ly = CEILING_Y - 0.9;
  spots.forEach(([x, z], i) => {
    lamps.setMatrixAt(i, m4.makeTranslation(x, ly, z));
    lamps.setColorAt(i, new THREE.Color(LAMP_COLORS[(i * 7 + Math.floor(z * 3)) % LAMP_COLORS.length]));
    tags.setMatrixAt(i, m4.makeTranslation(x, ly - 0.2, z - 0.05));
  });
  add(lamps); add(tags);
  // 천장에서 연등까지 늘어뜨린 끈
  const pts = spots.flatMap(([x, z]) => [new THREE.Vector3(x, CEILING_Y, z), new THREE.Vector3(x, ly + 0.09, z)]);
  add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x5a3a2c })));

  /* 불단 위 향로·과일, 불단 앞 경상과 목탁 */
  censer(ALTAR.x, altarTop, ALTAR.z - 0.5);
  for (const sx of [-1, 1]) fruitStack(ALTAR.x + sx * 1.45, altarTop, ALTAR.z - 0.45, sx < 0 ? 0xe0802a : 0xc23a2a);
  // 스님 자리: 방석과, 부처님 쪽 앞에 경상(펼친 경전). 예전엔 방석 줄과 겹쳤다
  {
    const fx = ALTAR.x - MONK.x, fz = ALTAR.z - MONK.z, L = Math.hypot(fx, fz), ux = fx / L, uz = fz / L;
    box(0.74, 0.09, 0.74, mat(0x6e3b2a), MONK.x, FY + 0.045, MONK.z).rotation.y = Math.atan2(ux, uz);
    const desk = new THREE.Group();
    desk.position.set(MONK.x + ux * 0.66, FY, MONK.z + uz * 0.66);
    desk.rotation.y = Math.atan2(ux, uz);                                             // 긴 쪽이 스님 앞을 가로지른다
    for (const [w, h, dd, m, y] of [[0.9, 0.3, 0.42, deepRed, 0.15], [0.95, 0.04, 0.48, gold, 0.32], [0.42, 0.04, 0.28, mat(0xe8dcc0), 0.36]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.y = y; desk.add(b);
    }
    add(desk);
  }

  function fruitStack(x, y, z, color) {
    const fm = mat(color);
    box(0.34, 0.06, 0.34, bronze, x, y + 0.03, z);                                     // 굽다리 접시
    const layers = [[3, 0.1], [2, 0.08], [1, 0.06]];
    let yy = y + 0.12;
    for (const [k, r] of layers) {
      for (let i = 0; i < k * k; i++) {
        const fx = x + ((i % k) - (k - 1) / 2) * r * 1.6, fz = z + (Math.floor(i / k) - (k - 1) / 2) * r * 1.6;
        const f = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), fm); f.position.set(fx, yy, fz); add(f);
      }
      yy += r * 1.5;
    }
  }
  function censer(x, y, z) {
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.14, 10), bronze); c.position.set(x, y + 0.07, z); add(c);
    for (let i = 0; i < 3; i++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 3), mat(0x7a2b20));
      stick.position.set(x - 0.04 + i * 0.04, y + 0.25, z); add(stick);
    }
  }
}
