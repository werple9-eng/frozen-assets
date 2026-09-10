import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { legacyCargoLoot } from '../lib/game/legacy-cargo';

function fixture(block = 0, phase = 0, version = 4) {
  const m = new GameModel();
  const c = m.campaign!;
  m.round = c.state.block = block;
  c.state.phase = phase;
  c.state.layoutVersion = 2;
  c.state.pending = [];
  c.state.call = undefined;
  m.field = campaignField(block, phase, undefined, 2);
  m.loot = campaignLoot(block, phase, 2);
  m.field.carveLoot(m.loot);
  m.money = c.credit(5000, 'prior-account-credit');
  m.earned = 5000;
  c.state.blockGross = c.state.blockFee = 0;
  c.state.tools = ['hand', 'grip', 'pick'];
  c.state.selected = 'pick';
  m.revealedTools = ['hand', 'pick'];
  assert.equal(m.purchaseNode('IP-P1', 1000), true);
  assert.equal(m.credit(m.loot[0]), true);
  m.loot[0].state = 'collected';
  m.settings.master = 0.37;
  const original = JSON.parse(m.serialize());
  original.version = version;
  if (version < 5) {
    original.ice = Array.from(m.field.values);
    delete original.field;
  }
  return { m, raw: original };
}
function metadata(m: GameModel, source: GameModel) {
  assert.equal(m.saveStatus, 'saved');
  assert.equal(m.money, source.money);
  assert.equal(m.earned, source.earned);
  assert.equal(m.recovered, source.recovered);
  assert.deepEqual(m.nodes, source.nodes);
  assert.deepEqual(m.toolUpgrades, source.toolUpgrades);
  assert.equal(m.settings.master, source.settings.master);
  const {
    layoutVersion: _oldLayout,
    phase: _oldPhase,
    ...oldState
  } = source.campaign!.state;
  const {
    layoutVersion: newLayout,
    phase: _newPhase,
    ...newState
  } = m.campaign!.state;
  assert.equal(newLayout, 3);
  assert.deepEqual(newState, JSON.parse(JSON.stringify(oldState)));
}

void test('v3 and v4 campaign fields resample real world-space holes into the new grid without losing paid cargo', () => {
  for (const version of [3, 4]) {
    const { m: source, raw } = fixture(0, 0, version);
    const target = campaignField(0, 0, undefined, 3);
    target.carveLoot(source.loot);
    const point = source.field.points.find(
      (p, i) =>
        source.field.values[i] > 0.95 &&
        target.density(p) > 0.95 &&
        Math.abs(p.x) < 1.7 &&
        p.y > 0.45 &&
        p.y < 2.3,
    )!;
    assert.ok(point);
    const initial = target.density(point);
    source.field.strikeAt(
      point,
      1.3,
      0.62,
      { center: 1, depth: 1, weak: 1, support: 1, detach: 1 },
      { x: 0, y: 1, z: 0 },
    );
    raw.ice = Array.from(source.field.values);
    const migrated = new GameModel(JSON.stringify(raw));
    metadata(migrated, source);
    assert.equal(migrated.field.grid.legacy, false);
    assert.equal(migrated.field.grid.cellSize, 0.3);
    assert.equal(migrated.field.values.length, 2376);
    assert.ok(
      migrated.field.density(point) < initial * 0.75,
      'the cut is sampled at its real world position',
    );
    assert.deepEqual(
      migrated.loot.map((t) => [t.id, t.value, t.credited]),
      source.loot.map((t) => [t.id, t.value, t.credited]),
    );
    assert.match(migrated.saveDiagnostics[0], /migrated in world space/);
    const saved = JSON.parse(migrated.serialize());
    assert.equal(saved.version, 5);
    assert.equal(saved.legacyCargo.sourceLayoutVersion, 2);
    assert.equal(saved.legacyCargo.repacked, false);
    let reloaded = migrated;
    const frozen = saved.field.density;
    for (let cycle = 0; cycle < 10; cycle++) {
      reloaded = new GameModel(reloaded.serialize());
      metadata(reloaded, source);
      assert.equal(reloaded.saveDiagnostics.length, 0);
      assert.equal(JSON.parse(reloaded.serialize()).field.density, frozen);
      assert.equal(reloaded.credit(reloaded.loot[0]), false);
    }
  }
});

