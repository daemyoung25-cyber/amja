/* 들어올 때 정하는 이름: 한글 완성형 1~8글자. 머리 위에는 "이름+보살"로 보인다. */
const HANGUL = /^[가-힣]{1,8}$/;

export function cleanName(s) {
  if (typeof s !== "string") return null;
  const t = s.trim();
  return HANGUL.test(t) ? t : null;
}

export const nameTag = (name) => (name ? `${name}보살` : "");
