import test from 'node:test';
import assert from 'node:assert/strict';
import { Campaign } from '../lib/game/campaign';
import { blockSpec, STORY } from '../lib/game/campaign-content';
import { MAJOR_RETIRED_STORY_IDS } from '../lib/game/major-story';

function finishCall(campaign: Campaign) {
  const call = campaign.state.call;
  assert.ok(call);
  const event = STORY.find((item) => item.id === call.event);
  assert.ok(event);
  call.status = 'active';
  call.line = event.messages.length - 1;
  return campaign.completeCall(call.event);
}
function nextCall(campaign: Campaign, id: string) {
  assert.equal(campaign.deliver(), id);
  return finishCall(campaign);
}
function ledgerTotals(campaign: Campaign) {
  assert.equal(
    campaign.state.grossEarned,
    campaign.state.netEarned + campaign.state.commissionPaid,
  );
  assert.ok(campaign.state.blockFee >= 0);
  assert.ok(campaign.state.commissionPaid >= campaign.state.blockFee);
}

void test('story replacements retain stable IDs and retired archive records', () => {
  assert.equal(new Set(STORY.map((event) => event.id)).size, STORY.length);
  assert.equal(
    STORY.find((event) => event.id === 'ch2.ring')?.retired,
    undefined,
  );
  for (const id of MAJOR_RETIRED_STORY_IDS)
    assert.equal(STORY.find((event) => event.id === id)?.retired, true, id);
  assert.equal(
    STORY.find((event) => event.id === 'ch2.ring')?.messages.length,
    4,
  );
});

void test('the mandatory ring reaction queues and completes exactly once', () => {
  const c = new Campaign();
  c.state.block = 7;
  c.collect('ring');
  c.collect('ring');
  assert.equal(c.state.pending.filter((id) => id === 'ch2.ring').length, 1);
  const result = nextCall(c, 'ch2.ring');
  assert.equal(result.completed, true);
  c.collect('ring');
  c.trigger('STORY_REWARD_RECOVERED', { object: 'ring' });
  assert.equal(c.state.pending.length, 0);
  assert.equal(c.state.read.filter((id) => id === 'ch2.ring').length, 1);
});

void test('Mercer and Tony responses wait for completed prerequisite calls', () => {
  const c = new Campaign();
  c.state.block = 10;
  c.collect('hold');
  assert.ok(c.state.pending.includes('mercer.first'));
  assert.equal(c.deliver(), 'ch2.internal');
  assert.equal(c.state.read.includes('ch2.internal'), false);
  assert.equal(c.deliver(), undefined);
  finishCall(c);
  nextCall(c, 'mercer.first');
  nextCall(c, 'tony.mercer.first');
  assert.deepEqual(c.state.read, [
    'ch2.internal',
    'mercer.first',
    'tony.mercer.first',
  ]);
  assert.equal(c.deliver(), undefined);
});

void test('exception review changes commission only on the final acknowledgement', () => {
  const c = new Campaign();
  c.state.block = 17;
  assert.equal(c.credit(1000, 'prior'), 880);
  c.collect('log');
  assert.equal(c.state.commission, 12);
  nextCall(c, 'ch3.log');
  nextCall(c, 'mercer.exception');
  nextCall(c, 'tony.mercer.exception');
  assert.equal(c.state.commission, 12);
  assert.equal(c.deliver(), 'ch3.cut');
  c.state.call!.status = 'active';
  assert.deepEqual(c.completeCall('ch3.cut'), { completed: false, refund: 0 });
  assert.equal(c.state.commission, 12);
  const result = finishCall(c);
  assert.deepEqual(result, {
    completed: true,
    refund: 40,
    commissionChanged: 8,
  });
  assert.equal(c.rate, 8, 'an unconstructed settlement uses Tony’s new rate');
  assert.equal(c.state.blockFee, 80);
  assert.ok(c.state.storyEffects?.includes('commission.reviewed'));
  assert.ok(!c.state.flags.includes('commission.reviewed'));
  c.next();
  assert.equal(c.rate, 8);
  assert.equal(c.credit(500, 'next'), 460);
  ledgerTotals(c);
});

