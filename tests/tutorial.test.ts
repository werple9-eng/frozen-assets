import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import {
  tutorialField,
  tutorialLoot,
  validateTutorial,
} from '../lib/game/tutorial';
import { campaignField } from '../lib/game/campaign-layout';
import {
  runTutorialSequence,
  forceTutorialStep,
} from '../lib/game/tutorial-qa';

void test('new tutorial begins on an empty tray and old recoveries skip it', () => {
  const fresh = new GameModel(undefined, { tutorial: true });
  assert.equal(fresh.field.remaining(), 0);
  assert.equal(fresh.loot.length, 0);
  fresh.press();
  fresh.update(0.05, { x: 0, y: 0, z: 0 });
  assert.equal(fresh.strikeSerial, 0);
  assert.equal(new GameModel(new GameModel().serialize()).inTutorial, false);
});
void test('micro blocks use smaller physical geometry and release only after contact clears', () => {
  const normal = campaignField(0, 0, undefined, 2),
    a = tutorialField(1),
    b = tutorialField(2);
  const width = (f: typeof a) =>
    Math.max(...f.points.map((p) => p.x)) -
    Math.min(...f.points.map((p) => p.x));
  assert.ok(Math.abs(width(a) / width(normal) - 0.45) < 0.001);
  assert.ok(Math.abs(width(b) / width(normal) - 0.68) < 0.001);
  // Induction retains its authored dimensions as the main campaign grid grows.
  assert.ok(width(a) < width(campaignField(0)));
  assert.ok(width(b) < width(campaignField(0)));
  const loot = tutorialLoot(1)[0];
  a.carveLoot([loot]);
  assert.equal(a.canRelease(loot), false);
  // Clearing the top alone must not delete the pedestal still touching it.
  a.points.forEach((p, i) => {
    if (p.y > loot.y - loot.h * 0.5) a.values[i] = 0;
  });
  assert.ok(a.remaining() > 0);
  assert.equal(a.canRelease(loot), false);
  a.points.forEach((p, i) => {
    if (p.y > loot.y - loot.h * 0.5 - a.grid.cellSize) a.values[i] = 0;
  });
  assert.equal(a.canRelease(loot), true);
  assert.equal(normal.profile?.releaseMode, undefined);
});
void test('the authored tutorial reaches Chapter 1 without timers or hidden credits', () => {
  const result = runTutorialSequence();
  assert.equal(result.completed, true);
  assert.equal(result.gross, 215);
  assert.equal(result.commission, 25);
  assert.equal(result.money, 165);
  // This probe skips all text and knows the exact buried object positions;
  // it checks mechanical effort, not a first-time human reading duration.
  // Strike cycles retain fractional frame time; the old cooldown rounded each
  // .36s hold strike up to .4s in this 20Hz probe.
  assert.ok(result.holdSeconds >= 25 && result.holdSeconds <= 60);
  assert.ok(
    result.metrics.block1Strikes >= 10 && result.metrics.block1Strikes <= 16,
  );
  assert.ok(
    result.metrics.firstRewardStrikes >= 3 &&
      result.metrics.firstRewardStrikes <= 8,
  );
});
void test('every tutorial checkpoint reloads without duplicate money, commission or stamp', () => {
  const normal = runTutorialSequence(),
    reloaded = runTutorialSequence(true);
  assert.equal(reloaded.completed, true);
  assert.equal(reloaded.money, normal.money);
  assert.equal(reloaded.commission, normal.commission);
  assert.ok(reloaded.checkpoints.some((x) => x.name === 'first strike'));
  assert.ok(
    reloaded.checkpoints.some((x) => x.name === 'first reward in flight'),
  );
  const m = new GameModel();
  forceTutorialStep(m, 13);
  assert.equal(m.stampTutorial(), true);
  const n = new GameModel(m.serialize());
  assert.equal(n.stampTutorial(), false);
  n.finishTutorialBoard();
  assert.equal(n.tutorial?.stage, 'post');
});
void test('returning early from the tutorial map restores the correct task', () => {
  const m = new GameModel();
  forceTutorialStep(m, 7);
  m.tutorialMenu('skills');
  assert.equal(m.tutorial?.step, 8);
  m.tutorialMenu(null);
  assert.equal(m.tutorial?.step, 7);
  m.tutorialMenu('skills');
  m.advanceTutorial();
  assert.equal(m.buyContinuous(), true);
  assert.equal(m.buyContinuous(), false);
  m.advanceTutorial();
  m.tutorialMenu(null);
  assert.equal(m.tutorial?.step, 11);
  assert.equal(m.tutorial?.block, 2);
});
void test('tutorial validation fails closed and dialogue comfort settings persist', () => {
  const m = new GameModel(undefined, { tutorial: true });
  assert.throws(() => validateTutorial({ ...m.tutorial, step: 90 }));
  assert.throws(() => validateTutorial({ ...m.tutorial, stage: 'board' }));
  assert.throws(() => validateTutorial({ ...m.tutorial, block: 2 }));
  m.setSetting('textSpeed', 0.8);
  m.setSetting('dialogueSounds', false);
  const n = new GameModel(m.serialize());
  assert.equal(n.settings.textSpeed, 0.8);
  assert.equal(n.settings.dialogueSounds, false);
});

void test('a reload between first release and landing resumes its confirmation exactly once', () => {
  const m = new GameModel();
  forceTutorialStep(m, 3);
  m.tutorialStep(4);
  m.tutorial!.firstImpact = false;
  m.field.values.fill(0);
  m.field.dirty = true;
  for (let i = 0; i < 30 && !m.loot.some((l) => l.credited); i++)
    m.update(0.025, null);
  assert.ok(m.loot.some((l) => l.credited));
  const n = new GameModel(m.serialize()),
    money = n.money;
  for (let i = 0; i < 100; i++) n.update(0.05, null);
  assert.equal(n.tutorial?.firstImpact, true);
  assert.equal(n.money, money);
  assert.equal(n.tutorial?.history.filter((x) => x === '4:0').length, 1);
});
void test('tutorial timing includes a paused upgrade visit without firing', () => {
  const m = new GameModel();
  forceTutorialStep(m, 8);
  m.pause(true);
  const before = m.tutorial!.elapsed;
  m.press();
  m.update(0.05, { x: 0, y: 0, z: 0 });
  assert.equal(m.tutorial!.elapsed, before + 0.05);
  assert.equal(m.strikeSerial, 0);
});
