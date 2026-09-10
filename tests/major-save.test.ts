import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { blockSpec, STORY } from '../lib/game/campaign-content';
import { applyImpactCondition, conditionValue } from '../lib/game/condition';

function delivery(model: GameModel, block: number, phase = 0, version = 3) {
  const state = model.campaign!.state;
  model.round = state.block = block;
  state.phase = phase;
  state.layoutVersion = version as 2 | 3;
  state.pending = [];
  state.call = undefined;
  model.field = campaignField(block, phase, undefined, version);
  model.loot = campaignLoot(block, phase, version);
  model.field.carveLoot(model.loot);
}
function partialCut(model: GameModel) {
  const sample = model.field.points.find(
    (_, i) => model.field.values[i] > 0.95,
  );
  assert.ok(sample);
  const before = model.field.values.reduce((sum, value) => sum + value, 0);
  model.field.strikeAt(
    sample,
    0.38,
    0.8,
    {
      center: 1,
      depth: 1,
      weak: 1,
      support: 1,
      detach: 1,
    },
    { x: 0, y: 0, z: -1 },
  );
  assert.ok(model.field.values.reduce((sum, value) => sum + value, 0) < before);
  assert.ok(model.field.values.some((value) => value > 0 && value < 0.99));
}
function quantized(values: Float32Array) {
  return Float32Array.from(
    values,
    (value) => (value === 0.5 ? 127 : Math.round(value * 255)) / 255,
  );
}
function assertMetadata(
  actual: GameModel,
  expected: GameModel,
  migratedLayout?: 3,
) {
  assert.equal(actual.saveStatus, 'saved');
  assert.equal(actual.round, expected.round);
  assert.equal(actual.money, expected.money);
  assert.equal(actual.earned, expected.earned);
  assert.equal(actual.recovered, expected.recovered);
  assert.deepEqual(actual.nodes, expected.nodes);
  assert.deepEqual(actual.toolUpgrades, expected.toolUpgrades);
  assert.deepEqual(
    actual.campaign!.state,
    migratedLayout
      ? { ...expected.campaign!.state, layoutVersion: migratedLayout }
      : expected.campaign!.state,
  );
  assert.deepEqual(
    actual.loot.map((item) => [item.id, item.credited]),
    expected.loot.map((item) => [item.id, item.credited]),
  );
}
function progressFixture(version = 3) {
  const model = new GameModel();
  delivery(model, 4, 0, version);
  const c = model.campaign!;
  model.money += c.credit(5000, 'prior-delivery:banked');
  model.earned += 5000;
  c.state.blockGross = c.state.blockFee = 0;
  assert.equal(model.purchaseNode('HC-P1', 1000), true);
  const reward = model.loot.find((item) => !item.story)!;
  assert.equal(model.credit(reward), true);
  reward.state = 'collected';
  c.collect('tag');
  assert.equal(c.deliver(), 'ch1.tag');
  model.answerPhone();
  assert.equal(model.advanceCall(), true);
  assert.equal(c.state.call?.line, 1);
  partialCut(model);
  return model;
}

void test('Mercer and Tony must finish their inner-vault calls before a held strike can edit the archive', () => {
  const model = new GameModel();
  delivery(model, 31, 2);
  const c = model.campaign!;
  c.trigger('FINAL_LAYER_OPENED');
  const before = model.field.values.slice();
  const activeSeconds = model.deliveryStats.seconds;
  const hit = model.field.points.find(
    (_, index) => model.field.values[index] > 0.95,
  )!;
  for (const event of ['mercer.offer', 'tony.mercer.offer']) {
    model.press();
    model.update(0.05, hit);
    assert.equal(c.state.call?.event, event);
    assert.equal(model.firing, false);
    assert.equal(model.strike.active, false);
    assert.equal(model.deliveryStats.seconds, activeSeconds);
    assert.deepEqual(model.field.values, before);
    model.answerPhone();
    while (c.state.call?.event === event)
      assert.equal(model.advanceCall(), true);
  }
  model.press();
  for (let frame = 0; frame < 90; frame++) model.update(1 / 60, hit);
  assert.ok(model.field.values.some((value, index) => value < before[index]));
  assert.ok(c.state.read.includes('mercer.offer'));
  assert.ok(c.state.read.includes('tony.mercer.offer'));
});

