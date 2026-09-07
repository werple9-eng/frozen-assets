import assert from 'node:assert/strict';
import { test } from 'node:test';
import { GameModel, UPGRADES, layout, type Upgrade } from '../lib/game/model';
import { IceField, surface } from '../lib/game/ice';
import { TUNE } from '../lib/game/tuning';
import { TrayRotation } from '../lib/game/rotation';
import { SKILLS, skillState } from '../lib/game/skills';
import { TreePan } from '../lib/game/pan';
import { COSTS } from '../lib/game/progression';
const tick = (g: GameModel, seconds: number) => {
  for (let i = 0; i < seconds * 60; i++) g.update(1 / 60, null);
};
const freeAll = (g: GameModel) => {
  g.field.values.fill(0);
  g.field.dirty = true;
  tick(g, 0.2);
};

test('physical ice and treasure are enlarged without changing save topology', () => {
  const g = new GameModel();
  assert.equal(g.field.values.length, 23 * 14 * 15);
  assert.equal(g.loot[0].w, 0.58 * TUNE.worldScale);
  const xs = g.field.points
    .filter((_, i) => g.field.values[i] > 0.5)
    .map((p) => p.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 10.7);
  const oldSave = JSON.parse(g.serialize());
  oldSave.version = 3;
  oldSave.money = 35;
  oldSave.earned = 35;
  oldSave.ice[1000] = 0.61;
  const h = new GameModel(JSON.stringify(oldSave));
  assert.equal(h.money, 35);
  assert.ok(Math.abs(h.field.values[1000] - 0.61) < 0.00001);
});
test('skill fittings enforce prerequisites, stale selections and atomic spending', () => {
  const g = new GameModel();
  g.money = g.earned = 10000;
  g.pause();
  assert.equal(g.purchaseSkill('heat-4', 1000), false);
  assert.equal(g.purchaseSkill('missing', 1000), false);
  assert.equal(g.money, 10000);
  assert.equal(g.purchaseSkill('heat-1', 1000), true);
  assert.equal(g.purchaseSkill('heat-1', 1400), false);
  assert.equal(g.money, 9975);
  assert.equal(
    skillState(
      SKILLS.find((n) => n.id === 'heat-2')!,
      g.upgrades,
    ),
    'available',
  );
  assert.equal(
    skillState(
      SKILLS.find((n) => n.id === 'heat-3')!,
      g.upgrades,
    ),
    'locked',
  );
  assert.equal(g.purchaseSkill('wide-1', 1400), true);
  assert.equal(g.selectMode('wide'), true);
  assert.equal(g.purchaseSkill('heat-2', 1800), true);
  const saved = new GameModel(g.serialize());
  assert.equal(saved.money, 9810);
  assert.deepEqual(saved.upgrades, g.upgrades);
  assert.equal(
    skillState(
      SKILLS.find((n) => n.id === 'heat-2')!,
      saved.upgrades,
    ),
    'purchased',
  );
  assert.equal(saved.mode, 'wide');
});

test('new comfort preferences round-trip and old saves receive safe defaults', () => {
  const g = new GameModel();
  g.setSetting('reducedMotion', true);
  g.setSetting('rotationSensitivity', 0.8);
  const h = new GameModel(g.serialize());
  assert.equal(h.settings.reducedMotion, true);
  assert.equal(h.settings.rotationSensitivity, 0.8);
  const old = JSON.parse(g.serialize());
  delete old.settings.rotationSensitivity;
  delete old.settings.reducedMotion;
  const legacy = new GameModel(JSON.stringify(old));
  assert.equal(legacy.settings.reducedMotion, false);
  assert.equal(legacy.settings.rotationSensitivity, 0.5);
});

