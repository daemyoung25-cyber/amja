/* 사람 캐릭터: 머리·목·몸·팔·다리·손·발이 있다 (buildBody). 옷은 절 생활복: 흰 상의에 허벅지까지 오는 넉넉한 회색 조끼, 발목을 오므린 통 넓은 회색 바지, 흰 고무신. 큰 머리에 짧은 목.
   스님만 회색 법복에 흰 동정, 밤색 가사와 염주 차림이다.
   얼굴은 부처님처럼 눈을 지그시 감고 인자하게 미소 짓는다. (동자승 아님, 머리카락 있음)
   모델 정면은 -z이고, root.rotation.y = yaw (walk.js와 같은 규칙). */
export const AVATAR_COLORS = [0xa8a69e, 0xb0aea6, 0x9f9d96, 0xaba89e, 0xa3a39d, 0xb3b0a8];   // 바지 회색 (보안 규칙상 6가지)

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
import { bowPhase, BOW108_SECONDS } from "../logic/bows.js";

const POSE_LEN = { hapjang: 2.5, bow: 11.2, light: 3.2, bow108: BOW108_SECONDS, give: 2.4, pet: 4, feed: 6, pat: 4, tea: 4 };

/* 큰절(오체투지): 합장 → 반배 → 무릎 꿇기 → 두 손 바닥에 → 이마 닿기 → 손바닥 위로 귀까지(접족례)
   → 거꾸로 일어나기 → 합장 반배. 키프레임 [초, 무릎(0~1), 몸 낮춤(m), 상체 숙임(rad), 손 자리] */
const BOW_KEYS = [
  [0.0, 0, 0, 0, "hapjang"], [0.8, 0, 0, -0.05, "hapjang"], [1.6, 0, 0, -0.5, "hapjang"], [2.4, 0, 0, -0.05, "hapjang"],
  [3.4, 1, 0.3, -0.1, "knees"], [4.2, 1, 0.3, -0.8, "floor"], [5.0, 1, 0.3, -1.25, "prone"], [5.6, 1, 0.3, -1.25, "prone"],
  [6.3, 1, 0.3, -1.25, "lift"], [7.0, 1, 0.3, -1.25, "prone"], [7.8, 1, 0.3, -0.8, "floor"], [8.6, 1, 0.3, -0.1, "knees"],
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

/* 조끼 무늬: 회전체 UV는 u=0이 등(+z), 0.5가 앞(-z), v=1이 목. 앞은 V로 트여 흰 상의가 보이고, 가운데 여밈에 매듭 단추, 양옆 아래 주머니 */
let vestTex = null;
function vestTexture(THREE) {
  if (vestTex) return vestTex;
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const P = (u, v) => [u * S, (1 - v) * S];
  const line = (pts) => { g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(...P(u, v)) : g.moveTo(...P(u, v)))); g.stroke(); };
  const VEST = "#aeaca4", EDGE = "#7f7d76", SHIRT = "#f6f4ee";
  g.fillStyle = VEST; g.fillRect(0, 0, S, S);
  g.fillStyle = SHIRT; g.beginPath(); g.moveTo(...P(0.4, 1)); g.lineTo(...P(0.6, 1)); g.lineTo(...P(0.5, 0.66)); g.closePath(); g.fill();   // 앞 V
  g.strokeStyle = EDGE; g.lineWidth = 3;
  line([[0.4, 1], [0.5, 0.66], [0.6, 1]]);
  line([[0.5, 0.66], [0.5, 0]]);                                                       // 여밈
  line([[0, 0.03], [1, 0.03]]);                                                        // 밑단
  for (const u of [0.37, 0.56]) line([[u, 0.3], [u + 0.07, 0.3], [u + 0.07, 0.1], [u, 0.1], [u, 0.3]]);   // 주머니
  g.fillStyle = "#6a6862";
  for (const v of [0.6, 0.5, 0.4]) { g.beginPath(); g.arc(...P(0.5, v), 3.5, 0, Math.PI * 2); g.fill(); }   // 매듭 단추
  vestTex = new THREE.CanvasTexture(c);
  vestTex.colorSpace = THREE.SRGBColorSpace;
  return vestTex;
}

/* 동자승 승복: 회색 바탕에 흰 동정, 허리에 맨 띠와 늘어뜨린 띠자락 */
let noviceTex = null;
function noviceTexture(THREE) {
  if (noviceTex) return noviceTex;
  const S = 256, c = document.createElement("canvas"); c.width = c.height = S;
  const g = c.getContext("2d");
  const P = (u, v) => [u * S, (1 - v) * S];
  const poly = (pts, color) => { g.fillStyle = color; g.beginPath(); pts.forEach(([u, v], i) => (i ? g.lineTo(...P(u, v)) : g.moveTo(...P(u, v)))); g.closePath(); g.fill(); };
  g.fillStyle = "#94969b"; g.fillRect(0, 0, S, S);
  poly([[0.4, 1], [0.6, 1], [0.5, 0.74]], "#f4f2ec");                                  // 흰 동정
  poly([[0.42, 1], [0.58, 1], [0.5, 0.8]], "#94969b");
  g.fillStyle = "#6c6e73"; g.fillRect(0, (1 - 0.56) * S, S, 0.055 * S);                  // 허리띠
  poly([[0.475, 0.56], [0.525, 0.56], [0.545, 0.14], [0.455, 0.14]], "#74767b");         // 띠자락
  noviceTex = new THREE.CanvasTexture(c);
  noviceTex.colorSpace = THREE.SRGBColorSpace;
  return noviceTex;
}

