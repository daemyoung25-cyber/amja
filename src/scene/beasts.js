/* 바둑이·백구와 하얀 고양이의 몸. 머리는 -z. 코드로 빚은 매끈한 살과 칠한 털빛으로 만든다 (외부 모델·그림 없음).
   뼈대: root - body(몸통·허벅지) - head(얼굴), legs[4], tail(마디마디). 움직임은 logic/pets.js 상태를 받아 update에서. */

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const sstep = (a, b, v) => { const t = clamp01((v - a) / (b - a)); return t * t * (3 - 2 * t); };
const lerp = (a, b, k) => a + (b - a) * k;
const turn = (a, b, k) => a + Math.atan2(Math.sin(b - a), Math.cos(b - a)) * k;

// 털빛 얼룩·결에 쓰는 부드러운 잡음 (그림만, 일정표와 무관)
const fract = (v) => v - Math.floor(v);
const hash = (x, y, z) => fract(Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453);
function noise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), fx = x - ix, fy = y - iy, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
  const at = (a, b, c) => hash(ix + a, iy + b, iz + c);
  return lerp(lerp(lerp(at(0, 0, 0), at(1, 0, 0), u), lerp(at(0, 1, 0), at(1, 1, 0), u), v), lerp(lerp(at(0, 0, 1), at(1, 0, 1), u), lerp(at(0, 1, 1), at(1, 1, 1), u), v), w);
}

/* 격자 곡면 하나: u는 한 바퀴 이어지고 v는 끝에서 끝으로. 이음매까지 법선이 매끈하다. 면 방향은 부피 부호로 바로잡는다 */
function surface(THREE, nU, nV, at, paint) {
  const pos = [], col = [], idx = [], c = [1, 1, 1];
  for (let j = 0; j <= nV; j++) for (let i = 0; i < nU; i++) {
    const p = at(i / nU, j / nV);
    pos.push(p[0], p[1], p[2]);
    if (paint) paint(p[0], p[1], p[2], c);
    col.push(c[0], c[1], c[2]);
  }
  let vol = 0;
  const V = (n) => [pos[n * 3], pos[n * 3 + 1], pos[n * 3 + 2]];
  const tri = (a, b, d) => {
    idx.push(a, b, d);
    const A = V(a), B = V(b), D = V(d);
    vol += A[0] * (B[1] * D[2] - B[2] * D[1]) - A[1] * (B[0] * D[2] - B[2] * D[0]) + A[2] * (B[0] * D[1] - B[1] * D[0]);
  };
  for (let j = 0; j < nV; j++) for (let i = 0; i < nU; i++) {
    const a = j * nU + i, b = j * nU + (i + 1) % nU, d = (j + 1) * nU + i, e = (j + 1) * nU + (i + 1) % nU;
    tri(a, d, b); tri(b, d, e);
  }
  if (vol < 0) for (let n = 0; n < idx.length; n += 3) { const t = idx[n + 1]; idx[n + 1] = idx[n + 2]; idx[n + 2] = t; }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  const nrm = g.attributes.normal, fix = (row, near) => {
    let x = 0, y = 0, z = 0;
    for (let i = 0; i < nU; i++) { const n = near * nU + i; x += nrm.getX(n); y += nrm.getY(n); z += nrm.getZ(n); }
    const L = Math.hypot(x, y, z) || 1;
    for (let i = 0; i < nU; i++) nrm.setXYZ(row * nU + i, x / L, y / L, z / L);
  };
  fix(0, 1); fix(nV, nV - 1);
  return g;
}

// 고리들을 매끈하게 잇는다. keys: [위치, 중심1, 중심2, 반지름1, 반지름2]. axis "z"면 (x=c1, y=c2), "y"면 (x=c1, z=c2)
function loft(THREE, keys, axis, nU, nV, paint, bump = null) {
  const cr = (a, b, c, d, t) => 0.5 * (2 * b + (c - a) * t + (2 * a - 5 * b + 4 * c - d) * t * t + (3 * b - a - 3 * c + d) * t * t * t);
  const sample = (v) => {
    const f = v * (keys.length - 1), i = Math.min(keys.length - 2, Math.floor(f)), t = f - i;
    const k0 = keys[Math.max(0, i - 1)], k1 = keys[i], k2 = keys[i + 1], k3 = keys[Math.min(keys.length - 1, i + 2)];
    return k1.map((_, n) => { const r = cr(k0[n], k1[n], k2[n], k3[n], t); return n >= 3 ? Math.max(0, r) : r; });
  };
  return surface(THREE, nU, nV, (u, v) => {
    const [a, c1, c2, r1, r2] = sample(v), th = u * Math.PI * 2, s = bump ? 1 + bump(th, a) : 1;
    const p = c1 + Math.cos(th) * r1 * s, q = c2 + Math.sin(th) * r2 * s;
    return axis === "z" ? [p, q, a] : [p, a, q];
  }, paint);
}

// 방향별 반지름 함수로 빚는 덩어리 (머리)
function blob(THREE, nU, nV, radius, paint) {
  return surface(THREE, nU, nV, (u, v) => {
    const ph = v * Math.PI, th = u * Math.PI * 2, s = Math.sin(ph);
    const d = [Math.cos(th) * s, Math.cos(ph), Math.sin(th) * s], r = radius(d);
    return [d[0] * r, d[1] * r, d[2] * r];
  }, paint);
}

const norm = (v) => { const L = Math.hypot(v[0], v[1], v[2]); return [v[0] / L, v[1] / L, v[2] / L]; };
const gauss = (d, m, w) => Math.exp(-(1 - (d[0] * m[0] + d[1] * m[1] + d[2] * m[2])) / w);

