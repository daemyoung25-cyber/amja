import * as THREE from "three";
import { PLACE_NAME, BOW_RANGE, GREET_RANGE } from "./config.js";
import { STATUE, MONK, ROOM, resolveTap, clampToWalkable, routeAround, floorY, insideHall, seatAt, faceAltar, faceSeat, nearCandles, faceCandles, offerPlace, faceOffer, nearWish, faceWish, nearNote, faceNote, insideCave, faceCaveAltar, CAVE_ROOM, insideHermitage, faceHermAltar, HERM_ROOM, insideTea, teaSeatAt, TEA_ROOM, TEA_SIP_SEC, BONGSONG, faceBongsong, nearBongsong, faceGiwa, nearGiwa, KENNEL, BAEK_KENNEL } from "./logic/layout.js";
import { packBongsong, GIVE_SECONDS } from "./logic/bongsong.js";
import { createBongsongTable, makeBundle, CLOTHS } from "./scene/bongsong.js";
import { createCritters } from "./scene/critters.js";
import { makeTeaCup } from "./scene/teahouse.js";
import { createPets, makeCareItem } from "./scene/pets.js";
import { createNovices } from "./scene/novices.js";
import { createGiwa } from "./scene/giwa.js";
import { liveGiwa, pickGiwaSlot, canPlaceGiwa, GIWA_KEEP_MINE } from "./logic/giwa.js";
import { SHARE_PLACES, parseShare, shareUrl, shareMessage, cleanFor, inviteLine, stripShareParams } from "./logic/share.js";
import { suneungActive, seasonLine, countLine, packSuneung } from "./logic/suneung.js";
import { carePick, careSpot, careYaw, canCare, faceDog, CARE, PET_IDS } from "./logic/pets.js";
import { liveWishes, pickWishSlot, canHang, cleanWish, keepMine, WISH_LIFE_MS, publicProblem, readableWishes, nextReadable } from "./logic/wishes.js";
import { liveCandles, pickSlot, burnLeft, canLight } from "./logic/candles.js";
import { OFFER_PLACES, liveOffers, offerLeft, pickOfferSlot, canOffer } from "./logic/offers.js";
import { startMove, positionAt, carriedWalk } from "./logic/walk.js";
import { createWorld } from "./scene/world.js";
import { createAvatar, AVATAR_COLORS, POSE_SECONDS } from "./scene/avatar.js";
import { strikeLift } from "./logic/moktak.js";
import { CHANTS, chantById } from "./logic/chants.js";
import { cleanNote, canSendNote } from "./logic/notes.js";
import { BOWS, bowsDone } from "./logic/bows.js";
import { createCameraRig } from "./scene/camera.js";
import { createUI } from "./ui.js";
import { createAudio } from "./audio.js";
import { CREDITS } from "./credits.js";
import { createPresence } from "./net/presence.js";
import { peersFromSnapshot, nearestPeerWithin } from "./logic/peers.js";
import { visibleTraces, shouldWriteTrace, recentVisitorCount } from "./logic/traces.js";
import { nameTag, whoTag, greeting, cleanName, cleanSex } from "./logic/name.js";
import { SESSION_KEY, packSession, readSession } from "./logic/session.js";
import { QUICK, TALK_SEC, TALK_CLEAR, talkProblem, shouldShowTalk, cleanTalk, addHidden, removeHidden } from "./logic/talk.js";
import { FIREBASE } from "../firebase-config.js";

const ui = createUI({ placeName: PLACE_NAME });

const canvas = document.getElementById("view");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
// 사진 같은 색: 밝은 곳이 하얗게 날아가지 않고 부드럽게 눌린다
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;
// 그림자: 해는 천천히 움직이니 1초에 한 번만 다시 그린다 (폰 부담을 줄이려고)
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
setInterval(() => { renderer.shadowMap.needsUpdate = true; }, 1000);
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.2, 3000);   // near를 너무 작게 두면 폰에서 깊이 정밀도가 모자라 면이 깜빡인다

const world = createWorld(THREE, scene);
// 금빛 불상이 비춰 볼 주변: 방 안 조명을 흉내 낸 환경맵 (금속 재질에만 쓰인다)
import("three/addons/environments/RoomEnvironment.js").then(({ RoomEnvironment }) => {
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
}).catch(() => {});

// ?time=19:30 처럼 주면 그 한국 시각의 하늘을 미리 본다
const timeParam = new URLSearchParams(location.search).get("time");
const timeOffset = (() => {
  const m = /^(\d{1,2}):(\d{2})$/.exec(timeParam || "");
  if (!m) return 0;
  const now = new Date();
  const kstNow = (now.getTime() + 9 * 3600000) % 86400000;
  return (+m[1] * 3600000 + +m[2] * 60000) - kstNow;
})();
const clockNow = () => Date.now() + timeOffset;

ui.setSeason(seasonLine(Date.now()));   // 수능 기간에만 입장 화면 한 줄
// 마음 전하기 링크로 왔으면: 입장 화면에 사연을 띄우고 그 자리에서 시작한다. 주소창의 초대 부분은 지운다
const invite = parseShare(location.search);
if (invite) { ui.setInvite(inviteLine(invite)); try { history.replaceState(null, "", location.pathname + stripShareParams(location.search)); } catch {} }
// 잠깐 나갔다 와서 페이지가 다시 열렸으면 이어 간다 (이 탭에 둔 마지막 상태)
const resumed = invite ? null : (() => { try { return readSession(sessionStorage.getItem(SESSION_KEY), Date.now(), { cleanName, cleanSex }); } catch { return null; } })();
const colorIndex = resumed ? resumed.color : Math.floor(Math.random() * AVATAR_COLORS.length);
const me = createAvatar(THREE, { color: AVATAR_COLORS[colorIndex] });
scene.add(me.root);
// 대웅전 스님: 늘 맨 앞줄 가운데 자리에 앉아 염불 녹음 속 목탁 박자에 맞춰 목탁을 친다
const monk = createAvatar(THREE, { color: 0x9a968d, monk: true });
monk.root.position.set(MONK.x, floorY(MONK), MONK.z);
monk.root.rotation.y = faceAltar(MONK);
monk.setSeated(true); monk.setPose("moktak");
scene.add(monk.root);
// 봉송 나눔: 마당 가운데 공양주 보살님이 상 앞에 서서 법당 쪽을 본다. 한 번 들를 때 꾸러미 하나를 싸 주신다
const bongTable = createBongsongTable(THREE, BONGSONG);
scene.add(bongTable.group);
world.groundMeshes.push(bongTable.hit);
const bosal = createAvatar(THREE, { color: 0xa8a69e, bun: true });
bosal.root.position.set(BONGSONG.bosal.x, 0, BONGSONG.bosal.z);
bosal.root.rotation.y = Math.PI;
bosal.setName("공양주 보살님");
scene.add(bosal.root);
// 마당의 작은 새, 화분 곁 나비, 바다 위 갈매기, 바둑이, 설탕이(백구), 황구, 고양이 나비: 서버 시계로 자리가 정해져 모두의 화면에서 같다
const critters = createCritters(THREE);
scene.add(critters.group);
const pets = createPets(THREE, KENNEL, BAEK_KENNEL);
scene.add(pets.group, pets.house);
const novices = createNovices(THREE, pets);
scene.add(novices.group);
const giwa = createGiwa(THREE);
scene.add(giwa.group);
world.groundMeshes.push(giwa.hit);
let petsNow = [KENNEL.dog, BAEK_KENNEL.dog, KENNEL.cat, BONGSONG.dog].map(({ x, z }) => ({ state: "walk", left: 0, x, z }));   // [바둑이, 설탕이, 나비, 황구]
const petActs = {}, petSeen = {};   // 돌보는 중인 것 { a, until, sec, yaw }, 이미 받은 신호 시각
let careHeldUntil = 0;
let bosalUntil = 0, gotBongsong = false, myBundle = null;
const bosalDo = (pose, sec) => { bosal.setPose(pose); bosalUntil = performance.now() + sec * 1000; };
// 다른 분이 봉송을 받을 때: 내 화면의 보살님도 꾸러미를 두 손으로 내밀어 건네시고, 건너가는 순간 손에서 사라진다
function bosalGive(cloth) {
  const bundle = makeBundle(THREE, CLOTHS[cloth]);
  bosal.hold(bundle, "both");
  bosalDo("give", 2.4);
  setTimeout(() => { if (bosal.held === bundle) bosal.hold(null); }, GIVE_SECONDS * 1000);
}

