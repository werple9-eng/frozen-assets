import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { IceField } from '../lib/game/ice';
import { tutorialField, tutorialLoot } from '../lib/game/tutorial';
import { forceTutorialStep } from '../lib/game/tutorial-qa';
import type { Loot } from '../lib/game/tuning';

// Leave a detached roof inside the old tutorial exposure halo, with a genuine
// air gap above the coin. The old percentage/top-cover rule held this forever.
function leaveDistantRoof(field: IceField, item: Loot) {
  const gap = field.grid.cellSize * 1.1;
  field.points.forEach((p, i) => {
    if (p.y < item.y + item.h / 2 + gap) field.values[i] = 0;
  });
  field.revision++;
  field.markAllDirty();
}

void test('tutorial cargo releases with no contact even when nearby roof ice remains', () => {
  for (const block of [1, 2] as const) {
    const field = tutorialField(block),
      item = tutorialLoot(block)[0];
    field.carveLoot([item]);
    assert.equal(
      field.canRelease(item),
      false,
      'ice initially touches the coin',
    );
    leaveDistantRoof(field, item);
    if (block === 2)
      assert.ok(
        field.exposure(item).topCover > 0.12,
        'reproduces the old roof lock',
      );
    const before = field.values.slice();
    assert.equal(field.canRelease(item), true);
    assert.deepEqual(
      field.values,
      before,
      'release checks never erase extra ice',
    );
  }
});

void test('clearing the final contact starts gravity and credits on the very next update', () => {
  const m = new GameModel();
  forceTutorialStep(m, 3);
  m.tutorialStep(4);
  const item = m.loot[0];
  m.update(0.001, null); // establish the previous release revision
  assert.equal(item.state, 'embedded');
  leaveDistantRoof(m.field, item);
  const y = item.y,
    money = m.money;
  m.update(0.001, null); // far shorter than the periodic connectivity check
  assert.equal(item.state, 'freed');
  assert.ok(item.y < y);
  assert.ok(item.vy < 0);
  assert.equal(item.credited, true);
  assert.ok(m.money > money);
  const creditedMoney = m.money;
  const reloaded = new GameModel(m.serialize());
  reloaded.update(0.001, null);
  assert.equal(
    reloaded.money,
    creditedMoney,
    'an in-flight reload cannot pay twice',
  );
});

void test('an opened campaign pocket releases without clearing its distant roof and walls', () => {
  const field = new IceField(0, undefined, undefined, {
    profile: 'parcel',
    dimensions: { width: 6, height: 4, depth: 5 },
    deliveryId: 'contact-regression',
    phaseId: 'one',
  });
  const item: Loot = {
    id: 'cash',
    kind: 'cash',
    value: 200,
    x: 0,
    y: 1.68,
    z: 0,
    w: 0.78,
    h: 0.22,
    d: 0.48,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  };
  field.carveLoot([item]);
  assert.equal(
    field.canRelease(item),
    false,
    'a sealed pocket is still encased',
  );
  for (let z = 2.55; z >= 0.25; z -= 0.25)
    field.strikeAt(
      { x: 0, y: item.y, z },
      4,
      0.72,
      { center: 1, depth: 1, weak: 1, support: 1, detach: 1 },
      { x: 0, y: 0, z: 1 },
    );
  assert.equal(field.exposure(item).topCover, 1);
  assert.ok(field.remaining() > 0.5);
  assert.equal(
    field.canRelease(item),
    true,
    'an air gap cannot act as a restraint',
  );
});

void test('actual mesh contact holds cargo until that final surface clears', () => {
  const field = tutorialField(1),
    item = tutorialLoot(1)[0];
  field.values.fill(0);
  // A probe at the coin underside: only real ice at that point can hold it.
  const contact = { x: 0, y: -item.h / 2, z: 0 };
  const world = { x: item.x, y: item.y + contact.y, z: item.z };
  field.points.forEach((p, i) => {
    if (
      Math.hypot(p.x - world.x, p.y - world.y, p.z - world.z) <
      field.grid.cellSize * 2
    )
      field.values[i] = 1;
  });
  assert.equal(field.canRelease(item, [contact]), false);
  field.values.fill(0);
  field.revision++;
  assert.equal(field.canRelease(item, [contact]), true);
});

void test('loading a tutorial save with already-cleared suspended cargo recovers it without another hit', () => {
  const m = new GameModel();
  forceTutorialStep(m, 12);
  const item = m.loot[0];
  leaveDistantRoof(m.field, item);
  assert.equal(item.state, 'embedded', 'save the old stuck state before updating');
  const restored = new GameModel(m.serialize());
  const target = restored.loot.find((t) => t.id === item.id)!;
  const strikes = restored.strikeSerial;
  restored.update(0.001, null);
  assert.equal(target.credited, true);
  assert.notEqual(target.state, 'embedded');
  assert.equal(restored.strikeSerial, strikes, 'recovery requires no extra strike');
  const money = restored.money;
  restored.update(0.001, null);
  assert.equal(restored.money, money);
});
