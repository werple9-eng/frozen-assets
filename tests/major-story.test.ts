import test from 'node:test';
import assert from 'node:assert/strict';
import {
  MAJOR_STORY_EVENTS,
  EVIDENCE_ANNOTATIONS,
  storySpeaker,
} from '../lib/game/major-story';
import { STORY } from '../lib/game/campaign-content';

void test('mandatory ring carries the personal reason in one player-paced call', () => {
  const ring = MAJOR_STORY_EVENTS.find((e) => e.id === 'ch2.ring')!;
  assert.equal(ring.object, 'ring');
  assert.equal(ring.required, true);
  assert.equal(ring.trigger, 'STORY_REWARD_RECOVERED');
  assert.equal(ring.messages.length, 4);
  assert.ok(ring.messages.every((line) => line.speaker === 'tony'));
  assert.match(ring.messages[1].text, /father's.*estate/);
  assert.match(ring.messages[2].text, /should've told you/);
});

void test('new story read prerequisites are resolvable, acyclic, and caller-specific', () => {
  const events = new Map(
    [...STORY, ...MAJOR_STORY_EVENTS].map((e) => [e.id, e]),
  );
  const visited = new Set<string>();
  const visit = (id: string, path: string[] = []) => {
    assert.ok(events.has(id), `missing prerequisite ${id}`);
    assert.ok(!path.includes(id), `read cycle ${path.join(' -> ')} -> ${id}`);
    if (visited.has(id)) return;
    for (const parent of events.get(id)!.requiresRead ?? [])
      visit(parent, [...path, id]);
    visited.add(id);
  };
  MAJOR_STORY_EVENTS.forEach((e) => visit(e.id));
  for (const suffix of ['first', 'exception', 'access', 'offer']) {
    const mercer = events.get(`mercer.${suffix}`)!;
    assert.ok(mercer.messages.every((line) => line.speaker === 'mercer'));
    assert.deepEqual(events.get(`tony.mercer.${suffix}`)!.requiresRead, [
      mercer.id,
    ]);
  }
});

void test('commission changes belong to completed authored calls and final cut is spoken last', () => {
  const changes = MAJOR_STORY_EVENTS.filter(
    (e) => e.readEffect?.commission !== undefined,
  );
  assert.deepEqual(
    changes.map((e) => [e.id, e.readEffect!.commission]),
    [
      ['ch3.cut', 8],
      ['ch5.recovered', 0],
    ],
  );
  assert.ok(changes.every((e) => e.effect !== 'commission8'));
  assert.deepEqual(changes[0].requiresRead, ['tony.mercer.exception']);
  const final = changes[1];
  assert.equal(final.trigger, 'FINAL_LEDGER_RECOVERED');
  assert.equal(
    final.messages.at(-1)!.text,
    "I'm not taking a cut on this one.",
  );
});

void test('Mercer offer precedes inner Vault work and evidence annotations wait for their facts', () => {
  assert.equal(
    MAJOR_STORY_EVENTS.find((e) => e.id === 'mercer.offer')!.atPhase,
    2,
  );
  assert.equal(
    MAJOR_STORY_EVENTS.find((e) => e.id === 'ch5.exposed')!.atPhase,
    4,
  );
  for (const annotation of Object.values(EVIDENCE_ANNOTATIONS))
    assert.ok(MAJOR_STORY_EVENTS.some((e) => e.id === annotation.requiresRead));
  assert.equal(storySpeaker('mercer').name, 'HELEN MERCER');
  assert.equal(storySpeaker('mercer').institutional, true);
  assert.equal(storySpeaker('tony').institutional, false);
});
