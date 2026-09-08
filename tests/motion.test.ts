import test from 'node:test';
import assert from 'node:assert/strict';
import { Spring, TOOL_MOTION, letterSchedule } from '../lib/game/motion';
import { SaveSlots, slotSummary } from '../lib/game/save-slots';
import { MemorySaveBackend, SaveService } from '../lib/game/platform';
import { GameModel } from '../lib/game/model';

void test('motion retains velocity on rapid retargeting and converges at 30, 60, 144 and 240 Hz', () => {
  const results = [30, 60, 144, 240].map((fps) => {
    const spring = new Spring(0, 260, 23);
    for (let i = 0; i < fps * 3; i++) {
      if (i % Math.max(1, Math.round(fps / 12)) === 0)
        spring.target = spring.target ? 0 : 1;
      spring.step(1 / fps);
      assert.ok(Number.isFinite(spring.value) && Math.abs(spring.value) < 2);
    }
    const velocity = spring.velocity;
    spring.target = 0.5;
    assert.equal(
      spring.velocity,
      velocity,
      'retargeting must preserve momentum',
    );
    for (let i = 0; i < fps * 2; i++) spring.step(1 / fps);
    assert.equal(spring.value, 0.5);
    assert.equal(spring.velocity, 0);
    spring.target = 1;
    for (let i = 0; i < fps / 5; i++) spring.step(1 / fps);
    return spring.value;
  });
  assert.ok(Math.max(...results) - Math.min(...results) < 0.025);
});

void test('reduced motion damps immediately and long frame gaps cannot explode springs', () => {
  const spring = new Spring(0);
  spring.target = 1;
  for (let i = 0; i < 60; i++) {
    spring.step(i === 5 ? 30 : 1 / 60, true);
    assert.ok(spring.value <= 1);
  }
  assert.equal(spring.value, 1);
});

void test('seven tools have distinct presentation weights and punctuation creates actual pauses', () => {
  assert.equal(
    new Set(
      Object.values(TOOL_MOTION).map(
        (t) => `${t.lift}:${t.stiffness}:${t.recoil}`,
      ),
    ).size,
    7,
  );
  assert.ok(TOOL_MOTION.sledge.weight > TOOL_MOTION.pick.weight);
  assert.ok(TOOL_MOTION.hand.stiffness > TOOL_MOTION.sledge.stiffness);
  const schedule = letterSchedule('Yes. Go, now.');
  assert.equal(schedule[4].at - schedule[3].at, 130);
  assert.equal(schedule[8].at - schedule[7].at, 85);
});

void test('save slots import the original recovery without changing it and isolate all three files', async () => {
  const m = new GameModel(),
    original = m.serialize();
  const legacy = new MemorySaveBackend(original),
    disk = new MemorySaveBackend();
  const slots = new SaveSlots(new SaveService(disk), new SaveService(legacy));
  const data = await slots.load();
  assert.equal(data.slots[0].raw, original);
  assert.equal(disk.data, null);
  m.field.values[42] *= 0.5;
  const second = m.serialize();
  await Promise.all([slots.put(1, second), slots.put(2, original)]);
  const loaded = new SaveSlots(new SaveService(disk), new SaveService(legacy));
  await loaded.load();
  assert.equal(loaded.data.slots[0].raw, original);
  assert.equal(loaded.data.slots[1].raw, second);
  assert.equal(loaded.data.slots[2].raw, original);
  await loaded.clear(1);
  assert.equal(loaded.data.slots[1].raw, null);
  assert.equal(loaded.data.slots[1].backup, second);
  await loaded.restore(1);
  assert.equal(loaded.data.slots[1].raw, second);
  assert.equal(legacy.data, original);
  assert.equal(slotSummary(loaded.data.slots[0])?.batch, 1);
  await assert.rejects(() => loaded.put(3, original));
});

void test('malformed catalogs fail closed instead of overwriting a recovery', async () => {
  const legacy = new MemorySaveBackend('original'),
    disk = new MemorySaveBackend('{bad');
  const slots = new SaveSlots(new SaveService(disk), new SaveService(legacy));
  await assert.rejects(() => slots.load());
  assert.equal(disk.data, '{bad');
  assert.equal(legacy.data, 'original');
});

void test('funds remain save-safe at release while the visible counter waits for physical impact', () => {
  const m = new GameModel();
  const t = m.loot.find((t) => !t.story)!;
  t.state = 'freed';
  m.credit(t);
  assert.ok(m.money > 0);
  assert.equal(m.snapshot().visibleMoney, 0);
  const restored = new GameModel(m.serialize());
  assert.equal(restored.money, m.money);
  assert.equal(restored.snapshot().visibleMoney, m.money);
  t.state = 'landed';
  assert.equal(m.snapshot().visibleMoney, m.money);
});

void test('a released tool completes its return during idle time and is ready for the next tap', () => {
  const m = new GameModel();
  m.strikeClock = 0.44;
  for (let i = 0; i < 30; i++) m.update(1 / 60, null);
  assert.equal(m.strikeClock, 0);
  m.strikeClock = 1;
  m.restart();
  assert.equal(m.strikeClock, 0);
  m.strikeClock = 1;
  m.restore(m.serialize());
  assert.equal(m.strikeClock, 0);
});

void test('failed slot writes preserve the last usable in-memory and on-disk catalog', async () => {
  const raw = new GameModel().serialize();
  const backend = {
    load: async () => null,
    save: async () => {
      throw Error('Quota');
    },
  };
  const slots = new SaveSlots(
    new SaveService(backend),
    new SaveService(new MemorySaveBackend(raw)),
  );
  await slots.load();
  await assert.rejects(() => slots.clear(0));
  assert.equal(slots.data.slots[0].raw, raw);
});
