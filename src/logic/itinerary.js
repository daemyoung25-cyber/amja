/* 모두의 화면에서 똑같이 움직이는 동물의 일정표.
   씨앗 난수로 몇 시간치 일정(구간 목록)을 미리 짜 두고, 서버 시계로 '지금 어느 구간인지' 읽기만 한다. 서버에 아무것도 쓰지 않는다.
   일정을 짤 때는 정수 난수와 사칙연산·제곱근만 쓴다: sin·hypot은 브라우저마다 끝자리가 달라 갈림길이 어긋날 수 있다. */
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export const dist2 = (a, b) => (a.x - b.x) ** 2 + (a.z - b.z) ** 2;
const cm = (v) => Math.round(v * 100) / 100;

export function lineClear(a, b, ok) {
  const n = Math.max(1, Math.ceil(Math.sqrt(dist2(a, b)) / 0.25));
  for (let i = 1; i <= n; i++) if (!ok({ x: a.x + ((b.x - a.x) * i) / n, z: a.z + ((b.z - a.z) * i) / n })) return false;
  return true;
}

// from에서 min~max 떨어진, 곧게 갈 수 있는 곳. toward를 주면 거기에 더 가까워지는 곳만
export function pickStep(from, rnd, ok, { min, max, toward = null }) {
  for (let i = 0; i < 40; i++) {
    const to = { x: cm(from.x + (rnd() * 2 - 1) * max), z: cm(from.z + (rnd() * 2 - 1) * max) };
    const d = dist2(from, to);
    if (d < min * min || d > max * max) continue;
    if (toward && dist2(to, toward) >= dist2(from, toward)) continue;
    if (ok(to) && lineClear(from, to, ok)) return to;
  }
  return null;
}

export const headingOf = (from, to) => Math.atan2(-(to.x - from.x), -(to.z - from.z));

// 차례로 쌓는 구간 목록. 구간마다 dur(초)가 있고 start가 붙는다
export function makeTimeline() {
  const segs = [];
  let total = 0;
  return {
    segs,
    get total() { return total; },
    add(seg) { seg.start = total; total += seg.dur; segs.push(seg); return seg; },
  };
}

// t(초, 서버 시계)가 일정표 몇 번째 구간의 몇 초째인가. 일정은 total마다 되풀이된다
export function segAt(tl, t) {
  const local = ((t % tl.total) + tl.total) % tl.total;
  let lo = 0, hi = tl.segs.length - 1;
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (tl.segs[m].start <= local) lo = m; else hi = m - 1; }
  const seg = tl.segs[lo];
  return { seg, e: local - seg.start, local };
}
