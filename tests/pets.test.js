import { test } from "node:test";
import assert from "node:assert/strict";
import { DOG, BAEK, CAT, petAt, isAsleep, petSpotOk, canPet, carePick, careYaw, canCare, CARE, PET_NAMES, faceDog, PET_SECONDS } from "../src/logic/pets.js";
import { KENNEL, BAEK_KENNEL, CAVE, YARD, STATUE, PRAYER, COURTYARD, HALL, insideHall, insideCave, clampToWalkable, routeAround } from "../src/logic/layout.js";
import { sunTimesKST } from "../src/logic/sky.js";

const kst = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);
const NOON = kst(2026, 11, 6, 12), MIDNIGHT = kst(2026, 11, 7, 0);

test("the kennel stands left of the hall when facing it, at the back, and people walk round it", () => {
  assert.ok(KENNEL.x > HALL.maxX && KENNEL.z > (HALL.minZ + HALL.maxZ) / 2 && KENNEL.z < COURTYARD.maxZ);
  const p = clampToWalkable({ x: KENNEL.x, z: KENNEL.z });
  assert.ok(Math.hypot(p.x - KENNEL.x, p.z - KENNEL.z) >= KENNEL.r);
  assert.ok(routeAround({ x: KENNEL.x, z: KENNEL.z - 3 }, { x: KENNEL.x, z: KENNEL.z + 2 }).length > 1, "goes round");
  assert.ok(petSpotOk(KENNEL.dog) && petSpotOk(KENNEL.cat) && petSpotOk(BAEK_KENNEL.dog));
});

test("the same clock gives everyone the same dog and cat", () => {
  for (const t of [NOON, NOON + 77777, MIDNIGHT]) {
    assert.deepEqual(petAt(DOG, t), petAt(DOG, t));
    assert.deepEqual(petAt(BAEK, t), petAt(BAEK, t));
    assert.deepEqual(petAt(CAT, t), petAt(CAT, t));
  }
});

test("pets stay in the yard and round the kennel, out of halls, objects and the prayer cushions", () => {
  for (const tl of [DOG, BAEK, CAT]) {
    for (let t = NOON; t < NOON + tl.total * 1000; t += 1700) {
      const a = petAt(tl, t), p = { x: a.x, z: a.z };
      assert.ok(Math.abs(a.x) < COURTYARD.maxX && a.z < COURTYARD.maxZ);
      assert.ok(!insideHall(p) && !insideCave(p));
      for (const o of [...YARD, { x: STATUE.x, z: STATUE.z, r: STATUE.baseR }]) assert.ok(Math.hypot(a.x - o.x, a.z - o.z) >= o.r, `${o.kind} ${a.x},${a.z}`);
      assert.ok(!(a.x > PRAYER.minX && a.x < PRAYER.maxX && a.z > PRAYER.minZ && a.z < PRAYER.maxZ));
    }
  }
});

test("the dog walks around by day and goes all over the yard, not just the kennel", () => {
  let far = 0, walks = 0, n = 0;
  for (let t = NOON; t < NOON + 3 * 3600000; t += 2000, n++) {
    const a = petAt(DOG, t);
    if (a.state === "walk") walks++;
    if (a.z < 3) far++;
    assert.notEqual(a.state, "sleep");
  }
  assert.ok(walks / n > 0.1, `walks ${walks / n}`);
  assert.ok(far / n > 0.3, `in the front yard ${far / n}`);
});

test("the cat mostly rests, walking only now and then", () => {
  let rests = 0, n = 0;
  for (let t = NOON; t < NOON + 3 * 3600000; t += 2000, n++) if (petAt(CAT, t).state !== "walk") rests++;
  assert.ok(rests / n > 0.8, `rests ${rests / n}`);
});

test("at night both sleep by the kennel", () => {
  const d = petAt(DOG, MIDNIGHT), c = petAt(CAT, MIDNIGHT);
  assert.equal(d.state, "sleep"); assert.equal(c.state, "sleep");
  assert.deepEqual([d.x, d.z], [KENNEL.dog.x, KENNEL.dog.z]);
  assert.deepEqual([c.x, c.z], [KENNEL.cat.x, KENNEL.cat.z]);
  assert.equal(d.pose, "lie"); assert.equal(c.pose, "curl");
  const b = petAt(BAEK, MIDNIGHT);
  assert.equal(b.state, "sleep"); assert.equal(b.pose, "lie");
  assert.deepEqual([b.x, b.z], [BAEK_KENNEL.dog.x, BAEK_KENNEL.dog.z]);
});

test("going to bed at dusk and getting up at dawn have no teleport, over many days", () => {
  for (const tl of [DOG, BAEK, CAT]) {
    for (let day = 0; day < 8; day++) {
      const base = kst(2026, 11, 6 + day, 0);
      const { sunrise, sunset } = sunTimesKST(new Date(base + 12 * 3600000));
      for (const edge of [sunrise, sunset]) {
        const c = base + edge * 60000;
        let prev = petAt(tl, c - 60000);
        for (let t = c - 59500; t < c + 40 * 60000; t += 500) {
          const a = petAt(tl, t);
          assert.ok(Math.hypot(a.x - prev.x, a.z - prev.z) < 1.2, `jump day ${day} at ${(t - c) / 1000}s`);
          prev = a;
        }
      }
    }
  }
});