test('turntable accelerates, carries small momentum, settles, and never flips', () => {
  const r = new TrayRotation();
  r.begin();
  r.move(200, 100000);
  assert.equal(r.yaw, 0);
  r.update(1 / 60);
  assert.ok(r.yaw > 0 && r.yaw < r.targetYaw);
  for (let i = 0; i < 8; i++) r.update(1 / 60);
  const target = r.targetYaw;
  r.end();
  assert.ok(r.targetYaw > target);
  for (let i = 0; i < 360; i++) r.update(1 / 60);
  assert.ok(Math.abs(r.yaw - r.targetYaw) < 0.0001);
  assert.ok(Math.abs(r.velocity) < 0.001);
  assert.ok(Math.abs(r.tilt) <= TUNE.rotationTiltLimit);
  r.begin();
  r.move(-300, -100000);
  r.cancel();
  assert.equal(r.velocity, 0);
  assert.equal(r.dragging, false);
  assert.equal(r.targetYaw, r.yaw);
  r.home();
  for (let i = 0; i < 360; i++) r.update(1 / 60);
  assert.ok(Math.abs(Math.sin(r.yaw)) < 0.00001);
  assert.ok(Math.abs(r.tilt) < 0.00001);
});
test('upgrade menu purchases work while paused without advancing the simulation', () => {
  const g = new GameModel();
  g.money = 315;
  g.earned = 315;
  g.pause();
  const fuel = g.fuel,
    ice = Array.from(g.field.values);
  assert.equal(g.purchase('heat', 1000), true);
  assert.equal(g.purchase('heat', 1001), false);
  assert.equal(g.money, 290);
  assert.equal(g.phase, 'paused');
  tick(g, 5);
  assert.equal(g.fuel, fuel);
  assert.deepEqual(Array.from(g.field.values), ice);
  g.pause(false);
  assert.equal(g.firing, false);
  assert.equal(g.upgrades.heat, 1);
  g.refill();
  g.pause();
  assert.equal(g.purchase('heat', 2000), false);
});

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
  assert.equal(g.money, 10);
  assert.equal(g.upgrades.heat, 1);
  assert.equal(g.purchase('heat', 1101), false);
  g.money = 100000;
  g.earned = 100035;
  for (const key of Object.keys(UPGRADES) as Upgrade[])
    for (let i = 0; i < 15; i++)
      g.purchase(
        key,
        2000 + Object.keys(UPGRADES).indexOf(key) * 10000 + i * 300,
      );
  for (const key of Object.keys(UPGRADES) as Upgrade[])
    assert.equal(g.upgrades[key], UPGRADES[key].costs.length);
  assert.ok(g.money >= 0);
});
test('first heat step increases actual local removal by 14 percent', () => {
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
  assert.ok(Math.abs(db / da - 1.14) < 0.001);
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

test('old equipment migrates once without reducing power, fuel, money or thaw', () => {
  const g = new GameModel();
  const raw = JSON.parse(g.serialize());
  delete raw.progression;
  raw.upgrades = { heat: 2, tank: 2, residual: 2, wide: 1 };
  raw.fuel = 155;
  raw.money = 245;
  raw.earned = 3000;
  raw.ice[900] = 0.42;
  const migrated = new GameModel(JSON.stringify(raw));
  assert.equal(migrated.saveStatus, 'saved');
  assert.deepEqual(migrated.upgrades, {
    heat: 7,
    tank: 6,
    residual: 6,
    wide: 1,
  });
  assert.equal(migrated.power, TUNE.heat * 2.3);
  assert.equal(migrated.capacity, 155);
  assert.equal(migrated.residual, 2);
  assert.equal(migrated.money, 245);
  assert.ok(Math.abs(migrated.field.values[900] - 0.42) < 0.00001);
  const reload = new GameModel(migrated.serialize());
  assert.deepEqual(reload.upgrades, migrated.upgrades);
});
test('tree provides 42 unique steps, four opening choices and a longer cost curve', () => {
  assert.equal(SKILLS.length, 42);
  assert.equal(new Set(SKILLS.map((n) => n.id)).size, 42);
  const g = new GameModel();
  assert.equal(
    SKILLS.filter((n) => skillState(n, g.upgrades) === 'available').length,
    4,
  );
  assert.ok(
    Object.values(COSTS)
      .flat()
      .reduce((a, b) => a + b, 0) > 50000,
  );
  for (const n of SKILLS) {
    assert.ok(COSTS[n.key][n.level - 1] > 0);
    if (n.parent !== 'torch')
      assert.ok(
        SKILLS.some((p) => p.id === n.parent && p.level === n.level - 1),
      );
  }
});
test('fuel and torch milestones alter real simulation and respect pause', () => {
  const g = new GameModel();
  g.upgrades.tank = 8;
  g.fuel = 10;
  tick(g, 2);
  assert.ok(g.fuel > 13.9);
  g.pause();
  const fuel = g.fuel;
  tick(g, 3);
  assert.equal(g.fuel, fuel);
  g.pause(false);
  g.upgrades.heat = 8;
  g.press();
  const point = { x: 0, y: 2, z: 0 };
  let bursts = 0;
  g.onBurst = () => bursts++;
  for (let i = 0; i < 100; i++) g.update(1 / 60, point);
  assert.ok(g.focusTime > 1.2);
  assert.ok(bursts > 0);
  g.stop();
  assert.equal(g.focusTime, 0);
  g.fuel = 0;
  g.nextBlock();
  assert.equal(g.fuel, g.capacity * 0.2);
  g.upgrades.wide = 5;
  g.selectMode('wide');
  assert.ok(g.radius > TUNE.wideRadius);
  assert.ok(Number.isFinite(g.power));
});
test('tree panning has bounded inertia, settles, and cancels cleanly', () => {
  const p = new TreePan();
  p.minX = -500;
  p.maxX = 500;
  p.minY = -600;
  p.maxY = 600;
  p.begin();
  p.drag(100, 60, 0.016);
  assert.equal(p.x, 100);
  p.end();
  p.update(0.016);
  assert.ok(p.x > 100);
  for (let i = 0; i < 600; i++) p.update(1 / 60);
  assert.equal(p.vx, 0);
  assert.equal(p.vy, 0);
  assert.ok(p.x < 190);
  p.begin();
  p.drag(1e6, -1e6, 0.01);
  p.end();
  for (let i = 0; i < 10; i++) p.update(0.03);
  assert.equal(p.x, 500);
  assert.equal(p.y, -600);
  p.cancel();
  assert.equal(p.vx, 0);
  assert.equal(p.dragging, false);
});
