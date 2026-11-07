/* 기와불사: 테이블에서 기와에 소원을 적으면 뒤쪽 담장 아래에 한 장씩 쌓는다. 소원걸이와 달리 오래 남는다.
   소원 글은 적은 사람의 폰에만 남는다 (서버엔 자리·이름·시각만). 자리가 다 차면 가장 오래된 기와 자리에 올린다. */
export const GIWA_COLS = 36, GIWA_ROWS = 5, GIWA_SLOTS = GIWA_COLS * GIWA_ROWS;
export const GIWA_GAP_MS = 60000;        // 한 사람이 1분에 한 번
export const GIWA_KEEP_MINE = 20;        // 내 폰에 남기는 글 수

const valid = (r) => r && Number.isInteger(r.slot) && r.slot >= 0 && r.slot < GIWA_SLOTS && typeof r.at === "number";

// 자리마다 가장 새 기와 하나
export function liveGiwa(records) {
  const bySlot = new Map();
  for (const r of records || []) {
    if (!valid(r)) continue;
    const had = bySlot.get(r.slot);
    if (!had || had.at < r.at) bySlot.set(r.slot, r);
  }
  return [...bySlot.values()].sort((a, b) => a.slot - b.slot);
}

export function pickGiwaSlot(live) {
  const taken = new Set(live.map((g) => g.slot));
  for (let i = 0; i < GIWA_SLOTS; i++) if (!taken.has(i)) return i;
  return live.reduce((o, g) => (g.at < o.at ? g : o)).slot;
}

export const canPlaceGiwa = (lastAt, nowMs) => lastAt == null || nowMs - lastAt >= GIWA_GAP_MS;

// 쌓는 자리: 아래 단부터 한 칸씩. 한 줄(col)을 다 올린 뒤 다음 줄로
export const giwaCell = (slot) => ({ col: Math.floor(slot / GIWA_ROWS), row: slot % GIWA_ROWS });
