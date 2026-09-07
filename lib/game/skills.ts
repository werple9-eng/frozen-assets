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
export const TREE = { width: 1840, height: 2580, rootX: 920, rootY: 2420 };
const names = {
  heat: 'Heat',
  tank: 'Fuel',
  residual: 'Afterheat',
  wide: 'Fan',
};
const milestones: Record<string, string> = {
  'heat-4': 'Focused flame',
  'heat-8': 'Thermal pulse',
  'heat-12': 'Crucible flame',
  'tank-4': 'Fresh cylinder',
  'tank-8': 'Reserve feed',
  'tank-12': 'Deep reserve',
  'residual-3': 'Stored warmth',
  'residual-6': 'Heat sink',
  'residual-9': 'Heat echo',
  'wide-1': 'Fan nozzle',
  'wide-5': 'Hot sweep',
  'wide-9': 'Dual jet',
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
      x: 425 + branch * 330 + (i % 4 === 2 ? -75 : i % 4 === 3 ? 45 : 0),
      y: 2210 - i * 182,
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
    'heat-4': 'Hold on ice for 1.2s to build 20% extra heat.',
    'heat-8': 'A thermal pulse chips the contact point every 1.5s.',
    'heat-12': 'Four times starting heat, plus focus and thermal pulses.',
    'tank-4': 'Every new batch tops up 20% of your tank for free.',
    'tank-8': 'Recover 2 seconds of fuel each second while the torch rests.',
    'tank-12': '260 seconds of fuel. New batches fill half your tank.',
    'residual-3': 'Stored warmth keeps melting after you move the torch.',
    'residual-6':
      'Twice the stored heat. Sweep between spots and let them thaw.',
    'residual-9':
      'Heat echoes through a wider area when you release the torch.',
    'wide-1': 'Unlock a broad fan. Switch freely between precision and fan.',
    'wide-5': 'Fan penetration rises from 52% to 65% of precision heat.',
    'wide-9': 'Dual jet: fan coverage with 80% of precision heat.',
  };
  if (special[n.id]) return special[n.id];
  if (n.key === 'heat')
    return `+${Math.round((HEAT[n.level] / HEAT[n.level - 1] - 1) * 100)}% heat. Melt the spot under your torch faster.`;
  if (n.key === 'tank')
    return `+${CAPACITY[n.level] - CAPACITY[n.level - 1]} seconds between refills. Refills are always free.`;
  if (n.key === 'wide')
    return `+${Math.round((FAN_RADIUS[n.level] ** 2 / FAN_RADIUS[n.level - 1] ** 2 - 1) * 100)}% fan area. Reach more ice in one sweep.`;
  return n.level === 1
    ? 'Leave a little warmth behind as you move.'
    : `+${Math.round((AFTERHEAT[n.level] / AFTERHEAT[n.level - 1] - 1) * 100)}% lingering heat. Keep melting after moving away.`;
}
