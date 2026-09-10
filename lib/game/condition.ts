/** Recovery quality adds value; the authored value is never at risk. */
export type ConditionGrade = 'PRISTINE' | 'CLEAN' | 'FAIR' | 'RECOVERED';
export type ConditionTool =
  | 'hand'
  | 'grip'
  | 'pick'
  | 'heavy'
  | 'sledge'
  | 'breaker'
  | 'thermal';
export type ConditionPoint = { x: number; y: number; z: number };
export type CargoSensitivity = { impact: number; heat: number };

/** Flat, JSON-safe optional fields for the existing Loot/save record. */
export type ConditionFields = {
  condition?: number;
  conditionActive?: boolean;
  conditionLocked?: boolean;
  baseValue?: number;
  finalCondition?: number;
  finalGrade?: ConditionGrade;
  finalValue?: number;
};
export type ConditionLoot = ConditionFields &
  ConditionPoint & {
    kind: 'coin' | 'cash' | 'gold';
    /** Authored base value. Condition helpers never change this field. */
    value: number;
    w: number;
    h: number;
    d: number;
    state: string;
    story?: string;
    /** Optional authored extension for watches, paper instruments, etc. */
    sensitivity?: CargoSensitivity;
  };
export type ConditionChange = {
  activated: boolean;
  gradeChanged: boolean;
  previousGrade?: ConditionGrade;
  grade?: ConditionGrade;
  loss: number;
};
export type ConditionRecovery = {
  baseValue: number;
  conditionBonus: number;
  finalValue: number;
  finalCondition?: number;
  finalGrade?: ConditionGrade;
};
export type ImpactConditionInput = {
  tool: ConditionTool;
  point: ConditionPoint;
  radius: number;
  effectiveForce: number;
  expectedStageForce: number;
  exposure: number;
  /** Elapsed active contact time. Only the continuous breaker uses this. */
  dt: number;
};
export type ThermalConditionInput = {
  normalizedHeat: number;
  exposure: number;
  dt: number;
  /** Omit both when normalizedHeat already represents heat at this item. */
  point?: ConditionPoint;
  radius?: number;
};

export const CONDITION_ACTIVATION = 0.2;
export const BREAKER_CONDITION_RATE_CAP = 12;
// Third calibration candidate, pending complete policy runs: scale 36 with
// all-cargo careful aiming yielded Mixed 14.20%, Power 14.45%, Control 15.24%
// weighted premiums. Test scale 60 as the sole condition change; keep the 1.35
// radius, exposure rule, sensitivities and continuous damage caps unchanged.
// The radius crosses the real 0.255-unit pocket gap at 0.3 cell spacing;
// activation still requires outside exposure, not sealed pocket air.
export const IMPACT_CONDITION_SCALE = 60;
export const IMPACT_COLLATERAL_RADIUS_SCALE = 1.35;
export const CARGO_SENSITIVITY: Readonly<
  Record<ConditionLoot['kind'], Readonly<CargoSensitivity>>
> = {
  coin: { impact: 0.15, heat: 0 },
  cash: { impact: 0.65, heat: 1 },
  gold: { impact: 0.3, heat: 0 },
};
export const TOOL_COLLATERAL: Readonly<Record<ConditionTool, number>> = {
  hand: 0.45,
  grip: 0.45,
  pick: 0.65,
  heavy: 0.9,
  sledge: 1.25,
  breaker: 1,
  thermal: 0,
};
export const CONDITION_MULTIPLIER: Readonly<Record<ConditionGrade, number>> = {
  PRISTINE: 1.2,
  CLEAN: 1.12,
  FAIR: 1.05,
  RECOVERED: 1,
};
const BONUS_PERCENT: Readonly<Record<ConditionGrade, number>> = {
  PRISTINE: 20,
  CLEAN: 12,
  FAIR: 5,
  RECOVERED: 0,
};
const unchanged = (): ConditionChange => ({
  activated: false,
  gradeChanged: false,
  loss: 0,
});
const finite = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);
const clamp = (value: number, low: number, high: number) =>
  Math.max(low, Math.min(high, value));
const score = (value: unknown, fallback = 100) =>
  finite(value) ? clamp(value, 0, 100) : fallback;
const fraction = (value: unknown) => (finite(value) ? clamp(value, 0, 1) : 0);
const elapsed = (value: unknown) => (finite(value) ? Math.max(0, value) : 0);
const money = (value: unknown) =>
  finite(value) ? clamp(Math.round(value), 0, Number.MAX_SAFE_INTEGER) : 0;

