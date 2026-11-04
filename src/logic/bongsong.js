/* 봉송(奉送): 절에서 돌아가는 길에 공양주 보살님이 싸 주시는 떡·과일 꾸러미.
   한 번 들를 때 한 번 받는다. 꾸러미에 든 것은 떡 하나와 과일 하나를 고른다. */
export const RICE_CAKES = ["백설기", "시루떡", "절편", "인절미", "약과"];
export const FRUITS = ["사과", "배", "감", "귤"];
export const GIVE_SECONDS = 1.6;        // 보살님이 두 손으로 내밀어 내 손에 닿을 때까지

// 받침이 있으면 "과", 없으면 "와"
export const andJosa = (word) => {
  const c = word.charCodeAt(word.length - 1) - 0xac00;
  return c >= 0 && c <= 11171 && c % 28 ? "과" : "와";
};

export function packBongsong(rand = Math.random) {
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rand() * list.length))];
  const cake = pick(RICE_CAKES), fruit = pick(FRUITS);
  return { cake, fruit, text: `${cake}${andJosa(cake)} ${fruit}` };
}
