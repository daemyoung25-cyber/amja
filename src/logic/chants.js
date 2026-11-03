/* 들을 수 있는 염불·예불 녹음들. 소리 설정에서 하나를 고르면 '불경' 층이 그 녹음으로 바뀐다.
   hits는 녹음 속 목탁 타격 [초, 세기] (900~2500Hz 딱 소리 급등으로 뽑음). 목탁이 없는 녹음은 비어 있고, 그때 스님은 목탁을 든 채 염불만 한다.
   새 녹음은 모두 chant.mp3과 같은 크기(RMS)로 맞추고 끝 3초를 처음에 겹쳐 반복 이음, 모노 80kbps. */
import { MOKTAK_HITS, CHANT_LEN } from "./moktak.js";

export const CHANTS = [
  { id: "yeombul", name: "염불소리 · 반야심경", url: "sounds/chant.mp3", len: CHANT_LEN, hits: MOKTAK_HITS },
  { id: "seoul", name: "서울 절 저녁예불", url: "sounds/chant-seoul.mp3", len: 253.05, hits: [] },
  { id: "gakwon", name: "천안 각원사 염불 (법당 밖)", url: "sounds/chant-gakwon.mp3", len: 187.04, hits: [] },
  { id: "bulguk", name: "경주 불국사 스님 염불", url: "sounds/chant-bulguk.mp3", len: 30.75, hits: [] },
  { id: "seonun", name: "고창 선운사 염불·목탁 (샘물 소리)", url: "sounds/chant-seonun.mp3", len: 234.03, hits: [[30.05, 0.42], [31.25, 0.22], [77.09, 1.00], [78.32, 0.57], [151.84, 0.98], [153.00, 0.49]] },
];
export const chantById = (id) => CHANTS.find((c) => c.id === id) || CHANTS[0];