test("after dusk each comes home soon, and after dawn leaves soon", () => {
  const base = kst(2026, 11, 6, 0);
  const { sunrise, sunset } = sunTimesKST(new Date(base + 12 * 3600000));
  for (const tl of [DOG, BAEK, CAT]) {
    assert.ok(isAsleep(tl, base + (sunset + 60) * 60000), "asleep within an hour of sunset");
    assert.ok(!isAsleep(tl, base + (sunrise + 60) * 60000), "up within an hour of sunrise");
  }
});

test("you can pet the dog only beside it while it stays put long enough", () => {
  const dog = { state: "rest", x: 1, z: 1, left: PET_SECONDS + 1 };
  assert.equal(canPet(dog, { x: 2, z: 1 }), true);
  assert.equal(canPet(dog, { x: 4, z: 1 }), false, "too far");
  assert.equal(canPet({ ...dog, state: "walk", left: 0 }, { x: 2, z: 1 }), false, "walking");
  assert.equal(canPet({ ...dog, left: PET_SECONDS - 1 }, { x: 2, z: 1 }), false, "about to get up");
  assert.equal(canPet({ ...dog, state: "sleep", left: Infinity }, { x: 2, z: 1 }), true, "a sleeping dog can be petted");
  const yaw = faceDog({ x: 0, z: 2 }, { x: 0, z: 0 });
  assert.ok(Math.abs(yaw) < 1e-9, "faces the dog");
});

test("baekgu walks the yard on its own path, seldom on top of the other dog", () => {
  let far = 0, close = 0, n = 0, differ = 0;
  for (let t = NOON; t < NOON + 3 * 3600000; t += 2000, n++) {
    const b = petAt(BAEK, t), d = petAt(DOG, t);
    if (b.z < 3) far++;
    if (Math.hypot(b.x - d.x, b.z - d.z) < 0.5) close++;
    if (b.x !== d.x || b.z !== d.z) differ++;
  }
  assert.ok(far / n > 0.3, `in the front yard ${far / n}`);
  assert.ok(differ / n > 0.95, "not the same path as the other dog");
  assert.ok(close / n < 0.02, `on top of the other dog ${close / n}`);
});

test("care goes to the nearest animal that can take it, and each animal has its own", () => {
  const rest = { state: "rest", left: 9 }, baduk = { ...rest, x: 0, z: 0 }, seol = { ...rest, x: 1.5, z: 0 }, nabi = { ...rest, x: 0.5, z: 1 };
  const all = [baduk, seol, nabi];
  assert.equal(carePick(all, { x: 0.4, z: 0 }, "treat"), 0);
  assert.equal(carePick(all, { x: 1.1, z: 0 }, "pet"), 1);
  assert.equal(carePick(all, { x: 0.5, z: 0.6 }, "churu"), 2);
  assert.equal(carePick(all, { x: 0.5, z: 0.6 }, "pat"), 2);
  assert.equal(carePick(all, { x: 9, z: 9 }, "treat"), -1);
  assert.equal(carePick([{ ...baduk, state: "walk", left: 0 }, seol, nabi], { x: 0.4, z: 0 }, "treat"), 1, "the walking one cannot be fed, so the other");
  assert.equal(carePick([{ ...baduk, left: CARE.treat.sec - 1 }, { ...seol, x: 9 }, nabi], { x: 0.4, z: 0 }, "treat"), -1, "not when about to get up");
  assert.equal(carePick([{ ...baduk, left: 1e9, state: "sleep" }, seol, nabi], { x: 0.4, z: 0 }, "treat"), 0, "a sleeping dog can be woken with a treat");
  assert.ok(canCare("cat", "churu") && canCare("cat", "pat") && !canCare("cat", "treat") && !canCare("dog", "churu") && canCare("baek", "treat"));
  assert.deepEqual(PET_NAMES, { dog: "바둑이", baek: "설탕", cat: "나비" });
});

test("the fed animal looks at you, the patted one turns its rump to you", () => {
  const animal = { x: 0, z: 0 }, person = { x: 0, z: -1 };
  assert.ok(Math.abs(careYaw(animal, person, "treat")) < 1e-9, "faces -z towards the person");
  assert.ok(Math.abs(Math.abs(careYaw(animal, person, "pat")) - Math.PI) < 1e-9, "faces away");
});

test("seoltang's house stands midway between the right wall and the cave steps, with both bowls side by side by the door", () => {
  assert.ok(Math.abs(BAEK_KENNEL.x - (COURTYARD.minX + CAVE.x) / 2) < 1e-9);
  const { bowls: B, r, z, dog } = BAEK_KENNEL;
  assert.ok(B.z < z - r, "in front of the house");
  assert.ok(Math.hypot(B.x - dog.x, B.z - dog.z) < 1.3, "near the dog's spot");
  assert.ok(B.gap * 2 <= 0.34 + 1e-9, "the two bowls touch");
  const foot = { x: CAVE.foot.x, z: CAVE.foot.z }, p = clampToWalkable(foot);
  assert.ok(Math.hypot(p.x - foot.x, p.z - foot.z) < 0.01, "the foot of the cave steps stays free");
  assert.ok(routeAround({ x: BAEK_KENNEL.x, z: 11 }, { x: BAEK_KENNEL.x, z: 16 }).length > 1, "people walk round the house");
});
