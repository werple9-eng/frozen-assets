import test from 'node:test';
import assert from 'node:assert/strict';
import { Vector3 } from 'three';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { releaseCorpus, cutReleasePassage } from '../lib/game/release-qa';
import { tutorialField, tutorialLoot } from '../lib/game/tutorial';
import { GameModel } from '../lib/game/model';
import { Campaign } from '../lib/game/campaign';
import { STORY } from '../lib/game/campaign-content';
import { ToolFollow } from '../lib/game/tool-follow';
import { forceTutorialStep } from '../lib/game/tutorial-qa';

void test('every tutorial, campaign and contract asset starts in uncarved solid ice', () => {
  const fields = [
    ...([1, 2] as const).map((b) => ({
      field: tutorialField(b),
      loot: tutorialLoot(b),
    })),
    ...releaseCorpus().map(({ block, phase }) => ({
      field: campaignField(block, phase),
      loot: campaignLoot(block, phase),
    })),
  ];
  for (const { field, loot } of fields) {
    const before = field.values.slice();
    field.carveLoot(loot);
    assert.deepEqual(field.values, before, 'spawning must not remove any ice');
    for (const item of loot) {
      assert.equal(field.canRelease(item), false, item.id);
      for (const [x, y, z] of [
        [0, 0, 0],
        [-0.5, 0, 0],
        [0.5, 0, 0],
        [0, -0.5, 0],
        [0, 0.5, 0],
        [0, 0, -0.5],
        [0, 0, 0.5],
      ]) {
        assert.ok(
          field.density(
            {
              x: item.x + x * item.w,
              y: item.y + y * item.h,
              z: item.z + z * item.d,
            },
            true,
          ) > 0.5,
          `${item.id}: packed face ${x},${y},${z}`,
        );
      }
    }
  }
});

void test('old sealed cavities are repaired on load while open excavations and credits survive', () => {
  for (const opened of [false, true]) {
    const m = new GameModel();
    const item = m.loot[0];
    const original = m.field.values.slice();
    m.field.carveLoot(m.loot, true);
    if (opened) cutReleasePassage(m.field, item, 3);
    const excavated = m.field.values.slice();
    const raw = JSON.parse(m.serialize());
    delete raw.field.packingVersion;
    const restored = new GameModel(JSON.stringify(raw));
    assert.equal(restored.saveStatus, 'saved');
    assert.equal(restored.money, m.money);
    if (opened) {
      // Everything the player opened near this asset remains empty.
      for (let i = 0; i < excavated.length; i++)
        if (
          excavated[i] === 0 &&
          original[i] > 0.5 &&
          Math.abs(m.field.points[i].x - item.x) < item.w / 2
        )
          assert.equal(restored.field.values[i], 0);
      assert.equal(restored.field.canRelease(restored.loot[0]), true);
    } else {
      for (let i = 0; i < original.length; i++) {
        assert.ok(
          Math.abs(restored.field.values[i] - original[i]) <= 1 / 255,
          'only normal save quantization differs',
        );
        assert.equal(restored.field.values[i] > 0.5, original[i] > 0.5);
      }
      assert.equal(restored.field.canRelease(restored.loot[0]), false);
    }
    const again = new GameModel(restored.serialize());
    assert.deepEqual(again.field.values, restored.field.values);
  }
});

void test('first delivery receipt leads to the affordable Hold to Chip lesson and does not return on reload', () => {
  const m = new GameModel();
  forceTutorialStep(m, 6);
  assert.ok(m.settlement);
  m.skipSettlement();
  assert.equal(m.settlement, null);
  m.advanceTutorial();
  m.advanceTutorial();
  assert.equal(m.tutorial!.step, 7);
  const copy = new GameModel(m.serialize());
  assert.equal(copy.settlement, null);
  copy.tutorialMenu('skills');
  copy.advanceTutorial();
  assert.equal(copy.buyContinuous(), true);
  assert.ok(copy.nodes.hand.includes('HC-S1'));
});

void test('routine tips file silently; meaningful calls wait for a quiet pause and have a cooldown', () => {
  const c = new Campaign();
  c.trigger('BLOCK_START');
  c.state.block = 10;
  c.state.flags.push('equipment.pick', 'handling.pick', 'ch1.tag');
  c.state.pending.push('equipment.pick', 'handling.pick', 'ch1.tag');
  assert.equal(c.advanceQuiet(10, true), false);
  assert.ok(c.state.history.includes('equipment.pick'));
  assert.ok(c.state.read.includes('handling.pick'));
  assert.equal(c.state.call, undefined);
  assert.equal(c.advanceQuiet(3.1, false), true);
  const call = c.state.call!;
  assert.equal(call.event, 'ch1.tag');
  call.status = 'active';
  call.line = STORY.find((e) => e.id === call.event)!.messages.length - 1;
  c.completeCall(call.event);
  c.state.flags.push('ch2.pool');
  c.state.pending.push('ch2.pool');
  c.state.block = 5;
  assert.equal(c.advanceQuiet(20, false), false);
  assert.equal(c.advanceQuiet(26, false), true);
});

void test('pick handle hangs below its head while its contact pivot stays on the ice', () => {
  const follow = new ToolFollow();
  follow.smoothedNormal.set(0, 0, 1);
  follow.orient(new Vector3(1.3, 14.7, 29), true);
  const shaft = new Vector3(0, 0, 1).applyQuaternion(follow.targetRotation);
  assert.ok(shaft.y < -0.5);
  assert.ok(shaft.z > 0, 'handle clears the ice toward the player');
  assert.deepEqual(
    new Vector3().applyQuaternion(follow.targetRotation).toArray(),
    [0, 0, 0],
  );
});

void test('old Toggle to fire preference returns to normal press and release controls', () => {
  const m = new GameModel();
  m.settings.toggle = true;
  assert.equal(new GameModel(m.serialize()).settings.toggle, false);
});
