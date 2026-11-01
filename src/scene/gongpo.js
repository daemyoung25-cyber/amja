/* 공포: 기둥 위·처마 밑에 줄지어 선 나무 짜임. 주두 위로 첨차가 층층이 넓어지고 살미가 앞으로 뻗는다.
   부재마다 InstancedMesh 하나라 수십 벌을 놓아도 그리기는 몇 번뿐이다.
   spots: [{ x, z, ry }] — ry는 살미가 뻗는 방향(0이면 -z 쪽으로). */
const PARTS = [
  // [가로, 높이, 깊이, 위로 띄움, 색]  (가로는 벽을 따라, 깊이는 살미 방향)
  [0.34, 0.2, 0.34, 0.0, 0x6b3a2a],    // 주두 (검붉은 나무)
  [0.95, 0.15, 0.2, 0.18, 0x5f7d6e],   // 첨차 1단 (바랜 초록)
  [0.22, 0.15, 0.95, 0.24, 0x8b4a2e],  // 살미 1단 (붉은 끝)
  [1.45, 0.15, 0.2, 0.34, 0x6e9a92],   // 첨차 2단 (옥색)
  [0.22, 0.15, 1.35, 0.42, 0x8b4a2e],  // 살미 2단
  [1.9, 0.14, 0.22, 0.5, 0x5f7d6e],    // 첨차 3단
];
const SORO = 0xc08a44;   // 소로(작은 받침) 황토색

export function createGongpo(THREE, spots, { y, scale = 1 }) {
  const group = new THREE.Group();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), pos = new THREE.Vector3(), one = new THREE.Vector3(scale, scale, scale);
  const place = (mesh, offsets) => {
    let i = 0;
    for (const s of spots) {
      q.setFromAxisAngle(up, s.ry);
      for (const [ox, oy, oz] of offsets) {
        pos.set(ox * scale, oy * scale, oz * scale).applyQuaternion(q).add({ x: s.x, y, z: s.z });
        mesh.setMatrixAt(i++, m4.compose(pos, q, one));
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  };
  for (const [w, h, d, lift, color] of PARTS) {
    const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshLambertMaterial({ color, flatShading: true }), spots.length);
    place(mesh, [[0, lift + h / 2, 0]]);
  }
  // 첨차 양끝과 살미 끝에 얹힌 소로들
  const soro = new THREE.InstancedMesh(new THREE.BoxGeometry(0.16, 0.1, 0.16), new THREE.MeshLambertMaterial({ color: SORO, flatShading: true }), spots.length * 6);
  place(soro, [[-0.4, 0.38, 0], [0.4, 0.38, 0], [-0.65, 0.54, 0], [0.65, 0.54, 0], [0, 0.4, -0.42], [0, 0.62, -0.6]]);
  return group;
}