/* 몸: 손 자리(hands)와 뼈대(body, hip, upper)는 그대로 쓰고, 어깨에서 손까지, 엉덩이에서 발까지를
   관절 둘짜리 사슬로 잇는다 (손발이 가면 팔꿈치·무릎이 저절로 굽는다). robe를 주면 스님 법복, 없으면 조끼 차림 */
function buildBody(THREE, { root, body, hip, upper, color, skinMat, handL, handR, materials, robe = null, novice = false }) {
  const mat = (c, o = {}) => { const m = new THREE.MeshLambertMaterial({ color: c, transparent: true, ...o }); materials.push(m); return m; };
  const glow = novice ? { emissive: 0x3c3d40 } : {};   // 동자승 옷은 그늘에서도 밝은 회색으로
  const shirt = robe || novice ? mat(color, { side: THREE.DoubleSide, ...glow }) : mat(0xf6f4ee, { side: THREE.DoubleSide }), pants = mat(color, { side: THREE.DoubleSide, ...glow }), rubber = mat(novice ? 0x24211f : 0xf7f6f1), inner = mat(novice ? 0xe9e6de : 0xc9c6bd), vest = mat(0xffffff, { map: novice ? noviceTexture(THREE) : vestTexture(THREE), side: THREE.DoubleSide, ...glow });
  const mesh = (geo, m, parent, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); parent.add(o); return o; };

  // 머리를 조금 줄이고 올려 목이 보이게 한다 (얼굴은 머리에 붙은 채로)
  const headGroup = new THREE.Group(), HEAD_S = novice ? 1.22 : 0.98;
  for (const c of [...upper.children]) if (c !== handL && c !== handR) headGroup.add(c);
  headGroup.scale.setScalar(HEAD_S);
  headGroup.position.y = 0.42 * (1 - HEAD_S) + (novice ? 0.05 : 0.005);
  upper.add(headGroup);
  mesh(new THREE.CylinderGeometry(0.062, 0.07, 0.08, 10), skinMat, upper, 0, 0.2, 0);
  if (!robe) { const collar = mesh(new THREE.TorusGeometry(0.073, 0.018, 6, 14), shirt, upper, 0, 0.16, -0.003); collar.rotation.x = Math.PI / 2 - 0.12; }

  // 몸통: 엉덩이 관절 기준. 조끼 무늬를 입힌 캡슐
  const torso = mesh(new THREE.CapsuleGeometry(0.15, 0.2, 5, 16), robe || shirt, hip, 0, 0.195, 0);
  torso.scale.set(1.05, 1, 0.78);
  if (!robe) {                                       // 허벅지까지 오는 넉넉한 조끼 (엉덩이 관절 기준 높이)
    const coat = mesh(new THREE.LatheGeometry([[0.222, -0.09], [0.208, 0.02], [0.186, 0.14], [0.176, 0.27], [0.15, 0.38], [0.082, 0.45]].map(([r, y]) => new THREE.Vector2(r, y)), 24), vest, hip);
    coat.scale.z = 0.8;
  }
  const pelvis = mesh(new THREE.SphereGeometry(1, 12, 9), pants, body, 0, 0.325, 0);
  pelvis.scale.set(0.178, 0.105, 0.14);

  const limbGeo = (r0, r1) => { const g = new THREE.CylinderGeometry(r1, r0, 1, 10, 1, true); g.translate(0, 0.5, 0); return g; };
  const ball = (r, m, parent) => mesh(new THREE.SphereGeometry(r, 10, 8), m, parent);
  const Y = new THREE.Vector3(0, 1, 0), dir = new THREE.Vector3(), perp = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), j = new THREE.Vector3(), hint = new THREE.Vector3();
  const lay = (o, from, to) => { o.position.copy(from); dir.subVectors(to, from); const len = dir.length() || 1e-4; o.quaternion.setFromUnitVectors(Y, dir.divideScalar(len)); o.scale.set(1, len, 1); };
  // from에서 to까지 길이 l1, l2인 두 마디: hint 쪽으로 굽은 관절 자리를 out에 넣는다. 닿지 않으면 곧게 편다
  function joint(from, to, l1, l2, h, out) {
    dir.subVectors(to, from);
    const d = dir.length() || 1e-4; dir.divideScalar(d);
    if (d >= l1 + l2) return out.copy(from).addScaledVector(dir, d * l1 / (l1 + l2));
    const x = (l1 * l1 - l2 * l2 + d * d) / (2 * d), rise = Math.sqrt(Math.max(0, l1 * l1 - x * x));
    perp.copy(h).addScaledVector(dir, -h.dot(dir));
    if (perp.lengthSq() < 1e-6) perp.set(0, 0, -1);
    perp.normalize();
    return out.copy(from).addScaledVector(dir, x).addScaledVector(perp, rise);
  }

  // 팔: upper 틀에서 어깨 → 팔꿈치 → 손. 긴 소매
  const ARM = 0.185, SHOULDER = { x: 0.155, y: 0.122, z: 0 };
  const armBag = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 12);
  const upperGeo = armBag([[0.0005, 0], [0.04, 0.05], [0.052, 0.2], [0.048, 0.55], [0.04, 1]]), foreGeo = armBag([[0.04, 0], [0.04, 0.2], [0.032, 0.75], [0.027, 1]]);
  const arms = [[-1, handL], [1, handR]].map(([sx, hand]) => {
    hand.scale.setScalar(0.82);
    return { sx, hand, up: mesh(upperGeo, shirt, upper), fore: mesh(foreGeo, shirt, upper), elbow: ball(0.0395, shirt, upper) };
  });

  // 고무신: 앞코가 살짝 들린 배 모양, 위는 트여 있다. 원점이 발목, 앞이 -z
  const hullGeo = new THREE.SphereGeometry(1, 12, 8), toeGeo = new THREE.SphereGeometry(1, 10, 7), holeGeo = new THREE.CircleGeometry(1, 14);
  const makeShoe = () => {
    const g = new THREE.Group();
    const hull = mesh(hullGeo, rubber, g, 0, -0.03, -0.035); hull.scale.set(0.058, 0.036, 0.118);
    const toe = mesh(toeGeo, rubber, g, 0, -0.012, -0.135); toe.scale.set(0.026, 0.024, 0.042); toe.rotation.x = -0.55;
    const hole = mesh(holeGeo, inner, g, 0, 0.003, 0.002); hole.rotation.x = -Math.PI / 2; hole.scale.set(0.04, 0.062, 1);
    return g;
  };
  // 다리: root 틀에서 엉덩이 → 무릎 → 발목 (몸이 내려가도 발은 바닥에 남는다)
  const THIGH = 0.15, SHIN = 0.15, HIP = { x: 0.085, y: 0.33 }, ANKLE = 0.065;
  const bag = (pts) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 12);   // 위에서 아래로 뻗는 통: y 0~1
  const thighGeo = bag([[0.092, 0], [0.097, 0.5], [0.09, 1]]), shinGeo = bag([[0.088, 0], [0.092, 0.45], [0.08, 0.75], [0.052, 0.95], [0.042, 1]]);   // 발목을 오므린 바지
  const legs = [-1, 1].map((sx) => {
    const g = { sx, thigh: mesh(thighGeo, pants, root), shin: mesh(shinGeo, pants, root), knee: ball(0.088, pants, root), hipBall: ball(0.092, pants, root), cuff: ball(0.044, pants, root), shoe: makeShoe() };
    root.add(g.shoe);
    return g;
  });
  const mix = (x, y, k) => x + (y - x) * k;
  let walkK = 0;

  return function pose({ dt, t, walking, tilt, bodyY, kneelK, sitK, kick = 0 }) {
    walkK = mix(walkK, walking ? 1 : 0, 1 - Math.exp(-dt * 10));
    const c = Math.cos(tilt), s = Math.sin(tilt), crouch = kneelK * (1 - sitK);
    for (const l of legs) {
      const sx = l.sx, phase = t * 8;
      // 엉덩이 자리: 몸이 숙으면(기대기) 같이 간다
      a.set(sx * HIP.x, HIP.y * c + bodyY, HIP.y * s);
      // 발목 자리: 서기·걷기 → 꿇기 → 책상다리
      const stride = Math.sin(phase) * sx * 0.14 * walkK, lift = Math.max(0, Math.cos(phase) * sx) * 0.05 * walkK;
      const fx = mix(mix(sx * 0.09, sx * 0.085, kneelK), -sx * 0.055, sitK);
      const fy = mix(mix(ANKLE + lift, 0.055, kneelK), 0.1, sitK);
      const fz = mix(mix(stride, 0.05, kneelK), -0.17, sitK);
      b.set(fx, fy + (sx > 0 ? kick * 0.17 : 0), fz - (sx > 0 ? kick * 0.14 : 0));   // 제기 차는 오른발
      hint.set(sx * sitK, 0.25 * sitK, -1 + 0.7 * sitK);
      joint(a, b, THIGH, SHIN, hint, j);
      l.hipBall.position.copy(a);
      l.knee.position.copy(j);
      l.cuff.position.copy(b);
      lay(l.thigh, a, j); lay(l.shin, j, b);
      l.shoe.position.copy(b);
      // 걸을 땐 발끝을 조금 들고 내리고, 꿇으면 발등을 바닥에 눕혀 앞코가 뒤로 가고, 책상다리면 발끝이 안쪽을 본다
      l.shoe.rotation.set(crouch * 2.9 + Math.sin(phase) * sx * 0.25 * walkK, -sx * 0.9 * sitK, 0);
    }
    for (const arm of arms) {
      a.set(arm.sx * SHOULDER.x, SHOULDER.y, SHOULDER.z);
      b.copy(arm.hand.position);
      dir.subVectors(b, a);
      if (dir.length() > ARM * 2) { b.copy(a).addScaledVector(dir, (ARM * 2) / dir.length()); arm.hand.position.copy(b); }
      hint.set(arm.sx * 0.55, -0.45, 0.6);
      joint(a, b, ARM, ARM, hint, j);
      arm.elbow.position.copy(j);
      lay(arm.up, a, j); lay(arm.fore, j, b);
    }
  };
}

