import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { StrikeCycle, strikePose } from '../lib/game/strike';
import { ToolFollow } from '../lib/game/tool-follow';
import { TreePan } from '../lib/game/pan';
import { Quaternion, Vector3 } from 'three';
import { IceField, surface } from '../lib/game/ice';
import type { Loot } from '../lib/game/tuning';
import { meshContactSamples } from '../lib/game/mesh-contact';
import { Mesh, CylinderGeometry, MeshBasicMaterial } from 'three';
import {
  ALL_TOOL_NODES,
  TOOL_TREES,
  TOOL_ORDER,
  MAP,
  nodeState,
  toolEffects,
} from '../lib/game/tool-trees';
import { TOOLS, blockSpec } from '../lib/game/campaign-content';
import {
  TOOL_TREES as OLD_TREES,
  toolEffects as oldEffects,
} from '../lib/game/legacy-tree';
import {
  migrateTreeV1,
  migrateTreeV2,
  carriedEffects,
} from '../lib/game/tree-migration';
import {
  TOOL_TREES as V2_TREES,
  toolEffects as v2Effects,
} from '../lib/game/legacy-tree-v2';
import { confirmationSample } from '../lib/game/purchase-sound';
import {
  growthPlan,
  connectedNode,
  tooltipPosition,
  TREE_GROWTH,
} from '../lib/game/tree-presentation';

void test('purchase growth reveals only the changed branch after its incoming path completes', () => {
  const growth = growthPlan('pick', 'IP-P1', []);
  assert.deepEqual(growth, [
    { id: 'IP-P2', from: 'locked', to: 'available', child: true },
    { id: 'IP-P3', from: 'unknown', to: 'locked', child: false },
  ]);
  assert.ok(
    TREE_GROWTH.revealAt >= TREE_GROWTH.pathDelay + TREE_GROWTH.pathDuration,
  );
  assert.deepEqual(growthPlan('pick', 'IP-P3', ['IP-P1', 'IP-P2']), []);
});

void test('directional navigation follows connected edges on every authored tool map', () => {
  for (const tool of TOOL_ORDER) {
    for (const n of TOOL_TREES[tool]) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const next = connectedNode(tool, n.id, dx, dy);
        if (next)
          assert.ok(
            n.parentIds.includes(next) ||
              (next === 'root' && n.rank === 1) ||
              TOOL_TREES[tool]
                .find((q) => q.id === next)
                ?.parentIds.includes(n.id),
          );
      }
    }
  }
});

void test('inspection chooses an unoccupied side and stays inside a small viewport', () => {
  const selected = { x: 400, y: 350 },
    neighbor = { x: 525, y: 350 };
  const pos = tooltipPosition(
    selected,
    [neighbor],
    { w: 240, h: 190 },
    { w: 800, h: 700 },
    40,
  );
  assert.ok(
    pos.x + 240 < selected.x - 40 ||
      pos.y + 190 < selected.y - 40 ||
      pos.y > selected.y + 40,
  );
  for (const selected of [
    { x: 5, y: 200 },
    { x: 760, y: 650 },
    { x: 380, y: 30 },
  ]) {
    const p = tooltipPosition(
      selected,
      [],
      { w: 240, h: 190 },
      { w: 800, h: 700 },
      40,
    );
    assert.ok(p.x >= 16 && p.x + 240 <= 784 && p.y >= 0 && p.y + 190 <= 700);
  }
});

void test('an active pre-overhaul claim migrates its physical layout and retains canonical cargo value', () => {
  const m = new GameModel(),
    c = m.campaign!;
  m.round = c.state.block = 13;
  c.state.layoutVersion = 1;
  c.state.phase = 0;
  m.field = campaignField(13, 0, undefined, 1);
  m.loot = campaignLoot(13, 0, 1);
  m.field.carveLoot(m.loot);
  const p = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
  m.field.melt(p, 0.2, 1, 1, 0);
  const raw = JSON.parse(m.serialize());
  raw.version = 4;
  raw.ice = Array.from(m.field.values);
  delete raw.field;
  delete raw.campaign.layoutVersion;
  const n = new GameModel(JSON.stringify(raw));
  assert.equal(n.saveStatus, 'saved');
  assert.equal(n.campaign!.state.layoutVersion, 3);
  assert.equal(n.campaign!.block.phases, blockSpec(13, 3).phases);
  assert.equal(n.field.grid.legacy, false);
  assert.notEqual(n.field.values.length, raw.ice.length);
  assert.match(
    n.saveDiagnostics[0],
    /legacy migration|migrated in world space/,
  );
  assert.deepEqual(
    n.loot.map((t) => [t.id, t.value]),
    m.loot.map((t) => [t.id, t.value]),
  );
  n.nextBlock();
  assert.equal(n.campaign!.state.layoutVersion, 3);
  assert.equal(n.campaign!.block.phases, blockSpec(14, 3).phases);
  assert.equal(JSON.parse(n.serialize()).legacyCargo, undefined);
  assert.equal(new GameModel(n.serialize()).saveStatus, 'saved');
});

