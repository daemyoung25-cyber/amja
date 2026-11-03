/* 소원걸이: 나무 기둥 두 개에 가로대 세 줄, 작은 기와지붕. 소원패(작은 나무패)를 붉은 끈으로 가로대에 건다.
   앞(모델의 -z, 해수관음 쪽)에서 건다. 패는 바람에 살짝 흔들린다. 글은 그리지 않는다 (적은 사람 폰에만 있다). */
import { WISH_SLOTS } from "../logic/wishes.js";

const ROWS = 3, PER_ROW = WISH_SLOTS / ROWS, WIDTH = 2.5, BAR_Y = [1.85, 1.4, 0.95];
const ORDER = Array.from({ length: PER_ROW }, (_, i) => (i % 2 ? PER_ROW / 2 + (i + 1) / 2 - 1 : PER_ROW / 2 - 1 - i / 2));   // 가운데부터 바깥으로

function slotPos(slot) {
  const row = Math.floor(slot / PER_ROW), col = ORDER[slot % PER_ROW];
  return { x: (col - (PER_ROW - 1) / 2) * (WIDTH - 0.2) / PER_ROW, y: BAR_Y[row], z: -0.02 + (col % 2) * 0.03 };
}

export function createWishRack(THREE, { x, z, yaw = 0 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;                                      // 앞면(-z)이 yaw 쪽을 본다
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const stone = mat(0x9a9285), wood = mat(0x6e4a32), barMat = mat(0x5a3a26), roofMat = mat(0x2e3138);
  const box = (w, h, d, m, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); group.add(o); return o; };

  for (const sx of [-1, 1]) {
    box(0.4, 0.2, 0.4, stone, sx * (WIDTH / 2 + 0.08), 0.1, 0);                  // 주춧돌
    box(0.14, 2.3, 0.14, wood, sx * (WIDTH / 2 + 0.08), 1.25, 0);                // 기둥
  }
  for (const y of BAR_Y) box(WIDTH + 0.3, 0.05, 0.05, barMat, 0, y, 0);          // 가로대
  box(WIDTH + 0.4, 0.12, 0.14, wood, 0, 2.38, 0);                                 // 도리
  for (const s of [-1, 1]) {                                                       // 기와지붕
    const r = box(WIDTH + 0.9, 0.05, 0.55, roofMat, 0, 2.55, s * 0.2);
    r.rotation.x = s * 0.45;
  }
  box(WIDTH + 0.95, 0.07, 0.07, roofMat, 0, 2.67, 0);

  // 지붕 위 이름표 (촛불 공양대와 같은 모양)
  const tagC = document.createElement("canvas"); tagC.width = 512; tagC.height = 128;
  const tg = tagC.getContext("2d");
  tg.font = '600 64px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  tg.textAlign = "center"; tg.textBaseline = "middle";
  const tw = Math.min(500, tg.measureText("소원걸이").width + 56);
  tg.fillStyle = "rgba(20,22,36,0.55)";
  tg.beginPath(); tg.roundRect((512 - tw) / 2, 14, tw, 100, 50); tg.fill();
  tg.fillStyle = "#f8f3e8"; tg.fillText("소원걸이", 256, 66);
  const tagTex = new THREE.CanvasTexture(tagC); tagTex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true, depthWrite: false }));
  tag.scale.set(1.9, 0.475, 1);
  tag.position.set(0, 3.2, 0);
  tag.renderOrder = 10;
  group.add(tag);

  /* 소원패: 위가 둥근 듯한 작은 나무패 + 붉은 끈. 패마다 나뭇빛이 조금씩 다르다 */
  const plateGeo = new THREE.BoxGeometry(0.095, 0.16, 0.014); plateGeo.translate(0, -0.15, 0);
  const cordGeo = new THREE.BoxGeometry(0.006, 0.07, 0.006); cordGeo.translate(0, -0.035, 0);
  const plates = new THREE.InstancedMesh(plateGeo, new THREE.MeshLambertMaterial({ color: 0xffffff }), WISH_SLOTS);
  const cords = new THREE.InstancedMesh(cordGeo, new THREE.MeshLambertMaterial({ color: 0xb3262a }), WISH_SLOTS);
  const tones = [0xe8d3ad, 0xdcc296, 0xf0e2c4, 0xd9b98a];
  for (let i = 0; i < WISH_SLOTS; i++) plates.setColorAt(i, new THREE.Color(tones[(i * 7) % tones.length]));
  for (const m of [plates, cords]) { m.count = 0; m.frustumCulled = false; group.add(m); }

  const m4 = new THREE.Matrix4(), v = new THREE.Vector3(), q = new THREE.Quaternion(), e = new THREE.Euler(), one = new THREE.Vector3(1, 1, 1);
  let shown = [];
  function setWishes(list) {                                   // list: [{ slot }]
    shown = list.map((w) => ({ ...slotPos(w.slot), ph: w.slot * 2.3 }));
    plates.count = cords.count = shown.length;
    update(0);
  }
  function update(t) {
    shown.forEach((p, i) => {
      e.set(Math.sin(t * 0.9 + p.ph) * 0.12, 0, Math.sin(t * 0.7 + p.ph * 1.4) * 0.06);
      m4.compose(v.set(p.x, p.y, p.z), q.setFromEuler(e), one);
      plates.setMatrixAt(i, m4);
      cords.setMatrixAt(i, m4);
    });
    if (shown.length) plates.instanceMatrix.needsUpdate = cords.instanceMatrix.needsUpdate = true;
  }

  return { group, setWishes, update };
}
