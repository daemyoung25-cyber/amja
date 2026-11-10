/* 내리는 눈. 카메라 둘레 상자 안에서만 그리고, 상자를 벗어난 송이는 반대편으로 돌려보내
   끝없이 내리는 것처럼 보이게 한다. 점은 빛을 받지 않으니 밤엔 하늘 밝기만큼 어둡게 칠하고,
   법당·굴·암자·다실 안에서는 지붕 아래로 눈이 보이지 않게 천천히 숨긴다. */
import { skyAt } from "../logic/sky.js";

const COUNT = 2600;            // 한창일 때 송이 수 (폰에서도 가볍게)
const W = 36, H = 18, BELOW = 6;   // 상자: 가로·세로 36m, 높이 18m (카메라 6m 아래부터)

const wrap = (v, c, size) => c + ((((v - c + size / 2) % size) + size) % size) - size / 2;

export function createSnow(THREE, scene, rand = Math.random) {
  const pos = new Float32Array(COUNT * 3), fall = new Float32Array(COUNT), phase = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    pos[i * 3] = (rand() - 0.5) * W;
    pos[i * 3 + 1] = rand() * H - BELOW;
    pos[i * 3 + 2] = (rand() - 0.5) * W;
    fall[i] = 0.55 + rand() * 0.6;          // m/s, 송이마다 조금씩 다르게
    phase[i] = rand() * Math.PI * 2;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));

  // 가장자리가 부드럽게 사라지는 동그란 송이
  const c = document.createElement("canvas");
  c.width = c.height = 32;
  const g = c.getContext("2d"), grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
  grad.addColorStop(0, "rgba(255,255,255,1)");
  grad.addColorStop(0.45, "rgba(255,255,255,0.8)");
  grad.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 32, 32);
  const map = new THREE.CanvasTexture(c);
  map.colorSpace = THREE.SRGBColorSpace;

  const mat = new THREE.PointsMaterial({ size: 0.16, map, transparent: true, depthWrite: false, opacity: 0.9 });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.visible = false;
  scene.add(points);

  let t = 0, shown = 0, lightTimer = 1, light = 1, placed = false;

  // amount: 0..1 (logic/snow.js), indoor: 지붕 아래인지
  function update(date, dt, camPos, amount, indoor) {
    const goal = indoor ? 0 : amount;
    shown += (goal - shown) * Math.min(1, dt * 1.5);
    if (goal === 0 && shown < 0.01) shown = 0;
    points.visible = shown > 0;
    if (!points.visible) return;
    t += dt;
    lightTimer += dt;
    if (lightTimer >= 1) { lightTimer = 0; light = skyAt(date).light; mat.color.setScalar(0.3 + 0.7 * light); }
    if (!placed) {   // 처음 보일 때 카메라 둘레로 옮겨 놓는다
      placed = true;
      for (let i = 0; i < COUNT; i++) { pos[i * 3] += camPos.x; pos[i * 3 + 1] += camPos.y; pos[i * 3 + 2] += camPos.z; }
    }
    const n = Math.floor(COUNT * shown);
    geo.setDrawRange(0, n);
    const bottom = camPos.y - BELOW;
    for (let i = 0; i < n; i++) {
      const k = i * 3, ph = phase[i];
      // 바다 쪽(-z)에서 불어오는 바람에 살짝 흔들리며 내린다
      pos[k] = wrap(pos[k] + (0.25 + 0.3 * Math.sin(t * 0.6 + ph)) * dt, camPos.x, W);
      pos[k + 2] = wrap(pos[k + 2] + (0.2 + 0.25 * Math.cos(t * 0.8 + ph * 1.3)) * dt, camPos.z, W);
      let y = pos[k + 1] - fall[i] * dt;
      if (y < bottom) y += H; else if (y > bottom + H) y -= H;
      pos[k + 1] = y;
    }
    geo.attributes.position.needsUpdate = true;
  }

  return { update, points };
}
