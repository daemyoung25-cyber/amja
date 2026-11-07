/* 기와불사 테이블과 담장 아래 쌓인 기와. 자리는 logic/layout.js의 GIWA, 쌓는 차례는 logic/giwa.js.
   기와 한 장은 지붕 기와처럼 볼록한 반원통. 많이 쌓여도 가볍게 한 덩어리로 그린다. */
import { GIWA, GIWA_WALL } from "../logic/layout.js";
import { GIWA_SLOTS, giwaCell } from "../logic/giwa.js";

const COL_GAP = 0.3, ROW_GAP = 0.082, FLY_SEC = 1.4;

export function createGiwa(THREE) {
  const group = new THREE.Group();
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, ...o });
  const tileMat = mat(0x6f7176, { side: THREE.DoubleSide, emissive: 0x151618 });
  const tileGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.36, 10, 1, true, -Math.PI / 2, Math.PI);   // 볼록한 쪽이 위(+y)가 되게 눕힌다
  tileGeo.rotateZ(Math.PI / 2); tileGeo.rotateX(-Math.PI / 2);   // 긴 쪽이 담장을 향하고 볼록한 쪽이 위

  /* 쌓인 기와: 담장 앞 */
  const stack = new THREE.InstancedMesh(tileGeo, tileMat, GIWA_SLOTS);
  stack.count = 0; stack.frustumCulled = false;
  group.add(stack);
  const tones = [0xffffff, 0xeeeeee, 0xdddddd, 0xf6f4f0];
  for (let i = 0; i < GIWA_SLOTS; i++) stack.setColorAt(i, new THREE.Color(tones[(i * 5) % tones.length]));
  const cellPos = (slot, out) => { const { col, row } = giwaCell(slot); return out.set(GIWA_WALL.x, 0.09 + row * ROW_GAP, GIWA_WALL.z - col * COL_GAP); };
  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
  let slots = [];
  function draw() {
    stack.count = slots.length;
    slots.forEach((slot, i) => { cellPos(slot, v); m4.compose(v, q, one); stack.setMatrixAt(i, m4); });
    stack.instanceMatrix.needsUpdate = true;
  }
  const flying = [];
  function setTiles(list) {                           // list: [{ slot }] 날아가는 중인 기와는 도착한 뒤에 쌓인다
    slots = list.map((g) => g.slot).filter((s) => !flying.some((f) => f.slot === s));
    draw();
  }

  /* 테이블: 나무 상 위에 빈 기와 몇 장, 벼루와 붓 */
  const t = new THREE.Group(); t.position.set(GIWA.x, 0, GIWA.z); group.add(t);
  const wood = mat(0x7a5233), dark = mat(0x4e3321);
  const box = (w, h, d, m, x, y, z, p = t) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
  const H = 0.72;
  box(0.95, 0.06, 1.3, wood, 0, H, 0);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) box(0.07, H - 0.03, 0.07, dark, sx * 0.4, (H - 0.03) / 2, sz * 0.57);
  box(0.8, 0.04, 0.05, dark, 0, 0.26, -0.57); box(0.8, 0.04, 0.05, dark, 0, 0.26, 0.57);
  for (let i = 0; i < 3; i++) { const o = new THREE.Mesh(tileGeo, tileMat); o.position.set(0.14, H + 0.1 + i * ROW_GAP, -0.34); t.add(o); }       // 적을 기와
  const flat = new THREE.Mesh(tileGeo, mat(0x8a8c90, { side: THREE.DoubleSide })); flat.position.set(-0.12, H + 0.11, 0.2); t.add(flat);            // 적고 있는 기와
  box(0.16, 0.03, 0.24, mat(0x24252a), 0.26, H + 0.045, 0.38);                                                                                       // 벼루
  const brush = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.26, 6), dark); brush.rotation.x = Math.PI / 2 - 0.08; brush.position.set(0.05, H + 0.05, 0.42); t.add(brush);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.014, 0.05, 6), mat(0x1a1a1c)); tip.rotation.x = -Math.PI / 2; tip.position.set(0.05, H + 0.04, 0.565); t.add(tip);

  // 이름표 (소원걸이와 같은 모양)
  const c = document.createElement("canvas"); c.width = 512; c.height = 128;
  const g = c.getContext("2d");
  g.font = '600 64px "Apple SD Gothic Neo","Noto Sans KR",sans-serif'; g.textAlign = "center"; g.textBaseline = "middle";
  const tw = Math.min(500, g.measureText("기와불사").width + 56);
  g.fillStyle = "rgba(20,22,36,0.55)"; g.beginPath(); g.roundRect((512 - tw) / 2, 14, tw, 100, 50); g.fill();
  g.fillStyle = "#f8f3e8"; g.fillText("기와불사", 256, 66);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  tag.scale.set(1.5, 0.375, 1); tag.position.set(0, 1.75, 0); tag.renderOrder = 10; t.add(tag);

  // 누르기 쉬운 보이지 않는 자리
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.8, 1.2, 10), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.6, 0); t.add(hit);

  /* 내가 올린 기와: 테이블에서 담장까지 날아가 쌓인다 */
  const from = new THREE.Vector3(GIWA.x, H + 0.2, GIWA.z), to = new THREE.Vector3();
  function fly(slot) {
    const mesh = new THREE.Mesh(tileGeo, tileMat);
    mesh.position.copy(from); group.add(mesh);
    flying.push({ slot, mesh, t: 0 });
  }
  function update(dt) {
    for (let i = flying.length - 1; i >= 0; i--) {
      const f = flying[i];
      f.t += dt / FLY_SEC;
      const u = Math.min(1, f.t), e = u * u * (3 - 2 * u);
      cellPos(f.slot, to);
      f.mesh.position.lerpVectors(from, to, e); f.mesh.position.y += Math.sin(Math.PI * u) * 1.2;
      f.mesh.rotation.x = Math.sin(Math.PI * u) * 0.5;
      if (u >= 1) {
        group.remove(f.mesh); flying.splice(i, 1);
        if (!slots.includes(f.slot)) { slots = [...slots, f.slot]; draw(); }
      }
    }
  }
  return { group, hit, setTiles, fly, update };
}