// 털 재질: 그늘에서도 칠흑이 되지 않고, 무늬·털결·발가락 골은 픽셀마다 계산해 가장자리가 곱게 번진다.
// patches: [x, y, z, 반지름] 먹빛 무늬(위치는 이 부위의 좌표), offset: 부위 좌표를 무늬 좌표로 옮기는 값, toe: [y 아래, z 앞, 골 간격]
function furMaterial(THREE, { patches = [], ink = [0, 0, 0], offset = [0, 0, 0], toe = [0, 0, 0] } = {}) {
  const m = new THREE.MeshLambertMaterial({ vertexColors: true });
  const n = patches.length;
  m.customProgramCacheKey = () => `fur${n}`;
  m.onBeforeCompile = (sh) => {
    sh.uniforms.furInk = { value: new THREE.Vector3(...ink) };
    sh.uniforms.furOffset = { value: new THREE.Vector3(...offset) };
    sh.uniforms.furToe = { value: new THREE.Vector3(...toe) };
    if (n) sh.uniforms.furPatch = { value: patches.map((q) => new THREE.Vector4(...q)) };
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec3 vFurP;").replace("#include <begin_vertex>", "#include <begin_vertex>\nvFurP = position;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec3 vFurP;
      uniform vec3 furInk, furOffset, furToe;
      ${n ? `uniform vec4 furPatch[${n}];` : ""}
      float furH(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float furN(vec3 p) {
        vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(furH(i), furH(i + vec3(1,0,0)), f.x), mix(furH(i + vec3(0,1,0)), furH(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(furH(i + vec3(0,0,1)), furH(i + vec3(1,0,1)), f.x), mix(furH(i + vec3(0,1,1)), furH(i + vec3(1,1,1)), f.x), f.y), f.z);
      }`).replace("#include <color_fragment>", `#include <color_fragment>
      vec3 furQ = vFurP + furOffset;
      ${n ? `float furD = 9.0;
      for (int i = 0; i < ${n}; i++) furD = min(furD, length(furQ - furPatch[i].xyz) / furPatch[i].w);
      furD += (furN(furQ * 38.0) - 0.5) * 0.4 + (furN(furQ * 110.0) - 0.5) * 0.16;
      diffuseColor.rgb = mix(diffuseColor.rgb, furInk, 1.0 - smoothstep(0.93, 1.02, furD));` : ""}
      diffuseColor.rgb *= 0.95 + 0.1 * furN(furQ * vec3(240.0, 240.0, 120.0));
      if (furToe.z > 0.0 && vFurP.y < furToe.x && vFurP.z < furToe.y && abs(abs(vFurP.x) - furToe.z) < furToe.z * 0.3) diffuseColor.rgb *= 0.58;`).replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      float furRim = pow(1.0 - clamp(dot(normalize(vViewPosition), normal), 0.0, 1.0), 3.0);
      totalEmissiveRadiance += diffuseColor.rgb * (0.2 + 0.07 * furRim);`);
  };
  return m;
}

const mixC = (a, b, k, out) => { out[0] = lerp(a[0], b[0], k); out[1] = lerp(a[1], b[1], k); out[2] = lerp(a[2], b[2], k); };
const rgb = (hex) => [((hex >> 16) & 255) / 255, ((hex >> 8) & 255) / 255, (hex & 255) / 255].map((v) => v ** 2.2);   // 정점 색은 선형값

