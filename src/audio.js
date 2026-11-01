/* 소리 세 층: 파도(녹음), 불경(녹음), 풍경(합성). 위치에 따라 크기가 0.8초에 걸쳐 바뀐다. */
import { layerGains } from "./logic/mix.js";

const LEVEL = { waves: 0.9, chant: 0.55, chime: 0.35 };   // 층별 기본 세기 (전체가 잔잔하게)
const RAMP = 0.27;                                         // setTargetAtTime 시간 상수 ≈ 0.8초에 95%

export function createAudio({ urls }) {
  const Ctx = window.AudioContext || window.webkitAudioContext;
  let ctx = null, master = null;
  const layers = {}, volume = { waves: 1, chime: 1, chant: 1 };   // 사용자가 정한 크기 0..1
  let listener = { x: 0, z: 0 }, chimeTimer = 0;

  async function load(url) {
    const res = await fetch(url);
    return ctx.decodeAudioData(await res.arrayBuffer());
  }

  function startLoop(name, buffer) {
    const src = ctx.createBufferSource();
    src.buffer = buffer; src.loop = true;
    src.connect(layers[name]);
    src.start(ctx.currentTime + 0.05, Math.random() * buffer.duration);   // 매번 다른 곳에서 시작
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

  function apply() {
    if (!ctx) return;
    const on = { waves: volume.waves > 0, chime: volume.chime > 0, chant: volume.chant > 0 };
    const g = layerGains(listener, on);
    for (const name of Object.keys(LEVEL)) layers[name].gain.setTargetAtTime(g[name] * LEVEL[name] * volume[name], ctx.currentTime, RAMP);
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
    master.gain.setTargetAtTime(1, ctx.currentTime, 1.2);                // 들어오면서 천천히 커진다
    apply();
    scheduleChime();
    setTimeout(strike, 2500);
    const [w, c] = await Promise.allSettled([load(urls.waves), load(urls.chant)]);
    if (w.status === "fulfilled") startLoop("waves", w.value);
    if (c.status === "fulfilled") startLoop("chant", c.value);
  }

  function setListener(p) {
    if (Math.abs(p.x - listener.x) + Math.abs(p.z - listener.z) < 0.05) return;
    listener = { x: p.x, z: p.z };
    apply();
  }

  function setVolume(layer, v) { volume[layer] = Math.min(1, Math.max(0, v)); apply(); }

  async function resumeIfNeeded() {
    if (!ctx) return true;
    if (ctx.state === "running") return true;
    try { await Promise.race([ctx.resume(), new Promise((r) => setTimeout(r, 400))]); } catch {}
    return ctx.state === "running";
  }

  function suspend() { if (ctx && ctx.state === "running") ctx.suspend(); }

  return { start, setListener, setVolume, resumeIfNeeded, suspend, state: () => (ctx ? ctx.state : "suspended") };
}
