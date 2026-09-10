import test from 'node:test';
import assert from 'node:assert/strict';
import { BLOCKS, blockSpec } from '../lib/game/campaign-content';
import { Campaign } from '../lib/game/campaign';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { evaluateContract } from '../lib/game/contracts';
import {
  recoveryContract,
  type RecoveryContract,
} from '../lib/game/major-campaign';
import { legacyCargoLoot } from '../lib/game/legacy-cargo';

void test('authored phase pools pay the exact net schedule through actual cumulative commission rounding', () => {
  for (let block = 0; block < 67; block++) {
    const b = blockSpec(block, 3),
      c = new Campaign();
    c.state.blockRate = block === 31 ? 0 : block >= 17 ? 8 : 12;
    let net = 0,
      gross = 0;
    for (let phase = 0; phase < b.phases; phase++)
      for (const t of campaignLoot(block, phase))
        if (!t.story) {
          gross += t.value;
          net += c.credit(t.value, t.id);
          assert.equal(
            c.credit(t.value, t.id),
            0,
            'each payment identity is single-use',
          );
        }
    assert.equal(
      gross,
      b.baseGross,
      `delivery ${block + 1}: phases must divide the pool`,
    );
    assert.equal(
      net,
      b.baseNet,
      `delivery ${block + 1}: net schedule is after commission`,
    );
    assert.equal(
      c.state.netEarned + c.state.commissionPaid,
      c.state.grossEarned,
    );
  }
});

void test('per-phase active targets partition their authored delivery and large grids retain bounded typed storage', () => {
  let phases = 0;
  for (const [block, b] of BLOCKS.entries()) {
    let min = 0,
      max = 0;
    for (const [phase, p] of b.ice!.phases.entries()) {
      min += p.targetActiveSeconds.min;
      max += p.targetActiveSeconds.max;
      phases++;
      const field = campaignField(block, phase);
      assert.ok(field.values.length <= 30000);
      assert.ok(
        field.values.length * 14 < 512 * 1024,
        'density, warmth, material, visited and connectivity queue fit the typed-buffer budget',
      );
    }
    assert.ok(Math.abs(min - b.targetActiveSeconds!.min) < 1e-6);
    assert.ok(Math.abs(max - b.targetActiveSeconds!.max) < 1e-6);
  }
  assert.equal(phases, 69);
});

void test('early archive and estate lessons reserve reinforcement for their small divider and wing anchors', () => {
  for (const [block, min, max] of [
    [4, 0.04, 0.18],
    [7, 0.015, 0.15],
  ]) {
    const field = campaignField(block);
    field.carveLoot(campaignLoot(block));
    const materials = field.materialCounts(),
      total = field.remaining();
    assert.ok(
      materials.reinforced / total >= min &&
        materials.reinforced / total <= max,
      `D${block + 1}: ${materials.reinforced}/${total}`,
    );
    if (block === 4) assert.ok(materials.clear / total > 0.8);
    else
      assert.ok(
        materials.brittle / total > 0.45 && materials.clear / total > 0.2,
      );
  }
});

void test('all historical cargo phases preserve identities with packed ice and releasable rewards', () => {
  for (const sourceLayoutVersion of [1, 2] as const)
    for (let block = 0; block < 32; block++)
      for (
        let sourcePhase = 0;
        sourcePhase < blockSpec(block, sourceLayoutVersion).phases;
        sourcePhase++
      ) {
        const old = campaignLoot(block, sourcePhase, sourceLayoutVersion);
        const phase = old.some((t) => t.story === 'ledger')
          ? 4
          : Math.min(sourcePhase, blockSpec(block, 3).phases - 1);
        const loot = legacyCargoLoot({
          block,
          phase,
          sourcePhase,
          sourceLayoutVersion,
          repacked: true,
        });
        const field = campaignField(block, phase);
        field.carveLoot(loot);
        for (const t of loot) {
          assert.ok(
            field.solidIntersectionCount(t) > 0,
            `overlap ${sourceLayoutVersion}:${block}:${sourcePhase}:${t.id}`,
          );
        }
        assert.deepEqual(
          loot.slice(0, old.length).map((t) => [t.id, t.value]),
          old.map((t) => [t.id, t.value]),
        );
        // Historical repacks can expose a pocket at the parcel edge. Those
        // unsupported objects must recover, rather than stay invisibly locked.
        // Every remaining object must also release when its ice is removed.
        field.values.fill(0);
        field.revision++;
        for (const t of loot) assert.equal(field.canRelease(t), true, t.id);
      }
});

void test('optional contract boundaries use measured work and malformed or absent statistics cannot award a bonus', () => {
  const contract = (
    kind: RecoveryContract['objective']['kind'],
  ): RecoveryContract => ({
    archetype: 'mixed-custody',
    objective: { kind, bonus: 500, count: 3, seconds: 120 },
  });
  assert.equal(evaluateContract(contract('rush'), { seconds: 120 }).bonus, 500);
  assert.equal(
    evaluateContract(contract('rush'), { seconds: 120.01 }).bonus,
    0,
  );
  assert.equal(
    evaluateContract(contract('precision'), {
      seconds: 30,
      economicFinds: 2,
      lowestCondition: 75,
    }).bonus,
    500,
  );
  assert.equal(
    evaluateContract(contract('precision'), {
      seconds: 30,
      economicFinds: 2,
      lowestCondition: 74.99,
    }).bonus,
    0,
  );
  assert.equal(
    evaluateContract(contract('bulk'), {
      seconds: 30,
      initialSolid: 1000,
      remainingSolid: 200,
    }).bonus,
    500,
  );
  assert.equal(
    evaluateContract(contract('bulk'), {
      seconds: 30,
      initialSolid: 1000,
      remainingSolid: 201,
    }).bonus,
    0,
  );
  assert.equal(
    evaluateContract(contract('pristine'), { seconds: 30, pristine: 3 }).bonus,
    500,
  );
  assert.equal(
    evaluateContract(contract('pristine'), { seconds: 30, pristine: 2 }).bonus,
    0,
  );
  assert.equal(
    evaluateContract(contract('noThermal'), { seconds: 30, thermalSeconds: 0 })
      .bonus,
    500,
  );
  assert.equal(
    evaluateContract(contract('noThermal'), {
      seconds: 30,
      thermalSeconds: 0.0001,
    }).bonus,
    0,
  );
  for (const value of [NaN, Infinity, -1]) {
    assert.equal(
      evaluateContract(contract('rush'), { seconds: value }).bonus,
      0,
    );
    assert.equal(
      evaluateContract(contract('bulk'), {
        seconds: 30,
        initialSolid: 1000,
        remainingSolid: value,
      }).bonus,
      0,
    );
    assert.equal(
      evaluateContract(contract('pristine'), { seconds: 30, pristine: value })
        .bonus,
      0,
    );
    assert.equal(
      evaluateContract(contract('precision'), {
        seconds: 30,
        economicFinds: 2,
        lowestCondition: value,
      }).bonus,
      0,
    );
    assert.equal(
      evaluateContract(contract('noThermal'), {
        seconds: 30,
        thermalSeconds: value,
      }).bonus,
      0,
    );
  }
  assert.equal(
    evaluateContract(contract('precision'), { seconds: 30, economicFinds: 2 })
      .bonus,
    0,
  );
  assert.equal(
    evaluateContract(contract('noThermal'), { seconds: 30 }).bonus,
    0,
  );
  assert.equal(
    new Set(
      Array.from(
        { length: 5 },
        (_, i) => recoveryContract(32 + i).contract!.archetype,
      ),
    ).size,
    5,
  );
});