/* 네 발 짐승 공통 조립. look = 강아지/고양이별 치수와 칠 */
function assemble(THREE, look) {
  const root = new THREE.Group(), body = new THREE.Group(), head = new THREE.Group();
  root.add(body); body.add(head);
  const plain = furMaterial(THREE), bodyFur = furMaterial(THREE, look.bodyFur || {});
  const add = (geo, parent, mat = plain) => { const m = new THREE.Mesh(geo, mat); parent.add(m); return m; };

  add(loft(THREE, look.torso, "z", 26, 30, look.paintBody, look.torsoBump), body, bodyFur);
  // 뒷다리 허벅지는 몸통에 붙어 살을 잇는다 (목은 몸통 고리가 머리 속까지 이어진 것)
  for (const s of [-1, 1]) {
    const hx = s * look.haunch.x;
    add(blob(THREE, 16, 12, (d) => Math.hypot(d[0] * look.haunch.rx, d[1] * look.haunch.ry, d[2] * look.haunch.rz), look.paintBody), body, furMaterial(THREE, { ...(look.bodyFur || {}), offset: [hx, look.haunch.y, look.haunch.z] })).position.set(hx, look.haunch.y, look.haunch.z);
  }

  /* 머리: 방향별 반지름으로 볼·주둥이가 이어진 하나의 살 */
  head.position.set(...look.headAt);
  add(blob(THREE, 30, 24, look.headRadius, look.paintHead), head, furMaterial(THREE, look.headFur || {}));
  const onHead = (dir, out = 0) => { const d = norm(dir), r = look.headRadius(d) + out; return { p: [d[0] * r, d[1] * r, d[2] * r], d }; };
  const zAxis = new THREE.Vector3(0, 0, 1), tmpV = new THREE.Vector3();
  const place = (o, spot) => { o.position.set(...spot.p); o.quaternion.setFromUnitVectors(zAxis, tmpV.set(...spot.d)); head.add(o); return o; };

  /* 눈: 까만 눈동자 + 빛 한 점. 고양이는 홍채와 세로 동공. 깜빡이고, 자면 감는다 */
  const eyes = [-1, 1].map((s) => {
    const e = new THREE.Group(), dark = new THREE.MeshBasicMaterial({ color: 0x0d0a08 }), R = look.eyeR;
    const ball = new THREE.SphereGeometry(R, 14, 10); ball.scale(look.eyeWide, 1, 0.48);
    e.add(new THREE.Mesh(ball, dark));
    const open = new THREE.Group(); e.add(open);
    if (look.iris) {
      const iris = new THREE.SphereGeometry(R * 0.94, 14, 10); iris.scale(look.eyeWide, 1, 0.5);
      const i = new THREE.Mesh(iris, new THREE.MeshBasicMaterial({ color: look.iris })); i.position.z = R * 0.08; open.add(i);
      const pupil = new THREE.SphereGeometry(R * 0.62, 10, 8); pupil.scale(look.pupilW || 0.42, 1, 0.42);
      const pm = new THREE.Mesh(pupil, dark); pm.position.z = R * 0.24; open.add(pm);
    }
    const glint = new THREE.Mesh(new THREE.SphereGeometry(R * 0.26, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    glint.position.set(-s * R * 0.0 + R * 0.26, R * 0.32, R * 0.42); open.add(glint);
    const glint2 = new THREE.Mesh(new THREE.SphereGeometry(R * 0.12, 6, 5), glint.material);
    glint2.position.set(-R * 0.28, -R * 0.3, R * 0.42); open.add(glint2);
    place(e, onHead([s * look.eyeDir[0], look.eyeDir[1], look.eyeDir[2]], -R * 0.08));
    e.rotation.z += s * look.eyeTilt;
    return { e, open };
  });

  /* 코와 입매 */
  const noseMat = new THREE.MeshLambertMaterial({ color: look.nose });
  const noseGeo = new THREE.SphereGeometry(look.noseR, 12, 8); noseGeo.scale(1.25, 0.86, 0.72);
  const noseSpot = onHead(look.noseDir, -look.noseR * 0.1);
  place(new THREE.Mesh(noseGeo, noseMat), noseSpot);
  if (look.noseShine) { const g = new THREE.Mesh(new THREE.SphereGeometry(look.noseR * 0.19, 6, 5), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })); g.position.set(noseSpot.p[0] + look.noseR * 0.3, noseSpot.p[1] + look.noseR * 0.4, noseSpot.p[2] - look.noseR * 0.5); head.add(g); }
  const lineMat = new THREE.MeshBasicMaterial({ color: look.mouth });
  for (const path of look.mouthPaths) {
    const pts = path.map((d) => new THREE.Vector3(...onHead(d, look.mouthR * 0.04).p));
    head.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 14, look.mouthR * 0.13, 5), lineMat));
  }

  let tongue = null;
  if (look.tongue) {
    const g = new THREE.SphereGeometry(1, 10, 8); g.scale(look.mouthR * 0.9, look.mouthR * 1.5, look.mouthR * 0.35);
    tongue = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ color: 0xe77f8f }));
    const sp = onHead(look.tongueDir, look.mouthR * 0.06);
    tongue.position.set(...sp.p); tongue.rotation.x = -0.35; tongue.visible = false; head.add(tongue);
  }
  let morsel = null;                                // 간식을 무는 동안 입에 보이는 조각
  if (look.morsel) {
    morsel = new THREE.Mesh(new THREE.BoxGeometry(look.mouthR * 2.6, look.mouthR * 1.3, look.mouthR * 1.3), new THREE.MeshLambertMaterial({ color: 0xc08a4e }));
    morsel.position.set(...onHead(look.tongueDir, look.mouthR * 0.3).p); morsel.visible = false; head.add(morsel);
  }
  if (look.whiskers) {
    const pts = [];
    for (const s of [-1, 1]) for (const k of [-1, 0, 1]) {
      const a = onHead([s * 0.33, -0.25 + k * 0.05, -0.92]);
      pts.push(...a.p, a.p[0] + s * 0.095, a.p[1] + k * 0.02 + 0.006, a.p[2] + 0.018 - Math.abs(k) * 0.005);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
    head.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: 0xcfc9c0, transparent: true, opacity: 0.75 })));
  }

  /* 귀 */
  const ears = [-1, 1].map((s) => {
    const pivot = new THREE.Group();
    const spot = onHead([s * look.earDir[0], look.earDir[1], look.earDir[2]], -0.012);
    pivot.position.set(...spot.p); head.add(pivot);
    add(loft(THREE, look.ear.keys, "y", 12, 12, (x, y, z, c) => look.ear.paint(s, x, y, z, c)), pivot);
    if (look.ear.inner) { const inner = add(loft(THREE, look.ear.inner, "y", 10, 8, (x, y, z, c) => { c[0] = look.ear.innerC[0]; c[1] = look.ear.innerC[1]; c[2] = look.ear.innerC[2]; }), pivot); inner.position.z = -0.005; }
    pivot.rotation.set(look.ear.rx, s * look.ear.ry, s * look.ear.rz);
    return pivot;
  });

  /* 다리: 위가 굵고 아래로 가늘어지다 발에서 둥글게 */
  const legs = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([s, f]) => {
    const pivot = new THREE.Group();
    const a = f > 0 ? look.frontHip : look.rearHip, front = f > 0;
    pivot.position.set(s * a.x, a.y, a.z);
    add(loft(THREE, look.legKeys(front), "y", 14, 18, look.paintLeg), pivot, furMaterial(THREE, look.legFur(s, front)));
    body.add(pivot);
    return { pivot, s, front };
  });

  /* 꼬리: 뼈대를 넣은 한 덩어리라 이음매 없이 휘어진다 */
  const tail = new THREE.Group(); tail.position.set(...look.tailAt); body.add(tail);
  const tailSegs = [];
  for (let i = 0; i < look.tailN; i++) { const b = new THREE.Bone(); b.position.y = i ? look.tailSeg : 0; if (i) tailSegs[i - 1].add(b); tailSegs.push(b); }
  {
    const L = look.tailSeg, N = look.tailN, H = L * N, R = look.tailR, keys = [[-R * 0.8, 0, 0, 0.0005, 0.0005], [-R * 0.25, 0, 0, R * 0.92, R * 0.92]];
    for (let i = 1; i <= N * 2; i++) { const r = R * look.tailTaper ** (i / 2); keys.push([(H * i) / (N * 2), 0, 0, r, r]); }
    const tip = R * look.tailTaper ** N; keys.push([H + tip * 0.8, 0, 0, 0.0005, 0.0005]);
    const g = loft(THREE, keys, "y", 10, 42, (x, y, z, c) => look.paintTail(y / H, c));
    const P = g.attributes.position, si = new Float32Array(P.count * 4), sw = new Float32Array(P.count * 4);
    for (let n = 0; n < P.count; n++) {
      const f = Math.max(0, P.getY(n)) / L, a = Math.min(N - 1, Math.floor(f)), w = Math.min(N - 1, a + 1) === a ? 0 : f - a;
      si[n * 4] = a; si[n * 4 + 1] = Math.min(N - 1, a + 1); sw[n * 4] = 1 - w; sw[n * 4 + 1] = w;
    }
    g.setAttribute("skinIndex", new THREE.Uint16BufferAttribute(Uint16Array.from(si), 4));
    g.setAttribute("skinWeight", new THREE.Float32BufferAttribute(sw, 3 + 1));
    const mesh = new THREE.SkinnedMesh(g, plain);
    mesh.frustumCulled = false;
    mesh.add(tailSegs[0]); tail.add(mesh);
    mesh.bind(new THREE.Skeleton(tailSegs));
  }

  const blobGeo = new THREE.CircleGeometry(1, 18); blobGeo.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(blobGeo, new THREE.MeshBasicMaterial({ color: 0x1c1712, transparent: true, opacity: 0.25, depthWrite: false }));
  shadow.scale.set(look.shadow[0], 1, look.shadow[1]); shadow.position.y = 0.018; root.add(shadow);

  const now = { ...look.poses.sit };
  let t = Math.random() * 10, yaw = null, blinkAt = 2 + Math.random() * 3, blink = 0;

  // act: null | pet | treat | churu | pat, actT: 시작한 뒤 흐른 초
  function update(dt, s, act = null, actT = 0) {
    t += dt;
    if (act === true) act = "pet"; else if (act === false) act = null;
    const petted = act === "pet", eating = act === "treat", licking = act === "churu", patted = act === "pat";
    const chewing = eating && actT > 0.9;
    const k = 1 - Math.exp(-dt * 5);
    const sleeping = s.state === "sleep" && !act, walking = s.state === "walk";
    const poseName = (act && look.acts && look.acts[act]) || s.pose;   // 먹거나 궁디팡팡 받을 땐 그 자세로 일어난다
    const p = look.poses[poseName] || look.poses.sit;
    for (const key of Object.keys(now)) now[key] = lerp(now[key], p[key], k);
    root.position.set(s.x, 0, s.z);
    yaw = yaw === null ? s.yaw : turn(yaw, s.yaw, 1 - Math.exp(-dt * 7));
    root.rotation.y = yaw;

    const stride = walking ? t * look.stride : 0;
    const breathe = Math.sin(t * (sleeping ? 1.3 : 2.2));
    body.position.y = now.y + (walking ? Math.abs(Math.sin(stride)) * look.bounce : 0) + breathe * 0.002 + (patted ? Math.abs(Math.sin(t * 8)) * 0.008 : 0);
    body.rotation.x = now.pitch + (walking ? Math.sin(stride * 2) * 0.018 : 0) - (patted ? Math.abs(Math.sin(t * 8)) * 0.025 : 0);
    body.rotation.z = walking ? Math.sin(stride) * 0.025 : 0;
    body.scale.set(1 + breathe * (sleeping ? 0.016 : 0.007), 1 + breathe * (sleeping ? 0.016 : 0.007), 1);
    for (const l of legs) {
      const phase = l.front === (l.s > 0) ? 0 : Math.PI;
      const swing = walking ? Math.sin(stride + phase) * look.swing : 0;
      l.pivot.rotation.x = (l.front ? now.front : now.rear) + swing - now.pitch;
    }
    const liftForPet = petted && (s.pose === "lie" || s.pose === "curl") ? 0.4 : 0;
    const asleepNod = sleeping && !petted ? look.sleepHead : 0;
    const careHead = eating ? (chewing ? -0.12 + Math.sin(t * 15) * 0.05 : 0.2) : licking ? 0.26 + Math.sin(t * 10) * 0.025 : patted ? 0.1 + Math.abs(Math.sin(t * 8)) * 0.04 : 0;
    head.rotation.x = now.head - now.pitch + asleepNod + liftForPet + careHead + (petted ? Math.sin(t * 5) * 0.05 : 0) + (walking ? Math.sin(stride * 2) * 0.03 : 0);
    const idle = !walking && !sleeping && !act;
    head.rotation.y = idle ? Math.sin(t * 0.37) * 0.3 + Math.sin(t * 0.13) * 0.1 : 0;
    head.rotation.z = idle ? Math.sin(t * 0.23) * 0.09 : petted ? 0.12 : chewing ? Math.sin(t * 2.4) * 0.07 : licking ? 0.08 : 0;

    // 깜빡임, 잠든 눈
    blinkAt -= dt;
    if (blinkAt < 0) { blink = 1; blinkAt = 2.2 + Math.random() * 3.5; }
    blink = Math.max(0, blink - dt * 7);
    const closed = sleeping || (petted && (!look.iris || look.petClose)) || chewing || licking || patted ? 1 : Math.sin(blink * Math.PI);
    for (const e of eyes) { e.e.scale.y = Math.max(0.1, 1 - closed); e.open.visible = closed < 0.6; }
    if (tongue) {                                     // 쓰다듬으면 내밀고, 다 먹고 입맛을 다시고, 츄르는 날름날름
      tongue.visible = petted || (eating && actT > 2.6 && Math.sin(t * 6) > 0) || (licking && Math.sin(t * 11) > -0.35);
      tongue.scale.y = licking ? 0.75 + Math.abs(Math.sin(t * 11)) * 0.55 : 1;
    }
    if (morsel) { morsel.visible = chewing && actT < 2.6; morsel.scale.setScalar(Math.max(0.35, 1 - (actT - 0.9) * 0.4)); }
    look.moveTail(tail, tailSegs, { t, walking, sleeping, petted: petted || eating, pose: poseName });
    for (const [i, e] of ears.entries()) { const side = i ? 1 : -1; e.rotation.x = look.ear.rx + (petted || eating || licking || patted ? look.ear.happy : 0) + (walking ? Math.sin(stride * 2) * look.ear.flop : 0); e.rotation.z = side * look.ear.rz + (walking ? side * Math.sin(stride * 2 + 1) * look.ear.flop * 0.6 : 0); }
    root.scale.setScalar(look.scale);
  }
  // 돌볼 때 손이 닿는 자리(세계 좌표): 쓰다듬기는 머리 위, 먹이기는 입, 궁디팡팡은 엉덩이
  const topY = look.headRadius([0, 1, 0]), mouth = onHead(look.tongueDir || look.noseDir, 0.02).p, rump = [0, look.haunch.y + look.haunch.ry, look.haunch.z];
  function touch(act, out) {
    root.updateWorldMatrix(true, true);
    if (act === "pat") return body.localToWorld(out.set(...rump));
    if (act === "pet") return head.localToWorld(out.set(0, topY * 0.85, -topY * 0.5));
    return head.localToWorld(out.set(...mouth));
  }
  return { root, update, touch };
}

