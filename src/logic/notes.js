/* 바라는 점 (대웅전 문 오른쪽 방명록): 해조암에 바라는 점을 적으면 notes/에 쌓이고, 만든 사람만 읽는다(규칙이 읽기를 막음).
   적은 사람 폰에는 내가 남긴 글이 남는다. 1분에 한 번. */
export const NOTE_MAX = 300, NOTE_GAP_MS = 60000;
export function cleanNote(raw) {
  const t = String(raw ?? "").replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  return t.length >= 1 && t.length <= NOTE_MAX ? t : null;
}
export const canSendNote = (lastAt, now) => !(lastAt > 0) || now - lastAt >= NOTE_GAP_MS;
