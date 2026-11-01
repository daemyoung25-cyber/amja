import * as THREE from "three";
import { PLACE_NAME, BOW_RANGE } from "./config.js";
import { STATUE, resolveTap } from "./logic/layout.js";
import { startMove, positionAt } from "./logic/walk.js";
import { createWorld } from "./scene/world.js";
import { createAvatar, AVATAR_COLORS, POSE_SECONDS } from "./scene/avatar.js";
import { createCameraRig } from "./scene/camera.js";
import { createUI } from "./ui.js";

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

const state = {
  move: startMove({ x: 0, z: -2.5 }, { x: 0, z: -2.5 }, Date.now()),
  leanOnArrive: false,
  base: "stand",            // 합장/절이 끝나면 돌아갈 자세
  gestureUntil: 0,
  yaw: 0,
};

const rig = createCameraRig(THREE, camera, canvas, { onTap, obstacles: world.obstacles });
const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();

function onTap(cx, cy) {
  ui.pokeHud();
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(world.groundMeshes, false)[0];
  if (!hit) return;
  const r = resolveTap({ x: hit.point.x, z: hit.point.z });
  const now = Date.now();
  const here = positionAt(state.move, now);
  // 이미 기대 있는 자리 근처의 바다를 눌렀으면 그대로 있는다 (버튼만 돌아온다)
  if (state.base === "lean" && r.kind === "lean" && Math.abs(r.to.x - here.x) < 0.6) return;
  state.move = startMove(here, r.to, now);
  state.leanOnArrive = r.kind === "lean";
  setBase("walk");
}

function setBase(p) {
  if (state.base === "lean" && p !== "lean") { ui.setLeaning(false); rig.setLeaning(false); }
  state.base = p;
  if (performance.now() >= state.gestureUntil) me.setPose(p);
}

function gesture(kind) {
  if (state.base === "walk") return;
  me.setPose(kind);
  state.gestureUntil = performance.now() + POSE_SECONDS[kind] * 1000;
}

ui.onHapjang(() => gesture("hapjang"));
ui.onBow(() => {
  const p = positionAt(state.move, Date.now());
  state.yaw = Math.atan2(-(STATUE.x - p.x), -(STATUE.z - p.z));   // 불상을 향해 선다
  gesture("bow");
});
ui.onOpenSettings(() => {});

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
  const now = Date.now();
  const p = positionAt(state.move, now);
  if (!p.arrived) state.yaw = p.yaw;
  if (p.arrived && state.base === "walk") {
    if (state.leanOnArrive) {
      state.yaw = 0;
      setBase("lean");
      ui.setLeaning(true);
      rig.setLeaning(true);
    } else setBase("stand");
  }
  if (state.gestureUntil && t >= state.gestureUntil) { state.gestureUntil = 0; me.setPose(state.base); }

  me.root.position.set(p.x, 0, p.z);
  me.root.rotation.y = state.yaw;
  me.update(dt);
  ui.setNearStatue(Math.hypot(p.x - STATUE.x, p.z - STATUE.z) <= STATUE.baseR + BOW_RANGE);

  rig.follow({ x: p.x, z: p.z, yaw: state.yaw });
  rig.update(dt);
  world.update(new Date(clockNow()), dt, camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

ui.onEnter(() => ui.showHintOnce());
requestAnimationFrame(frame);

// 점검용: ?debug=1 일 때만 상태를 밖에서 본다
if (new URLSearchParams(location.search).has("debug")) window.__amja = { state, camera, me, positionAt };
