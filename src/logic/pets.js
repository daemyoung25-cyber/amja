/* 바둑이·백구와 하얀 고양이의 하루. 그림은 scene/pets.js.
   서버 시계만으로 자리가 정해져 모두의 화면에서 같다. 집 앞에서 시작해 마당을 돌고 집 앞으로 돌아오기를 되풀이하고,
   해가 진 뒤 처음 집에 돌아오면 거기서 자고, 해가 뜬 뒤 그 쉬는 시간이 끝날 때 다시 나선다 (순간 이동이 없다). */
import { RAIL_Z, YARD, STATUE, PRAYER, KENNEL, BAEK_KENNEL } from "./layout.js";
import { mulberry32, dist2, lineClear, pickStep, headingOf, makeTimeline, segAt } from "./itinerary.js";
import { sunTimesKST } from "./sky.js";

const PAD = 0.4;
const ROUNDS = [{ x: STATUE.x, z: STATUE.z, r: STATUE.baseR }, ...YARD, ...[[11.2, 10], [11, 15.2], [25, 12], [-11.2, 9], [-11, 14.5], [-25, 9]].map(([x, z]) => ({ x, z, r: 0.5 }))];   // 법당 양옆 소나무
const inPrayer = (p) => p.x > PRAYER.minX - PAD && p.x < PRAYER.maxX + PAD && p.z > PRAYER.minZ - PAD && p.z < PRAYER.maxZ + PAD;
const inYard = (p) => p.x >= -24.5 && p.x <= 24.5 && p.z >= RAIL_Z + 1.2 && p.z <= 3.2;      // 법당 앞마당
const inSide = (p) => Math.abs(p.x) >= 10.3 && Math.abs(p.x) <= 24.5 && p.z >= 3.2 && p.z <= 15.8;   // 법당 양옆 개집 둘레

export const petSpotOk = (p) => (inYard(p) || inSide(p)) && !inPrayer(p) && ROUNDS.every((o) => dist2(p, o) >= (o.r + PAD) ** 2);

const HOUR = 3600, HOME_YAW = 0;                     // 집 앞에선 마당 쪽(바다 쪽)을 본다
const CAT_POSES = ["sit", "curl"], DOG_POSES = ["sit", "lie"];

function buildPet({ seed, home, speed, legs, leg, rest, homeRest, poses }) {
  const rnd = mulberry32(seed), tl = makeTimeline();
  const range = ([a, b]) => a + rnd() * (b - a);
  let at = home, yaw = HOME_YAW;
  const walk = (to) => {
    const len = Math.sqrt(dist2(at, to));
    yaw = headingOf(at, to);
    tl.add({ kind: "walk", from: at, to, yaw, dur: len / speed });
    at = to;
  };
  const stay = (d, isHome = false) => tl.add({ kind: "rest", at, yaw: isHome ? HOME_YAW : yaw, dur: d, pose: isHome ? poses[1] : poses[Math.floor(rnd() * poses.length)], home: isHome });
  do {
    stay(range(homeRest), true);
    // 나들이마다 앞마당 한 곳을 목적지로 삼는다: 그냥 헤매면 집 둘레만 맴돈다
    const goal = { x: -22 + rnd() * 44, z: -23 + rnd() * 25 };
    for (let i = 0; i < legs; i++) {
      const to = pickStep(at, rnd, petSpotOk, { min: leg[0], max: leg[1], toward: goal }) || pickStep(at, rnd, petSpotOk, { min: leg[0], max: leg[1] });
      if (to) walk(to);
      stay(range(rest));
    }
    while (at !== home) {                            // 집으로: 곧게 못 가면 가까워지는 쪽으로 한 걸음씩
      if (lineClear(at, home, petSpotOk)) { walk(home); break; }
      const to = pickStep(at, rnd, petSpotOk, { min: 2, max: 9, toward: home }) || pickStep(at, rnd, petSpotOk, { min: 2, max: 9 });
      if (to) walk(to);
    }
  } while (tl.total < 6 * HOUR);
  tl.homes = tl.segs.filter((s) => s.home).map((s) => ({ start: s.start, end: s.start + s.dur }));
  return tl;
}

