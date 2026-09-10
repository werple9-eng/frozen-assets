import test from 'node:test';
import assert from 'node:assert/strict';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { blockSpec } from '../lib/game/campaign-content';
import { IceField } from '../lib/game/ice';
import { CARGO_LAYOUT_VERSION, materialAt } from '../lib/game/ice-grid';

void test('all five Vault phases retain solidly packed cargo, constant spacing, budgets and their exact payout shares', () => {
  const phaseValues = [5500, 4840, 5500, 3960, 2200];
  const itemValues = [
    [367, 1466, 367, 1467, 366, 1467],
    [440, 1760, 440, 1760, 440],
    [367, 916, 1467, 917, 366, 1467],
    [396, 990, 1584, 990],
    [629, 1571, 0],
  ];
  const counts = [6, 5, 6, 4, 3];
  for (let phase = 0; phase < 5; phase++) {
    const field = campaignField(31, phase),
      items = campaignLoot(31, phase);
    const spec = blockSpec(31, 3).ice!.phases[phase];
    field.carveLoot(items);
    const solid = field.values.filter((v) => v > 0.5).length;
    assert.equal(field.grid.cellSize, 0.3);
    assert.equal(items.length, counts[phase]);
    assert.deepEqual(
      items.map((item) => item.value),
      itemValues[phase],
      'case geometry preserves every pre-existing reward allocation',
    );
    assert.equal(
      items.reduce((sum, item) => sum + item.value, 0),
      phaseValues[phase],
    );
    assert.ok(
      solid >= spec.targetSolidSamples.min * 0.88,
      `${phase}: ${solid}`,
    );
    assert.ok(
      solid <= spec.targetSolidSamples.max * 1.12,
      `${phase}: ${solid}`,
    );
    items.forEach((item, index) => {
      assert.equal(item.id, `v3-c31-${phase}-${item.story ? 'story' : index}`);
      assert.ok(field.solidIntersectionCount(item) > 0, item.id);
      assert.equal(field.exposure(item).exposed, 0, item.id);
      assert.equal(field.canRelease(item), false, item.id);
    });
    for (let a = 0; a < items.length; a++)
      for (let b = a + 1; b < items.length; b++) {
        const x = items[a],
          y = items[b];
        assert.ok(
          Math.abs(x.x - y.x) > (x.w + y.w) / 2 + 0.51 ||
            Math.abs(x.y - y.y) > (x.h + y.h) / 2 + 0.51 ||
            Math.abs(x.z - y.z) > (x.d + y.d) / 2 + 0.51,
          `${x.id} and ${y.id} must have separate carved cavities`,
        );
      }
    assert.deepEqual(
      items,
      campaignLoot(31, phase),
      'cargo generation remains deterministic',
    );
  }
});

void test('Vault custody cases use visible case variants and the final Ledger has a full folio silhouette', () => {
  let cases = 0;
  for (let phase = 0; phase < 5; phase++)
    for (const item of campaignLoot(31, phase)) {
      if (!item.story && item.kind !== 'coin') {
        cases++;
        assert.equal(item.w, 1.3);
        assert.equal(item.d, 0.85);
        assert.equal(item.variant, item.kind === 'cash' ? 4 : 5);
        assert.match(item.name!, /case$/);
      } else if (item.kind === 'coin') assert.equal(item.w, 0.54);
      if (item.story === 'ledger')
        assert.deepEqual([item.w, item.h, item.d], [2.6, 0.4, 1.8]);
    }
  assert.equal(cases, 13);
});

void test('the larger precision cradle uses real dense/clear ice while remaining smaller than every earlier Vault phase', () => {
  const specs = blockSpec(31, 3).ice!.phases,
    cradle = specs[4];
  for (const earlier of specs.slice(0, 4))
    for (const axis of ['width', 'height', 'depth'] as const)
      assert.ok(cradle.dimensions[axis] < earlier.dimensions[axis]);
  const field = campaignField(31, 4);
  field.carveLoot(campaignLoot(31, 4));
  const materials = field.materialCounts();
  assert.ok(
    field.remaining() > 10000,
    'larger dimensions add actual occupied samples',
  );
  assert.ok(materials.dense / field.remaining() > 0.85);
  assert.ok(materials.clear / field.remaining() > 0.08);
  const prior = campaignField(31, 3);
  prior.carveLoot(campaignLoot(31, 3));
  assert.ok(field.remaining() < prior.remaining());
  assert.equal(materials.reinforced + materials.service + materials.brittle, 0);
  // The P5-only revision must not regenerate ice in an existing P1-P4 save.
  ['ice-e67e3c21', 'ice-a5b0d539', 'ice-db7848d0', 'ice-25c6a875'].forEach(
    (hash, phase) =>
      assert.equal(campaignField(31, phase).grid.layoutHash, hash),
  );
});

