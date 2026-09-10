import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyImpactCondition,
  applyThermalCondition,
  conditionGrade,
  conditionValue,
  conditionBonus,
  conditionRisk,
  thermalConditionRisk,
  distanceToLoot,
  finalizeCondition,
  validateConditionState,
  IMPACT_CONDITION_SCALE,
  IMPACT_COLLATERAL_RADIUS_SCALE,
  type ConditionLoot,
  type ImpactConditionInput,
} from '../lib/game/condition';
import { IceField } from '../lib/game/ice';
import type { Loot } from '../lib/game/tuning';

const loot = (overrides: Partial<ConditionLoot> = {}): ConditionLoot => ({
  kind: 'cash',
  value: 100,
  x: 0,
  y: 0,
  z: 0,
  w: 2,
  h: 2,
  d: 2,
  state: 'embedded',
  ...overrides,
});
const impact = (
  overrides: Partial<ImpactConditionInput> = {},
): ImpactConditionInput => ({
  tool: 'pick',
  point: { x: 1, y: 0, z: 0 },
  radius: 1,
  effectiveForce: 1,
  expectedStageForce: 1,
  exposure: 0.2,
  dt: 0.05,
  ...overrides,
});
const close = (a: number, b: number) =>
  assert.ok(Math.abs(a - b) < 1e-8, `${a} should equal ${b}`);

void test('concealed finds are immune until twenty percent exposure; activation fires once', () => {
  const item = loot();
  for (let i = 0; i < 10; i++)
    assert.equal(
      applyImpactCondition(item, impact({ exposure: 0.199 })).loss,
      0,
    );
  assert.equal(item.condition, 100);
  assert.equal(item.conditionActive, undefined);
  const first = applyImpactCondition(item, impact());
  assert.equal(first.activated, true);
  assert.ok(first.loss > 0);
  assert.equal(first.gradeChanged, true);
  assert.equal(first.grade, 'FAIR');
  assert.equal(
    applyImpactCondition(item, impact({ exposure: 0 })).activated,
    false,
  );
  assert.ok(
    item.condition! < 100 - first.loss,
    'activation stays latched if the exposure estimate fluctuates',
  );
});

void test('nearest AABB distance and bounded radius protect distant cargo', () => {
  const item = loot({ w: 10 });
  close(distanceToLoot(item, { x: 5.2, y: 0, z: 0 }), 0.2);
  close(distanceToLoot(item, { x: 5.3, y: 1.4, z: 0 }), 0.5);
  assert.ok(
    applyImpactCondition(item, impact({ point: { x: 5.2, y: 0, z: 0 } })).loss >
      0,
  );
  const distant = loot();
  assert.equal(
    applyImpactCondition(
      distant,
      impact({
        point: { x: 1 + IMPACT_COLLATERAL_RADIUS_SCALE + 1e-6, y: 0, z: 0 },
      }),
    ).loss,
    0,
  );
  assert.equal(
    applyImpactCondition(distant, impact({ point: { x: 10, y: 0, z: 0 } }))
      .loss,
    0,
  );
});

void test('the impact relationship uses falloff, tool profile, sensitivity and bounded force separately', () => {
  const full = applyImpactCondition(loot(), impact()).loss;
  close(full, IMPACT_CONDITION_SCALE * 0.65 * 0.65);
  const halfRisk = applyImpactCondition(
    loot(),
    impact({
      point: { x: 1 + IMPACT_COLLATERAL_RADIUS_SCALE * 0.5, y: 0, z: 0 },
    }),
  ).loss;
  close(halfRisk, full * Math.pow(0.5, 1.65));
  close(
    applyImpactCondition(loot(), impact({ effectiveForce: 100 })).loss,
    full * 1.5,
  );
  close(
    applyImpactCondition(loot(), impact({ effectiveForce: 0.001 })).loss,
    full * 0.65,
  );
  assert.equal(
    applyImpactCondition(loot(), impact({ effectiveForce: 0 })).loss,
    0,
  );
});

