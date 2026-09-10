import test from 'node:test';
import assert from 'node:assert/strict';
import { IceField } from '../lib/game/ice';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { applyImpactCondition } from '../lib/game/condition';
import { BLOCKS } from '../lib/game/campaign-content';
import type { Loot } from '../lib/game/tuning';

function pocket() {
  const field = new IceField(0, undefined, undefined, {
    profile: 'parcel',
    dimensions: { width: 6, height: 4, depth: 5 },
    deliveryId: 'sealed-test',
    phaseId: 'one',
  });
  const item: Loot = {
    id: 'cash',
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
  field.carveLoot([item], true);
  return { field, item };
}
const strike = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };

void test('a sealed internal pocket contributes no outside exposure or collateral activation', () => {
  const { field, item } = pocket();
  assert.equal(field.solidIntersectionCount(item), 0);
  assert.equal(field.density(item), 0, 'the actual object cavity contains air');
  assert.equal(field.canRelease(item), false);
  assert.deepEqual(field.exposure(item), { exposed: 0, topCover: 1 });
  const result = applyImpactCondition(item, {
    tool: 'sledge',
    point: item,
    radius: 3,
    effectiveForce: 6,
    expectedStageForce: 4,
    exposure: field.exposure(item).exposed,
    dt: 0.05,
  });
  assert.equal(result.activated, false);
  assert.equal(result.loss, 0);
  assert.equal(item.condition, 100);
});

void test('opening the front of a pocket creates outside exposure and activates condition only after the real ice is removed', () => {
  const { field, item } = pocket();
  const first = field.exposure(item);
  assert.equal(
    field.exposure(item),
    first,
    'unchanged geometry reuses its per-loot cached result',
  );
  for (let z = 2.55; z >= 0.25; z -= 0.25)
    field.strikeAt({ x: 0, y: item.y, z }, 4, 0.72, strike, {
      x: 0,
      y: 0,
      z: 1,
    });
  const opened = field.exposure(item);
  assert.notEqual(
    opened,
    first,
    'a field revision invalidates the exposure result',
  );
  assert.ok(opened.exposed >= 0.2, `front opening exposes ${opened.exposed}`);
  assert.equal(opened.topCover, 1, 'the unopened roof still covers the object');
  const result = applyImpactCondition(item, {
    tool: 'hand',
    point: { ...item, z: item.z + item.d / 2 + 0.12 },
    radius: 0.5,
    effectiveForce: 1.4,
    expectedStageForce: 1.4,
    exposure: opened.exposed,
    dt: 0.05,
  });
  assert.equal(result.activated, true);
  assert.ok(result.loss > 0);
});

void test('removing distant ice cannot expose a sealed object and item movement invalidates its cached probes', () => {
  const { field, item } = pocket();
  field.strikeAt({ x: 2.7, y: 3.6, z: 2.2 }, 8, 0.55, strike, {
    x: 0,
    y: 0,
    z: 1,
  });
  assert.equal(field.exposure(item).exposed, 0);
  item.x = 10;
  assert.equal(field.exposure(item).exposed, 1);
});

void test('all authored deliveries begin with hidden cargo packed into solid ice held by actual ice', () => {
  for (let block = 0; block < BLOCKS.length; block++)
    for (let phase = 0; phase < BLOCKS[block].phases; phase++) {
      const field = campaignField(block, phase, undefined, 3),
        items = campaignLoot(block, phase, 3);
      field.carveLoot(items);
      for (const item of items) {
        assert.ok(field.solidIntersectionCount(item) > 0, item.id);
        assert.equal(field.canRelease(item), false, item.id);
        assert.equal(
          field.exposure(item).exposed,
          0,
          `${item.id} should begin inside sealed custody`,
        );
      }
      for (let a = 0; a < items.length; a++)
        for (let b = a + 1; b < items.length; b++) {
          const x = items[a],
            y = items[b];
          assert.ok(
            Math.abs(x.x - y.x) >= (x.w + y.w) / 2 ||
              Math.abs(x.y - y.y) >= (x.h + y.h) / 2 ||
              Math.abs(x.z - y.z) >= (x.d + y.d) / 2,
            `${x.id} overlaps ${y.id}`,
          );
        }
    }
});

void test('early cargo leaves useful ice beyond the carved pocket on every axis', () => {
  for (const block of [0, 1, 2]) {
    const field = campaignField(block, 0, undefined, 3),
      items = campaignLoot(block, 0, 3);
    for (const item of items)
      for (const [axis, half] of [
        ['x', item.w / 2],
        ['y', item.h / 2],
        ['z', item.d / 2],
      ] as const)
        for (const sign of [-1, 1]) {
          const point = { x: item.x, y: item.y, z: item.z };
          point[axis] += sign * (half + field.grid.cellSize * 0.85 + 0.4);
          assert.ok(
            field.density(point, true) > 0.5,
            `${item.id} lacks 0.4 units of ${sign > 0 ? '+' : '-'}${axis} cover beyond its cavity`,
          );
        }
  }
});
