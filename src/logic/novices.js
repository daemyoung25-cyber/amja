/* 동자승 다섯: 앞마당에서 제기차기와 공기놀이를 하며 논다. 그림은 scene/novices.js.
   동물처럼 서버 시계만으로 자리가 정해져 모두의 화면에서 같다. 놀이는 모둠마다 같은 때에 바꾼다.
   밤 12시에는 곧장 법당으로 들어가 자고, 해가 뜨면 나온다. */
import { petSpotOk, finishPet } from "./pets.js";
import { mulberry32, dist2, lineClear, pickStep, headingOf, makeTimeline } from "./itinerary.js";
import { nameTag } from "./name.js";

export const NOVICE_SCALE = 0.68;                     // 일반 사람보다 작게
export const NOVICE_BED = { x: 0, z: 7.8 };           // 법당 안 (문을 지나 들어간다)
const inFrontYard = (p) => petSpotOk(p) && p.z <= 3.2;
const HOMES = [-4, -2, 0, 2, 4].map((x) => ({ x, z: 2.6 }));   // 법당 앞 한 줄
const BLOCK = 110, SPEED = 0.95, HOURS = 6, BREAK_EVERY = 5;   // 놀이 한 판(초). 다섯 판에 한 번은 법당 앞에 모여 합장

export const JEGI = { x: 6, z: -3, r: 1.3 };          // 제기차기: 둥글게 서서
export const GONGGI = { x: -6, z: -2, r: 0.62 };      // 공기놀이: 둘러앉아
const slot = (g, i) => ({ x: Math.round((g.x + (Math.sin((i / 5) * 6.28318) * g.r)) * 100) / 100, z: Math.round((g.z + (Math.cos((i / 5) * 6.28318) * g.r)) * 100) / 100 });

// 판마다 누가 무엇을 하는지: 다섯을 섞어 제기 둘·셋, 나머지는 공기. 모두 같은 표를 본다
const BLOCKS = (() => {
  const rnd = mulberry32(77), list = [];
  for (let n = 0; n * BLOCK < HOURS * 3600; n++) {
    const ids = [0, 1, 2, 3, 4];
    for (let i = 4; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const jegi = 2 + (rnd() < 0.5 ? 1 : 0), play = {};
    ids.forEach((id, k) => { play[id] = k < jegi ? "jegi" : "gonggi"; });
    list.push(n % BREAK_EVERY === 0 ? null : play);   // null: 법당 앞에 모이는 판 (첫 판도 여기서 시작한다)
  }
  if (list[list.length - 1]) list.push(null);         // 끝은 집 앞이라 일정을 되풀이해도 튀지 않는다
  return list;
})();

function buildNovice(i) {
  const home = HOMES[i], rnd = mulberry32(900 + i * 37), tl = makeTimeline();
  let at = home;
  const walk = (to) => {
    const len = Math.sqrt(dist2(at, to));
    if (len > 0) tl.add({ kind: "walk", from: at, to, yaw: headingOf(at, to), dur: len / SPEED });
    at = to;
  };
  const walkTo = (to) => {   // 곧게 못 가면 가까워지는 쪽으로 한 걸음씩
    for (let n = 0; n < 30 && at !== to && !lineClear(at, to, inFrontYard); n++) {
      const step = pickStep(at, rnd, inFrontYard, { min: 1, max: 6, toward: to }) || pickStep(at, rnd, inFrontYard, { min: 1, max: 6 });
      if (step) walk(step);
    }
    walk(to);
  };
  BLOCKS.forEach((block, n) => {
    const end = (n + 1) * BLOCK, game = block && block[i];
    const g = game === "jegi" ? JEGI : GONGGI, to = game ? slot(g, i) : home;
    walkTo(to);
    tl.add({ kind: "rest", at, yaw: game ? headingOf(at, g) : 0, dur: Math.max(4, end - tl.total), pose: game || "hapjang", home: !game });
  });
  return finishPet(tl, { home, homeYaw: 0, sleepPose: "stand", seed: 900 + i * 37, speed: SPEED, ok: inFrontYard, bed: NOVICE_BED });
}

export const NOVICES = HOMES.map((_, i) => buildNovice(i));

// 들어온 분께 건네는 말과 달려갈 동자승: 이름으로 정해 어느 화면에서나 같다
const LINES = ["안녕하세요!", "같이 놀아요~", "제기차기 보실래요?", "공기놀이 할 줄 아세요?"];
const hash = (s) => [...String(s || "")].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) | 0, 7) >>> 0;
export const noviceFor = (name) => hash(name) % NOVICES.length;
export function noviceLine(name, sex) {
  const t = nameTag(name, sex), line = LINES[hash(name) % LINES.length];
  return t ? `${t}님, ${line}` : line;
}
