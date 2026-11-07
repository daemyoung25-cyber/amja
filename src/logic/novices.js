/* 동자승 다섯: 앞마당에서 제기차기와 공기놀이를 하고, 동물을 따라다니며 쓰다듬는다. 그림은 scene/novices.js.
   동물처럼 서버 시계만으로 자리가 정해져 모두의 화면에서 같다. 놀이는 모둠마다 같은 때에 바꾼다.
   밤 12시에는 곧장 법당으로 들어가 자고, 해가 뜨면 나와 공기놀이 자리로 간다. */
import { petSpotOk, finishPet, petAt, DOG, BAEK, CAT, HWANG } from "./pets.js";
import { mulberry32, dist2, lineClear, pickStep, headingOf, makeTimeline } from "./itinerary.js";
import { nameTag } from "./name.js";
import { COURTYARD, RAIL_Z } from "./layout.js";

export const NOVICE_SCALE = 0.68;                     // 일반 사람보다 작게
export const NOVICE_BED = { x: 0, z: 7.8 };           // 법당 안 (문을 지나 들어간다)
const inFrontYard = (p) => petSpotOk(p) && p.z <= 3.2;
const BLOCK = 110, SPEED = 0.95, HOURS = 6, PET_EVERY = 3, RUN_IN = 18;   // 놀이 한 판(초), 몇 판마다 동물과 노는지, 동물에게 달려가는 시간(초)
const YARD_END_Z = 3.1;                               // 동물이 법당 옆으로 가면 앞마당 끝에서 기다린다 (건물을 뚫지 않게)

export const JEGI = { x: 6, z: -3, r: 1.3 };          // 제기차기: 둥글게 서서
export const GONGGI = { x: -6, z: -2, r: 0.62 };      // 공기놀이: 둘러앉아 (아침에 나와서 가는 자리)
const slot = (g, i) => ({ x: Math.round((g.x + (Math.sin((i / 5) * 6.28318) * g.r)) * 100) / 100, z: Math.round((g.z + (Math.cos((i / 5) * 6.28318) * g.r)) * 100) / 100 });
const ANIMALS = { dog: DOG, baek: BAEK, cat: CAT, hwang: HWANG };
const ANIMAL_IDS = Object.keys(ANIMALS);

// 판마다 누가 무엇을 하는지. 모두 같은 표를 본다. 값은 "jegi" | "gonggi" | { pet: 동물, side: 왼쪽 -1·오른쪽 1 }
const allGonggi = () => ({ 0: "gonggi", 1: "gonggi", 2: "gonggi", 3: "gonggi", 4: "gonggi" });
const BLOCKS = (() => {
  const rnd = mulberry32(77), list = [];
  for (let n = 0; n * BLOCK < HOURS * 3600; n++) {
    const ids = [0, 1, 2, 3, 4];
    for (let i = 4; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ids[i], ids[j]] = [ids[j], ids[i]]; }
    const jegi = 2 + (rnd() < 0.5 ? 1 : 0), animal = ANIMAL_IDS[Math.floor(rnd() * ANIMAL_IDS.length)], rest = rnd() < 0.5 ? "jegi" : "gonggi", play = {};
    if (n === 0) { list.push(allGonggi()); continue; }
    if (n % PET_EVERY === 2) ids.forEach((id, k) => { play[id] = k < 2 ? { pet: animal, side: k ? 1 : -1 } : rest; });
    else ids.forEach((id, k) => { play[id] = k < jegi ? "jegi" : "gonggi"; });
    list.push(play);
  }
  list.push(allGonggi());                             // 끝은 첫 자리라 일정을 되풀이해도 튀지 않는다
  return list;
})();