void test('tool collateral preserves safe chisel and heavier sledge identities', () => {
  const tools = ['hand', 'pick', 'heavy', 'sledge'] as const;
  const losses = tools.map(
    (tool) => applyImpactCondition(loot(), impact({ tool })).loss,
  );
  for (let i = 1; i < losses.length; i++) assert.ok(losses[i] > losses[i - 1]);
  close(applyImpactCondition(loot(), impact({ tool: 'grip' })).loss, losses[0]);
  assert.equal(
    applyImpactCondition(loot(), impact({ tool: 'thermal' })).loss,
    0,
  );
});

void test('cargo sensitivity is data-driven and durable metal takes less impact than cash', () => {
  const coin = applyImpactCondition(loot({ kind: 'coin' }), impact()).loss;
  const gold = applyImpactCondition(loot({ kind: 'gold' }), impact()).loss;
  const cash = applyImpactCondition(loot(), impact()).loss;
  assert.ok(coin < gold && gold < cash);
  assert.equal(
    applyImpactCondition(
      loot({ sensitivity: { impact: 0, heat: 1 } }),
      impact(),
    ).loss,
    0,
  );
});

void test('breaker maximum condition loss is twelve points per second across timestep partitions', () => {
  for (const steps of [1, 20, 60, 100]) {
    const item = loot();
    for (let i = 0; i < steps; i++)
      applyImpactCondition(item, impact({ tool: 'breaker', dt: 1 / steps }));
    close(item.condition!, 88);
  }
});

void test('breaker low-risk continuous damage is also frame-rate independent', () => {
  const finals = [];
  for (const steps of [10, 40, 120]) {
    const item = loot({ kind: 'coin' });
    for (let i = 0; i < steps; i++)
      applyImpactCondition(
        item,
        impact({
          tool: 'breaker',
          point: { x: 1 + IMPACT_COLLATERAL_RADIUS_SCALE * 0.95, y: 0, z: 0 },
          dt: 1 / steps,
        }),
      );
    finals.push(item.condition!);
  }
  close(finals[0], finals[1]);
  close(finals[1], finals[2]);
  assert.ok(finals[0] > 99);
});

void test('thermal has no effect on coins or gold; cash receives bounded local heat over time', () => {
  for (const kind of ['coin', 'gold'] as const) {
    const item = loot({ kind });
    applyThermalCondition(item, { exposure: 0.8, normalizedHeat: 1, dt: 10 });
    assert.equal(item.condition, 100);
  }
  const cash = loot();
  applyThermalCondition(cash, { exposure: 0.2, normalizedHeat: 1, dt: 2 });
  close(cash.condition!, 94);
  const mild = loot();
  applyThermalCondition(mild, { exposure: 0.2, normalizedHeat: 0.5, dt: 2 });
  close(mild.condition!, 97);
  const hidden = loot();
  assert.equal(
    applyThermalCondition(hidden, { exposure: 0.1, normalizedHeat: 1, dt: 10 })
      .loss,
    0,
  );
});

void test('optional thermal footprint prevents heating a distant exposed item', () => {
  const item = loot();
  assert.equal(
    applyThermalCondition(item, {
      exposure: 1,
      normalizedHeat: 1,
      dt: 1,
      point: { x: 10, y: 0, z: 0 },
      radius: 1,
    }).loss,
    0,
  );
  assert.ok(
    applyThermalCondition(item, {
      exposure: 1,
      normalizedHeat: 1,
      dt: 1,
      point: { x: 1, y: 0, z: 0 },
      radius: 1,
    }).loss > 0,
  );
  assert.equal(
    applyThermalCondition(item, {
      exposure: 1,
      normalizedHeat: 1,
      dt: 1,
      point: { x: 1, y: 0, z: 0 },
    }).loss,
    0,
    'incomplete local geometry is safe',
  );
});