// 접속 전엔 혼자 모드처럼 동작한다. 시각은 서버 시계에 맞춘 net.now()를 쓴다.
let net = { mode: "solo", now: () => Date.now(), sendMove() {}, sendPose() {}, sendCarry() {}, greet() {}, talk: async () => false, offer() {}, lightCandle() {}, petAct() {}, hangWish: () => null, placeGiwa: async () => null, litForSuneung: async () => false };
let snapshot = null, peers = [];
const sharedNow = () => net.now() + timeOffset;   // 모두 같은 시계 (?time=은 점검용)
let traceRecords = [], visits = {}, lastTraceAt = null;
let candleRecords = [], lastCandleAt = null;
let offerRecords = [];                  // 향·초 공양 (대웅전·섬 암자 향, 동굴·해수관음 초)
const lastOfferAt = {};
let wishRecords = [], lastWishAt = null;
let giwaRecords = [], lastGiwaAt = null;
const MY_GIWA_KEY = "amja-giwa";
let myGiwa = [];
try { const g = JSON.parse(localStorage.getItem(MY_GIWA_KEY) || "[]"); if (Array.isArray(g)) myGiwa = g.filter((m) => m && typeof m.text === "string" && typeof m.at === "number"); } catch {}
// 내 소원 글은 이 폰에만: [{ slot, at, text }]
const MY_WISHES_KEY = "amja-wishes";
let myWishes = [];
try { myWishes = JSON.parse(localStorage.getItem(MY_WISHES_KEY) || "[]"); } catch {}
const saveMyWishes = () => { try { localStorage.setItem(MY_WISHES_KEY, JSON.stringify(myWishes)); } catch {} };
// 내가 가린 소원, 함께 빈 소원 (id 목록, 이 폰에만)
const loadIds = (k) => { try { const v = JSON.parse(localStorage.getItem(k) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; } };
const saveIds = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v.slice(-200))); } catch {} };
let hiddenWishes = loadIds("amja-wish-hidden"), joinedWishes = loadIds("amja-wish-joined"), readingId = null;
const others = new Map();     // uid -> { avatar, gone: 0 }

const state = {
  move: (() => {        // 들어오는 자리를 마당 앞쪽에 흩어 둔다 (여럿이 겹치지 않게)
    const spawn = invite ? { ...SHARE_PLACES[invite.place].spot } : resumed ? { x: resumed.x, z: resumed.z } : { x: (Math.random() - 0.5) * 8, z: -13 + Math.random() * 2 };
    return startMove(spawn, spawn, Date.now());
  })(),
  leanOnArrive: false,
  sitOnArrive: false,
  candleOnArrive: false,
  wishOnArrive: false,
  giwaOnArrive: false,
  noteOnArrive: false,
  bongsongOnArrive: false,
  careOnArrive: null,
  route: [],                // 불상·법당을 돌아가는 남은 경유지
  base: "stand",            // 합장/절이 끝나면 돌아갈 자세
  gestureUntil: 0,
  yaw: 0,
};

const rig = createCameraRig(THREE, camera, canvas, { onTap, obstacles: world.obstacles });
if (invite) { state.yaw = SHARE_PLACES[invite.place].yaw(); rig.turnTo(state.yaw); }
const ray = new THREE.Raycaster();
const headAt = new THREE.Vector3();
const ndc = new THREE.Vector2();

function onTap(cx, cy) {
  ui.pokeHud();
  if (state.bow108) return;            // 108배 중에는 눌러도 걷지 않는다 (버튼만 돌아온다, 멈추려면 '그만')
  ndc.set((cx / window.innerWidth) * 2 - 1, -(cy / window.innerHeight) * 2 + 1);
  ray.setFromCamera(ndc, camera);
  const hit = ray.intersectObjects(world.groundMeshes, false)[0];
  const who = whoAt(hit ? hit.distance : Infinity);
  if (who) { openWho(who); return; }
  if (hit) goTo({ x: hit.point.x, z: hit.point.z });
}

// 한마디: 내 머리 위에 띄우고, 가까이 계신 분 화면에도 잠깐 뜬다
const TALK_HIDE_KEY = "amja-talk-hide";
let lastTalkAt = 0, talkHidden = [];
try { talkHidden = JSON.parse(localStorage.getItem(TALK_HIDE_KEY) || "[]").filter((u) => typeof u === "string"); } catch {}
ui.setQuickTalk(QUICK);
ui.onTalk((text) => {
  const at = net.now(), err = talkProblem(text, lastTalkAt, at);
  if (err) return err;
  lastTalkAt = at;
  const x = cleanTalk(text);
  me.say(x, TALK_SEC);
  net.talk(x, TALK_CLEAR);
  return null;
});
// 누른 곳보다 앞에 서 계신 분 (땅보다 가까울 때만)
function whoAt(groundDist) {
  let best = null, bestD = groundDist;
  for (const [uid, o] of others) {
    if (o.gone) continue;
    const h = ray.intersectObject(o.avatar.root, true)[0];
    if (h && h.distance < bestD) { best = uid; bestD = h.distance; }
  }
  return best;
}
function openWho(uid) {
  const peer = peers.find((p) => p.uid === uid);
  if (!peer) return;
  const hidden = talkHidden.includes(uid);
  ui.openWho(nameTag(peer.n, peer.h) ? `${nameTag(peer.n, peer.h)}님` : "함께 계신 분", hidden, () => {
    talkHidden = hidden ? removeHidden(talkHidden, uid) : addHidden(talkHidden, uid);
    try { localStorage.setItem(TALK_HIDE_KEY, JSON.stringify(talkHidden)); } catch {}
    if (!hidden) others.get(uid)?.avatar.say("", 0);
    ui.showWhisper(hidden ? "이제 그분 말이 다시 보여요" : "이 폰에서 그분 말을 가렸어요");
  });
}

