import * as THREE from 'three';
import type { Vec3 } from './tuning';

// Sample the authored reward mesh once, before presentation transforms. This
// avoids treating the empty corners of a coin, washer or ring as solid loot.
export function meshContactSamples(
  root: THREE.Object3D,
  spacing: number,
): Vec3[] {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const samples = new Map<string, Vec3>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const geometry = object.geometry,
      positions = geometry.getAttribute('position');
    if (!positions) return;
    const transform = new THREE.Matrix4().multiplyMatrices(
      inverse,
      object.matrixWorld,
    );
    const index = geometry.index,
      count = index?.count ?? positions.count;
    const read = (i: number) =>
      new THREE.Vector3()
        .fromBufferAttribute(positions, index ? index.getX(i) : i)
        .applyMatrix4(transform);
    for (let i = 0; i < count; i += 3) {
      const a = read(i),
        b = read(i + 1),
        c = read(i + 2);
      const divisions = Math.max(
        1,
        Math.ceil(
          Math.max(a.distanceTo(b), a.distanceTo(c), b.distanceTo(c)) / spacing,
        ),
      );
      for (let u = 0; u <= divisions; u++)
        for (let v = 0; v <= divisions - u; v++) {
          const p = a
            .clone()
            .multiplyScalar(1 - (u + v) / divisions)
            .addScaledVector(b, u / divisions)
            .addScaledVector(c, v / divisions);
          samples.set(`${p.x.toFixed(4)},${p.y.toFixed(4)},${p.z.toFixed(4)}`, {
            x: p.x,
            y: p.y,
            z: p.z,
          });
        }
    }
  });
  return [...samples.values()];
}