export function createAvatar(THREE, { color, monk = false, bun = false, novice = false, calm = false, beads: wristBeads = false }) {
  const m = (c) => new THREE.MeshLambertMaterial({ color: c, flatShading: true, transparent: true });
  const robeMat = m(color), skinMat = m(0xf0d6bd), hairMat = m(0x2a2522); skinMat.flatShading = false; skinMat.emissive.set(0x4a3528); hairMat.flatShading = false;   // 목이 드러나니 턱 밑이 그늘로 죽지 않게 매끄럽고 조금 밝게
  robeMat.map = robeTexture(THREE);
  const beadMat = m(0x3b2418), faceMat = m(0x5a3a2c), lipMat = m(0xc0766a);
  const materials = [robeMat, skinMat, hairMat, beadMat, faceMat, lipMat];

  const root = new THREE.Group();
  root.userData.noShadow = true;
  const body = new THREE.Group();            // 발을 축으로 숙인다
  root.add(body);

  const hip = new THREE.Group();             // 엉덩이 관절: 절할 때 몸통(법복)째 숙인다
  hip.position.y = 0.35;
  const upper = new THREE.Group();           // 가슴 위: 머리, 합장 (손 자리는 이 틀 기준)
  upper.position.y = 0.25;
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 22, 16), skinMat);
  head.position.y = 0.42;
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.212, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), hairMat);
  hair.position.y = 0.43;
  hair.rotation.x = 0.42;                    // 뒤통수를 덮고 이마는 드러낸다
  const handL = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), skinMat);
  const handR = handL.clone();
  upper.add(head, hair, handL, handR);
  // 동자승: 민머리에 복숭앗빛 얼굴, 큰 귀
  if (novice) {
    skinMat.color.set(0xf8cfa2); skinMat.emissive.set(0x8f6a45);
    hair.visible = false;
    hairMat.color.set(0x1a1613);
    lipMat.color.set(0x7c3628);
    for (const sx of [-1, 1]) { const ear = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 10), skinMat); ear.scale.set(0.034, 0.064, 0.05); ear.position.set(sx * 0.203, 0.415, 0.01); upper.add(ear); }
    if (wristBeads) {                                // 오른손에 감은 염주
      const b = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 8, 6), beadMat, 5), bm5 = new THREE.Matrix4();
      for (let i = 0; i < 5; i++) { bm5.makeTranslation(0.05, 0.03 - i * 0.04, 0.02); b.setMatrixAt(i, bm5); }
      handR.add(b);
    }
  }
  // 쪽머리: 가운데 가르마로 이마 양옆을 덮고, 뒤로 빗어 뒷목 위에 틀어 올린 뒤 비녀를 꽂는다 (공양주 보살님)
  if (bun) {
    const round = new THREE.SphereGeometry(1, 18, 14), hairPart = (x, y, z, sx, sy, sz, rz = 0) => { const o = new THREE.Mesh(round, hairMat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.z = rz; upper.add(o); return o; };
    hair.rotation.x = 0.85;                                                                         // 이마를 드러낸다
    for (const s of [-1, 1]) {
      hairPart(s * 0.092, 0.548, -0.118, 0.112, 0.04, 0.062, s * -0.72);                              // 가르마에서 양옆으로 빗어 내린 머리
      hairPart(s * 0.172, 0.43, -0.035, 0.04, 0.088, 0.085);                                          // 귀 옆으로 넘긴 머리
    }
    hairPart(0, 0.385, 0.098, 0.172, 0.135, 0.118);                                                  // 뒤로 빗은 머리
    hairPart(0, 0.345, 0.222, 0.092, 0.08, 0.072);                                                   // 쪽
    const pinMat = m(0xc49a3c); materials.push(pinMat);
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.27, 8), pinMat);
    pin.rotation.z = Math.PI / 2 - 0.12; pin.position.set(0, 0.35, 0.235); upper.add(pin);
    for (const s of [-1, 1]) { const tip = new THREE.Mesh(new THREE.SphereGeometry(0.017, 8, 6), pinMat); tip.position.set(s * 0.135, 0.35 - s * 0.016, 0.235); upper.add(tip); }
  }
  // 스님: 민머리, 왼손에 목탁, 오른손에 목탁채
  let setStrike = () => {}, strikeLift = 0;
  if (monk) {
    hairMat.color.set(0xb9a593); hairMat.emissive.set(0x3a2c22);   // 민머리: 깎은 머리빛 (눈썹도 옅게), 피부처럼 그늘이 죽지 않게
    hair.visible = false;                        // 민머리: 머리덮개 없이 매끄러운 머리 그대로
    const wood = m(0x8a4a24);
    const mok = new THREE.Mesh(new THREE.SphereGeometry(0.085, 10, 8), wood);
    mok.scale.set(1.05, 0.82, 0.95); mok.position.set(0.07, 0.04, -0.03); handL.add(mok);
    const slit = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.03), m(0x3a1e10));
    slit.position.set(0.07, 0.03, -0.11); handL.add(slit);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.011, 0.013, 0.2, 5), m(0x5a3a22));
    stick.rotation.z = Math.PI / 2; stick.position.set(-0.09, 0.0, -0.02); handR.add(stick);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 5), m(0x5a3a22));
    knob.position.set(-0.19, 0, -0.02); handR.add(knob);
    materials.push(wood);
    setStrike = (v) => { strikeLift = v; };
  }
  hip.add(upper);
  body.add(hip);

  // 얼굴: 웃는 눈(∩ 두 개), 부드러운 눈썹, 살짝 올라간 입꼬리(∪). 머리 앞(-z) 표면에 붙인다.
  const arc = (r, tube, m, x, y, flip, tilt = 0) => {
    const a = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 4, 10, Math.PI), m);
    a.position.set(x, y, -0.188);
    a.rotation.set(-0.12, 0, (flip ? Math.PI : 0) + tilt);
    upper.add(a);
    return a;
  };
  for (const sx of [-1, 1]) {
    if (novice && !calm) {                                                 // 동자승: 빛이 도는 까만 눈
      const eye = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), new THREE.MeshBasicMaterial({ color: 0x14100e }));
      eye.scale.set(0.031, 0.044, 0.012); eye.position.set(sx * 0.082, 0.425, -0.18); upper.add(eye);
      const glint = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
      glint.position.set(sx * 0.082 + 0.011, 0.442, -0.19); upper.add(glint);
    } else arc(0.028, novice ? 0.009 : 0.007, faceMat, sx * (novice ? 0.082 : 0.07), novice ? 0.42 : 0.418, false);   // 지그시 감은 웃는 눈
    if (novice) { const brow = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), hairMat); brow.scale.set(0.043, 0.0125, 0.012); brow.position.set(sx * 0.085, 0.487, -0.164); brow.rotation.z = sx * -0.14; upper.add(brow); }
    else arc(0.04, 0.005, hairMat, sx * 0.072, 0.462, false, sx * -0.1).position.z = -0.183;   // 눈썹
  }
  arc(novice ? 0.05 : 0.034, novice ? 0.008 : 0.007, lipMat, 0, novice ? 0.36 : 0.368, true).position.z = novice ? -0.19 : -0.192;           // 미소
  const blush = new THREE.MeshBasicMaterial({ color: novice ? 0xf28a6a : 0xf2a99a, transparent: true, opacity: novice ? 0.6 : 0.35, depthWrite: false, side: novice ? THREE.DoubleSide : THREE.FrontSide });
  for (const sx of [-1, 1]) {
    const b = new THREE.Mesh(new THREE.CircleGeometry(0.03, 10), blush);
    b.position.set(sx * (novice ? 0.128 : 0.105), novice ? 0.378 : 0.39, novice ? -0.158 : -0.168);
    if (novice) b.scale.setScalar(1.45);
    b.rotation.y = -sx * 0.55;
    upper.add(b);
  }

  // 동정과 가사는 법복 무늬(robeTexture)로 옷에 그려져 있다. 목에는 염주.
  const beads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.018, 5, 4), beadMat, 18);
  const bm = new THREE.Matrix4();
  for (let i = 0; i < 18; i++) {                  // 목에서 가슴으로 늘어진 둥근 줄
    const a = (i / 18) * Math.PI * 2;
    bm.makeTranslation(Math.sin(a) * 0.165, 0.88 - (1 - Math.cos(a)) * 0.1, Math.cos(a) * 0.085 - 0.04);   // 위는 목 뒤, 아래는 가슴 앞
    beads.setMatrixAt(i, bm);
  }
  beads.position.y = -hip.position.y - 0.09;
  if (monk) hip.add(beads);
  const poseBody = buildBody(THREE, { root, body, hip, upper, color, skinMat, handL, handR, materials, robe: monk ? robeMat : null, novice });

  // 바닥 그림자 (조명 그림자 대신 가벼운 원)
  const shadow = new THREE.Mesh(new THREE.CircleGeometry(0.32, 16), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.012;
  root.add(shadow);

  let pose = "stand", poseT = 0, poseAt = performance.now(), t = Math.random() * 10;
  let seated = false, sitK = 0, kneelK = 0;                // 방석에 앉으면 몸을 낮추고 다리를 넓게
  const hands = {
    stand: [[-0.235, -0.205, -0.02], [0.235, -0.205, -0.02]],
    hapjang: [[-0.03, 0.22, -0.24], [0.03, 0.22, -0.24]],
    offer: [[-0.06, 0.3, -0.42], [0.06, 0.3, -0.42]],        // 두 손으로 초를 받쳐 앞으로
    lean: [[-0.22, 0.38, -0.36], [0.22, 0.38, -0.36]],
    sit: [[-0.08, -0.15, -0.2], [0.08, -0.15, -0.2]],     // 무릎 위에 포갠 손
    knees: [[-0.17, -0.18, -0.16], [0.17, -0.18, -0.16]],      // 꿇어앉아 손은 허벅지 위
    floor: [[-0.2, 0.06, -0.33], [0.2, 0.06, -0.33]],        // 두 손을 앞바닥에 (몸통이 숙은 틀 기준)
    prone: [[-0.24, 0.27, -0.19], [0.24, 0.27, -0.19]],      // 이마 옆 바닥에 손바닥
    lift: [[-0.2, 0.26, -0.06], [0.2, 0.26, -0.06]],         // 손바닥을 위로 귀까지
    jegi: [[-0.25, -0.1, -0.06], [0.25, -0.1, -0.06]],     // 제기 찰 때 두 팔로 중심을 잡는다
    moktak: [[-0.1, -0.08, -0.27], [0.13, -0.06, -0.27]],       // 왼손에 목탁, 오른손 채는 목탁 위
    feed: [[-0.22, 0.04, -0.12], [0.05, 0.3, -0.44]],        // 오른손을 내밀어 먹인다
    pat: [[-0.22, 0.04, -0.12], [0.03, 0.26, -0.44]],        // 오른손으로 궁디팡팡
    tea: [[-0.09, 0.06, -0.24], [0.03, 0.27, -0.2]],         // 오른손 찻잔을 입가로, 왼손은 받친다
  };
  const lerp = (a, b, k) => a + (b - a) * k;

  function setPose(p) { if (p !== pose) { pose = p; poseT = 0; poseAt = performance.now(); } }
  function setSeated(on) { seated = on; }
  // 돌보는 동안 오른손이 찾아갈 자리(세계 좌표). null이면 정해진 손 자리로
  let reach = null, play = 0;                        // play: 놀이 박자 0~1 (제기 찰 때, 공깃돌 올릴 때)
  const reachLocal = new THREE.Vector3();
  function setReach(p) { reach = p; }
  function setPlay(v) { play = v; }

  // 머리 위 이름표 ("연화보살"): 캔버스 글씨를 스프라이트로. 늘 화면을 본다.
  let tag = null, tagText = "";
  function setName(text) {
    if (text === tagText) return;
    tagText = text;
    if (tag) { root.remove(tag); tag.material.map.dispose(); tag.material.dispose(); tag = null; }
    if (!text) return;
    const c = document.createElement("canvas"); c.height = 128;
    const g = c.getContext("2d");
    const font = '600 64px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
    g.font = font;
    const w = g.measureText(text).width + 56;
    c.width = Math.max(512, Math.ceil(w) + 12);       // 긴 이름은 글자를 줄이지 않고 표를 넓힌다 (폭을 바꾸면 글꼴 설정이 지워진다)
    g.font = font;
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "rgba(20,22,36,0.55)";
    g.beginPath(); g.roundRect((c.width - w) / 2, 14, w, 100, 50); g.fill();
    g.fillStyle = "#f8f3e8"; g.fillText(text, c.width / 2, 66);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
    tag.scale.set(1.2 * c.width / 512, 0.3, 1);
    tag.renderOrder = 10;
    root.add(tag);
  }

  // 말풍선: 잠깐 떠서 머리 위에 있다가 옅어진다. 다른 것에 가려지지 않는다.
  let bubble = null, bubbleFrom = 0, bubbleTo = 0;
  function dropBubble() { if (bubble) { root.remove(bubble); bubble.material.map.dispose(); bubble.material.dispose(); bubble = null; } }
  function say(text, sec = 5) {
    dropBubble();
    const c = document.createElement("canvas"); c.width = 1024; c.height = 200;
    const g = c.getContext("2d");
    const font = (px) => `600 ${px}px "Apple SD Gothic Neo","Noto Sans KR",sans-serif`;
    let px = 76;
    g.font = font(px);
    const room = 930, wide = g.measureText(text).width;
    if (wide > room) { px = Math.floor(px * room / wide); g.font = font(px); }
    const w = Math.min(1016, g.measureText(text).width + 72);
    g.fillStyle = "rgba(250,245,232,0.96)";
    g.beginPath(); g.roundRect((1024 - w) / 2, 8, w, 150, 60); g.fill();
    g.beginPath(); g.moveTo(490, 154); g.lineTo(534, 154); g.lineTo(512, 192); g.closePath(); g.fill();   // 말꼬리
    g.fillStyle = "#2b2a33"; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(text, 512, 86);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    bubble = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false, opacity: 0 }));
    bubble.scale.set(2.6 / root.scale.x, 0.508 / root.scale.x, 1);
    bubble.position.y = root.scale.x < 1 ? 1.65 / root.scale.x : 2.02;
    bubble.renderOrder = 11;
    root.add(bubble);
    bubbleFrom = performance.now(); bubbleTo = bubbleFrom + sec * 1000;
  }

  function update(dt) {
    t += dt;
    poseT = (performance.now() - poseAt) / 1000;   // 시계 기준: 화면이 느리거나 탭을 잠시 떠나도 108배 숫자와 몸짓이 어긋나지 않게
    const k = 1 - Math.exp(-dt * 6);
    let tilt = 0, upperTilt = 0, hipTilt = 0, bob = 0, target = hands.stand, swing = 0;
    if (pose === "walk") { bob = Math.abs(Math.sin(t * 8)) * 0.04; swing = Math.sin(t * 8) * 0.12; }
    else if (pose === "stand") { bob = Math.sin(t * 1.6) * 0.008; }
    else if (pose === "sit") { target = hands.sit; upperTilt = -0.06; bob = Math.sin(t * 1.1) * 0.006; }
    else if (pose === "jegi") { target = hands.jegi; bob = play * 0.02; upperTilt = 0.05; }
    else if (pose === "gonggi") { target = [hands.sit[0], [0.07, -0.13 + play * 0.1, -0.24]]; upperTilt = -0.12 - play * 0.04; }
    else if (pose === "moktak") { target = hands.moktak; upperTilt = -0.1; bob = Math.sin(t * 1.1) * 0.004; }
    else if (pose === "lean") { tilt = -0.12; upperTilt = -0.28; target = hands.lean; bob = Math.sin(t * 1.2) * 0.006; }
    else if (pose === "hapjang") { target = hands.hapjang; hipTilt = poseT > 0.8 && poseT < 1.8 ? -0.35 : -0.05; }
    else if (pose === "light") {                                  // 초를 앞으로 내밀어 올리고(1.6초), 합장으로 마무리
      target = poseT < 2 ? hands.offer : hands.hapjang;
      hipTilt = poseT < 2 ? -0.22 : poseT < 2.8 ? -0.3 : -0.05;
    }
    else if (pose === "pet") { target = hands.offer; hipTilt = -0.72; }   // 개를 쓰다듬는다
    else if (pose === "feed") { target = hands.feed; hipTilt = -0.72; }
    else if (pose === "pat") { target = hands.pat; hipTilt = -0.66; }
    else if (pose === "tea") { target = poseT < 3.3 ? hands.tea : hands.sit; upperTilt = poseT > 0.8 && poseT < 2.6 ? -0.16 : -0.06; bob = Math.sin(t * 1.1) * 0.006; }
    else if (pose === "give") {                                   // 두 손으로 꾸러미를 내밀거나 받고(1.6초), 고개 숙여 인사
      target = poseT < 1.6 ? hands.offer : hands.stand;
      hipTilt = poseT < 1.6 ? -0.15 : poseT < 2.2 ? -0.3 : -0.05;
    }
    if (reach && (pose === "pet" || pose === "feed" || pose === "pat")) {
      // 키 큰 동물은 덜 숙이고 낮은 동물은 더 숙인다. 왼손은 무릎에 두고 오른손이 동물에게 간다
      hipTilt = -(0.3 + 0.68 * Math.min(1, Math.max(0, (0.62 - reach.y) / 0.42)));
      root.updateWorldMatrix(true, true);
      upper.worldToLocal(reachLocal.copy(reach));
      if (pose === "pet") reachLocal.x += Math.sin(t * 5) * 0.025;   // 쓰다듬는 손길
      target = [hands.knees[0], [reachLocal.x, reachLocal.y + (pose === "pat" ? 0.02 : 0.015), reachLocal.z]];
    }
    let kneel = 0;
    if (pose === "pet" || pose === "feed" || pose === "pat") kneel = reach ? 0.85 - 0.8 * Math.min(1, Math.max(0, (reach.y - 0.33) / 0.33)) : 0.8;   // 키 큰 동물 앞에선 무릎을 덜 굽힌다
    if (pose === "bow" || pose === "bow108") {
      const b = bowAt(pose === "bow" ? poseT : bowPhase(poseT));
      hipTilt = b.tilt; kneel = b.kneel;
      const A = hands[b.from], B = hands[b.to];
      target = A.map((h, j) => h.map((v, n) => v + (B[j][n] - v) * b.e));
    }
    body.rotation.x = lerp(body.rotation.x, tilt, k);
    upper.rotation.x = lerp(upper.rotation.x, upperTilt, k);
    hip.rotation.x = lerp(hip.rotation.x, hipTilt, k);           // 절·합장은 엉덩이부터 몸통째 숙인다
    sitK = lerp(sitK, seated ? 1 : 0, k);
    kneelK = lerp(kneelK, Math.max(kneel, seated ? 1 : 0), k * 1.5);
    // 앉거나 무릎 꿇으면 몸을 낮춘다 (발은 buildBody가 바닥에 둔다)
    body.position.y = bob - 0.21 * kneelK;
    shadow.scale.setScalar(1 + 0.35 * sitK);
    if (tag) tag.position.y = 1.55 + body.position.y;
    if (bubble) {
      const now = performance.now();
      if (now >= bubbleTo) dropBubble();
      else bubble.material.opacity = Math.min(1, (now - bubbleFrom) / 350, (bubbleTo - now) / 700);
    }
    handL.position.set(lerp(handL.position.x, target[0][0], k), lerp(handL.position.y, target[0][1], k), lerp(handL.position.z, target[0][2] + swing, k));
    handR.position.set(lerp(handR.position.x, target[1][0], k), lerp(handR.position.y, target[1][1], k), lerp(handR.position.z, target[1][2] - swing, k));
    if (pose === "pat") handR.position.y = target[1][1] + Math.abs(Math.sin(t * 8)) * 0.13;   // 팡팡
    if (pose === "moktak") handR.position.y = target[1][1] + 0.15 * strikeLift;   // 채질은 빠르니 따라가지 않고 바로
    poseBody({ dt, t, walking: pose === "walk", tilt: body.rotation.x, bodyY: body.position.y, kneelK, sitK, kick: pose === "jegi" ? play : 0 });
    if (held) {                                   // 든 것: 두 손 사이에 받쳐 들거나(both) 오른손에 늘어뜨린다(hang)
      if (heldMode === "both") held.position.set((handL.position.x + handR.position.x) / 2, (handL.position.y + handR.position.y) / 2 - 0.08, (handL.position.z + handR.position.z) / 2);
      else if (heldMode === "hand") held.position.set(handR.position.x, handR.position.y + 0.02, handR.position.z - 0.05);
      else held.position.set(handR.position.x + 0.02, handR.position.y - 0.2, handR.position.z);
    }
  }

  // 손에 드는 것 (봉송 꾸러미): obj를 주면 들고, null이면 내려놓는다
  let held = null, heldMode = "both";
  function hold(obj, mode = "both") {
    if (held && held !== obj) upper.remove(held);
    held = obj; heldMode = mode;
    if (obj) { upper.add(obj); obj.traverse((o) => { if (o.material) { o.material.transparent = true; materials.push(o.material); } }); }
  }

  // '여'를 고른 분: 옆으로 넘긴 앞머리, 턱까지 내려온 옆머리, 뒷목에서 낮게 묶은 머리와 붉은 끈 (보살님 쪽머리와는 다르게)
  let longHair = null;
  function setLongHair(on) {
    if (monk || novice || bun || !!on === !!(longHair && longHair.visible)) return;
    if (on && !longHair) {
      longHair = new THREE.Group();
      const round = new THREE.SphereGeometry(1, 16, 12), part = (x, y, z, sx, sy, sz, rx = 0, rz = 0) => { const o = new THREE.Mesh(round, hairMat); o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, 0, rz); longHair.add(o); return o; };
      part(-0.045, 0.545, -0.135, 0.14, 0.05, 0.075, 0, 0.38);                // 옆으로 넘긴 앞머리
      part(0.1, 0.53, -0.13, 0.08, 0.042, 0.065, 0, -0.5);
      for (const s of [-1, 1]) part(s * 0.178, 0.385, 0.01, 0.048, 0.125, 0.105, 0.12);   // 귀를 덮고 턱까지
      part(0, 0.36, 0.105, 0.185, 0.165, 0.115);                               // 뒷머리
      part(0, 0.17, 0.2, 0.052, 0.1, 0.045, -0.12);                            // 묶은 머리
      const tie = new THREE.Mesh(new THREE.TorusGeometry(0.034, 0.012, 6, 14), m(0x9c3434));
      tie.material.flatShading = false; materials.push(tie.material); tie.material.opacity = materials[0].opacity;
      tie.rotation.x = Math.PI / 2 - 0.25; tie.position.set(0, 0.255, 0.198); longHair.add(tie);
      upper.add(longHair);
    }
    if (longHair) longHair.visible = !!on;
    hair.rotation.x = on ? 0.55 : 0.42;
  }

  function setOpacity(o) {
    for (const mat of materials) mat.opacity = o;
    if (tag) tag.material.opacity = o;
    blush.opacity = 0.35 * o;
    shadow.material.opacity = 0.22 * o;
  }

  update(0);
  return { root, setPose, setSeated, setReach, setPlay, setName, setLongHair, say, update, setOpacity, hold, get held() { return held; }, setStrike: (v) => setStrike(v), get pose() { return pose; } };
}

export const POSE_SECONDS = POSE_LEN;
