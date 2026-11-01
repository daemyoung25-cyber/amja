/* 화면 위 글자와 버튼. 늘 보이는 버튼은 최대 3개, 기대 있으면 사라진다. */
const $ = (id) => document.getElementById(id);
const HINT_KEY = "amja-hinted";

export function createUI({ placeName }) {
  document.title = placeName;
  $("enter-title").textContent = placeName;
  const hud = $("hud"), count = $("count"), hint = $("hint"), whisper = $("whisper");
  const btnHapjang = $("btn-hapjang"), btnBow = $("btn-bow"), btnSound = $("btn-sound");

  let leaning = false, fadeTimer = 0, whisperTimer = 0;
  const fadeSoon = (ms) => { clearTimeout(fadeTimer); fadeTimer = setTimeout(() => leaning && hud.classList.add("faded"), ms); };

  function onEnter(cb) {
    $("enter-btn").addEventListener("click", () => {
      const enter = $("enter");
      enter.classList.add("leaving");
      setTimeout(() => (enter.hidden = true), 1300);
      hud.hidden = false;
      cb();
    }, { once: true });
  }

  function setCount(text) { count.hidden = !text; count.textContent = text || ""; }
  function setNearStatue(near) { btnBow.hidden = !near; }

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

  function showWhisper(text, ms = 3000) {
    whisper.textContent = text;
    whisper.classList.add("on");
    clearTimeout(whisperTimer);
    whisperTimer = setTimeout(() => whisper.classList.remove("on"), ms);
  }

  const sheet = $("sheet"), creditsSheet = $("credits-sheet"), resume = $("sound-resume");
  const volumeCbs = [];
  $("sheet-close").addEventListener("click", () => (sheet.hidden = true));
  $("credits-close").addEventListener("click", () => (creditsSheet.hidden = true));
  for (const slider of sheet.querySelectorAll("input[data-layer]")) {
    slider.addEventListener("input", () => volumeCbs.forEach((cb) => cb(slider.dataset.layer, slider.value / 100)));
  }

  // 소리 시트: 층마다 크기 (0이면 꺼짐)
  function openSettings({ volumes }) {
    creditsSheet.hidden = true;
    for (const slider of sheet.querySelectorAll("input[data-layer]")) slider.value = Math.round((volumes[slider.dataset.layer] ?? 1) * 100);
    sheet.hidden = false;
  }

  // 출처 시트: 오른쪽 위 [출처] 버튼
  function openCredits(credits) {
    sheet.hidden = true;
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
    onEnter, setCount, setNearStatue, setLeaning, pokeHud, showHintOnce, showWhisper,
    onHapjang: (cb) => btnHapjang.addEventListener("click", cb),
    onBow: (cb) => btnBow.addEventListener("click", cb),
    onOpenSettings: (cb) => btnSound.addEventListener("click", cb),
  };
}
