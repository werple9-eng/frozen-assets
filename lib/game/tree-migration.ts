import {
  TOOL_ORDER,
  TOOL_TREES,
  freshNodes,
  toolEffects,
  type MajorTool,
  type NodeEffect,
  type ToolNodesOwned,
} from './tool-trees';
import { TOOL_TREES as V2, toolEffects as v2Effects } from './legacy-tree-v2';
import { TOOL_TREES as V1, toolEffects as v1Effects } from './legacy-tree';

export type TreeCarry = Partial<Record<MajorTool, NodeEffect>>;
type Tree = Record<
  MajorTool,
  { id: string; branch: string; rank: number; parentIds: string[] }[]
>;
type Destinations = Record<MajorTool, Record<string, number[]>>;

// Map ownership by meaning: owning an old rank grants every target node of the
// same branch up to its destination rank. Prefixes stay contiguous by design.
function remap(
  saved: ToolNodesOwned,
  from: Tree,
  to: Tree,
  destinations: Destinations,
) {
  const nodes = freshNodes();
  for (const tool of TOOL_ORDER) {
    const list = saved[tool];
    if (
      !Array.isArray(list) ||
      new Set(list).size !== list.length ||
      list.some((id) => !from[tool].some((n) => n.id === id))
    )
      throw Error('Invalid old tree');
    for (const n of from[tool])
      if (list.includes(n.id)) {
        if (!n.parentIds.every((id) => list.includes(id)))
          throw Error('Invalid old prerequisites');
        const branch = n.id.split('-')[1][0],
          rank = destinations[tool][branch][n.rank - 1];
        for (const next of to[tool])
          if (
            next.branch === n.branch &&
            next.rank <= rank &&
            !nodes[tool].includes(next.id)
          )
            nodes[tool].push(next.id);
      }
  }
  return nodes;
}

// Revision one used the same IDs for much larger fittings. Map semantics first,
// then preserve any residual numerical benefit without awarding it twice.
const toRevisionTwo: Destinations = {
  hand: { P: [4, 5], S: [1, 4], C: [3, 4], T: [2, 3] },
  pick: { P: [4, 4, 5], S: [3, 4, 5], C: [3, 4], T: [2, 3] },
  heavy: { P: [3, 4, 5], S: [2, 4, 5], C: [2, 4], T: [2, 3] },
  sledge: { P: [2, 4, 5], S: [2, 4], C: [3, 4], T: [1, 3, 4] },
  breaker: { P: [2, 4, 5], S: [2, 4, 5], C: [3, 4], T: [2, 3] },
  thermal: { P: [2, 4, 5], S: [2, 4, 5], C: [3, 4, 5], T: [1, 3, 4] },
};
export function migrateTreeV1(saved: ToolNodesOwned) {
  const nodes = remap(saved, V1, V2, toRevisionTwo),
    carry: TreeCarry = {};
  for (const tool of TOOL_ORDER) {
    const list = saved[tool];
    const before = v1Effects(list),
      after = v2Effects(nodes[tool]);
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

// Revision two split sixty subjects into I–IV tiers. Two old tiers fold into
// one larger fitting; every old milestone lands on its renamed rank.
const toRevisionThree: Destinations = {
  hand: { P: [1, 1, 2, 2, 3], S: [1, 2, 3, 3], C: [1, 1, 2, 3], T: [1, 1, 2] },
  pick: {
    P: [1, 1, 2, 2, 3],
    S: [1, 1, 2, 2, 3],
    C: [1, 1, 2, 3],
    T: [1, 1, 2],
  },
  heavy: {
    P: [1, 1, 2, 3, 4],
    S: [1, 1, 2, 2, 3],
    C: [1, 1, 2, 3],
    T: [1, 1, 2],
  },
  sledge: {
    P: [1, 1, 2, 2, 3],
    S: [1, 1, 2, 3],
    C: [1, 1, 2, 3],
    T: [1, 2, 2, 3],
  },
  breaker: {
    P: [1, 1, 2, 2, 3],
    S: [1, 1, 2, 2, 3],
    C: [1, 1, 2, 3],
    T: [1, 1, 2],
  },
  thermal: {
    P: [1, 1, 2, 2, 3],
    S: [1, 1, 2, 2, 3],
    C: [1, 1, 2, 3, 4],
    T: [1, 2, 2, 3],
  },
};
const LOWER_IS_BETTER = new Set(['cycle', 'burn', 'steadiness', 'release']);
export function migrateTreeV2(saved: ToolNodesOwned, incoming: TreeCarry = {}) {
  const nodes = remap(saved, V2, TOOL_TREES, toRevisionThree),
    carry: TreeCarry = {};
  for (const tool of TOOL_ORDER) {
    const before = carriedEffects(saved[tool], incoming[tool], v2Effects),
      after = toolEffects(nodes[tool]);
    const bonus: NodeEffect = {};
    for (const key of Object.keys(after) as (keyof typeof after)[]) {
      if (key === 'mechanics') continue;
      const a = before[key] as number,
        b = after[key] as number;
      if (!a) continue;
      if (LOWER_IS_BETTER.has(key) ? a < b : a > b) bonus[key] = a / (b || 1);
    }
    if (Object.keys(bonus).length) carry[tool] = bonus;
  }
  return { nodes, carry };
}
export function carriedEffects(
  nodes: string[],
  carry?: NodeEffect,
  effects: (owned: string[]) => ReturnType<typeof toolEffects> = toolEffects,
) {
  const f = effects(nodes);
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
