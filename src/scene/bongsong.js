/* 봉송 나눔 상: 낮은 나무 상 위에 보자기로 싼 꾸러미들과 떡·과일 소쿠리. 보살님(아바타)은 main.js에서 세운다.
   makeBundle은 손에 드는 꾸러미 하나 (보살님 손 → 내 손). */
export const CLOTHS = [0xd98c8c, 0x8fb58a, 0x6f86b8, 0xe0c068, 0xb98fc4, 0xe8a070];   // 연분홍·연두·쪽빛·치자·보라·주황 보자기

export function makeBundle(THREE, color = CLOTHS[0], s = 1) {
  const mat = new THREE.MeshLambertMaterial({ color, flatShading: true });
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), mat);
  body.scale.set(0.12 * s, 0.075 * s, 0.1 * s);
  body.position.y = 0.07 * s;
  const knot = new THREE.Mesh(new THREE.SphereGeometry(0.03 * s, 6, 5), mat);
  knot.position.y = 0.15 * s;
  g.add(body, knot);
  for (const sx of [-1, 1]) {                       // 묶은 매듭 귀 두 개
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.028 * s, 0.08 * s, 5), mat);
    ear.position.set(sx * 0.04 * s, 0.18 * s, 0);
    ear.rotation.z = -sx * 0.9;
    g.add(ear);
  }
  return g;
}

export function createBongsongTable(THREE, { table }) {
  const group = new THREE.Group();
  group.position.set(table.x, 0, table.z);
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4026, flatShading: true });
  const top = new THREE.Mesh(new THREE.BoxGeometry(table.w, 0.05, table.d), wood);
  top.position.y = table.h - 0.025;
  group.add(top);
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {      // 개다리소반처럼 조금 휜 다리
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.05, table.h - 0.05, 0.05), wood);
    leg.position.set(sx * (table.w / 2 - 0.07), (table.h - 0.05) / 2, sz * (table.d / 2 - 0.06));
    leg.rotation.z = sx * 0.06;
    group.add(leg);
  }
  // 상 위: 왼쪽에 꾸러미 다섯, 오른쪽에 소쿠리 (사과·감·귤 + 떡)
  const y = table.h;
  [[-0.42, -0.08], [-0.24, 0.1], [-0.27, -0.12], [-0.08, 0.06], [-0.1, -0.13]].forEach(([x, z], i) => {
    const b = makeBundle(THREE, CLOTHS[i % CLOTHS.length], 0.9);
    b.position.set(x, y, z);
    b.rotation.y = i * 1.3;
    group.add(b);
  });
  const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.14, 0.08, 12, 1, true), new THREE.MeshLambertMaterial({ color: 0xb08a52, side: THREE.DoubleSide }));
  basket.position.set(0.3, y + 0.04, 0);
  group.add(basket);
  const fruit = (c, r, x, z, h = 0) => {
    const f = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), new THREE.MeshLambertMaterial({ color: c }));
    f.position.set(0.3 + x, y + 0.06 + r * 0.7 + h, z);
    group.add(f);
  };
  fruit(0xb3262a, 0.045, -0.07, 0.04); fruit(0xb3262a, 0.045, 0.06, 0.07);       // 사과
  fruit(0xe46a1c, 0.042, 0.07, -0.06); fruit(0xe46a1c, 0.042, -0.05, -0.07);     // 감
  fruit(0xf0a020, 0.034, 0.0, 0.0, 0.05);                                       // 귤 (위에 얹음)
  const ricecake = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.035, 0.07), new THREE.MeshLambertMaterial({ color: 0xf4efe4 }));
  ricecake.position.set(0.12, y + 0.018, 0.16);
  group.add(ricecake);

  // 누르기 쉬운 보이지 않는 자리 (보살님 몸까지 덮는 기둥)
  const hit = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.85, 1.7, 10), new THREE.MeshBasicMaterial({ visible: false }));
  hit.position.set(0, 0.85, -0.35);
  group.add(hit);
  return { group, hit, randomCloth: () => Math.floor(Math.random() * CLOTHS.length) };
}
