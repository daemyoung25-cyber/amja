import * as THREE from "three";
import { PLACE_NAME, BOW_RANGE, GREET_RANGE } from "./config.js";
import { STATUE, resolveTap, routeAround, floorY, insideHall, seatAt, faceAltar } from "./logic/layout.js";
import { startMove, positionAt } from "./logic/walk.js";
import { createWorld } from "./scene/world.js";
import { createAvatar, AVATAR_COLORS, POSE_SECONDS } from "./scene/avatar.js";
import { createCameraRig } from "./scene/camera.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import { CREDITS } from "./credits.js";
import { createPresence } from "./net/presence.js";
import { peersFromSnapshot, nearestPeerWithin } from "./logic/peers.js";
import { visibleTraces, shouldWriteTrace, recentVisitorCount } from "./logic/traces.js";
import { FIREBASE } from "../firebase-config.js";

const ui = createUI({ placeName: PLACE_NAME });

const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.1, 2000);

const world = createWorld(THREE, scene);

// ?time=19:30 처럼 주면 그 한국 시각의 하늘을 미리 본다
const timeParam = new URLSearchParams(location.search).get("time");
const timeOffset = (() => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeParam || "");
  if (!m) return 0;
  const now = new Date();
  const kstNow = (now.getTime() + 9 * 3600000) % 86400000;
  return (+m[1] * 3600000 + +m[2] * 60000) - kstNow;
})();
const clockNow = () => Date.now() + timeOffset;

const colorIndex = Math.floor(Math.random() * AVATAR_COLORS.length);
const me = createAvatar(THREE, { color: AVATAR_COLORS[colorIndex] });
scene.add(me.root);

// 접속 전엔 혼자 모드처럼 동작한다. 시각은 서버 시계에 맞춘 net.now()를 쓴다.
let net = { mode: "solo", now: () => Date.now(), sendMove() {}, sendPose() {}, greet() {} };
let snapshot = null, peers = [];
let traceRecords = [], visits = {}, lastTraceAt = null;
const others = new Map();     // uid -> { avatar, gone: 0 }

const state = {
  move: (() => {        // 들어오는 자리를 마당 앞쪽에 흩어 둔다 (여럿이 겹치지 않게)
    const spawn = { x: (Math.random() - 0.5) * 8, z: -2.5 + Math.random() * 2 };
    return startMove(spawn, spawn, Date.now());
  })(),
  leanOnArrive: false,
  sitOnArrive: false,
  route: [],                // 불상·법당을 돌아가는 남은 경유지
  base: "stand",            // 합장/절이 끝나면 돌아갈 자세
  gestureUntil: 0,
  yaw: 0,
};

const rig = createCameraRig(THREE, camera, canvas, { onTap, obstacles: world.obstacles });
const ray = new THREE.Raycaster();
const headAt = new THREE.Vector3();
const ndc = new THREE.Vector2();

function onTap(cx, cy) {
  ui.pokeHud();
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(world.groundMeshes, false)[0];
  if (hit) goTo({ x: hit.point.x, z: hit.point.z });
}

function goTo(point) {
  const r = resolveTap(point);
  const now = net.now();
  const here = positionAt(state.move, now);
  // 이미 기대 있는 자리 근처의 바다를 눌렀으면 그대로 있는다 (버튼만 돌아온다)
  if (state.base === "lean" && r.kind === "lean" && Math.abs(r.to.x - here.x) < 0.6) return;
  if (state.base === "sit" && r.kind === "sit" && seatAt(here) === seatAt(r.to)) return;
  const [first, ...rest] = routeAround(here, r.to);
  state.route = rest;
  state.move = startMove(here, first, now);
  state.leanOnArrive = r.kind === "lean";
  state.sitOnArrive = r.kind === "sit";
  net.sendMove(state.move);
  setBase("walk");
}

