/* 위치에 따른 소리 세 층의 크기. 불경은 어디서도 파도를 덮지 않는다. */
import { HALL, CHIME, LEAN_Z } from "./layout.js";

const CHANT_MAX = 0.6, CHANT_FAR = 0.12;
const smooth = (a, b, v) => { const t = Math.min(1, Math.max(0, (v - a) / (b - a))); return t * t * (3 - 2 * t); };

export function layerGains({ x, z }, on) {
  const waves = 1 - 0.65 * smooth(LEAN_Z, HALL.door.z, z);
  const dDoor = Math.hypot(x - HALL.door.x, z - HALL.door.z);
  const chant = CHANT_MAX - (CHANT_MAX - CHANT_FAR) * smooth(3, 10.4, dDoor);
  const dChime = Math.hypot(x - CHIME.x, z - CHIME.z);
  const chime = 0.45 - 0.15 * smooth(1, 5, dChime);
  return { waves: on.waves ? waves : 0, chime: on.chime ? chime : 0, chant: on.chant ? chant : 0 };
}
