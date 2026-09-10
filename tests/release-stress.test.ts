import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { STORY } from '../lib/game/campaign-content';
import { GameModel } from '../lib/game/model';
import {
  cutReleasePassage,
  releaseCorpus,
  RELEASE_CASES,
} from '../lib/game/release-qa';

void test('whole-game release stress: every cargo placement, six faces, diagonal and bent openings', () => {
  const failures: string[] = [];
  let cases = 0,
    items = 0,
    previouslyMissed = 0,
    maxFloodMs = 0;
  const started = performance.now();
  const corpus = releaseCorpus();
  for (const { block, phase } of corpus) {
    const field = campaignField(block, phase, undefined, 3),
      loot = campaignLoot(block, phase, 3);
    field.carveLoot(loot);
    const original = field.values.slice();
    for (const item of loot) {
      field.values.set(original);
      field.revision++;
      assert.equal(
        field.canRelease(item),
        false,
        `${item.id}: unopened parcel`,
      );
      items++;
      for (let scenario = 0; scenario < RELEASE_CASES; scenario++) {
        field.values.set(original);
        cutReleasePassage(field, item, scenario);
        if (field.exposure(item).exposed === 0) previouslyMissed++;
        if (!field.canRelease(item))
          failures.push(`${item.id}:opening-${scenario}`);
        maxFloodMs = Math.max(
          maxFloodMs,
          field.metrics.lastReleaseConnectivityMs,
        );
        cases++;
      }
    }
  }
  const result = {
    passed: failures.length === 0,
    phases: corpus.length,
    items,
    cases,
    previouslyMissed,
    maxFloodMs,
    seconds: (performance.now() - started) / 1000,
    failures,
  };
  mkdirSync('qa-artifacts', { recursive: true });
  writeFileSync(
    'qa-artifacts/release-stress.json',
    JSON.stringify(result, null, 2),
  );
  assert.ok(
    previouslyMissed > 0,
    'the corpus must exercise openings fixed-direction visibility misses',
  );
  assert.deepEqual(failures, []);
});

function checkpoint(block: number, phase: number) {
  const model = new GameModel();
  model.campaign!.state.block = model.round = block;
  model.campaign!.state.phase = phase;
  model.campaign!.state.flags = STORY.filter((e) => !e.retired).map(
    (e) => e.id,
  );
  model.campaign!.state.pending = [];
  model.field = campaignField(block, phase, undefined, 3);
  model.loot = campaignLoot(block, phase, 3);
  model.field.carveLoot(model.loot);
  return model;
}

void test('every campaign phase releases on the edited frame and survives mid-fall reload at 20–144 FPS', () => {
  let scenarios = 0;
  for (const { block, phase } of releaseCorpus().filter((p) => p.block < 32))
    for (const dt of [0.05, 1 / 30, 1 / 60, 1 / 144]) {
      const model = checkpoint(block, phase);
      model.update(dt, null);
      for (const item of model.loot) assert.equal(item.state, 'embedded');
      // Geometry fixture clears each local pocket from below; it is not a
      // tool/pacing simulation. Model release, gravity, money and saves are real.
      for (const item of model.loot) cutReleasePassage(model.field, item, 3);
      model.update(dt, null);
      for (const item of model.loot) {
        assert.notEqual(item.state, 'embedded', `${item.id} at ${dt}s`);
        assert.equal(item.credited, true, item.id);
      }
      let restored = new GameModel(model.serialize());
      assert.notEqual(restored.saveStatus, 'invalid');
      const money = restored.money;
      const ids = restored.loot.map((t) => t.id);
      // The final Ledger intentionally rests on the tray for three seconds;
      // allow its authored landing presentation plus flight and collection.
      for (let n = 0; n < Math.ceil(6 / dt); n++) restored.update(dt, null);
      assert.equal(restored.money, money, 'falling/landing must not pay twice');
      for (const id of ids) {
        const item = restored.loot.find((t) => t.id === id);
        // A completed phase may already have advanced to the next parcel.
        if (item)
          assert.equal(
            item.state,
            'collected',
            `${id} never finished its fall`,
          );
      }
      restored = new GameModel(restored.serialize());
      assert.equal(
        restored.money,
        money,
        'repeated reload cannot duplicate recovery',
      );
      scenarios++;
    }
  writeFileSync(
    'qa-artifacts/release-reload-stress.json',
    JSON.stringify({ passed: true, scenarios }, null, 2),
  );
});
