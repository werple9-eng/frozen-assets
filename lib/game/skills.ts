import type { Upgrade } from './model';
import { HEAT, CAPACITY, AFTERHEAT, FAN_RADIUS, COSTS } from './progression';
export type SkillNode = {
  id: string;
  key: Upgrade;
  level: number;
  x: number;
  y: number;
  parent: string;
  name: string;
  major?: boolean;
};
export const NODE = {
  width: 78,
  height: 78,
  majorWidth: 96,
  majorHeight: 96,
  gap: 84,
  lane: 200,
};
export const TREE = { width: 1600, height: 2640, rootX: 800, rootY: 2400 };
export function nodeBounds(n: SkillNode) {
  const w = n.major ? NODE.majorWidth : NODE.width;
  const h = n.major ? NODE.majorHeight : NODE.height;
  return {
    left: n.x - w / 2,
    right: n.x + w / 2,
    top: n.y - h / 2,
    bottom: n.y + h / 2,
  };
}
// Ports are outside the complete card, including all typography. Each branch
// owns a lane; horizontal elbows stay in the empty gap between rows.
export function connectionPoints(n: SkillNode) {
  const parent = SKILLS.find((s) => s.id === n.parent);
  const start = {
    x: parent?.x ?? TREE.rootX,
    y: parent ? nodeBounds(parent).top - 8 : TREE.rootY - 50,
  };
  const end = { x: n.x, y: nodeBounds(n).bottom + 8 };
  return [start, end];
}
export function connectionPath(n: SkillNode) {
  return connectionPoints(n)
    .map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`)
    .join(' ');
}
const names = {
  heat: 'More Heat',
  tank: 'More Fuel',
  residual: 'Lasting Warmth',
  wide: 'Wider Flame',
};
const milestones: Record<string, string> = {
  'heat-4': 'Steady Flame',
  'heat-8': 'Heat Bursts',
  'heat-12': 'Blazing Hot',
  'tank-4': 'Free Top Up',
  'tank-8': 'Rest and Refill',
  'tank-12': 'Big Fuel Tank',
  'residual-3': 'Warm Trail',
  'residual-6': 'Stay Warm',
  'residual-9': 'Spreading Warmth',
  'wide-1': 'Wide Flame',
  'wide-5': 'Hot Sweep',
  'wide-9': 'Twin Flames',
};
export const SKILLS: SkillNode[] = (
  ['heat', 'residual', 'tank', 'wide'] as Upgrade[]
).flatMap((key, branch) =>
  COSTS[key].map((_, i) => {
    const level = i + 1,
      id = `${key}-${level}`;
    return {
      id,
      key,
      level,
      parent: i ? `${key}-${i}` : 'torch',
      x:
        400 +
        (branch + (branch >= 2 ? 1 : 0)) * NODE.lane +
        (i % 4 === 1 ? -55 : i % 4 === 3 ? 55 : 0),
      y: 2280 - i * (NODE.majorHeight + NODE.gap),
      name: milestones[id] || `${names[key]} ${level}`,
      major: !!milestones[id],
    };
  }),
);
export function skillState(node: SkillNode, levels: Record<Upgrade, number>) {
  return levels[node.key] >= node.level
    ? 'purchased'
    : levels[node.key] === node.level - 1
      ? 'available'
      : 'locked';
}
export function skillEffect(key: Upgrade, level: number) {
  if (key === 'heat') return `${HEAT[level]}× heat`;
  if (key === 'tank') return `${CAPACITY[level]}s fuel`;
  if (key === 'wide')
    return level
      ? `${(2.64 * FAN_RADIUS[level] ** 2).toFixed(1)}× melt area`
      : 'Precision only';
  return level ? `${AFTERHEAT[level]}× stored heat` : 'No afterheat';
}
export function skillDescription(n: SkillNode) {
  const special: Record<string, string> = {
    'heat-4': 'Hold on one spot to make the flame hotter.',
    'heat-8': 'Extra bursts of heat break the spot you are melting.',
    'heat-12': 'Melt ice four times faster than your first flame.',
    'tank-4': 'Each new block gives you a free fuel top up.',
    'tank-8': 'Your fuel slowly fills while the torch rests.',
    'tank-12': 'Carry more fuel and refill half the tank with each block.',
    'residual-3': 'Ice keeps melting after you move the flame away.',
    'residual-6': 'Leave twice as much warmth behind the flame.',
    'residual-9': 'Warmth spreads farther when you let go.',
    'wide-1': 'Switch to a wide flame to melt a bigger patch.',
    'wide-5': 'Your wide flame melts deeper into the ice.',
    'wide-9': 'Twin flames melt a wide patch almost as fast as a small one.',
  };
  if (special[n.id]) return special[n.id];
  if (n.key === 'heat') return 'Melt the spot under your flame faster.';
  if (n.key === 'tank') return 'Use the flame longer before you need a refill.';
  if (n.key === 'wide') return 'Melt a bigger patch of ice in one sweep.';
  return n.level === 1
    ? 'Leave a little warmth behind as you move.'
    : 'Keep melting the ice after moving the flame away.';
}
