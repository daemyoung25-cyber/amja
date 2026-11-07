/* 동자승 다섯의 그림과 놀잇감. 움직임은 logic/novices.js. 멀리 있으면 그리지 않아 폰이 덜 힘들다.
   누군가 들어오면 한 명이 달려가 말을 걸고 놀던 자리로 돌아간다 (일정표를 잠시 벗어나고, 서버에 쓰지 않는다). */
import { NOVICES, NOVICE_SCALE, noviceFor, noviceLine } from "../logic/novices.js";
import { petAt } from "../logic/pets.js";
import { floorY, routeAround, COURTYARD, RAIL_Z } from "../logic/layout.js";
import { createAvatar } from "./avatar.js";

const CLOSE_ENOUGH = 14, DRAW_WITHIN = 45, RUN = 1.6, TALK_GAP = 0.95, TALK_MS = 4200, GIVE_UP_MS = 40000, MAX_TALKING = 2;
const canVisit = (p) => p && p.x > COURTYARD.minX && p.x < COURTYARD.maxX && p.z > RAIL_Z && p.z < 4.6 && floorY(p) < 0.01;   // 앞마당에 있는 분께만

function createJegi(THREE) {                          // 제기: 엽전에 깃털 술
  const g = new THREE.Group();
  const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.018, 12), new THREE.MeshLambertMaterial({ color: 0xb08a3c }));
  g.add(coin);
  [[0xf4f1e8, 0, 0], [0xd8483c, 0.022, 0.2], [0xf4f1e8, -0.022, -0.2], [0x3f6fb5, 0, 0.4]].forEach(([c, x, tilt]) => {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.12, 6), new THREE.MeshLambertMaterial({ color: c }));
    f.position.set(x, 0.065, 0); f.rotation.z = -tilt * 0.6; f.rotation.y = tilt; g.add(f);
  });
  g.scale.setScalar(2.1);
  return g;
}
function createStones(THREE) {                        // 공깃돌: 바닥에 넷, 손에서 올린 하나
  const g = new THREE.Group(), geo = new THREE.SphereGeometry(0.03, 8, 6), colors = [0xd8483c, 0xe2b93b, 0x3f6fb5, 0x4f9a5a, 0xe8e2d4];
  const stones = colors.map((c, i) => { const s = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: c })); s.position.set(-0.13 + i * 0.075, 0.03, -0.42 + (i % 2) * 0.05); g.add(s); return s; });
  return { group: g, toss: stones[4] };
}

