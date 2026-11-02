/* 위치에 따른 소리 층의 크기. 염불이 주인공: 마당 어디서나 파도와 저녁예불보다 크게, 법당에 가까울수록 또렷하게. */
import { HALL, CHIME, LEAN_Z, INSIDE } from "./layout.js";

// 층별 기본 세기. 파도는 처음(0.9)의 절반.
export const LEVEL = { waves: 0.45, chant: 0.9, chime: 0.35, evening: 0.25 };
const CHANT_MAX = 1, CHANT_FAR = 0.6;   // 난간 끝에서도 0.6 × 0.9 = 0.54 > 파도 0.45
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function layerGains({ x, z }, on) {
  // 법당 안으로 들어가면 파도가 한 겹 더 멀어진다
  const indoor = smooth(HALL.door.z + 0.5, INSIDE.minZ + 0.3, z) * (1 - smooth(INSIDE.maxX, HALL.maxX + 0.5, Math.abs(x)));
  const waves = 1 - 0.65 * smooth(LEAN_Z, HALL.door.z, z) - 0.12 * indoor;
  const dDoor = Math.hypot(x - HALL.door.x, z - HALL.door.z);
  const chant = Math.max(CHANT_MAX * indoor, CHANT_MAX - (CHANT_MAX - CHANT_FAR) * smooth(3, 22, dDoor));
  const dChime = Math.hypot(x - CHIME.x, z - CHIME.z);
  const chime = 0.45 - 0.15 * smooth(1, 5, dChime);
  // 산사 저녁예불(범종·목어·새소리): 어디서나 잔잔히, 법당 안에선 조금 멀게
  const evening = 0.7 - 0.3 * indoor;
  return { waves: on.waves ? waves : 0, chime: on.chime ? chime : 0, chant: on.chant ? chant : 0, evening: on.evening ? evening : 0 };
}