export function createDog(THREE) {
  const WHITE = rgb(0xf7f1e4), CREAM = rgb(0xfdf9f0), INK = rgb(0x221c1a);
  const PATCH = [[0.098, 0.05, -0.05, 0.078], [-0.1, 0.04, 0.1, 0.07], [0.03, 0.098, 0.115, 0.047], [-0.07, 0.075, -0.12, 0.04]];
  const paintBody = (x, y, z, c) => mixC(WHITE, CREAM, sstep(-0.03, -0.08, y) * 0.7, c);
  const MUZ = norm([0, -0.34, -0.94]);
  const headRadius = (d) => {
    const R = 0.09 * (1 + 0.1 * Math.abs(d[0]) - 0.05 * Math.max(0, -d[1]));
    const muzzle = 0.056 * gauss(d, MUZ, 0.065);
    const cheek = 0.011 * (gauss(d, [0.78, -0.3, -0.52], 0.09) + gauss(d, [-0.78, -0.3, -0.52], 0.09));
    const brow = 0.004 * (gauss(d, [0.42, 0.42, -0.8], 0.03) + gauss(d, [-0.42, 0.42, -0.8], 0.03));
    return R + muzzle + cheek + brow;
  };
  const paintHead = (x, y, z, c) => mixC(WHITE, CREAM, z < -0.07 && y < 0.01 ? 0.75 : 0, c);
  const toe = [-0.122, -0.024, 0.0098];
  return assemble(THREE, {
    scale: 1.08,
    torso: [[0.215, 0, 0.006, 0.0005, 0.0005], [0.205, 0, 0.006, 0.05, 0.055], [0.155, 0, 0.003, 0.093, 0.094], [0.075, 0, 0.002, 0.1, 0.094], [-0.02, 0, -0.002, 0.092, 0.09], [-0.105, 0, -0.008, 0.098, 0.104], [-0.165, 0, 0.012, 0.084, 0.095], [-0.205, 0, 0.058, 0.066, 0.08], [-0.24, 0, 0.105, 0.046, 0.05], [-0.25, 0, 0.115, 0.0005, 0.0005]],
    torsoBump: (th, a) => (noise(Math.cos(th) * 7 + 4, Math.sin(th) * 7, a * 16) - 0.5) * 0.014,
    haunch: { x: 0.062, y: -0.02, z: 0.116, rx: 0.042, ry: 0.07, rz: 0.084 },
    paintBody,
    bodyFur: { patches: PATCH, ink: INK },
    headFur: { patches: [[0.052, 0.022, -0.066, 0.04], [-0.06, 0.056, -0.008, 0.04]], ink: INK },
    legFur: (s, front) => ({ patches: (front && s > 0) || (!front && s < 0) ? [[0, 0.02, 0, 0.088]] : [], ink: INK, toe }),
    headAt: [0, 0.122, -0.218], headRadius, paintHead,
    eyeDir: [0.46, 0.12, -0.88], eyeR: 0.0165, eyeWide: 1, eyeTilt: 0,
    nose: 0x17110f, noseR: 0.0185, noseDir: [0, -0.21, -0.98], noseShine: true,
    mouth: 0x3a2d28, mouthR: 0.0135, tongue: true, tongueDir: [0, -0.54, -0.84], morsel: true, acts: { treat: "sit" },
    mouthPaths: [[[0, -0.3, -0.95], [0, -0.45, -0.89]], [[-0.21, -0.47, -0.86], [-0.1, -0.52, -0.85], [0, -0.45, -0.89], [0.1, -0.52, -0.85], [0.21, -0.47, -0.86]]],
    earDir: [0.72, 0.62, 0.02],
    ear: {
      keys: [[0.006, 0, 0, 0.0005, 0.0005], [0, 0, 0, 0.03, 0.012], [-0.045, 0.006, 0, 0.044, 0.012], [-0.09, 0.008, 0, 0.038, 0.01], [-0.115, 0.004, 0, 0.018, 0.006], [-0.122, 0.002, 0, 0.0005, 0.0005]],
      paint: (s, x, y, z, c) => { const f = 1 + (noise(x * 70, y * 70, z * 70 + s) - 0.5) * 0.16; c[0] = INK[0] * f; c[1] = INK[1] * f; c[2] = INK[2] * f; },
      rx: 0.08, ry: 0.15, rz: 0.2, happy: -0.3, flop: 0.14,
    },
    frontHip: { x: 0.056, y: -0.055, z: -0.128 }, rearHip: { x: 0.068, y: -0.06, z: 0.132 },
    legKeys: (front) => front
      ? [[0.03, 0, 0, 0.0005, 0.0005], [0.012, 0, 0, 0.034, 0.042], [-0.035, 0, 0, 0.029, 0.033], [-0.08, 0, 0.002, 0.0225, 0.025], [-0.112, 0, 0.002, 0.0205, 0.022], [-0.128, 0, -0.005, 0.024, 0.029], [-0.138, 0, -0.01, 0.0255, 0.035], [-0.145, 0, -0.01, 0.0005, 0.0005]]
      : [[0.03, 0, 0, 0.0005, 0.0005], [0.01, 0, 0, 0.034, 0.05], [-0.03, 0, 0.012, 0.028, 0.04], [-0.075, 0, 0.02, 0.0215, 0.024], [-0.108, 0, 0.012, 0.0205, 0.021], [-0.125, 0, 0, 0.024, 0.029], [-0.135, 0, -0.007, 0.0255, 0.035], [-0.142, 0, -0.007, 0.0005, 0.0005]],
    paintLeg: (x, y, z, c) => mixC(WHITE, WHITE, 0, c),
    tailAt: [0, 0.03, 0.19], tailN: 3, tailSeg: 0.043, tailR: 0.021, tailTaper: 0.68,
    paintTail: (v, c) => mixC(INK, WHITE, sstep(0.62, 0.86, v), c),
    shadow: [0.135, 0.255], stride: 13, swing: 0.58, bounce: 0.012,
    sleepHead: -0.3,
    poses: {
      //    몸 높이, 앞뒤 기울기(+ = 머리 위로), 앞다리, 뒷다리, 머리(+ = 코 위로)
      walk: { y: 0.21, pitch: 0, front: 0, rear: 0, head: 0.04 },
      sit: { y: 0.172, pitch: 0.52, front: 0, rear: 1.26, head: 0.12 },
      lie: { y: 0.086, pitch: 0, front: 1.42, rear: 1.38, head: -0.1 },
      curl: { y: 0.086, pitch: 0, front: 1.42, rear: 1.38, head: -0.3 },
    },
    moveTail(tail, segs, { t, walking, sleeping, petted, pose }) {
      const lying = sleeping || pose === "lie";
      tail.rotation.x = lying ? 1.3 : pose === "sit" ? 1.12 : -0.72;       // 걸을 땐 치켜들고 쉴 땐 바닥에 내려서 살랑
      const speed = petted ? 24 : walking ? 13 : 4.6, amp = petted ? 0.62 : walking ? 0.25 : sleeping ? 0 : 0.17;
      tail.rotation.z = Math.sin(t * speed) * amp;
      segs.forEach((s, i) => { if (!i) return; s.rotation.x = lying || pose === "sit" ? -0.28 : 0.4; s.rotation.z = Math.sin(t * speed - i * 0.9) * amp * 0.65; });
    },
  });
}

