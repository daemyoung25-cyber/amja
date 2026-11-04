/* 잠깐 나갔다 와도 이어지게: 카톡 등으로 화면을 떠난 사이 폰이 페이지를 버리고 다시 열면,
   이 탭(sessionStorage)에 둔 마지막 상태로 이름 화면 없이 그 자리에서 이어 간다. 탭을 닫으면 사라진다. */
export const SESSION_KEY = "amja-session";
export const SESSION_TTL_MS = 3 * 3600000;          // 세 시간 넘게 떠나 있었으면 처음처럼
const BASES = ["stand", "sit", "lean"];
const num = (v) => typeof v === "number" && Number.isFinite(v);

export function packSession({ name, sex, color, x, z, yaw, base, bundle }, nowMs) {
  return { at: nowMs, name, sex, color, x, z, yaw, base: BASES.includes(base) ? base : "stand", bundle: Number.isInteger(bundle) ? bundle : null };
}

// 저장된 글을 읽어 쓸 수 있으면 상태를, 아니면 null
export function readSession(text, nowMs, { cleanName, cleanSex }) {
  let s;
  try { s = JSON.parse(text); } catch { return null; }
  if (!s || typeof s !== "object" || !num(s.at) || nowMs - s.at > SESSION_TTL_MS || nowMs < s.at - 60000) return null;
  const name = cleanName(s.name);
  if (!name || ![s.x, s.z, s.yaw].every(num) || !Number.isInteger(s.color) || s.color < 0 || s.color > 5) return null;
  return {
    name, sex: cleanSex(s.sex), color: s.color, x: s.x, z: s.z, yaw: s.yaw,
    base: BASES.includes(s.base) ? s.base : "stand",
    bundle: Number.isInteger(s.bundle) && s.bundle >= 0 && s.bundle <= 5 ? s.bundle : null,
  };
}

// 다른 분 화면: 잠깐 떠난 분(a = 떠난 시각)은 하트비트가 멈춰도 열 분 동안 그 자리에 옅게 남는다
export const AWAY_MS = 10 * 60000;
