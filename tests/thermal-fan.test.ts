import test from 'node:test';
import assert from 'node:assert/strict';
import { IceField, type MeltBrush } from '../lib/game/ice';
import { GameModel } from '../lib/game/model';
import { THERMAL_FAN_DEPTH_SCALE } from '../lib/game/tool-footprints';

function field() {
  return new IceField(0, undefined, undefined, {
    profile: 'parcel',
    dimensions: { width: 8, height: 6, depth: 8 },
    deliveryId: 'fan-test',
    phaseId: 'one',
  });
}

void test('Fan spans more of a face than Precision but leaves deeper ice untouched', () => {
  for (const axis of ['x', 'z'] as const) {
    const precision = field(),
      fan = field();
    const xyz = { x: 14, y: 11, z: 14 };
    const point = { ...fan.points[fan.index(xyz.x, xyz.y, xyz.z)] };
    point[axis] -= 0.15;
    const normal = { x: axis === 'x' ? 1 : 0, y: 0, z: axis === 'z' ? 1 : 0 };
    precision.melt(point, 0.1, 1, 0.85);
    fan.melt(point, 0.1, 1, 0.85 * 1.625, 0, {
      normal,
      depthScale: THERMAL_FAN_DEPTH_SCALE,
    });
    const lateral = { ...xyz },
      deep = { ...xyz };
    lateral[axis === 'x' ? 'z' : 'x'] += 4;
    deep[axis] += 2;
    // 1.2 units sideways lies outside Precision and inside the Fan.
    const sideIndex = fan.index(lateral.x, lateral.y, lateral.z);
    assert.equal(precision.values[sideIndex], 1);
    assert.ok(fan.values[sideIndex] < 1);
    // At 0.75 units Precision reaches real ice that the Fan leaves untouched.
    const nearIndex = fan.index(deep.x, deep.y, deep.z);
    assert.ok(precision.values[nearIndex] < fan.values[nearIndex]);
    assert.equal(fan.values[nearIndex], 1);
    // 1.05 units is outside either working depth but within Fan's lateral radius.
    deep[axis]++;
    const farIndex = fan.index(deep.x, deep.y, deep.z);
    assert.equal(fan.values[farIndex], 1);
    const sphere = field();
    sphere.melt(point, 0.1, 1, 0.85 * 1.625);
    assert.ok(
      sphere.values[farIndex] < 1,
      'the old spherical Fan incorrectly reached this deep sample',
    );
    assert.ok(fan.dirtyChunks.size > 0);
    assert.ok(fan.metrics.thermalRemoved > 0);
  }
});

void test('surface orientation is normalized and legacy spherical tools and stored afterheat remain unchanged', () => {
  const a = field(),
    b = field();
  const point = a.points[a.index(14, 11, 14)];
  a.melt(point, 0.1, 1, 1.4, 0, {
    normal: { x: 0, y: 0, z: 1 },
    depthScale: 0.45,
  });
  b.melt(point, 0.1, 1, 1.4, 0, {
    normal: { x: 0, y: 0, z: 7 },
    depthScale: 0.45,
  });
  assert.deepEqual(a.values, b.values);
  const legacy = new IceField(),
    spherical = new IceField();
  const legacyPoint = { x: 0, y: 1.7, z: 0.9 };
  legacy.melt(legacyPoint, 0.1, 1, 1.4, 0, {
    normal: { x: 0, y: 0, z: 1 },
    depthScale: 0.45,
  });
  spherical.melt(legacyPoint, 0.1, 1, 1.4);
  assert.deepEqual(legacy.values, spherical.values);
  assert.deepEqual(legacy.warmth, spherical.warmth);
  const warmA = field(),
    warmB = field();
  warmA.melt(point, 0.1, 1, 1.4);
  warmB.melt(point, 0.1, 1, 1.4);
  warmA.melt(null, 0.1, 0, 1.4, 0.5, {
    normal: { x: 0, y: 0, z: 1 },
    depthScale: 0.45,
  });
  warmB.melt(null, 0.1, 0, 1.4, 0.5);
  assert.deepEqual(warmA.values, warmB.values);
  assert.deepEqual(warmA.warmth, warmB.warmth);
});

