import test from 'node:test';
import assert from 'node:assert/strict';
import { GameModel } from '../lib/game/model';
import { STORY } from '../lib/game/campaign-content';
import { TOOL_ORDER } from '../lib/game/tool-trees';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';

// These fixtures exercise the real settlement/save state machine. Clearing a
// field or crediting its cargo here is deliberately not a pacing simulation.
function contractModel(index = 32) {
  const m = new GameModel(),
    c = m.campaign!;
  Object.assign(c.state, {
    block: 31,
    phase: 4,
    complete: true,
    commission: 0,
    blockRate: 0,
    objects: ['ledger'],
    tools: [...TOOL_ORDER],
    flags: STORY.map((e) => e.id),
    history: STORY.map((e) => e.id),
    read: STORY.map((e) => e.id),
    pending: [],
    call: undefined,
  });
  m.phase = 'completed';
  m.revealedTools = [...TOOL_ORDER];
  m.toolNotices = TOOL_ORDER.flatMap((id) => [
    `available:${id}`,
    `ready:${id}`,
    `acquired:${id}`,
  ]);
  m.nodes.hand = ['HC-S1'];
  m.continuePlaying();
  while (m.round < index) m.nextBlock();
  assert.equal(m.round, index);
  assert.equal(m.campaign!.rate, 8);
  assert.equal(m.phase, 'playing');
  assert.ok(m.campaign!.state.contracts);
  return m;
}

function nextPlaying(m: GameModel) {
  for (let n = 0; n < 150 && m.phase === 'transitioning'; n++)
    m.update(0.05, null);
  assert.equal(m.phase, 'playing');
}

function finishFixture(m: GameModel, success = true) {
  const objective = m.campaign!.block.contract!.objective;
  for (
    let phase = m.campaign!.state.phase;
    phase < m.campaign!.block.phases;
    phase++
  ) {
    nextPlaying(m);
    // Capture the authored pre-work field before the fixture removes anything.
    m.update(0.05, null);
    if (objective.kind === 'rush')
      m.deliveryStats.seconds = success ? 40 : 10000;
    if (objective.kind === 'noThermal')
      m.deliveryStats.thermalSeconds = success ? 0 : 2;
    if (objective.kind === 'bulk' && success) {
      m.field.values.fill(0);
      m.field.revision++;
      m.field.markAllDirty();
    }
    for (const t of m.loot) {
      if (t.credited) continue;
      t.condition =
        success ||
        objective.kind === 'bulk' ||
        objective.kind === 'rush' ||
        objective.kind === 'noThermal'
          ? 100
          : 60;
      m.credit(t);
      t.state = 'collected';
    }
    m.update(0.05, null);
  }
  assert.ok(m.settlement, `contract ${m.round} produced a receipt`);
  return m.settlement!;
}

void test('all five real contract types award their separate optional bonus and preserve the cargo accounting', () => {
  for (let index = 32; index < 37; index++) {
    const m = contractModel(index),
      objective = m.campaign!.block.contract!.objective;
    const receipt = finishFixture(m);
    assert.equal(receipt.contractBonus, objective.bonus);
    assert.equal(
      receipt.base! + receipt.conditionBonus! + receipt.contractBonus!,
      receipt.gross,
    );
    assert.equal(receipt.fee, Math.floor(receipt.gross * 0.08));
    assert.equal(receipt.net, receipt.gross - receipt.fee);
    assert.equal(m.money, receipt.net);
    assert.equal(m.earned, receipt.gross);
    assert.equal(
      m.campaign!.state.rewards.filter((id) => id.endsWith(':objective'))
        .length,
      1,
    );
    const copy = new GameModel(m.serialize());
    assert.equal(copy.saveStatus, 'saved');
    assert.deepEqual(copy.settlement, receipt);
    assert.equal(copy.money, m.money);
    assert.equal(copy.campaign!.state.settledId, copy.campaign!.block.id);
  }
});

void test('a missed objective never reduces base or condition payout, across every contract type', () => {
  for (let index = 32; index < 37; index++) {
    const m = contractModel(index),
      receipt = finishFixture(m, false);
    assert.equal(
      receipt.contractBonus ?? 0,
      0,
      `objective ${m.campaign!.block.contract!.objective.kind}`,
    );
    assert.equal(receipt.gross, receipt.base! + receipt.conditionBonus!);
    assert.equal(receipt.base, m.campaign!.block.baseGross);
    assert.equal(m.money, receipt.net);
    assert.ok(
      !m.campaign!.state.rewards.some((id) => id.endsWith(':objective')),
    );
  }
});

