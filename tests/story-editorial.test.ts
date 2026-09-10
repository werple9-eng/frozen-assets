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

void test('Ledger recovery retires queued exposure advice before the exact final call', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 4;
  c.trigger('FINAL_LEDGER_EXPOSED');
  assert.ok(c.state.pending.includes('ch5.exposed'));
  c.collect('ledger');
  assert.equal(c.deliver(), 'ch5.recovered');
  finishCall(c);
  assert.equal(
    c.deliver(),
    undefined,
    'last-restraint advice is obsolete after recovery',
  );
  assert.ok(
    !c.state.read.includes('ch5.exposed'),
    'unheard advice is not falsely marked read',
  );
  c.trigger('FINAL_LEDGER_EXPOSED');
  assert.equal(c.deliver(), undefined);
});

void test('unanswered exposure advice gives way to recovery, while previously read advice stays in history', () => {
  for (const readFirst of [false, true]) {
    const c = new Campaign();
    c.state.block = 31;
    c.state.phase = 4;
    c.trigger('FINAL_LEDGER_EXPOSED');
    assert.equal(c.deliver(), 'ch5.exposed');
    if (readFirst) finishCall(c);
    c.collect('ledger');
    assert.equal(c.deliver(), 'ch5.recovered');
    assert.equal(c.state.history.includes('ch5.exposed'), readFirst);
    assert.equal(c.state.read.includes('ch5.exposed'), readFirst);
    finishCall(c);
    assert.equal(c.deliver(), undefined);
  }
});

void test('resuming an older Ledger checkpoint cannot resurrect unspoken restraint advice', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 4;
  c.trigger('FINAL_LEDGER_EXPOSED');
  c.deliver();
  // This is the exact obsolete queue shape from before recovery cleanup.
  c.state.objects.push('ledger');
  c.trigger('FINAL_LEDGER_RECOVERED');
  const copy = new Campaign();
  copy.restore(structuredClone(c.state));
  assert.equal(copy.deliver(), 'ch5.recovered');
  assert.ok(!copy.state.history.includes('ch5.exposed'));
  finishCall(copy);
  const twice = new Campaign();
  twice.restore(structuredClone(copy.state));
  assert.equal(twice.deliver(), undefined);
  assert.equal(
    twice.state.read.filter((id) => id === 'ch5.recovered').length,
    1,
  );
});

void test('the required ring, Mercer and final commission dialogue keeps the exact user-authored line order', () => {
  const expected: Record<string, string[]> = {
    'ch2.ring': [
      "Hold on. That ring. Don't sell it.",
      "It was my father's. Bellwether froze his estate after he died.",
      "That's why I started looking through your hold in the first place. I should've told you.",
      "I knew his account was mixed in. I didn't know how many others were.",
    ],
    'mercer.first': [
      'This is Helen Mercer, Asset Preservation.',
      'You are in possession of Bellwether custody material. Stop removing inventory and we can correct your account quietly.',
    ],
    'tony.mercer.first': [
      'Helen Mercer. She runs Preservation.',
      "If she's calling you herself, they're finally paying attention.",
    ],
    'mercer.exception': [
      "Internal review documents are not customer records. You do not understand what you're reading.",
      'Return the materials. This is the last informal request.',
    ],
    'tony.mercer.exception': ['She signed the review chain.'],
    'mercer.access': [
      'Your access route has been identified.',
      'The next item removed from Sublevel B will be treated as deliberate theft.',
    ],
    'tony.mercer.access': [
      "That's useful.",
      "Means they finally figured out which door we're using.",
    ],
    'mercer.offer': [
      'You are about to remove protected master records.',
      'Put the ledger back. Bellwether will release your personal claim in full.',
    ],
    'tony.mercer.offer': [
      "That's the first time they've offered you anything.",
    ],
    'ch3.cut': [
      "I've been taking twelve percent while you clean up a mess they already knew about.",
      "Eight from here on. Don't make a thing out of it.",
    ],
    'ch5.recovered': [
      'You got it.',
      "I'm copying it now. Every hold, every review, every account they buried.",
      "By the time they get to my desk, it won't matter.",
      "I'm not taking a cut on this one.",
    ],
  };
  for (const [id, lines] of Object.entries(expected)) {
    const event = STORY.find((e) => e.id === id)!;
    assert.equal(event.retired, undefined, id);
    assert.deepEqual(
      event.messages.map((line) => line.text),
      lines,
      id,
    );
    assert.ok(
      event.messages.every(
        (line) =>
          line.speaker === (id.startsWith('mercer.') ? 'mercer' : 'tony'),
      ),
    );
  }
});

void test('Mercer evidence arcs resume every player-paced line without skipping prerequisites or repeating effects', () => {
  const arcs = [
    {
      block: 10,
      object: 'hold',
      events: ['ch2.internal', 'mercer.first', 'tony.mercer.first'],
    },
    {
      block: 17,
      object: 'log',
      events: [
        'ch3.log',
        'mercer.exception',
        'tony.mercer.exception',
        'ch3.cut',
      ],
    },
    {
      block: 24,
      object: 'access',
      events: ['ch4.route', 'mercer.access', 'tony.mercer.access'],
    },
  ] as const;
  for (const arc of arcs) {
    let m = new GameModel();
    m.round = m.campaign!.state.block = arc.block;
    m.campaign!.state.pending = [];
    m.field = campaignField(arc.block);
    m.loot = campaignLoot(arc.block);
    m.field.carveLoot(m.loot);
    m.revealedTools = [...TOOL_ORDER];
    m.toolNotices = TOOL_ORDER.flatMap((id) => [
      `available:${id}`,
      `ready:${id}`,
      `acquired:${id}`,
    ]);
    m.money += m.campaign!.credit(1000, `story-review-${arc.block}`);
    m.earned += 1000;
    m.campaign!.collect(arc.object);
    for (const id of arc.events) {
      assert.equal(m.campaign!.deliver(), id);
      assert.equal(m.liveCall, null, 'ringing does not disclose the call');
      m.answerPhone();
      const lines = STORY.find((e) => e.id === id)!.messages;
      for (let line = 0; line < lines.length; line++) {
        m = new GameModel(m.serialize());
        assert.equal(m.saveStatus, 'saved');
        assert.equal(m.liveCall!.text, lines[line].text);
        assert.equal(m.liveCall!.institutional, id.startsWith('mercer.'));
        assert.equal(m.campaign!.state.read.includes(id), false);
        assert.equal(m.campaign!.state.commission, 12);
        const current = m.liveCall!.id;
        assert.equal(
          m.advanceCall(`${id}:${line + 1}`),
          false,
          'a stale/different line cannot advance this one',
        );
        assert.equal(m.advanceCall(current), true);
        assert.equal(
          m.advanceCall(current),
          false,
          'the same confirm cannot advance twice',
        );
      }
      assert.ok(m.campaign!.state.read.includes(id));
      assert.equal(
        m.campaign!.state.read.filter((read) => read === id).length,
        1,
      );
    }
    assert.equal(m.campaign!.state.commission, arc.object === 'log' ? 8 : 12);
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
    assert.equal(twice.advanceQuiet(0.8, false), true);
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
  for (let frame = 0; frame < 60 && !copy.phoneRinging; frame++)
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
      resolvable ? [...pending, 'epilogue'] : ['epilogue'],
    );
    assert.equal(copy.openPhone(), 0);
    assert.deepEqual(copy.state.pending, []);
    assert.equal(copy.state.read.includes('ch3.cut'), resolvable);
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
  assert.ok(copy.state.pending.includes('ch3.cut'));
});