/* 백구: 흰 진돗개 (사용자가 준 사진 참고). 긴 다리, 깊은 가슴과 잘록한 허리, 곧게 선 굵은 목과 목털, 역삼각형 얼굴,
   작은 갈색 아몬드 눈, 크게 선 세모 귀, 끝이 황토빛인 낫 모양 꼬리 */
function createJindo(THREE, { scale, coat, belly, back, tip }) {
  const COAT = rgb(coat), BELLY = rgb(belly), WARM = rgb(back), TIP = rgb(tip);
  const paintBody = (x, y, z, c) => { mixC(COAT, BELLY, sstep(-0.03, -0.08, y) * 0.7, c); mixC(c, WARM, sstep(0.05, 0.1, y) * (1 - sstep(-0.12, -0.2, z)) * 0.6, c); };
  const MUZ = norm([0, -0.28, -0.96]);
  const headRadius = (d) => {
    const R = 0.071 * (1 + 0.07 * Math.abs(d[0]) - 0.1 * Math.max(0, d[1]) - 0.05 * Math.max(0, -d[1]) - 0.16 * Math.max(0, d[2]));
    const muzzle = 0.066 * gauss(d, MUZ, 0.085);
    const cheek = 0.008 * (gauss(d, [0.84, -0.34, -0.1], 0.09) + gauss(d, [-0.84, -0.34, -0.1], 0.09));
    const brow = 0.004 * (gauss(d, [0.38, 0.4, -0.83], 0.025) + gauss(d, [-0.38, 0.4, -0.83], 0.025));
    return R + muzzle + cheek + brow;
  };
  const paintHead = (x, y, z, c) => { mixC(COAT, BELLY, z < -0.06 && y < 0.01 ? 0.8 : 0, c); mixC(c, WARM, sstep(0.03, 0.07, y) * 0.45, c); };
  const toe = [-0.192, -0.026, 0.0096];
  const paintLeg = (x, y, z, c) => mixC(COAT, BELLY, 0.3, c);
  return assemble(THREE, {
    scale,
    torso: [[0.25, 0, 0.012, 0.0005, 0.0005], [0.24, 0, 0.012, 0.045, 0.05], [0.19, 0, 0.012, 0.078, 0.085], [0.11, 0, 0.018, 0.071, 0.073], [0.02, 0, 0.008, 0.077, 0.087], [-0.08, 0, -0.004, 0.087, 0.106], [-0.16, 0, 0.015, 0.092, 0.108], [-0.225, 0, 0.098, 0.087, 0.102], [-0.262, 0, 0.158, 0.076, 0.086], [-0.285, 0, 0.19, 0.0005, 0.0005]],
    torsoBump: (th, a) => {       // 목둘레와 앞가슴은 털이 수북하다
      const down = sstep(-0.1, -0.8, Math.sin(th)), chest = sstep(-0.1, -0.17, a) * (1 - sstep(-0.22, -0.27, a));
      return (noise(Math.cos(th) * 8 + 2, Math.sin(th) * 8, a * 20) - 0.5) * (0.006 + 0.035 * sstep(-0.13, -0.2, a)) + down * chest * 0.07;
    },
    haunch: { x: 0.043, y: -0.02, z: 0.15, rx: 0.04, ry: 0.068, rz: 0.078 },
    paintBody,
    legFur: () => ({ toe }),
    headAt: [0, 0.185, -0.275], headRadius, paintHead,
    eyeDir: [0.42, 0.14, -0.9], eyeR: 0.0096, eyeWide: 1.32, eyeTilt: 0.3, iris: 0x3b2415, pupilW: 0.85, petClose: true,
    nose: 0x2c1c19, noseR: 0.0135, noseDir: [0, -0.17, -0.985], noseShine: true,
    mouth: 0x4a3a33, mouthR: 0.0115, tongue: true, tongueDir: [0, -0.46, -0.89], morsel: true, acts: { treat: "sit" },
    mouthPaths: [[[0, -0.25, -0.97], [0, -0.37, -0.93]], [[-0.15, -0.39, -0.91], [-0.07, -0.43, -0.9], [0, -0.37, -0.93], [0.07, -0.43, -0.9], [0.15, -0.39, -0.91]]],
    earDir: [0.5, 0.85, -0.04],
    ear: {
      keys: [[-0.012, 0, 0, 0.0005, 0.0005], [0, 0, 0, 0.038, 0.017], [0.032, 0, 0.002, 0.029, 0.013], [0.062, 0, 0.004, 0.015, 0.008], [0.08, 0, 0.005, 0.005, 0.004], [0.086, 0, 0.005, 0.0005, 0.0005]],
      inner: [[0.002, 0, -0.007, 0.0005, 0.0005], [0.008, 0, -0.007, 0.026, 0.009], [0.034, 0, -0.006, 0.018, 0.007], [0.056, 0, -0.004, 0.008, 0.004], [0.066, 0, -0.002, 0.0005, 0.0005]],
      innerC: rgb(0xe8bfb2),
      paint: (s, x, y, z, c) => mixC(COAT, TIP, sstep(0.01, 0.07, y) * 0.75, c),
      rx: -0.1, ry: 0.24, rz: -0.13, happy: 0.42, flop: 0.03,
    },
    frontHip: { x: 0.052, y: -0.06, z: -0.135 }, rearHip: { x: 0.056, y: -0.055, z: 0.16 },
    legKeys: (front) => front
      ? [[0.03, 0, 0, 0.0005, 0.0005], [0.012, 0, 0, 0.032, 0.042], [-0.05, 0, 0, 0.025, 0.031], [-0.12, 0, 0.002, 0.0175, 0.021], [-0.175, 0, 0.002, 0.016, 0.018], [-0.195, 0, -0.005, 0.0205, 0.026], [-0.206, 0, -0.009, 0.0215, 0.03], [-0.213, 0, -0.009, 0.014, 0.02], [-0.215, 0, -0.009, 0.0005, 0.0005]]
      : [[0.03, 0, 0, 0.0005, 0.0005], [0.01, 0, 0, 0.03, 0.052], [-0.05, 0, 0.018, 0.026, 0.04], [-0.115, 0, 0.04, 0.0175, 0.022], [-0.16, 0, 0.028, 0.016, 0.018], [-0.193, 0, 0.002, 0.0205, 0.026], [-0.204, 0, -0.006, 0.0215, 0.03], [-0.211, 0, -0.006, 0.014, 0.02], [-0.213, 0, -0.006, 0.0005, 0.0005]],
    paintLeg,
    tailAt: [0, 0.06, 0.225], tailN: 5, tailSeg: 0.046, tailR: 0.032, tailTaper: 0.93,
    paintTail: (v, c) => mixC(COAT, TIP, sstep(0.3, 0.9, v) * 0.8, c),
    shadow: [0.13, 0.31], stride: 10, swing: 0.5, bounce: 0.01,
    sleepHead: -0.4,
    poses: {
      walk: { y: 0.272, pitch: 0, front: 0, rear: 0, head: 0.04 },
      sit: { y: 0.18, pitch: 0.6, front: 0, rear: 1.46, head: -0.04 },
      lie: { y: 0.1, pitch: 0, front: 1.42, rear: 1.38, head: -0.05 },
      curl: { y: 0.1, pitch: 0, front: 1.42, rear: 1.38, head: -0.25 },
    },
    moveTail(tail, segs, { t, walking, sleeping, petted, pose }) {
      const lying = sleeping || pose === "lie", sitting = pose === "sit";   // 서면 낫처럼 세워 말고, 앉으면 낮추고, 누우면 바닥에 내린다
      tail.rotation.x = lying ? 1.42 : sitting ? 0.98 : 0.3;
      const speed = petted ? 20 : walking ? 10 : 3.6, amp = petted ? 0.42 : walking ? 0.08 : sleeping ? 0 : 0.04;
      tail.rotation.z = Math.sin(t * speed) * amp;
      segs.forEach((s, i) => { if (!i) return; s.rotation.x = lying ? -0.1 : sitting ? -0.3 : -0.62; s.rotation.z = Math.sin(t * speed - i * 0.9) * amp * 0.45; });
    },
  });
}

