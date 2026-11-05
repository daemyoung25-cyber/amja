/* 강아지집, 바둑이, 하얀 고양이의 그림. 움직임은 logic/pets.js.
   동물은 움직이는 그림자 대신 발밑 둥근 그림자를 쓰고, 누르기·카메라 충돌에 걸리지 않는다. 강아지집은 마당 물건처럼 그림자를 드리운다. */
import { DOG, CAT, petAt } from "../logic/pets.js";

const lerp = (a, b, k) => a + (b - a) * k;
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

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

/* 네 발 짐승 하나: 머리는 -z. opts로 강아지와 고양이가 갈린다 */
function createBeast(THREE, o) {
  const m = (c, extra = {}) => new THREE.MeshLambertMaterial({ color: c, ...extra });
  const coat = m(o.coat), spot = m(o.spot), nose = m(o.nose), eye = new THREE.MeshBasicMaterial({ color: o.eye });
  const root = new THREE.Group(), body = new THREE.Group();
  root.add(body);
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => { const a = new THREE.Mesh(geo, mat); a.position.set(x, y, z); parent.add(a); return a; };
  const ball = (r, sx = 1, sy = 1, sz = 1) => { const g = new THREE.SphereGeometry(r, 12, 9); g.scale(sx, sy, sz); return g; };
  const { len, wide, tall, legLen, headR } = o;

  mesh(ball(1, wide, tall, len), coat, body);
  for (const [px, py, pz, r] of o.spots || []) mesh(ball(r, 0.75, 0.95, 1.05), spot, body, px, py, pz);   // 바둑 무늬

  const head = new THREE.Group(); head.position.set(0, tall * 0.85, -len * 0.92); body.add(head);
  mesh(ball(headR, 1, 0.96, 0.98), coat, head);
  mesh(ball(headR * 0.52, 0.95, 0.72, 1), o.muzzle ? m(o.muzzle) : coat, head, 0, -headR * 0.28, -headR * 0.72);
  mesh(ball(headR * 0.15), nose, head, 0, -headR * 0.13, -headR * 1.2);
  for (const s of [-1, 1]) mesh(ball(headR * 0.125), eye, head, s * headR * 0.5, headR * 0.2, -headR * 0.82);
  if (o.eyePatch) mesh(ball(headR * 0.42, 0.95, 1, 0.55), spot, head, headR * 0.52, headR * 0.2, -headR * 0.64);
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group(); pivot.position.set(s * headR * 0.66, headR * 0.72, 0); head.add(pivot);
    if (o.cat) { const c = new THREE.ConeGeometry(headR * 0.36, headR * 0.72, 4); c.translate(0, headR * 0.3, 0); mesh(c, coat, pivot); const pink = new THREE.ConeGeometry(headR * 0.2, headR * 0.44, 4); pink.translate(0, headR * 0.2, -headR * 0.1); mesh(pink, nose, pivot); pivot.rotation.z = -s * 0.25; }
    else { mesh(ball(headR * 0.42, 0.62, 1.2, 0.34), s > 0 ? spot : spot, pivot, s * headR * 0.1, -headR * 0.42, 0); pivot.rotation.z = s * 0.22; }
    return pivot;
  });

  const tail = new THREE.Group(); tail.position.set(0, tall * 0.5, len * 0.92); body.add(tail);
  const tailGeo = new THREE.CapsuleGeometry(o.tailR, o.tailLen, 3, 7); tailGeo.translate(0, o.tailLen / 2 + o.tailR, 0);
  mesh(tailGeo, o.tailSpot ? spot : coat, tail);

  const legGeo = new THREE.CapsuleGeometry(o.legR, legLen - o.legR * 2, 2, 6); legGeo.translate(0, -legLen / 2, 0);
  const legs = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([s, f]) => {
    const pivot = new THREE.Group(); pivot.position.set(s * wide * 0.62, -tall * 0.5, f * len * 0.68); body.add(pivot);
    mesh(legGeo, f < 0 && o.spots && s > 0 ? spot : coat, pivot);
    return { pivot, s, front: f < 0 };
  });

  const blob = new THREE.CircleGeometry(1, 14); blob.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(blob, new THREE.MeshBasicMaterial({ color: 0x1c1712, transparent: true, opacity: 0.26, depthWrite: false }));
  shadow.scale.set(wide * 1.6, 1, len * 1.25); shadow.position.y = 0.018; root.add(shadow);

  const standY = legLen + tall * 0.42;
  const POSES = {   // 몸 높이, 앞뒤 기울기(+ = 머리 위로), 앞다리, 뒷다리, 머리 숙임
    walk: { y: standY, pitch: 0, front: 0, rear: 0, head: 0 },
    sit: { y: standY - legLen * 0.32, pitch: 0.62, front: -0.55, rear: 0.9, head: -0.45 },
    lie: { y: tall * 0.86, pitch: 0, front: -1.42, rear: 1.42, head: 0.28 },
    curl: { y: tall * 0.72, pitch: 0, front: -1.5, rear: 1.5, head: 0.68 },
  };
  const now = { ...POSES.sit };
  let t = Math.random() * 10, yaw = null;

  // s = logic/pets.js 상태. wagFast = 쓰다듬는 중
  function update(dt, s, wagFast) {
    t += dt;
    const k = 1 - Math.exp(-dt * 5);
    const p = POSES[s.pose] || POSES.sit, sleeping = s.state === "sleep";
    for (const key of Object.keys(now)) now[key] = lerp(now[key], p[key], k);
    root.position.set(s.x, 0, s.z);
    yaw = yaw === null ? s.yaw : turn(yaw, s.yaw, 1 - Math.exp(-dt * 7));
    root.rotation.y = yaw;
    const walking = s.state === "walk", stride = walking ? Math.sin(t * o.stride) : 0;
    const breathe = Math.sin(t * (sleeping ? 1.3 : 2.1)) * (sleeping ? 0.009 : 0.004);
    body.position.y = now.y + breathe + (walking ? Math.abs(stride) * o.bounce : 0);
    body.rotation.x = now.pitch;
    for (const l of legs) {
      const base = l.front ? now.front : now.rear;
      l.pivot.rotation.x = base + (walking ? stride * o.swing * (l.front === (l.s > 0) ? 1 : -1) : 0) - now.pitch * 0.9;
    }
    const lifted = wagFast && (sleeping || s.pose === "lie" || s.pose === "curl") ? -0.3 : 0;
    head.rotation.x = -now.pitch + now.head + lifted + (sleeping && !wagFast ? 0.04 : 0);
    head.rotation.y = !walking && !sleeping ? Math.sin(t * 0.37) * 0.28 : 0;
    o.moveTail(tail, { t, walking, sleeping, wagFast, pose: s.pose, pitch: now.pitch });
    for (const [i, e] of ears.entries()) e.rotation.x = wagFast ? 0.25 * (i ? 1 : 1) : 0;
    root.scale.setScalar(o.scale);
  }
  return { root, update, head, body };
}

