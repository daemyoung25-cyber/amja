/* 향과 초 공양 (담 공양대 말고 네 곳): 대웅전·섬 암자 향로엔 향, 동굴 법당 불단 앞과 해수관음 받침엔 초.
   offers/{id} = { k: 곳, slot, n, h?, at }. 향은 한 시간, 초는 하루 동안 타며 짧아진다.
   칸이 다 차면 가장 오래 탄 자리에 새로 올린다 (담 공양대와 같은 규칙). */
const HOUR = 3600000, DAY = 86400000;
export const OFFER_GAP_MS = 60000;            // 한 곳에 한 사람이 1분에 한 번
export const OFFER_PLACES = {
  hall: { kind: "incense", slots: 12, life: HOUR },
  herm: { kind: "incense", slots: 9, life: HOUR },
  cave: { kind: "candle", slots: 24, life: DAY },
  gwan: { kind: "candle", slots: 24, life: DAY },
};
export const OFFER_MAX_SLOTS = 24;

const valid = (r, P) => r && Number.isInteger(r.slot) && r.slot >= 0 && r.slot < P.slots && typeof r.at === "number";

// 그 곳에 지금 타고 있는 것 (칸마다 가장 새것 하나), 칸 순서로
export function liveOffers(records, k, nowMs) {
  const P = OFFER_PLACES[k];
  if (!P) return [];
  const bySlot = new Map();
  for (const r of records || []) {
    if (!r || r.k !== k || !valid(r, P) || nowMs - r.at >= P.life || r.at - nowMs > 60000) continue;
    const had = bySlot.get(r.slot);
    if (!had || had.at < r.at) bySlot.set(r.slot, r);
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export const offerLeft = (r, nowMs) => {
  const P = OFFER_PLACES[r.k];
  return P ? Math.min(1, Math.max(0, 1 - (nowMs - r.at) / P.life)) : 0;
};

export function pickOfferSlot(live, k) {
  const P = OFFER_PLACES[k];
  const taken = new Set(live.map((c) => c.slot));
  for (let i = 0; i < P.slots; i++) if (!taken.has(i)) return i;
  return live.reduce((o, c) => (c.at < o.at ? c : o)).slot;
}

export const canOffer = (lastAt, nowMs) => lastAt == null || nowMs - lastAt >= OFFER_GAP_MS;
