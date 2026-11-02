/* 동굴 법당(관음굴): 마당 왼쪽 뒤 바위 절벽에 뚫린 아치 굴. 논산 반야사 동굴법당을 모티브로,
   거친 바위 굴 안을 파랑·다홍·보라 빛이 아래에서 비추고, 맨 안쪽 불단 위에 큰 금빛 광배를 두른 천수관음.
   절벽 앞은 돌계단, 굴 어귀 위에 '觀音窟' 새김. 굴 안은 햇빛이 닿지 않게 미리 빛을 칠한 재질(MeshBasic)로. */
import { makeNoise, boulderGeometry } from "./landscape.js";

const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function createCave(THREE, { cave, yardBackZ }) {
  const { x: CX, floor: FL, door, altar } = cave;
  const n = makeNoise(31);
  const group = new THREE.Group();
  const pickables = [], obstacles = [];
  const PW = 1.5, PH = 3.0;                                   // 굴 어귀 반폭, 높이 (바닥에서)
  const TW = 3.0, TH = 3.7, TZ0 = door.z + 0.15, TZ1 = altar.z + 0.9;   // 굴 안 반폭·높이·앞뒤
  const inArch = (x, y) => { const dx = (x - CX) / PW; return Math.abs(dx) < 1 && y - FL < (PH - PW) + PW * Math.sqrt(1 - dx * dx) && y > FL - 2; };

  /* 바위 절벽 앞면: 울퉁불퉁한 화강암 벽(마당 쪽으로 불거진다, 뒤로 패면 굴 안벽이 비친다), 어귀 자리는 뚫고, 위로 갈수록 뒤로 눕는다 */
  {
    const W = 24, H = 13, g = new THREE.PlaneGeometry(W, H, 96, 52);
    const pos = g.attributes.position, col = new Float32Array(pos.count * 3), c = new THREE.Color();
    const lightRock = new THREE.Color(0xb7ad9c), darkRock = new THREE.Color(0x5e554b);
    for (let i = 0; i < pos.count; i++) {
      const x = CX + pos.getX(i), y = pos.getY(i) + H / 2 - 0.8;
      const near = Math.hypot((x - CX) / 2.6, (y - FL - 1.8) / 3.2);       // 어귀 둘레는 반듯하게 (새김판이 박히게)
      const bump = (n.fbm(x / 3, y / 3, 4) * 1.6 + n.ridged(x / 1.2, y / 6, 3) * 0.6) * smooth(0.9, 1.6, near);
      const z = door.z - bump * 0.8 + Math.pow(Math.max(0, y - 6) / 7, 2) * 5 + 0.3 * Math.pow(Math.abs(x - CX) / 12, 2) * 6;
      pos.setXYZ(i, x, y, z);
      const k = n.fbm(x / 1.5 + 9, y / 4, 3), streak = n.fbm(x * 2.2, y / 9 + 3, 2);   // 세로로 흘러내린 물때
      c.copy(darkRock).lerp(lightRock, smooth(0.3, 0.7, k)).multiplyScalar(0.75 + 0.35 * streak);
      col.set([c.r, c.g, c.b], i * 3);
    }
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    // 어귀 자리 삼각형을 뺀다
    const idx = g.index.array, keep = [];
    const v = (k) => [pos.getX(k), pos.getY(k)];
    for (let i = 0; i < idx.length; i += 3) {
      const [a, b, d] = [idx[i], idx[i + 1], idx[i + 2]].map(v);
      const mx = (a[0] + b[0] + d[0]) / 3, my = (a[1] + b[1] + d[1]) / 3;
      if (!inArch(mx, my)) keep.push(idx[i], idx[i + 1], idx[i + 2]);
    }
    g.setIndex(keep);
    g.computeVertexNormals();
    const face = new THREE.Mesh(g, new THREE.MeshLambertMaterial({ vertexColors: true, side: THREE.DoubleSide }));
    group.add(face); pickables.push(face); obstacles.push(face);
  }

  /* 절벽 위와 양옆을 덮는 큰 바위 덩어리 (굴 안으로는 파고들지 않게) */
  {
    const rockMat = new THREE.MeshLambertMaterial({ vertexColors: true, color: 0xd8d0c2 });
    const spots = [[-11, 2.5, 26, 5.5], [11, 2, 26, 5], [-7.5, 9, 30, 6], [7.5, 9.5, 31, 6.5], [0, 14, 33, 7], [-12.5, 6, 31, 6], [12, 6, 32, 6], [0, 9, 42, 7]];
    spots.forEach(([dx, y, z, s], i) => {
      const b = new THREE.Mesh(boulderGeometry(THREE, 70 + i), rockMat);
      b.position.set(CX + dx, y, z);
      b.scale.set(s, s * 0.8, s);
      b.rotation.y = i * 1.3;
      group.add(b); pickables.push(b); obstacles.push(b);
    });
  }

  /* 굴 안: 반타원 굴(앞뒤로 길게) + 안쪽 막힌 벽 + 어귀 쪽 안벽. 햇빛은 닿지 않고, 벽 아래 조명이 비춘다:
     왼쪽 벽 파랑, 오른쪽 벽 다홍, 가운데 보라(천장), 불단 쪽 금빛 촛불. 빛은 바위 굴곡을 따라 셰이더에서 계산한다 */
  // 꼭짓점 색 = 바위 바탕색만 (따뜻한 회색 화강암, 자리마다 조금씩 다르게, 바닥 가까이는 젖어서 어둡게)
  const rockColor = (x, y, z) => {
    const k = n.fbm(x * 0.35 + z * 0.2, y * 0.5 + z * 0.15, 3);
    const c = new THREE.Color(0.46, 0.42, 0.38).lerp(new THREE.Color(0.30, 0.29, 0.30), smooth(0.35, 0.7, k));
    return c.multiplyScalar(0.75 + 0.25 * smooth(FL - 0.1, FL + 0.8, y));
  };
  const lights = [], lightCols = [];
  const addLight = (x, y, z, hex, k) => { lights.push(new THREE.Vector3(x, y, z)); lightCols.push(new THREE.Color(hex).multiplyScalar(k)); };
  for (let i = 0; i < 3; i++) {
    const z = TZ0 + 0.8 + i * 2.5;
    addLight(CX - TW * 0.8, FL + 0.2, z, 0x3d6cff, 1.5);          // 왼쪽: 파랑
    addLight(CX + TW * 0.8, FL + 0.2, z, 0xff5a2a, 1.5);          // 오른쪽: 다홍
  }
  addLight(CX, FL + 0.3, (TZ0 + TZ1) / 2 - 0.5, 0x9a5cff, 0.45);    // 가운데 바닥: 천장을 보랏빛으로
  addLight(CX, FL + 1.1, TZ1 - 1.6, 0xffb24a, 1.8);                // 불단 촛불: 금빛
  const rockUni = { uLights: { value: lights }, uLightCols: { value: lightCols }, uTime: { value: 0 } };
  const innerMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide, toneMapped: false });
  // 바위 결: 3D 노이즈로 높낮이를 만들어 면 방향을 흔들고(빛이 결을 따라 걸린다), 갈라진 틈은 어둡게
  innerMat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, rockUni);
    sh.vertexShader = sh.vertexShader.replace("void main() {", "varying vec3 vWp;\nvarying vec3 vN;\nvoid main() {\n  vWp = (modelMatrix * vec4(position, 1.0)).xyz;\n  vN = normalize(mat3(modelMatrix) * normal);");
    sh.fragmentShader = sh.fragmentShader.replace("void main() {", `varying vec3 vWp;
      varying vec3 vN;
      uniform vec3 uLights[8];
      uniform vec3 uLightCols[8];
      uniform float uTime;
      float h3(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
      float n3(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(mix(h3(i), h3(i + vec3(1,0,0)), f.x), mix(h3(i + vec3(0,1,0)), h3(i + vec3(1,1,0)), f.x), f.y),
                   mix(mix(h3(i + vec3(0,0,1)), h3(i + vec3(1,0,1)), f.x), mix(h3(i + vec3(0,1,1)), h3(i + vec3(1,1,1)), f.x), f.y), f.z); }
      float rock(vec3 p){
        float r = 1.0 - abs(2.0 * n3(p * 1.6 + vec3(0.0, 0.0, p.y * 0.4)) - 1.0);
        return 0.5 * n3(p * 0.9) + 0.3 * r * r + 0.13 * n3(p * 4.3) + 0.07 * n3(p * 11.0);
      }
      void main() {`).replace("#include <color_fragment>", `#include <color_fragment>
        vec3 p = vWp;
        float h = rock(p);
        vec2 e = vec2(0.03, 0.0);
        vec3 grad = vec3(rock(p + e.xyy) - h, rock(p + e.yxy) - h, rock(p + e.yyx) - h) / e.x;
        vec3 V = normalize(cameraPosition - p);
        vec3 N = normalize(vN);
        if (dot(N, V) < 0.0) N = -N;
        N = normalize(N - 0.5 * (grad - dot(grad, N) * N));
        float crev = smoothstep(0.3, 0.12, h);
        float speck = step(0.93, h3(floor(p * 60.0))) * 0.25;
        vec3 albedo = diffuseColor.rgb * (0.4 + 0.9 * h) * (1.0 - 0.55 * crev) + speck * 0.12;
        vec3 lit = vec3(0.02, 0.02, 0.028);
        for (int i = 0; i < 8; i++) {
          vec3 L = uLights[i] - p;
          float d2 = dot(L, L);
          L *= inversesqrt(d2);
          float fl = i == 7 ? 0.85 + 0.15 * sin(uTime * 7.0) * sin(uTime * 3.1) : 1.0;
          lit += uLightCols[i] * fl * (0.06 + 0.94 * max(0.0, dot(N, L))) / (1.0 + d2 * 2.0);
        }
        lit = mix(lit, vec3(dot(lit, vec3(0.3, 0.5, 0.2))), 0.25);
        vec3 c = albedo * lit;
        diffuseColor.rgb = c / (1.0 + 0.6 * c);`);
  };
  {
    const SU = 64, SV = 48, pos = [], col = [], index = [];
    for (let j = 0; j <= SV; j++) {
      const z = TZ0 + (TZ1 - TZ0) * j / SV;
      for (let i = 0; i <= SU; i++) {
        const th = Math.PI * i / SU;
        const r = 1 + 0.2 * (n.fbm(th * 3 + 5, z / 1.3, 4) - 0.5) * 2 + 0.09 * n.ridged(th * 7, z * 1.1, 3) + 0.04 * (n.fbm(th * 18, z * 3, 2) - 0.5);
        const x = CX + Math.cos(th) * TW * r, y = FL - 0.15 + Math.sin(th) * TH * r;
        pos.push(x, y, z);
        const c = rockColor(x, y, z); col.push(c.r, c.g, c.b);
      }
    }
    for (let j = 0; j < SV; j++) for (let i = 0; i < SU; i++) {
      const a = j * (SU + 1) + i, b = a + SU + 1;
      index.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(index);
    g.computeVertexNormals();
    group.add(new THREE.Mesh(g, innerMat));
    // 안쪽 막힌 벽과 어귀 쪽 안벽 (어귀 자리는 뚫는다)
    const cap = (z, hole) => {
      const sh = new THREE.Shape();
      sh.moveTo(CX - TW * 1.2, FL - 0.6);
      for (let i = 0; i <= 24; i++) { const th = Math.PI * i / 24; sh.lineTo(CX + Math.cos(Math.PI - th) * TW * 1.2, FL - 0.15 + Math.max(0, Math.sin(th)) * TH * 1.15); }
      sh.lineTo(CX + TW * 1.2, FL - 0.6);                         // 바닥 아래로 닫는다 (구멍이 바깥 선에 닿으면 면이 안 생긴다)
      if (hole) {
        const h = new THREE.Path();
        h.moveTo(CX - PW, FL - 0.3);
        h.lineTo(CX - PW, FL + PH - PW);
        h.absarc(CX, FL + PH - PW, PW, Math.PI, 0, true);
        h.lineTo(CX + PW, FL - 0.3);
        sh.holes.push(h);
      }
      const cg = new THREE.ShapeGeometry(sh, 12), cp = cg.attributes.position, cc = new Float32Array(cp.count * 3);
      for (let i = 0; i < cp.count; i++) { cp.setZ(i, z); const c = rockColor(cp.getX(i), cp.getY(i), z); cc.set([c.r, c.g, c.b], i * 3); }
      cg.setAttribute("color", new THREE.BufferAttribute(cc, 3));
      group.add(new THREE.Mesh(cg, innerMat));
    };
    cap(TZ1, false);
    cap(TZ0 + 0.05, true);
  }

  /* 바닥: 어두운 돌 바닥, 방석 자리엔 초록 깔개 */
  {
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(TW * 2.3, TZ1 - TZ0 + 0.2), new THREE.MeshBasicMaterial({ color: 0x2a2724 }));
    fl.rotation.x = -Math.PI / 2;
    fl.position.set(CX, FL + 0.005, (TZ0 + TZ1) / 2);
    group.add(fl); pickables.push(fl);
    const mat = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 2.6), new THREE.MeshBasicMaterial({ color: 0x2f4a33 }));
    mat.rotation.x = -Math.PI / 2;
    mat.position.set(CX, FL + 0.012, cave.seats[0].z);
    group.add(mat); pickables.push(mat);
    const cushion = new THREE.MeshLambertMaterial({ color: 0x7a2420, emissive: 0x3a100c });
    for (const s of cave.seats) {
      const cu = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.08, 0.62), cushion);
      cu.position.set(s.x, FL + 0.05, s.z);
      group.add(cu); pickables.push(cu);
    }
  }

  /* 불단과 촛불, 연등 */
  const flames = [];
  {
    const altarZ = altar.z - 0.75;
    const wood = new THREE.MeshLambertMaterial({ color: 0x5c1d14, emissive: 0x2e0d08 }), goldTrim = new THREE.MeshLambertMaterial({ color: 0xc9a046, emissive: 0x2a1c05 });
    const top = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.85, 0.8), wood);
    top.position.set(CX, FL + 0.425, altarZ);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(4.64, 0.06, 0.84), goldTrim);
    trim.position.set(CX, FL + 0.85, altarZ);
    group.add(top, trim);
    // 작은 초 두 줄 (불단 앞자락)
    const candleGeo = new THREE.CylinderGeometry(0.025, 0.025, 0.12, 6), flameGeo = new THREE.SphereGeometry(1, 6, 4);
    const wax = new THREE.MeshBasicMaterial({ color: 0xf2ead8 }), flameMat = new THREE.MeshBasicMaterial({ color: 0xffc35a });
    const N = 28, candles = new THREE.InstancedMesh(candleGeo, wax, N), fl = new THREE.InstancedMesh(flameGeo, flameMat, N);
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < N; i++) {
      const row = i % 2, k = Math.floor(i / 2), x = CX - 2.1 + (k + (row ? 0.5 : 0)) * (4.2 / 13.5), z = altarZ - 0.28 + row * 0.16;
      m4.makeTranslation(x, FL + 0.91, z); candles.setMatrixAt(i, m4);
      flames.push({ x, y: FL + 1.0, z, ph: i * 1.7 });
    }
    group.add(candles, fl);
    flames.mesh = fl;
    // 양옆 연꽃 등 (분홍·연두, 스스로 빛난다)
    for (const [sx, col] of [[-1, 0xff8fb8], [1, 0x9fe08a]]) {
      const lotus = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), new THREE.MeshBasicMaterial({ color: col }));
      lotus.scale.y = 0.75;
      lotus.position.set(CX + sx * 1.9, FL + 1.12, altarZ);
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 5), goldTrim);
      stem.position.set(CX + sx * 1.9, FL + 0.97, altarZ);
      group.add(lotus, stem);
    }
  }

  /* 천수관음: 금빛 연꽃 대좌 위 불상(법당 불상 모델을 빌려 온다) + 큰 둥근 광배, 둘레로 부챗살처럼 뻗은 천 개의 손 */
  const gold = new THREE.MeshStandardMaterial({ color: 0xd9a940, metalness: 0.85, roughness: 0.35, envMapIntensity: 0.9, emissive: 0x3a2508 });
  const statueSpot = new THREE.Group();
  statueSpot.position.set(CX, FL + 0.9, altar.z + 0.15);
  group.add(statueSpot);
  {
    const ped = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.35, 16), gold);
    ped.position.y = 0.17;
    statueSpot.add(ped);
    const halo = new THREE.Group();
    halo.position.set(0, 1.45, 0.42);
    statueSpot.add(halo);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.25, 48), gold);
    disc.rotation.y = Math.PI;
    halo.add(disc);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.32, 0.05, 6, 64), gold);
    halo.add(rim);
    // 손: 안쪽 원(두 겹)에 크게, 바깥 테에 작게 (인스턴스)
    const armGeo = new THREE.BoxGeometry(0.035, 0.42, 0.02); armGeo.translate(0, 0.21, 0);
    const handGeo = new THREE.SphereGeometry(0.045, 6, 4);
    const rings = [[0.55, 18, 0.9], [0.85, 26, 0.8], [1.12, 38, 0.65]];
    const total = rings.reduce((s, r) => s + r[1], 0);
    const arms = new THREE.InstancedMesh(armGeo, gold, total), hands = new THREE.InstancedMesh(handGeo, gold, total);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), p = new THREE.Vector3(), sc = new THREE.Vector3(), zAxis = new THREE.Vector3(0, 0, 1);
    let k = 0;
    for (const [r, cnt, s] of rings) for (let i = 0; i < cnt; i++, k++) {
      const a = (i / cnt) * Math.PI * 2 + r;
      q.setFromAxisAngle(zAxis, a - Math.PI / 2);
      p.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, -0.03);
      arms.setMatrixAt(k, m4.compose(p, q, sc.set(s, s, s)));
      hands.setMatrixAt(k, m4.compose(p.set(Math.cos(a) * (r * 0.55 + 0.4 * s), Math.sin(a) * (r * 0.55 + 0.4 * s), -0.04), q, sc.set(s, s * 1.3, s)));
    }
    halo.add(arms, hands);
  }
  // 불상 모델을 받으면 대좌 위에 앉힌다 (그 전에는 금빛 광배와 대좌만)
  function setStatue(obj) {
    obj.position.set(0, 0.34, 0);
    statueSpot.add(obj);
  }

  /* 돌계단: 마당 뒤끝에서 굴 어귀까지 여덟 단, 양옆 낮은 돌 난간 */
  {
    const stone = new THREE.MeshLambertMaterial({ color: 0x9b9281 });
    const steps = 8, run = (door.z - yardBackZ) / steps;
    for (let i = 0; i < steps; i++) {
      const h = FL * (i + 1) / steps;
      const st = new THREE.Mesh(new THREE.BoxGeometry(1.9, h, run + 0.02), stone);
      st.position.set(CX, h / 2, yardBackZ + run * (i + 0.5));
      group.add(st); pickables.push(st);
    }
    const landing = new THREE.Mesh(new THREE.BoxGeometry(3.2, FL, TZ0 - door.z + 0.8), stone);
    landing.position.set(CX, FL / 2, door.z + 0.1);
    group.add(landing); pickables.push(landing);
    for (const sx of [-1, 1]) {
      const curb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.5, door.z - yardBackZ), stone);
      curb.position.set(CX + sx * 1.06, 0.25, (door.z + yardBackZ) / 2);
      curb.rotation.x = -Math.atan2(FL, door.z - yardBackZ);
      curb.position.y = FL / 2 + 0.25;
      group.add(curb);
    }
  }

  /* 어귀 둘레 돌 테두리: 반원 아치와 양 기둥 */
  {
    const rimMat = new THREE.MeshLambertMaterial({ color: 0x7d7568 });
    const arch = new THREE.Mesh(new THREE.TorusGeometry(PW + 0.12, 0.2, 8, 24, Math.PI), rimMat);
    arch.position.set(CX, FL + PH - PW, door.z - 0.05);
    group.add(arch);
    for (const sx of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.4, PH - PW + 0.2, 0.42), rimMat);
      post.position.set(CX + sx * (PW + 0.12), FL + (PH - PW) / 2 - 0.1, door.z - 0.05);
      group.add(post);
    }
  }

  /* 굴 어귀 위 새김판 '觀音窟' (돌에 새긴 금빛 글씨) */
  {
    const c = document.createElement("canvas"); c.width = 512; c.height = 160;
    const g = c.getContext("2d");
    g.fillStyle = "#8e8576"; g.fillRect(0, 0, 512, 160);
    g.strokeStyle = "#5f574b"; g.lineWidth = 10; g.strokeRect(5, 5, 502, 150);
    g.font = '700 108px "Batang","Nanum Myeongjo","AppleMyungjo",serif';
    g.textAlign = "center"; g.textBaseline = "middle";
    g.fillStyle = "#3d352c"; g.fillText("觀音窟", 259, 86);           // 새긴 홈의 그늘
    g.fillStyle = "#c9a046"; g.fillText("觀音窟", 256, 82);
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.75), new THREE.MeshLambertMaterial({ map: tex }));
    sign.position.set(CX, FL + PH + 0.75, door.z - 0.08);   // 면의 앞은 +z라 반 바퀴 돌려 마당(-z)을 보게
    sign.rotation.y = Math.PI;
    group.add(sign);
  }

  // 어귀 양옆 작은 석등 (밤에 따뜻하게)
  const glowMat = new THREE.MeshBasicMaterial({ color: 0xffc77a, transparent: true, opacity: 0.3 });
  for (const sx of [-1, 1]) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.28, 1.1, 0.28), new THREE.MeshLambertMaterial({ color: 0x8d877b }));
    post.position.set(CX + sx * 2.1, FL + 0.55, door.z - 0.6);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.3, 0.34), glowMat);
    lamp.position.set(CX + sx * 2.1, FL + 1.25, door.z - 0.6);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.22, 4), new THREE.MeshLambertMaterial({ color: 0x6f695f }));
    roof.rotation.y = Math.PI / 4;
    roof.position.set(CX + sx * 2.1, FL + 1.5, door.z - 0.6);
    group.add(post, lamp, roof);
  }

  const fm = new THREE.Matrix4(), fq = new THREE.Quaternion(), fp = new THREE.Vector3(), fs = new THREE.Vector3();
  function update(t) {
    flames.forEach((f, i) => {
      const k = 1 + Math.sin(t * 11 + f.ph) * 0.12 + Math.sin(t * 6.3 + f.ph * 2) * 0.08;
      flames.mesh.setMatrixAt(i, fm.compose(fp.set(f.x, f.y, f.z), fq, fs.set(0.013, 0.03 * k, 0.013)));
    });
    flames.mesh.instanceMatrix.needsUpdate = true;
    rockUni.uTime.value = t;
  }
  function setNight(night) { glowMat.opacity = 0.3 + 0.7 * night; }

  return { group, pickables, obstacles, update, setNight, setStatue };
}