void test('contract receipts wait indefinitely and Continue advances directly to the next contract', () => {
  const m = contractModel();
  finishFixture(m);
  const funds = m.money,
    earned = m.earned,
    nodes = structuredClone(m.nodes);
  for (let n = 0; n < 500; n++) m.update(0.05, null);
  assert.ok(m.settlement);
  assert.equal(m.round, 32);
  assert.equal(m.money, funds);
  const copy = new GameModel(m.serialize());
  assert.equal(copy.saveStatus, 'saved');
  copy.skipSettlement();
  assert.equal(copy.round, 33);
  assert.equal(copy.phase, 'transitioning');
  assert.equal(copy.campaign!.state.settled, false);
  assert.equal(copy.campaign!.state.settledId, undefined);
  assert.equal(copy.campaign!.rate, 8);
  assert.equal(copy.money, funds);
  assert.equal(copy.earned, earned);
  assert.deepEqual(copy.nodes, nodes);
  assert.equal(copy.deliveryStats.seconds, 0);
  assert.equal(copy.deliveryStats.finds, 0);
  copy.skipSettlement();
  assert.equal(copy.round, 33);
  nextPlaying(copy);
  finishFixture(copy);
  assert.ok(copy.money > funds);
});

void test('settledId prevents a second contract award if a receipt is reconstructed without its UI marker', () => {
  const m = contractModel();
  finishFixture(m);
  const raw = JSON.parse(m.serialize());
  raw.settlementPending = false;
  // The durable settlement identity remains authoritative if the separate
  // reward/receipt marker was lost while importing an older snapshot.
  raw.campaign.rewards = raw.campaign.rewards.filter(
    (id: string) => !id.endsWith(':objective'),
  );
  const copy = new GameModel(JSON.stringify(raw));
  assert.equal(copy.saveStatus, 'saved');
  copy.update(0.05, null);
  assert.equal(copy.money, m.money);
  assert.equal(copy.earned, m.earned);
  assert.equal(copy.campaign!.state.blockGross, m.campaign!.state.blockGross);
  for (let n = 0; n < 100; n++) copy.update(0.05, null);
  assert.equal(copy.money, m.money);
});

void test('unknown objective measurements in resumed contracts never become proof of a bonus', () => {
  for (let index = 32; index < 37; index++) {
    const m = contractModel(index),
      c = m.campaign!;
    // Save immediately before final settlement, after prior work and cargo.
    c.state.phase = c.block.phases - 1;
    m.field = campaignField(index, c.state.phase);
    m.loot = campaignLoot(index, c.state.phase);
    m.field.carveLoot(m.loot);
    m.update(0.05, null);
    m.deliveryStats.seconds = 40;
    for (const t of m.loot) {
      m.credit(t);
      t.state = 'collected';
    }
    const raw = JSON.parse(m.serialize());
    const key = (
      {
        pristine: 'pristine',
        bulk: 'initialSolid',
        precision: 'lowestCondition',
        noThermal: 'thermalSeconds',
      } as const
    )[
      c.block.contract!.objective.kind as
        | 'pristine'
        | 'bulk'
        | 'precision'
        | 'noThermal'
    ];
    if (key) delete raw.deliveryStats[key];
    else delete raw.deliveryStats;
    const copy = new GameModel(JSON.stringify(raw));
    assert.equal(copy.saveStatus, 'saved');
    copy.update(0.05, null);
    assert.ok(copy.settlement);
    assert.equal(
      copy.settlement!.contractBonus ?? 0,
      0,
      c.block.contract!.objective.kind,
    );
    assert.equal(copy.money, m.money);
    const twice = new GameModel(copy.serialize());
    assert.equal(twice.saveStatus, 'saved');
    assert.equal(twice.money, m.money);
  }
});

void test('saving a fresh contract before its first frame preserves eligibility for every objective', () => {
  for (let index = 32; index < 37; index++) {
    const m = contractModel(index);
    const copy = new GameModel(m.serialize());
    assert.equal(copy.saveStatus, 'saved');
    assert.equal(copy.deliveryStats.contractMeasurementsIncomplete, undefined);
    const receipt = finishFixture(copy);
    assert.equal(
      receipt.contractBonus,
      copy.campaign!.block.contract!.objective.bonus,
    );
  }
});

