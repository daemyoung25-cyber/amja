/* 마음 전하기: 초·향·소원을 올린 뒤 카톡 등으로 보내는 링크. 받은 분은 그 자리로 바로 들어와 함께 마음을 모은다.
   링크 내용은 누구나 고쳐 만들 수 있으니, 받는 쪽에서 언제나 다시 검사한다 (이름 금지어, 숫자·주소 불가, 아는 장소만). 서버를 쓰지 않는다. */
import { CANDLES, WISH, STATUE, CAVE, HERMITAGE, DOOR_IN, faceCandles, faceWish, faceOffer } from "./layout.js";
import { cleanName, cleanSex, whoTag } from "./name.js";
import { isBadName } from "./badwords.js";

const offerSpot = (k, spot, kind) => ({ kind, spot, yaw: () => faceOffer(spot, k) });
export const SHARE_PLACES = {
  rack: { kind: "candle", spot: CANDLES.spot, yaw: () => faceCandles(CANDLES.spot) },   // 담 공양대
  wish: { kind: "wish", spot: WISH.spot, yaw: () => faceWish(WISH.spot) },              // 소원걸이
  gwan: offerSpot("gwan", { x: STATUE.x, z: STATUE.z - 2.3 }, "candle"),                // 해수관음 앞 (방석과 배례석 사이)
  cave: offerSpot("cave", { x: CAVE.x, z: CAVE.inside.minZ + 1.6 }, "candle"),          // 동굴 법당
  hall: offerSpot("hall", { x: DOOR_IN.x, z: DOOR_IN.z + 0.3 }, "incense"),             // 대웅전 문 안
  herm: offerSpot("herm", { x: HERMITAGE.doorIn.x - 0.3, z: HERMITAGE.doorIn.z }, "incense"),   // 섬 암자 문 안
};
const known = (k) => typeof k === "string" && Object.prototype.hasOwnProperty.call(SHARE_PLACES, k);

const FOR_MAX = 10;
// 누구를 위해: 비었으면 "", 쓸 수 있으면 다듬은 글, 아니면 null
export function cleanFor(raw) {
  const t = typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
  if (!t) return "";
  if (t.length > FOR_MAX || !/^[가-힣 ]+$/.test(t) || isBadName(t.replace(/ /g, ""))) return null;
  return t;
}

const DONE = { candle: "초를 밝혔어요", incense: "향을 피웠어요", wish: "소원을 걸었어요" };
export function shareMessage({ place, n, h, forName }) {
  const who = whoTag(n, h), whom = forName ? ` ${forName}님을 위해` : "";
  return `${who}${whom} ${DONE[SHARE_PLACES[place].kind]}. 함께 마음을 모아 주세요`;
}
export const inviteLine = shareMessage;

export function shareUrl(base, { place, n, h, forName }) {
  const q = new URLSearchParams({ to: place });
  if (n) { q.set("n", n); q.set("h", cleanSex(h)); }
  if (forName) q.set("for", forName);
  return `${base}?${q}`;
}

// 주소의 검색어를 읽는다. 초대가 아니면 null. 이상한 이름·대상은 빼고, 모르는 장소면 통째로 버린다
export function parseShare(search) {
  const q = new URLSearchParams(search), place = q.get("to");
  if (!known(place)) return null;
  return { place, n: cleanName(q.get("n")), h: cleanSex(q.get("h")), forName: cleanFor(q.get("for")) || "" };
}

// 읽은 뒤 주소창에서 초대 부분만 지운다 (새로고침하면 이어 들어가기가 되고, 점검용 ?emu 등은 남긴다)
export function stripShareParams(search) {
  const q = new URLSearchParams(search);
  for (const k of ["to", "n", "h", "for"]) q.delete(k);
  const s = q.toString();
  return s ? `?${s}` : "";
}
