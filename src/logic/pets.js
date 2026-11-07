/* 바둑이·백구·황구와 하얀 고양이의 하루. 그림은 scene/pets.js.
   서버 시계만으로 자리가 정해져 모두의 화면에서 같다. 집 앞에서 시작해 마당을 돌고 집 앞으로 돌아오기를 되풀이하고,
   밤 12시 정각이 되면 어디에 있든 곧장 돌아가 집 안으로 들어가 자고(나비는 바둑이 집, 보리는 집 없이 보살님 곁),
   해가 뜬 뒤 그 쉬는 시간이 끝날 때 다시 나선다 (순간 이동이 없다). */
import { RAIL_Z, YARD, STATUE, PRAYER, KENNEL, BAEK_KENNEL, BONGSONG, COURTYARD, TEA } from "./layout.js";
import { mulberry32, dist2, lineClear, pickStep, headingOf, makeTimeline, segAt } from "./itinerary.js";
import { sunTimesKST } from "./sky.js";
import { WALK_SPEED } from "../config.js";

const PAD = 0.4;
const ROUNDS = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD, ...[[11.2, 10], [11, 15.2], [25, 12], [-11.2, 9], [-11, 14.5], [-25, 9]].map(([x, z]) => ({ x, z, r: 0.5 }))];   // 법당 양옆 소나무
const inPrayer = (p) => p.x > PRAYER.minX - PAD && p.x < PRAYER.maxX + PAD && p.z > PRAYER.minZ - PAD && p.z < PRAYER.maxZ + PAD;
const X0 = COURTYARD.minX + 1.5, X1 = COURTYARD.maxX - 1.5;
const inYard = (p) => p.x >= X0 && p.x <= X1 && p.z >= RAIL_Z + 1.2 && p.z <= 3.2;      // 법당 앞마당
const inSide = (p) => p.x >= X0 && p.x <= X1 && Math.abs(p.x) >= 10.3 && p.z >= 3.2 && p.z <= 15.8;   // 법당 양옆 개집 둘레
const inTea = (p) => p.x > TEA.x - TEA.w / 2 - PAD && p.x < TEA.x + TEA.w / 2 + PAD && p.z > TEA.door.z - PAD && p.z < TEA.z + TEA.d / 2 + PAD;   // 다실과 앞 디딤돌

export const petSpotOk = (p) => (inYard(p) || inSide(p)) && !inPrayer(p) && !inTea(p) && ROUNDS.every((o) => dist2(p, o) >= (o.r + PAD) ** 2);

const HOUR = 3600, HOME_YAW = 0;                     // 집 앞에선 마당 쪽(바다 쪽)을 본다
const CAT_POSES = ["sit", "curl"], DOG_POSES = ["sit", "lie"];

// 집 안 자리(bed)로 들어가는 길: 문 앞을 거쳐 들어간다 (벽을 뚫지 않게)
const bedSteps = (bed) => [{ x: bed.x, z: bed.z - 0.85 }, { x: bed.x, z: bed.z }];
// 점들을 잇는 걷는 길. 구간마다 걸리는 시간이 붙는다
function pathOf(tl, pts) {
  const legs = []; let dur = 0;
  for (let i = 1; i < pts.length; i++) {
    const sec = Math.sqrt(dist2(pts[i - 1], pts[i])) / tl.speed;
    if (sec > 0) { legs.push({ from: pts[i - 1], to: pts[i], start: dur, dur: sec }); dur += sec; }
  }
  return { legs, dur };
}
function alongPath(path, e) {
  const leg = path.legs.find((l) => e < l.start + l.dur) || path.legs[path.legs.length - 1], u = Math.min(1, (e - leg.start) / leg.dur);
  return { state: "walk", x: leg.from.x + (leg.to.x - leg.from.x) * u, z: leg.from.z + (leg.to.z - leg.from.z) * u, yaw: headingOf(leg.from, leg.to), pose: "walk", left: 0 };
}

function buildPet({ seed, home, speed, legs, leg, rest, homeRest, poses, ok = petSpotOk, homeYaw = HOME_YAW, wander = false, sleepPose = null, bed = null }) {
  const rnd = mulberry32(seed), tl = makeTimeline();
  const range = ([a, b]) => a + rnd() * (b - a);
  let at = home, yaw = homeYaw;
  const walk = (to) => {
    const len = Math.sqrt(dist2(at, to));
    yaw = headingOf(at, to);
    tl.add({ kind: "walk", from: at, to, yaw, dur: len / speed });
    at = to;
  };
  const stay = (d, isHome = false) => tl.add({ kind: "rest", at, yaw: isHome ? homeYaw : yaw, dur: d, pose: isHome ? poses[1] : poses[Math.floor(rnd() * poses.length)], home: isHome });
  do {
    stay(range(homeRest), true);
    // 나들이마다 앞마당 한 곳을 목적지로 삼는다: 그냥 헤매면 집 둘레만 맴돈다
    const goal = { x: -37 + rnd() * 59, z: -23 + rnd() * 25 };
    for (let i = 0; i < legs; i++) {
      const to = pickStep(at, rnd, ok, { min: leg[0], max: leg[1], toward: wander ? null : goal }) || pickStep(at, rnd, ok, { min: leg[0], max: leg[1] });
      if (to) walk(to);
      stay(range(rest));
    }
    while (at !== home) {                            // 집으로: 곧게 못 가면 가까워지는 쪽으로 한 걸음씩
      if (lineClear(at, home, ok)) { walk(home); break; }
      const to = pickStep(at, rnd, ok, { min: 2, max: 9, toward: home }) || pickStep(at, rnd, ok, { min: 2, max: 9 });
      if (to) walk(to);
    }
  } while (tl.total < 6 * HOUR);
  return finishPet(tl, { home, homeYaw, sleepPose, seed, speed, ok, bed });
}

