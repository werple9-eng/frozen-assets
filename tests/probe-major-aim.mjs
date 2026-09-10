import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import * as THREE from 'three';

const require = createRequire(import.meta.url);
const {
  IceField,
  surface,
} = require('../qa-artifacts/major-sim-build/lib/game/ice.js');
const {
  conditionRisk,
  distanceToLoot,
  applyImpactCondition,
} = require('../qa-artifacts/major-sim-build/lib/game/condition.js');
const strike = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };
const item = {
  id: 'fixture-cash',
  kind: 'cash',
  value: 200,
  x: 0,
  y: 1.68,
  z: 0,
  w: 0.78,
  h: 0.22,
  d: 0.48,
  state: 'embedded',
  age: 0,
  vy: 0,
  credited: false,
};
const field = new IceField(0, undefined, undefined, {
  profile: 'parcel',
  dimensions: { width: 6, height: 4, depth: 5 },
  deliveryId: 'aim-probe',
  phaseId: 'one',
});
field.carveLoot([item]);
// Open a real front tunnel with strikes; the remaining pocket walls still
// physically hold the cash. This fixture never changes a user's campaign.
for (let z = 2.55; z >= 0.25; z -= 0.25)
  field.strikeAt({ x: 0, y: item.y, z }, 4, 0.72, strike, { x: 0, y: 0, z: 1 });
let exposure = field.exposure(item).exposed;
const data = surface(field),
  geometry = new THREE.BufferGeometry();
geometry.setAttribute(
  'position',
  new THREE.Float32BufferAttribute(data.positions, 3),
);
const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
);
mesh.updateMatrixWorld();
const direction = new THREE.Vector3(0, -0.43, -1).normalize(),
  right = new THREE.Vector3(1, 0, 0);
const up = new THREE.Vector3().crossVectors(right, direction).normalize();
const box = new THREE.Box3(
  new THREE.Vector3(
    item.x - item.w / 2,
    item.y - item.h / 2,
    item.z - item.d / 2,
  ),
  new THREE.Vector3(
    item.x + item.w / 2,
    item.y + item.h / 2,
    item.z + item.d / 2,
  ),
);
let nearest = null,
  nearestDistance = Infinity;
const findNearest = () => {
  nearest = null;
  nearestDistance = Infinity;
  for (let i = 0; i < field.values.length; i++)
    if (field.values[i] > 0.5) {
      const p = field.points[i];
      const nearSupport =
        p.y <= item.y + item.h / 2 &&
        Math.abs(p.x - item.x) < item.w / 2 + 0.6 &&
        Math.abs(p.z - item.z) < item.d / 2 + 0.6;
      const d =
        distanceToLoot(item, p) +
        Math.abs(p.y - (item.y - item.h / 2)) * 0.06 -
        (nearSupport ? 0.08 : 0);
      if (d < nearestDistance) {
        nearestDistance = d;
        nearest = p;
      }
    }
};
// Approach using the same first-surface ray as the campaign simulator, never
// applying an interior hit. Stop once the working face is beside the cash.
let approachStrikes = 0;
for (; approachStrikes < 200; approachStrikes++) {
  findNearest();
  const ray = new THREE.Raycaster(
    new THREE.Vector3(nearest.x, nearest.y, nearest.z).addScaledVector(
      direction,
      -100,
    ),
    direction,
  );
  const hit = ray.intersectObject(mesh, false)[0];
  if (!hit || distanceToLoot(item, hit.point) < 0.65) break;
  field.strikeAt(
    hit.point,
    1.4 * 1.3,
    0.34 * 1.12,
    strike,
    field.surfaceNormal(hit.point),
  );
  const next = surface(field);
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(next.positions, 3),
  );
  geometry.computeBoundingSphere();
}
exposure = field.exposure(item).exposed;
const records = [];
for (const radius of [0.34 * 1.12, 0.7 * 1.12])
  for (const a of [-1, -0.5, 0, 0.5, 1])
    for (const b of [-1, -0.5, 0, 0.5, 1]) {
      const target = new THREE.Vector3(nearest.x, nearest.y, nearest.z)
        .addScaledVector(right, a * radius)
        .addScaledVector(up, b * radius);
      const ray = new THREE.Raycaster(
        target.clone().addScaledVector(direction, -100),
        direction,
      );
      const hit = ray.intersectObject(mesh, false)[0];
      if (!hit) continue;
      const cargoHit = ray.ray.intersectBox(box, new THREE.Vector3());
      const occluded =
        !!cargoHit && cargoHit.distanceTo(ray.ray.origin) < hit.distance - 1e-4;
      const normal = field.surfaceNormal(hit.point),
        force = radius < 0.5 ? 1.4 * 1.3 : 2.8 * 1.3;
      let useful = 0,
        solid = 0;
      for (let i = 0; i < field.values.length; i++) {
        const value = field.values[i];
        if (value <= 0.5) continue;
        const p = field.points[i],
          d2 =
            (p.x - hit.point.x) ** 2 +
            (p.y - hit.point.y) ** 2 +
            (p.z - hit.point.z) ** 2;
        if (d2 >= radius * radius || distanceToLoot(item, p) > 0.6) continue;
        solid++;
        useful += Math.min(value - 0.5, force * (1 - d2 / (radius * radius)));
      }
      records.push({
        tool: radius < 0.5 ? 'hand' : 'heavy',
        a,
        b,
        point: hit.point.toArray(),
        normal,
        occluded,
        solid,
        useful,
        risk: conditionRisk(item, {
          tool: radius < 0.5 ? 'hand' : 'heavy',
          point: hit.point,
          radius,
          exposure,
        }),
      });
    }