void test('grade changes produce one threshold event instead of a per-point notification', () => {
  const item = loot({ condition: 97 });
  const contact = impact({
    effectiveForce: 0.65,
    point: { x: 1 + IMPACT_COLLATERAL_RADIUS_SCALE * 0.25, y: 0, z: 0 },
  });
  const changed = applyImpactCondition(item, contact);
  assert.equal(changed.previousGrade, 'PRISTINE');
  assert.equal(changed.grade, 'CLEAN');
  assert.equal(changed.gradeChanged, true);
  assert.equal(applyImpactCondition(item, contact).gradeChanged, false);
  assert.equal(applyImpactCondition(item, contact).grade, 'FAIR');
});

void test('the scale60 pilot makes a strong direct pick cost about thirty-eight condition and a strong sledge about seventy-three', () => {
  const pick = applyImpactCondition(loot(), impact({ effectiveForce: 1.5 }));
  const sledge = applyImpactCondition(
    loot(),
    impact({ tool: 'sledge', effectiveForce: 1.5 }),
  );
  close(pick.loss, 38.025);
  close(sledge.loss, 73.125);
  assert.equal(pick.grade, 'FAIR');
  assert.equal(sledge.grade, 'RECOVERED');
  assert.ok(sledge.loss > pick.loss * 1.9);
});

void test('collateral crosses a real pocket gap only after outside exposure opens', () => {
  const field = new IceField(0, undefined, undefined, {
    profile: 'parcel',
    dimensions: { width: 6, height: 4, depth: 5 },
    deliveryId: 'condition-gap',
    phaseId: 'one',
  });
  const item: Loot = {
    id: 'condition-gap-cash',
    kind: 'cash',
    value: 200,
    x: 0,
    y: 1.68,
    z: 0,
    w: 0.78,
    h: 0.22,
    d: 0.48,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  };
  field.carveLoot([item]);
  const gap = field.grid.cellSize * 0.85;
  close(gap, 0.255);
  const input = impact({
    point: { x: item.x, y: item.y, z: item.z + item.d / 2 + gap },
    radius: 0.58,
    exposure: field.exposure(item).exposed,
  });
  close(distanceToLoot(item, input.point), gap);
  assert.equal(field.solidIntersectionCount(item), 0);
  assert.equal(input.exposure, 0, 'pocket air is not outside exposure');
  assert.equal(conditionRisk(item, input), 0);
  assert.equal(applyImpactCondition(item, input).loss, 0);
  assert.equal(item.condition, 100);
  assert.equal(item.conditionActive, undefined);

  const strike = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };
  for (let z = 2.55; z >= 0.25; z -= 0.25)
    field.strikeAt({ x: 0, y: item.y, z }, 4, 0.72, strike, {
      x: 0,
      y: 0,
      z: 1,
    });
  const exposed = { ...input, exposure: field.exposure(item).exposed };
  assert.ok(
    exposed.exposure >= 0.2,
    'the front passage really reaches outside',
  );
  assert.equal(
    field.exposure(item).topCover,
    1,
    'the rest of the ice remains in place',
  );
  const risk = conditionRisk(item, exposed),
    result = applyImpactCondition(item, exposed);
  assert.ok(risk > 0);
  assert.ok(
    result.loss > 3,
    'nearby exposed paper loses a noticeable amount across the real gap',
  );
  close(result.loss, IMPACT_CONDITION_SCALE * risk);
  assert.equal(result.activated, true);
  const beyond = {
    ...exposed,
    point: {
      x: item.x,
      y: item.y,
      z:
        item.z +
        item.d / 2 +
        exposed.radius * IMPACT_COLLATERAL_RADIUS_SCALE +
        0.001,
    },
  };
  assert.equal(conditionRisk(item, beyond), 0);
  assert.equal(applyImpactCondition(item, beyond).loss, 0);
});

