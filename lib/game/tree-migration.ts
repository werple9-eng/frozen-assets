import {
  TOOL_ORDER,
  TOOL_TREES,
  freshNodes,
  toolEffects,
  type MajorTool,
  type NodeEffect,
  type ToolNodesOwned,
} from './tool-trees';
import { TOOL_TREES as OLD, toolEffects as oldEffects } from './legacy-tree';

export type TreeCarry = Partial<Record<MajorTool, NodeEffect>>;
// Revision one used the same IDs for much larger fittings. Map semantics first,
// then preserve any residual numerical benefit without awarding it twice.
const destinations: Record<MajorTool, Record<string, number[]>> = {
  hand: { P: [4, 5], S: [1, 4], C: [3, 4], T: [2, 3] },
  pick: { P: [4, 4, 5], S: [3, 4, 5], C: [3, 4], T: [2, 3] },
  heavy: { P: [3, 4, 5], S: [2, 4, 5], C: [2, 4], T: [2, 3] },
  sledge: { P: [2, 4, 5], S: [2, 4], C: [3, 4], T: [1, 3, 4] },
  breaker: { P: [2, 4, 5], S: [2, 4, 5], C: [3, 4], T: [2, 3] },
  thermal: { P: [2, 4, 5], S: [2, 4, 5], C: [3, 4, 5], T: [1, 3, 4] },
};
export function migrateTreeV1(saved: ToolNodesOwned) {
  const nodes = freshNodes(),
    carry: TreeCarry = {};
  for (const tool of TOOL_ORDER) {
    const list = saved[tool];
    if (
      !Array.isArray(list) ||
      new Set(list).size !== list.length ||
      list.some((id) => !OLD[tool].some((n) => n.id === id))
    )
      throw Error('Invalid old tree');
    for (const n of OLD[tool])
      if (list.includes(n.id)) {
        if (!n.parentIds.every((id) => list.includes(id)))
          throw Error('Invalid old prerequisites');
        const branch = n.id.split('-')[1][0],
          rank = destinations[tool][branch][n.rank - 1];
        for (const next of TOOL_TREES[tool])
          if (
            next.branch === n.branch &&
            next.rank <= rank &&
            !nodes[tool].includes(next.id)
          )
            nodes[tool].push(next.id);
      }
    const before = oldEffects(list),
      after = toolEffects(nodes[tool]);
    const bonus: NodeEffect = {};
    for (const key of [
      'power',
      'center',
      'cycle',
      'depth',
      'area',
      'weak',
      'visible',
      'support',
      'detach',
      'fuel',
      'burn',
      'afterheat',
    ] as const) {
      const a = before[key],
        b = after[key];
      if (key === 'cycle' || key === 'burn' ? a < b : a > b)
        bonus[key] = a / (b || 1);
    }
    // Preserve the old charged swing and side-channel milestones too.
    if (tool === 'sledge' && list.includes('SH-T1'))
      bonus.charge = (list.includes('SH-T2') ? 2.6 : 2) / after.charge;
    if (tool === 'heavy' && list.includes('HP-C1'))
      bonus.side = 1.25 / after.side;
    if (tool === 'heavy' && list.includes('HP-S3'))
      bonus.thirdPower = 1.4 / after.thirdPower;
    if (tool === 'breaker' && list.includes('PB-P3'))
      bonus.sustainPower = 1.3 / after.sustainPower;
    if (tool === 'thermal' && list.includes('TH-P3'))
      bonus.focusPower = 1.3 / after.focusPower;
    if (Object.keys(bonus).length) carry[tool] = bonus;
  }
  return { nodes, carry };
}
export function carriedEffects(nodes: string[], carry?: NodeEffect) {
  const f = toolEffects(nodes);
  if (carry)
    for (const [key, value] of Object.entries(carry)) {
      if (key === 'mechanic') continue;
      const k = key as Exclude<keyof NodeEffect, 'mechanic'>;
      f[k] = (f[k] || 1) * (value as number);
    }
  return f;
}
export function validateCarry(value: unknown): TreeCarry {
  if (value === undefined) return {};
  if (!value || typeof value !== 'object')
    throw Error('Invalid carried fittings');
  const result: TreeCarry = {};
  const keys = Object.keys(toolEffects([])).filter((k) => k !== 'mechanics');
  for (const tool of TOOL_ORDER) {
    const bonus = (value as TreeCarry)[tool];
    if (!bonus) continue;
    for (const [key, n] of Object.entries(bonus))
      if (
        !keys.includes(key) ||
        typeof n !== 'number' ||
        !Number.isFinite(n) ||
        n <= 0 ||
        n > 20
      )
        throw Error('Invalid carried effect');
    result[tool] = { ...bonus };
  }
  return result;
}
