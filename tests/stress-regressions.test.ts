import test from 'node:test';
import assert from 'node:assert/strict';
import { SaveSlots } from '../lib/game/save-slots';
import { MemorySaveBackend, SaveService } from '../lib/game/platform';
import { Campaign } from '../lib/game/campaign';
import { STORY } from '../lib/game/campaign-content';
import { GameModel } from '../lib/game/model';

void test('refill cannot interrupt a manual tool, phone conversation, or receipt', () => {
  const m = new GameModel();
  assert.equal(m.refill(), false);
  assert.equal(m.phase, 'playing');
  m.campaign!.unlock('thermal');
  m.campaign!.state.pending = [];
  m.toolNotice = null;
  m.campaign!.state.call = { event: 'ch1.intro', line: 0, status: 'active' };
  assert.equal(m.refill(), false);
  m.campaign!.state.call = undefined;
  m.dialing = true;
  assert.equal(m.refill(), false);
  m.dialing = false;
  m.settlement = { gross: 10, fee: 1, net: 9, rate: 12, name: 'Test receipt' };
  assert.equal(m.refill(), false);
  m.settlement = null;
  assert.equal(m.refill(), true);
  assert.equal(m.phase, 'refilling');
});

void test('600 interleaved save, clear and restore requests agree with durable storage', async () => {
  const backend = new MemorySaveBackend();
  const slots = new SaveSlots(
    new SaveService(backend),
    new SaveService(new MemorySaveBackend()),
  );
  const expected = Array.from({ length: 3 }, () => ({
    raw: null as string | null,
    backup: undefined as string | undefined,
  }));
  const jobs: Promise<void>[] = [];
  for (let i = 0; i < 600; i++) {
    const index = (i * 7 + Math.floor(i / 9)) % 3;
    const slot = expected[index];
    if (i % 7 === 0) {
      slot.backup = slot.raw ?? slot.backup;
      slot.raw = null;
      jobs.push(slots.clear(index));
    } else if (i % 7 === 1) {
      if (!slot.raw && slot.backup) slot.raw = slot.backup;
      jobs.push(slots.restore(index));
    } else {
      slot.raw = `checkpoint-${i}`;
      jobs.push(slots.put(index, slot.raw));
    }
  }
  await Promise.all(jobs);
  assert.deepEqual(slots.data, JSON.parse(backend.data!));
  assert.deepEqual(
    slots.data.slots.map(({ raw, backup }) => ({ raw, backup })),
    expected,
  );
});

void test('failed overlapping save writes leave no phantom progress in any slot', async () => {
  const backend = new MemorySaveBackend();
  const slots = new SaveSlots(
    new SaveService(backend),
    new SaveService(new MemorySaveBackend()),
  );
  await slots.put(0, 'original');
  backend.save = async () => {
    throw Error('Storage full');
  };
  const writes = await Promise.allSettled([
    slots.put(0, 'unsaved'),
    slots.put(1, 'also unsaved'),
  ]);
  assert.ok(writes.every((r) => r.status === 'rejected'));
  assert.equal(slots.data.slots[0].raw, 'original');
  assert.equal(slots.data.slots[1].raw, null);
});

void test('a clear queued behind a failed save backs up only committed progress', async () => {
  const backend = new MemorySaveBackend();
  const slots = new SaveSlots(
    new SaveService(backend),
    new SaveService(new MemorySaveBackend()),
  );
  await slots.put(0, 'original');
  let attempt = 0;
  backend.save = async (data) => {
    if (++attempt === 1) throw Error('Transient storage failure');
    backend.data = data;
  };
  await Promise.allSettled([slots.put(0, 'unsaved'), slots.clear(0)]);
  assert.equal(slots.data.slots[0].raw, null);
  assert.equal(slots.data.slots[0].backup, 'original');
  await slots.restore(0);
  assert.equal(slots.data.slots[0].raw, 'original');
});

void test('save catalog rejects an invalid active slot without publishing malformed state', async () => {
  for (const active of ['broken', {}, [], 1.5, -1, 3]) {
    const slots = new SaveSlots(
      new SaveService(
        new MemorySaveBackend(
          JSON.stringify({
            version: 1,
            active,
            slots: Array.from({ length: 3 }, () => ({ raw: null, updated: 0 })),
          }),
        ),
      ),
      new SaveService(new MemorySaveBackend()),
    );
    await assert.rejects(slots.load());
    assert.equal(slots.data.active, 0);
  }
});

void test('Tony call spacing survives reload instead of ringing again after three seconds', () => {
  const campaign = new Campaign();
  campaign.collect('tag');
  campaign.deliver();
  const event = campaign.state.call!.event;
  campaign.state.call!.status = 'active';
  campaign.state.call!.line =
    STORY.find((e) => e.id === event)!.messages.length - 1;
  campaign.completeCall(event);
  campaign.state.block = 4;
  campaign.collect('ring');
  const restored = new Campaign();
  restored.restore(JSON.parse(JSON.stringify(campaign.state)));
  for (let i = 0; i < 100; i++) restored.advanceQuiet(0.05, false);
  assert.equal(restored.state.call, undefined);
  for (let i = 0; i < 9610; i++) restored.advanceQuiet(0.05, false);
  assert.ok(restored.state.call, 'queued story must eventually ring');
});
