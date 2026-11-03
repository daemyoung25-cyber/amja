import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanNote, canSendNote, NOTE_MAX } from "../src/logic/notes.js";
import { GUESTBOOK, HALL, resolveTap, clampToWalkable, faceNote, nearNote } from "../src/logic/layout.js";

test("a note is trimmed, keeps line breaks, and must be 1..300 characters", () => {
  assert.equal(cleanNote("  밤에   별이 더 많았으면 \n\n\n\n 좋겠어요  "), "밤에 별이 더 많았으면 \n\n 좋겠어요");
  assert.equal(cleanNote("   "), null);
  assert.equal(cleanNote("가".repeat(NOTE_MAX)), "가".repeat(NOTE_MAX));
  assert.equal(cleanNote("가".repeat(NOTE_MAX + 1)), null);
});

test("one note a minute", () => {
  assert.ok(canSendNote(0, 1000));
  assert.ok(!canSendNote(1000, 30000));
  assert.ok(canSendNote(1000, 61000));
});

test("the guestbook stands right of the hall door (seen from the yard) and tapping it walks up to face it", () => {
  assert.ok(GUESTBOOK.x < HALL.door.x - 2 && GUESTBOOK.x > HALL.minX + 2, "문 오른쪽 중간 (마당에서 법당을 볼 때 오른쪽 = -x)");
  assert.ok(GUESTBOOK.z < HALL.minZ);
  const r = resolveTap({ x: GUESTBOOK.x, z: GUESTBOOK.z });
  assert.equal(r.kind, "note");
  assert.deepEqual(r.to, GUESTBOOK.spot);
  assert.ok(Math.abs(Math.cos(r.yaw) + 1) < 1e-9);       // 법당 쪽(+z)을 본다 (yaw ±π)
  assert.ok(Math.abs(Math.cos(faceNote(GUESTBOOK.spot)) + 1) < 1e-9);
  assert.ok(nearNote(GUESTBOOK.spot));
  const p = clampToWalkable({ x: GUESTBOOK.x + 0.1, z: GUESTBOOK.z - 0.1 });
  assert.ok(Math.hypot(p.x - GUESTBOOK.x, p.z - GUESTBOOK.z) >= GUESTBOOK.r);
});
