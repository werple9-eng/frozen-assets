import { IceField } from './ice';
import { blockSpec, type StoryObjectId } from './campaign-content';
import { TUNE, type Loot, type LootKind, type Vec3 } from './tuning';

type VaultCompartment = {
  center: Vec3;
  cover: number;
};
const compartment = (
  x: number,
  y: number,
  z: number,
  cover: number,
): VaultCompartment => ({
  center: { x, y, z },
  cover,
});
// These positions describe physical compartments, not release requirements.
// The nearest sufficiently enclosed grid point is used, then ordinary pocket
// carving and immediate geometry-based release handle every object as usual.
const VAULT_COMPARTMENTS: VaultCompartment[][] = [
  [
    compartment(-3.15, 5.28, -0.6, 1.35),
    compartment(3.15, 5.28, 0.6, 1.35),
    compartment(-3.75, 2.58, 0.3, 1.35),
    compartment(3.75, 2.58, -0.3, 1.35),
    compartment(-0.6, 4.98, 0.3, 1.55),
    compartment(0.6, 1.98, -0.3, 1.05),
  ],
  [
    compartment(-1.05, 2.28, -0.9, 1.15),
    compartment(1.05, 4.98, -0.9, 1.15),
    compartment(1.05, 2.28, -0.9, 1.15),
    compartment(-1.05, 4.98, -0.9, 1.15),
    compartment(0, 3.48, -1.05, 1),
  ],
  [
    compartment(-2.7, 2.28, -0.75, 1.35),
    compartment(2.7, 2.28, 0.75, 1.35),
    compartment(-2.7, 4.38, 0.75, 1.35),
    compartment(2.7, 4.38, -0.75, 1.35),
    compartment(0, 2.28, 0.75, 1.35),
    compartment(0, 4.38, -0.75, 1.35),
  ],
  [
    compartment(-2.55, 2.58, -0.6, 1.4),
    compartment(2.55, 2.58, 0.6, 1.4),
    compartment(-1.65, 4.08, 0.6, 1.4),
    compartment(1.65, 4.08, -0.6, 1.4),
  ],
  [
    compartment(-2.55, 3.78, -0.55, 1.55),
    compartment(2.55, 3.78, 0.55, 1.55),
    compartment(0, 1.98, -0.6, 1.15),
  ],
];
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
  layoutVersion = 3,
) {
  const b = blockSpec(block, layoutVersion);
  if (layoutVersion >= 3 && b.ice) {
    const spec = b.ice.phases[phase];
    if (!spec) throw new Error(`Missing authored phase ${block}:${phase}`);
    return new IceField(block, saved, { scale: 1, shape: spec.profile }, spec);
  }
  return new IceField(block, saved, {
    scale: b.scale,
    shape: b.layers?.[phase] ?? b.profile,
    historicalFinal: true,
  });
}
export function campaignLoot(
  block: number,
  phase = 0,
  layoutVersion = 3,
): Loot[] {
  if (layoutVersion >= 3) return authoredLoot(block, phase);
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

/** Conservative distances to the first visible boundary along each grid axis. */
function interiorCover(field: IceField) {
  const { nx, ny, nz, cellSize } = field.grid;
  const cover = Array.from(
    { length: 3 },
    () => new Float32Array(field.values.length),
  );
  const axes = [
    {
      count: nx,
      lines: ny * nz,
      at: (line: number, n: number) =>
        field.index(n, line % ny, Math.floor(line / ny)),
    },
    {
      count: ny,
      lines: nx * nz,
      at: (line: number, n: number) =>
        field.index(line % nx, n, Math.floor(line / nx)),
    },
    {
      count: nz,
      lines: nx * ny,
      at: (line: number, n: number) =>
        field.index(line % nx, Math.floor(line / nx), n),
    },
  ];
  axes.forEach((axis, direction) => {
    for (let line = 0; line < axis.lines; line++) {
      let run = 0;
      for (let n = 0; n < axis.count; n++) {
        const i = axis.at(line, n);
        run = field.values[i] > 0.5 ? run + 1 : 0;
        cover[direction][i] = Math.max(0, (run - 0.5) * cellSize);
      }
      run = 0;
      for (let n = axis.count - 1; n >= 0; n--) {
        const i = axis.at(line, n);
        run = field.values[i] > 0.5 ? run + 1 : 0;
        cover[direction][i] = Math.min(
          cover[direction][i],
          Math.max(0, (run - 0.5) * cellSize),
        );
      }
    }
  });
  return cover;
}

function authoredLoot(block: number, phase: number): Loot[] {
  const b = blockSpec(block, 3),
    spec = b.ice?.phases[phase];
  if (!spec) throw new Error(`Missing authored loot phase ${block}:${phase}`);
  const field = campaignField(block, phase, undefined, 3),
    result: Loot[] = [];
  const { width, height, depth } = spec.dimensions,
    cell = field.grid.cellSize;
  const object = phase === b.phases - 1 ? b.object : undefined;
  const count = spec.lots + (object ? 1 : 0);
  const cover = interiorCover(field);
  const coverByDimensions = new Map<string, Float32Array>();
  const candidates = field.points.flatMap((p, i) =>
    field.values[i] > 0.95 ? [{ p, i }] : [],
  );
  if (!candidates.length) throw new Error(`No custody positions in ${spec.id}`);
  const totalWeight = b.ice!.phases.reduce((s, p) => s + p.payoutWeight, 0);
  const priorWeight = b
    .ice!.phases.slice(0, phase)
    .reduce((s, p) => s + p.payoutWeight, 0);
  const gross = b.baseGross ?? 0;
  const phaseGross =
    Math.round((gross * (priorWeight + spec.payoutWeight)) / totalWeight) -
    Math.round((gross * priorWeight) / totalWeight);
  const kinds: LootKind[] = Array.from({ length: spec.lots }, (_, i) =>
    b.contract?.archetype === 'clean-recovery'
      ? i % 3
        ? 'cash'
        : 'gold'
      : b.contract?.archetype === 'bulk-clearance' ||
          b.contract?.archetype === 'service-call'
        ? i % 2
          ? 'gold'
          : 'coin'
        : b.contract?.archetype === 'deep-retrieval'
          ? i % 3
            ? 'gold'
            : 'coin'
          : block < 2
            ? 'coin'
            : block === 13
              ? i % 3
                ? 'cash'
                : 'coin'
              : block === 31 && phase < 2
                ? i % 2
                  ? 'gold'
                  : 'coin'
                : i % 3 === 2 && b.chapter >= 2
                  ? 'gold'
                  : i % 2
                    ? 'cash'
                    : 'coin',
  );
  const weights = kinds.map((kind) =>
    kind === 'coin' ? 1 : kind === 'cash' ? 2.5 : 4,
  );
  const weightSum = weights.reduce((s, n) => s + n, 0);
  const vault = block === 31 ? VAULT_COMPARTMENTS[phase] : undefined;
  const orderedResult: Loot[] = [];
  // Reserve the center for the Ledger before fitting its two neighboring finds.
  // Return the established cargo order and IDs so credits and saved rewards stay stable.
  const placementOrder = Array.from({ length: count }, (_, i) => i);
  if (vault && object) placementOrder.unshift(placementOrder.pop()!);
  for (const i of placementOrder) {
    const authored = vault?.[i];
    const story = i === spec.lots ? object : undefined,
      kind = story ? 'gold' : kinds[i];
    const custodyCase = !!vault && !story && kind !== 'coin';
    const dimensions = story
      ? {
          w: story === 'ring' ? 0.38 : story === 'ledger' ? 2.6 : 0.68,
          h: story === 'ledger' ? 0.4 : 0.1,
          d: story === 'ledger' ? 1.8 : 0.4,
        }
      : custodyCase
        ? { w: 1.3, h: kind === 'cash' ? 0.45 : 0.5, d: 0.85 }
        : kind === 'coin'
          ? { w: 0.54, h: 0.13, d: 0.54 }
          : kind === 'cash'
            ? { w: 0.78, h: 0.22, d: 0.48 }
            : { w: 0.68, h: 0.3, d: 0.46 };
    const padding = cell * 0.85;
    const dimensionsKey = `${dimensions.w}:${dimensions.h}:${dimensions.d}`;
    let usableCover = coverByDimensions.get(dimensionsKey);
    if (!usableCover) {
      usableCover = new Float32Array(field.values.length);
      const radii = [
        dimensions.w / 2 + padding,
        dimensions.h / 2 + padding,
        dimensions.d / 2 + padding,
      ];
      const cells = radii.map((radius) => Math.floor(radius / cell));
      for (const { i } of candidates) {
        const p = field.coordinates(i);
        let margin = Infinity;
        for (let dy = -cells[1]; dy <= cells[1]; dy++)
          for (let dz = -cells[2]; dz <= cells[2]; dz++) {
            const at = field.index(p.x, p.y + dy, p.z + dz);
            margin = Math.min(margin, (at < 0 ? 0 : cover[0][at]) - radii[0]);
          }
        for (let dx = -cells[0]; dx <= cells[0]; dx++)
          for (let dz = -cells[2]; dz <= cells[2]; dz++) {
            const at = field.index(p.x + dx, p.y, p.z + dz);
            margin = Math.min(margin, (at < 0 ? 0 : cover[1][at]) - radii[1]);
          }
        for (let dx = -cells[0]; dx <= cells[0]; dx++)
          for (let dy = -cells[1]; dy <= cells[1]; dy++) {
            const at = field.index(p.x + dx, p.y + dy, p.z);
            margin = Math.min(margin, (at < 0 ? 0 : cover[2][at]) - radii[2]);
          }
        usableCover[i] = margin;
      }
      coverByDimensions.set(dimensionsKey, usableCover);
    }
    const candidateCover = ({ i }: { i: number }) => usableCover[i];
    const deepest = candidates.reduce(
      (maximum, candidate) => Math.max(maximum, candidateCover(candidate)),
      -Infinity,
    );
    // Wide outer deliveries bury finds more deeply. Physically smaller inner
    // structures use their available real cover; no additional health is added.
    const requestedCover = Math.min(
      1.05,
      0.45 + block * 0.04,
      Math.min(width, height, depth) * 0.2,
    );
    const minimumCover = Math.min(
      authored ? authored.cover - (custodyCase ? 0.3 : 0) : requestedCover,
      deepest * 0.88,
    );
    const interior = candidates.filter(
      (candidate) =>
        candidateCover(candidate) >= minimumCover &&
        // Compression-seam cargo must sit behind the actual dense channel.
        (!vault ||
          phase !== 1 ||
          Math.abs(candidate.p.x) + dimensions.w / 2 + padding <=
            width * 0.21) &&
        // Alternating lattice and service compartments must keep their depth.
        (!vault ||
          (phase !== 2 && phase !== 3) ||
          candidate.p.z * authored!.center.z > 0),
    );
    let best = interior[0]?.p ?? candidates[0].p,
      bestScore = -Infinity;
    for (const candidate of interior) {
      const { p } = candidate;
      if (
        result.some(
          (t) =>
            Math.abs(p.x - t.x) <
              (dimensions.w + t.w) / 2 + (vault ? 0.55 : 0.04) &&
            Math.abs(p.y - t.y) <
              (dimensions.h + t.h) / 2 + (vault ? 0.55 : 0.04) &&
            Math.abs(p.z - t.z) <
              (dimensions.d + t.d) / 2 + (vault ? 0.55 : 0.04),
        )
      )
        continue;
      const separation = result.length
        ? Math.min(
            ...result.map((t) =>
              Math.hypot(
                (p.x - t.x) / (0.5 * (dimensions.w + t.w) + cell * 2.5),
                (p.y - t.y) / (0.5 * (dimensions.h + t.h) + cell * 2.5),
                (p.z - t.z) / (0.5 * (dimensions.d + t.d) + cell * 2.5),
              ),
            ),
          )
        : 0;
      const score = authored
        ? -Math.hypot(
            p.x - authored.center.x,
            p.y - authored.center.y,
            p.z - authored.center.z,
          )
        : Math.min(4, separation) +
          candidateCover(candidate) * 0.65 +
          0.025 * Math.sin(p.x * 2 + p.y + block + phase);
      if (score > bestScore) {
        best = p;
        bestScore = score;
      }
    }
    if (!Number.isFinite(bestScore))
      throw new Error(`Cargo crowding in ${spec.id}: ${i}`);
    const beforeWeight = weights
      .slice(0, i)
      .reduce((sum, weight) => sum + weight, 0);
    const paidWeight = beforeWeight + (story ? 0 : weights[i]);
    const value = story
      ? 0
      : Math.round((phaseGross * paidWeight) / weightSum) -
        Math.round((phaseGross * beforeWeight) / weightSum);
    const variant = custodyCase
      ? kind === 'cash'
        ? 4
        : 5
      : (block + phase + i) % Math.min(6, b.chapter + 2);
    result.push({
      id: `v3-c${block}-${phase}-${story ? 'story' : i}`,
      kind,
      value,
      x: best.x,
      y: best.y,
      z: best.z,
      ...dimensions,
      state: 'embedded',
      age: 0,
      vy: 0,
      credited: false,
      story,
      variant,
      name:
        story ??
        (custodyCase
          ? kind === 'cash'
            ? 'Sealed archive case'
            : 'Bullion custody case'
          : names[kind === 'coin' ? 0 : kind === 'cash' ? 1 : 2][variant]),
    });
    orderedResult[i] = result[result.length - 1];
  }
  return orderedResult;
}