void test('heat echo follows gradual movement and fires once without a repeating chain', () => {
  const m = new GameModel();
  m.campaign!.unlock('thermal');
  m.campaign!.state.pending = [];
  m.nodes.thermal = ['TH-T1', 'TH-T2', 'TH-T3'];
  m.loot = [];
  const p = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
  m.press();
  for (let i = 0; i < 12; i++) m.update(0.02, { ...p, x: p.x + i * 0.06 });
  assert.ok(
    m.echoes.length > 0,
    'slow pointer travel must accumulate into an echo',
  );
  m.release();
  m.update(0.02, null);
  m.stop();
  for (let i = 0; i < 50; i++) m.update(0.02, null);
  assert.equal(m.echoes.length, 0);
  assert.equal(m.echoAnchor, null);
});

void test('six authored radial trees have exactly 70 distinct upgrades and unobstructed edges', () => {
  assert.deepEqual(
    TOOL_ORDER.map((t) => TOOL_TREES[t].length),
    [11, 11, 12, 12, 11, 13],
  );
  assert.equal(new Set(ALL_TOOL_NODES.map((n) => n.id)).size, 70);
  for (const tool of TOOL_ORDER) {
    const list = TOOL_TREES[tool],
      points = [{ id: 'root', x: MAP.rootX, y: MAP.rootY }, ...list];
    assert.equal(
      list.filter((n) => nodeState(n, []) === 'available').length,
      4,
    );
    for (const a of points)
      for (const b of points)
        if (a !== b)
          assert.ok(
            Math.hypot(a.x - b.x, a.y - b.y) > 86,
            `${tool}: ${a.id}/${b.id}`,
          );
    for (const n of list) {
      const a = list.find((p) => n.parentIds.includes(p.id)) ?? points[0],
        dx = n.x - a.x,
        dy = n.y - a.y;
      for (const other of points) {
        if (other.id === a.id || other.id === n.id) continue;
        const t = Math.max(
          0,
          Math.min(
            1,
            ((other.x - a.x) * dx + (other.y - a.y) * dy) / (dx * dx + dy * dy),
          ),
        );
        assert.ok(
          Math.hypot(other.x - a.x - dx * t, other.y - a.y - dy * t) > 43,
          `${n.id} edge crosses ${other.id}`,
        );
      }
    }
  }
});
void test('authored purchases enforce tool ownership and prerequisites, persist independently, and remain completeable', () => {
  const m = new GameModel();
  const budget = ALL_TOOL_NODES.reduce((sum, n) => sum + n.cost, 0) + 1000;
  m.money = m.earned = budget;
  m.campaign!.state.grossEarned = m.campaign!.state.netEarned = budget;
  assert.equal(m.purchaseNode('IP-P1', 1000), false);
  assert.equal(m.purchaseNode('HC-P2', 1200), false);
  m.campaign!.state.tools = [...TOOL_ORDER];
  m.campaign!.state.pending = [];
  const before = m.money;
  assert.equal(m.purchaseNode('IP-P1', 1500), true);
  assert.equal(m.toolId, 'hand');
  assert.equal(m.fittings.power, 1);
  assert.equal(m.purchaseNode('IP-P1', 1800), false);
  assert.equal(
    m.money,
    before - ALL_TOOL_NODES.find((n) => n.id === 'IP-P1')!.cost,
  );
  let clock = 2000;
  for (const n of ALL_TOOL_NODES)
    if (!m.hasNode(n.id)) {
      clock += 150;
      assert.equal(m.purchaseNode(n.id, clock), true, n.id);
    }
  assert.equal(Object.values(m.nodes).flat().length, 70);
  const restored = new GameModel(m.serialize());
  assert.equal(restored.saveStatus, 'saved');
  assert.deepEqual(restored.nodes, m.nodes);
  assert.equal(restored.money, m.money);
  const invalid = JSON.parse(m.serialize());
  invalid.nodes.pick = ['IP-P2'];
  assert.equal(new GameModel(JSON.stringify(invalid)).saveStatus, 'invalid');
});
void test('tool reveals follow read story, affordability fires once, and buying is a separate saved step', () => {
  const m = new GameModel(),
    c = m.campaign!,
    t = TOOLS.find((t) => t.id === 'pick')!;
  m.round = c.state.block = t.block;
  m.field = campaignField(t.block);
  m.loot = campaignLoot(t.block);
  c.trigger('BLOCK_START');
  m.checkTools();
  assert.equal(m.revealedTools.includes('pick'), false);
  assert.equal(m.buyTool('pick'), false);
  c.openPhone();
  m.checkTools();
  assert.deepEqual(m.toolNotice, { tool: 'pick', kind: 'available' });
  assert.equal(c.state.tools.includes('pick'), false);
  m.dismissToolNotice();
  m.checkTools();
  assert.equal(m.toolNotice, null);
  m.money = m.earned = t.cost;
  c.state.grossEarned = c.state.netEarned = t.cost;
  m.checkTools();
  assert.equal(m.snapshot().toolNotice?.kind, 'ready');
  m.dismissToolNotice();
  m.money--;
  m.checkTools();
  m.money++;
  m.checkTools();
  assert.equal(m.toolNotice, null);
  assert.equal(m.buyTool('pick'), true);
  assert.equal(m.money, 0);
  assert.equal(m.snapshot().toolNotice?.kind, 'acquired');
  const n = new GameModel(m.serialize());
  assert.equal(n.saveStatus, 'saved');
  n.dismissToolNotice();
  n.checkTools();
  assert.equal(n.toolNotice, null);
  assert.ok(n.campaign!.state.tools.includes('pick'));
});
void test('old tool levels migrate into authored nodes once without losing money, ice or existing benefits', () => {
  const m = new GameModel();
  m.campaign!.unlock('grip');
  m.toolUpgrades.pick.heat = 7;
  m.toolUpgrades.thermal.wide = 4;
  m.toolUpgrades.thermal.residual = 6;
  const raw = JSON.parse(m.serialize());
  delete raw.treeRevision;
  delete raw.nodes;
  delete raw.revealedTools;
  delete raw.toolNotices;
  const n = new GameModel(JSON.stringify(raw));
  assert.equal(n.saveStatus, 'saved');
  assert.ok(n.hasNode('HC-S1'));
  assert.ok(n.hasNode('IP-P1'));
  assert.ok(n.hasNode('IP-P2'));
  assert.ok(n.hasNode('TH-C1'));
  assert.ok(n.hasNode('TH-T1'));
  assert.equal(n.toolUpgrades.pick.heat, 7);
  assert.equal(n.money, m.money);
  assert.deepEqual(
    n.field.values,
    Float32Array.from(
      m.field.values,
      (value) => (value === 0.5 ? 127 : Math.round(value * 255)) / 255,
    ),
  );
  const again = new GameModel(n.serialize());
  assert.deepEqual(again.nodes, n.nodes);
  assert.equal(again.money, n.money);
});
void test('chisel hits on its first update, hold is purchased, and a charged sledge cancels safely', () => {
  const m = new GameModel(),
    point = m.field.points.find((p, i) => m.field.values[i] > 0.9)!;
  m.press();
  m.update(1 / 240, point);
  assert.equal(m.strikeSerial, 1);
  assert.equal(m.firing, false);
  m.nodes.hand = ['HC-S1'];
  m.stop();
  m.press();
  for (let i = 0; i < 130; i++) m.update(1 / 120, point);
  assert.ok(m.strikeSerial >= 3);
  m.stop();
  m.campaign!.unlock('sledge');
  m.campaign!.state.pending = [];
  m.nodes.sledge = ['SH-T1'];
  const count = m.strikeSerial;
  m.press();
  for (let i = 0; i < 12; i++) m.update(0.05, point);
  assert.equal(m.strikeSerial, count);
  assert.ok(m.chargeTime > 0.5);
  m.pause(true);
  m.pause(false);
  m.update(0.05, point);
  assert.equal(m.chargeTime, 0);
  assert.equal(m.strikeSerial, count);
  m.press();
  for (let i = 0; i < 13; i++) m.update(0.05, point);
  m.release();
  assert.ok(Math.abs(m.chargedPower - 1.75) < 0.001);
  for (let i = 0; i < 10; i++) m.update(0.05, point);
  assert.equal(m.strikeSerial, count + 1);
});
void test('real voxel damage responds to depth, center and weakened-ice techniques', () => {
  const options = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };
  const damage = (patch: Partial<typeof options>) => {
    const f = campaignField(15),
      point = { x: 0, y: 2.5, z: 0 };
    f.values.fill(0.85);
    const before = f.values.reduce((a, b) => a + b, 0);
    f.strikeAt(point, 0.08, 2, { ...options, ...patch }, { x: 0, y: 1, z: 0 });
    return before - f.values.reduce((a, b) => a + b, 0);
  };
  const base = damage({});
  assert.ok(damage({ center: 1.3 }) > base);
  assert.ok(damage({ depth: 1.2 }) > base);
  assert.ok(damage({ weak: 1.35 }) > base * 1.3);
  assert.ok(
    toolEffects(['TH-P1', 'TH-P2', 'TH-S1', 'TH-S2', 'TH-T1', 'TH-T2'])
      .power ===
      1.1 ** 2,
  );
  const m = new GameModel();
  assert.equal(m.selectBreakerBit('precision'), false);
  m.nodes.breaker = ['PB-C1', 'PB-C2', 'PB-C3'];
  assert.equal(m.selectBreakerBit('precision'), true);
  assert.equal(m.breakerBit, 'precision');
  assert.equal(m.selectBreakerBit('wide'), true);
});

