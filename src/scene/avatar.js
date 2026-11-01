/* 사람 캐릭터: 절에 온 보살님 차림 — 회색·밤색 법복(개량 한복)에 흰 동정, 밤색 가사를 왼어깨에 두르고
   염주를 건다. 얼굴은 부처님처럼 눈을 지그시 감고 인자하게 미소 짓는다. (동자승 아님, 머리카락 있음)
   모델 정면은 -z이고, root.rotation.y = yaw (walk.js와 같은 규칙). */
export const AVATAR_COLORS = [0xc9c6bf, 0xb8b5ae, 0xd3cfc5, 0xaeaba4, 0xc2bdb2, 0xbcb9b3];   // 법복 회색 (보안 규칙상 6가지)

/* 법복 무늬: 흰 동정(V자)과 왼어깨에서 오른 옆구리로 두른 밤색 가사를 옷 표면에 그린다.
   캡슐 UV는 u=0이 등(+z), 0.25가 오른쪽(+x), 0.5가 앞(-z), 0.75가 왼쪽(-x). v=1이 위. 색은 재질 색과 곱해진다. */
let robeTex = null;
function robeTexture(THREE) {
  if (robeTex) return robeTex;
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const P = (u, v) => [u * S, (1 - v) * S];
  const poly = (pts, color) => { g.fillStyle = color; g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(...P(u, v)) : g.moveTo(...P(u, v)))); g.closePath(); g.fill(); };
  g.fillStyle = "#e9e9e9"; g.fillRect(0, 0, S, S);
  const KASAYA = "#8a5a3c", EDGE = "#6b412a";
  // 가사 앞자락: 왼어깨 앞(u≈.7)에서 오른 옆구리(u≈.34)로
  poly([[0.66, 1], [0.76, 1], [0.4, 0.3], [0.3, 0.3]], KASAYA);
  // 어깨 너머 등자락: 왼어깨(u≈.76)에서 등을 지나 오른 옆구리 뒤로
  poly([[0.76, 1], [0.86, 1], [1.0, 0.62], [1.0, 0.48]], KASAYA);
  poly([[0.0, 0.62], [0.0, 0.48], [0.12, 0.3], [0.2, 0.3]], KASAYA);
  g.strokeStyle = EDGE; g.lineWidth = 3;
  for (const [a, b] of [[[0.66, 1], [0.3, 0.3]], [[0.76, 1], [0.4, 0.3]]]) { g.beginPath(); g.moveTo(...P(...a)); g.lineTo(...P(...b)); g.stroke(); }
  // 흰 동정: 앞 가운데로 모이는 V
  g.lineCap = "round";
  for (const [w, col] of [[9, "#9a9a9a"], [6, "#ffffff"]]) {
    g.strokeStyle = col; g.lineWidth = w; g.beginPath();
    g.moveTo(...P(0.43, 0.94)); g.lineTo(...P(0.5, 0.8)); g.lineTo(...P(0.57, 0.94)); g.stroke();
  }
  robeTex = new THREE.CanvasTexture(c);
  robeTex.colorSpace = THREE.SRGBColorSpace;
  return robeTex;
}
const POSE_LEN = { hapjang: 2.5, bow: 11.2 };

/* 큰절(오체투지): 합장 → 반배 → 무릎 꿇기 → 두 손 바닥에 → 이마 닿기 → 손바닥 위로 귀까지(접족례)
   → 거꾸로 일어나기 → 합장 반배. 키프레임 [초, 무릎(0~1), 몸 낮춤(m), 상체 숙임(rad), 손 자리] */
const BOW_KEYS = [
  [0.0, 0, 0, 0, "hapjang"], [0.8, 0, 0, -0.05, "hapjang"], [1.6, 0, 0, -0.5, "hapjang"], [2.4, 0, 0, -0.05, "hapjang"],
  [3.4, 1, 0.38, -0.1, "knees"], [4.2, 1, 0.38, -0.95, "floor"], [5.0, 1, 0.46, -1.4, "prone"], [5.6, 1, 0.46, -1.4, "prone"],
  [6.3, 1, 0.46, -1.4, "lift"], [7.0, 1, 0.46, -1.4, "prone"], [7.8, 1, 0.38, -0.95, "floor"], [8.6, 1, 0.38, -0.1, "knees"],
  [9.6, 0, 0, -0.05, "hapjang"], [10.4, 0, 0, -0.5, "hapjang"], [11.2, 0, 0, 0, "hapjang"],
];
function bowAt(sec) {
  let i = 0;
  while (i < BOW_KEYS.length - 2 && BOW_KEYS[i + 1][0] <= sec) i++;
  const a = BOW_KEYS[i], b = BOW_KEYS[i + 1];
  const f = Math.min(1, Math.max(0, (sec - a[0]) / (b[0] - a[0]))), e = f * f * (3 - 2 * f);
  const mix = (x, y) => x + (y - x) * e;
  return { kneel: mix(a[1], b[1]), drop: mix(a[2], b[2]), tilt: mix(a[3], b[3]), from: a[4], to: b[4], e };
}