void test('unsafe size/profile migrations restart only active ice, keep identities and add missing final evidence', () => {
  const { m: source, raw } = fixture(4, 1);
  assert.equal(
    source.loot.some((t) => t.story === 'tag'),
    false,
  );
  const migrated = new GameModel(JSON.stringify(raw));
  metadata(migrated, source);
  assert.equal(migrated.campaign!.state.phase, 1);
  assert.match(
    migrated.saveDiagnostics[0],
    /Current delivery regenerated during legacy migration/,
  );
  assert.equal(migrated.field.grid.legacy, false);
  const record = JSON.parse(migrated.serialize()).legacyCargo;
  assert.equal(record.repacked, true);
  assert.equal(record.sourcePhase, 1);
  assert.deepEqual(
    migrated.loot
      .slice(0, source.loot.length)
      .map((t) => [t.id, t.value, t.credited]),
    source.loot.map((t) => [t.id, t.value, t.credited]),
  );
  const tag = migrated.loot.find((t) => t.story === 'tag');
  assert.ok(tag);
  assert.equal(tag.value, 0);
  assert.ok(
    migrated.loot
      .filter((t) => !t.credited)
      .every((t) => migrated.field.solidIntersectionCount(t) > 0),
  );
  const canonical = legacyCargoLoot(record);
  assert.deepEqual(
    migrated.loot.map((t) => [t.id, t.x, t.y, t.z]),
    canonical.map((t) => [t.id, t.x, t.y, t.z]),
  );
  const repeat = new GameModel(migrated.serialize());
  assert.equal(repeat.money, source.money);
  assert.equal(repeat.loot.filter((t) => t.story === 'tag').length, 1);
  assert.equal(repeat.credit(repeat.loot[0]), false);
});

void test('malformed old campaign density preserves valid account state and resets only the current physical phase', () => {
  const { m: source, raw } = fixture(0, 2);
  raw.ice = [NaN, 2];
  const migrated = new GameModel(JSON.stringify(raw));
  metadata(migrated, source);
  assert.equal(migrated.campaign!.state.phase, 0);
  assert.match(migrated.saveDiagnostics[0], /invalid-source-density/);
  assert.ok(migrated.field.remaining() > 0);
  const paid = migrated.loot[0].id,
    money = migrated.money;
  assert.equal(migrated.credit(migrated.loot[0]), false);
  assert.equal(migrated.money, money);
  assert.equal(
    migrated.campaign!.state.rewards.filter((id) => id === paid).length,
    1,
  );
  const repeated = new GameModel(migrated.serialize());
  assert.equal(repeated.saveStatus, 'saved');
  assert.equal(repeated.campaign!.state.layoutVersion, 3);
  assert.equal(repeated.money, money);
});

void test('compact historical-layout saves also migrate and a legacy ledger maps to the new precision finale', () => {
  const { m: source, raw } = fixture(31, 2, 5);
  const migrated = new GameModel(JSON.stringify(raw));
  metadata(migrated, source);
  assert.equal(migrated.campaign!.state.phase, 4);
  assert.equal(migrated.field.spec?.phaseId, 'ledger-cradle');
  assert.equal(migrated.loot.filter((t) => t.story === 'ledger').length, 1);
  assert.equal(
    migrated.loot.find((t) => t.story === 'ledger')!.id,
    source.loot.find((t) => t.story === 'ledger')!.id,
  );
  assert.match(
    migrated.saveDiagnostics[0],
    /regenerated during legacy migration/,
  );
  const reloaded = new GameModel(migrated.serialize());
  assert.equal(reloaded.campaign!.state.phase, 4);
  assert.equal(reloaded.money, source.money);
  assert.equal(reloaded.saveDiagnostics.length, 0);
});

void test('active legacy cargo metadata expires when a fresh start replaces its loot at the same block and phase', () => {
  const { raw } = fixture();
  const migrated = new GameModel(JSON.stringify(raw));
  assert.ok(JSON.parse(migrated.serialize()).legacyCargo);
  migrated.restart();
  assert.equal(migrated.campaign!.state.block, 0);
  assert.equal(migrated.campaign!.state.phase, 0);
  assert.equal(JSON.parse(migrated.serialize()).legacyCargo, undefined);
  const restored = new GameModel(migrated.serialize());
  assert.equal(restored.saveStatus, 'saved');
  assert.deepEqual(
    restored.loot.map((t) => t.id),
    migrated.loot.map((t) => t.id),
  );
});