void test('tool pages buy independently, enforce ownership and round-trip without changing equipped tool', () => {
  const m = new GameModel();
  m.campaign!.unlock('grip');
  m.selectTool('hand');
  m.money = m.earned = 1000;
  m.campaign!.state.grossEarned = m.campaign!.state.netEarned = 1000;
  assert.equal(m.purchaseSkill('heat-1', 1000, 'grip'), true);
  assert.equal(m.toolId, 'hand');
  assert.equal(m.upgrades.heat, 0);
  assert.equal(m.toolUpgrades.grip.heat, 1);
  assert.equal(m.purchaseSkill('heat-2', 1300, 'hand'), false);
  assert.equal(m.purchaseSkill('heat-1', 1600, 'pick'), false);
  assert.equal(m.money, 975);
  m.toolUpgrades.thermal.tank = 3;
  m.fuel = 100;
  const restored = new GameModel(m.serialize());
  assert.equal(restored.saveStatus, 'saved');
  assert.deepEqual(restored.toolUpgrades, m.toolUpgrades);
  assert.equal(restored.toolId, 'hand');
  assert.equal(restored.fuel, 100);
  restored.selectTool('grip');
  assert.equal(restored.upgrades.heat, 1);
  restored.restart();
  assert.ok(
    Object.values(restored.toolUpgrades).every((levels) =>
      Object.values(levels).every((n) => n === 0),
    ),
  );
});

