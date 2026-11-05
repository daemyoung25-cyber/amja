/* 수능 기도: 2027학년도 수능(2026-11-19) 시험이 끝나는 저녁 6시까지만. 그 뒤엔 저절로 평소 모습으로 돌아간다.
   결과를 약속하는 말(합격 보장 등)은 쓰지 않는다. */
export const SUNEUNG_END = Date.UTC(2026, 10, 19, 9);   // 한국 11월 19일 18:00
const EXAM_DAY = Date.UTC(2026, 10, 19) / 86400000;      // 한국 달력 날짜 번호
const KST = 9 * 3600000;

export const suneungActive = (tMs) => tMs < SUNEUNG_END;
export const dDay = (tMs) => EXAM_DAY - Math.floor((tMs + KST) / 86400000);

export const gentle = "평안하게 시험 보기를 함께 빌어요";
export function seasonLine(tMs) {
  if (!suneungActive(tMs)) return "";
  const d = dDay(tMs);
  if (d <= 0) return `오늘이 수능이에요 · ${gentle}`;
  if (d === 1) return "내일이 수능이에요 · 수험생을 위해 초 한 자루 밝혀 주세요";
  return `수능까지 D-${d} · 수험생을 위해 초 한 자루 밝혀 주세요`;
}

export const countLine = (n) => (n > 0 ? `지금까지 ${n}분이 수험생을 위해 초를 밝혔어요` : "");

export const packSuneung = () => ({ cake: "찹쌀떡", fruit: "엿", text: "찹쌀떡과 엿" });