export function createAvatar(THREE, { color }) {
  const m = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true });
  const robeMat = m(color), skirtMat = m(color), skinMat = m(0xf0d6bd), hairMat = m(0x2a2522);
  robeMat.map = robeTexture(THREE);
  const beadMat = m(0x3b2418), faceMat = m(0x5a3a2c), lipMat = m(0xc0766a);
  const materials = [robeMat, skirtMat, skinMat, hairMat, beadMat, faceMat, lipMat];

  const root = new THREE.Group();
  const body = new THREE.Group();            // 발을 축으로 숙인다
  root.add(body);

  const robe = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.42, 4, 10), robeMat);
  robe.position.y = 0.5;
  robe.scale.set(1, 1, 0.9);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.3, 10), skirtMat);
  skirt.position.y = 0.17;
  const upper = new THREE.Group();           // 허리 위: 숙이기, 합장
  upper.position.y = 0.6;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
  head.position.y = 0.42;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.212, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 0.43;
  hair.rotation.x = 0.42;                    // 뒤통수를 덮고 이마는 드러낸다
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skinMat);
  const handR = handL.clone();
  upper.add(head, hair, handL, handR);
  body.add(robe, skirt, upper);

  // 얼굴: 웃는 눈(∩ 두 개), 부드러운 눈썹, 살짝 올라간 입꼬리(∪). 머리 앞(-z) 표면에 붙인다.
  const arc = (r, tube, m, x, y, flip, tilt = 0) => {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 10, Math.PI), m);
    a.position.set(x, y, -0.188);
    a.rotation.set(-0.12, 0, (flip ? Math.PI : 0) + tilt);
    upper.add(a);
    return a;
  };
  for (const sx of [-1, 1]) {
    arc(0.028, 0.007, faceMat, sx * 0.07, 0.418, false);                   // 지그시 감은 웃는 눈
    arc(0.04, 0.005, hairMat, sx * 0.072, 0.462, false, sx * -0.1).position.z = -0.183;   // 눈썹
  }
  arc(0.034, 0.007, lipMat, 0, 0.368, true).position.z = -0.192;           // 미소
  const blush = new THREE.MeshBasicMaterial({ color: 0xf2a99a, transparent: true, opacity: 0.35, depthWrite: false });
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), blush);
    b.position.set(sx * 0.105, 0.39, -0.168);
    b.rotation.y = -sx * 0.55;
    upper.add(b);
  }

  // 동정과 가사는 법복 무늬(robeTexture)로 옷에 그려져 있다. 목에는 염주.
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 5, 4), beadMat, 18);
  const bm = new THREE.Matrix4();
  for (let i = 0; i < 18; i++) {                  // 목에서 가슴으로 늘어진 둥근 줄
    const a = (i / 18) * Math.PI * 2;
    bm.makeTranslation(Math.sin(a) * 0.15, 0.88 - (1 - Math.cos(a)) * 0.09, -Math.cos(a) * 0.12 - 0.05);
    beads.setMatrixAt(i, bm);
  }
  body.add(beads);

  // 바닥 그림자 (조명 그림자 대신 가벼운 원)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  let pose = "stand", poseT = 0, t = Math.random() * 10;
  let seated = false, sitK = 0, kneelK = 0;                // 방석에 앉으면 몸을 낮추고 다리를 넓게
  const hands = {
    stand: [[-0.24, 0.05, -0.02], [0.24, 0.05, -0.02]],
    hapjang: [[-0.03, 0.22, -0.24], [0.03, 0.22, -0.24]],
    lean: [[-0.22, 0.38, -0.36], [0.22, 0.38, -0.36]],
    sit: [[-0.09, -0.04, -0.24], [0.09, -0.04, -0.24]],     // 무릎 위에 포갠 손
    knees: [[-0.2, -0.05, -0.12], [0.2, -0.05, -0.12]],      // 꿇어앉아 손은 허벅지 옆
    floor: [[-0.2, -0.18, -0.42], [0.2, -0.18, -0.42]],      // 두 손을 앞바닥에
    prone: [[-0.22, 0.34, -0.22], [0.22, 0.34, -0.22]],      // 이마 옆 바닥에 손바닥
    lift: [[-0.2, 0.4, -0.06], [0.2, 0.4, -0.06]],           // 손바닥을 위로 귀까지
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  function setPose(p) { if (p !== pose) { pose = p; poseT = 0; } }
  function setSeated(on) { seated = on; }

  // 앉으면 보이는 포갠 다리: 넓적한 무릎과 정강이 (서 있을 땐 0으로 줄여 숨긴다)
  const legs = new THREE.Group();
  const lap = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), skirtMat);
  lap.scale.set(0.34, 0.1, 0.24); lap.position.set(0, 0.09, -0.08);
  legs.add(lap);
  for (const sx of [-1, 1]) {
    const knee = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), skirtMat);
    knee.scale.set(1.15, 0.75, 1); knee.position.set(sx * 0.27, 0.09, -0.15);
    legs.add(knee);
  }
  legs.scale.setScalar(0.001);
  root.add(legs);

  function update(dt) {
    t += dt; poseT += dt;
    const k = 1 - Math.exp(-dt * 6);
    let tilt = 0, upperTilt = 0, bob = 0, target = hands.stand, swing = 0;
    if (pose === "walk") { bob = Math.abs(Math.sin(t * 8)) * 0.04; swing = Math.sin(t * 8) * 0.12; }
    else if (pose === "stand") { bob = Math.sin(t * 1.6) * 0.008; }
    else if (pose === "sit") { target = hands.sit; upperTilt = -0.06; bob = Math.sin(t * 1.1) * 0.006; }
    else if (pose === "lean") { tilt = -0.12; upperTilt = -0.28; target = hands.lean; bob = Math.sin(t * 1.2) * 0.006; }
    else if (pose === "hapjang") { target = hands.hapjang; upperTilt = poseT > 0.8 && poseT < 1.8 ? -0.35 : -0.05; }
    let kneel = 0, drop = 0;
    if (pose === "bow") {
      const b = bowAt(poseT);
      upperTilt = b.tilt; kneel = b.kneel; drop = b.drop;
      const A = hands[b.from], B = hands[b.to];
      target = A.map((h, j) => h.map((v, n) => v + (B[j][n] - v) * b.e));
    }
    body.rotation.x = lerp(body.rotation.x, tilt, k);
    upper.rotation.x = lerp(upper.rotation.x, upperTilt, k);
    sitK = lerp(sitK, seated ? 1 : 0, k);
    kneelK = lerp(kneelK, Math.max(kneel, seated ? 1 : 0), k * 1.5);
    // 앉은 자세: 몸통을 다리 위로 내리고(머리 높이 약 2/3), 치마 대신 포갠 다리가 드러난다
    // 절할 때: 무릎 꿇고(다리를 몸 밑으로 모아) 몸을 더 낮춘다
    body.position.y = bob - Math.max(0.4 * sitK, lerp(0, drop, Math.min(1, kneelK * 1.2)));
    skirt.scale.setScalar(Math.max(0.001, 1 - kneelK));
    legs.scale.setScalar(Math.max(0.001, kneelK));
    legs.scale.x = Math.max(0.001, kneelK * (0.7 + 0.3 * sitK));          // 꿇을 땐 좁게, 앉을 땐 넓게
    legs.position.z = 0.12 * (1 - sitK) * kneelK;
    shadow.scale.setScalar(1 + 0.35 * sitK);
    handL.position.set(lerp(handL.position.x, target[0][0], k), lerp(handL.position.y, target[0][1], k), lerp(handL.position.z, target[0][2] + swing, k));
    handR.position.set(lerp(handR.position.x, target[1][0], k), lerp(handR.position.y, target[1][1], k), lerp(handR.position.z, target[1][2] - swing, k));
  }

  function setOpacity(o) {
    for (const mat of materials) mat.opacity = o;
    blush.opacity = 0.35 * o;
    shadow.material.opacity = 0.22 * o;
  }

  update(0);
  return { root, setPose, setSeated, update, setOpacity, get pose() { return pose; } };
}

export const POSE_SECONDS = POSE_LEN;