void test('shared-upgrade saves migrate once into independent tool trees without losing purchases', () => {
  const m = new GameModel(),
    old = JSON.parse(m.serialize());
  delete old.toolUpgrades;
  old.upgrades = { heat: 3, tank: 2, wide: 1, residual: 2 };
  const migrated = new GameModel(JSON.stringify(old));
  assert.equal(migrated.saveStatus, 'saved');
  for (const levels of Object.values(migrated.toolUpgrades))
    assert.deepEqual(levels, old.upgrades);
  migrated.upgrades.heat++;
  assert.equal(migrated.toolUpgrades.pick.heat, 3);
  const again = new GameModel(migrated.serialize());
  assert.equal(again.upgrades.heat, 4);
  assert.equal(again.toolUpgrades.pick.heat, 3);
  const invalid = JSON.parse(again.serialize());
  invalid.toolUpgrades.pick.heat = -1;
  assert.equal(new GameModel(JSON.stringify(invalid)).saveStatus, 'invalid');
});

void test('upgrading another tool cannot change a pick strike’s actual ice damage', () => {
  const damage = (upgrade?: 'pick' | 'hand') => {
    const m = new GameModel();
    m.campaign!.state.pending = [];
    m.campaign!.unlock('pick');
    m.selectTool('pick');
    m.money = 1000;
    if (upgrade) assert.equal(m.purchaseSkill('heat-1', 1000, upgrade), true);
    const before = m.field.values.reduce((a, b) => a + b, 0);
    const point = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
    m.press();
    for (let i = 0; i < 15; i++) m.update(0.02, point);
    return before - m.field.values.reduce((a, b) => a + b, 0);
  };
  const base = damage();
  assert.ok(base > 0);
  assert.equal(damage('hand'), base);
  assert.ok(damage('pick') > base);
});

void test('rendered coin contact ignores empty corners and release responds on the edited frame', () => {
  const m = new GameModel();
  m.campaign!.state.pending = [];
  const t = m.loot[0];
  const mesh = new Mesh(
    new CylinderGeometry(t.w / 2, t.w / 2, t.h, 32),
    new MeshBasicMaterial(),
  );
  const samples = meshContactSamples(mesh, 0.08);
  assert.ok(samples.length > 100);
  assert.ok(samples.every((p) => Math.hypot(p.x, p.z) <= t.w / 2 + 0.0001));
  m.contactSamples = () => samples;
  m.update(0.001, null);
  assert.equal(t.state, 'embedded');
  m.field.values.fill(0);
  m.field.revision++;
  m.update(0.001, null);
  assert.notEqual(
    t.state,
    'embedded',
    'do not wait for the periodic connectivity timer',
  );
  assert.equal(t.credited, true);
  const money = m.money;
  m.update(0.001, null);
  assert.equal(m.money, money);
  mesh.geometry.dispose();
  (mesh.material as MeshBasicMaterial).dispose();
});

