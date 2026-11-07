/* 소원걸이: 소원패는 이레 동안 걸려 있고, 자리가 다 차면 가장 오래된 패 자리에 새 패를 건다.
   소원 글은 적은 사람의 폰에만 남는다 (서버엔 자리·이름·시각만). */
import { isRude } from "./badwords.js";

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

/* 함께 읽는 소원: 적은 사람이 "다른 분도 읽을 수 있게"를 고른 패만, 이름 없이 글(t)만 서버에 둔다.
   번호·링크·욕설은 막는다 (서버 규칙은 숫자와 링크를, 여기선 욕설까지). 그래도 남는 것은 '가리기'로. */
export const LINKISH =/[0-9０-９]|https?|www|\.(com|net|kr|org|io|me|ly)|@|t\.me|open\.kakao/i;

export function publicProblem(text) {
  if (LINKISH.test(text)) return "다른 분이 읽는 소원엔 숫자와 링크를 넣을 수 없어요";
  if (isRude(text)) return "고운 말로 적어 주세요";
  return null;
}

// 남이 읽을 수 있는 패: 글이 있고, 내 것이 아니고, 내가 가리지 않았고, 욕설이 아닌 것. 새것부터.
export function readableWishes(live, { mine = [], hidden = [] } = {}) {
  const skip = new Set([...mine, ...hidden]);
  return live.filter((w) => typeof w.t === "string" && w.t && !skip.has(w.id) && !publicProblem(w.t)).sort((a, b) => b.at - a.at);
}

export function nextReadable(list, currentId) {
  if (!list.length) return null;
  const sorted = [...list].sort((a, b) => b.at - a.at);
  const i = sorted.findIndex((w) => w.id === currentId);
  return sorted[(i + 1) % sorted.length];
}
