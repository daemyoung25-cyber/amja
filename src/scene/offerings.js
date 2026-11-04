/* 불단 공양물 (대웅전과 섬 암자가 같이 씀): 향로, 과일 고임, 마지, 다기(청수), 떡, 한과, 국화 꽃병.
   모두 (x, y=불단 윗면, z)에 놓이고 parent 그룹에 붙는다. */
export function offeringKit(THREE, parent) {
  const mat = (color, o = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...o });
  const add = (o) => { parent.add(o); return o; };
  const box = (w, h, dd, m, x, y, z) => { const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, dd), m); b.position.set(x, y, z); return add(b); };
  const bronze = mat(0x7a6033), brass = mat(0xc9a24a), rice = mat(0xf4efe2);
  function plate(x, y, z, r = 0.16) {                                                // 굽다리 놋접시
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.55, 0.05, 10), brass); foot.position.set(x, y + 0.025, z); add(foot);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.8, 0.025, 14), brass); top.position.set(x, y + 0.062, z); add(top);
    return y + 0.075;
  }
  function mazi(x, y, z) {                                                            // 마지: 놋 바리에 수북한 흰 밥
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.07, 0.1, 12), brass); bowl.position.set(x, y + 0.1, z); add(bowl);
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.05, 10), brass); foot.position.set(x, y + 0.025, z); add(foot);
    const r = new THREE.Mesh(new THREE.SphereGeometry(0.095, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), rice);
    r.scale.y = 0.9; r.position.set(x, y + 0.15, z); add(r);
  }
  function dagi(x, y, z) {                                                            // 다기: 청수(맑은 물)를 담은 뚜껑 있는 놋잔
    const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.07, 0.015, 12), brass); saucer.position.set(x, y + 0.008, z); add(saucer);
    const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.075, 12), brass); cup.position.set(x, y + 0.053, z); add(cup);
    const lid = new THREE.Mesh(new THREE.SphereGeometry(0.052, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), brass); lid.scale.y = 0.5; lid.position.set(x, y + 0.09, z); add(lid);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.012, 6, 4), brass); knob.position.set(x, y + 0.118, z); add(knob);
  }
  function tteok(x, y, z, kind) {                                                     // 떡: 백설기(흰 켜) / 시루떡(팥고물 켜)
    let yy = plate(x, y, z, 0.17);
    const white = mat(0xf6f2e8), red = mat(0x7b3a2c);
    const n = kind === "baek" ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const w = 0.2 - i * 0.012, h = kind === "baek" ? 0.05 : (i % 2 ? 0.045 : 0.018);
      const m = kind === "baek" ? white : (i % 2 ? white : red);
      box(w, h, w, m, x, yy + h / 2, z).rotation.y = i * 0.12;
      yy += h;
    }
  }
  function hangwa(x, y, z, kind) {                                                    // 한과: 약과(꽃 모양 갈색) / 유과(흰 강정)와 다식(오색)
    let yy = plate(x, y, z, 0.16);
    if (kind === "yakgwa") {
      const m = mat(0x8a4a1c), flower = new THREE.CylinderGeometry(0.045, 0.045, 0.022, 8);
      for (const [k, gap] of [[3, 0.085], [2, 0.08], [1, 0]]) {
        for (let i = 0; i < k * k; i++) {
          const f = new THREE.Mesh(flower, m);
          f.position.set(x + ((i % k) - (k - 1) / 2) * gap, yy + 0.011, z + (Math.floor(i / k) - (k - 1) / 2) * gap); add(f);
        }
        yy += 0.024;
      }
    } else {
      const m = mat(0xf2ebdc), puff = new THREE.CapsuleGeometry(0.022, 0.06, 3, 6);
      for (let i = 0; i < 9; i++) {
        const c = new THREE.Mesh(puff, m); c.rotation.z = Math.PI / 2; c.rotation.y = (i % 3) * 0.5;
        c.position.set(x + ((i % 3) - 1) * 0.07, yy + 0.022 + Math.floor(i / 3) * 0.035, z + (Math.floor(i / 3) - 1) * 0.04); add(c);
      }
      const cols = [0xe8c64a, 0x7fa65a, 0xd9849a, 0x6b4a32, 0xf2ebdc];             // 송화·쑥·오미자·흑임자·쌀 다식
      cols.forEach((c, i) => { const d = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.02, 10), mat(c)); d.position.set(x - 0.1 + i * 0.05, yy + 0.13, z + 0.02); add(d); });
    }
  }
  function vase(x, y, z) {                                                            // 꽃병: 가을 국화 한 아름
    const v = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 12), brass); v.position.set(x, y + 0.15, z); add(v);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.05, 0.06, 12), brass); neck.position.set(x, y + 0.33, z); add(neck);
    const stem = mat(0x4f6b34), bloom = [mat(0xe9c23a), mat(0xf4efe0), mat(0xd9893a)];
    for (let i = 0; i < 9; i++) {
      const a = i * 2.39, r = 0.04 + (i % 3) * 0.04, h = 0.5 + (i % 4) * 0.06;
      const bx = x + Math.cos(a) * r, bz = z + Math.sin(a) * r;
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, h - 0.3, 3), stem);
      s.position.set((x + bx) / 2, y + 0.3 + (h - 0.3) / 2, (z + bz) / 2); add(s);
      const b = new THREE.Mesh(new THREE.IcosahedronGeometry(0.045, 0), bloom[i % 3]); b.position.set(bx, y + h, bz); add(b);
    }
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
  function censer(x, y, z, { sticks = true } = {}) {      // sticks: false면 꽂힌 향 없이 (사람들이 올린 향은 offerBanks.js)
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.09, 0.14, 10), bronze); c.position.set(x, y + 0.07, z); add(c);
    for (let i = 0; sticks && i < 3; i++) {
      const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.22, 3), mat(0x7a2b20));
      stick.position.set(x - 0.04 + i * 0.04, y + 0.25, z); add(stick);
    }
  }

  return { censer, fruitStack, mazi, dagi, tteok, hangwa, vase, plate };
}
