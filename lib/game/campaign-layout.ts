import { IceField } from './ice';
import { blockSpec, type StoryObjectId } from './campaign-content';
import { TUNE, type Loot, type LootKind } from './tuning';
const names = [
  [
    'Loose coin',
    'Custody token',
    'Silver washer',
    'Coin roll',
    'Silver ingot',
    'Service medal',
  ],
  [
    'Cash bundle',
    'Sealed envelope',
    'Bearer bond',
    'Gem case',
    'Archive box',
    'Registered instrument',
  ],
  [
    'Gold ingot',
    'Pocket watch',
    'Gem-set ring',
    'Bullion stack',
    'Jewel case',
    'Custody cartridge',
  ],
];
export function campaignField(
  block: number,
  phase = 0,
  saved?: number[],
  layoutVersion = 2,
) {
  const b = blockSpec(block, layoutVersion);
  return new IceField(block, saved, {
    scale: b.scale,
    shape: b.layers?.[phase] ?? b.profile,
  });
}
export function campaignLoot(
  block: number,
  phase = 0,
  layoutVersion = 2,
): Loot[] {
  const b = blockSpec(block, layoutVersion),
    field = campaignField(block, phase, undefined, layoutVersion),
    result: Loot[] = [];
  const count = block === 31 ? [5, 5, 4][phase] : b.lots;
  const candidates = field.points.filter(
    (p, i) =>
      field.values[i] > 0.9 &&
      p.y > 0.18 + b.scale * TUNE.worldScale * 0.7 &&
      p.y <
        0.18 +
          b.scale *
            TUNE.worldScale *
            (field.profile?.shape === 'slab' ? 1.25 : 1.85) &&
      Math.abs(p.x) <
        b.scale *
          TUNE.worldScale *
          (field.profile?.shape === 'tower' ? 1 : 1.55) &&
      Math.abs(p.z) < b.scale * TUNE.worldScale * 0.85,
  );
  // Maximal separation over occupied cells keeps each reward in an actual
  // compartment of the authored silhouette, including supported wings.
  for (let i = 0; i < count; i++) {
    const kind: LootKind =
      block === 0
        ? 'coin'
        : i % 3 === 2 && b.chapter >= 3
          ? 'gold'
          : i % 2
            ? 'cash'
            : 'coin';
    const size = Math.min(1.15, 0.6 + b.scale * 0.25) * TUNE.worldScale;
    let best = candidates[0],
      score = -Infinity;
    for (const p of candidates) {
      const d = result.length
        ? Math.min(
            ...result.map(
              (t) => (p.x - t.x) ** 2 + (p.y - t.y) ** 2 + (p.z - t.z) ** 2,
            ),
          )
        : p.z * 0.6 - p.y * 0.15;
      if (d > score) {
        score = d;
        best = p;
      }
    }
    if (!best) break;
    const variant = (block + phase + i) % Math.min(6, b.chapter + 2);
    result.push({
      id: `c${block}-${phase}-${i}`,
      kind,
      value:
        Math.round(
          ({ coin: 35, cash: 140, gold: 380 }[kind] * b.value) /
            (layoutVersion === 2 && block !== 31
              ? b.phases
              : b.phases === 2
                ? 2
                : 1) /
            5,
        ) * 5,
      x: best.x,
      y: best.y,
      z: best.z,
      w: size * (kind === 'coin' ? 0.48 : 0.65),
      h: size * (kind === 'coin' ? 0.12 : 0.23),
      d: size * 0.4,
      state: 'embedded',
      age: 0,
      vy: 0,
      credited: false,
      variant,
      name: names[kind === 'coin' ? 0 : kind === 'cash' ? 1 : 2][variant],
    });
  }
  const object: StoryObjectId | undefined =
    b.object && phase === b.phases - 1
      ? b.object
      : layoutVersion === 1 || phase === b.phases - 1
        ? b.optional
        : undefined;
  if (object) {
    const t = result[result.length - 1];
    result.push({
      ...t,
      id: `c${block}-${phase}-story`,
      story: object,
      name: object,
      value: 0,
      kind: 'gold',
      x: -t.x,
      y: t.y + 0.25 * b.scale,
      z: -t.z,
      w: t.w * 0.9,
      h: t.h * 0.65,
    });
  }
  return result;
}
