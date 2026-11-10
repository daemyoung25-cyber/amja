/* 소리 층: 파도(녹음), 염불(녹음), 풍경(합성), 저녁예불(녹음). 위치에 따라 크기가 0.8초에 걸쳐 바뀐다. */
import { layerGains, LEVEL } from "./logic/mix.js";

const RAMP = 0.27;                                         // setTargetAtTime 시간 상수 ≈ 0.8초에 95%
const INTRO_S = 8, AMBIENT_RAMP = 2.5;                      // 들어오면 불경이 먼저, 8초 뒤 파도·풍경·저녁예불이 천천히 (≈7초) 깔린다

export function createAudio({ urls }) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null;
  const layers = {}, volume = { waves: 1, chime: 1, chant: 1, evening: 1 };   // 사용자가 정한 크기 0..1
  let chantClock = null;                                   // 염불이 몇 초째인지 (법당 스님 목탁을 맞추려고)
  let listener = { x: 0, z: 0 }, chimeTimer = 0, ambient = 0;   // ambient: 불경 말고 나머지 층 (0 → 1)
  let hush = 0;                                            // 눈 오는 동안 파도를 낮추는 정도 0..1

  async function load(url) {
    const res = await fetch(url);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }

  function startLoop(name, buffer, offset = Math.random() * buffer.duration) {   // 배경 소리는 매번 다른 곳에서 시작
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    src.connect(layers[name]);
    src.start(ctx.currentTime + 0.05, offset);
  }

  // 염불 층: 고른 녹음 하나가 처음 구절부터 반복된다. 바꾸면 1.5초에 걸쳐 앞 녹음이 잦아들고 새 녹음이 들어온다
  let chantTrack = null, chantSrc = null, chantGain = null, chantReq = 0;
  const cache = new Map();
  const loadCached = (url) => { if (!cache.has(url)) cache.set(url, load(url).catch((e) => { cache.delete(url); throw e; })); return cache.get(url); };
  function playChant(track, buffer) {
    const at = ctx.currentTime + 0.05;
    if (chantSrc) {
      const os = chantSrc, og = chantGain;
      og.gain.setTargetAtTime(0, at, 0.4);
      setTimeout(() => { try { os.stop(); } catch {} os.disconnect(); og.disconnect(); }, 2500);
    }
    chantGain = ctx.createGain(); chantGain.gain.value = 0; chantGain.connect(layers.chant);
    chantGain.gain.setTargetAtTime(1, at, chantSrc ? 0.4 : 0.01);
    chantSrc = ctx.createBufferSource(); chantSrc.buffer = buffer; chantSrc.loop = true;
    chantSrc.connect(chantGain); chantSrc.start(at, 0);
    chantClock = { at, offset: 0, len: buffer.duration, track };
  }
  async function setChant(track) {
    chantTrack = track;
    if (!ctx) return;
    const req = ++chantReq;
    try { const b = await loadCached(track.url); if (req === chantReq) playChant(track, b); } catch {}
  }

  function strike() {
    if (!ctx || ctx.state !== "running") return;
    const n = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const t0 = ctx.currentTime + i * (0.25 + Math.random() * 0.5);
      const f0 = 1150 + Math.random() * 120, decay = 2.5 + Math.random() * 1.5, vel = 0.5 + Math.random() * 0.5;
      for (const [ratio, amp] of [[1, 1], [2.76, 0.45], [5.4, 0.22], [8.93, 0.1]]) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.frequency.value = f0 * ratio;
        g.gain.setValueAtTime(0, t0);
        g.gain.linearRampToValueAtTime(0.12 * amp * vel, t0 + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + decay / Math.sqrt(ratio));
        o.connect(g).connect(layers.chime);
        o.start(t0); o.stop(t0 + decay + 0.1);
      }
    }
  }
  function scheduleChime() {
    clearTimeout(chimeTimer);
    chimeTimer = setTimeout(() => { strike(); scheduleChime(); }, 8000 + Math.random() * 17000);
  }

  function apply(ramp = RAMP) {
    if (!ctx) return;
    const on = Object.fromEntries(Object.keys(LEVEL).map((n) => [n, volume[n] > 0]));
    const g = layerGains(listener, on);
    for (const name of Object.keys(LEVEL)) {
      const k = (name === "chant" ? 1 : ambient) * (name === "waves" ? 1 - 0.35 * hush : 1);
      layers[name].gain.setTargetAtTime(g[name] * LEVEL[name] * volume[name] * k, ctx.currentTime, ramp);
    }
  }
  function bringInAmbient() {
    if (ambient) return;
    ambient = 1;
    apply(AMBIENT_RAMP);
    scheduleChime();
  }

  // 사용자의 누름 안에서 불러야 폰에서 소리가 난다
  async function start() {
    if (ctx || !Ctx) return;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);
    for (const name of Object.keys(LEVEL)) { layers[name] = ctx.createGain(); layers[name].gain.value = 0; layers[name].connect(master); }
    ctx.resume();
    master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 1.2);    // 들어오면서 천천히 커진다
    apply();
    // 온라인 산사처럼 들어서면 불경이 먼저: 처음 구절부터 흐르고, 나머지 소리는 조금 뒤에 깔린다
    const track = chantTrack || { url: urls.chant }, req = ++chantReq;
    const [w, c, ev] = await Promise.allSettled([load(urls.waves), loadCached(track.url), load(urls.evening)]);
    if (c.status === "fulfilled" && req === chantReq) playChant(track, c.value);
    if (w.status === "fulfilled") startLoop("waves", w.value);
    if (ev.status === "fulfilled") startLoop("evening", ev.value);
    setTimeout(bringInAmbient, c.status === "fulfilled" ? INTRO_S * 1000 : 0);
  }

  function setListener(p) {
    if (Math.abs(p.x - listener.x) + Math.abs(p.z - listener.z) < 0.05) return;
    listener = { x: p.x, z: p.z };
    apply();
  }

  function setHush(h) { hush = Math.min(1, Math.max(0, h)); apply(1.5); }
  function setVolume(layer, v) { volume[layer] = Math.min(1, Math.max(0, v)); apply(); }

  async function resumeIfNeeded() {
    if (!ctx) return true;
    if (ctx.state === "running") return true;
    try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch {}
    return ctx.state === "running";
  }

  function suspend() { if (ctx && ctx.state === "running") ctx.suspend(); }

  // 한 번에 끄고 켜기: 층마다 크기는 그대로 두고 전체만 줄인다
  let muted = false;
  function setMuted(m) {
    muted = !!m;
    if (master) master.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.25);
  }

  // 지금 들리는 염불: { t: 녹음 안 자리(초), track }. 꺼져 있거나 멈췄으면 null
  function chantNow() {
    if (!chantClock || !ctx || ctx.state !== "running" || muted || volume.chant <= 0) return null;
    const t = ctx.currentTime - chantClock.at;
    return t < 0 ? null : { t: (t + chantClock.offset) % chantClock.len, track: chantClock.track };
  }

  return { start, setListener, setVolume, setHush, setMuted, resumeIfNeeded, suspend, chantNow, setChant, state: () => (ctx ? ctx.state : "suspended") };
}