void test('v5 stores compact field metadata and restores a partial cut within one byte of density', () => {
  const model = progressFixture();
  const raw = JSON.parse(model.serialize());
  assert.equal(raw.version, 5);
  assert.equal(raw.ice, undefined);
  assert.equal(raw.field.encoding, 'u8-rle-base64');
  assert.equal(raw.field.deliveryId, model.fieldIdentity.deliveryId);
  assert.equal(raw.field.layoutHash, model.field.grid.layoutHash);
  const loaded = new GameModel(JSON.stringify(raw));
  assertMetadata(loaded, model);
  assert.deepEqual(loaded.field.values, quantized(model.field.values));
  const maxError = model.field.values.reduce(
    (max, value, i) => Math.max(max, Math.abs(value - loaded.field.values[i])),
    0,
  );
  assert.ok(maxError <= 0.002, `Density quantization error was ${maxError}`);
  assert.equal(loaded.saveDiagnostics.length, 0);
  assert.equal(
    loaded.credit(loaded.loot.find((item) => item.credited)!),
    false,
  );
});

void test('ten v5 save cycles are density-idempotent after the first quantization and preserve all progress', () => {
  const source = progressFixture();
  const first = JSON.parse(source.serialize()).field;
  let loaded = source;
  for (let cycle = 0; cycle < 10; cycle++) {
    loaded = new GameModel(loaded.serialize());
    assertMetadata(loaded, source);
    assert.equal(loaded.saveDiagnostics.length, 0);
    assert.deepEqual(loaded.field.values, quantized(source.field.values));
    assert.deepEqual(JSON.parse(loaded.serialize()).field, first);
  }
});

void test('corrupt v5 field data regenerates only the current ice and preserves funds, fittings, evidence, calls and paid rewards', () => {
  const source = progressFixture();
  const pristine = campaignField(source.round, 0, undefined, 3);
  pristine.carveLoot(campaignLoot(source.round, 0, 3));
  const damaged = JSON.parse(source.serialize());
  const mutations = [
    (field: typeof damaged.field) => {
      field.density = field.density.slice(0, -4);
    },
    (field: typeof damaged.field) => {
      field.layoutHash = 'different-layout';
    },
    (field: typeof damaged.field) => {
      field.nx = 2_000_000_000;
    },
    (field: typeof damaged.field) => {
      field.payloadChecksum = 'fnv1a-00000000';
    },
  ];
  for (const mutate of mutations) {
    const raw = JSON.parse(source.serialize());
    mutate(raw.field);
    const loaded = new GameModel(JSON.stringify(raw));
    assertMetadata(loaded, source);
    assert.equal(loaded.saveDiagnostics.length, 1);
    assert.match(loaded.saveDiagnostics[0], /Current delivery regenerated/);
    assert.deepEqual(loaded.field.values, pristine.values);
    assert.notDeepEqual(loaded.field.values, source.field.values);
    const wallet = loaded.money;
    assert.equal(
      loaded.credit(loaded.loot.find((item) => item.credited)!),
      false,
    );
    assert.equal(loaded.money, wallet);
    assert.equal(
      loaded.campaign!.state.rewards.filter(
        (id) => id === 'prior-delivery:banked',
      ).length,
      1,
    );
    const next = new GameModel(loaded.serialize());
    assertMetadata(next, loaded);
    assert.equal(next.saveDiagnostics.length, 0);
  }
});

void test('an incompatible v4 layout2 fixture enters the new grid while preserving its account and paid cargo identities', () => {
  const source = progressFixture(2);
  assert.equal(source.field.values.length, 23 * 14 * 15);
  const raw = JSON.parse(source.serialize());
  raw.version = 4;
  raw.campaign.layoutVersion = 2;
  raw.ice = Array.from(source.field.values);
  delete raw.field;
  const loaded = new GameModel(JSON.stringify(raw));
  assertMetadata(loaded, source, 3);
  assert.equal(loaded.campaign!.state.layoutVersion, 3);
  assert.equal(loaded.field.grid.legacy, false);
  assert.notEqual(loaded.field.values.length, source.field.values.length);
  assert.deepEqual(
    loaded.loot.map((item) => [item.id, item.value]),
    source.loot.map((item) => [item.id, item.value]),
  );
  assert.equal(loaded.saveDiagnostics.length, 1);
  assert.match(
    loaded.saveDiagnostics[0],
    /Current delivery regenerated during legacy migration/,
  );
  assert.equal(JSON.parse(loaded.serialize()).legacyCargo.repacked, true);
  const v5 = new GameModel(loaded.serialize());
  assertMetadata(v5, loaded);
  assert.deepEqual(v5.field.values, quantized(loaded.field.values));
});

