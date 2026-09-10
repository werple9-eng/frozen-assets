import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ALL_TOOL_NODES,
  FITTING_PRICES,
  MECHANIC_NODE,
  NODE_PRICE_BANDS,
  TOOL_ORDER,
  TOOL_PRICES,
  TOOL_TREES,
  nodeState,
} from '../lib/game/tool-trees';

const BRANCHES = ['power', 'speed', 'control', 'technique'] as const;

void test('the compact maps hold 70 distinct fittings with exact tool prices and the authored bands', () => {
  assert.equal(ALL_TOOL_NODES.length, 70);
  assert.equal(new Set(ALL_TOOL_NODES.map((n) => n.id)).size, 70);
  assert.deepEqual(
    TOOL_ORDER.map((t) => TOOL_TREES[t].length),
    [11, 11, 12, 12, 11, 13],
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
  }
});

void test('no fitting repeats another sentence, tiers stop at two, and every step is large enough to feel', () => {
  for (const tool of TOOL_ORDER) {
    const list = TOOL_TREES[tool];
    const texts = list.map((n) => n.description),
      names = list.map((n) => n.name);
    assert.equal(
      new Set(texts).size,
      texts.length,
      `${tool}: repeated description`,
    );
    assert.equal(new Set(names).size, names.length, `${tool}: repeated name`);
    assert.ok(
      !names.some((s) => /\b(I|II|III|IV)$/.test(s)),
      `${tool}: roman tiers`,
    );
    for (const branch of BRANCHES) {
      const chain = list.filter((n) => n.branch === branch);
      assert.ok(chain.length >= 2 && chain.length <= 4, `${tool} ${branch}`);
      assert.ok(
        chain.some((n) => n.major),
        `${tool} ${branch}: milestone`,
      );
      const fittings = chain.filter((n) => !n.major);
      if (fittings[0]?.rank === 1)
        assert.equal(fittings[0].cost, FITTING_PRICES[tool][0], fittings[0].id);
      for (let i = 1; i < fittings.length; i++)
        assert.ok(fittings[i].cost > fittings[i - 1].cost, fittings[i].id);
    }
    // The first fitting in each branch is available at once; deeper ranks wait.
    assert.equal(
      list.filter((n) => nodeState(n, []) === 'available').length,
      4,
    );
  }
  for (const n of ALL_TOOL_NODES) {
    if (n.major) continue;
    const [key, value] = Object.entries(n.effect)[0] as [string, number];
    assert.notEqual(key, 'mechanic', n.id);
    assert.ok(
      Math.abs(Math.log(value)) >= Math.log(1.08) - 1e-9,
      `${n.id}: ${key} ${value}`,
    );
  }
  assert.deepEqual(MECHANIC_NODE, {
    hold: 'HC-S1',
    split: 'IP-P3',
    rhythm: 'IP-S3',
    momentum: 'HP-S3',
    spall: 'HP-T2',
    charge: 'SH-T1',
    breakLoose: 'SH-T3',
    hammer: 'PB-P3',
    rapid: 'PB-S3',
    precisionBit: 'PB-C2',
    wideBit: 'PB-C3',
    debrisKick: 'PB-T2',
    whiteHot: 'TH-P3',
    refill: 'TH-S3',
    fan: 'TH-C2',
    widePower: 'TH-C4',
    echo: 'TH-T3',
  });
});

void test('first later-tool fittings cost a meaningful budget while remaining affordable after acquisition', () => {
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
    2475,
    'Chisel price schedule: two fittings per branch plus unchanged milestones',
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
