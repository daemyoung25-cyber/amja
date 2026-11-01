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

  return {
    onEnter, setCount, setNearStatue, setLeaning, pokeHud, showHintOnce, showWhisper,
    onHapjang: (cb) => btnHapjang.addEventListener("click", cb),
    onBow: (cb) => btnBow.addEventListener("click", cb),
    onOpenSettings: (cb) => btnSound.addEventListener("click", cb),
  };
}
