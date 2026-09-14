import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { blockSpec } from '../lib/game/campaign-content';
import {
  BASE_LOOT_VALUES,
  CARGO_MANIFESTS,
  VALUABLES,
  reducedLegacyValue,
} from '../lib/game/economy';
import { conditionValue, validateConditionState } from '../lib/game/condition';
import { tutorialLoot } from '../lib/game/tutorial';

void test('authored bases are fixed, clean and condition bonuses use the lower value', () => {
  assert.deepEqual(BASE_LOOT_VALUES, { coin: 15, cash: 55, gold: 150 });
  assert.equal(reducedLegacyValue(35), 15);
  assert.equal(reducedLegacyValue(140), 55);
  assert.equal(reducedLegacyValue(380), 150);
  assert.equal(conditionValue(150, 'PRISTINE'), 180);
  const forged = validateConditionState(
    { condition: 100, finalValue: 456, conditionLocked: true },
    { baseValue: 150, released: false },
  );
  assert.equal(forged.finalValue, 180);
  for (const entry of Object.values(VALUABLES))
    assert.equal(entry.value % 5, 0);
});
void test('every authored delivery has the requested number of physical finds and exact catalog accounting', () => {
  assert.equal(CARGO_MANIFESTS.length, 32);
  for (let block = 0; block < 32; block++) {
    const spec = blockSpec(block),
      finds = [];
    for (let phase = 0; phase < spec.phases; phase++)
      finds.push(...campaignLoot(block, phase));
    const ordinary = finds.filter((t) => !t.story);
    const range =
      block === 31
        ? [14, 18]
        : spec.chapter === 1
          ? [2, 4]
          : spec.chapter === 2
            ? [4, 6]
            : spec.chapter === 3
              ? [5, 8]
              : spec.chapter === 4
                ? [7, 10]
                : [8, 12];
    assert.ok(
      ordinary.length >= range[0] && ordinary.length <= range[1],
      `D${block + 1}`,
    );
    assert.deepEqual(
      ordinary.map((t) => t.asset),
      CARGO_MANIFESTS[block],
    );
    for (const t of finds)
      assert.equal(t.value, t.story ? 0 : VALUABLES[t.asset!].value);
    assert.equal(
      finds.reduce((n, t) => n + t.value, 0),
      spec.baseGross,
    );
  }
  assert.equal(tutorialLoot(1).length, 2);
  assert.equal(tutorialLoot(2).length, 2);
});
void test('old wallets, credited rewards and excavations survive two migrations; future cargo uses revision two', () => {
  for (const block of [0, 7, 17, 24, 31]) {
    const model = new GameModel(),
      c = model.campaign!;
    c.state.block = model.round = block;
    c.state.economyRevision = 1;
    model.field = campaignField(block);
    model.loot = campaignLoot(block, 0, 3, 1);
    model.field.carveLoot(model.loot);
    const paid = model.loot[0];
    paid.value = paid.legacyValue!;
    model.credit(paid);
    paid.state = 'collected';
    model.money += c.credit(50000, 'already-earned');
    model.earned += 50000;
    const unearned = model.loot[1],
      reduced = unearned.value;
    const raw = JSON.parse(model.serialize());
    delete raw.campaign.economyRevision;
    delete raw.campaign.narrativeRevision;
    raw.loot[1].conditionLocked = true;
    raw.loot[1].finalCondition = 100;
    raw.loot[1].finalValue = 99999999;
    const savedField = raw.field;
    const once = new GameModel(JSON.stringify(raw)),
      twice = new GameModel(once.serialize());
    for (const copy of [once, twice]) {
      assert.equal(copy.saveStatus, 'saved');
      assert.equal(copy.money, model.money);
      assert.equal(copy.earned, model.earned);
      assert.equal(copy.loot[0].value, paid.value);
      assert.equal(copy.credit(copy.loot[0]), false);
      assert.equal(copy.loot[1].value, reduced);
      assert.equal(
        copy.loot[1].finalValue,
        conditionValue(reduced, 'PRISTINE'),
      );
      assert.deepEqual(JSON.parse(copy.serialize()).field, savedField);
      assert.deepEqual(
        copy.loot.map((t) => [t.id, t.x, t.y, t.z, t.w, t.h, t.d]),
        model.loot.map((t) => [t.id, t.x, t.y, t.z, t.w, t.h, t.d]),
      );
    }
    twice.nextBlock();
    assert.equal(twice.campaign!.state.economyRevision, 2);
    assert.ok(twice.loot.every((t) => t.story || t.asset));
  }
});