void test('all grade boundaries and bonuses are correct and never below authored value', () => {
  for (const [value, grade, multiplier] of [
    [100, 'PRISTINE', 1.2],
    [90, 'PRISTINE', 1.2],
    [89.999, 'CLEAN', 1.12],
    [75, 'CLEAN', 1.12],
    [74.999, 'FAIR', 1.05],
    [55, 'FAIR', 1.05],
    [54.999, 'RECOVERED', 1],
    [0, 'RECOVERED', 1],
  ] as const) {
    assert.equal(conditionGrade(value), grade);
    assert.equal(conditionValue(100, grade), Math.round(100 * multiplier));
    const item = loot({ condition: value });
    const result = finalizeCondition(item);
    assert.equal(result.finalValue, Math.round(100 * multiplier));
    assert.ok(result.finalValue >= item.value);
    assert.equal(item.value, 100);
    assert.equal(conditionBonus(item), result.conditionBonus);
  }
  assert.equal(conditionValue(7, 'FAIR'), 7);
  assert.equal(conditionValue(7, 'PRISTINE'), 8);
});

void test('release freezes condition, grade and payout through falling and collection', () => {
  const item = loot({ condition: 87 });
  const award = finalizeCondition(item);
  for (const state of ['freed', 'landed', 'collecting', 'collected']) {
    item.state = state;
    assert.equal(
      applyImpactCondition(
        item,
        impact({ tool: 'sledge', effectiveForce: 100 }),
      ).loss,
      0,
    );
    assert.equal(
      applyThermalCondition(item, { exposure: 1, normalizedHeat: 1, dt: 100 })
        .loss,
      0,
    );
    assert.deepEqual(finalizeCondition(item), award);
  }
  assert.equal(item.finalCondition, 87);
  assert.equal(item.finalGrade, 'CLEAN');
  assert.equal(item.finalValue, 112);
});

void test('post-release damage calls safely freeze an item even if release hook was missed', () => {
  const item = loot({ state: 'freed', condition: 74 });
  assert.equal(applyImpactCondition(item, impact()).loss, 0);
  assert.equal(item.conditionLocked, true);
  assert.equal(item.finalGrade, 'FAIR');
  assert.equal(item.finalValue, 105);
});

void test('story objects never activate, lose quality, show an economic grade or gain a bonus', () => {
  for (const story of ['tag', 'ring', 'hold', 'log', 'access', 'ledger']) {
    const item = loot({ story, value: 0 });
    assert.deepEqual(applyImpactCondition(item, impact()), {
      activated: false,
      gradeChanged: false,
      loss: 0,
    });
    assert.deepEqual(
      applyThermalCondition(item, { exposure: 1, normalizedHeat: 1, dt: 100 }),
      { activated: false, gradeChanged: false, loss: 0 },
    );
    const result = finalizeCondition(item);
    assert.equal(result.finalGrade, undefined);
    assert.equal(result.finalCondition, undefined);
    assert.equal(result.conditionBonus, 0);
    assert.equal(result.finalValue, 0);
    assert.equal(conditionRisk(item, impact()), 0);
  }
});

void test('save validation discards untrusted payout and grade while preserving legitimate score', () => {
  const state = validateConditionState(
    {
      condition: 82,
      conditionActive: true,
      conditionLocked: true,
      baseValue: 999999,
      finalCondition: 76,
      finalGrade: 'PRISTINE',
      finalValue: Infinity,
    },
    { baseValue: 200, released: true },
  );
  assert.equal(state.baseValue, 200);
  assert.equal(state.condition, 76);
  assert.equal(state.finalGrade, 'CLEAN');
  assert.equal(state.finalValue, 224);
  const json = JSON.parse(JSON.stringify(state));
  assert.deepEqual(
    validateConditionState(json, { baseValue: 200, released: true }),
    state,
  );
});

