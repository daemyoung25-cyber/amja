/* 사람 캐릭터: 수수한 옷을 입은 둥근 사람(동자승 아님, 머리카락 있음).
   모델 정면은 -z이고, root.rotation.y = yaw (walk.js와 같은 규칙). */
export const AVATAR_COLORS = [0x3b3b3f, 0x34507a, 0x7a6a58, 0x8a9481, 0x7b5a40, 0x5f7486];
const POSE_LEN = { hapjang: 2.5, bow: 4 };

export function createAvatar(THREE, { color }) {
  const m = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true });
  const robeMat = m(color), skinMat = m(0xf0d6bd), hairMat = m(0x2a2522);

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
  hair.rotation.x = 0.25;                    // 뒤통수를 더 덮는다
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skinMat);
  const handR = handL.clone();
  upper.add(head, hair, handL, handR);
  body.add(robe, skirt, upper);

  // 바닥 그림자 (조명 그림자 대신 가벼운 원)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  let pose = "stand", poseT = 0, t = Math.random() * 10;
  const hands = {
    stand: [[-0.24, 0.05, -0.02], [0.24, 0.05, -0.02]],
    hapjang: [[-0.03, 0.22, -0.24], [0.03, 0.22, -0.24]],
    lean: [[-0.22, 0.38, -0.36], [0.22, 0.38, -0.36]],
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  function setPose(p) { if (p !== pose) { pose = p; poseT = 0; } }

  function update(dt) {
    t += dt; poseT += dt;
    const k = 1 - Math.exp(-dt * 6);
    let tilt = 0, upperTilt = 0, bob = 0, target = hands.stand, swing = 0;
    if (pose === "walk") { bob = Math.abs(Math.sin(t * 8)) * 0.04; swing = Math.sin(t * 8) * 0.12; }
    else if (pose === "stand") { bob = Math.sin(t * 1.6) * 0.008; }
    else if (pose === "lean") { tilt = -0.12; upperTilt = -0.28; target = hands.lean; bob = Math.sin(t * 1.2) * 0.006; }
    else if (pose === "hapjang") { target = hands.hapjang; upperTilt = poseT > 0.8 && poseT < 1.8 ? -0.35 : -0.05; }
    else if (pose === "bow") {
      target = hands.hapjang;
      const p = Math.min(1, poseT / POSE_LEN.bow);
      upperTilt = -1.05 * Math.sin(Math.PI * Math.min(1, p * 1.25));   // 천천히 숙였다가 일어난다
    }
    body.rotation.x = lerp(body.rotation.x, tilt, k);
    upper.rotation.x = lerp(upper.rotation.x, upperTilt, k);
    body.position.y = bob;
    handL.position.set(lerp(handL.position.x, target[0][0], k), lerp(handL.position.y, target[0][1], k), lerp(handL.position.z, target[0][2] + swing, k));
    handR.position.set(lerp(handR.position.x, target[1][0], k), lerp(handR.position.y, target[1][1], k), lerp(handR.position.z, target[1][2] - swing, k));
  }

  function setOpacity(o) {
    for (const mat of [robeMat, skinMat, hairMat]) mat.opacity = o;
    shadow.material.opacity = 0.22 * o;
  }

  update(0);
  return { root, setPose, update, setOpacity, get pose() { return pose; } };
}

export const POSE_SECONDS = POSE_LEN;