void test('contact follows the rendered isosurface and nearby off-mesh ice cannot hold a coin', () => {
  const field = new IceField(0, undefined, { scale: 1, shape: 'parcel' });
  field.melt({ x: 0.7, y: 3, z: 0.5 }, 0.4, 3, 2);
  const vertices = surface(field).positions;
  for (let i = 0; i < vertices.length; i += 57) {
    assert.ok(
      Math.abs(
        field.density(
          { x: vertices[i], y: vertices[i + 1], z: vertices[i + 2] },
          true,
        ) - 0.5,
      ) < 0.00001,
    );
  }
  field.values.fill(0);
  const corner = field.index(12, 6, 8),
    center = field.points[field.index(11, 6, 7)];
  const t: Loot = {
    id: 'off-mesh',
    kind: 'coin',
    value: 1,
    x: 0,
    y: center.y,
    z: 0,
    w: 1.6,
    h: 0.4,
    d: 1.6,
    state: 'embedded',
    credited: false,
    age: 0,
    vy: 0,
  };
  const mesh = new Mesh(
    new CylinderGeometry(0.8, 0.8, 0.4, 32),
    new MeshBasicMaterial(),
  );
  const points = meshContactSamples(mesh, 0.06);
  field.values[corner] = 0.51;
  assert.equal(field.canRelease(t, points), true);
  field.values[field.index(11, 6, 7)] = 1;
  assert.equal(field.canRelease(t, points), false);
  mesh.geometry.dispose();
  (mesh.material as MeshBasicMaterial).dispose();
});

void test('an air gap releases treasure while actual surrounding contact holds it', () => {
  const field = new IceField(0, undefined, { scale: 1, shape: 'parcel' });
  const t: Loot = {
    id: 'gap-coin',
    kind: 'coin',
    value: 35,
    x: 0,
    y: 4.5,
    z: 0,
    w: 1.2,
    h: 0.4,
    d: 1.2,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  };
  assert.equal(field.canRelease(t), false, 'covered treasure stays embedded');
  field.points.forEach((p, i) => {
    if (p.y > 2) field.values[i] = 0;
  });
  const remaining = field.remaining();
  assert.ok(remaining > 0);
  assert.equal(
    field.canRelease(t),
    true,
    'a distant ice shelf cannot suspend treasure',
  );
  assert.equal(
    field.remaining(),
    remaining,
    'releasing does not erase the shelf',
  );
  const landing = field.landingHeight(t, 0.4);
  assert.ok(
    landing > 2 && landing < 3,
    'a long frame still hits the real shelf',
  );
  field.values.fill(0);
  assert.equal(
    field.landingHeight(t, 0.4),
    0.4,
    'empty corridor ends at tray floor',
  );
});

void test('unsupported treasure falls onto lower ice, credits once and keeps that ice intact', () => {
  const m = new GameModel();
  m.campaign!.state.pending = [];
  m.loot = [{ ...m.loot[0], x: 0, y: 4.5, z: 0, w: 1.2, h: 0.4, d: 1.2 }];
  m.field = new IceField(0, undefined, { scale: 1, shape: 'parcel' });
  m.field.points.forEach((p, i) => {
    if (p.y > 2) m.field.values[i] = 0;
  });
  const remaining = m.field.remaining(),
    initial = m.money;
  let impacts = 0,
    landedAt = 0;
  m.onImpact = (t) => {
    impacts++;
    landedAt = t.y;
  };
  for (let i = 0; i < 20; i++) m.update(0.05, null);
  assert.ok(m.money > initial);
  assert.equal(impacts, 1);
  assert.ok(landedAt > 2 && landedAt < 3);
  assert.equal(m.field.remaining(), remaining);
  assert.equal(m.credit(m.loot[0]), false);
});

