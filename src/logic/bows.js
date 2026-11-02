/* 108배: 처음에 합장 반배 한 번, 큰절(오체투지)을 108번, 끝에 다시 반배.
   큰절 한 번은 avatar.js 큰절 키프레임의 2.4초(선 합장)부터 9.6초(다시 선 합장)까지 7.2초. */
export const BOWS = 108;
const LEAD = 2.4, CYCLE = 7.2, TAIL = 1.6;
export const BOW108_SECONDS = LEAD + BOWS * CYCLE + TAIL;

// 108배를 시작한 지 sec초일 때, 큰절 한 번 키프레임에서의 자리(초)
export function bowPhase(sec) {
  if (sec < LEAD) return sec;
  const into = sec - LEAD;
  if (into < BOWS * CYCLE) return LEAD + (into % CYCLE);
  return Math.min(LEAD + CYCLE + TAIL, LEAD + CYCLE + (into - BOWS * CYCLE));
}

// 지금까지 마친 큰절 수 (다시 일어서면 한 번)
export function bowsDone(sec) {
  return Math.max(0, Math.min(BOWS, Math.floor((sec - LEAD) / CYCLE + 1e-9)));
}
