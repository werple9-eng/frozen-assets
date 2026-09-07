import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameModel, UPGRADES, layout, type Upgrade } from '../lib/game/model';
import { IceField, surface } from '../lib/game/ice';
import { TUNE } from '../lib/game/tuning';
const tick = (g: GameModel, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60, null);
};
const freeAll = (g: GameModel) => {
  g.field.values.fill(0);
  g.field.dirty = true;
  tick(g, 0.2);
};

test('rewards are immediate, exactly once, and reject stale identities', () => {
  const g = new GameModel(),
    t = g.loot[0];
  g.field.values.fill(0);
  tick(g, 0.2);
  assert.equal(g.money, 70);
  assert.equal(g.recovered, 2);
  assert.equal(g.credit(t), false);
  g.restart();
  assert.equal(g.credit(t), false);
  assert.equal(g.money, 0);
});
test('purchases are atomic, affordable, bounded, and debounced', () => {
  const g = new GameModel();
  assert.equal(g.purchase('heat', 1000), false);
  g.money = 35;
  g.earned = 35;
  assert.equal(g.purchase('heat', 1100), true);
  assert.equal(g.money, 0);
  assert.equal(g.upgrades.heat, 1);
  assert.equal(g.purchase('heat', 1101), false);
  g.money = 100000;
  g.earned = 100035;
  for (const key of Object.keys(UPGRADES) as Upgrade[])
    for (let i = 0; i < 8; i++)
      g.purchase(
        key,
        2000 + Object.keys(UPGRADES).indexOf(key) * 10000 + i * 300,
      );
  for (const key of Object.keys(UPGRADES) as Upgrade[])
    assert.equal(g.upgrades[key], UPGRADES[key].costs.length);
  assert.ok(g.money >= 0);
});
test('heat upgrade changes comparable local removal by 65 percent', () => {
  const a = new GameModel(),
    b = new GameModel();
  b.upgrades.heat = 1;
  const p = { x: 0, y: 1.7, z: 0.9 };
  a.field.melt(p, 0.1, a.power, a.radius);
  b.field.melt(p, 0.1, b.power, b.radius);
  const initial = new GameModel();
  let da = 0,
    db = 0;
  for (let i = 0; i < a.field.values.length; i++) {
    da += initial.field.values[i] - a.field.values[i];
    db += initial.field.values[i] - b.field.values[i];
  }
  assert.ok(Math.abs(db / da - 1.65) < 0.001);
});
test('fuel only drains while firing, including empty space; refill preserves thaw and money', () => {
  const g = new GameModel();
  const ice = Array.from(g.field.values);
  tick(g, 2);
  assert.equal(g.fuel, 75);
  g.press();
  tick(g, 1);
  assert.ok(Math.abs(g.fuel - 74) < 0.01);
  g.fuel = 0.01;
  tick(g, 0.1);
  assert.equal(g.fuel, 0);
  assert.equal(g.firing, false);
  g.money = 35;
  assert.equal(g.refill(), true);
  assert.equal(g.fuel, 75);
  assert.deepEqual(Array.from(g.field.values), ice);
  assert.equal(g.money, 35);
  assert.equal(g.phase, 'refilling');
  tick(g, 0.4);
  assert.equal(g.phase, 'playing');
});
test('pause and input cancellation require fresh firing input, including toggle mode', () => {
  const g = new GameModel();
  g.settings.toggle = true;
  g.press();
  assert.ok(g.firing);
  g.pause();
  assert.equal(g.firing, false);
  const fuel = g.fuel;
  tick(g, 1);
  assert.equal(g.fuel, fuel);
  g.pause(false);
  assert.equal(g.firing, false);
  g.press();
  assert.ok(g.firing);
  g.stop();
  assert.equal(g.firing, false);
  g.press();
  g.press();
  assert.equal(g.firing, false);
});
test('pause preserves in-progress refill and transition state', () => {
  const g = new GameModel();
  g.refill();
  g.pause();
  tick(g, 1);
  g.pause(false);
  assert.equal(g.phase, 'refilling');
  tick(g, 0.4);
  assert.equal(g.phase, 'playing');
  freeAll(g);
  tick(g, 1.3);
  assert.ok(g.round >= 1);
});
test('collection survives fuel exhaustion and menu pauses', () => {
  const g = new GameModel();
  g.fuel = 0.001;
  g.press();
  freeAll(g);
  assert.equal(g.money, 70);
  g.pause();
  tick(g, 4);
  assert.equal(g.money, 70);
  g.pause(false);
  tick(g, 1.5);
  assert.equal(g.money, 70);
  assert.equal(g.round, 1);
});
test('save/load retains partial thaw, settings, mode and purchases', () => {
  const g = new GameModel();
  g.field.melt({ x: 0, y: 1.7, z: 0.9 }, 0.15, g.power, g.radius);
  g.upgrades.wide = 1;
  g.selectMode('wide');
  g.settings.master = 0.22;
  const h = new GameModel(g.serialize());
  assert.equal(h.mode, 'wide');
  assert.equal(h.settings.master, 0.22);
  assert.equal(h.field.remaining(), g.field.remaining());
  assert.ok(h.field.values.some((v) => v > 0 && v < 0.9));
  assert.equal(h.firing, false);
});
test('reload during landing cannot award collected items again', () => {
  const g = new GameModel();
  freeAll(g);
  const h = new GameModel(g.serialize());
  assert.equal(h.money, 70);
  assert.ok(h.loot.every((t) => t.state === 'collected'));
  tick(h, 2);
  assert.equal(h.money, 70);
  assert.equal(h.round, 1);
});
test('missing, invalid, old, NaN and malformed saves start safely', () => {
  for (const raw of [
    'bad',
    '{}',
    'null',
    '{"version":1}',
    JSON.stringify({ ...JSON.parse(new GameModel().serialize()), fuel: -1 }),
    JSON.stringify({ ...JSON.parse(new GameModel().serialize()), ice: [1, 2] }),
  ]) {
    const g = new GameModel(raw);
    assert.equal(g.round, 0);
    assert.equal(g.money, 0);
    assert.equal(g.fuel, 75);
    assert.ok(g.field.remaining() > 0);
  }
});
test('nozzle choices are reversible, gated and cancel firing', () => {
  const g = new GameModel();
  assert.equal(g.selectMode('wide'), false);
  g.upgrades.wide = 1;
  g.press();
  assert.equal(g.selectMode('wide'), true);
  assert.equal(g.firing, false);
  assert.ok(g.radius > TUNE.radius);
  const widePower = g.power;
  g.selectMode('precision');
  assert.ok(g.power > widePower);
  assert.equal(g.selectMode('bogus'), false);
});
test('restart clears pending loot, thaw, heat, state and reward timers', () => {
  const g = new GameModel();
  freeAll(g);
  g.field.warmth.fill(1);
  g.pause();
  g.notify('old');
  g.restart();
  tick(g, 2);
  assert.equal(g.money, 0);
  assert.equal(g.recovered, 0);
  assert.equal(g.round, 0);
  assert.equal(g.phase, 'playing');
  assert.equal(g.message, '');
  assert.ok(g.field.warmth.every((v) => v === 0));
  assert.ok(g.loot.every((t) => !t.credited));
});
test('cutting the cluster pedestal detaches its entire supported cap', () => {
  const f = new IceField(2);
  const before = f.remaining();
  for (let i = 0; i < f.values.length; i++)
    if (f.points[i].y > 0.72 && f.points[i].y < 1.22) f.values[i] = 0;
  const pieces = f.detach();
  assert.ok(pieces.length > 0 && pieces.length <= TUNE.fragmentCap);
  assert.ok(f.remaining() < before * 0.2);
  for (let i = 0; i < f.values.length; i++)
    if (f.points[i].y > 1.22) assert.ok(f.values[i] <= 0.5);
});
test('all authored layouts have stable unique identities and recoverable contents', () => {
  for (let round = 0; round < 24; round++) {
    const loot = layout(round),
      f = new IceField(round);
    assert.equal(new Set(loot.map((t) => t.id)).size, loot.length);
    assert.ok(loot.every((t) => t.value > 0 && t.y > TUNE.baseY));
    f.values.fill(0);
    assert.ok(loot.every((t) => f.canRelease(t)));
  }
});
test('all 20 rounds complete, ending persists, continue and restart work', () => {
  const g = new GameModel();
  let expected = 0;
  for (let round = 0; round < 20; round++) {
    assert.equal(g.round, round);
    expected += g.loot.reduce((a, t) => a + t.value, 0);
    freeAll(g);
    tick(g, 2);
  }
  assert.equal(g.phase, 'completed');
  assert.equal(g.earned, expected);
  const h = new GameModel(g.serialize());
  assert.equal(h.phase, 'completed');
  h.continuePlaying();
  assert.equal(h.round, 20);
  assert.equal(h.phase, 'playing');
  assert.equal(h.money, expected);
  h.restart();
  assert.equal(h.round, 0);
  assert.equal(h.money, 0);
});
test('meshing follows the authoritative field and produces finite triangles', () => {
  const f = new IceField();
  const before = surface(f);
  assert.ok(before.positions.length > 0);
  f.melt({ x: 0, y: 1.7, z: 0 }, 0.3, 3, 0.8);
  const after = surface(f);
  assert.ok(after.positions.every(Number.isFinite));
  assert.equal(after.positions.length % 9, 0);
  assert.equal(after.positions.length, after.colors.length);
  assert.notDeepEqual(after.positions, before.positions);
  f.values.fill(0);
  assert.equal(surface(f).positions.length, 0);
});