void test('the compression seam and lower rear Ledger compartment physically contain their cargo in dense ice', () => {
  const seam = blockSpec(31, 3).ice!.phases[1];
  for (const item of campaignLoot(31, 1)) {
    assert.ok(
      Math.abs(item.x) + item.w / 2 + 0.255 <= seam.dimensions.width * 0.21,
    );
    assert.equal(materialAt(seam, item), 2, item.id);
  }
  const cradle = blockSpec(31, 3).ice!.phases[4],
    items = campaignLoot(31, 4);
  const ledger = items.find((item) => item.story === 'ledger')!;
  assert.ok(Math.abs(ledger.x) <= 0.151 && ledger.z < -0.29);
  assert.equal(materialAt(cradle, ledger), 2);
  assert.equal(ledger.value, 0);
  assert.ok(items[0].x < ledger.x && items[1].x > ledger.x);
  assert.ok(items.slice(0, 2).every((item) => item.y - ledger.y >= 1.49));
});

void test('lattice and service compartments alternate depth and use additional real front ice', () => {
  for (const phase of [2, 3]) {
    const spec = blockSpec(31, 3).ice!.phases[phase],
      field = campaignField(31, phase);
    const original = new IceField(31, undefined, undefined, {
      ...spec,
      archiveRecess: undefined,
    });
    const items = campaignLoot(31, phase);
    assert.equal(items.filter((item) => item.z > 0.3).length, items.length / 2);
    assert.equal(
      items.filter((item) => item.z < -0.3).length,
      items.length / 2,
    );
    const added = field.values.filter(
      (v, i) => v > 0.5 && original.values[i] <= 0.5,
    ).length;
    assert.ok(
      added >= 1400,
      `phase ${phase + 1} adds ${added} actual front samples`,
    );
    assert.deepEqual(
      field.points,
      original.points,
      'no larger cells or changed dimensions',
    );
    assert.notEqual(field.grid.layoutHash, original.grid.layoutHash);
  }
});

void test('clearing a Vault object cavity and its surrounding ice releases it immediately while other ice remains', () => {
  for (let phase = 0; phase < 5; phase++) {
    const field = campaignField(31, phase),
      items = campaignLoot(31, phase);
    field.carveLoot(items);
    const item = items.find((t) => t.story === 'ledger') ?? items[0];
    for (let i = 0; i < field.points.length; i++) {
      const p = field.points[i];
      if (
        Math.abs(p.x - item.x) <= item.w / 2 + 0.9 &&
        Math.abs(p.y - item.y) <= item.h / 2 + 0.9 &&
        Math.abs(p.z - item.z) <= item.d / 2 + 0.9
      ) {
        field.values[i] = 0;
        field.markSampleChanged(i);
      }
    }
    assert.equal(field.canRelease(item), true, item.id);
    assert.ok(
      field.values.some((v) => v > 0.5),
      'no all-ice completion requirement',
    );
  }
});

void test('the Vault cargo revision leaves unrelated active-field save hashes unchanged', () => {
  assert.equal(CARGO_LAYOUT_VERSION, 6);
  // Recorded immediately before the Vault-only revision; these identities protect
  // existing first delivery, Ring, D19 and pre-Vault campaign saves from resets.
  for (const [block, hash] of [
    [0, 'ice-04b58650'],
    [7, 'ice-1497566e'],
    [18, 'ice-91d53679'],
    [30, 'ice-542622b3'],
  ] as const)
    assert.equal(campaignField(block, 0).grid.layoutHash, hash);
  for (let phase = 0; phase < 5; phase++)
    assert.equal(
      blockSpec(31, 3).ice!.phases[phase].cargoLayoutVersion,
      phase === 4 ? 6 : 4,
    );
});
