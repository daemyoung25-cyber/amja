/* 작은 새 2마리, 나비 2마리, 갈매기 5마리의 그림. 움직임은 logic/critters.js.
   그림자 지도에는 넣지 않고(움직이는 그림자는 비싸다) 새 발밑에만 둥근 그림자를 둔다. 누르기·카메라 충돌에도 안 걸린다. */
import { newBird, stepBird, BUTTERFLIES, butterflyAt, GULLS, gullAt, critterDay } from "../logic/critters.js";
import { skyAt } from "../logic/sky.js";

export function createCritters(THREE) {
  const group = new THREE.Group();
  group.userData.noShadow = true;
  const lambert = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
  const mesh = (geo, material, parent, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); parent.add(m); return m; };

  /* 날개: 몸에 붙는 쪽이 원점, 끝이 +x. 왼쪽 날개는 거울로 뒤집어 쓴다 */
  const pair = (geoR, material, parent, y = 0, z = 0) => {
    const geoL = geoR.clone().scale(-1, 1, 1);
    const pivot = (geo, x) => { const p = new THREE.Group(); p.position.set(x, y, z); parent.add(p); p.add(new THREE.Mesh(geo, material)); return p; };
    return { r: pivot(geoR, 0.001), l: pivot(geoL, -0.001), set(a) { this.r.rotation.z = a; this.l.rotation.z = -a; } };
  };
  const flat = (shape) => { const g = new THREE.ShapeGeometry(shape, 6); g.rotateX(Math.PI / 2); return g; };
  const birdWingGeo = new THREE.SphereGeometry(1, 8, 6); birdWingGeo.scale(0.05, 0.012, 0.042); birdWingGeo.translate(0.05, 0, 0.012);

  /* 작은 새: 동글동글한 참새 */
  const brown = lambert(0x98683c), cream = lambert(0xf0e4cd), dark = lambert(0x3d2c20), wingBrown = lambert(0x6e4a2c), beakMat = lambert(0x4a3a2c), black = new THREE.MeshBasicMaterial({ color: 0x14100c });
  const bodyGeo = new THREE.SphereGeometry(0.062, 12, 10); bodyGeo.scale(0.92, 0.92, 1.18);
  const bellyGeo = new THREE.SphereGeometry(0.046, 12, 10); bellyGeo.scale(1, 0.95, 1.1);   // 앞가슴으로 또렷이 내밀어 몸통과 겹쳐 얼룩지지 않게
  const headGeo = new THREE.SphereGeometry(0.044, 10, 8), cheekGeo = new THREE.SphereGeometry(0.03, 8, 6);
  const beakGeo = new THREE.ConeGeometry(0.012, 0.028, 5); beakGeo.rotateX(-Math.PI / 2);
  const eyeGeo = new THREE.SphereGeometry(0.0078, 6, 4), tailGeo = new THREE.BoxGeometry(0.04, 0.008, 0.075), legGeo = new THREE.CylinderGeometry(0.0035, 0.0035, 0.04, 4);
  const shadowGeo = new THREE.CircleGeometry(0.075, 12); shadowGeo.rotateX(-Math.PI / 2);
  const shadowMat = new THREE.MeshBasicMaterial({ color: 0x1c1712, transparent: true, opacity: 0.28, depthWrite: false });
  const BIRD_SCALE = 1.7;                           // 실제보다 조금 크게: 뒤따르는 카메라에서도 보이게

  const birds = [0, 1].map(() => {
    const state = newBird();
    const root = new THREE.Group();
    mesh(bodyGeo, brown, root, 0, 0.095, 0);
    mesh(bellyGeo, cream, root, 0, 0.084, -0.03);
    const tail = mesh(tailGeo, dark, root, 0, 0.105, 0.085); tail.rotation.x = -0.35;
    for (const s of [-1, 1]) mesh(legGeo, dark, root, s * 0.018, 0.02, 0);
    const head = new THREE.Group(); head.position.set(0, 0.145, -0.05); root.add(head);
    mesh(headGeo, brown, head);
    mesh(cheekGeo, cream, head, 0, -0.012, -0.018);
    mesh(beakGeo, beakMat, head, 0, -0.002, -0.052);
    for (const s of [-1, 1]) mesh(eyeGeo, black, head, s * 0.03, 0.01, -0.03);
    const wings = pair(birdWingGeo, wingBrown, root, 0.108, 0.012);
    wings.r.position.x = 0.05; wings.l.position.x = -0.05;
    root.scale.setScalar(BIRD_SCALE);
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    group.add(root, shadow);
    return { state, root, head, wings, shadow };
  });

  /* 나비: 두 장의 둥근 날개 */
  const wingShape = new THREE.Shape();
  wingShape.moveTo(0, -0.035);
  wingShape.bezierCurveTo(0.03, -0.1, 0.1, -0.1, 0.1, -0.035);
  wingShape.bezierCurveTo(0.1, -0.005, 0.06, 0, 0.045, 0);
  wingShape.bezierCurveTo(0.085, 0.01, 0.075, 0.06, 0.04, 0.055);
  wingShape.bezierCurveTo(0.015, 0.05, 0.005, 0.02, 0, 0);
  wingShape.closePath();
  const butterflyWing = flat(wingShape);
  const thoraxGeo = new THREE.CapsuleGeometry(0.006, 0.05, 2, 5); thoraxGeo.rotateX(Math.PI / 2);
  const butterflies = BUTTERFLIES.map((home) => {
    const root = new THREE.Group();
    mesh(thoraxGeo, dark, root);
    const wings = pair(butterflyWing, lambert(home.color, { side: THREE.DoubleSide, emissive: home.color, emissiveIntensity: 0.55 }), root);
    group.add(root);
    return { home, root, wings };
  });

  /* 갈매기: 멀리서 보는 몸이라 흰 몸통과 끝이 까만 날개만 */
  const gullBodyGeo = new THREE.SphereGeometry(1, 9, 7); gullBodyGeo.scale(0.11, 0.1, 0.38);
  const gullWingGeo = (() => {
    const pos = [0, 0, -0.14, 0, 0, 0.13, 0.45, 0, -0.14, 0.45, 0, 0.09, 0.82, 0, -0.04, 0.82, 0, 0.04];   // 몸 - 가운데 - 끝
    const col = [0.95, 0.96, 0.97, 0.95, 0.96, 0.97, 0.8, 0.83, 0.86, 0.8, 0.83, 0.86, 0.16, 0.16, 0.18, 0.16, 0.16, 0.18];
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex([0, 1, 2, 2, 1, 3, 2, 3, 4, 4, 3, 5]);
    g.computeVertexNormals();
    return g;
  })();
  // 늘 아래에서 올려다보는 새라 빛을 받는 재질이면 까맣게 보인다. 하늘빛 세기만 따로 곱한다 (갈매기 흰빛을 지키려고)
  const gullWhite = new THREE.MeshBasicMaterial({ color: 0xffffff }), gullWingMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
  const gulls = GULLS.map((g) => {
    const root = new THREE.Group();
    mesh(gullBodyGeo, gullWhite, root);
    const wings = pair(gullWingGeo, gullWingMat, root, 0.02, 0);
    root.scale.setScalar(1.5);                       // 멀리 날아도 보이게
    group.add(root);
    return { g, root, wings };
  });

  let t = 0, skyTimer = 1, day = false, vis = 0;
  group.visible = false;

  function update(rawDt, player, date) {
    const dt = Math.min(rawDt, 0.1);
    t += dt;
    skyTimer += dt;
    if (skyTimer >= 1) {
      skyTimer = 0;
      const sky = skyAt(date);
      day = critterDay(sky.sunElevation);
      const lit = 0.3 + 0.7 * sky.light;
      gullWhite.color.setScalar(lit); gullWingMat.color.setScalar(lit);
    }
    vis += Math.sign((day ? 1 : 0) - vis) * Math.min(Math.abs((day ? 1 : 0) - vis), dt / 2.5);   // 해질녘·아침에 천천히 사라지고 나타남
    group.visible = vis > 0.01;
    if (!group.visible) return;

    for (const b of birds) {
      const s = stepBird(b.state, dt, player);
      b.root.position.set(s.x, s.y, s.z);
      b.root.rotation.y = s.yaw;
      b.root.scale.setScalar(BIRD_SCALE * vis);
      b.root.rotation.x = s.state === "fly" ? 0.18 : 0;
      b.head.rotation.x = -s.peck * 0.75;
      b.head.rotation.y = s.state === "rest" && !s.pecking ? Math.sin(s.clock * 1.7) * 0.6 : 0;    // 콕콕 안 할 땐 두리번
      b.wings.set(s.state === "fly" ? 0.2 + s.wing * 0.8 : -1.42);
      b.shadow.position.set(s.x, 0.018, s.z);
      b.shadow.scale.setScalar(Math.max(0.45, 1 - s.y * 0.5) * vis);
    }
    for (const f of butterflies) {
      const p = butterflyAt(f.home, t);
      f.root.position.set(p.x, p.y, p.z);
      f.root.rotation.y = p.yaw;
      f.root.rotation.x = 0.45;
      f.root.scale.setScalar(1.4 * vis);
      f.wings.set(0.1 + p.wing * 1.15);
    }
    for (const g of gulls) {
      const a = gullAt(g.g, t);
      g.root.position.set(a.x, a.y, a.z);
      g.root.rotation.set(0, a.yaw, a.roll, "YXZ");
      g.root.scale.setScalar(1.5 * vis);
      g.wings.set(a.wing);
    }
  }
  return { group, update, birds, butterflies, gulls };
}