const result = {
  fixture: 'Actually chipped open pocket',
  approachStrikes,
  exposure,
  stillCaptive: !field.canRelease(item),
  nearest,
  records,
  visibleUseful: records.filter((r) => !r.occluded && r.useful > 0),
  baseline: records.filter((r) => r.a === 0 && r.b === 0),
};
const verify = (record) => {
  const copy = new IceField(0, field.values, undefined, field.spec),
    cargo = { ...item };
  const point = new THREE.Vector3(...record.point),
    radius = 0.7 * 1.12;
  const change = applyImpactCondition(cargo, {
    tool: 'heavy',
    point,
    radius,
    effectiveForce: 2.8 * 1.3,
    expectedStageForce: 2.8 * 1.3,
    exposure,
    dt: 0.05,
  });
  copy.strikeAt(point, 2.8 * 1.3, radius, strike, copy.surfaceNormal(point));
  const cleared = copy.values.reduce(
    (sum, v, i) =>
      sum +
      (field.values[i] > 0.5 &&
      v <= 0.5 &&
      distanceToLoot(item, field.points[i]) <= 0.6
        ? 1
        : 0),
    0,
  );
  return { conditionLoss: change.loss, supportSamplesCleared: cleared };
};
result.actualComparison = {
  center: verify(
    records.find((r) => r.tool === 'heavy' && r.a === 0 && r.b === 0),
  ),
  offCenter: verify(
    records.find((r) => r.tool === 'heavy' && r.a === 1 && r.b === -1),
  ),
};
assert.ok(
  result.actualComparison.offCenter.conditionLoss <
    result.actualComparison.center.conditionLoss,
);
assert.ok(
  result.actualComparison.offCenter.supportSamplesCleared > 0,
  'The safer candidate must still remove real support ice',
);
writeFileSync(
  'qa-artifacts/major-off-center-aim-probe.json',
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify(
    {
      exposure,
      captive: result.stillCaptive,
      actualComparison: result.actualComparison,
      baseline: result.baseline,
      bestVisible: result.visibleUseful
        .sort(
          (a, b) => b.useful / (1 + 10 * b.risk) - a.useful / (1 + 10 * a.risk),
        )
        .slice(0, 8),
    },
    null,
    2,
  ),
);
geometry.dispose();
mesh.material.dispose();