const smooth = (u) => u * u * (3 - 2 * u);
// 동물 곁 자리: 앞마당 안으로 잡는다. near는 동물에게 손이 닿는 곁인지
function besideAnimal(id, side, tMs) {
  const a = petAt(ANIMALS[id], tMs);
  const want = { x: a.x + side * 0.46, z: a.z + 0.2 };
  const at = { x: Math.max(COURTYARD.minX + 1, Math.min(COURTYARD.maxX - 1, want.x)), z: Math.max(RAIL_Z + 1, Math.min(YARD_END_Z, want.z)) };
  return { a, at, near: !a.inside && dist2(at, want) < 0.01 };
}
// 동물 곁으로 달려가 따라다니다, 동물이 쉬면 쓰다듬는다
const followAt = (id, side, from) => (e, t) => {
  const { a, at, near } = besideAnimal(id, side, t * 1000), u = Math.min(1, e / RUN_IN), k = smooth(u);
  const x = from.x + (at.x - from.x) * k, z = from.z + (at.z - from.z) * k;
  if (u < 1 || (near && a.state === "walk")) return { state: "walk", x, z, yaw: u < 1 ? headingOf({ x, z }, at) : a.yaw, pose: "walk", left: 0 };
  const stroking = near && (t / 10) % 1 < 0.65;       // 쓰다듬다가 잠깐 바라본다
  return { state: "rest", x, z, yaw: headingOf({ x, z }, a), pose: stroking ? "pet" : near ? "stand" : "jegi", left: 5, petWith: stroking ? id : null, waiting: !near };   // 동물이 앞마당 밖이면 제기를 차며 기다린다
};
// 놀던 동물 곁에서 다음 놀이 자리로
const leaveAt = (seg, to) => (e, t) => {
  const end = seg.at_t(seg.dur, t - e), k = smooth(Math.min(1, e / RUN_IN));
  const x = end.x + (to.x - end.x) * k, z = end.z + (to.z - end.z) * k;
  return { state: "walk", x, z, yaw: headingOf({ x, z }, to), pose: "walk", left: 0 };
};

function buildNovice(i) {
  const home = slot(GONGGI, i), rnd = mulberry32(900 + i * 37), tl = makeTimeline();
  let at = home, after = null;                        // after: 방금 끝난 동물 놀기 구간
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
  BLOCKS.forEach((play, n) => {
    const end = (n + 1) * BLOCK, game = play[i];
    if (typeof game === "object") {                   // 동물과 놀기: 이 판 끝까지 (다음 판은 늘 놀이 자리다)
      const seg = { kind: "follow", dur: end - tl.total, at_t: followAt(game.pet, game.side, at) };
      after = tl.add(seg);
      return;
    }
    const g = game === "jegi" ? JEGI : GONGGI, to = slot(g, i);
    if (after) { tl.add({ kind: "leave", dur: RUN_IN, at_t: leaveAt(after, to) }); after = null; at = to; }
    else walkTo(to);
    tl.add({ kind: "rest", at, yaw: headingOf(at, g), dur: Math.max(4, end - tl.total), pose: game, home: game === "gonggi" });
  });
  return finishPet(tl, { home, homeYaw: headingOf(home, GONGGI), sleepPose: "stand", seed: 900 + i * 37, speed: SPEED, ok: inFrontYard, bed: NOVICE_BED });
}

export const NOVICES = [0, 1, 2, 3, 4].map(buildNovice);

// 들어온 분께 건네는 말과 달려갈 동자승: 이름으로 정해 어느 화면에서나 같다
const LINES = ["안녕하세요!", "같이 놀아요~", "제기차기 보실래요?", "공기놀이 할 줄 아세요?"];
const hash = (s) => [...String(s || "")].reduce((h, c) => (Math.imul(h, 31) + c.codePointAt(0)) | 0, 7) >>> 0;
export const noviceFor = (name) => hash(name) % NOVICES.length;
export function noviceLine(name, sex) {
  const t = nameTag(name, sex), line = LINES[hash(name) % LINES.length];
  return t ? `${t}님, ${line}` : line;
}
