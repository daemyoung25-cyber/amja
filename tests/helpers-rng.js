// 테스트용 씨앗 난수 (world.js의 mulberry32와 같은 식. world.js는 three를 부르는 쪽이라 여기서 따로 둔다)
export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
