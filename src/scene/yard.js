/* 대웅전 앞마당: 팔각 석등 한 쌍, 삼층석탑 한 쌍, 계단 앞 배례석, 괘불대 한 쌍, 연꽃 화분, 소원 기와 단.
   석등 화창(불빛 창)은 해가 지면 따뜻하게 밝아진다 (setNight). */
export function createYard(THREE, { items, baerye }) {
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

  /* 삼층석탑 (약 2.8m, 넓은 마당에 맞게 0.7배): 이층 기단(모서리 기둥·가운데 버팀 기둥 새김) → 몸돌·지붕돌 세 층 → 상륜(노반·복발·찰주) */
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
    g.scale.setScalar(0.7);
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

  /* 괘불대: 큰 괘불(불화)을 걸 때 장대를 꽂는 돌기둥 한 쌍. 위가 둥글고 구멍이 둘 뚫렸다. 대웅전 쪽을 향해 나란히 선다. */
  function gwaebul(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    put(g, new THREE.BoxGeometry(0.9, 0.16, 0.5), graniteDark, 0.08);
    for (const sx of [-0.22, 0.22]) {
      put(g, new THREE.BoxGeometry(0.2, 1.5, 0.3), granite, 0.91, { x: sx });
      const top = put(g, new THREE.CylinderGeometry(0.15, 0.15, 0.2, 10, 1, false, 0, Math.PI), granite, 1.66, { x: sx, rz: Math.PI / 2, ry: Math.PI / 2 });
      top.rotation.set(0, Math.PI / 2, Math.PI / 2);
      for (const hy of [0.7, 1.3]) put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.21, 8), hole, hy, { x: sx, rz: Math.PI / 2 });
    }
    return g;
  }

  /* 연꽃 화분: 낮고 넓은 검은 옹기에 물, 연잎 몇 장, 분홍 연꽃 한 송이 */
  const onggi = new THREE.MeshLambertMaterial({ color: 0x3b2a22, flatShading: true });
  const water = new THREE.MeshLambertMaterial({ color: 0x2c4a4e });
  const leaf = new THREE.MeshLambertMaterial({ color: 0x4f7d3a, side: THREE.DoubleSide });
  const pink = new THREE.MeshLambertMaterial({ color: 0xf2a7b8, flatShading: true });
  function lotusPot(x, z, seed) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    const pts = [[0.2, 0], [0.33, 0.12], [0.36, 0.32], [0.33, 0.44], [0.35, 0.46]].map(([r, h]) => new THREE.Vector2(r, h));
    put(g, new THREE.LatheGeometry(pts, 14), onggi, 0);
    const surface = put(g, new THREE.CircleGeometry(0.32, 14), water, 0.42, { rx: -Math.PI / 2 });
    surface.material = water;
    for (let i = 0; i < 3; i++) {
      const a = seed * 2.1 + i * 2.2;
      const pad = put(g, new THREE.CircleGeometry(0.11, 10, 0.3, Math.PI * 1.85), leaf, 0.435, { x: Math.cos(a) * 0.15, z: Math.sin(a) * 0.15, rx: -Math.PI / 2 });
      pad.rotation.z = a;
    }
    put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.35, 4), leaf, 0.6, { x: 0.05 });
    const bud = new THREE.Group(); bud.position.set(0.05, 0.8, 0); g.add(bud);
    for (let i = 0; i < 6; i++) {
      const h = new THREE.Group(); h.rotation.y = (i / 6) * Math.PI * 2; bud.add(h);
      put(h, petal, pink, 0.04, { x: 0.04, s: [0.025, 0.07, 0.045], rz: -0.35 });
    }
    put(bud, new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshLambertMaterial({ color: 0xf1d36b }), 0.05);
    return g;
  }

  /* 소원 기와 단: 낮은 나무 단 위에 흰 글씨 쓴 검은 기와를 세워 줄줄이 기대 둔다. 볼록한 쪽(글씨)이 마당 가운데(+x)를 본다. */
  const wood = new THREE.MeshLambertMaterial({ color: 0x6b4a2f, flatShading: true });
  const tileMat = new THREE.MeshLambertMaterial({ color: 0x45474c, side: THREE.DoubleSide });
  const ink = new THREE.MeshBasicMaterial({ color: 0xf2efe6 });
  // 바라는 점 방명록: 마당(-z) 쪽으로 비스듬한 나무 서안 위에 펼친 책과 붓, 뒤에 '바라는 점' 현판
  function guestbook(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    put(g, new THREE.BoxGeometry(0.5, 0.08, 0.4), wood, 0.04);
    put(g, new THREE.BoxGeometry(0.1, 0.82, 0.1), wood, 0.45);
    const top = new THREE.Group(); top.position.y = 0.9; top.rotation.x = -0.38; g.add(top);   // 뒤(+z)가 높게
    put(top, new THREE.BoxGeometry(0.74, 0.04, 0.52), wood, 0);
    const pageTex = (() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 128;
      const x2 = c.getContext("2d");
      x2.fillStyle = "#f2ead8"; x2.fillRect(0, 0, 256, 128);
      x2.strokeStyle = "rgba(60,40,30,.55)"; x2.lineWidth = 2;
      for (const side of [0, 1]) for (let i = 0; i < 6; i++) {                 // 세로로 쓴 글 줄 (오른쪽부터)
        const lx = side * 128 + 104 - i * 17;
        x2.beginPath(); x2.moveTo(lx, 14 + (i % 2) * 6); x2.lineTo(lx, 70 + ((i * 37) % 40)); x2.stroke();
      }
      x2.fillStyle = "rgba(90,60,40,.4)"; x2.fillRect(127, 0, 2, 128);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    const pages = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.4), new THREE.MeshLambertMaterial({ map: pageTex }));
    pages.rotation.x = -Math.PI / 2; pages.rotation.z = Math.PI; pages.position.y = 0.026; top.add(pages);
    put(top, new THREE.CylinderGeometry(0.008, 0.01, 0.22, 5), new THREE.MeshLambertMaterial({ color: 0x2a1c14 }), 0.04, { x: 0.25, z: -0.05, rz: Math.PI / 2, ry: 0.4 });   // 붓
    // 현판: 두 기둥 사이 '바라는 점'
    const signTex = (() => {
      const c = document.createElement("canvas"); c.width = 256; c.height = 96;
      const x2 = c.getContext("2d");
      x2.fillStyle = "#3b2418"; x2.fillRect(0, 0, 256, 96);
      x2.strokeStyle = "#c9a24a"; x2.lineWidth = 6; x2.strokeRect(6, 6, 244, 84);
      x2.fillStyle = "#e9d9a8"; x2.font = "600 44px serif"; x2.textAlign = "center"; x2.textBaseline = "middle";
      x2.fillText("바라는 점", 128, 50);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    })();
    for (const sx of [-1, 1]) put(g, new THREE.BoxGeometry(0.06, 1.5, 0.06), wood, 0.75, { x: sx * 0.42, z: 0.3 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.29), new THREE.MeshLambertMaterial({ map: signTex, side: THREE.DoubleSide }));
    sign.rotation.y = Math.PI; sign.position.set(0, 1.36, 0.29); g.add(sign);
    return g;
  }
  function giwaStand(x, z) {
    const g = new THREE.Group(); g.position.set(x, 0, z);
    put(g, new THREE.BoxGeometry(1.2, 0.3, 1.5), wood, 0.15);
    const tileGeo = new THREE.CylinderGeometry(0.13, 0.13, 0.36, 10, 1, true, 0, Math.PI);   // 볼록한 쪽이 +x
    const stroke = new THREE.PlaneGeometry(0.012, 0.2);
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 5; i++) {
        const t = new THREE.Group();
        t.position.set(-0.4 + row * 0.36, 0.48, -0.56 + i * 0.28);
        t.rotation.z = 0.28;                                               // 뒤로 살짝 기댄다
        g.add(t);
        put(t, tileGeo, tileMat, 0);
        for (let k = 0; k < 3; k++) {                                     // 세로 글씨 세 줄
          const h = 0.12 + ((i * 7 + row * 3 + k * 5) % 5) * 0.02;
          const line = put(t, stroke, ink, 0.06 - h / 2 + 0.06, { x: 0.135, z: (k - 1) * 0.05, ry: Math.PI / 2 });
          line.scale.y = h / 0.2;
        }
      }
    }
    return g;
  }

  let n = 0;
  for (const o of items) {
    const make = { lantern: stoneLantern, pagoda, gwaebul, pot: lotusPot, giwa: giwaStand, guestbook }[o.kind];
    if (make) group.add(make(o.x, o.z, n++));
  }
  group.add(baeryeStone(baerye.x, baerye.z));

  function setNight(night) { glow.opacity = Math.min(1, night * 1.2); }
  return { group, setNight };
}
