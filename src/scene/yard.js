/* 대웅전 앞마당 돌: 팔각 석등 한 쌍, 삼층석탑 한 쌍, 계단 앞 배례석. 모두 오래된 화강암 빛.
   석등 화창(불빛 창)은 해가 지면 따뜻하게 밝아진다 (setNight). */
export function createYard(THREE, { lanterns, pagodas, baerye }) {
  const group = new THREE.Group();
  const granite = new THREE.MeshLambertMaterial({ color: 0xa8a194, flatShading: true });
  const graniteDark = new THREE.MeshLambertMaterial({ color: 0x8d877b, flatShading: true });
  const hole = new THREE.MeshLambertMaterial({ color: 0x2a241d, flatShading: true });
  const glow = new THREE.MeshBasicMaterial({ color: 0xffc77a, transparent: true, opacity: 0 });
  const oct = (rTop, rBot, h) => new THREE.CylinderGeometry(rTop, rBot, h, 8);
  const put = (parent, geo, m, y, opt = {}) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(opt.x || 0, y, opt.z || 0);
    if (opt.ry) o.rotation.y = opt.ry;
    if (opt.rx) o.rotation.x = opt.rx;
    if (opt.rz) o.rotation.z = opt.rz;
    if (opt.s) o.scale.set(...opt.s);
    parent.add(o);
    return o;
  };
  // 연잎 한 장 (납작한 물방울): 바깥으로 기울여 둥글게 돌린다
  const petal = new THREE.SphereGeometry(1, 8, 6);
  const petalRing = (parent, n, r, y, size, up) => {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const h = new THREE.Group(); h.rotation.y = a; parent.add(h);
      put(h, petal, granite, y, { x: r, s: [size * 0.35, size * 0.6, size], rz: up ? -0.5 : 0.5 });
    }
  };

  /* 팔각 석등 (약 2.6m): 지대석 → 하대석(엎은 연꽃) → 간주석 → 상대석(핀 연꽃) → 화사석(네 화창) → 옥개석 → 보주 */
  function stoneLantern(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    put(g, new THREE.BoxGeometry(1.1, 0.2, 1.1), graniteDark, 0.1);
    put(g, oct(0.42, 0.5, 0.22), granite, 0.31);
    petalRing(g, 8, 0.4, 0.42, 0.16, false);
    put(g, oct(0.13, 0.15, 0.95), granite, 0.95);                       // 간주석
    put(g, oct(0.44, 0.34, 0.16), granite, 1.5);                        // 상대석
    petalRing(g, 8, 0.36, 1.5, 0.15, true);
    const fire = put(g, oct(0.29, 0.29, 0.5), granite, 1.83);           // 화사석
    fire.rotation.y = Math.PI / 8;
    for (let i = 0; i < 4; i++) {                                       // 화창 넷: 어두운 구멍 + 밤에 켜지는 불빛
      const a = (i / 4) * Math.PI * 2;
      const w = new THREE.Group(); w.rotation.y = a; g.add(w);
      put(w, new THREE.BoxGeometry(0.16, 0.26, 0.04), hole, 1.84, { z: 0.27 });
      put(w, new THREE.PlaneGeometry(0.13, 0.22), glow, 1.84, { z: 0.292 });
    }
    put(g, oct(0.14, 0.62, 0.26), granite, 2.21);                       // 옥개석 (지붕)
    put(g, oct(0.6, 0.62, 0.06), graniteDark, 2.08);                    // 처마 끝
    put(g, oct(0.09, 0.12, 0.12), granite, 2.4);                        // 보개
    put(g, new THREE.SphereGeometry(0.1, 10, 8), granite, 2.55);        // 보주
    put(g, new THREE.ConeGeometry(0.05, 0.12, 8), granite, 2.68);
    return g;
  }

  /* 삼층석탑 (약 4m): 이층 기단(모서리 기둥·가운데 버팀 기둥 새김) → 몸돌·지붕돌 세 층 → 상륜(노반·복발·찰주) */
  function pagoda(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pillars = (w, h, y) => {                                      // 우주(모서리)와 탱주(가운데) 돋을새김
      for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) put(g, new THREE.BoxGeometry(0.08, h, 0.08), graniteDark, y, { x: px * (w / 2 - 0.03), z: pz * (w / 2 - 0.03) });
      for (const s of [-1, 1]) {
        put(g, new THREE.BoxGeometry(0.07, h, 0.02), graniteDark, y, { z: s * (w / 2 + 0.005) });
        put(g, new THREE.BoxGeometry(0.02, h, 0.07), graniteDark, y, { x: s * (w / 2 + 0.005) });
      }
    };
    put(g, new THREE.BoxGeometry(2.4, 0.25, 2.4), graniteDark, 0.125);   // 지대석
    put(g, new THREE.BoxGeometry(2.1, 0.55, 2.1), granite, 0.525); pillars(2.1, 0.55, 0.525);
    put(g, new THREE.BoxGeometry(2.25, 0.12, 2.25), granite, 0.86);      // 아래 기단 갑석
    put(g, new THREE.BoxGeometry(1.6, 0.62, 1.6), granite, 1.23); pillars(1.6, 0.62, 1.23);
    put(g, new THREE.BoxGeometry(1.75, 0.12, 1.75), granite, 1.6);       // 위 기단 갑석
    let y = 1.66;
    for (const [bw, bh, rw] of [[0.95, 0.62, 1.7], [0.8, 0.36, 1.5], [0.66, 0.32, 1.3]]) {
      put(g, new THREE.BoxGeometry(bw, bh, bw), granite, y + bh / 2);     // 몸돌
      for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) put(g, new THREE.BoxGeometry(0.06, bh, 0.06), graniteDark, y + bh / 2, { x: px * (bw / 2 - 0.02), z: pz * (bw / 2 - 0.02) });
      y += bh;
      // 지붕돌: 아래 층단받침 넷, 위로 완만한 낙수면, 네 귀가 살짝 들린다
      for (let k = 0; k < 4; k++) put(g, new THREE.BoxGeometry(bw + 0.08 + k * 0.1, 0.05, bw + 0.08 + k * 0.1), graniteDark, y + 0.025 + k * 0.05);
      const roof = put(g, new THREE.CylinderGeometry(rw * 0.28, rw * 0.72, 0.24, 4), granite, y + 0.32, { ry: Math.PI / 4 });
      roof.scale.set(1, 1, 1);
      for (const [px, pz] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) put(g, new THREE.BoxGeometry(0.1, 0.06, 0.1), granite, y + 0.24, { x: px * rw * 0.47, z: pz * rw * 0.47, rx: pz * 0.3, rz: -px * 0.3 });
      y += 0.44;
    }
    put(g, new THREE.BoxGeometry(0.42, 0.18, 0.42), granite, y + 0.09);  // 노반
    put(g, new THREE.SphereGeometry(0.2, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), granite, y + 0.18);   // 복발
    put(g, new THREE.CylinderGeometry(0.025, 0.025, 0.7, 6), graniteDark, y + 0.55);   // 찰주
    for (let k = 0; k < 3; k++) put(g, new THREE.TorusGeometry(0.11 - k * 0.02, 0.022, 4, 10), graniteDark, y + 0.42 + k * 0.13, { rx: Math.PI / 2 });
    put(g, new THREE.SphereGeometry(0.06, 8, 6), granite, y + 0.92);     // 보주
    return g;
  }

  /* 배례석: 계단 앞 납작한 돌, 위에 연꽃 새김 */
  function baeryeStone(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    put(g, new THREE.BoxGeometry(1.3, 0.1, 0.75), granite, 0.05);
    const lotus = new THREE.Mesh(new THREE.CircleGeometry(0.22, 16), graniteDark);
    lotus.rotation.x = -Math.PI / 2; lotus.position.y = 0.102; g.add(lotus);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const p = new THREE.Mesh(new THREE.CircleGeometry(0.1, 8), graniteDark);
      p.rotation.x = -Math.PI / 2; p.position.set(Math.cos(a) * 0.27, 0.101, Math.sin(a) * 0.27); p.scale.set(1, 0.55, 1);
      p.rotation.z = a; g.add(p);
    }
    return g;
  }

  for (const o of lanterns) group.add(stoneLantern(o.x, o.z));
  for (const o of pagodas) group.add(pagoda(o.x, o.z));
  group.add(baeryeStone(baerye.x, baerye.z));

  function setNight(night) { glow.opacity = Math.min(1, night * 1.2); }
  return { group, setNight };
}
