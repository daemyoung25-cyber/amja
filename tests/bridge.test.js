import { test } from "node:test";
import assert from "node:assert/strict";
import { BRIDGE, ISLAND, RAIL_Z, COURTYARD, HALL, LEAN_Z, floorY, resolveTap, routeAround, clampToWalkable, nearestLeanSpot, onBridge, onIsland, bridgeAt } from "../src/logic/layout.js";

const dist = (a, b) => Math.hypot(a.x - b.x, a.z - b.z);
const inYard = (p) => p.x >= COURTYARD.minX && p.x <= COURTYARD.maxX && p.z >= COURTYARD.minZ && p.z <= COURTYARD.maxZ;
const ok = (p) => inYard(p) || onBridge(p) || onIsland(p);
// 길 전체를 촘촘히 따라가며 늘 걸을 수 있는 곳인지
function walkableAll(from, path) {
  let a = from;
  for (const b of path) {
    for (let i = 0; i <= 40; i++) { const p = { x: a.x + (b.x - a.x) * i / 40, z: a.z + (b.z - a.z) * i / 40 }; if (!ok(p)) return p; }
    a = b;
  }
  return null;
}

test("a suspension bridge leaves the left front railing and reaches the island top, about 100 m away", () => {
  assert.equal(BRIDGE.a.z, RAIL_Z);
  assert.ok(BRIDGE.a.x < 0 && BRIDGE.a.x > COURTYARD.minX + 2, JSON.stringify(BRIDGE.a));
  const len = dist(BRIDGE.a, BRIDGE.b);
  assert.ok(len > 85 && len < 120, String(len));
  assert.ok(Math.abs(dist(BRIDGE.b, ISLAND) - ISLAND.r) < 0.01, "다리 끝은 섬 터 가장자리");
  assert.ok(ISLAND.x < -80 && ISLAND.z < -100, JSON.stringify(ISLAND));   // 곶의 바다 쪽 끝 (예전 숲자리)
});

test("the deck is level with the yard at both ends and sags in the middle; the island terrace is level with the yard", () => {
  assert.equal(floorY(BRIDGE.a), 0);
  assert.ok(Math.abs(floorY(BRIDGE.b)) < 1e-9);
  const mid = bridgeAt(0.5);
  assert.ok(Math.abs(floorY(mid) + BRIDGE.sag) < 1e-9, String(floorY(mid)));
  assert.equal(floorY(ISLAND), 0);
});

test("tapping the deck walks onto the bridge (it does not lean on the railing); tapping the island walks there", () => {
  const p = bridgeAt(0.3), side = { x: p.x + 0.4, z: p.z };
  const r = resolveTap(side);
  assert.equal(r.kind, "walk");
  assert.ok(onBridge(r.to), JSON.stringify(r.to));
  const r2 = resolveTap({ x: ISLAND.x + 1, z: ISLAND.z });
  assert.equal(r2.kind, "walk");
  assert.deepEqual(r2.to, { x: ISLAND.x + 1, z: ISLAND.z });
  assert.ok(onIsland(clampToWalkable({ x: ISLAND.x + ISLAND.r + 1, z: ISLAND.z })));
});

test("walking from the yard to the island goes through the railing gap and along the bridge", () => {
  const from = { x: 0, z: -10 }, to = { x: ISLAND.x, z: ISLAND.z };
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.ok(path.some((p) => dist(p, BRIDGE.a) < 0.01) && path.some((p) => dist(p, BRIDGE.b) < 0.01), JSON.stringify(path));
  assert.equal(walkableAll(from, path), null, JSON.stringify(path));
});

test("walking back from the island to the hall comes back over the bridge", () => {
  const from = { x: ISLAND.x - 2, z: ISLAND.z + 1 }, to = HALL.door;
  const path = routeAround(from, to);
  assert.deepEqual(path.at(-1), to);
  assert.equal(walkableAll(from, path), null, JSON.stringify(path));
});

test("moving along the bridge, or from the bridge onto the island, stays on it", () => {
  const from = bridgeAt(0.2), to = bridgeAt(0.7);
  assert.deepEqual(routeAround(from, to), [to]);
  const p = routeAround(bridgeAt(0.6), ISLAND);
  assert.equal(walkableAll(bridgeAt(0.6), p), null, JSON.stringify(p));
});

test("leaning on the railing never stands in the bridge gap", () => {
  const s = nearestLeanSpot({ x: BRIDGE.a.x });
  assert.ok(Math.abs(s.x - BRIDGE.a.x) >= BRIDGE.w / 2 + 0.3, JSON.stringify(s));
  assert.equal(s.z, LEAN_Z);
});