export function createPets(THREE, kennel) {
  const group = new THREE.Group();
  group.userData.noShadow = true;
  const house = createKennel(THREE, kennel);

  const dog = createBeast(THREE, {
    coat: 0xf3efe6, spot: 0x1d1a18, nose: 0x1a1412, eye: 0x120e0b, muzzle: 0xfbf8f1, eyePatch: true,
    len: 0.2, wide: 0.105, tall: 0.1, legLen: 0.16, headR: 0.1, legR: 0.03, tailR: 0.018, tailLen: 0.13, tailSpot: true,
    spots: [[0.07, 0.05, -0.03, 0.06], [-0.075, 0.03, 0.09, 0.05], [0.02, 0.085, 0.11, 0.04]],
    stride: 13, swing: 0.62, bounce: 0.012, scale: 1.05,
    moveTail(tail, { t, walking, sleeping, wagFast, pose }) {
      tail.rotation.x = sleeping ? 1.25 : pose === "sit" ? 1.0 : pose === "lie" ? 0.9 : -0.55;   // 걸을 땐 치켜들고, 쉴 땐 바닥에 내려서 살랑
      tail.rotation.z =sleeping && !wagFast ? 0 : Math.sin(t * (wagFast ? 24 : walking ? 12 : 5)) * (wagFast ? 0.75 : walking ? 0.3 : 0.2);
    },
  });
  const cat = createBeast(THREE, {
    coat: 0xfaf8f4, spot: 0xfaf8f4, nose: 0xe9a4a8, eye: 0x4f8fb0, cat: true,
    len: 0.17, wide: 0.075, tall: 0.078, legLen: 0.14, headR: 0.078, legR: 0.021, tailR: 0.014, tailLen: 0.25,
    stride: 7.5, swing: 0.42, bounce: 0.004, scale: 1.05,
    moveTail(tail, { t, walking, pose }) {
      const curled = pose === "curl";
      tail.position.x = curled ? 0.078 : 0;                 // 웅크리면 옆구리에 붙여 앞으로 감는다
      tail.position.y = curled ? -0.045 : 0.039;
      tail.rotation.x = curled ? -1.5 : walking ? -0.28 : 1.1;
      tail.rotation.z = curled ? 0 : Math.sin(t * 1.15) * 0.3;
    },
  });
  group.add(dog.root, cat.root);

  // 서버 시계(tMs)로 지금 자리를 읽어 그리고, 바둑이 상태를 돌려준다 (쓰다듬기 버튼이 본다)
  function update(dt, tMs, petting) {
    const d = petAt(DOG, tMs), c = petAt(CAT, tMs);
    dog.update(dt, d, petting);
    cat.update(dt, c, false);
    return d;
  }
  return { group, house, update, dog, cat };
}