void test('unknown thermal history stays unknown across subsequent work, saves and both contract phases', () => {
  const m = contractModel(36);
  m.deliveryStats.seconds = 12;
  m.deliveryStats.thermalSeconds = 2;
  const raw = JSON.parse(m.serialize());
  delete raw.deliveryStats.thermalSeconds;
  const resumed = new GameModel(JSON.stringify(raw));
  assert.equal(resumed.saveStatus, 'saved');
  resumed.update(0.05, null);
  assert.equal(resumed.deliveryStats.thermalSeconds, 0);
  const twice = new GameModel(resumed.serialize());
  assert.equal(twice.saveStatus, 'saved');
  assert.equal(twice.deliveryStats.contractMeasurementsIncomplete, true);
  const receipt = finishFixture(twice);
  assert.equal(receipt.contractBonus ?? 0, 0);
  assert.equal(receipt.gross, receipt.base! + receipt.conditionBonus!);
});

void test('the contract active-work clock excludes idle, pause, phone and transitions but retains committed strikes', () => {
  const m = contractModel(34),
    c = m.campaign!;
  for (let n = 0; n < 20; n++) m.update(0.05, null);
  assert.equal(m.deliveryStats.seconds, 0);
  const hit = m.field.points.find(
    (p, i) =>
      m.field.values[i] > 0.5 && p.y > m.field.grid.physicalHeight * 0.7,
  )!;
  assert.ok(hit);
  m.press();
  m.update(0.05, hit);
  m.release();
  assert.ok(m.strike.active);
  const pressed = m.deliveryStats.seconds;
  m.update(0.05, hit);
  assert.ok(m.deliveryStats.seconds > pressed);
  while (m.strike.active || m.strike.queued) m.update(0.05, hit);
  const worked = m.deliveryStats.seconds;
  for (let n = 0; n < 10; n++) m.update(0.05, null);
  assert.equal(m.deliveryStats.seconds, worked);
  m.pause(true);
  m.update(0.05, hit);
  assert.equal(m.deliveryStats.seconds, worked);
  m.pause(false);
  c.state.call = { event: 'epilogue', line: 0, status: 'active' };
  m.firing = true;
  m.update(0.05, hit);
  assert.equal(m.deliveryStats.seconds, worked);
  c.state.call = undefined;
  m.phase = 'transitioning';
  m.update(0.05, hit);
  assert.equal(m.deliveryStats.seconds, worked);
  m.stop();
  const copy = new GameModel(m.serialize());
  assert.equal(copy.saveStatus, 'saved');
  assert.equal(copy.deliveryStats.seconds, worked);
});

void test('bulk clearance captures the authored initial solid count before the first strike and preserves it on reload', () => {
  const m = contractModel(33),
    initial = m.field.remaining();
  const hit = m.field.points.find(
    (p, i) =>
      m.field.values[i] > 0.5 && p.y > m.field.grid.physicalHeight * 0.7,
  )!;
  m.press();
  m.update(0.05, hit);
  m.release();
  assert.equal(m.deliveryStats.initialSolid, initial);
  assert.ok(m.field.remaining() < initial);
  const copy = new GameModel(m.serialize());
  assert.equal(copy.saveStatus, 'saved');
  copy.update(0.05, null);
  assert.equal(copy.deliveryStats.initialSolid, initial);
});

void test('fully cleared contract cargo physically releases and credits once before the receipt', () => {
  const m = contractModel();
  m.update(0.05, null);
  const initial = m.field.remaining();
  m.field.values.fill(0);
  m.field.revision++;
  m.field.markAllDirty();
  for (let n = 0; n < 300 && !m.settlement; n++) m.update(0.05, null);
  assert.ok(m.settlement);
  assert.equal(m.deliveryStats.initialSolid, initial);
  assert.ok(m.loot.every((t) => t.credited && t.state === 'collected'));
  assert.equal(m.deliveryStats.economicFinds, m.loot.length);
  assert.equal(m.campaign!.state.rewards.length, m.loot.length + 1);
  const funds = m.money;
  for (const t of m.loot) m.credit(t);
  assert.equal(m.money, funds);
});