// 일정표를 마무리한다: 밤에 돌아가는 길과 아침에 나오는 길에 쓸 값을 붙인다 (동자승도 쓴다)
export function finishPet(tl, { home, homeYaw, sleepPose, seed, speed, ok, bed }) {
  Object.assign(tl, { homeYaw, sleepPose, seed, speed, ok, bed, nights: new Map() });
  tl.wakeUp = bed && pathOf(tl, [...bedSteps(bed)].reverse().concat(home));
  tl.homes = tl.segs.filter((s) => s.home).map((s) => ({ start: s.start, end: s.start + s.dur }));
  return tl;
}

export const DOG = buildPet({ seed: 505, home: KENNEL.dog, speed: 1.1, legs: 5, leg: [3, 9], rest: [12, 35], homeRest: [40, 90], poses: DOG_POSES, bed: KENNEL });
export const BAEK = buildPet({ seed: 717, home: BAEK_KENNEL.dog, speed: 1.25, legs: 4, leg: [4, 10], rest: [15, 40], homeRest: [50, 110], poses: DOG_POSES, bed: BAEK_KENNEL });
export const CAT = buildPet({ seed: 606, home: KENNEL.cat, speed: 0.55, legs: 3, leg: [2, 6], rest: [45, 120], homeRest: [90, 180], poses: CAT_POSES, bed: KENNEL });
// 황구: 공양주 보살님 바라기. 보살님 둘레에서만 맴돌다 돌아와 곁에 앉아 보살님을 본다. 밤에도 집이 아니라 그 곁에서 잔다
export const HWANG_ROAM = 5;
const nearBosal = (p) => petSpotOk(p) && dist2(p, BONGSONG.bosal) <= HWANG_ROAM * HWANG_ROAM;
export const HWANG = buildPet({ seed: 828, home: BONGSONG.dog, speed: 1.15, legs: 2, leg: [1.5, 3.5], rest: [4, 12], homeRest: [70, 170], poses: ["sit", "sit"], ok: nearBosal, homeYaw: headingOf(BONGSONG.dog, BONGSONG.bosal), wander: true, sleepPose: "lie" });

// sec 이후 처음으로 집에 도착하는(또는 쉼을 마치고 떠나는) 시각(초)
function nextHome(tl, sec, key) {
  const cycle = Math.floor(sec / tl.total), local = sec - cycle * tl.total;
  const hit = tl.homes.find((h) => h[key] >= local);
  return hit ? cycle * tl.total + hit[key] : (cycle + 1) * tl.total + tl.homes[0][key];
}

const DAY = 86400000, KST = 9 * 3600000;
const midnightOf = (tMs) => Math.floor((tMs + KST) / DAY) * DAY - KST;
// 그날 일어나는 시각: 해가 뜬 뒤 첫 쉬는 시간이 끝날 때
const wakeOf = (tl, tMs) => nextHome(tl, (midnightOf(tMs) + sunTimesKST(new Date(tMs)).sunrise * 60000) / 1000, "end") * 1000;
// 밤 12시부터 일어날 때까지 (돌아가는 길과 나오는 길을 포함)
export const isAsleep = (tl, tMs) => tMs < wakeOf(tl, tMs);

// 12시 정각 자리에서 집까지의 길. 그날 날짜를 씨앗으로 삼아 모두의 화면에서 같다
function nightPath(tl, mid) {
  if (tl.nights.has(mid)) return tl.nights.get(mid);
  const rnd = mulberry32(tl.seed ^ Math.floor(mid / DAY)), home = tl.segs[0].at, s = dayAt(tl, mid / 1000);
  const pts = [{ x: s.x, z: s.z }];
  let at = pts[0];
  for (let i = 0; i < 40 && !lineClear(at, home, tl.ok); i++) {
    const to = pickStep(at, rnd, tl.ok, { min: 2, max: 9, toward: home }) || pickStep(at, rnd, tl.ok, { min: 2, max: 9 });
    if (to) { pts.push(to); at = to; }
  }
  pts.push(home);
  if (tl.bed) pts.push(...bedSteps(tl.bed));
  const path = pathOf(tl, pts);
  tl.nights.clear(); tl.nights.set(mid, path);
  return path;
}

const ASLEEP_POSE = { [DOG_POSES[1]]: "lie", [CAT_POSES[1]]: "curl" };