export function conditionGrade(condition: number): ConditionGrade {
  const value = score(condition);
  return value >= 90
    ? 'PRISTINE'
    : value >= 75
      ? 'CLEAN'
      : value >= 55
        ? 'FAIR'
        : 'RECOVERED';
}

/** Integer currency: round the bonus once, never subtract from authored base. */
export function conditionValue(baseValue: number, grade: ConditionGrade) {
  const base = money(baseValue);
  return Math.min(
    Number.MAX_SAFE_INTEGER,
    base + Math.round((base * BONUS_PERCENT[grade]) / 100),
  );
}

export function conditionBonus(
  loot: Pick<ConditionLoot, 'value' | 'story'> & ConditionFields,
) {
  if (loot.story || !loot.conditionLocked || !finite(loot.finalValue)) return 0;
  return Math.max(0, Math.round(loot.finalValue) - money(loot.value));
}

export function cargoSensitivity(loot: ConditionLoot): CargoSensitivity {
  if (loot.story) return { impact: 0, heat: 0 };
  const authored = loot.sensitivity ?? CARGO_SENSITIVITY[loot.kind];
  return {
    impact: finite(authored?.impact) ? clamp(authored.impact, 0, 2) : 0,
    heat: finite(authored?.heat) ? clamp(authored.heat, 0, 2) : 0,
  };
}

/** Nearest distance to actual bounds, not distance to the item's center. */
export function distanceToLoot(loot: ConditionLoot, point: ConditionPoint) {
  if (
    ![
      loot.x,
      loot.y,
      loot.z,
      loot.w,
      loot.h,
      loot.d,
      point.x,
      point.y,
      point.z,
    ].every(finite) ||
    loot.w < 0 ||
    loot.h < 0 ||
    loot.d < 0
  )
    return Infinity;
  return Math.hypot(
    Math.max(0, Math.abs(point.x - loot.x) - loot.w / 2),
    Math.max(0, Math.abs(point.y - loot.y) - loot.h / 2),
    Math.max(0, Math.abs(point.z - loot.z) - loot.d / 2),
  );
}

function spatialRisk(
  loot: ConditionLoot,
  point: ConditionPoint,
  radius: number,
) {
  if (!finite(radius) || radius <= 0) return 0;
  const distance = distanceToLoot(loot, point);
  return distance >= radius ? 0 : (1 - distance / radius) ** 1.65;
}

/** Useful for the subtle amber cursor accent; hidden/story/released finds are safe. */
export function conditionRisk(
  loot: ConditionLoot,
  input: Pick<ImpactConditionInput, 'tool' | 'point' | 'radius' | 'exposure'>,
) {
  if (
    loot.story ||
    loot.conditionLocked ||
    loot.state !== 'embedded' ||
    (!loot.conditionActive && fraction(input.exposure) < CONDITION_ACTIVATION)
  )
    return 0;
  return (
    spatialRisk(
      loot,
      input.point,
      input.radius * IMPACT_COLLATERAL_RADIUS_SCALE,
    ) *
    TOOL_COLLATERAL[input.tool] *
    cargoSensitivity(loot).impact
  );
}

/** Heat-sensitive paper can warrant the same restrained cursor accent. */
export function thermalConditionRisk(
  loot: ConditionLoot,
  input: { point: ConditionPoint; radius: number; exposure: number },
) {
  if (
    loot.story ||
    loot.conditionLocked ||
    loot.state !== 'embedded' ||
    (!loot.conditionActive && fraction(input.exposure) < CONDITION_ACTIVATION)
  )
    return 0;
  return (
    spatialRisk(loot, input.point, input.radius) * cargoSensitivity(loot).heat
  );
}

function prepare(loot: ConditionLoot, exposure: number): ConditionChange {
  if (loot.story) return unchanged();
  if (loot.state !== 'embedded') {
    finalizeCondition(loot);
    return unchanged();
  }
  if (loot.conditionLocked) return unchanged();
  loot.baseValue = money(loot.value);
  loot.condition = score(loot.condition);
  const previousGrade = conditionGrade(loot.condition);
  const activated =
    !loot.conditionActive && fraction(exposure) >= CONDITION_ACTIVATION;
  if (activated) loot.conditionActive = true;
  return {
    activated,
    gradeChanged: false,
    previousGrade,
    grade: previousGrade,
    loss: 0,
  };
}