void test('pick impact is 210ms into a 525ms cycle, with one late buffered strike', () => {
  const s = new StrikeCycle(),
    p = { x: 1, y: 2, z: 3 };
  s.request();
  for (let i = 0; i < 20; i++)
    assert.equal(s.update(0.01, false, p, 0.525), null);
  assert.deepEqual(s.update(0.01, false, p, 0.525), p);
  assert.equal(s.active, true);
  assert.ok(Math.abs(strikePose(0.4).lift) < 1e-9);
  s.request();
  assert.equal(s.queued, false, 'early clicks do not queue');
  for (let i = 0; i < 20; i++) s.update(0.01, false, p, 0.525);
  for (let i = 0; i < 50; i++) s.request();
  assert.equal(s.queued, true);
  let hits = 1;
  for (let i = 0; i < 200; i++) if (s.update(0.01, false, p, 0.525)) hits++;
  assert.equal(hits, 2);
  assert.equal(s.active, false);
});
void test('held strikes keep cadence across frame rates and cancellation discards the buffer', () => {
  for (const hz of [30, 60, 144, 240]) {
    const s = new StrikeCycle(),
      times: number[] = [];
    for (let i = 0; i < hz * 3; i++)
      if (s.update(1 / hz, true, { x: 0, y: 0, z: 0 }, 0.525))
        times.push((i + 1) / hz);
    assert.ok(Math.abs(times[0] - 0.21) <= 1 / hz + 0.0001);
    for (let i = 1; i < times.length; i++)
      assert.ok(Math.abs(times[i] - times[i - 1] - 0.525) <= 1 / hz + 0.0001);
    s.request();
    s.cancel();
    assert.equal(s.update(0.05, false, { x: 0, y: 0, z: 0 }, 0.525), null);
  }
});
void test('real pick damage and effects share the impact frame; pause and reload cancel anticipation', () => {
  const m = new GameModel();
  m.campaign!.state.pending = [];
  m.campaign!.unlock('pick');
  const p = m.field.points.find((_, i) => m.field.values[i] > 0.9)!;
  const sum = () => m.field.values.reduce((a, b) => a + b, 0),
    before = sum();
  let bursts = 0,
    sounds = 0;
  m.onBurst = () => bursts++;
  m.onSound = () => sounds++;
  m.press();
  m.release();
  for (let i = 0; i < 20; i++) m.update(0.01, p);
  assert.equal(sum(), before);
  assert.equal(bursts, 0);
  assert.equal(sounds, 0);
  m.update(0.01, p);
  assert.ok(sum() < before);
  assert.equal(bursts, 2);
  assert.equal(sounds, 1);
  assert.equal(m.strikeSerial, 1);
  m.stop();
  m.press();
  m.update(0.05, p);
  const n = new GameModel(m.serialize());
  assert.equal(n.strike.active, false);
  const checkpoint = m.serialize();
  m.restore(checkpoint);
  assert.equal(
    m.strike.active,
    false,
    'loading into an existing model also cancels the committed swing',
  );
  const after = sum();
  m.pause(true);
  m.pause(false);
  for (let i = 0; i < 80; i++) m.update(0.01, p);
  assert.equal(sum(), after);
});
void test('tool follow bounds topology jumps and surface rotation, then converges', () => {
  const f = new ToolFollow();
  f.followPosition(1 / 60);
  f.targetPosition.set(8, 0, 0);
  f.targetNormal.set(1, 0, 0);
  f.targetRotation.setFromAxisAngle(new Vector3(0, 1, 0), Math.PI);
  const q = new Quaternion();
  f.followPosition(1 / 60);
  f.followRotation(1 / 60);
  assert.ok(f.displayPosition.x > 0 && f.displayPosition.x < 8);
  assert.ok(f.smoothedNormal.angleTo(new Vector3(0, 1, 0)) <= 10 / 60 + 0.001);
  assert.ok(f.displayRotation.angleTo(q) <= 14 / 60 + 0.001);
  for (let i = 0; i < 180; i++) {
    f.followPosition(1 / 60);
    f.followRotation(1 / 60);
  }
  assert.ok(f.displayPosition.distanceTo(f.targetPosition) < 0.001);
  assert.ok(f.displayRotation.angleTo(f.targetRotation) < 0.001);
});
void test('regrabbing stops map coast immediately and gentle release travels less', () => {
  const fast = new TreePan(),
    slow = new TreePan();
  for (const [p, dx] of [
    [fast, 25],
    [slow, 2],
  ] as const) {
    p.begin();
    p.drag(dx, 0, 0.02);
    p.end();
  }
  for (let i = 0; i < 10; i++) {
    fast.update(0.016);
    slow.update(0.016);
  }
  assert.ok(fast.x > slow.x * 3);
  fast.begin();
  const x = fast.x;
  for (let i = 0; i < 30; i++) fast.update(0.016);
  assert.equal(fast.x, x);
  assert.equal(fast.vx, 0);
});
void test('completed faster-than-expected call cannot redeliver; stale Next is ignored and saved duplicates are repaired', () => {
  const m = new GameModel(),
    c = m.campaign!;
  c.state.block = m.round = 2;
  c.state.pending = [];
  c.trigger('BLOCK_START');
  c.deliver();
  m.answerPhone();
  m.field = campaignField(2);
  m.loot = campaignLoot(2);
  m.field.carveLoot(m.loot);
  const id = m.liveCall!.id;
  assert.equal(id, 'ch1.more:0');
  m.advanceCall(id);
  assert.equal(m.advanceCall(id), false);
  assert.equal(m.liveCall!.id, 'ch1.more:1');
  c.state.pending.push('ch1.more');
  const n = new GameModel(m.serialize());
  assert.notEqual(n.saveStatus, 'invalid');
  assert.equal(n.campaign!.state.pending.length, 0);
  n.advanceCall(n.liveCall!.id);
  assert.ok(n.campaign!.state.read.includes('ch1.more'));
  n.campaign!.state.pending.push('ch1.more');
  n.campaign!.deliver();
  assert.equal(n.phoneRinging, false);
  for (let i = 0; i < 200; i++) n.update(0.05, null);
  assert.equal(n.liveCall, null);
});
void test('gameplay zoom round-trips and old saves use the neutral view', () => {
  const m = new GameModel();
  m.setSetting('gameplayZoom', 0.84);
  assert.equal(new GameModel(m.serialize()).settings.gameplayZoom, 0.84);
  const raw = JSON.parse(m.serialize());
  delete raw.settings.gameplayZoom;
  assert.equal(new GameModel(JSON.stringify(raw)).settings.gameplayZoom, 0.5);
});