export function createNovices(THREE, pets) {
  const group = new THREE.Group();
  group.userData.noShadow = true;
  const list = NOVICES.map((tl, i) => {
    const a = createAvatar(THREE, { color: 0x8c8e93, novice: true, calm: i === 1 || i === 3, beads: i !== 2 });
    a.root.scale.setScalar(NOVICE_SCALE);
    const jegi = createJegi(THREE), stones = createStones(THREE);
    a.root.add(jegi, stones.group);
    group.add(a.root);
    return { i, tl, a, jegi, stones, yaw: null, talk: null };
  });

  const here = (n, tMs) => (n.talk ? n.talk.at : petAt(n.tl, tMs));
  const acts = {};                                     // 동자승이 쓰다듬는 동물: 꼬리를 흔들고 동자승 쪽을 본다 (pets.update에 넘긴다)

  // 누군가 들어왔을 때: get()은 그분의 지금 자리({x,z}), 못 찾으면 null
  function greet(get, name, sex, tMs) {
    const p = get();
    if (!canVisit(p) || list.filter((n) => n.talk).length >= MAX_TALKING) return false;
    // 이름으로 정한 아이가 가까우면 그 아이가, 멀면 가장 가까운 아이가 달려간다
    const free = [];
    for (let k = 0; k < list.length; k++) {
      const n = list[(noviceFor(name) + k) % list.length], s = petAt(n.tl, tMs);
      if (!n.talk && !s.inside && s.state !== "sleep") free.push({ n, s, d: Math.hypot(s.x - p.x, s.z - p.z) });
    }
    if (free.length) {
      const pick = free[0].d <= CLOSE_ENOUGH ? free[0] : free.reduce((a, b) => (b.d < a.d ? b : a));
      const { n, s } = pick, at = { x: s.x, z: s.z };
      n.talk = { get, text: noviceLine(name, sex), phase: "go", at, route: routeAround(at, { x: p.x, z: p.z }), until: 0 };
      return true;
    }
    return false;
  }

  // 한 걸음: to로 RUN 속도로. 다다르면 true
  function stepTo(t, to, dt, stopAt = 0.05) {
    const dx = to.x - t.at.x, dz = to.z - t.at.z, d = Math.hypot(dx, dz);
    if (d <= stopAt) return true;
    const move = Math.min(d - stopAt, RUN * dt);
    t.at = { x: t.at.x + (dx / d) * move, z: t.at.z + (dz / d) * move };
    t.yaw = Math.atan2(-dx, -dz);
    return move >= d - stopAt;
  }

  function runTalk(n, s, dt) {
    const t = n.talk, now = performance.now();
    dt = Math.min(1, (now - (t.last ?? now)) / 1000); t.last = now;   // 화면이 느려도 제때 닿게
    t.spent = (t.spent || 0) + dt;                                    // 첫 화면을 준비하느라 멈춘 시간은 세지 않는다
    if (t.phase === "go") {
      const p = t.get();
      if (!p || t.spent * 1000 > GIVE_UP_MS) { t.phase = "back"; t.route = routeAround(t.at, s); return "walk"; }
      if (Math.hypot(p.x - t.at.x, p.z - t.at.z) <= TALK_GAP + 0.03) { t.phase = "say"; t.until = now + TALK_MS; n.a.say(t.text, TALK_MS / 1000); return "hapjang"; }
      const next = t.route.length > 1 ? t.route[0] : p;
      if (stepTo(t, next, dt, t.route.length > 1 ? 0.05 : TALK_GAP) && t.route.length > 1) t.route.shift();
      return "walk";
    }
    if (t.phase === "say") {
      const p = t.get();
      if (p) t.yaw = Math.atan2(-(p.x - t.at.x), -(p.z - t.at.z));
      if (now >= t.until) { t.phase = "back"; t.route = routeAround(t.at, s); }
      return "hapjang";
    }
    const next = t.route.length > 1 ? t.route[0] : s;
    if (stepTo(t, next, dt)) { if (t.route.length > 1) t.route.shift(); else { n.yaw = t.yaw ?? n.yaw; n.talk = null; } }
    return "walk";
  }

  function update(dt, tMs, cam) {
    const sec = tMs / 1000;
    for (const k of Object.keys(acts)) delete acts[k];
    for (const n of list) {
      const s = petAt(n.tl, tMs), pose = n.talk ? runTalk(n, s, dt) : s.state === "walk" ? "walk" : s.pose;
      const p = n.talk ? n.talk.at : s, near = !cam || Math.hypot(p.x - cam.x, p.z - cam.z) < DRAW_WITHIN;
      n.a.root.visible = (n.talk || !s.inside) && near;
      if (!n.a.root.visible) continue;
      n.a.root.position.set(p.x, floorY(p), p.z);
      const yaw = n.talk ? n.talk.yaw ?? s.yaw : s.yaw;
      if (n.yaw === null) n.yaw = yaw;
      n.yaw += Math.atan2(Math.sin(yaw - n.yaw), Math.cos(yaw - n.yaw)) * (1 - Math.exp(-dt * 8));
      n.a.root.rotation.y = n.yaw;
      n.a.setPose(pose);
      n.a.setSeated(pose === "sit" || pose === "gonggi");
      // 놀이는 서버 시계 박자라 모두의 화면에서 같다
      const playing = pose === "jegi" || pose === "gonggi";
      n.jegi.visible = pose === "jegi"; n.stones.group.visible = pose === "gonggi";
      let beat = 0;
      if (playing) {
        const period = pose === "jegi" ? 0.85 : 1.15, u = (((sec + n.i * 0.27) / period) % 1 + 1) % 1, air = Math.sin(Math.PI * u);
        beat = pose === "jegi" ? Math.max(0, 1 - u / 0.2, (u - 0.8) / 0.2) : air;
        if (pose === "jegi") n.jegi.position.set(0.085, 0.22 + air * 0.78, -0.2);
        else n.stones.toss.position.set(0.075, 0.2 + air * 0.42, -0.3);
      }
      n.a.setPlay(beat);
      const stroke = !n.talk && s.petWith;
      n.a.setReach(stroke ? pets[stroke].touch("pet", n.reachAt ??= new THREE.Vector3()) : null);
      if (stroke) acts[stroke] = { a: "pet", sec: 4, until: performance.now() + 400, yaw: Math.atan2(-(p.x - pets[stroke].root.position.x), -(p.z - pets[stroke].root.position.z)) };
      n.a.update(dt);
    }
  }
  return { group, update, greet, list, here, acts };
}
