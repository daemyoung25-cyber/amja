import { test } from "node:test";
import assert from "node:assert/strict";
import { DOG, CAT, petAt, isAsleep, petSpotOk, canPet, faceDog, PET_SECONDS } from "../src/logic/pets.js";
import { KENNEL, YARD, STATUE, PRAYER, COURTYARD, HALL, insideHall, insideCave, clampToWalkable, routeAround } from "../src/logic/layout.js";
import { sunTimesKST } from "../src/logic/sky.js";

const kst = (y, m, d, h, min = 0) => Date.UTC(y, m - 1, d, h - 9, min);
const NOON = kst(2026, 11, 6, 12), MIDNIGHT = kst(2026, 11, 7, 0);

test("the kennel stands left of the hall when facing it, at the back, and people walk round it", () => {
  assert.ok(KENNEL.x > HALL.maxX && KENNEL.z > (HALL.minZ + HALL.maxZ) / 2 && KENNEL.z < COURTYARD.maxZ);
  const p = clampToWalkable({ x: KENNEL.x, z: KENNEL.z });
  assert.ok(Math.hypot(p.x - KENNEL.x, p.z - KENNEL.z) >= KENNEL.r);
  assert.ok(routeAround({ x: KENNEL.x, z: KENNEL.z - 3 }, { x: KENNEL.x, z: KENNEL.z + 2 }).length > 1, "goes round");
  assert.ok(petSpotOk(KENNEL.dog) && petSpotOk(KENNEL.cat));
});

test("the same clock gives everyone the same dog and cat", () => {
  for (const t of [NOON, NOON + 77777, MIDNIGHT]) {
    assert.deepEqual(petAt(DOG, t), petAt(DOG, t));
    assert.deepEqual(petAt(CAT, t), petAt(CAT, t));
  }
});

test("pets stay in the yard and round the kennel, out of halls, objects and the prayer cushions", () => {
  for (const tl of [DOG, CAT]) {
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
});

test("going to bed at dusk and getting up at dawn have no teleport, over many days", () => {
  for (const tl of [DOG, CAT]) {
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
  for (const tl of [DOG, CAT]) {
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
