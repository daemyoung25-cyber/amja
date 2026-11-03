/* 소원걸이: 소원패는 이레 동안 걸려 있고, 자리가 다 차면 가장 오래된 패 자리에 새 패를 건다.
   소원 글은 적은 사람의 폰에만 남는다 (서버엔 자리·이름·시각만). */
export const WISH_LIFE_MS = 7 * 86400000;
export const WISH_SLOTS = 60;            // 세 줄 × 20
export const WISH_GAP_MS = 60000;        // 한 사람이 1분에 한 번
export const WISH_MAX_LEN = 30;

const valid = (r) => r && Number.isInteger(r.slot) && r.slot >= 0 && r.slot < WISH_SLOTS && typeof r.at === "number";
const alive = (r, nowMs) => nowMs - r.at < WISH_LIFE_MS && r.at - nowMs <= 60000;

export function liveWishes(records, nowMs) {
  const bySlot = new Map();
  for (const r of records || []) {
    if (!valid(r) || !alive(r, nowMs)) continue;
    const had = bySlot.get(r.slot);
    if (!had || had.at < r.at) bySlot.set(r.slot, r);
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export function pickWishSlot(live, nowMs) {
  const taken = new Set(live.map((w) => w.slot));
  for (let i = 0; i < WISH_SLOTS; i++) if (!taken.has(i)) return i;
  return live.reduce((o, w) => (w.at < o.at ? w : o)).slot;
}

export const canHang = (lastAt, nowMs) => lastAt == null || nowMs - lastAt >= WISH_GAP_MS;

export function cleanWish(text) {
  if (typeof text !== "string") return null;
  const t = text.replace(/\s+/g, " ").trim();
  return t && [...t].length <= WISH_MAX_LEN ? t : null;
}

// 내 소원(폰에 둔 글) 가운데 아직 걸려 있는 것만: 이레가 지났거나 남의 새 패가 그 자리를 가져갔으면 뺀다
export function keepMine(mine, live, nowMs) {
  if (!Array.isArray(mine)) return [];
  const bySlot = new Map(live.map((w) => [w.slot, w]));
  return mine.filter((m) => {
    if (!valid(m) || typeof m.text !== "string" || !alive(m, nowMs)) return false;
    const w = bySlot.get(m.slot);
    return !w || w.at <= m.at + 60000;          // 서버 시각은 폰보다 조금 늦을 수 있다 (남의 패가 내 자리를 가져가는 건 다 찬 뒤, 훨씬 나중)
  });
}