function goTo(point, plain = false) {             // plain: 자리에 앉거나 기대지 않고 그 지점까지만 걷는다
  const r = plain ? { kind: "walk", to: clampToWalkable(point) } : resolveTap(point);
  const now = net.now();
  const here = positionAt(state.move, now);
  // 이미 기대 있는 자리 근처의 바다를 눌렀으면 그대로 있는다 (버튼만 돌아온다)
  if (state.base === "lean" && r.kind === "lean" && Math.abs(r.to.x - here.x) < 0.6) return;
  if (state.base === "sit" && r.kind === "sit" && seatAt(here) === seatAt(r.to)) return;
  const [first, ...rest] = routeAround(here, r.to);
  const walked = carriedWalk(here, state.route.length);   // 경로를 바꾸기 전의 남은 길로 본다
  state.route = rest;
  state.move = startMove(here, first, now, walked);
  state.leanOnArrive = r.kind === "lean";
  state.sitOnArrive = r.kind === "sit";
  state.candleOnArrive = r.kind === "candle";
  state.wishOnArrive = r.kind === "wish";
  state.giwaOnArrive = r.kind === "giwa";
  state.noteOnArrive = r.kind === "note";
  state.bongsongOnArrive = r.kind === "bongsong";
  state.careOnArrive = null;
  net.sendMove(state.move);
  setBase("walk");
}

function setBase(p) {
  if (p === "walk") {                  // 걸어가면 하던 절·합장은 그친다
    if (state.bow108) stopBow108();
    state.gestureUntil = 0;
  }
  if (state.base === "lean" && p !== "lean") { ui.setLeaning(false); rig.setLeaning(false); }
  if (state.base === "sit" && p !== "sit") ui.setLeaning(false);
  state.base = p;
  if (performance.now() >= state.gestureUntil) { me.setPose(p); net.sendPose(p); }
}

function gesture(kind) {
  if (state.base === "walk") return;
  me.setPose(kind);
  net.sendPose(kind);
  state.gestureUntil = performance.now() + POSE_SECONDS[kind] * 1000;
}

