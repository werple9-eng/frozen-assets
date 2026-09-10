import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_TOOL_NODES,
  NODE_PRICE_BANDS,
  TOOL_ORDER,
  TOOL_PRICES,
  TOOL_TREES,
  nodeState,
} from '../lib/game/tool-trees';

void test('price calibration keeps all 103 nodes, exact tool prices and the original authored bands', () => {
  assert.equal(ALL_TOOL_NODES.length, 103);
  assert.equal(new Set(ALL_TOOL_NODES.map((n) => n.id)).size, 103);
  assert.deepEqual(
    TOOL_ORDER.map((t) => TOOL_TREES[t].length),
    [16, 17, 17, 17, 17, 19],
  );
  assert.deepEqual(TOOL_PRICES, {
    hand: 0,
    pick: 2500,
    heavy: 6500,
    sledge: 22000,
    breaker: 35000,
    thermal: 45000,
  });
  assert.deepEqual(NODE_PRICE_BANDS, {
    hand: { micro: [60, 220], major: [300, 650] },
    pick: { micro: [180, 500], major: [700, 1400] },
    heavy: { micro: [400, 900], major: [1600, 2800] },
    sledge: { micro: [800, 1800], major: [3000, 6000] },
    breaker: { micro: [1400, 2800], major: [5000, 9000] },
    thermal: { micro: [1800, 3600], major: [6500, 11000] },
  });
  for (const n of ALL_TOOL_NODES) {
    if (n.id === 'HC-S1') {
      assert.equal(n.cost, 25);
      continue;
    }
    const [min, max] = NODE_PRICE_BANDS[n.toolId][n.major ? 'major' : 'micro'];
    assert.ok(Number.isInteger(n.cost) && n.cost >= min && n.cost <= max, n.id);
    if (n.rank >= (n.major ? 5 : 4))
      assert.equal(n.cost, max, `${n.id}: deepest ranks retain their cap`);
  }
});

void test('first later-tool micro choices cost a meaningful budget while remaining affordable after acquisition', () => {
  const rootCosts = {
    pick: 280,
    heavy: 550,
    sledge: 1100,
    breaker: 1800,
    thermal: 2350,
  } as const;
  for (const [tool, expected] of Object.entries(rootCosts)) {
    const roots = TOOL_TREES[tool as keyof typeof TOOL_TREES].filter(
      (n) => !n.major && n.parentIds.length === 0,
    );
    assert.ok(roots.length >= 2, `${tool}: genuine opening branch choice`);
    for (const n of roots) {
      assert.equal(nodeState(n, []), 'available');
      assert.equal(n.cost, expected);
      assert.ok(
        n.cost <= TOOL_PRICES[n.toolId] * 0.2,
        `${n.id}: a fitting remains reachable while saving`,
      );
    }
  }
  assert.equal(
    TOOL_TREES.hand.reduce((s, n) => s + n.cost, 0),
    3295,
    'entire Chisel price schedule stays unchanged',
  );
  const openingPick = TOOL_TREES.pick.filter(
    (n) => !n.major && !n.parentIds.length,
  );
  assert.ok(
    openingPick[0].cost <= 500 &&
      openingPick[0].cost + openingPick[1].cost > 500,
    'a $500 reserve buys one first Pick fitting instead of removing the opening choice',
  );
});
