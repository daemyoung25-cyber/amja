/* 사람 캐릭터: 절에 온 보살님 차림 — 회색·밤색 법복(개량 한복)에 흰 동정, 밤색 가사를 왼어깨에 두르고
   염주를 건다. 얼굴은 부처님처럼 눈을 지그시 감고 인자하게 미소 짓는다. (동자승 아님, 머리카락 있음)
   모델 정면은 -z이고, root.rotation.y = yaw (walk.js와 같은 규칙). */
export const AVATAR_COLORS = [0x8c8a84, 0x6f6d68, 0x8a7560, 0x9d9483, 0x5e5a55, 0x7a6655];   // 법복 색 (보안 규칙상 6가지)
const POSE_LEN = { hapjang: 2.5, bow: 4 };

export function createAvatar(THREE, { color }) {
  const m = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true });
  const robeMat = m(color), skinMat = m(0xf0d6bd), hairMat = m(0x2a2522);
  const collarMat = m(0xf4f0e6), kasayaMat = m(0x7b4a2e), beadMat = m(0x3b2418), faceMat = m(0x5a3a2c), lipMat = m(0xc0766a);
  const materials = [robeMat, skinMat, hairMat, collarMat, kasayaMat, beadMat, faceMat, lipMat];

  const root = new THREE.Group();
  const body = new THREE.Group();            // 발을 축으로 숙인다
  root.add(body);

  const robe = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 0.42, 4, 10), robeMat);
  robe.position.y = 0.5;
  robe.scale.set(1, 1, 0.9);
  const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.3, 10), robeMat);
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

  // 옷: 흰 동정(V자 깃), 밤색 가사(왼어깨에서 오른 옆구리로), 목에 건 염주
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.2, 0.02), collarMat);
    c.position.set(sx * 0.05, 0.84, -0.232); c.rotation.set(-0.35, 0, -sx * 0.55);   // V자로 모인다
    body.add(c);
  }
  const kasaya = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.64, 0.025), kasayaMat);
  kasaya.position.set(0.0, 0.62, -0.25); kasaya.rotation.set(-0.12, 0, 0.6);
  const kasayaBack = kasaya.clone(); kasayaBack.position.z = 0.25; kasayaBack.rotation.set(0.12, 0, 0.6);
  const strap = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.025, 0.47), kasayaMat);   // 왼어깨 위로 넘어가는 끈
  strap.position.set(-0.15, 0.935, 0); strap.rotation.z = 0.62;
  body.add(kasaya, kasayaBack, strap);
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
  let seated = false, sitK = 0;                // 방석에 앉으면 몸을 낮추고 다리를 넓게
  const hands = {
    stand: [[-0.24, 0.05, -0.02], [0.24, 0.05, -0.02]],
    hapjang: [[-0.03, 0.22, -0.24], [0.03, 0.22, -0.24]],
    lean: [[-0.22, 0.38, -0.36], [0.22, 0.38, -0.36]],
    sit: [[-0.07, -0.02, -0.2], [0.07, -0.02, -0.2]],
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  function setPose(p) { if (p !== pose) { pose = p; poseT = 0; } }
  function setSeated(on) { seated = on; }

  function update(dt) {
    t += dt; poseT += dt;
    const k = 1 - Math.exp(-dt * 6);
    let tilt = 0, upperTilt = 0, bob = 0, target = hands.stand, swing = 0;
    if (pose === "walk") { bob = Math.abs(Math.sin(t * 8)) * 0.04; swing = Math.sin(t * 8) * 0.12; }
    else if (pose === "stand") { bob = Math.sin(t * 1.6) * 0.008; }
    else if (pose === "sit") { target = hands.sit; upperTilt = -0.06; bob = Math.sin(t * 1.1) * 0.006; }
    else if (pose === "lean") { tilt = -0.12; upperTilt = -0.28; target = hands.lean; bob = Math.sin(t * 1.2) * 0.006; }
    else if (pose === "hapjang") { target = hands.hapjang; upperTilt = poseT > 0.8 && poseT < 1.8 ? -0.35 : -0.05; }
    else if (pose === "bow") {
      target = hands.hapjang;
      const p = Math.min(1, poseT / POSE_LEN.bow);
      upperTilt = -1.05 * Math.sin(Math.PI * Math.min(1, p * 1.25));   // 천천히 숙였다가 일어난다
    }
    body.rotation.x = lerp(body.rotation.x, tilt, k);
    upper.rotation.x = lerp(upper.rotation.x, upperTilt, k);
    sitK = lerp(sitK, seated ? 1 : 0, k);
    body.position.y = bob - 0.27 * sitK;
    skirt.scale.set(1 + 0.6 * sitK, 1 - 0.4 * sitK, 1 + 0.5 * sitK);
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