ui.onHapjang(() => {
  if (state.base === "walk") return;
  gesture("hapjang");
  const now = net.now();
  const to = nearestPeerWithin(peers, positionAt(state.move, now), now, GREET_RANGE);
  if (to) net.greet(to);
});
// 초 켜기: 공양대를 보고 두 손으로 초를 올린 뒤 합장. 초는 모두에게 보이고 하루 동안 탄다.
// 향 피우기·초 켜기 (네 곳): 그 자리에서 부처님·관음상을 보고 올린다. 향은 한 시간, 초는 하루 탄다.
function makeOffer(k, su = null) {
  if (state.base === "walk" || state.bow108) return;
  const now = net.now(), incense = OFFER_PLACES[k].kind === "incense";
  if (!canOffer(lastOfferAt[k], now)) { ui.showWhisper(incense ? "향이 아직 타고 있어요. 조금 뒤에 또 피워요" : "초가 아직 타고 있어요. 조금 뒤에 또 켜요"); return; }
  lastOfferAt[k] = now;
  state.yaw = faceOffer(positionAt(state.move, now), k);
  rig.turnTo(state.yaw);
  gesture("light");
  setTimeout(() => {
    const at = net.now(), slot = pickOfferSlot(liveOffers(offerRecords, k, at), k);
    offerRecords = [...offerRecords, { k, slot, n: myName, h: mySex, at, mine: true }];   // 연결이 없어도 내 화면엔 바로
    net.offer({ k, slot, n: myName, h: mySex });
    redrawOffers();
    if (su) { suneungLit(su); return; }
    ui.showWhisper(incense ? "향을 피웠어요" : "초를 밝혔어요");
    ui.offerShare(k);
  }, 1600);
}
// 수험생 기도: 해수관음 앞 초 켜기에 이름을 적을 수 있고(저장 안 함), 기기마다 한 번 누적 수에 더한다
const SU_LIT_KEY = "amja-su-lit";
let suneungCount = 0, suLitHere = false;
try { suLitHere = localStorage.getItem(SU_LIT_KEY) === "1"; } catch {}
function suneungLit({ forName }) {
  ui.showWhisper(`${forName ? `${forName}님을 위해` : "수험생을 위해"} 초를 밝혔어요`, 3500);
  ui.offerShare("gwan", forName);
  const first = !suLitHere;
  suLitHere = true;
  if (first) net.litForSuneung().then((ok) => { if (ok) { try { localStorage.setItem(SU_LIT_KEY, "1"); } catch {} } });
  setTimeout(() => { const t = countLine(suneungCount); if (t) ui.showWhisper(t, 5000); }, 3700);
}
ui.onSuSend((raw) => {
  const forName = cleanFor(raw);
  if (forName === null) return "한글로 10자까지, 이름만 적어 주세요";
  makeOffer("gwan", { forName });
  return null;
});
ui.onSuPlain(() => makeOffer("gwan"));
ui.onSuneungButton(() => goTo(SHARE_PLACES.gwan.spot));
// 봉송 받기: 보살님이 꾸러미를 두 손으로 내미시고, 내 손에 건너오면 오른손에 들고 다닌다.
// 다른 분 화면에도: 내 몸짓(give)을 보고 그 화면의 보살님도 건네시고, 건너온 뒤엔 든 꾸러미 색(b)이 간다
ui.onBongsong(() => {
  if (state.base === "walk" || gotBongsong) return;
  gotBongsong = true;
  const p = positionAt(state.move, net.now());
  state.yaw = faceBongsong(p); rig.turnTo(state.yaw);
  const cloth = bongTable.randomCloth();
  const bundle = makeBundle(THREE, CLOTHS[cloth]);
  bosal.hold(bundle, "both");
  bosalDo("give", 2.4);
  gesture("give");
  const pack = suneungActive(net.now()) ? packSuneung() : packBongsong();
  setTimeout(() => {
    bosal.hold(null);
    me.hold(bundle, "both");
    myBundle = cloth;
    net.sendCarry(cloth);
    setTimeout(() => me.hold(bundle, "hang"), 900);
    ui.showWhisper(`봉송을 받았어요 · ${pack.text}`);
  }, GIVE_SECONDS * 1000);
});
// 돌보기: 쓰다듬기·간식(바둑이·설탕이·황구), 츄르·궁디팡팡(나비). 곁에 있는 동물이 반응하고 다른 분 화면에도 신호가 간다 (몸짓은 자리처럼 각자 화면에서 그린다)
let myCare = null; const myCareAt = new THREE.Vector3();   // 돌보는 동물과 손이 닿을 자리
const startPetAct = (w, a, ms, yaw) => { petActs[w] = { a, sec: CARE[a].sec, until: performance.now() + ms, yaw }; };
ui.onCare((a) => {
  if (state.base === "walk" || state.bow108) return;
  const p = positionAt(state.move, net.now()), i = carePick(petsNow, p, a);
  if (i < 0) return;
  const spot = careSpot(petsNow[i], p, PET_IDS[i]);
  if (spot) { goTo(spot, true); state.careOnArrive = a; return; }   // 손이 안 닿으면 곁까지 걸어가서 준다
  doCare(a);
});
function doCare(a) {
  const p = positionAt(state.move, net.now()), i = carePick(petsNow, p, a);
  if (i < 0) return;                                  // 걸어가는 사이 동물이 떠났으면 조용히 그친다
  const c = CARE[a], animal = petsNow[i];
  state.yaw = faceDog(p, animal); rig.turnTo(state.yaw + 1.05);   // 등 뒤에서 보면 내 몸이 동물을 가려서 비스듬히 옆에서 본다
  myCare = { w: PET_IDS[i], a };
  me.setPose(c.pose);
  state.gestureUntil = performance.now() + c.sec * 1000;
  startPetAct(PET_IDS[i], a, c.sec * 1000, careYaw(animal, p, a));
  if (c.item) { me.hold(makeCareItem(THREE, a), "hand"); careHeldUntil = performance.now() + c.item * 1000; }
  net.petAct(PET_IDS[i], a);
}
// 차 마시기: 다실 방석에 앉아 찻잔을 든다. 몸짓이 서버로 가서 다른 분 화면에서도 같은 때에 찻잔을 든다
const myCup = makeTeaCup(THREE);
ui.onTea(() => {
  if (state.base !== "sit" || state.bow108 || state.gestureUntil) return;
  if (!teaSeatAt(positionAt(state.move, net.now()))) return;
  me.setPose("tea");
  net.sendPose("tea");
  state.gestureUntil = performance.now() + TEA_SIP_SEC * 1000;
  me.hold(myCup, "hand"); careHeldUntil = performance.now() + TEA_SIP_SEC * 1000;
});
ui.onIncense(() => { const k = offerPlace(positionAt(state.move, net.now())); if (k && OFFER_PLACES[k].kind === "incense") makeOffer(k); });
ui.onCandle(() => {
  if (state.base === "walk") return;
  const now = net.now();
  const here = offerPlace(positionAt(state.move, now));
  if (here === "gwan" && suneungActive(now) && canOffer(lastOfferAt.gwan, now)) { ui.openSuSheet(); return; }
  if (here && OFFER_PLACES[here].kind === "candle") { makeOffer(here); return; }   // 동굴 법당·해수관음 앞
  if (!canLight(lastCandleAt, now)) { ui.showWhisper("초가 아직 타고 있어요. 조금 뒤에 또 켜요"); return; }
  lastCandleAt = now;
  const p = positionAt(state.move, now);
  state.yaw = faceCandles(p);
  rig.turnTo(state.yaw);
  gesture("light");
  setTimeout(() => {
    const at = net.now(), slot = pickSlot(liveCandles(candleRecords, at), at);
    candleRecords = [...candleRecords, { slot, n: myName, h: mySex, at, mine: true }];   // 연결이 없어도 내 화면엔 바로
    net.lightCandle({ slot, n: myName, h: mySex });
    redrawCandles();
    ui.showWhisper("초를 밝혔어요");
    ui.offerShare("rack");
  }, 1600);
});
// 소원 걸기: 한 줄 적어 소원패를 건다. 패는 모두에게 보이고 이레 동안 걸려 있다. 글은 이 폰에만 남는다.
const myLiveWishes = () => (myWishes = keepMine(myWishes, liveWishes(wishRecords, net.now()), net.now()));
ui.onWishButton(() => {
  const now = net.now();
  ui.openWishSheet(myLiveWishes().map((m) => ({ text: m.text, pub: !!m.pub, joins: m.joins || 0, daysLeft: Math.max(1, Math.ceil((m.at + WISH_LIFE_MS - now) / 86400000)) })));
});
ui.onWishSubmit((raw, pub) => {
  const text = cleanWish(raw);
  if (!text) return "한 줄로 30자까지 적어 주세요";
  if (pub) { const why = publicProblem(text); if (why) return why; }
  const now = net.now();
  if (!canHang(lastWishAt, now)) return "조금 뒤에 또 걸 수 있어요";
  if (state.base === "walk") return "소원걸이 앞에 서서 걸어요";
  lastWishAt = now;
  const p = positionAt(state.move, now);
  state.yaw = faceWish(p);
  rig.turnTo(state.yaw);
  gesture("light");
  setTimeout(() => {
    const at = net.now(), slot = pickWishSlot(liveWishes(wishRecords, at), at);
    const id = net.hangWish({ slot, n: myName, h: mySex, text, pub });
    wishRecords = [...wishRecords, pub ? { id, slot, t: text, at } : { id, slot, n: myName, h: mySex, at }];   // 연결이 없어도 내 화면엔 바로
    myWishes = [...myLiveWishes(), { slot, at, text, ...(pub ? { pub: true } : {}), ...(id ? { id } : {}) }];
    saveMyWishes();
    listenJoins();
    redrawWishes();
    ui.showWhisper("소원을 걸었어요");
    ui.offerShare("wish");
  }, 1600);
  return null;
});
// 기와불사: 테이블 앞에서 소원을 적으면 기와가 담장 아래로 날아가 한 장씩 쌓인다. 글은 이 폰에만
ui.onGiwaButton(() => ui.openGiwaSheet(myGiwa));
ui.onGiwaSubmit((raw) => {
  const text = cleanWish(raw);
  if (!text) return "한 줄로 30자까지 적어 주세요";
  const now = net.now();
  if (!canPlaceGiwa(lastGiwaAt, now)) return "조금 뒤에 또 올릴 수 있어요";
  if (state.base === "walk") return "테이블 앞에 서서 올려요";
  lastGiwaAt = now;
  const p = positionAt(state.move, now);
  state.yaw = faceGiwa(p);
  rig.turnTo(state.yaw);
  gesture("light");
  setTimeout(() => {
    const at = net.now(), slot = pickGiwaSlot(liveGiwa(giwaRecords));
    giwa.fly(slot);
    giwaRecords = [...giwaRecords, { slot, n: myName, h: mySex, at, mine: true }];   // 연결이 없어도 내 화면엔 바로
    giwa.setTiles(liveGiwa(giwaRecords));
    net.placeGiwa({ slot, n: myName, h: mySex });
    myGiwa = [{ text, at }, ...myGiwa].slice(0, GIWA_KEEP_MINE);
    try { localStorage.setItem(MY_GIWA_KEY, JSON.stringify(myGiwa)); } catch {}
    ui.showWhisper("기와를 올렸어요");
  }, 1600);
  return null;
});
// 마음 전하기: 폰의 공유 창(카톡 포함)으로 보내고, 안 되면 링크를 복사한다. 복사도 안 되면 링크를 보여 준다
ui.onShareSend(async (raw, place) => {
  const forName = cleanFor(raw);
  if (forName === null) return { error: "한글로 10자까지, 이름만 적어 주세요" };
  const info = { place, n: myName, h: mySex, forName };
  const home = location.origin + location.pathname.replace(/index\.html$/, "");
  const url = shareUrl(place === "gwan" && suneungActive(net.now()) ? `${home}suneung/` : home, info), text = shareMessage(info);
  if (navigator.share) {
    try { await navigator.share({ text, url }); return { done: true }; }
    catch (e) { if (e && e.name === "AbortError") return { stay: true }; }          // 공유 창을 그냥 닫은 것
  }
  try { await navigator.clipboard.writeText(`${text}\n${url}`); ui.showWhisper("복사했어요. 카톡에 붙여 넣어 보내 주세요", 5000); return { done: true }; }
  catch { return { link: url }; }
});
// 바라는 점: 방명록에 적으면 notes/에 남고(만든 사람만 읽음), 내 폰엔 내가 남긴 글 (최근 20개)
const NOTES_KEY = "amja-notes";
let myNotes = [];
try { myNotes = JSON.parse(localStorage.getItem(NOTES_KEY) || "[]").filter((m) => m && typeof m.text === "string" && m.at > 0).slice(-20); } catch {}
let lastNoteAt = myNotes.length ? myNotes[myNotes.length - 1].at : 0;
ui.onNoteSubmit(async (raw) => {
  const text = cleanNote(raw);
  if (!text) return "한 글자부터 300자까지 적어 주세요";
  if (!canSendNote(lastNoteAt, Date.now())) return "조금 뒤에 또 남길 수 있어요";
  if (net.mode !== "shared") return "지금은 연결이 안 돼 보낼 수 없어요. 조금 뒤에 다시 해 주세요";
  const ok = await net.writeNote(text);
  if (!ok) return "보내지 못했어요. 조금 뒤에 다시 해 주세요";
  lastNoteAt = Date.now();
  myNotes = [...myNotes, { text, at: lastNoteAt }].slice(-20);
  try { localStorage.setItem(NOTES_KEY, JSON.stringify(myNotes)); } catch {}
  ui.showWhisper("고맙습니다. 잘 읽어 볼게요");
  return null;
});
// 소원 읽기: 남이 함께 읽게 건 소원을 하나씩 (새것부터). 함께 빌면 적은 분께 알림이 간다
const readable = () => readableWishes(liveWishes(wishRecords, net.now()), { mine: myWishes.map((m) => m.id).filter(Boolean), hidden: hiddenWishes });
function showReading(w) {
  readingId = w ? w.id : null;
  ui.showWishRead(w ? { text: w.t, joined: joinedWishes.includes(w.id) } : null);
}
ui.onWishRead(() => showReading(nextReadable(readable(), null)));
ui.onReadNext(() => showReading(nextReadable(readable(), readingId)));
ui.onReadHide(() => {
  if (!readingId) return;
  hiddenWishes = [...hiddenWishes, readingId];
  saveIds("amja-wish-hidden", hiddenWishes);
  showReading(nextReadable(readable(), null));
  ui.showWhisper("내 화면에서 가렸어요");
});
ui.onReadJoin(() => {
  if (!readingId || joinedWishes.includes(readingId)) return;
  net.joinWish(readingId);
  joinedWishes = [...joinedWishes, readingId];
  saveIds("amja-wish-joined", joinedWishes);
  gesture("hapjang");
  showReading(readable().find((w) => w.id === readingId) || null);
});
// 내 함께 읽는 소원에 누가 함께 빌면: 들어와 있을 땐 바로, 나가 있던 동안의 것은 들어올 때 한 번에
const joinWatch = new Set();
function listenJoins() {
  if (net.mode !== "shared") return;
  for (const m of myWishes) {
    if (!m.pub || !m.id || joinWatch.has(m.id)) continue;
    joinWatch.add(m.id);
    net.onWishJoins(m.id, (n) => {
      const mine = myWishes.find((x) => x.id === m.id);
      if (!mine) return;
      const before = mine.joins || 0;
      if (n > before) ui.notify(n - before === 1 ? "누군가 당신의 소원에 함께 빌었어요 🙏" : `${n - before}분이 당신의 소원에 함께 빌었어요 🙏`);
      mine.joins = n;
      saveMyWishes();
    });
  }
}
function faceBuddha() {
  const p = positionAt(state.move, net.now());
  state.yaw = insideHall(p) ? faceAltar(p) : insideCave(p) ? faceCaveAltar(p) : insideHermitage(p) ? faceHermAltar(p) : Math.atan2(-(STATUE.x - p.x), -(STATUE.z - p.z));   // 부처님을 향해 선다
}
ui.onBow(() => {
  if (state.bow108) return;
  faceBuddha();
  gesture("bow");
});
// 108배: 큰절을 108번 이어 하고, 마치면 그 자리에 조용히 앉는다. '그만'을 누르면 멈춘다
ui.onBow108(() => {
  if (state.bow108) { stopBow108(); return; }
  if (state.base === "walk") return;
  faceBuddha();
  gesture("bow108");
  state.bow108 = { start: performance.now() };
  ui.setBowing(true);
  ui.setBowCount(0, BOWS);
  ui.setLeaning(true);                 // 버튼은 물러나고, 화면을 누르면 잠깐 돌아온다
});
function stopBow108() {
  state.bow108 = null;
  ui.setBowing(false);
  ui.setLeaning(false);
  if (state.gestureUntil) { state.gestureUntil = 0; me.setPose(state.base); net.sendPose(state.base); }
}
const SOUND_KEY = "amja-sound";
// 층마다 크기 0..1. 예전에 켜고 끄기(true/false)로 저장한 값도 그대로 읽는다.
const volumes = (() => {
  const v = { waves: 1, chime: 1, chant: 1, evening: 1 };
  try {
    for (const [k, x] of Object.entries(JSON.parse(localStorage.getItem(SOUND_KEY) || "{}"))) {
      if (k in v) v[k] = typeof x === "boolean" ? (x ? 1 : 0) : Math.min(1, Math.max(0, Number(x) || 0));
    }
  } catch {}
  return v;
})();
const audio = createAudio({ urls: { waves: "sounds/waves.mp3", chant: "sounds/chant.mp3", evening: "sounds/evening.mp3" } });
// 층마다 켜기·끄기 (이름 오른쪽 스위치). 끄면 크기는 그대로 두고 그 층만 조용히. 이 폰에 기억
const OFF_KEY = "amja-sound-off";
const offs = { waves: false, chime: false, chant: false, evening: false };
try { for (const [k, x] of Object.entries(JSON.parse(localStorage.getItem(OFF_KEY) || "{}"))) if (k in offs) offs[k] = x === true; } catch {}
const applyLayer = (k) => audio.setVolume(k, offs[k] ? 0 : volumes[k]);
for (const k of Object.keys(volumes)) applyLayer(k);
ui.onLayerToggle((layer, on) => {
  offs[layer] = !on;
  applyLayer(layer);
  if (on) audio.resumeIfNeeded();
  try { localStorage.setItem(OFF_KEY, JSON.stringify(offs)); } catch {}
});
// 들을 염불 고르기 (이 폰에 기억)
const CHANT_KEY = "amja-chant";
let chantId = "yeombul";
try { chantId = chantById(localStorage.getItem(CHANT_KEY) || "").id; } catch {}
audio.setChant(chantById(chantId));
ui.setChantOptions(CHANTS, chantId);
ui.onChant((id) => {
  chantId = chantById(id).id;
  audio.setChant(chantById(chantId));
  audio.resumeIfNeeded();
  try { localStorage.setItem(CHANT_KEY, chantId); } catch {}
});
ui.onOpenSettings(() => ui.openSettings({ volumes, offs }));
ui.onOpenCredits(() => ui.openCredits(CREDITS));
ui.onVolume((layer, v) => {
  volumes[layer] = v;
  applyLayer(layer);
  try { localStorage.setItem(SOUND_KEY, JSON.stringify(volumes)); } catch {}
});
// 다른 화면으로 갈 때 지금 자리·자세·이름을 이 탭에 적어 둔다 (폰이 페이지를 버렸다 다시 열어도 이어지게)
function saveSession() {
  if (!myName) return;
  const p = positionAt(state.move, net.now());
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(packSession({ name: myName, sex: mySex, color: colorIndex, x: p.x, z: p.z, yaw: state.yaw, base: state.base, bundle: myBundle }, Date.now()))); } catch {}
}
window.addEventListener("pagehide", saveSession);
setInterval(saveSession, 15000);
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) { saveSession(); audio.suspend(); return; }
  if (!(await audio.resumeIfNeeded())) ui.showSoundResume(() => audio.resumeIfNeeded());
});

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener("resize", resize);
resize();

