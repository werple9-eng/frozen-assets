import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const {
  conditionGrade,
  conditionValue,
} = require('../qa-artifacts/major-sim-build/lib/game/condition.js');

/** Simulator valuation only: authored base money is never at risk. */
export function remainingPremium(loot, condition = loot.condition ?? 100) {
  if (loot.story || loot.conditionLocked || loot.state !== 'embedded') return 0;
  const base = loot.baseValue ?? loot.value;
  return Math.max(0, conditionValue(base, conditionGrade(condition)) - base);
}

/** A contact can lose only the difference between real, rounded grade awards. */
export function expectedPremiumLoss(loot, predictedConditionLoss) {
  const before = remainingPremium(loot);
  if (before <= 0 || !(predictedConditionLoss > 0)) return 0;
  const after = remainingPremium(
    loot,
    Math.max(0, (loot.condition ?? 100) - predictedConditionLoss),
  );
  return Math.min(before, Math.max(0, before - after));
}
