/* 법당 안을 칠하는 그림들: 수미단 앞판, 단청 띠, 우물반자 천장. 전부 캔버스에 직접 그린다. */
const RED = "#b8322a", DEEP_RED = "#7c2019", GREEN = "#2f7a5c", TEAL = "#3f9c8f", BLUE = "#2c4f9a", WHITE = "#f3ead8", GOLD = "#d9a640", ORANGE = "#e07a3a", PINK = "#e9a0a8";

function canvasTexture(THREE, w, h, draw, repeat = [1, 1]) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat[0] !== 1 || repeat[1] !== 1) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}

// 겹겹이 핀 연꽃 한 송이 (위에서 본 모양)
function lotus(g, x, y, r, colors) {
  colors.forEach((col, k) => {
    const rr = r * (1 - k / colors.length), n = 8;
    g.fillStyle = col;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + k * 0.2;
      g.beginPath();
      g.ellipse(x + Math.cos(a) * rr * 0.5, y + Math.sin(a) * rr * 0.5, rr * 0.5, rr * 0.22, a, 0, Math.PI * 2);
      g.fill();
    }
  });
  g.fillStyle = GOLD; g.beginPath(); g.arc(x, y, r * 0.16, 0, Math.PI * 2); g.fill();
}

function stripes(g, y, w, list) {
  for (const [col, h] of list) { g.fillStyle = col; g.fillRect(0, y, w, h); y += h; }
  return y;
}

/* 수미단 앞판: 위아래 색띠, 가운데 초록 테를 두른 붉은 칸마다 연꽃 */
export function sumidanTexture(THREE) {
  return canvasTexture(THREE, 1024, 256, (g, w, h) => {
    g.fillStyle = DEEP_RED; g.fillRect(0, 0, w, h);
    let y = stripes(g, 0, w, [[GOLD, 6], [BLUE, 10], [WHITE, 4], [GREEN, 16], [WHITE, 4], [RED, 8]]);
    const bottom = h - 46, panels = 6, pw = w / panels;
    for (let i = 0; i < panels; i++) {
      const x = i * pw;
      g.fillStyle = TEAL; g.fillRect(x + 4, y + 6, pw - 8, bottom - y - 10);
      g.fillStyle = GREEN; g.fillRect(x + 12, y + 14, pw - 24, bottom - y - 26);
      g.fillStyle = RED; g.fillRect(x + 20, y + 22, pw - 40, bottom - y - 42);
      lotus(g, x + pw / 2, (y + bottom) / 2, 40, [PINK, WHITE, "#f6d2c8"]);
      g.strokeStyle = GOLD; g.lineWidth = 3; g.strokeRect(x + 20, y + 22, pw - 40, bottom - y - 42);
    }
    stripes(g, bottom, w, [[RED, 8], [WHITE, 4], [GREEN, 14], [BLUE, 10], [GOLD, 10]]);
  });
}

/* 단청 띠: 초록 바탕에 머리초(겹친 꽃 모양)가 되풀이된다 */
export function dancheongBand(THREE, repeatX = 4) {
  return canvasTexture(THREE, 512, 128, (g, w, h) => {
    g.fillStyle = GREEN; g.fillRect(0, 0, w, h);
    stripes(g, 0, w, [[DEEP_RED, 8], [WHITE, 3]]);
    stripes(g, h - 11, w, [[WHITE, 3], [DEEP_RED, 8]]);
    for (const cx of [128, 384]) {
      for (const [r, col] of [[52, BLUE], [44, WHITE], [38, RED], [30, ORANGE], [22, WHITE], [16, GREEN]]) {
        g.fillStyle = col; g.beginPath(); g.ellipse(cx, h / 2, r * 1.5, r * 0.9, 0, 0, Math.PI * 2); g.fill();
      }
      lotus(g, cx, h / 2, 26, [PINK, WHITE]);
      for (const sx of [-1, 1]) {                       // 양옆으로 뻗은 휘
        g.strokeStyle = TEAL; g.lineWidth = 6;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(cx + sx * (92 + k * 14), h / 2, 18, sx > 0 ? Math.PI / 2 : -Math.PI / 2, sx > 0 ? -Math.PI / 2 : Math.PI / 2, sx > 0); g.stroke(); }
      }
    }
  }, [repeatX, 1]);
}

/* 우물반자: 붉은 테를 두른 초록 칸마다 둥근 연꽃 */
export function cofferTexture(THREE, repeat = [6, 3]) {
  return canvasTexture(THREE, 256, 256, (g, w, h) => {
    g.fillStyle = DEEP_RED; g.fillRect(0, 0, w, h);
    g.fillStyle = WHITE; g.fillRect(14, 14, w - 28, h - 28);
    g.fillStyle = GREEN; g.fillRect(20, 20, w - 40, h - 40);
    g.fillStyle = BLUE; g.beginPath(); g.arc(w / 2, h / 2, 82, 0, Math.PI * 2); g.fill();
    g.fillStyle = WHITE; g.beginPath(); g.arc(w / 2, h / 2, 72, 0, Math.PI * 2); g.fill();
    lotus(g, w / 2, h / 2, 66, [RED, ORANGE, PINK, WHITE]);
  }, repeat);
}
