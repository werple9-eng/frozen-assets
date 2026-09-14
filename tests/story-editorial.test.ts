import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../lib/game/campaign';
import { STORY } from '../lib/game/campaign-content';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { TOOL_ORDER } from '../lib/game/tool-trees';

function finishCall(c: Campaign) {
  const call = c.state.call!;
  call.status = 'active';
  call.line = STORY.find((e) => e.id === call.event)!.messages.length - 1;
  assert.equal(c.completeCall(call.event).completed, true);
}

void test('every authored call resumes each line exactly once and preserves its caller and money', () => {
  const arcs = [
    { block: 4, object: 'tag', event: 'ch1.tag' },
    { block: 7, object: 'ring', event: 'ch2.ring' },
    { block: 10, object: 'hold', event: 'mercer.first' },
    { block: 17, object: 'log', event: 'ch3.log' },
    { block: 24, object: 'access', event: 'ch4.route' },
  ] as const;
  for (const arc of arcs) {
    let m = new GameModel();
    m.round = m.campaign!.state.block = arc.block;
    m.field = campaignField(arc.block);
    m.loot = campaignLoot(arc.block);
    m.field.carveLoot(m.loot);
    m.revealedTools = [...TOOL_ORDER];
    m.toolNotices = TOOL_ORDER.flatMap((id) => [
      `available:${id}`,
      `ready:${id}`,
      `acquired:${id}`,
    ]);
    m.money += m.campaign!.credit(1000, 'fixture');
    m.earned += 1000;
    m.campaign!.collect(arc.object);
    assert.equal(m.campaign!.deliver(), arc.event);
    m.answerPhone();
    const event = STORY.find((e) => e.id === arc.event)!;
    for (const line of event.messages) {
      m = new GameModel(m.serialize());
      assert.equal(m.saveStatus, 'saved');
      assert.equal(m.liveCall!.text, line.text);
      assert.equal(m.liveCall!.institutional, line.speaker === 'mercer');
      const id = m.liveCall!.id;
      assert.equal(m.advanceCall(id), true);
      assert.equal(m.advanceCall(id), false);
    }
    assert.deepEqual(m.campaign!.state.read, [arc.event]);
    assert.equal(m.money, arc.object === 'log' ? 920 : 880);
    assert.equal(m.campaign!.deliver(), undefined);
  }
});

void test('optional evidence inspection persists once, validates ownership and never substitutes for a required call', () => {
  const m = new GameModel(),
    c = m.campaign!;
  c.collect('ring');
  assert.equal(c.inspectEvidence('ledger'), false);
  assert.equal(c.inspectEvidence('ring'), true);
  assert.equal(c.inspectEvidence('ring'), false);
  assert.deepEqual(c.state.evidenceInspected, ['ring']);
  assert.equal(c.state.read.includes('ch2.ring'), false);
  assert.ok(c.state.pending.includes('ch2.ring'));
  assert.equal(c.state.commission, 12);
  const copy = new GameModel(m.serialize());
  assert.equal(copy.saveStatus, 'saved');
  assert.deepEqual(copy.campaign!.state.evidenceInspected, ['ring']);
  assert.equal(copy.campaign!.inspectEvidence('ring'), false);
  assert.equal(copy.money, m.money);
  assert.deepEqual(copy.campaign!.state.read, c.state.read);
  for (const invalid of [['ledger'], ['ring', 'ring'], ['fabricated']]) {
    const restored = new Campaign();
    assert.throws(
      () => restored.restore({ ...c.state, evidenceInspected: invalid }),
      /Invalid evidence inspection history/,
    );
  }
  const legacy = structuredClone(c.state);
  delete legacy.evidenceInspected;
  const restored = new Campaign();
  restored.restore(legacy);
  assert.equal(restored.state.evidenceInspected, undefined);
  assert.equal(restored.inspectEvidence('ring'), true);
  assert.equal(restored.state.read.includes('ch2.ring'), false);
});

void test('completed legacy saves missing the final coda recover one playable epilogue without replaying fees or earlier calls', () => {
  for (const layoutVersion of [1, 2, 3] as const) {
    const c = new Campaign();
    Object.assign(c.state, {
      layoutVersion,
      block: 31,
      phase: 0,
      complete: true,
      objects: ['ledger'],
      flags: ['ch5.recovered'],
      history: ['ch5.recovered'],
      read: ['ch5.recovered'],
      grossEarned: 1000,
      netEarned: 1000,
      blockGross: 1000,
      commission: 0,
      blockRate: 0,
    });
    const copy = new Campaign();
    copy.restore(structuredClone(c.state));
    assert.equal(copy.startContracts(), false);
    assert.deepEqual(copy.state.pending, ['epilogue']);
    const twice = new Campaign();
    twice.restore(structuredClone(copy.state));
    assert.deepEqual(twice.state.pending, ['epilogue']);
    assert.equal(twice.advanceQuiet(20, false), true);
    assert.equal(twice.state.call?.event, 'epilogue');
    finishCall(twice);
    assert.equal(twice.state.netEarned, 1000);
    assert.equal(twice.state.blockFee, 0);
    assert.equal(twice.state.commissionPaid, 0);
    const read = new Campaign();
    read.restore(structuredClone(twice.state));
    assert.equal(read.deliver(), undefined);
    assert.equal(read.startContracts(), true);
    assert.equal(read.state.block, 32);
    assert.equal(read.state.commission, 8);
    assert.equal(read.state.netEarned, 1000);
    assert.equal(read.state.read.filter((id) => id === 'epilogue').length, 1);
  }
});

