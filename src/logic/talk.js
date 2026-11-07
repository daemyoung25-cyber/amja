/* 말풍선 한마디: 가까이 계신 분 머리 위에 잠깐 뜨고 사라진다. 대화 목록은 없다.
   presence/{uid}/t = { x: 글, at } — 몇 초 뒤 지운다. 서버 규칙이 3초 간격·30자·숫자와 링크를 막고,
   욕설은 여기서 보내기 전과 받을 때 두 번 거른다. */
import { isRude } from "./badwords.js";
import { LINKISH } from "./wishes.js";

export const TALK_MAX = 30;            // 글자 수
export const TALK_GAP = 3000;          // 한마디 뒤 다음 한마디까지 (ms)
export const TALK_RANGE = 15;          // 이 거리(m) 안의 분께만 보인다
export const TALK_SEC = 6;             // 머리 위에 떠 있는 시간 (초)
export const TALK_CLEAR = 8000;        // 서버에서 지우는 때 (ms)
const TALK_FRESH = 10000;              // 이보다 오래된 말은 (늦게 들어와 본 것이라) 띄우지 않는다
const HIDE_MAX = 200;

export const QUICK = ["안녕하세요", "반가워요", "성불하세요", "감사합니다", "좋은 하루 되세요"];

export const cleanTalk = (t) => String(t ?? "").replace(/\s+/g, " ").trim();

export function talkProblem(text, lastAt = 0, now = Date.now()) {
  const t = cleanTalk(text);
  if (!t) return "한마디 적어 주세요";
  if (t.length > TALK_MAX) return `${TALK_MAX}자까지 적을 수 있어요`;
  if (LINKISH.test(t)) return "숫자와 링크는 넣을 수 없어요";
  if (isRude(t)) return "고운 말로 적어 주세요";
  if (now - lastAt < TALK_GAP) return "조금 뒤에 또 말해요";
  return null;
}

// 남의 한마디를 띄울까: 새 말이고, 방금 한 말이고, 가까이 있고, 가린 분이 아니고, 걸러지는 말이 아닐 때
export function shouldShowTalk(t, { shownAt = 0, now, dist, hidden = false }) {
  if (!t || typeof t.x !== "string" || typeof t.at !== "number") return false;
  if (t.at <= shownAt || now - t.at > TALK_FRESH || dist > TALK_RANGE || hidden) return false;
  const x = cleanTalk(t.x);
  return !!x && x.length <= TALK_MAX && !LINKISH.test(x) && !isRude(x);
}

// 가린 분 목록 (이 폰에만). 오래된 것부터 밀려난다
export const addHidden = (list, uid) => [...list.filter((u) => u !== uid), uid].slice(-HIDE_MAX);
export const removeHidden = (list, uid) => list.filter((u) => u !== uid);
