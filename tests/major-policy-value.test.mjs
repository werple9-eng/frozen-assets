import test from 'node:test';
import assert from 'node:assert/strict';
import {
  expectedPremiumLoss,
  remainingPremium,
} from './major-policy-value.mjs';

const cargo = (condition, value = 100) => ({
  condition,
  value,
  state: 'embedded',
});
void test('already damaged cargo has no economic protection penalty', () => {
  assert.equal(remainingPremium(cargo(54)), 0);
  assert.equal(expectedPremiumLoss(cargo(54), 10000), 0);
  assert.equal(expectedPremiumLoss(cargo(0), Infinity), 0);
});
void test('valuation follows actual grade boundaries and caps catastrophic predictions', () => {
  assert.equal(expectedPremiumLoss(cargo(100), 10), 0);
  assert.equal(expectedPremiumLoss(cargo(100), 11), 8);
  assert.equal(expectedPremiumLoss(cargo(75), 0.1), 7);
  assert.equal(expectedPremiumLoss(cargo(55), 0.1), 5);
  assert.equal(expectedPremiumLoss(cargo(100), Infinity), 20);
  assert.equal(expectedPremiumLoss(cargo(80), 10000), 12);
});
void test('base value and integer award rounding determine the dollar loss', () => {
  assert.equal(expectedPremiumLoss(cargo(100, 1000), 11), 80);
  assert.equal(expectedPremiumLoss(cargo(100, 13), 11), 1);
  assert.equal(
    expectedPremiumLoss({ ...cargo(100, 1000), baseValue: 100 }, 11),
    8,
  );
});
void test('story and released or frozen awards are not protection candidates', () => {
  for (const extra of [
    { story: 'ledger' },
    { state: 'freed' },
    { conditionLocked: true },
  ]) {
    assert.equal(expectedPremiumLoss({ ...cargo(100), ...extra }, 100), 0);
  }
});