function setBase(p) {
  if (state.base === "lean" && p !== "lean") { ui.setLeaning(false); rig.setLeaning(false); }
  if (state.base === "sit" && p !== "sit") ui.setLeaning(false);
  state.base = p;
  if (performance.now() >= state.gestureUntil) { me.setPose(p); net.sendPose(p); }
}

function gesture(kind) {
  if (state.base === "walk") return;
  me.setPose(kind);
  net.sendPose(kind);
  state.gestureUntil = performance.now() + POSE_SECONDS[kind] * 1000;
}

ui.onHapjang(() => {
  if (state.base === "walk") return;
  gesture("hapjang");
  const now = net.now();
  const to = nearestPeerWithin(peers, positionAt(state.move, now), now, GREET_RANGE);
  if (to) net.greet(to);
});
ui.onBow(() => {
  const p = positionAt(state.move, net.now());
  state.yaw = insideHall(p) ? faceAltar(p) : Math.atan2(-(STATUE.x - p.x), -(STATUE.z - p.z));   // 부처님을 향해 선다
  gesture("bow");
});
const SOUND_KEY = "amja-sound";
const toggles = (() => {
  try { return { waves: true, chime: true, chant: true, ...JSON.parse(localStorage.getItem(SOUND_KEY) || "{}") }; }
  catch { return { waves: true, chime: true, chant: true }; }
})();
const audio = createAudio({ urls: { waves: "sounds/waves.mp3", chant: "sounds/chant.mp3" } });
for (const [k, v] of Object.entries(toggles)) audio.setEnabled(k, v);
ui.onOpenSettings(() => ui.openSettings({ toggles, credits: CREDITS }));
ui.onToggle((layer, on) => {
  toggles[layer] = on;
  audio.setEnabled(layer, on);
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(toggles)); } catch {}
});
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { audio.suspend(); return; }
  if (!(await audio.resumeIfNeeded())) ui.showSoundResume(() => audio.resumeIfNeeded());
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  const now = net.now();
  const p = positionAt(state.move, now);
  if (!p.arrived) state.yaw = p.yaw;
  if (p.arrived && state.base === "walk" && state.route.length) {      // 다음 경유지로
    state.move = startMove(p, state.route.shift(), now);
    net.sendMove(state.move);
  } else if (p.arrived && state.base === "walk") {
    if (net.mode === "shared" && shouldWriteTrace(lastTraceAt, now)) {
      lastTraceAt = now;
      net.writeTrace({ x: p.x, z: p.z, k: state.leanOnArrive ? "lean" : "step" });
    }
    if (state.sitOnArrive) {
      state.yaw = faceAltar(p);
      setBase("sit");
      rig.turnTo(state.yaw);
      ui.setLeaning(true);              // 앉아 있는 동안 버튼은 물러난다
    } else if (state.leanOnArrive) {
      state.yaw = 0;
      setBase("lean");
      ui.setLeaning(true);
      rig.setLeaning(true);
    } else setBase("stand");
  }
  if (state.gestureUntil && t >= state.gestureUntil) { state.gestureUntil = 0; me.setPose(state.base); net.sendPose(state.base); }

  const seated = state.base === "sit";
  const fy = floorY(p);
  me.root.position.set(p.x, fy, p.z);
  me.root.rotation.y = state.yaw;
  me.setSeated(seated);
  me.update(dt);
  const inside = insideHall(p);
  ui.setNearStatue(inside || Math.hypot(p.x - STATUE.x, p.z - STATUE.z) <= STATUE.baseR + BOW_RANGE);
  rig.setIndoor(inside, faceAltar(p));

  drawOthers(now, p, dt);
  audio.setListener(p);
  rig.follow({ x: p.x, z: p.z, yaw: state.yaw, y: fy - (seated ? 0.3 : 0) });
  rig.update(dt);
  // 카메라가 머리에 바짝 붙으면 내 모습을 옅게 해서 앞이 보이게 한다
  const camGap = camera.position.distanceTo(headAt.set(p.x, fy + 1.1, p.z));
  me.setOpacity(Math.min(1, Math.max(0.15, (camGap - 0.7) / 0.8)));
  world.update(new Date(clockNow()), dt, camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function drawOthers(now, mePos, dt) {
  if (net.mode !== "shared") return;
  peers = peersFromSnapshot(snapshot, net.uid, now, mePos);
  const seen = new Set();
  for (const peer of peers) {
    seen.add(peer.uid);
    let o = others.get(peer.uid);
    if (!o) {
      o = { avatar: createAvatar(THREE, { color: AVATAR_COLORS[peer.c % AVATAR_COLORS.length] }), gone: 0 };
      scene.add(o.avatar.root);
      others.set(peer.uid, o);
    }
    o.gone = 0;
    o.avatar.setOpacity(1);
    const pos = positionAt(peer.m, now);
    o.avatar.root.position.set(pos.x, floorY(pos), pos.z);
    if (!pos.arrived) o.yaw = pos.yaw;
    if (peer.p === "lean") o.yaw = 0;
    const sat = pos.arrived && seatAt(pos) && ["sit", "hapjang", "bow"].includes(peer.p);
    if (sat) o.yaw = faceAltar(pos);
    o.avatar.setSeated(!!sat);
    o.avatar.root.rotation.y = o.yaw || 0;
    o.avatar.setPose(!pos.arrived ? "walk" : peer.p === "walk" ? "stand" : peer.p);
    o.avatar.update(dt);
  }
  for (const [uid, o] of others) {
    if (seen.has(uid)) continue;
    o.gone += dt;                                   // 사라진 사람은 1초 동안 흐려진다
    o.avatar.setOpacity(Math.max(0, 1 - o.gone));
    if (o.gone >= 1) { scene.remove(o.avatar.root); others.delete(uid); }
  }
  const here = peers.length + 1, recent = recentVisitorCount(visits, now);
  ui.setCount(recent > here ? `${here}명 함께 · 지난 한 시간 ${recent}명` : `${here}명 함께`);
}

function redrawTraces() { world.setTraces(visibleTraces(traceRecords, net.now())); }
setInterval(redrawTraces, 60000);       // 1분마다 조금씩 옅어진다

ui.onEnter(async () => {
  audio.start();
  ui.showHintOnce();
  const config = new URLSearchParams(location.search).has("emu")
    ? { apiKey: "demo-key", authDomain: "demo-amja.firebaseapp.com", databaseURL: "http://127.0.0.1:9000?ns=demo-amja-default-rtdb", projectId: "demo-amja", appId: "demo", emulator: true }
    : FIREBASE;
  const p = await createPresence({ config, me: { c: colorIndex, m: state.move, p: state.base }, onLate: adopt });
  if (p.mode === "shared") adopt(p);
});

// 같이 있기로 옮겨 탄다 (처음 연결이든, 늦게 붙은 연결이든)
function adopt(p) {
  // 서버 시계로 옮겨 탄다: 지금 서 있는 자리에서 다시 시작
  const here = positionAt(state.move, Date.now());
  state.move = startMove(here, here, p.now());
  net = p;
  net.sendMove(state.move);
  net.sendPose(state.base);
  net.onPeers((val) => { snapshot = val; });
  net.onGreeted(() => ui.showWhisper("누군가 합장으로 인사했어요"));
  net.markVisit();
  net.onVisits((v) => { visits = v; });
  net.onTraces((recs) => { traceRecords = recs; redrawTraces(); });
  net.cleanup();
}
requestAnimationFrame(frame);

// 점검용: ?debug=1 일 때만 상태를 밖에서 본다
if (new URLSearchParams(location.search).has("debug")) window.__amja = { goTo, state, camera, me, positionAt, audio, get net() { return net; }, get others() { return others; }, get traces() { return traceRecords; }, world };
