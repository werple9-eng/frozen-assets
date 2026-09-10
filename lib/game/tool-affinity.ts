import type { IceShape } from './ice-grid';
import type { ToolId } from './campaign-content';
/** Small structural advantages. Unlisted pairings stay fully usable. */
export const STRUCTURE_AFFINITIES: Record<
  IceShape,
  Partial<Record<ToolId, number>>
> = {
  parcel: { hand: 1.15, grip: 1.15, pick: 1.05 },
  slab: { pick: 1.15, sledge: 1.05 },
  tower: { pick: 1.1, heavy: 1.1 },
  wings: { sledge: 1.25, heavy: 1.08 },
  seam: { heavy: 1.25, breaker: 1.08 },
  archive: { breaker: 1.25, thermal: 1.08 },
  vault: {},
};
export function toolAffinity(shape: IceShape | undefined, tool: ToolId) {
  return shape ? (STRUCTURE_AFFINITIES[shape]?.[tool] ?? 1) : 1;
}
export const STRUCTURE_LABELS: Record<IceShape, string> = {
  parcel: 'Small parcel',
  slab: 'Broad slab',
  tower: 'Tall custody stack',
  wings: 'Shared supports',
  seam: 'Reinforced seams',
  archive: 'Layered archive',
  vault: 'Preservation vault',
};
