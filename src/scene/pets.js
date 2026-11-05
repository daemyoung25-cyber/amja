/* 강아지집과 바둑이·백구·하얀 고양이 배치. 몸은 scene/beasts.js, 움직임은 logic/pets.js.
   동물은 움직이는 그림자 대신 발밑 둥근 그림자를 쓰고, 누르기·카메라 충돌에 걸리지 않는다. 강아지집은 마당 물건처럼 그림자를 드리운다. */
import { DOG, BAEK, CAT, petAt } from "../logic/pets.js";
import { createDog, createBaekgu, createCat } from "./beasts.js";

// 옹기 밥그릇(사료)과 백자 물그릇
function createBowls(THREE, { food, water }) {
  const g = new THREE.Group();
  const profile = [[0.001, 0], [0.12, 0], [0.165, 0.075], [0.15, 0.08], [0.11, 0.022], [0.001, 0.02]].map(([r, y]) => new THREE.Vector2(r, y));
  const shell = new THREE.LatheGeometry(profile, 22);
  const bowl = (at, color) => { const m = new THREE.Mesh(shell, new THREE.MeshLambertMaterial({ color, side: THREE.DoubleSide })); m.position.set(at.x, 0, at.z); g.add(m); return m; };
  const f = bowl(food, 0x6b4a33), w = bowl(water, 0xdcd8cc);
  const surface = new THREE.Mesh(new THREE.CircleGeometry(0.13, 22), new THREE.MeshLambertMaterial({ color: 0x86bccd, emissive: 0x16323c }));
  surface.rotation.x = -Math.PI / 2; surface.position.y = 0.058; w.add(surface);
  const N = 34, kibble = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.017, 0), new THREE.MeshLambertMaterial({ color: 0xa8743f }), N), m = new THREE.Matrix4();
  for (let i = 0; i < N; i++) {                      // 해바라기 씨 배열로 고르게 담는다
    const rr = 0.115 * Math.sqrt((i + 0.5) / N), th = i * 2.399;
    m.makeRotationY(i); m.setPosition(rr * Math.cos(th), 0.052 + 0.018 * (1 - rr / 0.115) + (i % 3) * 0.003, rr * Math.sin(th));
    kibble.setMatrixAt(i, m);
  }
  f.add(kibble);
  return g;
}

function createKennel(THREE, { x, z }) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  const wood = new THREE.MeshLambertMaterial({ color: 0x8a5f39, flatShading: true }), woodDark = new THREE.MeshLambertMaterial({ color: 0x5e3f25, flatShading: true });
  const tile = new THREE.MeshLambertMaterial({ color: 0x45474c, flatShading: true }), inside = new THREE.MeshBasicMaterial({ color: 0x17110c });
  const box = (w, h, d, m, px, py, pz) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); b.position.set(px, py, pz); g.add(b); return b; };
  const W = 0.92, D = 0.96, H = 0.58, T = 0.04;
  box(W + 0.08, 0.06, D + 0.08, woodDark, 0, 0.03, 0);              // 바닥
  box(T, H, D, wood, -W / 2, 0.06 + H / 2, 0); box(T, H, D, wood, W / 2, 0.06 + H / 2, 0);   // 옆벽
  box(W, H, T, wood, 0, 0.06 + H / 2, D / 2);                        // 뒷벽
  // 앞벽: 가운데 문을 두고 양옆과 위만. 안은 어둡게
  const doorW = 0.42, doorH = 0.42, side = (W - doorW) / 2;
  for (const s of [-1, 1]) box(side, H, T, wood, s * (doorW + side) / 2, 0.06 + H / 2, -D / 2);
  box(doorW, H - doorH, T, wood, 0, 0.06 + doorH + (H - doorH) / 2, -D / 2);
  box(doorW, doorH, 0.01, inside, 0, 0.06 + doorH / 2, -D / 2 + 0.03);   // 문 안쪽은 어둡게: 뚫린 입구로 보이게
  // 문틀
  for (const s of [-1, 1]) box(0.04, doorH + 0.02, 0.06, woodDark, s * (doorW / 2 + 0.02), 0.06 + doorH / 2, -D / 2);
  box(doorW + 0.08, 0.04, 0.06, woodDark, 0, 0.06 + doorH + 0.02, -D / 2);
  // 앞뒤 박공 + 기와지붕 두 쪽 + 용마루
  const peak = 0.34, span = W / 2 + 0.12, slope = Math.hypot(span, peak), ang = Math.atan2(peak, span), top = 0.06 + H;
  const gable = new THREE.Shape(); gable.moveTo(-W / 2, 0); gable.lineTo(W / 2, 0); gable.lineTo(0, peak * (W / 2) / span); gable.closePath();
  const gableGeo = new THREE.ExtrudeGeometry(gable, { depth: T, bevelEnabled: false });
  for (const zz of [-D / 2 - T / 2, D / 2 - T / 2]) { const m = new THREE.Mesh(gableGeo, wood); m.position.set(0, top, zz); g.add(m); }
  for (const s of [-1, 1]) {
    const roof = box(slope, 0.05, D + 0.28, tile, s * span / 2, top + peak / 2 + 0.03, 0);
    roof.rotation.z = -s * ang;
    for (let i = 0; i < 6; i++) {                                   // 기와 골
      const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, slope, 5), tile);
      rib.rotation.z = Math.PI / 2; rib.position.set(0, 0.03, -0.42 + i * 0.168); roof.add(rib);
    }
  }
  box(0.08, 0.07, D + 0.3, tile, 0, top + peak + 0.05, 0);          // 용마루
  g.rotation.y = 0;                                                  // 문이 마당 쪽(-z)
  return g;
}

export function createPets(THREE, kennel, baekKennel) {
  const group = new THREE.Group();
  group.userData.noShadow = true;
  const house = new THREE.Group();
  house.add(createKennel(THREE, kennel), createKennel(THREE, baekKennel), createBowls(THREE, baekKennel));

  const dog = createDog(THREE), baek = createBaekgu(THREE), cat = createCat(THREE);
  group.add(dog.root, baek.root, cat.root);

  // 서버 시계(tMs)로 지금 자리를 읽어 그리고, 개들의 상태 [바둑이, 백구]를 돌려준다 (쓰다듬기 버튼이 본다)
  function update(dt, tMs, petting) {
    const d = petAt(DOG, tMs), b = petAt(BAEK, tMs), c = petAt(CAT, tMs);
    dog.update(dt, d, petting[0]);
    baek.update(dt, b, petting[1]);
    cat.update(dt, c, false);
    return [d, b];
  }
  return { group, house, update, dog, baek, cat };
}
