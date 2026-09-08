import assert from 'node:assert/strict';
import { test } from 'node:test';
import { Campaign, demoBoundary } from '../lib/game/campaign';
import { STORY, BLOCKS, TOOLS } from '../lib/game/campaign-content';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { GameModel } from '../lib/game/model';
import { SKILLS, TREE, NODE } from '../lib/game/skills';
import {
  SaveService,
  MemorySaveBackend,
  ActionInput,
  PAD_ACTIONS,
} from '../lib/game/platform';
const tick = (m: GameModel, s: number) => {
  for (let i = 0; i < s * 60; i++) m.update(1 / 60, null);
};
void test('32 authored blocks escalate scale without increasing scalar ice health', () => {
  assert.equal(BLOCKS.length, 32);
  assert.equal(new Set(BLOCKS.map((b) => b.id)).size, 32);
  for (let b = 0; b < 32; b++) {
    const field = campaignField(b);
    assert.ok(field.values.every((v) => v <= 1));
    const loot = campaignLoot(b);
    assert.ok(loot.length >= 2);
    assert.equal(new Set(loot.map((t) => t.id)).size, loot.length);
    assert.ok(
      loot.every((t) => [t.x, t.y, t.z, t.value].every(Number.isFinite)),
    );
    assert.ok(field.remaining() > 0);
    assert.ok(
      loot.every((t) => !field.canRelease(t)),
      `Block ${b + 1} has an unsupported reward at delivery`,
    );
  }
  assert.ok(BLOCKS[31].scale / BLOCKS[0].scale > 6);
  assert.equal(BLOCKS[31].phases, 3);
  for (let b = 0; b < 32; b++)
    for (let phase = 1; phase < BLOCKS[b].phases; phase++) {
      const f = campaignField(b, phase),
        lots = campaignLoot(b, phase);
      assert.ok(
        lots.every((t) => !f.canRelease(t)),
        `Unsupported inner reward ${b}/${phase}`,
      );
      assert.ok(
        lots.every((t) => t.story !== 'ledger' || (b === 31 && phase === 2)),
      );
    }
});
void test('notification priority never scrambles saved story chronology', () => {
  const c = new Campaign();
  c.trigger('GAME_START');
  c.trigger('FIRST_REWARD');
  c.state.block = 4;
  c.collect('tag');
  c.deliver();
  assert.deepEqual(c.state.history, ['ch1.tag']);
  c.openPhone();
  assert.deepEqual(c.state.history, ['ch1.intro', 'ch1.tag']);
});
void test('quick primary clicks register once; cancellation prevents deferred strikes', () => {
  const m = new GameModel(),
    point = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
  const sum = () => m.field.values.reduce((a, b) => a + b, 0),
    before = sum();
  m.press();
  m.release();
  m.update(0.02, point);
  assert.ok(sum() < before, 'chisel must excavate immediately');
  for (let i = 0; i < 9; i++) m.update(0.02, point);
  assert.ok(sum() < before);
  const after = sum();
  m.update(0.02, point);
  assert.equal(sum(), after);
  m.press();
  m.pause(true);
  m.pause(false);
  m.update(0.5, point);
  assert.equal(sum(), after);
});
void test('optional ring can remain frozen while the main shipment completes', () => {
  const m = new GameModel();
  m.round = 7;
  m.campaign!.state.block = 7;
  m.campaign!.state.phase = BLOCKS[7].phases - 1;
  m.field = campaignField(7, m.campaign!.state.phase);
  m.loot = campaignLoot(7, m.campaign!.state.phase);
  for (const t of m.loot)
    if (t.story !== 'ring') {
      m.credit(t);
      t.state = 'collected';
    }
  tick(m, 4);
  assert.equal(m.round, 8);
  assert.ok(!m.campaign!.state.objects.includes('ring'));
});
void test('campaign restore rejects inconsistent balances and block indices', () => {
  const raw = JSON.parse(new GameModel().serialize());
  raw.round = 1;
  assert.equal(new GameModel(JSON.stringify(raw)).saveStatus, 'invalid');
  raw.round = 0;
  raw.campaign.netEarned = 5;
  assert.equal(new GameModel(JSON.stringify(raw)).saveStatus, 'invalid');
});
void test('seven central tool cards do not overlap the 42 upgrade cards or root', () => {
  const boxes = SKILLS.map((n) => ({
    x: n.x,
    y: n.y,
    w: n.major ? NODE.majorWidth : NODE.width,
    h: n.major ? NODE.majorHeight : NODE.height,
  }));
  const toolBoxes = TOOLS.map((_, i) => ({
    x: TREE.rootX,
    y: TREE.rootY - i * 320,
    w: 94,
    h: 94,
  }));
  for (const a of toolBoxes)
    for (const b of [
      ...boxes,
      ...toolBoxes.filter((x) => x !== a),
      { x: TREE.rootX, y: TREE.rootY + 150, w: 300, h: 70 },
    ])
      assert.ok(
        Math.abs(a.x - b.x) >= (a.w + b.w) / 2 ||
          Math.abs(a.y - b.y) >= (a.h + b.h) / 2,
      );
});
void test('story queues during striking, persists through reload, delivers at quiet points once', () => {
  const c = new Campaign();
  c.trigger('GAME_START');
  c.trigger('GAME_START');
  assert.equal(c.state.pending.length, 1);
  c.advanceQuiet(5, true);
  assert.equal(c.unread, 0);
  const saved = structuredClone(c.state);
  const restored = new Campaign();
  restored.restore(saved);
  assert.equal(restored.advanceQuiet(1, false), true);
  assert.equal(restored.unread, 1);
  restored.openPhone();
  assert.equal(restored.unread, 0);
  assert.ok(restored.state.history.includes('ch1.intro'));
  restored.trigger('GAME_START');
  assert.equal(restored.state.pending.length, 0);
});
void test('commission changes at evidence recovery, locks each settlement rate, final vault is free', () => {
  const c = new Campaign();
  assert.equal(c.credit(210, 'a'), 185);
  assert.equal(c.credit(210, 'a'), 0);
  assert.equal(c.state.blockFee, 25);
  c.state.block = 17;
  c.collect('log');
  assert.equal(c.state.commission, 8);
  assert.equal(c.rate, 12);
  c.next();
  assert.equal(c.rate, 8);
  assert.equal(c.credit(100, 'b'), 92);
  c.state.block = 30;
  c.next();
  assert.equal(c.rate, 0);
  assert.equal(c.credit(100, 'c'), 100);
});
void test('finale cannot trigger early; epilogue and contracts require completed ledger recovery', () => {
  const c = new Campaign();
  c.trigger('FINAL_LEDGER_RECOVERED');
  c.trigger('CAMPAIGN_COMPLETE');
  assert.equal(c.state.flags.length, 0);
  assert.equal(c.startContracts(), false);
  c.state.block = 31;
  c.collect('ledger');
  assert.ok(c.state.flags.includes('ch5.recovered'));
  c.finish();
  assert.ok(c.state.complete);
  assert.equal(c.startContracts(), false);
  c.openPhone();
  assert.equal(c.startContracts(), true);
  assert.equal(c.state.block, 32);
  assert.equal(c.rate, 8);
});
void test('demo boundary uses the same save and preserves the tag', () => {
  const c = new Campaign();
  c.state.block = 4;
  c.collect('tag');
  assert.equal(demoBoundary(c, 'demo'), true);
  assert.equal(demoBoundary(c, 'full'), false);
  const x = new Campaign();
  x.restore(c.state);
  assert.ok(x.state.objects.includes('tag'));
});
void test('Tony lines have stable localization keys, restrained length and no stock jokes', () => {
  const keys = STORY.flatMap((e) => e.messages.map((m) => m.key));
  assert.equal(new Set(keys).size, keys.length);
  for (const m of STORY.flatMap((e) => e.messages).filter(
    (m) => m.speaker === 'tony',
  )) {
    assert.ok(m.text.split(/\s+/).length <= 65, m.key);
    assert.doesNotMatch(
      m.text,
      /heating up|break the ice|cold hard cash|well, that happened|OMG|!/i,
    );
  }
});
void test('starter click chips once, hold accessibility repeats, later tools differ and fuel is thermal only', () => {
  const m = new GameModel();
  const point = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
  const initial = m.field.values.reduce((a, b) => a + b, 0);
  m.press();
  m.update(0.03, point);
  assert.ok(m.field.values.reduce((a, b) => a + b, 0) < initial);
  for (let i = 0; i < 10; i++) m.update(0.02, point);
  assert.ok(m.field.values.reduce((a, b) => a + b, 0) < initial);
  assert.equal(m.firing, false);
  assert.equal(m.fuel, m.capacity);
  m.settings.toggle = true;
  m.press();
  for (let i = 0; i < 60; i++) m.update(1 / 60, point);
  assert.equal(m.firing, true);
  assert.equal(m.fuel, m.capacity);
  assert.ok(
    TOOLS.find((t) => t.id === 'sledge')!.cadence >
      TOOLS.find((t) => t.id === 'breaker')!.cadence,
  );
});
void test('old prototype saves preserve active ice, money, upgrades and access to the old tool', () => {
  const old = new GameModel(null, { legacy: true });
  old.round = 3;
  old.nextBlock();
  old.money = 240;
  old.earned = 500;
  old.upgrades.heat = 4;
  const raw = JSON.parse(old.serialize());
  raw.version = 3;
  const m = new GameModel(JSON.stringify(raw));
  assert.equal(m.saveStatus, 'saved');
  assert.equal(m.money, 240);
  assert.deepEqual(m.upgrades, old.upgrades);
  assert.deepEqual(m.field.values, old.field.values);
  assert.equal(m.toolId, 'thermal');
  assert.equal(m.campaign?.state.legacyBlock, true);
  m.nextBlock();
  assert.equal(m.round, 0);
  assert.equal(m.campaign?.state.legacyBlock, false);
  assert.equal(m.money, 240);
});
void test('campaign save retains active phase, collections, queued story and settlement without double credit', () => {
  const m = new GameModel();
  m.campaign!.state.block = 4;
  m.round = 4;
  m.field = campaignField(4);
  m.loot = campaignLoot(4);
  const t = m.loot[0];
  m.credit(t);
  m.campaign!.collect('tag');
  const copy = new GameModel(m.serialize());
  assert.equal(copy.money, m.money);
  assert.ok(copy.campaign!.state.pending.includes('ch1.tag'));
  assert.ok(copy.campaign!.state.objects.includes('tag'));
  assert.equal(copy.credit(copy.loot[0]), false);
});
void test('all 32 blocks and three vault phases settle once and reach coherent postgame', () => {
  const m = new GameModel();
  let safety = 0;
  while (m.phase !== 'completed' && safety++ < 200) {
    m.field.values.fill(0);
    m.field.dirty = true;
    tick(m, 5);
  }
  assert.equal(m.phase, 'completed');
  assert.equal(m.round, 31);
  assert.ok(m.campaign!.state.objects.includes('ledger'));
  assert.equal(m.campaign!.state.blockFee, 0);
  assert.ok(m.campaign!.state.objects.includes('tag'));
  assert.ok(m.campaign!.state.objects.includes('log'));
  assert.equal(m.message, 'The Freeze Ledger is safe.');
  assert.doesNotMatch(m.message, /\+\$0/);
  m.openPhone();
  m.continuePlaying();
  assert.equal(m.round, 32);
  assert.equal(m.campaign!.state.contracts, true);
});
void test('save service serializes writes and platform actions share Xbox and PlayStation standard mapping', async () => {
  const backend = new MemorySaveBackend();
  const service = new SaveService(backend);
  await Promise.all([service.save('first'), service.save('second')]);
  assert.equal(await service.load(), 'second');
  const input = new ActionInput();
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  buttons[7].pressed = true;
  assert.deepEqual(input.sample(buttons), [
    { action: 'PRIMARY_ACTION', down: true },
  ]);
  assert.equal(input.sample(buttons).length, 0);
  buttons[7].pressed = false;
  assert.deepEqual(input.sample(buttons), [
    { action: 'PRIMARY_ACTION', down: false },
  ]);
  assert.equal(PAD_ACTIONS[3], 'OPEN_PHONE');
});
