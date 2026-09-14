import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { Campaign } from '../lib/game/campaign';
import { STORY, blockSpec } from '../lib/game/campaign-content';
import {
  RESTRAINED_STORY,
  RING_WINDOW,
  TONY_CALL_GAP,
} from '../lib/game/narrative';

function finish(c: Campaign) {
  const call = c.state.call!;
  assert.ok(call);
  call.status = 'active';
  call.line = STORY.find((e) => e.id === call.event)!.messages.length - 1;
  return c.completeCall(call.event);
}
function offer(c: Campaign) {
  c.state.block = 31;
  c.state.phase = 2;
  c.trigger('FINAL_LAYER_OPENED');
  assert.equal(c.deliver(), 'mercer.offer');
  finish(c);
}
function balanced(c: Campaign) {
  assert.equal(c.state.grossEarned, c.state.netEarned + c.state.commissionPaid);
  assert.ok(
    c.state.blockFee >= 0 && c.state.blockFee <= c.state.commissionPaid,
  );
}
void test('automatic narrative schedule has ten authored calls and long quiet sections', () => {
  const c = new Campaign();
  const timeline: {
    event: string;
    speaker: string;
    delivery: number;
    activeSeconds: number;
  }[] = [];
  const wait = (seconds: number, busy = false) => {
    for (let i = 0; i < seconds; i++) {
      if (!c.advanceQuiet(1, busy)) continue;
      const event = STORY.find((e) => e.id === c.state.call!.event)!;
      timeline.push({
        event: event.id,
        speaker: event.messages[0].speaker,
        delivery: c.state.block + 1,
        activeSeconds: c.state.activeSeconds!,
      });
      finish(c);
    }
  };
  for (let block = 0; block < 32; block++) {
    c.state.block = block;
    c.trigger('BLOCK_START');
    wait(200, true);
    const object = blockSpec(block).object;
    if (block === 31) {
      c.state.phase = 2;
      c.trigger('FINAL_LAYER_OPENED');
      wait(4);
      c.state.phase = 4;
    }
    if (object) c.collect(object);
    wait(40);
    c.trigger('BLOCK_COMPLETE');
    if (block === 30) wait(4);
  }
  assert.equal(c.finish(), true);
  wait(20);
  assert.equal(timeline.length, 10);
  assert.equal(timeline.filter((t) => t.speaker === 'tony').length, 7);
  assert.equal(timeline.filter((t) => t.speaker === 'mercer').length, 3);
  const normal = timeline.filter((t) => t.delivery < 32);
  for (let i = 1; i < normal.length; i++)
    assert.ok(normal[i].activeSeconds - normal[i - 1].activeSeconds >= 120);
  const tony = normal.filter((t) => t.speaker === 'tony');
  for (let i = 1; i < tony.length; i++)
    assert.ok(
      tony[i].activeSeconds - tony[i - 1].activeSeconds >= TONY_CALL_GAP,
    );
  assert.deepEqual(
    timeline.map((t) => t.event),
    RESTRAINED_STORY.map((e) => e.id),
  );
  mkdirSync('qa-artifacts', { recursive: true });
  writeFileSync(
    'qa-artifacts/narrative-schedule.json',
    JSON.stringify(
      {
        fixture:
          'Synthetic four-minute delivery clock; validates notification ordering and spacing, NOT measured gameplay duration.',
        timeline,
      },
      null,
      2,
    ),
  );
});
void test('seven Tony calls including coda and three Mercer calls remain; historical IDs stay unique', () => {
  assert.equal(new Set(STORY.map((e) => e.id)).size, STORY.length);
  const live = STORY.filter((e) => !e.retired);
  assert.equal(live.length, 10);
  assert.equal(live.filter((e) => e.deliveryMode === 'tony-call').length, 7);
  assert.equal(live.filter((e) => e.deliveryMode === 'mercer-call').length, 3);
  assert.deepEqual(
    new Set(live.map((e) => e.id)),
    new Set(RESTRAINED_STORY.map((e) => e.id)),
  );
  assert.ok(
    STORY.filter((e) => e.id.startsWith('equipment.')).every(
      (e) => e.retired && e.deliveryMode === 'tool-presentation',
    ),
  );
});
void test('routine deliveries, purchases and first rewards never ring', () => {
  const c = new Campaign();
  for (let block = 0; block < 32; block++) {
    c.state.block = block;
    for (const trigger of [
      'GAME_START',
      'FIRST_REWARD',
      'BLOCK_START',
      'TOOL_UNLOCK',
    ] as const)
      c.trigger(trigger, { tool: 'pick' });
  }
  assert.deepEqual(c.state.pending, ['mercer.access']);
  assert.equal(c.deliver(), undefined);
});
void test('each evidence queues its single conversation once, without redundant responses', () => {
  for (const [object, id] of [
    ['tag', 'ch1.tag'],
    ['ring', 'ch2.ring'],
    ['hold', 'mercer.first'],
    ['log', 'ch3.log'],
    ['access', 'ch4.route'],
  ] as const) {
    const c = new Campaign();
    c.collect(object);
    c.collect(object);
    assert.deepEqual(c.state.pending, [id]);
    assert.equal(c.deliver(), id);
    assert.equal(finish(c).completed, true);
    c.collect(object);
    c.trigger('STORY_REWARD_RECOVERED', { object });
    assert.deepEqual(c.state.read, [id]);
    assert.equal(c.deliver(), undefined);
  }
});
void test('log promise applies on final acknowledgement; only unsettled current fees are refunded', () => {
  for (const settled of [false, true]) {
    const c = new Campaign();
    c.state.block = 17;
    c.credit(1000, 'log-cargo');
    c.state.settled = settled;
    c.collect('log');
    c.deliver();
    c.state.call!.status = 'active';
    assert.equal(c.completeCall('ch3.log').completed, false);
    assert.equal(c.state.commission, 12);
    assert.equal(finish(c).refund, settled ? 0 : 40);
    assert.equal(c.state.commission, 8);
    assert.equal(c.rate, settled ? 12 : 8);
    assert.equal(c.completeCall('ch3.log').refund, 0);
    c.next();
    assert.equal(c.rate, 8);
    balanced(c);
  }
});
void test('unread Mercer offer precedes final recovery; waiver refunds only Vault fees exactly once across reload', () => {
  const c = new Campaign();
  let wallet = c.credit(1000, 'prior');
  c.next();
  c.state.block = 31;
  c.state.phase = 2;
  c.state.commission = c.state.blockRate = 8;
  wallet += c.credit(2000, 'vault');
  c.trigger('FINAL_LAYER_OPENED');
  c.collect('ledger');
  assert.equal(c.finish(), false);
  assert.equal(c.deliver(), 'mercer.offer');
  finish(c);
  assert.equal(c.deliver(), 'ch5.recovered');
  c.state.call!.status = 'active';
  assert.equal(c.completeCall('ch5.recovered').completed, false);
  const copy = new Campaign();
  copy.restore(structuredClone(c.state));
  wallet += finish(copy).refund;
  assert.equal(copy.state.blockFee, 0);
  assert.equal(copy.state.commissionPaid, 120);
  assert.equal(wallet, copy.state.netEarned);
  assert.equal(copy.completeCall('ch5.recovered').refund, 0);
  assert.equal(copy.finish(), true);
  assert.equal(copy.state.commission, 0);
  balanced(copy);
});
void test('delayed log cannot restore a waived cut', () => {
  const c = new Campaign();
  offer(c);
  c.collect('ledger');
  c.deliver();
  finish(c);
  c.collect('log');
  c.deliver();
  finish(c);
  assert.equal(c.state.commission, 0);
  assert.equal(c.rate, 0);
  balanced(c);
});
void test('phase call cannot ring early and survives delayed answering', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 1;
  c.trigger('FINAL_LAYER_OPENED');
  assert.deepEqual(c.state.pending, []);
  c.state.phase = 2;
  c.trigger('FINAL_LAYER_OPENED');
  c.state.phase = 1;
  assert.equal(c.deliver(), undefined);
  c.state.phase = 4;
  assert.equal(c.deliver(), 'mercer.offer');
  finish(c);
  assert.equal(c.deliver(), undefined);
});
void test('eight-minute spacing survives reload and busy work; explicit return calls need no waiting', () => {
  const c = new Campaign();
  c.collect('tag');
  c.deliver();
  finish(c);
  c.collect('ring');
  assert.equal(c.advanceQuiet(300, false), false);
  const copy = new Campaign();
  copy.restore(structuredClone(c.state));
  assert.equal(copy.advanceQuiet(TONY_CALL_GAP - 300, true), false);
  assert.equal(copy.advanceQuiet(3, false), true);
  assert.equal(copy.state.call?.event, 'ch2.ring');
  const direct = new Campaign();
  direct.restore(structuredClone(c.state));
  assert.equal(direct.deliver(), 'ch2.ring');
});
void test('three ring cycles become silent pending and stay silent across reload', () => {
  const c = new Campaign();
  c.collect('tag');
  c.deliver();
  assert.equal(c.tickRinging(RING_WINDOW - 0.01), false);
  assert.equal(c.tickRinging(0.02), true);
  assert.equal(c.state.call!.status, 'pending');
  const copy = new Campaign();
  copy.restore(structuredClone(c.state));
  assert.equal(copy.tickRinging(60), false);
  assert.equal(copy.state.call!.status, 'pending');
  assert.equal(finish(copy).completed, true);
});
void test('historical active scripts clamp; retired calls disappear without inventing read history', () => {
  for (const id of ['ch2.ring', 'ch2.internal']) {
    const c = new Campaign();
    c.state.narrativeRevision = 1;
    c.state.objects = ['hold', 'ring'];
    c.state.flags = [id];
    c.state.history = [id];
    c.state.call = { event: id, line: 5, status: 'active' };
    const copy = new Campaign();
    copy.restore(c.state);
    assert.ok(copy.state.history.includes(id));
    assert.ok(!copy.state.read.includes(id));
    if (id === 'ch2.ring') assert.equal(copy.state.call!.line, 2);
    else assert.equal(copy.state.call, undefined);
    assert.ok(copy.state.pending.includes('mercer.first'));
  }
});
void test('old read log adopts prospective cut without replaying credits; old Vault recovers missing prerequisites', () => {
  const c = new Campaign();
  c.credit(1000, 'old');
  c.state.narrativeRevision = 1;
  c.state.flags = c.state.history = c.state.read = ['ch3.log'];
  c.state.objects = ['log'];
  const copy = new Campaign();
  copy.restore(c.state);
  assert.equal(copy.state.commission, 8);
  assert.equal(copy.state.netEarned, 880);
  assert.equal(copy.state.blockFee, 120);
  c.state.block = 31;
  c.state.phase = 4;
  c.state.objects.push('ledger');
  const vault = new Campaign();
  vault.restore(c.state);
  assert.ok(vault.state.pending.includes('mercer.offer'));
  assert.ok(vault.state.pending.includes('ch5.recovered'));
});
void test('unknown effects, invalid clocks/phases and unbalanced money cannot restore', () => {
  const c = new Campaign();
  for (const patch of [
    { phase: 5 },
    { flags: ['fabricated'] },
    { netEarned: 20 },
    { activeSeconds: -1 },
    { lastTonyAt: Infinity },
    { dispatchPending: 'yes' },
    { economyRevision: 3 },
    { storyEffects: ['fake'] },
  ])
    assert.throws(() => new Campaign().restore({ ...c.state, ...patch }));
  c.collect('tag');
  c.deliver();
  c.state.call!.line = 200;
  assert.throws(() => new Campaign().restore(c.state));
});
void test('completed imports recover one quiet coda; contracts wait for acknowledgement', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 4;
  c.state.objects = ['ledger'];
  c.state.complete = true;
  c.state.commission = c.state.blockRate = 0;
  c.state.flags = c.state.history = c.state.read = ['ch5.recovered'];
  c.credit(1000, 'final');
  const copy = new Campaign();
  copy.restore(c.state);
  assert.deepEqual(copy.state.pending, ['epilogue']);
  assert.equal(copy.startContracts(), false);
  assert.equal(copy.advanceQuiet(19, false), false);
  assert.equal(copy.advanceQuiet(1, false), true);
  finish(copy);
  assert.equal(copy.startContracts(), true);
  assert.equal(copy.state.netEarned, 1000);
  assert.equal(copy.rate, 8);
});

void test('quiet time before finishing the Vault cannot shorten the postgame beat', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.objects = ['ledger'];
  c.state.read = ['ch5.recovered'];
  c.state.commission = c.state.blockRate = 0;
  c.advanceQuiet(120, false);
  assert.equal(c.finish(), true);
  assert.equal(c.advanceQuiet(19, false), false);
  assert.equal(c.advanceQuiet(1, false), true);
  assert.equal(c.state.call?.event, 'epilogue');
});
