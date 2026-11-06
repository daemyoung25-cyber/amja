/* 밤 등불: 달빛만으로는 건물이 보이지 않아 불빛이 있을 만한 곳에 따뜻한 빛을 둔다.
   조명 하나마다 폰이 그릴 양이 늘어나므로 4개를 넘기지 않는다. 그림자는 드리우지 않는다. */
import { HERMITAGE } from "./layout.js";

export const LAMP_COLOR = 0xffc48a;
export const LAMPS = [
  { x: 8, y: 2, z: 3.2, power: 23.4, reach: 18 },           // 법당 앞 석등 한 쌍
  { x: -8, y: 2, z: 3.2, power: 23.4, reach: 18 },
  { x: 0, y: 3, z: -15, power: 14.4, reach: 16 },            // 마당 가운데 연등 아래
  { x: HERMITAGE.x + HERMITAGE.d / 2 + 1, y: HERMITAGE.fy + HERMITAGE.wallH - 0.2, z: HERMITAGE.z, power: 16.2, reach: 14 },   // 섬 암자 처마 등
];
// night: 0 낮 ~ 1 밤 (해가 지평선 아래 10도). 해가 지면 서서히 켜진다
export const lampPower = (lamp, night) => lamp.power * night;
// 밤에 더하는 양: 한밤에 달빛과 하늘빛이 둘 다 0.6이 되게 (하늘빛은 원래 밤에도 조금 더 밝다)
export const MOON_LIGHT = 0.35, SKY_LIGHT = 0.29;