export const DOG = buildPet({ seed: 505, home: KENNEL.dog, speed: 1.1, legs: 5, leg: [3, 9], rest: [12, 35], homeRest: [40, 90], poses: DOG_POSES });
export const BAEK = buildPet({ seed: 717, home: BAEK_KENNEL.dog, speed: 1.25, legs: 4, leg: [4, 10], rest: [15, 40], homeRest: [50, 110], poses: DOG_POSES });
export const CAT = buildPet({ seed: 606, home: KENNEL.cat, speed: 0.55, legs: 3, leg: [2, 6], rest: [45, 120], homeRest: [90, 180], poses: CAT_POSES });

// sec 이후 처음으로 집에 도착하는(또는 쉼을 마치고 떠나는) 시각(초)
function nextHome(tl, sec, key) {
  const cycle = Math.floor(sec / tl.total), local = sec - cycle * tl.total;
  const hit = tl.homes.find((h) => h[key] >= local);
  return hit ? cycle * tl.total + hit[key] : (cycle + 1) * tl.total + tl.homes[0][key];
}

const DAY = 86400000, KST = 9 * 3600000;
export function isAsleep(tl, tMs) {
  const dayStart = Math.floor((tMs + KST) / DAY) * DAY - KST;
  const { sunrise, sunset } = sunTimesKST(new Date(tMs));
  const rise = dayStart + sunrise * 60000, set = dayStart + sunset * 60000;
  if (tMs >= set) return tMs / 1000 >= nextHome(tl, set / 1000, "start");
  if (tMs < rise) return tMs / 1000 >= nextHome(tl, (set - DAY) / 1000, "start");
  return tMs / 1000 < nextHome(tl, rise / 1000, "end");
}

const ASLEEP_POSE = { [DOG_POSES[1]]: "lie", [CAT_POSES[1]]: "curl" };

export function petAt(tl, tMs) {
  const t = tMs / 1000, { seg, e } = segAt(tl, t);
  if (isAsleep(tl, tMs)) {
    const home = tl.segs[0].at;
    return { state: "sleep", x: home.x, z: home.z, yaw: HOME_YAW, pose: ASLEEP_POSE[tl.segs[0].pose], left: Infinity };
  }
  if (seg.kind === "walk") {
    const u = e / seg.dur;
    return { state: "walk", x: seg.from.x + (seg.to.x - seg.from.x) * u, z: seg.from.z + (seg.to.z - seg.from.z) * u, yaw: seg.yaw, pose: "walk", left: 0 };
  }
  return { state: "rest", x: seg.at.x, z: seg.at.z, yaw: seg.yaw, pose: seg.pose, left: seg.dur - e };
}

/* 돌보기: 동물이 앉거나 누워 있고, 쓰다듬는 동안(PET_SECONDS) 일어나 걷지 않을 때만, 곁에서 */
export const PET_SECONDS = 4;
const PET_RANGE = 1.2;                               // 몸을 숙여 뻗은 손이 닿는 거리
export const canPet = (dog, p, sec = PET_SECONDS) => dog.state !== "walk" && dog.left >= sec && dist2(dog, p) <= PET_RANGE * PET_RANGE;
export const faceDog = (p, dog) => headingOf(p, dog);
// 동물 순서와 머리 위 이름, 돌보기 종류. who = 받을 수 있는 동물, sec = 걸리는 시간
export const PET_IDS = ["dog", "baek", "cat"];
export const PET_NAMES = { dog: "바둑이", baek: "설탕", cat: "나비" };
export const CARE = {
  pet: { who: ["dog", "baek"], sec: PET_SECONDS, pose: "pet" },
  treat: { who: ["dog", "baek"], sec: 5, pose: "feed", item: 1.1 },   // item: 손에 든 것이 입으로 들어가는 때까지
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