void test('a completed receipt is not repriced by the later 8% conversation', () => {
  const c = new Campaign();
  c.state.block = 17;
  c.credit(1000, 'completed-delivery');
  c.state.settled = true;
  c.collect('log');
  assert.equal(c.openPhone(), 0);
  assert.equal(c.state.commission, 8);
  assert.equal(c.rate, 12);
  assert.equal(c.state.blockFee, 120);
  c.next();
  assert.equal(c.rate, 8);
  ledgerTotals(c);
});

void test('a delayed Exception Log conversation cannot restore the final waived commission', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.credit(1000, 'vault');
  c.collect('ledger');
  nextCall(c, 'ch5.recovered');
  c.collect('log');
  assert.equal(c.openPhone(), 0);
  assert.ok(c.state.read.includes('ch3.cut'));
  assert.equal(c.state.commission, 0);
  assert.equal(c.rate, 0);
  assert.equal(c.state.blockFee, 0);
  assert.equal(c.finish(), true);
  ledgerTotals(c);
});

void test('queued phase-specific calls cannot ring early and survive delayed answering', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 1;
  c.trigger('FINAL_LAYER_OPENED');
  assert.equal(c.state.pending.includes('mercer.offer'), false);
  c.state.phase = 2;
  c.trigger('FINAL_LAYER_OPENED');
  assert.ok(c.state.pending.includes('mercer.offer'));
  c.state.phase = 1;
  assert.equal(c.deliver(), undefined);
  c.state.phase = 3;
  nextCall(c, 'mercer.offer');
  nextCall(c, 'tony.mercer.offer');
  assert.equal(c.state.pending.length, 0);
});

void test('final ledger call refunds only the current Vault fee and preserves every ledger identity', () => {
  const c = new Campaign();
  let wallet = c.credit(1000, 'earlier-delivery');
  c.state.block = 31;
  c.state.commission = c.state.blockRate = 8;
  c.state.blockGross = c.state.blockFee = 0;
  wallet += c.credit(800, 'vault-phase-1');
  c.state.phase = 1;
  wallet += c.credit(1200, 'vault-phase-2');
  assert.equal(c.state.blockFee, 160);
  assert.equal(c.rate, 8, 'delivery index alone cannot waive commission');
  c.collect('ledger');
  assert.equal(c.finish(), false);
  assert.equal(c.state.complete, false);
  assert.equal(c.deliver(), 'ch5.recovered');
  c.state.call!.status = 'active';
  assert.equal(c.completeCall('ch5.recovered').completed, false);
  assert.equal(c.state.blockFee, 160);
  const result = finishCall(c);
  wallet += result.refund;
  assert.deepEqual(result, {
    completed: true,
    refund: 160,
    commissionChanged: 0,
  });
  assert.equal(c.state.blockFee, 0);
  assert.equal(c.rate, 0);
  assert.equal(c.state.commissionPaid, 120);
  assert.equal(wallet, c.state.netEarned);
  assert.equal(c.completeCall('ch5.recovered').refund, 0);
  assert.equal(c.finish(), true);
  assert.equal(c.state.complete, true);
  wallet += c.credit(100, 'final-late-land');
  assert.equal(wallet, c.state.netEarned);
  ledgerTotals(c);
});

void test('read state and final refund are idempotent across save checkpoints', () => {
  const c = new Campaign();
  c.state.block = 31;
  c.state.commission = c.state.blockRate = 8;
  c.credit(1250, 'vault-find');
  c.collect('ledger');
  c.deliver();
  c.state.call!.status = 'active';
  c.state.call!.line = 2;
  const resumed = new Campaign();
  resumed.restore(JSON.parse(JSON.stringify(c.state)));
  assert.equal(resumed.state.call?.line, 2);
  assert.equal(resumed.completeCall('ch5.recovered').completed, false);
  assert.equal(finishCall(resumed).refund, 100);
  const again = new Campaign();
  again.restore(JSON.parse(JSON.stringify(resumed.state)));
  assert.equal(again.completeCall('ch5.recovered').refund, 0);
  assert.equal(again.rate, 0);
  ledgerTotals(again);
});

