import test from 'node:test';
import assert from 'node:assert/strict';
import { MUG_LINES, nextMugLine } from '../lib/game/mug';

void test('the mug has exactly five authored lines and never repeats one back to back', () => {
  assert.deepEqual(
    [...MUG_LINES],
    [
      'I could really use a coffee right now.',
      "That's definitely gone cold.",
      'One more delivery. Then coffee.',
      'I keep forgetting to refill this.',
      "I don't remember making this one.",
    ],
  );
  let seed = 7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const history: number[] = [],
    seen = new Set<number>();
  for (let i = 0; i < 100; i++) {
    const next = nextMugLine(history, random);
    assert.ok(next >= 0 && next < MUG_LINES.length);
    assert.notEqual(next, history[0], `repeat at ${i}`);
    if (history.length > 1)
      assert.notEqual(next, history[1], `near repeat at ${i}`);
    seen.add(next);
    history.unshift(next);
    history.length = Math.min(history.length, 2);
  }
  assert.equal(seen.size, MUG_LINES.length, 'every line appears in 100 taps');
});