let last = performance.now();
function frame(t) {
  const dt = Math.min(0.1, (t - last) / 1000);
  last = t;
  const now = net.now();
  const p = positionAt(state.move, now);
  if (!p.arrived) state.yaw = p.yaw;
  if (p.arrived && state.base === "walk" && state.route.length) {      // 다음 경유지로
    state.move = startMove(p, state.route.shift(), now, p.walked);
    net.sendMove(state.move);
  } else if (p.arrived && state.base === "walk") {
    if (net.mode === "shared" && shouldWriteTrace(lastTraceAt, now)) {
      lastTraceAt = now;
      net.writeTrace({ x: p.x, z: p.z, k: state.leanOnArrive ? "lean" : "step" });
    }
    if (state.sitOnArrive) {
      state.yaw = faceSeat(p);   // 법당에선 부처님, 기도 터에선 해수관음 쪽
      setBase("sit");
      rig.turnTo(state.yaw);
      ui.setLeaning(false);             // 앉아 있어도 버튼은 그대로
    } else if (state.leanOnArrive) {
      state.yaw = 0;
      setBase("lean");
      ui.setLeaning(false);             // 기대 있어도 버튼은 그대로 (108배 할 때만 물러난다)
      rig.setLeaning(true);
    } else {
      if (state.candleOnArrive) { state.yaw = faceCandles(p); rig.turnTo(state.yaw); }   // 공양대를 마주 선다
      if (state.giwaOnArrive) { state.giwaOnArrive = false; state.yaw = faceGiwa(p); rig.turnTo(state.yaw); }   // 기와불사 테이블을 마주 선다
      if (state.wishOnArrive) { state.yaw = faceWish(p); rig.turnTo(state.yaw); }        // 소원걸이를 마주 선다
      if (state.bongsongOnArrive) {   // 상 앞에 서면 보살님을 마주 보고, 보살님이 합장으로 맞아 주신다
        state.bongsongOnArrive = false; state.yaw = faceBongsong(p); rig.turnTo(state.yaw);
        if (!gotBongsong) bosalDo("hapjang", 2.5);
      }
      if (state.noteOnArrive) { state.noteOnArrive = false; state.yaw = faceNote(p); rig.turnTo(state.yaw); ui.openNoteSheet(myNotes); }   // 방명록 앞에 서면 적는 칸이 열린다
      setBase("stand");
      if (state.careOnArrive) { const a = state.careOnArrive; state.careOnArrive = null; doCare(a); }
    }
  }
  if (state.bow108) ui.setBowCount(bowsDone((t - state.bow108.start) / 1000), BOWS);
  if (state.gestureUntil && t >= state.gestureUntil) {
    state.gestureUntil = 0;
    if (state.bow108) {                   // 108배를 마치면 그 자리에 앉는다
      state.bow108 = null;
      ui.setBowing(false);
      ui.showWhisper("108배를 마쳤어요");
      setBase("sit");
      ui.setLeaning(false);             // 마치고 앉으면 버튼이 돌아온다
    } else { me.setPose(state.base); net.sendPose(state.base); }
  }

  const seated = state.base === "sit";
  const fy = floorY(p);
  me.root.position.set(p.x, fy, p.z);
  me.root.rotation.y = state.yaw;
  me.setSeated(seated);
  me.setReach(myCare && state.gestureUntil ? pets[myCare.w].touch(myCare.a, myCareAt) : null);
  me.update(dt);
  const chantNow = audio.chantNow();
  monk.setStrike(chantNow && chantNow.track ? strikeLift(chantNow.t, chantNow.track.hits, chantNow.track.len) : 0);
  monk.update(dt);
  if (bosalUntil && performance.now() >= bosalUntil) { bosalUntil = 0; bosal.setPose("stand"); }
  bosal.update(dt);
  critters.update(dt, sharedNow());
  petsNow = pets.update(dt, sharedNow(), { ...novices.acts, ...petActs });   // 사람이 돌보는 것이 먼저
  novices.update(dt, sharedNow(), camera.position);
  if (careHeldUntil && (performance.now() >= careHeldUntil || !state.gestureUntil)) { careHeldUntil = 0; me.hold(myBundle != null ? makeBundle(THREE, CLOTHS[myBundle]) : null, "hang"); }   // 먹인 것을 내려놓고 들고 있던 꾸러미로
  ui.setTea(state.base === "sit" && !state.bow108 && !state.gestureUntil && !!teaSeatAt(p));
  const outdoors = !insideHall(p) && !insideCave(p) && !insideHermitage(p) && !insideTea(p);   // 벽 너머 동물에게는 버튼이 뜨지 않게
  for (const a of Object.keys(CARE)) ui.setCare(a, outdoors && state.base !== "walk" && !state.bow108 && !state.gestureUntil && carePick(petsNow, p, a) >= 0);
  ui.setSuneungButton(suneungActive(net.now()) && !suLitHere && !state.bow108 && offerPlace(p) !== "gwan");
  ui.setNearBongsong(state.base !== "walk" && !gotBongsong && nearBongsong(p));
  const inside = insideHall(p);
  const inHerm = insideHermitage(p);
  ui.setNearStatue(inside || insideCave(p) || inHerm || Math.hypot(p.x - STATUE.x, p.z - STATUE.z) <= STATUE.baseR + BOW_RANGE);
  const offerK = state.base !== "walk" ? offerPlace(p) : null, offerKind = offerK && OFFER_PLACES[offerK].kind;
  ui.setNearCandles(state.base !== "walk" && (nearCandles(p) || offerKind === "candle"));
  ui.setNearIncense(offerKind === "incense");
  ui.setNearWish(state.base !== "walk" && nearWish(p), readable().length > 0);
  ui.setNearGiwa(state.base !== "walk" && nearGiwa(p));
  giwa.update(dt);
  ui.setNearNote(nearNote(p));
  const inCave = insideCave(p);
  const inTea = insideTea(p);
  rig.setIndoor(inside || inCave || inHerm || inTea, inTea ? 0 : inCave ? faceCaveAltar(p) : inHerm ? faceHermAltar(p) : faceAltar(p), inTea ? TEA_ROOM : inCave ? CAVE_ROOM : inHerm ? HERM_ROOM : ROOM);

  drawOthers(now, p, dt);
  audio.setListener(p);
  rig.follow({ x: p.x, z: p.z, yaw: state.yaw, y: fy - (seated ? 0.3 : 0) });
  rig.update(dt);
  // 카메라가 머리에 바짝 붙으면 내 모습을 옅게 해서 앞이 보이게 한다
  const camGap = camera.position.distanceTo(headAt.set(p.x, fy + 1.1, p.z));
  me.setOpacity(Math.min(1, Math.max(0.15, (camGap - 0.7) / 0.8)));
  world.update(new Date(clockNow()), dt, camera.position);
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function drawOthers(now, mePos, dt) {
  if (net.mode !== "shared") return;
  peers = peersFromSnapshot(snapshot, net.uid, now, mePos);
  const seen = new Set();
  for (const peer of peers) {
    seen.add(peer.uid);
    let o = others.get(peer.uid);
    if (!o) {
      o = { avatar: createAvatar(THREE, { color: AVATAR_COLORS[peer.c % AVATAR_COLORS.length] }), gone: 0 };
      // 이미 계시던 분들 말고, 내가 들어온 뒤에 새로 오신 분만 알린다
      if (performance.now() - joinedAt > 4000) {
        ui.notify(`${whoTag(peer.n, peer.h)} 들어오셨어요`);
        const uid = peer.uid, n = peer.n, h = peer.h;           // 새로 오신 분께도 달려간다 (이름으로 정해 어느 화면에서나 같은 동자승)
        setTimeout(() => { const v = () => { const q = others.get(uid); return q && !q.gone ? q.avatar.root.position : null; }; novices.greet(v, n, h, sharedNow()); }, 1500);
      }
      scene.add(o.avatar.root);
      others.set(peer.uid, o);
    }
    o.gone = 0;
    o.avatar.setOpacity(peer.away ? 0.55 : 1);       // 잠깐 다른 화면에 간 분은 옅게
    const pos = positionAt(peer.m, now);
    o.avatar.root.position.set(pos.x, floorY(pos), pos.z);
    if (!pos.arrived) o.yaw = pos.yaw;
    if (peer.p === "lean") o.yaw = 0;
    if (peer.p === "give" && pos.arrived) {          // 봉송 받는 분: 보살님을 마주 보고, 내 화면의 보살님도 건네신다 (막 시작한 몸짓만)
      o.yaw = faceBongsong(pos);
      if (o.gavePt !== peer.pt && net.now() - peer.pt < 2000 && nearBongsong(pos)) bosalGive(Math.floor(Math.random() * CLOTHS.length));
      o.gavePt = peer.pt;
    }
    if ((o.b ?? null) !== peer.b) { o.b = peer.b; o.avatar.hold(peer.b == null ? null : makeBundle(THREE, CLOTHS[peer.b]), "hang"); }   // 든 꾸러미
    if (peer.p === "light" && pos.arrived) { const k = offerPlace(pos); o.yaw = k ? faceOffer(pos, k) : nearWish(pos) ? faceWish(pos) : nearGiwa(pos) ? faceGiwa(pos) : faceCandles(pos); }   // 초 켜기와 소원 걸기는 같은 몸짓
    const onSeat = pos.arrived && seatAt(pos);
    const sat = onSeat ? ["sit", "hapjang", "bow", "bow108", "light", "tea"].includes(peer.p) : pos.arrived && peer.p === "sit";   // 108배 마치고 그 자리에 앉기도 한다
    if (onSeat && sat) o.yaw = faceSeat(pos);
    o.avatar.setSeated(!!sat);
    o.avatar.root.rotation.y = o.yaw || 0;
    const care = o.care && o.care.until > performance.now() && pos.arrived ? o.care : null;
    if (o.care && o.care.heldUntil && (!care || performance.now() >= o.care.heldUntil)) { o.care.heldUntil = 0; o.avatar.hold(o.b == null ? null : makeBundle(THREE, CLOTHS[o.b]), "hang"); }
    if (care) o.avatar.root.rotation.y = faceDog(pos, petsNow[care.i]);
    const sip = !care && !!onSeat && peer.p === "tea" && net.now() - peer.pt < (TEA_SIP_SEC + 1) * 1000;   // 찻잔을 드는 분 (끝 신호가 안 와도 내려놓는다)
    if (sip !== !!o.sip) { o.sip = sip; o.avatar.hold(sip ? (o.cup ??= makeTeaCup(THREE)) : o.b == null ? null : makeBundle(THREE, CLOTHS[o.b]), sip ? "hand" : "hang"); }
    o.avatar.setPose(care ? care.pose : sip ? "tea" : peer.p === "tea" ? "sit" : !pos.arrived ? "walk" : peer.p === "walk" ? "stand" : peer.p);
    o.avatar.setName(nameTag(peer.n, peer.h));
    o.avatar.setLongHair(peer.h === "f");
    if (shouldShowTalk(peer.t, { shownAt: o.saidAt || 0, now, dist: Math.hypot(pos.x - mePos.x, pos.z - mePos.z), hidden: talkHidden.includes(peer.uid) })) {
      o.saidAt = peer.t.at;
      o.avatar.say(cleanTalk(peer.t.x), TALK_SEC);
    }
    o.avatar.setReach(care ? pets[PET_IDS[care.i]].touch(care.a, o.reachAt ??= new THREE.Vector3()) : null);
    o.avatar.update(dt);
  }
  for (const [uid, o] of others) {
    if (seen.has(uid)) continue;
    o.gone += dt;                                   // 사라진 사람은 1초 동안 흐려진다
    o.avatar.setOpacity(Math.max(0, 1 - o.gone));
    if (o.gone >= 1) { scene.remove(o.avatar.root); others.delete(uid); }
  }
  const here = peers.length + 1, recent = recentVisitorCount(visits, now);
  ui.setCount(recent > here ? `${here}명 함께 · 지난 한 시간 ${recent}명` : `${here}명 함께`);
}

function redrawTraces() { world.setTraces(visibleTraces(traceRecords, net.now())); }
function redrawCandles() {
  const now = net.now();
  world.setCandles(liveCandles(candleRecords, now).map((c) => ({ slot: c.slot, left: burnLeft(c, now) })));
}
function redrawOffers() {
  const now = net.now();
  for (const k of Object.keys(OFFER_PLACES)) world.setOffers(k, liveOffers(offerRecords, k, now).map((r) => ({ slot: r.slot, left: offerLeft(r, now) })));
}
function redrawWishes() { world.setWishes(liveWishes(wishRecords, net.now())); }
setInterval(() => { redrawTraces(); redrawCandles(); redrawOffers(); redrawWishes(); }, 60000);       // 1분마다 흔적은 옅어지고 초는 짧아진다

let myName = "", mySex = "f", joinedAt = Infinity;
ui.onEnter(async (name, sex) => {
  myName = name;
  mySex = sex;
  me.setName(nameTag(name, sex));
  me.setLongHair(cleanSex(sex) === "f");
  audio.start();
  ui.showHintOnce();
  if (invite) ui.showWhisper(`${SHARE_PLACES[invite.place].kind === "wish" ? "소원걸이" : SHARE_PLACES[invite.place].kind === "incense" ? "부처님" : "촛불"} 앞이에요. 함께 마음을 모아 주세요`, 6000);
  // 공양주 보살님의 인사: 내 화면에만. 초대받아 다른 자리에 왔으면 보살님이 안 보이니 위쪽 알림으로, 잠깐 떠났다 이어 들어오면 하지 않는다
  if (invite) ui.notify(`공양주 보살님: ${greeting(name, sex)}`, 6000);
  else if (!resumed) {
    const here = positionAt(state.move, net.now());   // 내 몸과 이름표에 가리지 않게 보살님을 1m쯤 옆에 두고 본다
    state.yaw = faceBongsong(here) + Math.atan2(1, Math.hypot(here.x - BONGSONG.bosal.x, here.z - BONGSONG.bosal.z)); rig.turnTo(state.yaw);
    setTimeout(() => { bosal.say(greeting(name, sex), 5.5); bosalDo("hapjang", 2.6); }, 1400);   // 들어가기 화면이 걷힌 뒤
    setTimeout(() => novices.greet(() => positionAt(state.move, net.now()), name, sex, sharedNow()), 3200);   // 동자승 하나가 달려와 말을 건다
  }
  const config = new URLSearchParams(location.search).has("emu")
    ? { apiKey: "demo-key", authDomain: "demo-amja.firebaseapp.com", databaseURL: "http://127.0.0.1:9000?ns=demo-amja-default-rtdb", projectId: "demo-amja", appId: "demo", emulator: true }
    : FIREBASE;
  const p = await createPresence({ config, me: { c: colorIndex, m: state.move, p: state.base, n: myName, h: mySex }, onLate: adopt });
  if (p.mode === "shared") adopt(p);
});

// 이어 들어가기: 그 자리·자세로, 든 꾸러미도 그대로. 소리는 손이 닿아야 켜지니 첫 터치에 다시 켠다
if (resumed) {
  state.yaw = resumed.yaw;
  if (resumed.base === "sit" && seatAt(resumed)) { state.sitOnArrive = true; setBase("walk"); }
  else if (resumed.base === "lean") { state.leanOnArrive = true; setBase("walk"); }
  if (resumed.bundle != null) { gotBongsong = true; myBundle = resumed.bundle; me.hold(makeBundle(THREE, CLOTHS[myBundle]), "hang"); }
  setTimeout(() => {
    ui.enterAs(resumed.name, resumed.sex);
    const wake = async () => { if (await audio.resumeIfNeeded()) removeEventListener("pointerdown", wake); };
    addEventListener("pointerdown", wake);
    setTimeout(async () => { if (!(await audio.resumeIfNeeded())) ui.showSoundResume(() => audio.resumeIfNeeded()); }, 800);
  }, 0);
}

// 같이 있기로 옮겨 탄다 (처음 연결이든, 늦게 붙은 연결이든)
function adopt(p) {
  // 서버 시계로 옮겨 탄다: 지금 서 있는 자리에서 다시 시작
  const here = positionAt(state.move, Date.now());
  state.move = startMove(here, here, p.now());
  net = p;
  ui.setTalk(true);
  net.sendMove(state.move);
  net.sendPose(state.base);
  if (myBundle != null) net.sendCarry(myBundle);
  net.onPeers((val) => { snapshot = val; });
  if (suneungActive(net.now())) {
    net.onSuneungCount((n) => { suneungCount = n; });
    setTimeout(() => { const t = countLine(suneungCount); if (t && suneungActive(net.now())) ui.notify(t, 6000); }, 5000);
  }
  net.onPetAct((all) => {
    for (const [i, w] of PET_IDS.entries()) {
      const v = all && all[w];
      if (!v || v.at === petSeen[w]) continue;
      petSeen[w] = v.at;
      if (v.u === net.uid || !canCare(w, v.a)) continue;       // 내 것은 이미 그렸다
      const c = CARE[v.a], left = c.sec * 1000 - (net.now() - v.at), o = others.get(v.u);
      if (left < 300 || !o) continue;                          // 들어오기 전에 끝난 일은 보여 주지 않는다
      startPetAct(w, v.a, left, careYaw(petsNow[i], o.avatar.root.position, v.a));
      o.care = { i, a: v.a, pose: c.pose, until: performance.now() + left, heldUntil: 0 };
      if (c.item && left > (c.sec - c.item) * 1000) { o.avatar.hold(makeCareItem(THREE, v.a), "hand"); o.care.heldUntil = performance.now() + left - (c.sec - c.item) * 1000; }
    }
  });
  net.onGreeted((from) => {
    const who = peers.find((x) => x.uid === from);
    ui.notify(`${who ? whoTag(who.n, who.h) : "누군가"} 합장으로 인사했어요 🙏`);
  });
  joinedAt = performance.now();
  // 들어왔을 때 이미 계신 분이 있으면 한 번 알려 준다
  setTimeout(() => { if (peers.length) ui.notify(`지금 ${peers.length}분이 함께 계세요`); }, 3500);
  net.markVisit();
  net.onVisits((v) => { visits = v; });
  net.onTraces((recs) => { traceRecords = recs; redrawTraces(); });
  let candlesSeen = null;
  net.onCandles((recs) => {
    // 들어온 뒤에 남이 켠 초만 알린다 (내 초, 처음 읽은 초는 빼고)
    if (candlesSeen) {
      for (const c of recs) {
        const key = `${c.slot}:${c.at}`;
        if (!candlesSeen.has(key) && c.n !== myName && net.now() - c.at < 30000) ui.notify(`${whoTag(c.n, c.h)} 초를 밝혔어요 🕯️`);
      }
    }
    candlesSeen = new Set(recs.map((c) => `${c.slot}:${c.at}`));
    candleRecords = recs;
    redrawCandles();
  });
  let offersSeen = null;
  net.onOffers((recs) => {
    if (offersSeen) {                      // 들어온 뒤에 남이 올린 것만 알린다
      for (const r of recs) {
        const key = `${r.k}:${r.slot}:${r.at}`;
        if (!offersSeen.has(key) && r.n !== myName && OFFER_PLACES[r.k] && net.now() - r.at < 30000) ui.notify(OFFER_PLACES[r.k].kind === "incense" ? `${whoTag(r.n, r.h)} 향을 피웠어요` : `${whoTag(r.n, r.h)} 초를 밝혔어요 🕯️`);
      }
    }
    offersSeen = new Set(recs.map((r) => `${r.k}:${r.slot}:${r.at}`));
    offerRecords = recs;
    redrawOffers();
  });
  let giwaSeen = null;
  net.onGiwa((recs) => {
    if (giwaSeen) for (const g of recs) if (!giwaSeen.has(g.id) && g.n !== myName && net.now() - g.at < 30000) ui.notify(`${whoTag(g.n, g.h)} 기와를 올렸어요`);
    giwaSeen = new Set(recs.map((g) => g.id));
    const waiting = giwaRecords.filter((g) => g.mine && !recs.some((r) => r.slot === g.slot && Math.abs(r.at - g.at) < 60000));   // 아직 서버에서 안 돌아온 내 기와
    giwaRecords = [...recs, ...waiting];
    giwa.setTiles(liveGiwa(giwaRecords));
  });
  let wishesSeen = null;
  net.onWishes((recs) => {
    if (wishesSeen) {
      for (const w of recs) {
        const key = `${w.slot}:${w.at}`;
        if (!wishesSeen.has(key) && !w.mine && !myWishes.some((m) => m.id === w.id) && w.n !== myName && net.now() - w.at < 30000) ui.notify(`${whoTag(w.n, w.h)} 소원을 걸었어요`);
      }
    }
    wishesSeen = new Set(recs.map((w) => `${w.slot}:${w.at}`));
    wishRecords = recs;
    redrawWishes();
    myLiveWishes();
    saveMyWishes();
    listenJoins();
  });
  net.cleanup();
}
requestAnimationFrame(frame);

// 점검용: ?debug=1 일 때만 상태를 밖에서 본다
if (new URLSearchParams(location.search).has("debug")) window.__amja = { goTo, state, camera, me, positionAt, audio, get net() { return net; }, get others() { return others; }, get traces() { return traceRecords; }, world, critters, pets, novices, giwaWall: giwa, renderer, scene, get petsNow() { return petsNow; }, petActs, ui };