void test('legacy openPhone drains eligible calls through effects and stops at unmet gates', () => {
  const blocked = new Campaign();
  blocked.state.block = 10;
  blocked.state.flags = ['mercer.first'];
  blocked.state.pending = ['mercer.first'];
  assert.equal(blocked.openPhone(), 0);
  assert.deepEqual(blocked.state.pending, ['mercer.first']);
  assert.equal(blocked.state.read.length, 0);
  const log = new Campaign();
  log.state.block = 17;
  log.collect('log');
  assert.equal(log.openPhone(), 0);
  assert.equal(log.state.commission, 8);
  assert.deepEqual(log.state.read, [
    'ch3.log',
    'mercer.exception',
    'tony.mercer.exception',
    'ch3.cut',
  ]);
  const final = new Campaign();
  final.state.block = 31;
  final.credit(1000, 'find');
  final.collect('ledger');
  assert.equal(final.openPhone(), 120);
  assert.equal(final.openPhone(), 0);
  assert.equal(final.state.commission, 0);
  ledgerTotals(final);
});

void test('zero commission and authored five-phase layout checkpoints restore safely', () => {
  assert.equal(blockSpec(31, 3).phases, 5);
  const c = new Campaign();
  c.state.block = 31;
  c.state.phase = 4;
  c.state.commission = c.state.blockRate = 0;
  const copy = new Campaign();
  copy.restore(JSON.parse(JSON.stringify(c.state)));
  assert.equal(copy.state.layoutVersion, 3);
  assert.equal(copy.state.phase, 4);
  assert.equal(copy.rate, 0);
  assert.throws(() => copy.restore({ ...c.state, phase: 5 }));
});

void test('old active dialogue checkpoints clamp shortened scripts and preserve history', () => {
  const c = new Campaign();
  c.state.layoutVersion = 2;
  c.state.block = 10;
  c.state.objects = ['hold'];
  c.state.flags = ['ch2.internal'];
  c.state.history = ['ch2.internal'];
  c.state.call = { event: 'ch2.internal', line: 5, status: 'active' };
  const copy = new Campaign();
  copy.restore(c.state);
  assert.deepEqual(copy.state.history, ['ch2.internal']);
  assert.equal(copy.state.call?.line, 1);
  assert.equal(finishCall(copy).completed, true);
  assert.ok(copy.state.pending.includes('mercer.first'));
  nextCall(copy, 'mercer.first');
});

void test('old completed zero-fee saves retain campaign history without receiving money again', () => {
  const c = new Campaign();
  c.state.layoutVersion = 2;
  c.state.block = 31;
  c.state.objects = ['ledger'];
  c.state.complete = true;
  c.state.flags = ['ch5.recovered', 'ch5.cut'];
  c.state.history = ['ch5.recovered', 'ch5.cut'];
  c.state.read = ['ch5.recovered', 'ch5.cut'];
  c.state.grossEarned = c.state.netEarned = c.state.blockGross = 1000;
  const copy = new Campaign();
  copy.restore(c.state);
  assert.deepEqual(copy.state.history, c.state.history);
  assert.equal(copy.state.netEarned, 1000);
  assert.equal(copy.rate, 0);
  assert.deepEqual(
    copy.state.pending,
    ['epilogue'],
    'the unpaid final coda is restored without replaying earlier effects',
  );
  assert.equal(copy.completeCall('ch5.recovered').refund, 0);
  ledgerTotals(copy);
});

void test('restored effect flags validate but unknown flags and impossible refund balances fail', () => {
  const c = new Campaign();
  c.state.flags = ['commission.reviewed'];
  const copy = new Campaign();
  assert.doesNotThrow(() => copy.restore(c.state));
  assert.deepEqual(copy.state.storyEffects, ['commission.reviewed']);
  assert.deepEqual(copy.state.flags, []);
  assert.throws(() =>
    copy.restore({ ...c.state, storyEffects: ['fabricated-effect'] }),
  );
  assert.throws(() =>
    copy.restore({ ...c.state, flags: ['fabricated-effect'] }),
  );
  assert.throws(() =>
    copy.restore({
      ...c.state,
      blockGross: 100,
      blockFee: 12,
      grossEarned: 100,
      netEarned: 100,
      commissionPaid: 0,
    }),
  );
});

void test('settlement identity belongs to its receipt and clears on the next delivery', () => {
  const c = new Campaign();
  c.state.settled = true;
  c.state.settledId = c.block.id;
  const copy = new Campaign();
  copy.restore(c.state);
  assert.equal(copy.state.settledId, c.block.id);
  assert.throws(() =>
    copy.restore({ ...c.state, settledId: 'unrelated-delivery' }),
  );
  assert.throws(() => copy.restore({ ...c.state, settled: false }));
  copy.next();
  assert.equal(copy.state.settledId, undefined);
  assert.equal(copy.state.settled, false);
});