function damage(
  loot: ConditionLoot,
  change: ConditionChange,
  requestedLoss: number,
) {
  if (
    !loot.conditionActive ||
    loot.conditionLocked ||
    loot.state !== 'embedded' ||
    loot.story
  )
    return change;
  const before = score(loot.condition);
  const loss = finite(requestedLoss) ? clamp(requestedLoss, 0, before) : 0;
  loot.condition = Math.max(0, before - loss);
  const grade = conditionGrade(loot.condition);
  return {
    ...change,
    loss,
    grade,
    gradeChanged: grade !== change.previousGrade,
  };
}

export function applyImpactCondition(
  loot: ConditionLoot,
  input: ImpactConditionInput,
): ConditionChange {
  const change = prepare(loot, input.exposure);
  if (
    !finite(input.effectiveForce) ||
    input.effectiveForce <= 0 ||
    input.tool === 'thermal'
  )
    return change;
  const expected =
    finite(input.expectedStageForce) && input.expectedStageForce > 0
      ? input.expectedStageForce
      : input.effectiveForce;
  const forceFactor = clamp(input.effectiveForce / expected, 0.65, 1.5);
  const raw =
    IMPACT_CONDITION_SCALE *
    spatialRisk(
      loot,
      input.point,
      input.radius * IMPACT_COLLATERAL_RADIUS_SCALE,
    ) *
    TOOL_COLLATERAL[input.tool] *
    cargoSensitivity(loot).impact *
    forceFactor;
  // Continuous activity is integrated by time, not by render frames or mesh hits.
  // A nominal 13 contacts/sec preserves low-risk scaling before the rate cap.
  const loss =
    input.tool === 'breaker'
      ? Math.min(raw * 13, BREAKER_CONDITION_RATE_CAP) * elapsed(input.dt)
      : raw;
  return damage(loot, change, loss);
}

export function applyThermalCondition(
  loot: ConditionLoot,
  input: ThermalConditionInput,
): ConditionChange {
  const change = prepare(loot, input.exposure);
  const localized =
    input.point && input.radius !== undefined
      ? spatialRisk(loot, input.point, input.radius)
      : input.point || input.radius !== undefined
        ? 0
        : 1;
  const loss =
    3 *
    fraction(input.normalizedHeat) *
    cargoSensitivity(loot).heat *
    elapsed(input.dt) *
    localized;
  return damage(loot, change, loss);
}

/** Call on embedded -> freed. A repeated call can never change the award. */
export function finalizeCondition(loot: ConditionLoot): ConditionRecovery {
  const baseValue = money(loot.value);
  loot.baseValue = baseValue;
  if (loot.story) {
    loot.conditionLocked = true;
    loot.finalValue = baseValue;
    delete loot.condition;
    delete loot.conditionActive;
    delete loot.finalCondition;
    delete loot.finalGrade;
    return { baseValue, conditionBonus: 0, finalValue: baseValue };
  }
  const finalCondition = loot.conditionLocked
    ? score(loot.finalCondition, score(loot.condition))
    : score(loot.condition);
  const finalGrade = conditionGrade(finalCondition),
    finalValue = conditionValue(baseValue, finalGrade);
  loot.condition = loot.finalCondition = finalCondition;
  loot.finalGrade = finalGrade;
  loot.finalValue = finalValue;
  loot.conditionActive = true;
  loot.conditionLocked = true;
  return {
    baseValue,
    conditionBonus: finalValue - baseValue,
    finalValue,
    finalCondition,
    finalGrade,
  };
}

/** Save values are untrusted. Recompute grades and money from trusted content. */
export function validateConditionState(
  raw: unknown,
  context: { baseValue: number; released: boolean; story?: boolean },
): ConditionFields {
  const input =
    raw && typeof raw === 'object' && !Array.isArray(raw)
      ? (raw as Record<string, unknown>)
      : {};
  const baseValue = money(context.baseValue);
  if (context.story)
    return context.released
      ? { baseValue, conditionLocked: true, finalValue: baseValue }
      : { baseValue };
  const locked = context.released || input.conditionLocked === true;
  const condition = locked
    ? score(input.finalCondition, score(input.condition))
    : score(input.condition);
  const result: ConditionFields = {
    baseValue,
    condition,
    conditionActive: locked || input.conditionActive === true,
    conditionLocked: locked,
  };
  if (locked) {
    result.finalCondition = condition;
    result.finalGrade = conditionGrade(condition);
    result.finalValue = conditionValue(baseValue, result.finalGrade);
  }
  return result;
}
