/* 한국 시간 기준 하늘. 해 위치는 NOAA 간이식, 좌표는 부산.
   색은 해 고도에 따라 섞기 때문에 자정이나 경계에서 튀지 않는다. */
const LAT = 35.10, LON = 129.04, KST = 9 * 60;
const rad = Math.PI / 180;

function solar(date) {
  const k = new Date(date.getTime() + KST * 60000);              // KST 달력 날짜
  const start = Date.UTC(k.getUTCFullYear(), 0, 1);
  const n = Math.floor((Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - start) / 86400000) + 1;
  const g = (2 * Math.PI / 365) * (n - 1);
  const eq = 229.18 * (0.000075 + 0.001868 * Math.cos(g) - 0.032077 * Math.sin(g) - 0.014615 * Math.cos(2 * g) - 0.040849 * Math.sin(2 * g));
  const decl = 0.006918 - 0.399912 * Math.cos(g) + 0.070257 * Math.sin(g) - 0.006758 * Math.cos(2 * g)
    + 0.000907 * Math.sin(2 * g) - 0.002697 * Math.cos(3 * g) + 0.00148 * Math.sin(3 * g);
  return { eq, decl, kstMinutes: k.getUTCHours() * 60 + k.getUTCMinutes() + k.getUTCSeconds() / 60 };
}

export function sunTimesKST(date) {
  const { eq, decl } = solar(date);
  const ha = Math.acos(Math.cos(90.833 * rad) / (Math.cos(LAT * rad) * Math.cos(decl)) - Math.tan(LAT * rad) * Math.tan(decl)) / rad;
  return { sunrise: 720 - 4 * (LON + ha) - eq + KST, sunset: 720 - 4 * (LON - ha) - eq + KST };
}

function elevation(date) {
  const { eq, decl, kstMinutes } = solar(date);
  const tst = kstMinutes - KST + eq + 4 * LON;                     // 진태양시(분)
  const ha = (tst / 4 - 180) * rad;
  const s = Math.sin(LAT * rad) * Math.sin(decl) + Math.cos(LAT * rad) * Math.cos(decl) * Math.cos(ha);
  return Math.asin(Math.max(-1, Math.min(1, s))) / rad;
}

// 해 고도(도)별 기준 팔레트. 노을 색은 시안 A의 그라데이션에서 가져왔다.
const KEYS = [
  { e: -12, sky: [0.04, 0.06, 0.14], horizon: [0.10, 0.13, 0.25], sea: [0.03, 0.05, 0.12], sun: [0.85, 0.88, 0.95], light: 0.12 },
  { e: -4, sky: [0.18, 0.20, 0.38], horizon: [0.55, 0.42, 0.50], sea: [0.12, 0.13, 0.26], sun: [1.0, 0.60, 0.45], light: 0.30 },
  { e: 2, sky: [0.23, 0.25, 0.42], horizon: [0.90, 0.54, 0.42], sea: [0.36, 0.33, 0.50], sun: [1.0, 0.78, 0.55], light: 0.60 },
  { e: 10, sky: [0.35, 0.55, 0.80], horizon: [0.85, 0.80, 0.75], sea: [0.22, 0.38, 0.55], sun: [1.0, 0.93, 0.80], light: 0.85 },
  { e: 30, sky: [0.30, 0.55, 0.85], horizon: [0.75, 0.85, 0.92], sea: [0.15, 0.38, 0.58], sun: [1.0, 1.0, 0.95], light: 1.0 },
];
const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);

function palette(e) {
  if (e <= KEYS[0].e) return KEYS[0];
  for (let i = 1; i < KEYS.length; i++) {
    if (e <= KEYS[i].e) {
      const a = KEYS[i - 1], b = KEYS[i], t = (e - a.e) / (b.e - a.e);
      return { sky: mix(a.sky, b.sky, t), horizon: mix(a.horizon, b.horizon, t), sea: mix(a.sea, b.sea, t), sun: mix(a.sun, b.sun, t), light: a.light + (b.light - a.light) * t };
    }
  }
  return KEYS[KEYS.length - 1];
}

export function skyAt(date) {
  const { sunrise, sunset } = sunTimesKST(date);
  const m = solar(date).kstMinutes;
  const phase = Math.abs(m - sunrise) <= 40 ? "dawn" : Math.abs(m - sunset) <= 40 ? "dusk" : m > sunrise && m < sunset ? "day" : "night";
  const sunElevation = elevation(date);
  const p = palette(sunElevation);
  return { phase, sunElevation, sky: p.sky, horizon: p.horizon, sea: p.sea, sun: p.sun, light: p.light };
}