void test('every revision-one branch keeps numerical benefits and paid mechanics through two reloads', () => {
  for (const tool of TOOL_ORDER)
    for (const branch of ['power', 'speed', 'control', 'technique']) {
      const old = OLD_TREES[tool].filter((n) => n.branch === branch);
      for (let count = 1; count <= old.length; count++) {
        const m = new GameModel();
        m.campaign!.state.tools = [...TOOL_ORDER];
        const raw = JSON.parse(m.serialize());
        raw.treeRevision = 1;
        delete raw.treeCarry;
        raw.nodes[tool] = old.slice(0, count).map((n) => n.id);
        const before = oldEffects(raw.nodes[tool]);
        const v1 = migrateTreeV1(raw.nodes),
          migrated = migrateTreeV2(v1.nodes, v1.carry),
          after = carriedEffects(migrated.nodes[tool], migrated.carry[tool]);
        for (const k of [
          'power',
          'center',
          'depth',
          'area',
          'weak',
          'visible',
          'support',
          'detach',
          'fuel',
          'afterheat',
        ] as const)
          assert.ok(
            after[k] + 1e-9 >= before[k],
            `${tool} ${branch} ${count}: ${k}`,
          );
        assert.ok(after.cycle <= before.cycle + 1e-9);
        assert.ok(after.burn <= before.burn + 1e-9);
        const loaded = new GameModel(JSON.stringify(raw));
        assert.equal(loaded.saveStatus, 'saved');
        const twice = new GameModel(loaded.serialize());
        assert.equal(twice.saveStatus, 'saved');
        assert.deepEqual(twice.nodes, loaded.nodes);
        assert.deepEqual(twice.treeCarry, loaded.treeCarry);
        assert.equal(twice.money, m.money);
        assert.deepEqual(
          twice.field.values,
          Float32Array.from(
            m.field.values,
            (value) => (value === 0.5 ? 127 : Math.round(value * 255)) / 255,
          ),
        );
      }
    }
});
void test('contact frame keeps the authored handle upright across top, corner and every side orientation', () => {
  const f = new ToolFollow(),
    camera = new Vector3(8, 7, 10),
    handle = new Vector3();
  let maxStep = 0;
  for (let turn = 0; turn < 72; turn++)
    for (let slope = 0; slope <= 12; slope++) {
      const angle = (turn * Math.PI) / 36,
        pitch = (slope * Math.PI) / 24;
      f.targetNormal.set(
        Math.sin(pitch) * Math.cos(angle),
        Math.cos(pitch),
        Math.sin(pitch) * Math.sin(angle),
      );
      for (let frame = 0; frame < 12; frame++) {
        const previous = f.displayRotation.clone();
        f.followPosition(1 / 120);
        f.orient(camera);
        handle.set(0, 0, 1).applyQuaternion(f.targetRotation);
        assert.ok(handle.y >= -0.021);
        assert.ok(f.displayRotation.dot(f.targetRotation) >= 0);
        f.followRotation(1 / 120);
        maxStep = Math.max(maxStep, previous.angleTo(f.displayRotation));
        assert.ok(Number.isFinite(f.displayRotation.w));
      }
    }
  assert.ok(maxStep <= 14 / 120 + 0.00001);
});
void test('delivery settlement persists stats and one Continue advances without replaying credits', () => {
  const m = new GameModel(),
    c = m.campaign!;
  c.state.pending = [];
  c.state.phase = c.block.phases - 1;
  m.field = campaignField(0, c.state.phase);
  m.loot = campaignLoot(0, c.state.phase);
  m.deliveryStats.seconds = 93;
  for (const t of m.loot) {
    m.credit(t);
    t.state = 'collected';
  }
  m.update(0.05, null);
  assert.ok(m.settlement);
  const money = m.money;
  assert.equal(m.settlement!.finds, m.loot.length);
  assert.ok(m.settlement!.bestValue! > 0);
  m.skipSettlement();
  assert.ok(m.settlementTime > 0);
  for (let i = 0; i < 18; i++) m.update(0.05, null);
  assert.equal(m.round, 0);
  const copy = new GameModel(m.serialize());
  assert.equal(copy.saveStatus, 'saved');
  assert.deepEqual(copy.settlement, m.settlement);
  for (let i = 0; i < 400; i++) copy.update(0.05, null);
  assert.equal(copy.round, 0);
  assert.equal(copy.money, money);
  assert.ok(copy.settlement);
  assert.equal(copy.campaign!.state.call, undefined);
  copy.skipSettlement();
  assert.equal(copy.round, 1);
  assert.equal(copy.money, money);
  assert.equal(copy.deliveryStats.finds, 0);
  copy.skipSettlement();
  assert.equal(copy.round, 1);
});
void test('purchase family has four bounded variants, a leading transient, short tails and no repeat buildup', () => {
  for (const kind of [
    'purchase',
    'unlock',
    'tool-acquired',
    'delivery',
  ] as const) {
    const samples = Array.from({ length: 4 }, (_, v) =>
      confirmationSample(44100, kind, v),
    );
    assert.equal(new Set(samples.map((a) => a[200])).size, 4);
    for (const a of samples) {
      assert.ok(a.every(Number.isFinite));
      assert.ok(Math.max(...a.map(Math.abs)) < 0.95);
      const rms = (from: number, to: number) =>
        Math.sqrt(
          a.slice(from, to).reduce((s, v) => s + v * v, 0) / (to - from),
        );
      assert.ok(rms(0, 441) > rms(a.length - 441, a.length) * 2);
      assert.ok(Math.abs(a.at(-1)!) < 0.0001);
    }
    // Thirty buffers have no shared envelope or accumulated synthesis state.
    for (let n = 0; n < 30; n++)
      assert.deepEqual(confirmationSample(44100, kind, n % 4), samples[n % 4]);
  }
});

