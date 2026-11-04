/* 촛불 공양대: 돌 받침 위 붉은 나무 장, 네 단 계단 선반(단마다 12칸), 작은 기와지붕.
   초는 유리컵 속 흰 초, 하루 동안 짧아진다. 불꽃은 깜빡이고 둘레에 빛무리. 앞(모델의 -z, 해수관음 쪽)에서 올린다. */
import { CANDLE_SLOTS } from "../logic/candles.js";
import { candleBank } from "./offerBanks.js";

const COLS = 12, TIERS = CANDLE_SLOTS / COLS;
const ORDER = [5, 6, 4, 7, 3, 8, 2, 9, 1, 10, 0, 11];          // 가운데부터 바깥으로 채운다

// 칸 번호 → 공양대 안의 자리 (앞 단부터)
function slotPos(slot) {
  const tier = Math.floor(slot / COLS), col = ORDER[slot % COLS];
  return { x: (col - (COLS - 1) / 2) * 0.15, y: 0.78 + tier * 0.2, z: -0.22 + tier * 0.13 };
}

export function createCandleRack(THREE, { x, z, yaw = 0 }) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = yaw;                                      // 앞면(-z)이 yaw 쪽을 본다
  const mat = (color) => new THREE.MeshLambertMaterial({ color });
  const stone = mat(0x9a9285), wood = mat(0x7a2a1e), shelfMat = mat(0x5a3a26), roofMat = mat(0x2e3138), gold = mat(0xb08a3a);
  const box = (w, h, d, m, px, py, pz) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(px, py, pz); group.add(o); return o; };

  box(2.1, 0.3, 0.9, stone, 0, 0.15, 0);                       // 돌 받침
  box(2.0, 0.36, 0.8, wood, 0, 0.48, 0);                       // 장 아랫단
  for (let i = 0; i < TIERS; i++) {                            // 계단 선반
    const p = slotPos(i * COLS);
    box(1.9, 0.04, 0.16, shelfMat, 0, p.y - 0.02, p.z);
    box(1.9, p.y - 0.66, 0.03, shelfMat, 0, (p.y + 0.66) / 2 - 0.02, p.z + 0.08);
  }
  box(2.0, 1.25, 0.06, wood, 0, 1.13, 0.37);                   // 뒤판
  for (const sx of [-1, 1]) box(0.08, 1.6, 0.08, wood, sx * 0.98, 1.1, -0.36);   // 앞기둥
  for (const sx of [-1, 1]) box(0.06, 1.25, 0.76, wood, sx * 0.98, 1.13, 0);     // 옆판
  box(2.0, 0.1, 0.1, wood, 0, 1.8, -0.36);                     // 앞 도리
  // 기와지붕: 앞뒤로 기운 두 장 + 용마루
  for (const s of [-1, 1]) {
    const r = box(2.5, 0.06, 0.75, roofMat, 0, 2.0, s * 0.27);
    r.rotation.x = s * 0.42;
  }
  box(2.55, 0.08, 0.08, roofMat, 0, 2.15, 0);
  // 현판: 검은 바탕에 금빛 글씨 '촛불 공양' (작게)
  const sign = document.createElement("canvas"); sign.width = 512; sign.height = 128;
  const sg = sign.getContext("2d");
  sg.fillStyle = "#2a1a12"; sg.fillRect(0, 0, 512, 128);
  sg.strokeStyle = "#b08a3a"; sg.lineWidth = 8; sg.strokeRect(6, 6, 500, 116);
  sg.fillStyle = "#e2bf6a"; sg.font = '700 72px "Nanum Myeongjo","Batang","AppleMyungjo",serif';
  sg.textAlign = "center"; sg.textBaseline = "middle"; sg.fillText("촛불 공양", 256, 68);
  const signTex = new THREE.CanvasTexture(sign); signTex.colorSpace = THREE.SRGBColorSpace; signTex.anisotropy = 4;
  const signMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.18), new THREE.MeshLambertMaterial({ map: signTex }));
  signMesh.position.set(0, 1.66, -0.42);
  signMesh.rotation.y = Math.PI;                                 // 앞(-z)을 본다
  group.add(signMesh);
  // 지붕 위에 뜬 이름표 (사람 머리 위 이름표와 같은 모양): 멀리서도 어디인지 보이게, 늘 화면을 본다
  const tagC = document.createElement("canvas"); tagC.width = 512; tagC.height = 128;
  const tg = tagC.getContext("2d");
  tg.font = '600 64px "Apple SD Gothic Neo","Noto Sans KR",sans-serif';
  tg.textAlign = "center"; tg.textBaseline = "middle";
  const tw = Math.min(500, tg.measureText("촛불 공양").width + 56);
  tg.fillStyle = "rgba(20,22,36,0.55)";
  tg.beginPath(); tg.roundRect((512 - tw) / 2, 14, tw, 100, 50); tg.fill();
  tg.fillStyle = "#f8f3e8"; tg.fillText("촛불 공양", 256, 66);
  const tagTex = new THREE.CanvasTexture(tagC); tagTex.colorSpace = THREE.SRGBColorSpace;
  const tag = new THREE.Sprite(new THREE.SpriteMaterial({ map: tagTex, transparent: true, depthWrite: false }));
  tag.scale.set(1.9, 0.475, 1);
  tag.position.set(0, 2.7, 0);
  tag.renderOrder = 10;
  group.add(tag);

  const bank = candleBank(THREE, group, slotPos, CANDLE_SLOTS);
  return { group, setCandles: bank.setItems, update: bank.update, setNight: bank.setNight };
}
