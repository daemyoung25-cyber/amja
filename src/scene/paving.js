/* 막돌 박석 바닥 (마당과 섬 암자 터가 함께 씀): 10m마다 되풀이되는 무늬 + 노멀맵 높낮이,
   되풀이가 눈에 띄지 않게 넓은 얼룩을 놓인 자리(월드 좌표) 기준으로 덧입힌다. */
let cache = null;
export function pavingMaterial(THREE, repeatX, repeatY) {
  if (!cache) {
    const loader = new THREE.TextureLoader();
    const map = loader.load("textures/yard-stone.webp");
    map.colorSpace = THREE.SRGBColorSpace;
    cache = { map, normal: loader.load("textures/yard-stone-n.webp") };
  }
  const map = cache.map.clone(), normal = cache.normal.clone();
  for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeatX, repeatY); t.anisotropy = 8; }
  const m = new THREE.MeshLambertMaterial({ map, normalMap: normal, normalScale: new THREE.Vector2(1.6, 1.6) });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader.replace("#include <common>", "#include <common>\nvarying vec2 vYardW;")
      .replace("#include <project_vertex>", "#include <project_vertex>\nvYardW = (modelMatrix * vec4(transformed, 1.0)).xz;");
    sh.fragmentShader = sh.fragmentShader.replace("#include <common>", `#include <common>
      varying vec2 vYardW;
      float yh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float yn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
        return mix(mix(yh(i), yh(i + vec2(1.0, 0.0)), f.x), mix(yh(i + vec2(0.0, 1.0)), yh(i + vec2(1.0, 1.0)), f.x), f.y); }`)
      .replace("#include <map_fragment>", `#include <map_fragment>
      float yv = yn(vYardW / 7.0) * 0.6 + yn(vYardW / 2.3 + 9.0) * 0.4;
      diffuseColor.rgb *= 0.86 + 0.2 * yv;`);
  };
  return m;
}
