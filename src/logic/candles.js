/* 촛불 공양: 초는 하루 동안 타며 짧아지고, 공양대 칸이 다 차면 가장 오래 탄 초 자리에 새 초를 올린다. */
export const CANDLE_LIFE_MS = 86400000;
export const CANDLE_SLOTS = 48;           // 4단 × 12칸
export const CANDLE_GAP_MS = 60000;       // 한 사람이 1분에 한 번

const valid = (r) => r && Number.isInteger(r.slot) && r.slot >= 0 && r.slot < CANDLE_SLOTS && typeof r.at === "number";

export function liveCandles(records, nowMs) {
  const bySlot = new Map();
  for (const r of records || []) {
    if (!valid(r) || nowMs - r.at >= CANDLE_LIFE_MS || r.at - nowMs > 60000) continue;
    const had = bySlot.get(r.slot);
    if (!had || had.at < r.at) bySlot.set(r.slot, r);
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export const burnLeft = (r, nowMs) => Math.min(1, Math.max(0, 1 - (nowMs - r.at) / CANDLE_LIFE_MS));

export function pickSlot(live, nowMs) {
  const taken = new Set(live.map((c) => c.slot));
  for (let i = 0; i < CANDLE_SLOTS; i++) if (!taken.has(i)) return i;
  return live.reduce((o, c) => (c.at < o.at ? c : o)).slot;
}

export const canLight = (lastAt, nowMs) => lastAt == null || nowMs - lastAt >= CANDLE_GAP_MS;
