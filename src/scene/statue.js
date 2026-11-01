/* 스캔한 불상 모델을 불러와 높이를 맞추고 금빛 재질을 입힌다.
   못 불러오면 null을 돌려주고, 그 자리는 코드로 만든 부처님이 계속 지킨다. */
export async function loadStatue(THREE, url, { height, envIntensity = 0.6, doubleSided = false, metalness = 0.85, roughness = 0.4 }) {
  try {
    const [{ GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/addons/loaders/GLTFLoader.js"),
      import("three/addons/libs/meshopt_decoder.module.js"),
    ]);
    const gltf = await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(url);
    const model = gltf.scene;
    const size = new THREE.Vector3(), center = new THREE.Vector3();
    const box = new THREE.Box3().setFromObject(model);
    box.getSize(size); box.getCenter(center);
    const k = height / size.y;
    model.scale.setScalar(k);
    model.position.set(-center.x * k, -box.min.y * k, -center.z * k);   // 받침 바닥 가운데가 원점
    const materials = [];
    model.traverse((o) => {
      if (!o.isMesh) return;
      const m = o.material;
      m.metalness = metalness;   // 금동은 금속, 돌은 0
      m.roughness = roughness;
      m.envMapIntensity = envIntensity;
      if (doubleSided) m.side = THREE.DoubleSide;   // 투각 광배는 안팎이 다 보인다
      materials.push(m);
    });
    const holder = new THREE.Group();
    holder.add(model);
    return { object: holder, materials };
  } catch (err) {
    console.warn("불상 모델을 못 불러와 코드로 만든 부처님을 그대로 둠", err);
    return null;
  }
}