void test('condition freezes at physical release, keeps the authored base, and reload cannot re-award or forge its bonus', () => {
  const model = new GameModel();
  model.campaign!.state.pending = [];
  assert.equal(model.qualityEnabled, true);
  const reward = model.loot.find((item) => !item.story)!;
  reward.condition = 82;
  reward.conditionActive = true;
  const base = reward.value;
  model.field.values.fill(0);
  model.field.dirty = true;
  model.update(1 / 60, null);
  assert.equal(reward.state, 'freed');
  assert.equal(reward.conditionLocked, true);
  assert.equal(reward.finalCondition, 82);
  assert.equal(reward.finalGrade, 'CLEAN');
  assert.equal(reward.value, base);
  assert.equal(reward.finalValue, conditionValue(base, 'CLEAN'));
  const wallet = model.money;
  const raw = JSON.parse(model.serialize());
  const savedReward = raw.loot.find(
    (item: { id: string }) => item.id === reward.id,
  );
  savedReward.finalValue = 999_999_999;
  savedReward.finalGrade = 'PRISTINE';
  const loaded = new GameModel(JSON.stringify(raw));
  assert.equal(loaded.saveStatus, 'saved');
  const item = loaded.loot.find((item) => item.id === reward.id)!;
  assert.equal(item.finalGrade, 'CLEAN');
  assert.equal(item.finalValue, conditionValue(base, 'CLEAN'));
  assert.equal(item.finalCondition, 82);
  assert.equal(item.value, base);
  assert.equal(loaded.credit(item), false);
  assert.equal(loaded.money, wallet);
  const damage = applyImpactCondition(item, {
    tool: 'sledge',
    point: item,
    radius: 5,
    effectiveForce: 100,
    expectedStageForce: 1,
    exposure: 1,
    dt: 1,
  });
  assert.equal(damage.loss, 0);
  assert.equal(item.finalCondition, 82);
  assert.equal(loaded.earned, model.earned);
  assert.equal(
    loaded.campaign!.state.netEarned + loaded.campaign!.state.commissionPaid,
    loaded.earned,
  );
});

void test('a save between ledger release and landing resumes its one physical recovery before the final call and fee waiver', () => {
  const model = new GameModel();
  const phase = blockSpec(31, 3).phases - 1;
  delivery(model, 31, phase);
  const ledger = model.loot.find((item) => item.story === 'ledger');
  assert.ok(ledger);
  model.field.values.fill(0);
  model.field.dirty = true;
  model.update(1 / 60, null);
  assert.equal(ledger.credited, true);
  assert.equal(ledger.state, 'freed');
  assert.equal(model.campaign!.state.objects.includes('ledger'), false);
  const loaded = new GameModel(model.serialize());
  assert.equal(loaded.saveStatus, 'saved');
  assert.equal(
    loaded.loot.find((item) => item.story === 'ledger')?.state,
    'freed',
  );
  let ledgerImpacts = 0;
  loaded.onImpact = (item) => {
    if (item.story === 'ledger') ledgerImpacts++;
  };
  for (
    let frame = 0;
    frame < 600 && !loaded.campaign!.state.objects.includes('ledger');
    frame++
  )
    loaded.update(1 / 60, null);
  assert.equal(ledgerImpacts, 1);
  assert.ok(loaded.campaign!.state.objects.includes('ledger'));
  assert.equal(loaded.campaign!.state.complete, false);
  assert.equal(loaded.settlement, null);
  assert.ok(loaded.campaign!.state.blockFee > 0);
  const fee = loaded.campaign!.state.blockFee;
  const wallet = loaded.money;
  for (let budget = STORY.length * 12; budget > 0; budget--) {
    if (!loaded.campaign!.state.call) loaded.campaign!.deliver();
    if (loaded.phoneRinging) loaded.answerPhone();
    if (!loaded.liveCall) break;
    assert.equal(loaded.advanceCall(), true);
  }
  assert.ok(loaded.campaign!.state.read.includes('ch5.recovered'));
  assert.equal(loaded.money, wallet + fee);
  for (let frame = 0; frame < 600 && !loaded.settlement; frame++)
    loaded.update(1 / 60, null);
  assert.ok(loaded.settlement);
  assert.equal(loaded.settlement.fee, 0);
  assert.equal(loaded.settlement.rate, 0);
  assert.equal(ledgerImpacts, 1);
  assert.equal(
    loaded.campaign!.state.grossEarned,
    loaded.campaign!.state.netEarned + loaded.campaign!.state.commissionPaid,
  );
});