void test('revision-2 tiers fold into the compact map without losing any paid benefit, once', () => {
  const higher = [
    'power',
    'center',
    'depth',
    'area',
    'weak',
    'visible',
    'support',
    'detach',
    'fuel',
    'afterheat',
    'side',
    'sideDepth',
    'focusPower',
    'sustainPower',
    'thirdPower',
    'resonance',
    'charge',
    'wideArea',
  ] as const;
  const lower = ['cycle', 'burn', 'steadiness', 'release'] as const;
  for (const tool of TOOL_ORDER)
    for (const branch of ['power', 'speed', 'control', 'technique'] as const) {
      const old = V2_TREES[tool].filter((n) => n.branch === branch);
      for (let count = 1; count <= old.length; count++) {
        const m = new GameModel();
        m.campaign!.state.tools = [...TOOL_ORDER];
        const raw = JSON.parse(m.serialize());
        raw.treeRevision = 2;
        delete raw.treeCarry;
        raw.nodes[tool] = old.slice(0, count).map((n) => n.id);
        const before = v2Effects(raw.nodes[tool]);
        const migrated = migrateTreeV2(raw.nodes),
          after = carriedEffects(migrated.nodes[tool], migrated.carry[tool]);
        const label = `${tool} ${branch} ${count}`;
        for (const k of higher)
          assert.ok(after[k] + 1e-9 >= before[k], `${label}: ${k}`);
        for (const k of lower)
          assert.ok(after[k] <= before[k] + 1e-9, `${label}: ${k}`);
        for (const mechanic of before.mechanics)
          assert.ok(after.mechanics.has(mechanic), `${label}: ${mechanic}`);
        assert.ok(
          migrated.nodes[tool].every((id) =>
            TOOL_TREES[tool].some((n) => n.id === id),
          ),
          label,
        );
        const loaded = new GameModel(JSON.stringify(raw));
        assert.equal(loaded.saveStatus, 'saved', label);
        assert.deepEqual(loaded.nodes, migrated.nodes, label);
        assert.equal(JSON.parse(loaded.serialize()).treeRevision, 3);
        const twice = new GameModel(loaded.serialize());
        assert.equal(twice.saveStatus, 'saved');
        assert.deepEqual(twice.nodes, loaded.nodes);
        assert.deepEqual(twice.treeCarry, loaded.treeCarry);
      }
    }
});
