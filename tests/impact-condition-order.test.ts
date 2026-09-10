import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { IceField } from '../lib/game/ice';
import { STORY } from '../lib/game/campaign-content';
import type { Loot } from '../lib/game/tuning';

void test('a broad blow checks newly visible cargo before freezing its recovery grade', () => {
  const model = new GameModel();
  model.campaign!.state.flags = STORY.map((event) => event.id);
  model.campaign!.state.pending = [];
  model.campaign!.state.tools = ['hand', 'sledge'];
  model.campaign!.state.selected = 'sledge';
  model.revealedTools = ['hand', 'sledge'];
  model.toolNotices = ['available:sledge', 'ready:sledge'];
  const item: Loot = {
    id: 'impact-order-cash',
    kind: 'cash',
    value: 200,
    x: 0,
    y: 1.08,
    z: 0,
    w: 0.78,
    h: 0.22,
    d: 0.48,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  };
  model.field = new IceField(
    0,
    undefined,
    { scale: 1, shape: 'parcel' },
    {
      profile: 'parcel',
      dimensions: { width: 2.7, height: 2.4, depth: 2.7 },
      deliveryId: 'condition-impact-order',
      phaseId: 'one',
    },
  );
  model.loot = [item];
  model.field.carveLoot(model.loot);
  assert.equal(model.field.exposure(item).exposed, 0);
  assert.equal(model.field.canRelease(item), false);
  model.press();
  for (let frame = 0; frame < 120 && !model.strikeSerial; frame++)
    model.update(1 / 60, { x: 0, y: 1.08, z: 0.75 });
  assert.equal(model.strikeSerial, 1);
  assert.ok(model.field.exposure(item).exposed >= 0.2);
  assert.ok(item.condition! < 100, 'the very first opening blow must count');
  model.stop();
  model.field.strikeAt(item, 10, 3, {
    center: 1,
    depth: 1,
    weak: 1,
    support: 1,
    detach: 1,
  });
  model.update(1 / 60, null);
  assert.equal(item.credited, true);
  assert.equal(item.conditionLocked, true);
  assert.ok(
    item.finalCondition! < 100,
    'the opening impact must count before physical release',
  );
  assert.ok(
    item.finalValue! >= item.value,
    'the listed value remains guaranteed',
  );
  const locked = item.finalCondition;
  for (let frame = 0; frame < 30; frame++)
    model.update(1 / 60, { x: 0, y: 0.78, z: 0.45 });
  assert.equal(item.finalCondition, locked);
});
