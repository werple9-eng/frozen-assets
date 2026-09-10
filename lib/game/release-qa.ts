import { campaignField, campaignLoot } from './campaign-layout';
import { blockSpec } from './campaign-content';
import type { IceField } from './ice';
import type { Loot, Vec3 } from './tuning';
import type { GameScene } from './scene';
import { GameModel } from './model';

export const RELEASE_DIRECTIONS: Vec3[] = [
  { x: 1, y: 0, z: 0 },
  { x: -1, y: 0, z: 0 },
  { x: 0, y: 1, z: 0 },
  { x: 0, y: -1, z: 0 },
  { x: 0, y: 0, z: 1 },
  { x: 0, y: 0, z: -1 },
  ...[-1, 1].flatMap((x) =>
    [-1, 1].flatMap((y) => [-1, 1].map((z) => ({ x, y, z }))),
  ),
];
export const RELEASE_CASES = RELEASE_DIRECTIONS.length + 4;

// Synthetic clearance fixtures, not simulated player progress. They cut real
// density samples and keep the surrounding field; no release flag is changed.
export function cutReleasePassage(
  field: IceField,
  item: Loot,
  scenario: number,
) {
  const length =
    field.grid.physicalWidth +
    field.grid.physicalHeight +
    field.grid.physicalDepth +
    3;
  const radius = field.grid.cellSize * (1.25 + (scenario % 3) * 0.1);
  const start = { x: item.x, y: item.y, z: item.z };
  const path = [start];
  if (scenario < RELEASE_DIRECTIONS.length) {
    const d = RELEASE_DIRECTIONS[scenario];
    path.push({
      x: start.x + d.x * length,
      y: start.y + d.y * length,
      z: start.z + d.z * length,
    });
  } else {
    const signX = scenario % 2 ? -1 : 1,
      signY = scenario % 4 < 2 ? -1 : 1;
    path.push({
      ...start,
      x: start.x + signX * (item.w / 2 + field.grid.cellSize * 2.5),
    });
    path.push({
      ...path[1],
      y: start.y + signY * (item.h / 2 + field.grid.cellSize * 2.5),
    });
    path.push({ ...path[2], z: start.z + length });
  }
  for (let i = 0; i < field.points.length; i++) {
    const p = field.points[i];
    // Create the clearance this fixture promises. Fresh cargo no longer starts
    // inside a pre-carved air box, so a narrow passage alone cannot free it.
    if (
      Math.abs(p.x - item.x) < item.w / 2 + field.grid.cellSize &&
      Math.abs(p.y - item.y) < item.h / 2 + field.grid.cellSize &&
      Math.abs(p.z - item.z) < item.d / 2 + field.grid.cellSize
    )
      field.values[i] = 0;
    for (let n = 1; n < path.length; n++) {
      const a = path[n - 1],
        b = path[n];
      const dx = b.x - a.x,
        dy = b.y - a.y,
        dz = b.z - a.z;
      const fraction = Math.max(
        0,
        Math.min(
          1,
          ((p.x - a.x) * dx + (p.y - a.y) * dy + (p.z - a.z) * dz) /
            (dx * dx + dy * dy + dz * dz),
        ),
      );
      if (
        (p.x - a.x - dx * fraction) ** 2 +
          (p.y - a.y - dy * fraction) ** 2 +
          (p.z - a.z - dz * fraction) ** 2 <=
        radius ** 2
      ) {
        field.values[i] = field.warmth[i] = 0;
        break;
      }
    }
  }
  field.revision++;
  field.markAllDirty();
}

export function releaseCorpus() {
  // All 32 deliveries, plus two cycles through the five endless contract types.
  return Array.from({ length: 42 }, (_, block) =>
    Array.from({ length: blockSpec(block, 3).phases }, (_, phase) => ({
      block,
      phase,
    })),
  ).flat();
}

export async function renderedReleaseStress(
  scene: GameScene,
  signal: AbortSignal,
) {
  if (
    new URLSearchParams(location.search).get('qa') !== '1' ||
    !['localhost', '127.0.0.1'].includes(location.hostname)
  )
    throw Error('QA bench only');
  if (!(scene.model instanceof GameModel)) throw Error('Game model required');
  const model = scene.model,
    save = model.serialize(),
    automation = scene.automation;
  const failures: string[] = [];
  let items = 0,
    cases = 0,
    phases = 0,
    meshSamples = 0;
  const started = performance.now();
  scene.automation = undefined;
  scene.cancelInput();
  model.pause(true);
  try {
    for (const { block, phase } of releaseCorpus()) {
      if (signal.aborted || scene.destroyed) throw Error('QA cancelled');
      model.field = campaignField(block, phase, undefined, 3);
      model.loot = campaignLoot(block, phase, 3);
      model.field.carveLoot(model.loot);
      scene.syncField(); // creates the actual authored reward meshes and probes
      const field = model.field,
        original = field.values.slice();
      for (const item of model.loot) {
        const probes = model.contactSamples?.(item);
        if (!probes?.length)
          throw Error(`Missing rendered contacts: ${item.id}`);
        items++;
        meshSamples += probes.length;
        for (let scenario = 0; scenario < RELEASE_CASES; scenario++) {
          field.values.set(original);
          cutReleasePassage(field, item, scenario);
          // A tunnel may leave the decorative mesh touching real ice. The
          // invariant is release whenever every actual mesh probe is clear.
          const touching = probes.some(
            (p) =>
              field.density(
                { x: item.x + p.x, y: item.y + p.y, z: item.z + p.z },
                true,
              ) > 0.5,
          );
          if (!touching && !field.canRelease(item, probes))
            failures.push(`${item.id}:opening-${scenario}`);
          if (touching && field.canRelease(item, probes))
            failures.push(`${item.id}:premature-${scenario}`);
          cases++;
        }
      }
      phases++;
      // Yield between phases so the browser and cancellation stay responsive.
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
    return {
      passed: failures.length === 0,
      phases,
      items,
      cases,
      meshSamples,
      seconds: (performance.now() - started) / 1000,
      failures,
      scope:
        'Synthetic real-density cuts against actual rendered cargo meshes; no player saves or campaign progress.',
    };
  } finally {
    model.restore(save);
    model.pause(true);
    scene.automation = automation;
    scene.syncField();
  }
}