export function petAt(tl, tMs) {
  if (!isAsleep(tl, tMs)) return dayAt(tl, tMs / 1000);
  const mid = midnightOf(tMs), night = nightPath(tl, mid), sinceMid = (tMs - mid) / 1000;
  if (sinceMid < night.dur) return alongPath(night, sinceMid);
  const toWake = (wakeOf(tl, tMs) - tMs) / 1000;
  if (tl.wakeUp && toWake <= tl.wakeUp.dur) return alongPath(tl.wakeUp, tl.wakeUp.dur - toWake);
  const spot = tl.bed || tl.segs[0].at;
  return { state: "sleep", x: spot.x, z: spot.z, yaw: tl.homeYaw, pose: tl.sleepPose || ASLEEP_POSE[tl.segs[0].pose], left: Infinity, inside: !!tl.bed };
}

// 깨어 있는 때의 일정
function dayAt(tl, t) {
  const { seg, e } = segAt(tl, t);
  if (seg.at_t) return seg.at_t(e, t);
  if (seg.kind === "walk") {
    const u = e / seg.dur;
    return { state: "walk", x: seg.from.x + (seg.to.x - seg.from.x) * u, z: seg.from.z + (seg.to.z - seg.from.z) * u, yaw: seg.yaw, pose: "walk", left: 0 };
  }
  return { state: "rest", x: seg.at.x, z: seg.at.z, yaw: seg.yaw, pose: seg.pose, left: seg.dur - e };
}

/* 돌보기: 동물이 앉거나 누워 있고, 곁까지 걸어가 돌보는 동안 일어나 걷지 않을 때만. 몇 걸음 떨어져도 버튼이 뜨고, 손이 안 닿으면 걸어가서 준다 */
export const PET_SECONDS = 4;
const PET_RANGE = 3;                                 // 버튼이 뜨는 거리
const PET_REACH = 1.2;                               // 몸을 숙여 뻗은 손이 닿는 거리
const CARE_STOP = 0.85;                              // 걸어가서 멈추는 자리 (동물에서 이만큼)
const walkUpSec = (d) => (d <= PET_REACH ? 0 : (d - CARE_STOP) / WALK_SPEED + 1);   // 1초는 둘러 가는 여유
export const canPet = (dog, p, sec = PET_SECONDS) => {
  const d = Math.sqrt(dist2(dog, p));
  return dog.state !== "walk" && !dog.inside && d <= PET_RANGE && dog.left >= sec + walkUpSec(d);
};
// 동물마다 손이 닿고 머리가 부딪히지 않는 거리에 선다: 멀면 다가가고 너무 붙어 있으면 물러나서 준다
const roomAt = (stop) => ({ reach: stop + 0.08, stop, near: stop - 0.1 });
export const CARE_ROOM = { dog: roomAt(0.72), baek: roomAt(0.7), cat: roomAt(0.58), hwang: roomAt(0.74) };
const ROOM = { reach: PET_REACH, stop: CARE_STOP, near: 0 };
// 손이 안 닿거나 너무 붙어 있으면 걸어가 멈출 자리(내 쪽에서 동물 곁), 그대로 되면 null
export function careSpot(animal, p, id) {
  const d = Math.sqrt(dist2(animal, p)), { reach, stop, near } = CARE_ROOM[id] || ROOM;
  if (d <= reach && d >= near) return null;
  const k = stop / Math.max(d, 0.01);
  return { x: animal.x + (p.x - animal.x) * k, z: animal.z + (p.z - animal.z) * k };
}
export const faceDog = (p, dog) => headingOf(p, dog);
// 동물 순서와 머리 위 이름, 돌보기 종류. who = 받을 수 있는 동물, sec = 걸리는 시간
export const PET_IDS = ["dog", "baek", "cat", "hwang"];
export const PET_NAMES = { dog: "바둑이", baek: "설탕이", cat: "나비", hwang: "보리" };
export const CARE = {
  pet: { who: ["dog", "baek", "hwang"], sec: PET_SECONDS, pose: "pet" },
  treat: { who: ["dog", "baek", "hwang"], sec: 5, pose: "feed", item: 1.1 },   // item: 손에 든 것이 입으로 들어가는 때까지
  churu: { who: ["cat"], sec: 6, pose: "feed", item: 6 },
  pat: { who: ["cat"], sec: 4, pose: "pat" },
};
export const canCare = (w, a) => !!CARE[a] && CARE[a].who.includes(w);
// 곁에 있는 동물 중 이 돌보기를 받을 수 있는 가장 가까운 번호 (없으면 -1)
export function carePick(pets, p, a) {
  let best = -1, d = Infinity;
  pets.forEach((x, i) => { const q = dist2(x, p); if (canCare(PET_IDS[i], a) && canPet(x, p, CARE[a].sec) && q < d) { d = q; best = i; } });
  return best;
}
// 돌보는 동안 동물이 볼 쪽: 먹을 땐 사람을 보고, 궁디팡팡은 엉덩이를 사람 쪽으로
export const careYaw = (animal, person, a) => (a === "pat" ? headingOf(person, animal) : headingOf(animal, person));