export const createBaekgu = (THREE) => createJindo(THREE, { scale: 1.15, coat: 0xf1eadb, belly: 0xfbf7ee, back: 0xe2d3b6, tip: 0xd9b98a });
// 황구: 같은 진돗개 몸에 누런 털, 배와 주둥이는 옅게, 등과 귀끝·꼬리끝은 짙게. 설탕이의 1.2배
export const createHwanggu = (THREE) => createJindo(THREE, { scale: 1.15 * 1.2, coat: 0xc58a3e, belly: 0xe9d2a6, back: 0xa96f2c, tip: 0x9a6227 });

export function createCat(THREE) {
  const WHITE = rgb(0xfdfaf4), SHADE = rgb(0xeee9e1), PINK = rgb(0xf0a3ac);
  const paint = (x, y, z, c) => mixC(WHITE, SHADE, clamp01(noise(x * 22 + 8, y * 22, z * 22) - 0.42) * 0.8, c);
  const MUZ = norm([0, -0.3, -0.95]);
  const headRadius = (d) => {
    const flat = 1 + 0.15 * Math.abs(d[0]) - 0.08 * Math.abs(d[1]);    // 납작하고 옆으로 조금 넓은 고양이 얼굴
    const muz = 0.015 * (gauss(d, norm([0.2, -0.32, -0.93]), 0.026) + gauss(d, norm([-0.2, -0.32, -0.93]), 0.026)) + 0.008 * gauss(d, norm([0, -0.5, -0.87]), 0.02) + 0.008 * gauss(d, MUZ, 0.05);
    const cheek = 0.0085 * (gauss(d, [0.88, -0.28, -0.3], 0.045) + gauss(d, [-0.88, -0.28, -0.3], 0.045));   // 볼털
    return 0.07 * flat + muz + cheek;
  };
  const paintHead = (x, y, z, c) => {
    paint(x, y, z, c);
    const blush = (Math.hypot(Math.abs(x) - 0.05, y + 0.012, z + 0.058) < 0.012 ? 0.1 : 0);    // 볼에 아주 옅은 분홍
    mixC(c, PINK, blush, c);
  };
  return assemble(THREE, {
    scale: 1.08,
    torso: [[0.19, 0, 0.014, 0.0005, 0.0005], [0.178, 0, 0.012, 0.042, 0.046], [0.125, 0, 0.012, 0.072, 0.074], [0.055, 0, 0.012, 0.07, 0.07], [-0.03, 0, 0.0, 0.062, 0.066], [-0.1, 0, -0.008, 0.068, 0.077], [-0.15, 0, 0.008, 0.06, 0.072], [-0.185, 0, 0.05, 0.05, 0.062], [-0.215, 0, 0.09, 0.036, 0.04], [-0.225, 0, 0.1, 0.0005, 0.0005]],
    torsoBump: (th, a) => { const down = sstep(-0.1, -0.8, Math.sin(th)), chest = sstep(-0.09, -0.16, a) * (1 - sstep(-0.17, -0.2, a)); return (noise(Math.cos(th) * 9, Math.sin(th) * 9 + 3, a * 24) - 0.5) * 0.03 + down * chest * 0.1; },   // 앞가슴 털
    haunch: { x: 0.045, y: -0.016, z: 0.098, rx: 0.031, ry: 0.06, rz: 0.074 },
    paintBody: paint,
    legFur: () => ({ toe: [-0.117, -0.014, 0.0062] }),
    headAt: [0, 0.106, -0.19], headRadius, paintHead,
    eyeDir: [0.47, 0.13, -0.87], eyeR: 0.0138, eyeWide: 1.14, eyeTilt: 0.2, iris: 0x6db4cf,
    nose: 0xe88d9a, noseR: 0.0078, noseDir: [0, -0.2, -0.98],
    mouth: 0x9a7a78, mouthR: 0.0074, whiskers: true, tongue: true, tongueDir: [0, -0.46, -0.89], acts: { churu: "lick", pat: "rump" },
    mouthPaths: [[[0, -0.24, -0.97], [0, -0.35, -0.94]], [[-0.14, -0.35, -0.93], [-0.07, -0.4, -0.91], [0, -0.35, -0.94], [0.07, -0.4, -0.91], [0.14, -0.35, -0.93]]],
    earDir: [0.56, 0.78, -0.1],
    ear: {
      keys: [[-0.008, 0, 0, 0.0005, 0.0005], [0, 0, 0, 0.036, 0.016], [0.028, 0, 0.002, 0.026, 0.011], [0.054, 0, 0.003, 0.012, 0.006], [0.07, 0, 0.004, 0.003, 0.002], [0.074, 0, 0.004, 0.0005, 0.0005]],
      inner: [[0.002, 0, -0.004, 0.0005, 0.0005], [0.008, 0, -0.004, 0.024, 0.009], [0.03, 0, -0.003, 0.016, 0.007], [0.052, 0, -0.001, 0.006, 0.003], [0.058, 0, 0, 0.0005, 0.0005]],
      innerC: PINK,
      paint: (s, x, y, z, c) => { c[0] = WHITE[0]; c[1] = WHITE[1]; c[2] = WHITE[2]; },
      rx: -0.08, ry: 0.32, rz: -0.28, happy: 0.32, flop: 0.03,
    },
    frontHip: { x: 0.038, y: -0.042, z: -0.108 }, rearHip: { x: 0.048, y: -0.046, z: 0.112 },
    legKeys: (front) => front
      ? [[0.024, 0, 0, 0.0005, 0.0005], [0.01, 0, 0, 0.024, 0.03], [-0.035, 0, 0, 0.0195, 0.023], [-0.08, 0, 0.001, 0.0145, 0.016], [-0.114, 0, 0.001, 0.0132, 0.0145], [-0.127, 0, -0.004, 0.0168, 0.022], [-0.135, 0, -0.008, 0.018, 0.026], [-0.14, 0, -0.008, 0.0005, 0.0005]]
      : [[0.024, 0, 0, 0.0005, 0.0005], [0.008, 0, 0, 0.024, 0.038], [-0.035, 0, 0.012, 0.0195, 0.029], [-0.08, 0, 0.018, 0.0145, 0.017], [-0.112, 0, 0.01, 0.0132, 0.015], [-0.125, 0, 0, 0.0168, 0.022], [-0.133, 0, -0.006, 0.018, 0.026], [-0.138, 0, -0.006, 0.0005, 0.0005]],
    paintLeg: paint,
    tailAt: [0, 0.034, 0.168], tailN: 6, tailSeg: 0.05, tailR: 0.0168, tailTaper: 0.92,
    paintTail: (v, c) => { c[0] = WHITE[0]; c[1] = WHITE[1]; c[2] = WHITE[2]; },
    shadow: [0.105, 0.225], stride: 7.5, swing: 0.4, bounce: 0.004,
    sleepHead: -0.12,
    poses: {
      walk: { y: 0.178, pitch: 0, front: 0, rear: 0, head: 0.02 },
      sit: { y: 0.142, pitch: 0.72, front: 0, rear: 1.46, head: 0.06 },
      lie: { y: 0.072, pitch: 0, front: 1.5, rear: 1.4, head: -0.05 },
      curl: { y: 0.066, pitch: 0, front: -1.36, rear: 1.42, head: -0.5 },   // 앞발은 가슴 밑으로 접어 넣는다
      lick: { y: 0.142, pitch: 0.72, front: 0, rear: 1.46, head: 0.1 },     // 앉아서 고개 들고 츄르
      rump: { y: 0.16, pitch: -0.22, front: 0.82, rear: 0, head: 0.2 },     // 앞은 낮추고 엉덩이를 치켜든다 (궁디팡팡)
    },
    moveTail(tail, segs, { t, walking, pose }) {
      const curled = pose === "curl", raised = pose === "rump", low = !walking && !curled && !raised;
      tail.position.x = curled ? 0.082 : low ? 0.02 : 0;      // 웅크리면 옆구리에 붙이고, 앉으면 몸 곁에 내려 둔다
      tail.position.y = curled ? -0.052 : low ? -0.05 : 0.034;
      tail.position.z = curled ? 0.13 : 0.168;
      tail.rotation.set(curled ? -1.56 : low ? 1.42 : raised ? -0.02 : -0.3, 0, raised ? Math.sin(t * 26) * 0.05 : curled ? 0 : low ? -0.5 + Math.sin(t * (pose === "lick" ? 3 : 0.7)) * (pose === "lick" ? 0.16 : 0.05) : Math.sin(t * 1.15) * 0.14);   // 궁디팡팡엔 꼬리를 곧추세워 떨고, 츄르엔 살랑
      segs.forEach((s, i) => {
        if (!i) return;
        const wave = Math.sin(t * (walking ? 1.8 : 0.9) - i * 0.7);
        if (curled) { s.rotation.set(0, 0, 0.12); return; }       // 옆구리를 따라 앞으로 감는다
        if (raised) { s.rotation.set(i === segs.length - 1 ? -0.5 : -0.03, 0, Math.sin(t * 26 - i) * 0.03); return; }
        if (low) { s.rotation.set(0, 0, -0.16 + (i === segs.length - 1 ? wave * 0.25 : 0)); return; }  // 끝만 살랑
        s.rotation.set(i < 3 ? -0.24 : 0.2, 0, wave * 0.14);       // 걸을 땐 S자로 세운다
      });
    },
  });
}
