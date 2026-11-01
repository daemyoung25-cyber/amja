/* 법당 부처님: 연화대좌 위 결가부좌, 항마촉지인(오른손은 무릎 앞 땅으로, 왼손은 무릎 위),
   왼어깨에 걸친 가사, 푸른빛 나발과 육계, 긴 귀, 목의 삼도, 머리·몸 광배.
   정면은 -z. 원래 높이 약 2.1m를 scale로 줄여 쓴다. */
export function createBuddha(THREE, { scale = 0.72 } = {}) {
  const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });
  const gold = mat(0xd8ae4f), goldDeep = mat(0xb8893a), robe = mat(0xbf9038), hair = mat(0x2a3550);
  const ink = mat(0x3a2a1c), lotusRed = mat(0xb24a3a), haloRed = mat(0x8a2a20, { side: THREE.DoubleSide }), haloGreen = mat(0x2f6b55, { side: THREE.DoubleSide });
  const g = new THREE.Group();
  const add = (geo, m, [x, y, z], [sx, sy, sz] = [1, 1, 1], [rx, ry, rz] = [0, 0, 0]) => {
    const o = new THREE.Mesh(geo, m);
    o.position.set(x, y, z); o.scale.set(sx, sy, sz); o.rotation.set(rx, ry, rz);
    g.add(o); return o;
  };
  const ball = new THREE.SphereGeometry(1, 10, 8);
  const limb = (a, b, r, m) => {                       // 두 점을 잇는 팔다리
    const A = new THREE.Vector3(...a), B = new THREE.Vector3(...b), len = A.distanceTo(B);
    const o = new THREE.Mesh(new THREE.CapsuleGeometry(r, len, 3, 8), m);
    o.position.copy(A).add(B).multiplyScalar(0.5);
    o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
    g.add(o); return o;
  };

  /* 연화대좌: 팔각 받침, 위로 핀 연잎 두 겹, 윗판 */
  add(new THREE.CylinderGeometry(0.6, 0.68, 0.12, 8), goldDeep, [0, 0.06, 0]);
  for (const [n, r, y, tilt, m] of [[16, 0.58, 0.2, -0.5, lotusRed], [16, 0.5, 0.25, -0.3, gold]]) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (m === gold ? Math.PI / n : 0);
      const holder = new THREE.Group();
      holder.rotation.y = -a;
      const petal = new THREE.Mesh(ball, m);
      petal.position.set(r, y, 0); petal.scale.set(0.04, 0.13, 0.1); petal.rotation.z = tilt;
      holder.add(petal); g.add(holder);
    }
  }
  add(new THREE.CylinderGeometry(0.56, 0.5, 0.07, 16), goldDeep, [0, 0.34, 0]);
  const SEAT = 0.37;

  /* 결가부좌: 넓게 포갠 다리, 두 무릎, 허벅지 위로 올린 발바닥 */
  add(ball, robe, [0, SEAT + 0.12, -0.05], [0.52, 0.15, 0.36]);
  for (const sx of [-1, 1]) add(ball, robe, [sx * 0.4, SEAT + 0.11, -0.15], [0.16, 0.12, 0.17]);
  for (const sx of [-1, 1]) add(ball, gold, [sx * 0.2, SEAT + 0.215, -0.22], [0.065, 0.022, 0.11], [0, sx * 0.5, 0]);

  /* 몸: 배, 가슴, 어깨, 목과 삼도 */
  add(ball, gold, [0, SEAT + 0.36, -0.02], [0.27, 0.24, 0.2]);
  add(ball, gold, [0, SEAT + 0.6, 0], [0.31, 0.33, 0.21]);
  for (const sx of [-1, 1]) add(ball, gold, [sx * 0.27, SEAT + 0.78, 0], [0.11, 0.1, 0.11]);
  // 가사: 왼어깨에서 오른쪽 옆구리로 비스듬히 두른 띠 (오른어깨는 드러남)
  add(new THREE.BoxGeometry(0.15, 0.62, 0.44), robe, [-0.04, SEAT + 0.6, 0], [1, 1, 1], [0, 0, -0.62]);
  add(new THREE.BoxGeometry(0.62, 0.1, 0.44), robe, [0, SEAT + 0.3, -0.01]);
  add(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 10), gold, [0, SEAT + 0.92, 0]);
  for (const y of [0.9, 0.94]) add(new THREE.TorusGeometry(0.08, 0.006, 4, 14), goldDeep, [0, SEAT + y, 0], [1, 1, 1], [Math.PI / 2, 0, 0]);

  /* 팔: 오른손은 무릎 앞으로 내려 땅을 짚고, 왼손은 배 앞 무릎 위에 손바닥을 위로 */
  const RS = [0.3, SEAT + 0.76, 0.01], RE = [0.37, SEAT + 0.47, -0.03], RH = [0.42, SEAT + 0.16, -0.33];
  const LS = [-0.3, SEAT + 0.76, 0.01], LE = [-0.37, SEAT + 0.47, -0.04], LH = [-0.1, SEAT + 0.27, -0.2];
  limb(RS, RE, 0.07, gold); limb(RE, RH, 0.058, gold);
  limb(LS, LE, 0.07, robe); limb(LE, LH, 0.06, robe);
  add(ball, gold, RH, [0.06, 0.08, 0.05]);
  add(ball, gold, [LH[0] + 0.05, LH[1] + 0.01, LH[2]], [0.09, 0.03, 0.07]);

  /* 머리: 얼굴, 긴 귀, 감은 듯한 눈과 눈썹, 코, 입, 백호 */
  const HC = [0, SEAT + 1.1, 0];
  add(ball, gold, HC, [0.15, 0.17, 0.15]);
  for (const sx of [-1, 1]) add(ball, gold, [sx * 0.143, HC[1] - 0.045, 0.015], [0.022, 0.085, 0.04], [0, 0, sx * 0.08]);
  for (const sx of [-1, 1]) {
    add(new THREE.BoxGeometry(0.055, 0.008, 0.01), ink, [sx * 0.055, HC[1] + 0.005, -0.143], [1, 1, 1], [0, 0, sx * -0.12]);
    add(new THREE.BoxGeometry(0.065, 0.01, 0.01), goldDeep, [sx * 0.056, HC[1] + 0.04, -0.14], [1, 1, 1], [0, 0, sx * 0.1]);
  }
  add(new THREE.ConeGeometry(0.018, 0.06, 4), goldDeep, [0, HC[1] - 0.03, -0.152], [1, 1, 0.8], [-0.25, Math.PI / 4, 0]);
  add(new THREE.BoxGeometry(0.04, 0.008, 0.01), mat(0x9b4a32), [0, HC[1] - 0.075, -0.142]);
  add(ball, mat(0xf0e2b8), [0, HC[1] + 0.055, -0.146], [0.011, 0.011, 0.006]);

  /* 나발: 머리를 덮은 푸른 머리칼과 오돌토돌한 소라 모양, 육계, 정상계주 */
  const cap = add(new THREE.SphereGeometry(0.158, 14, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), hair, HC, [1, 1.08, 1], [0.28, 0, 0]);
  cap.position.y += 0.012;
  const topknot = [0, HC[1] + 0.17, 0.01];
  add(ball, hair, topknot, [0.085, 0.075, 0.085]);
  add(ball, mat(0xb33a2a), [0, HC[1] + 0.13, -0.075], [0.022, 0.022, 0.016]);
  const curls = [];
  const N = 220, golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < N; i++) {
    const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = golden * i;
    const d = new THREE.Vector3(Math.cos(th) * r, y, Math.sin(th) * r);
    const front = d.z < -0.35 && d.y < 0.45;          // 이마는 비워 둔다
    if (d.y > 0.12 && !front) curls.push(new THREE.Vector3(HC[0], HC[1] + 0.012, HC[2]).addScaledVector(d, 0.162).add(new THREE.Vector3(0, d.y * 0.012, 0)));
  }
  for (let i = 0; i < 26; i++) {                         // 육계 위에도
    const a = (i / 26) * Math.PI * 2, k = i % 2 ? 0.6 : 0.95;
    curls.push(new THREE.Vector3(topknot[0] + Math.cos(a) * 0.08 * k, topknot[1] + (i % 2 ? 0.05 : 0.02), topknot[2] + Math.sin(a) * 0.08 * k));
  }
  const curlMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(0.019, 5, 4), hair, curls.length);
  const m4 = new THREE.Matrix4();
  curls.forEach((p, i) => curlMesh.setMatrixAt(i, m4.makeTranslation(p.x, p.y, p.z)));
  g.add(curlMesh);

  /* 광배: 불꽃 테를 두른 몸 광배와 동심원 머리 광배 */
  const flame = (w, h, bumps, amp) => {
    const s = new THREE.Shape();
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const t = (i / n) * Math.PI * 2;
      let x = Math.sin(t) * w, y = -Math.cos(t) * h;
      if (y > 0) x *= 1 - 0.35 * (y / h) ** 2;          // 위로 갈수록 뾰족하게
      const k = 1 + amp * Math.max(0, Math.sin(t * bumps));
      const px = x * k, py = y * (1 + amp * 0.5 * Math.max(0, Math.sin(t * bumps)));
      i ? s.lineTo(px, py) : s.moveTo(px, py);
    }
    return new THREE.ShapeGeometry(s);
  };
  const bodyHaloY = SEAT + 0.72;
  add(flame(0.62, 1.0, 22, 0.06), gold, [0, bodyHaloY, 0.3]).material = mat(0xc9993f, { side: THREE.DoubleSide });
  add(flame(0.54, 0.9, 1, 0), haloRed, [0, bodyHaloY - 0.02, 0.29]);
  add(flame(0.46, 0.8, 1, 0), haloGreen, [0, bodyHaloY - 0.04, 0.28]);
  for (const [r, m, z] of [[0.31, mat(0xd8ae4f, { side: THREE.DoubleSide }), 0.24], [0.26, haloRed, 0.235], [0.2, haloGreen, 0.23], [0.13, mat(0xe9cf7a, { side: THREE.DoubleSide }), 0.225]]) {
    add(new THREE.CircleGeometry(r, 28), m, [0, HC[1] + 0.02, z]);
  }

  g.scale.setScalar(scale);
  return g;
}