void test('corrupt and absent condition save data fall back safely without NaN or negative base', () => {
  for (const raw of [
    null,
    [],
    false,
    'bad',
    { condition: NaN, finalValue: 1e30 },
    { condition: -50 },
    { condition: Infinity },
    { condition: '25', conditionActive: 'yes' },
  ]) {
    const state = validateConditionState(raw, {
      baseValue: 125,
      released: false,
    });
    assert.ok(Number.isFinite(state.condition));
    assert.ok(state.condition! >= 0 && state.condition! <= 100);
    assert.equal(state.baseValue, 125);
    assert.equal(state.finalValue, undefined);
  }
  assert.equal(
    validateConditionState(
      { condition: 20 },
      { baseValue: 100, released: false },
    ).condition,
    20,
  );
  assert.equal(
    validateConditionState(
      { condition: 200 },
      { baseValue: 100, released: true },
    ).finalValue,
    120,
  );
  assert.deepEqual(
    validateConditionState(
      { condition: 10, finalGrade: 'FAIR', finalValue: 90 },
      { baseValue: 0, released: true, story: true },
    ),
    { baseValue: 0, conditionLocked: true, finalValue: 0 },
  );
});

void test('ten save cycles preserve the frozen award exactly', () => {
  const item = loot({ value: 375, condition: 89.75 });
  finalizeCondition(item);
  let state = validateConditionState(item, {
    baseValue: item.value,
    released: true,
  });
  const expected = JSON.stringify(state);
  for (let i = 0; i < 10; i++) {
    state = validateConditionState(JSON.parse(JSON.stringify(state)), {
      baseValue: item.value,
      released: true,
    });
    assert.equal(JSON.stringify(state), expected);
  }
});

void test('risk cue excludes concealed cargo, safe tools, story and already-freed finds', () => {
  assert.equal(conditionRisk(loot(), impact({ exposure: 0.1 })), 0);
  assert.equal(conditionRisk(loot({ story: 'ledger' }), impact()), 0);
  assert.equal(conditionRisk(loot({ state: 'freed' }), impact()), 0);
  assert.equal(conditionRisk(loot(), impact({ tool: 'thermal' })), 0);
  assert.ok(
    conditionRisk(loot(), impact({ tool: 'sledge' })) >
      conditionRisk(loot(), impact({ tool: 'hand' })),
  );
});

void test('invalid geometry, force and time cannot poison the condition state', () => {
  const item = loot();
  for (const bad of [NaN, Infinity, -1]) {
    assert.equal(applyImpactCondition(item, impact({ radius: bad })).loss, 0);
    assert.equal(
      applyImpactCondition(item, impact({ effectiveForce: bad })).loss,
      0,
    );
    assert.equal(
      applyImpactCondition(item, impact({ tool: 'breaker', dt: bad })).loss,
      0,
    );
    assert.equal(
      applyThermalCondition(item, { normalizedHeat: 1, dt: bad, exposure: 1 })
        .loss,
      0,
    );
  }
  assert.equal(applyImpactCondition(loot({ w: NaN }), impact()).loss, 0);
  assert.equal(applyImpactCondition(loot({ w: -1 }), impact()).loss, 0);
  assert.ok(Number.isFinite(item.condition));
});

void test('currency quantization remains safe without lowering a valid authored base', () => {
  const base = Number.MAX_SAFE_INTEGER - 10;
  const result = finalizeCondition(loot({ value: base }));
  assert.ok(Number.isSafeInteger(result.finalValue));
  assert.ok(result.finalValue >= base);
  assert.equal(result.baseValue, base);
});

void test('thermal risk cue distinguishes exposed paper from heat-safe metal', () => {
  const input = { point: { x: 1, y: 0, z: 0 }, radius: 1, exposure: 0.2 };
  assert.ok(thermalConditionRisk(loot(), input) > 0);
  assert.equal(thermalConditionRisk(loot({ kind: 'coin' }), input), 0);
  assert.equal(thermalConditionRisk(loot({ kind: 'gold' }), input), 0);
  assert.equal(thermalConditionRisk(loot({ story: 'ledger' }), input), 0);
  assert.equal(thermalConditionRisk(loot(), { ...input, exposure: 0.1 }), 0);
});
