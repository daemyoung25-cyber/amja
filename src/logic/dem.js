/* 실제 지형 높이 지도 (SRTM, 남해 금산 남쪽 바닷가). PNG 한 장에 R·G 두 바이트로 높이를 담았다:
   높이(m) = (R*256 + G) / 10 - 20. 장면 좌표는 x 동쪽, z 북쪽(산 쪽)이고, 가로 sh배·세로 sv배로 줄인다. */
export function decodeDem(rgba, w, h) {
  const out = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) out[i] = (rgba[i * 4] * 256 + rgba[i * 4 + 1]) / 10 - 20;
  return out;
}

export function demSampler({ data, w, h, originX, originY, mpp, sh, sv }) {
  const at = (ix, iy) => (ix < 0 || iy < 0 || ix >= w || iy >= h ? 0 : data[iy * w + ix]);
  return (x, z) => {
    const fx = originX + x / sh / mpp, fy = originY - z / sh / mpp;
    if (fx < 0 || fy < 0 || fx > w - 1 || fy > h - 1) return 0;
    const ix = Math.floor(fx), iy = Math.floor(fy), tx = fx - ix, ty = fy - iy;
    const top = at(ix, iy) * (1 - tx) + at(ix + 1, iy) * tx, bot = at(ix, iy + 1) * (1 - tx) + at(ix + 1, iy + 1) * tx;
    return (top * (1 - ty) + bot * ty) * sv;
  };
}