void test('active new-grid Fan supplies its surface brush while Precision and delayed echoes retain their original shape', () => {
  const model = new GameModel(undefined, { legacy: true });
  model.field = field();
  const calls: (MeltBrush | undefined)[] = [];
  const melt = model.field.melt.bind(model.field);
  model.field.melt = (...args) => {
    calls.push(args[5]);
    return melt(...args);
  };
  const hit = { x: 0, y: 3, z: 4 };
  model.mode = 'wide';
  model.firing = true;
  model.update(0.05, hit);
  assert.equal(calls[0]?.depthScale, THERMAL_FAN_DEPTH_SCALE);
  assert.ok(calls[0]!.normal.z > 0.9);
  calls.length = 0;
  model.mode = 'precision';
  model.firing = true;
  model.update(0.05, hit);
  assert.ok(calls.length > 0);
  assert.ok(calls.every((brush) => brush === undefined));
  calls.length = 0;
  model.stop();
  model.echoes.push({ point: hit, time: 0.01, power: 1, radius: 1 });
  model.update(0.05, null);
  assert.equal(calls.length, 1);
  assert.equal(calls[0], undefined);
});

void test('a held Fan contact stays shallow after its original density gradient melts away', () => {
  const model = new GameModel(undefined, { legacy: true });
  model.field = field();
  model.mode = 'wide';
  model.firing = true;
  const hit = { x: 0, y: 3, z: 4 };
  assert.ok(model.field.surfaceNormal(hit).z > 0.9);
  const far = model.field.points.findIndex(
    (p) =>
      Math.abs(p.x) < 0.16 &&
      Math.abs(p.y - 3) < 0.16 &&
      Math.abs(p.z - 3) < 0.16,
  );
  assert.ok(far >= 0);
  assert.equal(model.field.values[far], 1);
  let clearedGradient = false;
  for (let i = 0; i < 400; i++) {
    model.update(0.05, hit);
    const normal = model.field.surfaceNormal(hit);
    if (Math.hypot(normal.x, normal.y, normal.z) < 1e-8) clearedGradient = true;
  }
  assert.equal(
    clearedGradient,
    true,
    'real excavation must empty the sampled gradient',
  );
  assert.equal(
    model.field.values[far],
    1,
    'holding over empty surface must not expand Fan into a sphere',
  );
});

void test('Fan orientation resets on new contact, field, stop and loss of contact without a spherical fallback', () => {
  for (const reset of ['contact', 'field', 'stop', 'no-hit'] as const) {
    const model = new GameModel(undefined, { legacy: true });
    model.field = field();
    model.mode = 'wide';
    model.firing = true;
    let hit = { x: 0, y: 3, z: 4 };
    model.update(0.05, hit);
    if (reset === 'contact') hit = { x: 0, y: 3, z: 0 };
    else if (reset === 'field') {
      model.field = new IceField(0, undefined, undefined, {
        profile: 'parcel',
        dimensions: { width: 8, height: 6, depth: 12 },
        deliveryId: 'changed-fan-field',
        phaseId: 'two',
      });
    } else {
      // Actual shallow excavation empties the old gradient; the mesh/ray can
      // still briefly name that point after release or pointer loss.
      for (let i = 0; i < 400; i++) model.update(0.05, hit);
      if (reset === 'stop') model.stop();
      else model.update(0.05, null);
      model.firing = true;
    }
    const normal = model.field.surfaceNormal(hit);
    assert.ok(Math.hypot(normal.x, normal.y, normal.z) < 1e-8, reset);
    const before = model.field.values.slice();
    const directContacts: unknown[] = [];
    const melt = model.field.melt.bind(model.field);
    model.field.melt = (...args) => {
      directContacts.push(args[0]);
      return melt(...args);
    };
    model.update(0.05, hit);
    assert.ok(directContacts.length > 0, reset);
    assert.ok(
      directContacts.every((point) => point === null),
      `${reset}: unorientable contact cannot reuse an unrelated normal`,
    );
    assert.deepEqual(model.field.values, before, reset);
  }
});
