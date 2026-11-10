/* 첫눈: 2026-11-09 지리산 첫눈을 맞아 한국 11월 11일 오후 3시까지만 암자에도 눈이 내린다.
   마지막 10분 동안 잦아들다가 그 뒤엔 저절로 그친다. 모두의 화면에서 같게 서버 시계로 판단한다. */
export const SNOW_END = Date.UTC(2026, 10, 11, 6);   // 한국 11월 11일 15:00
export const SNOW_FADE_MS = 10 * 60000;

// 0(안 옴) ~ 1(한창). 끝나기 10분 전부터 고르게 줄어든다.
export const snowAmount = (tMs) => Math.max(0, Math.min(1, (SNOW_END - tMs) / SNOW_FADE_MS));
export const snowActive = (tMs) => snowAmount(tMs) > 0;

export const snowLine = (tMs) => (snowActive(tMs) ? "지리산에 첫눈이 내렸어요 · 암자에도 11일 오후 3시까지 눈이 와요" : "");
