/* 들어올 때 정하는 이름: 한글 완성형 1~8글자. 머리 위에는 여자는 "이름+보살", 남자는 "이름+처사"로 보인다. */
import { isBadName } from "./badwords.js";

const HANGUL = /^[가-힣]{1,8}$/;

// 쓸 수 있는 이름이면 null, 아니면 화면에 띄울 까닭
export function nameProblem(s) {
  const t = typeof s === "string" ? s.trim() : "";
  if (!HANGUL.test(t)) return "한글 1~8자로 적어 주세요";
  if (isBadName(t)) return "쓸 수 없는 이름이에요. 다른 이름을 적어 주세요";
  return null;
}

export const cleanName = (s) => (nameProblem(s) ? null : s.trim());

export const cleanSex = (v) => (v === "m" ? "m" : "f");   // m: 남(처사), f: 여(보살)
// 남의 이름도 여기를 거친다: 금지어가 든 이름(옛날에 들어왔거나 서버에 바로 쓴 것)은 보이지 않는다
export const nameTag = (name, sex) => (name && !nameProblem(name) ? `${name}${cleanSex(sex) === "m" ? "처사" : "보살"}` : "");
// 알림 글머리: "연화보살님이" 또는 "누군가"
export const whoTag = (name, sex) => { const t = nameTag(name, sex); return t ? `${t}님이` : "누군가"; };
// 들어올 때 공양주 보살님의 인사: "연화보살님, 어서오세요~"
export const greeting = (name, sex) => { const t = nameTag(name, sex); return t ? `${t}님, 어서오세요~` : "어서오세요~"; };
