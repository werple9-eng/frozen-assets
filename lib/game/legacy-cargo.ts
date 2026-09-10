import { blockSpec } from './campaign-content';
import { campaignField, campaignLoot } from './campaign-layout';
import type { IceField } from './ice';
import type { Loot } from './tuning';

// The active phase keeps its canonical paid identities while the ice migrates.
// No user-controlled value/geometry payload is stored: frozen layout descriptors
// reconstruct both, and this marker expires at the next physical phase.
export type LegacyCargoRecord = {
  block: number;
  phase: number;
  sourceLayoutVersion: 1 | 2;
  sourcePhase: number;
  repacked: boolean;
};
export function validLegacyCargo(
  raw: unknown,
  block: number,
  phase: number,
): raw is LegacyCargoRecord {
  if (!raw || typeof raw !== 'object') return false;
  const r = raw as LegacyCargoRecord;
  return (
    r.block === block &&
    r.phase === phase &&
    (r.sourceLayoutVersion === 1 || r.sourceLayoutVersion === 2) &&
    Number.isInteger(r.sourcePhase) &&
    r.sourcePhase >= 0 &&
    r.sourcePhase < blockSpec(block, r.sourceLayoutVersion).phases &&
    typeof r.repacked === 'boolean'
  );
}
export function legacyCargoFits(loot: Loot[], field: IceField) {
  const g = field.grid;
  return loot.every(
    (t) =>
      Math.abs(t.x) + t.w / 2 <= g.physicalWidth / 2 &&
      Math.abs(t.z) + t.d / 2 <= g.physicalDepth / 2 &&
      t.y - t.h / 2 >= 0.18 &&
      t.y + t.h / 2 <= 0.18 + g.physicalHeight,
  );
}
export function legacyCargoLoot(record: LegacyCargoRecord): Loot[] {
  const loot = campaignLoot(
    record.block,
    record.sourcePhase,
    record.sourceLayoutVersion,
  );
  const current = blockSpec(record.block, 3);
  // Some old mid-delivery phases become the last phase of the new delivery.
  // They still need its mandatory zero-value evidence, even when the previous
  // layout would have placed it in a now-removed third compartment.
  if (
    record.phase === current.phases - 1 &&
    current.object &&
    !loot.some((t) => t.story === current.object)
  ) {
    const evidence = campaignLoot(record.block, record.phase, 3).find(
      (t) => t.story === current.object,
    );
    if (evidence) loot.push(evidence);
  }
  if (!record.repacked) return loot;
  const field = campaignField(record.block, record.phase, undefined, 3),
    g = field.grid;
  const candidates = field.points.filter(
    (p, i) =>
      field.values[i] > 0.95 &&
      Math.abs(p.x) <
        g.physicalWidth / 2 - Math.min(0.6, g.physicalWidth * 0.22) &&
      Math.abs(p.z) <
        g.physicalDepth / 2 - Math.min(0.55, g.physicalDepth * 0.24) &&
      p.y > 0.18 + Math.min(0.6, g.physicalHeight * 0.22) &&
      p.y < 0.18 + g.physicalHeight - Math.min(0.5, g.physicalHeight * 0.2),
  );
  if (!candidates.length) throw new Error('No safe migration cargo positions');
  const placed: Loot[] = [];
  for (const old of loot) {
    const size = old.story
      ? {
          w: old.story === 'ledger' ? 1.02 : old.story === 'ring' ? 0.38 : 0.68,
          h: old.story === 'ledger' ? 0.23 : 0.1,
          d: old.story === 'ledger' ? 0.7 : 0.4,
        }
      : old.kind === 'coin'
        ? { w: 0.54, h: 0.13, d: 0.54 }
        : old.kind === 'cash'
          ? { w: 0.78, h: 0.22, d: 0.48 }
          : { w: 0.68, h: 0.3, d: 0.46 };
    let best = candidates[0],
      bestScore = -Infinity;
    for (const p of candidates) {
      const score = placed.length
        ? Math.min(
            ...placed.map((t) =>
              Math.hypot(p.x - t.x, (p.y - t.y) * 1.4, p.z - t.z),
            ),
          )
        : p.z;
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    Object.assign(old, size, { x: best.x, y: best.y, z: best.z });
    placed.push(old);
  }
  return loot;
}
