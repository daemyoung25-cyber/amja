import { cleanName, cleanSex, nameProblem } from "./logic/name.js";

/* 화면 위 글자와 버튼. 늘 보이는 버튼은 최대 3개, 기대 있으면 사라진다. */
const $ = (id) => document.getElementById(id);
const HINT_KEY = "amja-hinted";

export function createUI({ placeName }) {
  document.title = placeName;
  $("enter-title").textContent = placeName;
  const hud = $("hud"), count = $("count"), hint = $("hint"), whisper = $("whisper");
  const btnHapjang = $("btn-hapjang"), btnBow = $("btn-bow"), btnBow108 = $("btn-bow108"), bowCount = $("bowcount"), btnSound = $("btn-sound"), btnCandle = $("btn-candle"), btnIncense = $("btn-incense"), btnWish = $("btn-wish"), btnWishRead = $("btn-wish-read"), btnBongsong = $("btn-bongsong"), btnPet = $("btn-pet");

  let leaning = false, fadeTimer = 0, whisperTimer = 0;
  const fadeSoon = (ms) => { clearTimeout(fadeTimer); fadeTimer = setTimeout(() => leaning && hud.classList.add("faded"), ms); };

  // 들어가기: 이름(한글 1~8자)을 받아 넘긴다. 지난번 이름은 기억해 둔다.
  const NAME_KEY = "amja-name", SEX_KEY = "amja-sex";
  // 여·남 고르기: 이름 뒤 호칭(보살·처사)이 바로 바뀐다. 지난번 고른 것을 기억한다.
  let sex = "f";
  try { sex = cleanSex(localStorage.getItem(SEX_KEY)); } catch {}
  const sexBtns = [...document.querySelectorAll(".enter-sex button")];
  const showSex = () => {
    for (const b of sexBtns) b.setAttribute("aria-checked", String(b.dataset.sex === sex));
    $("enter-suffix").textContent = sex === "m" ? "처사" : "보살";
  };
  for (const b of sexBtns) b.addEventListener("click", () => { sex = cleanSex(b.dataset.sex); showSex(); });
  showSex();
  const nameInput = $("enter-name"), nameError = $("enter-error");
  try { nameInput.value = localStorage.getItem(NAME_KEY) || ""; } catch {}
  let goNow = null;
  // 잠깐 나갔다 와서 페이지가 다시 열렸을 때: 이름 화면을 건너뛰고 바로 들어간다
  function enterAs(name, s) { nameInput.value = name; sex = cleanSex(s); showSex(); if (goNow) goNow(); }
  function onEnter(cb) {
    let entered = false;
    const go = () => {
      if (entered) return;
      const why = nameProblem(nameInput.value);
      if (why) { nameError.textContent = why; nameError.hidden = false; nameInput.focus(); return; }
      const name = cleanName(nameInput.value);
      entered = true;
      nameInput.blur();
      try { localStorage.setItem(NAME_KEY, name); localStorage.setItem(SEX_KEY, sex); } catch {}
      const enter = $("enter");
      enter.classList.add("leaving");
      setTimeout(() => (enter.hidden = true), 1300);
      hud.hidden = false;
      cb(name, sex);
    };
    goNow = go;
    $("enter-btn").addEventListener("click", go);
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter" && !e.isComposing) go(); });
    nameInput.addEventListener("input", () => (nameError.hidden = true));
  }

  function setCount(text) { count.hidden = !text; count.textContent = text || ""; }
  let nearStatue = false, bowing = false;
  function setNearStatue(near) { nearStatue = near; btnBow.hidden = !near || bowing; btnBow108.hidden = !near && !bowing; }
  // 108배 하는 동안: 108배 버튼은 '그만'이 되고, 몇 번째인지 작게 보인다. 버튼은 곧 물러나고 숫자만 남는다
  function setBowing(on) {
    bowing = on;
    hud.classList.toggle("bowing", on);
    btnBow108.textContent = on ? "그만" : "108배";
    bowCount.hidden = !on;
    if (!on) bowCount.textContent = "";
    setNearStatue(nearStatue);
  }
  function setBowCount(done, total) { const t = `${done} / ${total}`; if (bowCount.textContent !== t) bowCount.textContent = t; }
  function setNearCandles(near) { btnCandle.hidden = !near; }
  function setNearBongsong(near) { btnBongsong.hidden = !near; }
  function setNearDog(near) { btnPet.hidden = !near; }
  function setNearIncense(near) { btnIncense.hidden = !near; }
  function setNearWish(near, canRead = false) {
    btnWish.hidden = !near;
    btnWishRead.hidden = !near || !canRead;
    if (!near) wishSheet.hidden = readSheet.hidden = true;
  }

  // 바라는 점 시트: 방명록 앞에 서면 열린다. 아래에 내가 남긴 글
  const noteSheet = $("note-sheet"), noteText = $("note-text"), noteError = $("note-error"), myNoteList = $("my-notes");
  let noteSubmit = async () => null;
  $("note-close").addEventListener("click", () => (noteSheet.hidden = true));
  noteText.addEventListener("input", () => (noteError.hidden = true));
  $("note-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = e.submitter || $("note-form").querySelector("button");
    btn.disabled = true;
    const err = await noteSubmit(noteText.value);
    btn.disabled = false;
    if (err) { noteError.textContent = err; noteError.hidden = false; return; }
    noteText.value = ""; noteText.blur(); noteSheet.hidden = true;
  });
  function openNoteSheet(mine) {
    sheet.hidden = creditsSheet.hidden = wishSheet.hidden = readSheet.hidden = noteSheet.hidden = true;
    noteError.hidden = true;
    myNoteList.replaceChildren(...mine.map((m) => {
      const li = document.createElement("li"), when = document.createElement("span");
      const d = new Date(m.at); when.textContent = `${d.getMonth() + 1}월 ${d.getDate()}일`;
      li.append(m.text, when); return li;
    }));
    myNoteList.hidden = !mine.length;
    noteSheet.hidden = false;
  }
  function setNearNote(near) { if (!near) noteSheet.hidden = true; }

  function setLeaning(on) {
    leaning = on;
    if (on) fadeSoon(1500);
    else { clearTimeout(fadeTimer); hud.classList.remove("faded"); }
  }

  // 기대 있는 동안 화면을 누르면 버튼만 4초 돌아온다
  function pokeHud() {
    if (!leaning) return;
    hud.classList.remove("faded");
    fadeSoon(4000);
  }

  function showHintOnce() {
    let seen = false;
    try { seen = localStorage.getItem(HINT_KEY) === "1"; localStorage.setItem(HINT_KEY, "1"); } catch {}
    if (seen) return;
    hint.hidden = false;
    setTimeout(() => { hint.style.opacity = "0"; setTimeout(() => (hint.hidden = true), 900); }, 6000);
  }

  // 위쪽 알림: 여러 개면 쌓였다가 하나씩 사라진다 (최대 3개)
  const toasts = $("toasts");
  function notify(text, ms = 5000) {
    const el = document.createElement("div");
    el.className = "toast";
    const dot = document.createElement("span"); dot.className = "dot";
    el.append(dot, text);
    toasts.append(el);
    while (toasts.children.length > 3) toasts.firstChild.remove();
    requestAnimationFrame(() => el.classList.add("on"));
    setTimeout(() => { el.classList.remove("on"); setTimeout(() => el.remove(), 500); }, ms);
  }

  function showWhisper(text, ms = 3000) {
    whisper.textContent = text;
    whisper.classList.add("on");
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(() => whisper.classList.remove("on"), ms);
  }

  const sheet = $("sheet"), creditsSheet = $("credits-sheet"), resume = $("sound-resume");
  // 소원 적기 시트: 한 줄 적어 걸고, 아래에 아직 걸려 있는 내 소원이 보인다 (글은 이 폰에만)
  const wishSheet = $("wish-sheet"), wishText = $("wish-text"), wishError = $("wish-error"), myWishList = $("my-wishes"), wishPub = $("wish-pub"), wishNote = $("wish-note");
  const showPubNote = () => {
    wishNote.textContent = wishPub.checked
      ? "이름 없이 글만 다른 분께 보여요. 숫자·링크는 넣을 수 없어요. 소원패는 이레 동안 걸려 있어요"
      : "적은 글은 이 폰에만 남아요. 다른 분께는 소원패만 보여요. 소원패는 이레 동안 걸려 있어요";
  };
  wishPub.addEventListener("change", () => { wishError.hidden = true; showPubNote(); });
  let wishSubmit = () => null;
  $("wish-close").addEventListener("click", () => (wishSheet.hidden = true));
  wishText.addEventListener("input", () => (wishError.hidden = true));
  $("wish-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const err = wishSubmit(wishText.value, wishPub.checked);
    if (err) { wishError.textContent = err; wishError.hidden = false; return; }
    wishText.value = "";
    wishPub.checked = false;
    showPubNote();
    wishText.blur();
    wishSheet.hidden = true;
  });
  function openWishSheet(mine) {
    sheet.hidden = creditsSheet.hidden = readSheet.hidden = noteSheet.hidden = true;
    wishError.hidden = true;
    myWishList.replaceChildren(...mine.map((m) => {
      const li = document.createElement("li");
      const left = document.createElement("span");
      left.textContent = (m.pub ? (m.joins ? `${m.joins}분이 함께 빌었어요 · ` : "함께 읽는 소원 · ") : "") + `${m.daysLeft}일 남음`;
      li.append(m.text, left);
      return li;
    }));
    myWishList.hidden = !mine.length;
    wishSheet.hidden = false;
  }
  const volumeCbs = [], layerToggleCbs = [];
  $("sheet-close").addEventListener("click", () => (sheet.hidden = true));
  $("credits-close").addEventListener("click", () => (creditsSheet.hidden = true));
  // 소리 시트: 층마다 [−] 숫자 [+], 10씩. 0이면 꺼짐.
  const STEP = 10;
  const rows = [...sheet.querySelectorAll(".row[data-layer]")];
  const showLevel = (row, level) => {
    row.querySelector("output").textContent = level === 0 ? "끔" : String(level);
    row.querySelector('[data-step="-1"]').disabled = level <= 0;
    row.querySelector('[data-step="1"]').disabled = level >= 100;
  };
  for (const row of rows) {
    for (const btn of row.querySelectorAll("button[data-step]")) {
      btn.addEventListener("click", () => {
        const now = Number(row.dataset.level ?? 100);
        const level = Math.min(100, Math.max(0, Math.round(now / STEP) * STEP + Number(btn.dataset.step) * STEP));
        row.dataset.level = level;
        showLevel(row, level);
        volumeCbs.forEach((cb) => cb(row.dataset.layer, level / 100));
      });
    }
  }

  for (const row of rows) {
    const sw = row.querySelector(".layer-on");
    sw.addEventListener("change", () => { row.classList.toggle("off", !sw.checked); layerToggleCbs.forEach((cb) => cb(row.dataset.layer, sw.checked)); });
  }
  function openSettings({ volumes, offs = {} }) {
    for (const row of rows) { const on = !offs[row.dataset.layer]; row.querySelector(".layer-on").checked = on; row.classList.toggle("off", !on); }
    creditsSheet.hidden = wishSheet.hidden = readSheet.hidden = noteSheet.hidden = true;
    for (const row of rows) {
      const level = Math.round((volumes[row.dataset.layer] ?? 1) * 100);
      row.dataset.level = level;
      showLevel(row, level);
    }
    sheet.hidden = false;
  }

  // 소원 읽기 시트: 남이 함께 읽게 건 소원 하나 (이름 없이). 함께 빌기 · 다음 · 가리기
  const readSheet = $("read-sheet"), readText = $("read-text"), readJoin = $("read-join");
  const readCbs = { join: () => {}, next: () => {}, hide: () => {} };
  $("read-close").addEventListener("click", () => (readSheet.hidden = true));
  readJoin.addEventListener("click", () => readCbs.join());
  $("read-next").addEventListener("click", () => readCbs.next());
  $("read-hide").addEventListener("click", () => readCbs.hide());
  function showWishRead(w) {                   // w: { text, joined } 또는 null (더 읽을 것이 없음)
    sheet.hidden = creditsSheet.hidden = wishSheet.hidden = noteSheet.hidden = true;
    if (!w) { readSheet.hidden = true; return; }
    readText.textContent = w.text;
    readJoin.disabled = w.joined;
    readJoin.textContent = w.joined ? "함께 빌었어요" : "함께 빌기";
    readSheet.hidden = false;
  }

  // 출처 시트: 오른쪽 위 [출처] 버튼
  function openCredits(credits) {
    sheet.hidden = wishSheet.hidden = readSheet.hidden = noteSheet.hidden = true;
    const list = $("credits");
    list.replaceChildren(...credits.map((c) => {
      const li = document.createElement("li");
      li.textContent = `${c.what} · `;
      if (c.url) {
        const a = document.createElement("a");
        a.href = c.url; a.target = "_blank"; a.rel = "noopener"; a.textContent = c.title;
        li.append(a, ` · ${c.by} · ${c.license}`);
      } else li.append(c.title);
      return li;
    }));
    creditsSheet.hidden = false;
  }

  function showSoundResume(cb) {
    resume.hidden = false;
    resume.onclick = () => { resume.hidden = true; cb(); };
  }

  return {
    openSettings, openCredits, showSoundResume, onVolume: (cb) => volumeCbs.push(cb),
    onOpenCredits: (cb) => $("btn-credits").addEventListener("click", cb),
    onEnter, enterAs, setCount, setNearStatue, setNearCandles, onCandle: (cb) => btnCandle.addEventListener("click", cb), setNearBongsong, onBongsong: (cb) => btnBongsong.addEventListener("click", cb), setNearDog, onPet: (cb) => btnPet.addEventListener("click", cb), setNearIncense, onIncense: (cb) => btnIncense.addEventListener("click", cb),
    setNearWish, openWishSheet, openNoteSheet, setNearNote, onNoteSubmit: (cb) => (noteSubmit = cb), onWishButton: (cb) => btnWish.addEventListener("click", cb), onWishSubmit: (cb) => (wishSubmit = cb),
    showWishRead, onWishRead: (cb) => btnWishRead.addEventListener("click", cb), onReadJoin: (cb) => (readCbs.join = cb), onReadNext: (cb) => (readCbs.next = cb), onReadHide: (cb) => (readCbs.hide = cb), setLeaning, pokeHud, showHintOnce, showWhisper, notify,
    onHapjang: (cb) => btnHapjang.addEventListener("click", cb),
    onBow: (cb) => btnBow.addEventListener("click", cb),
    onBow108: (cb) => btnBow108.addEventListener("click", cb), setBowing, setBowCount,
    onOpenSettings: (cb) => btnSound.addEventListener("click", cb),
    // 들을 염불 고르기 (소리 시트 안)
    setChantOptions: (list, current) => {
      const sel = $("chant-pick");
      sel.replaceChildren(...list.map((c) => { const o = document.createElement("option"); o.value = c.id; o.textContent = c.name; return o; }));
      sel.value = current;
    },
    onChant: (cb) => $("chant-pick").addEventListener("change", (e) => cb(e.target.value)),
    // 소리 한 번에 끄기/켜기 버튼: 꺼져 있으면 '켜기'
    onLayerToggle: (cb) => layerToggleCbs.push(cb),                          // 소리마다 이름 오른쪽 켜기·끄기 스위치
  };
}
