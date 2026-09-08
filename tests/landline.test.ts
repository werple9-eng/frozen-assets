import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { STORY, TOOLS } from '../lib/game/campaign-content';
import {
  TUTORIAL_SCRIPT,
  AUTHORED_DIALOGUE,
} from '../lib/game/authored-dialogue';
import {
  tutorialHistory,
  tutorialField,
  tutorialLoot,
} from '../lib/game/tutorial';
import {
  forceTutorialStep,
  runTutorialSequence,
} from '../lib/game/tutorial-qa';

void test('the full authored tutorial is preserved in exactly seventeen panels', () => {
  assert.equal(TUTORIAL_SCRIPT.length, 17);
  const r = runTutorialSequence();
  assert.ok(r.completed);
  const m = new GameModel(undefined, { tutorial: true });
  assert.equal(m.phoneRinging, true);
  assert.equal(m.phoneOffHook, false);
  m.answerPhone();
  assert.equal(m.phoneOffHook, true);
  for (let i = 0; i < 300; i++) m.update(0.05, null);
  assert.equal(m.tutorial!.line, 0);
  assert.deepEqual(
    tutorialHistory(m.tutorial).map((l) => l.text),
    [TUTORIAL_SCRIPT[0]],
  );
  m.answerPhone();
  assert.equal(m.dialing, false);
  for (let i = 0; i < 5; i++) m.advanceTutorial();
  assert.equal(m.tutorial!.step, 1);
  assert.equal(m.tutorial!.mode, 'dialogue');
});
void test('an active call survives reload, pauses work, and only advances by confirmation', () => {
  const m = new GameModel();
  m.campaign!.deliver();
  m.answerPhone();
  const id = m.liveCall!.id,
    field = Array.from(m.field.values);
  for (let i = 0; i < 500; i++) {
    m.press();
    m.update(0.05, m.field.points[500]);
  }
  assert.equal(m.liveCall!.id, id);
  assert.deepEqual(Array.from(m.field.values), field);
  m.advanceCall();
  const n = new GameModel(m.serialize());
  assert.notEqual(n.saveStatus, 'invalid');
  assert.deepEqual(n.liveCall, m.liveCall);
  const event = n.campaign!.state.call!.event;
  while (n.liveCall) n.advanceCall();
  assert.ok(n.campaign!.state.read.includes(event));
  assert.equal(n.phoneOffHook, false);
});
void test('bank warning and Tony response use separate physical pickups', () => {
  const m = new GameModel(),
    c = m.campaign!;
  c.state.flags.push('ch3.security');
  c.state.history.push('ch3.security');
  c.state.pending = [];
  c.state.call = { event: 'ch3.security', line: 0, status: 'ringing' };
  m.answerPhone();
  assert.equal(m.liveCall!.speaker, 'BELLWETHER NATIONAL');
  m.advanceCall();
  m.advanceCall();
  assert.equal(m.phoneRinging, true);
  assert.equal(m.liveCall, null);
  m.answerPhone();
  assert.equal(m.liveCall!.text, "Don't.");
});
void test('outgoing dial, tutorial map acknowledgement and board history cannot skip ahead', () => {
  const m = new GameModel();
  m.campaign!.state.call = undefined;
  m.answerPhone();
  assert.equal(m.dialing, true);
  assert.equal(m.dialTony('2'), false);
  assert.equal(m.dialTony('7'), true);
  assert.equal(m.dialing, false);
  assert.ok(m.liveCall);
  forceTutorialStep(m, 8);
  assert.equal(m.buyContinuous(), false);
  m.advanceTutorial();
  assert.equal(m.buyContinuous(), true);
  assert.equal(m.money, 37);
  assert.equal(TOOLS.find((t) => t.id === 'grip')!.name, 'Hold to Chip');
  forceTutorialStep(m, 13);
  assert.ok(
    !tutorialHistory(m.tutorial).some((l) => l.text === TUTORIAL_SCRIPT[15]),
  );
});
void test('campaign scripts remain verbatim and final calls can drain after completion', () => {
  for (const lines of Object.values(AUTHORED_DIALOGUE))
    for (const text of lines)
      assert.ok(
        STORY.some(
          (e) => !e.retired && e.messages.some((m) => m.text === text),
        ),
        text,
      );
  const m = new GameModel(),
    c = m.campaign!;
  c.state.block = 31;
  m.round = 31;
  c.state.objects = ['ledger'];
  c.state.pending = [];
  c.finish();
  m.phase = 'completed';
  for (let i = 0; i < 12; i++) {
    for (let frame = 0; frame < 80; frame++) m.update(0.05, null);
    if (m.phoneRinging) m.answerPhone();
    while (m.liveCall) m.advanceCall();
  }
  assert.equal(c.state.pending.length, 0);
  assert.ok(c.state.read.includes('epilogue'));
});
void test('the previous two-item practice parcel migrates without changing money or ice', () => {
  const m = new GameModel();
  forceTutorialStep(m, 12);
  m.tutorial!.legacyParcel = true;
  m.field = tutorialField(2, undefined, true);
  m.loot = tutorialLoot(2, true);
  m.field.carveLoot(m.loot);
  const raw = JSON.parse(m.serialize());
  raw.tutorial.revision = 1;
  delete raw.tutorial.mode;
  const n = new GameModel(JSON.stringify(raw));
  assert.notEqual(n.saveStatus, 'invalid');
  assert.equal(n.loot.length, 2);
  assert.equal(n.money, m.money);
  assert.deepEqual(
    Array.from(n.field.values),
    Array.from(new Float32Array(raw.ice)),
  );
});
void test('tool and tray clearance query the same interpolated solid as the ice field', () => {
  const field = tutorialField(2);
  for (let i = 0; i < field.points.length; i += 17)
    assert.ok(
      Math.abs(field.density(field.points[i]) - field.values[i]) < 0.000001,
    );
  assert.equal(field.density({ x: 100, y: 100, z: 100 }), 0);
});