void test('ending repair preserves an active epilogue checkpoint and does not reopen it during contracts', () => {
  const c = new Campaign();
  Object.assign(c.state, {
    block: 31,
    complete: true,
    objects: ['ledger'],
    flags: ['ch5.recovered', 'epilogue'],
    history: ['ch5.recovered', 'epilogue'],
    read: ['ch5.recovered'],
    commission: 0,
    blockRate: 0,
    call: { event: 'epilogue', line: 1, status: 'active' },
  });
  const copy = new Campaign();
  copy.restore(structuredClone(c.state));
  assert.equal(copy.state.call?.line, 1);
  assert.deepEqual(copy.state.pending, []);
  finishCall(copy);
  assert.equal(copy.startContracts(), true);
  const next = new Campaign();
  next.restore(structuredClone(copy.state));
  assert.deepEqual(next.state.pending, []);
  assert.equal(next.state.call, undefined);
});

void test('a completed GameModel restore rings the missing epilogue through pickup and Next before allowing contracts', () => {
  const m = new GameModel(),
    c = m.campaign!;
  m.round = c.state.block = 31;
  c.state.phase = 4;
  c.state.commission = c.state.blockRate = 0;
  c.state.flags = c.state.history = c.state.read = ['ch5.recovered'];
  c.state.pending = [];
  c.state.objects = ['ledger'];
  c.state.complete = true;
  m.phase = 'completed';
  m.revealedTools = [...TOOL_ORDER];
  m.toolNotices = TOOL_ORDER.flatMap((id) => [
    `available:${id}`,
    `ready:${id}`,
    `acquired:${id}`,
  ]);
  m.field = campaignField(31, 4);
  m.loot = campaignLoot(31, 4);
  m.field.carveLoot(m.loot);
  m.field.values.fill(0);
  for (const item of m.loot) {
    m.credit(item);
    item.state = 'collected';
  }
  const copy = new GameModel(m.serialize());
  const funds = copy.money;
  assert.equal(copy.saveStatus, 'saved');
  assert.equal(copy.phase, 'completed');
  assert.deepEqual(copy.campaign!.state.pending, ['epilogue']);
  copy.continuePlaying();
  assert.equal(copy.phase, 'completed');
  for (let frame = 0; frame < 1300 && !copy.phoneRinging; frame++)
    copy.update(1 / 60, null);
  assert.equal(copy.phoneRinging, true);
  assert.equal(copy.campaign!.state.call?.event, 'epilogue');
  const currentCall = () => copy.liveCall;
  assert.equal(currentCall(), null);
  copy.answerPhone();
  for (const line of STORY.find((event) => event.id === 'epilogue')!.messages) {
    const live = currentCall();
    assert.ok(live);
    assert.equal(live.text, line.text);
    assert.equal(copy.campaign!.state.read.includes('epilogue'), false);
    const id = live.id;
    assert.equal(copy.advanceCall(id), true);
    assert.equal(copy.advanceCall(id), false);
  }
  assert.equal(copy.liveCall, null);
  assert.equal(copy.money, funds);
  assert.equal(
    copy.campaign!.state.read.filter((id) => id === 'epilogue').length,
    1,
  );
  assert.equal(copy.campaign!.ensureEpilogue(), false);
  copy.continuePlaying();
  assert.equal(copy.round, 32);
  assert.equal(copy.phase, 'playing');
  assert.equal(copy.campaign!.state.contracts, true);
  assert.equal(copy.money, funds);
});

void test('completed legacy imports retire impossible old prerequisite queues without losing resolvable calls', () => {
  for (const resolvable of [false, true]) {
    const c = new Campaign();
    const pending = resolvable
      ? ['ch3.log', 'mercer.exception', 'tony.mercer.exception', 'ch3.cut']
      : ['ch3.cut'];
    Object.assign(c.state, {
      layoutVersion: 2,
      block: 31,
      phase: 1,
      complete: true,
      objects: ['log', 'ledger'],
      flags: ['ch5.recovered', ...pending],
      history: ['ch5.recovered'],
      read: ['ch5.recovered'],
      pending,
      commission: 0,
      blockRate: 0,
    });
    const copy = new Campaign();
    copy.restore(structuredClone(c.state));
    assert.deepEqual(
      copy.state.pending,
      resolvable ? ['ch3.log', 'epilogue'] : ['epilogue'],
    );
    assert.equal(copy.openPhone(), 0);
    assert.deepEqual(copy.state.pending, []);
    assert.equal(copy.state.read.includes('ch3.log'), resolvable);
    assert.equal(copy.state.commission, 0);
    assert.equal(copy.startContracts(), true);
  }
  // Current-format queues are not discarded merely because a dependency is
  // absent; this repair is confined to already completed historical imports.
  const current = new Campaign();
  Object.assign(current.state, {
    block: 31,
    complete: true,
    objects: ['ledger'],
    flags: ['ch3.cut'],
    pending: ['ch3.cut'],
    commission: 0,
    blockRate: 0,
  });
  const copy = new Campaign();
  copy.restore(structuredClone(current.state));
  assert.ok(!copy.state.pending.includes('ch3.cut'));
});
