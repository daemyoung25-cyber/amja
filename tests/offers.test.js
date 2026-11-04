import { test } from "node:test";
import assert from "node:assert/strict";
import { OFFER_PLACES, liveOffers, offerLeft, pickOfferSlot, canOffer, OFFER_GAP_MS } from "../src/logic/offers.js";
import { offerPlace, HALL, CAVE, HERMITAGE, STATUE, PRAYER_SEATS, CUSHIONS } from "../src/logic/layout.js";

const now = 1_800_000_000_000, HOUR = 3600000, DAY = 86400000;

test("incense burns an hour, candles a day", () => {
  const recs = [
    { k: "hall", slot: 0, at: now - HOUR + 1000 }, { k: "hall", slot: 1, at: now - HOUR - 1 },
    { k: "cave", slot: 0, at: now - HOUR - 1 }, { k: "cave", slot: 1, at: now - DAY - 1 },
  ];
  assert.deepEqual(liveOffers(recs, "hall", now).map((r) => r.slot), [0]);
  assert.deepEqual(liveOffers(recs, "cave", now).map((r) => r.slot), [0]);
});

test("each place keeps only its own offerings and ignores junk", () => {
  const recs = [null, { k: "gwan", slot: 2, at: now }, { k: "herm", slot: 2, at: now }, { k: "herm", slot: 9, at: now }, { k: "nope", slot: 0, at: now }, { k: "gwan", slot: "x", at: now }];
  assert.deepEqual(liveOffers(recs, "gwan", now).map((r) => r.slot), [2]);
  assert.deepEqual(liveOffers(recs, "herm", now).map((r) => r.slot), [2]);   // 섬 암자 향로는 9칸
  assert.deepEqual(liveOffers(recs, "nope", now), []);
});

test("offerLeft shrinks over the place's own life", () => {
  assert.equal(offerLeft({ k: "hall", at: now - HOUR / 2 }, now), 0.5);
  assert.equal(offerLeft({ k: "gwan", at: now - DAY / 4 }, now), 0.75);
});

test("a full censer gives the oldest stick's place to the new one", () => {
  const live = Array.from({ length: OFFER_PLACES.hall.slots }, (_, i) => ({ k: "hall", slot: i, at: now - (i === 5 ? 3000 : 1000) }));
  assert.equal(pickOfferSlot(live, "hall"), 5);
  assert.equal(pickOfferSlot([{ k: "hall", slot: 0, at: now }], "hall"), 1);
});

test("one offering a minute", () => {
  assert.equal(canOffer(null, now), true);
  assert.equal(canOffer(now - OFFER_GAP_MS + 1, now), false);
  assert.equal(canOffer(now - OFFER_GAP_MS, now), true);
});

test("offerPlace: incense in the hall and the island hermitage, candles in the cave and before the sea statue", () => {
  assert.equal(offerPlace(CUSHIONS[0]), "hall");
  assert.equal(offerPlace(HERMITAGE.seats[1]), "herm");
  assert.equal(offerPlace(CAVE.seats[1]), "cave");
  assert.equal(offerPlace(PRAYER_SEATS[0]), "gwan");
  assert.equal(offerPlace({ x: STATUE.x, z: STATUE.z - 1.8 }), "gwan");
  assert.equal(offerPlace({ x: 0, z: -15 }), null);            // 마당 가운데
  assert.equal(offerPlace(HALL.door), null);                    // 법당 문 밖
});
