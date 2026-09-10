// Frozen tree revision 2 (103 nodes, September 2026). Read-only migration source;
// do not edit. Live authoring lives in tool-trees.ts.
import type { ToolId } from './campaign-content';

export type MajorTool = Exclude<ToolId, 'grip'>;
export const TOOL_ORDER: MajorTool[] = [
  'hand',
  'pick',
  'heavy',
  'sledge',
  'breaker',
  'thermal',
];
export const canonicalTool = (tool: ToolId): MajorTool =>
  tool === 'grip' ? 'hand' : tool;
export type Branch = 'power' | 'speed' | 'control' | 'technique';
export type NodeEffect = Partial<
  Record<
    | 'power'
    | 'cycle'
    | 'center'
    | 'depth'
    | 'area'
    | 'weak'
    | 'visible'
    | 'support'
    | 'detach'
    | 'fuel'
    | 'burn'
    | 'afterheat'
    | 'side'
    | 'sideDepth'
    | 'steadiness'
    | 'resonance'
    | 'charge'
    | 'wideArea'
    | 'focusPower'
    | 'sustainPower'
    | 'thirdPower'
    | 'release',
    number
  >
> & { mechanic?: string };
export type ToolNode = {
  id: string;
  toolId: MajorTool;
  branch: Branch;
  parentIds: string[];
  x: number;
  y: number;
  name: string;
  description: string;
  major: boolean;
  cost: number;
  effect: NodeEffect;
  comparison: string;
  rank: number;
  glyph: string;
};
export type ToolNodesOwned = Record<MajorTool, string[]>;
export const freshNodes = (): ToolNodesOwned => ({
  hand: [],
  pick: [],
  heavy: [],
  sledge: [],
  breaker: [],
  thermal: [],
});
export const MAP = { width: 1600, height: 1600, rootX: 800, rootY: 800 };
export const BRANCH_COLORS: Record<Branch, string> = {
  power: '#aa6559',
  speed: '#bf9b53',
  control: '#638b9d',
  technique: '#628f83',
};
// Representative equal-spend comparison budgets. Runtime node prices come
// from explicit tier bands below, not a multiplier of delivery earnings.
export const NODE_BUDGET: Record<MajorTool, number> = {
  hand: 175,
  pick: 550,
  heavy: 1900,
  sledge: 4700,
  breaker: 7300,
  thermal: 14600,
};
export const TOOL_PRICES: Record<MajorTool, number> = {
  hand: 0,
  pick: 2500,
  heavy: 6500,
  sledge: 22000,
  breaker: 35000,
  thermal: 45000,
};
export const NODE_PRICE_BANDS: Record<
  MajorTool,
  { micro: [number, number]; major: [number, number] }
> = {
  hand: { micro: [60, 220], major: [300, 650] },
  pick: { micro: [180, 500], major: [700, 1400] },
  heavy: { micro: [400, 900], major: [1600, 2800] },
  sledge: { micro: [800, 1800], major: [3000, 6000] },
  breaker: { micro: [1400, 2800], major: [5000, 9000] },
  thermal: { micro: [1800, 3600], major: [6500, 11000] },
};
// The first small fitting is reachable while saving; deeper ranks cost more,
// and mechanical milestones stay distinct. These are simulator starting values.
// Hold to Chip retains the $25 induction lesson, before the campaign economy.
function nodePrice(
  tool: MajorTool,
  rank: number,
  isMajor: boolean,
  id: string,
) {
  if (id === 'HC-S1') return 25;
  const [min, max] = NODE_PRICE_BANDS[tool][isMajor ? 'major' : 'micro'];
  const rankProgress = Math.min(1, Math.max(0, (rank - 1) / (isMajor ? 4 : 3)));
  // Later equipment starts farther into its existing price band: early choices
  // compete for a real budget, while deepest ranks and all hand prices stay put.
  const progress = tool === 'hand' ? rankProgress : 0.3 + 0.7 * rankProgress;
  const step = isMajor
    ? tool === 'hand' || tool === 'pick'
      ? 50
      : tool === 'heavy'
        ? 100
        : 250
    : tool === 'hand' || tool === 'pick'
      ? 10
      : 50;
  return Math.max(
    min,
    Math.min(max, Math.round((min + (max - min) * progress) / step) * step),
  );
}
type Entry = [string, string, string, NodeEffect, string, boolean?, string?];
const micro = (
  prefix: string,
  names: string[],
  key: keyof NodeEffect,
  factor: number,
  description: string,
  glyph: string,
): Entry[] =>
  names.map((name, i) => [
    `${prefix}${i + 1}`,
    name,
    description,
    { [key]: factor },
    `${factor < 1 ? '−' : '+'}${Math.round(Math.abs(factor - 1) * 100)}% per fitting · stacks with this branch`,
    false,
    glyph,
  ]);
const major = (
  id: string,
  name: string,
  description: string,
  effect: NodeEffect,
  comparison: string,
  glyph: string,
): Entry => [id, name, description, effect, comparison, true, glyph];
const authored: Record<MajorTool, Entry[]> = {
  hand: [
    ...micro(
      'HC-P',
      [
        'Stronger Tap I',
        'Stronger Tap II',
        'Stronger Tap III',
        'Stronger Tap IV',
      ],
      'power',
      1.05,
      'Break 5% more ice with every tap.',
      'HC-P1',
    ),
    major(
      'HC-P5',
      'Hard Edge',
      'A hardened edge drives 20% more force into the center of each tap.',
      { center: 1.2 },
      '+20% center impact',
      'HC-P2',
    ),
    major(
      'HC-S1',
      'Hold to Chip',
      'Hold the button to keep striking.',
      { mechanic: 'hold' },
      'Click → click or hold',
      'HC-S1',
    ),
    ...micro(
      'HC-S',
      ['Quick Hands I', 'Quick Hands II', 'Quick Hands III'],
      'cycle',
      1 / 1.05,
      'Work 5% faster, with the same instant first tap.',
      'HC-S2',
    ).map((n, i) => [n[0].slice(0, -1) + (i + 2), ...n.slice(1)] as Entry),
    ...micro(
      'HC-C',
      ['Sharp Point I', 'Sharp Point II', 'Sharp Point III'],
      'center',
      1.05,
      'Concentrate 5% more impact at the point.',
      'HC-C1',
    ),
    major(
      'HC-C4',
      'Surface Peel',
      'Peel ice around visible finds 25% faster.',
      { visible: 1.25 },
      '+25% near visible finds',
      'HC-C2',
    ),
    ...micro(
      'HC-T',
      ['Clean Release I', 'Clean Release II'],
      'release',
      0.95,
      'Clear the last thin restraints around small finds 5% sooner. Solid ice still holds them.',
      'HC-T1',
    ),
    major(
      'HC-T3',
      'Flick Loose',
      'Dislodge weak pieces close to the tip.',
      { detach: 1.25 },
      '+25% local weak-ice reach',
      'HC-T2',
    ),
  ],
  pick: [
    ...micro(
      'IP-P',
      ['Deeper Bite I', 'Deeper Bite II', 'Deeper Bite III', 'Hardened Point'],
      'power',
      1.05,
      'Drive the point through 5% more ice.',
      'IP-P1',
    ),
    major(
      'IP-P5',
      'Split Strike',
      'Every fourth hit in one spot chips a second piece. Moving resets the count.',
      { mechanic: 'split' },
      '4 local hits → a second chip',
      'IP-P3',
    ),
    ...micro(
      'IP-S',
      [
        'Faster Swing I',
        'Faster Swing II',
        'Faster Swing III',
        'Faster Swing IV',
      ],
      'cycle',
      1 / 1.05,
      'Swing 5% faster without losing the readable impact.',
      'IP-S1',
    ),
    major(
      'IP-S5',
      'Rhythm',
      'Hold on one spot for 1.2 seconds to find a faster rhythm.',
      { mechanic: 'rhythm' },
      '+15% sustained cadence',
      'IP-S3',
    ),
    ...micro(
      'IP-C',
      ['Sharp Point I', 'Sharp Point II', 'Sharp Point III'],
      'center',
      1.05,
      'Put 5% more force into the center of the strike.',
      'IP-C1',
    ),
    major(
      'IP-C4',
      'Reward Carve',
      'Carve around visible valuables 25% faster.',
      { visible: 1.25 },
      '+25% near visible finds',
      'IP-C2',
    ),
    ...micro(
      'IP-T',
      ['Crack Chaser I', 'Crack Chaser II'],
      'weak',
      1.07,
      'Strike already damaged ice 7% harder.',
      'IP-T1',
    ),
    major(
      'IP-T3',
      'Hook Out',
      'Pull loose weak fragments around your strike.',
      { detach: 1.4 },
      '+40% local weak-ice reach',
      'IP-T2',
    ),
  ],
  heavy: [
    ...micro(
      'HP-P',
      ['Heavier Head I', 'Heavier Head II', 'Heavier Head III'],
      'power',
      1.05,
      'A heavier forged head breaks 5% more ice.',
      'HP-P1',
    ),
    [
      'HP-P4',
      'Deep Bite',
      'Reach 8% deeper along the contact normal.',
      { depth: 1.08 },
      '+8% depth',
      false,
      'HP-P2',
    ],
    major(
      'HP-P5',
      'Breakthrough',
      'Punch a deeper channel with the forged point.',
      { center: 1.2, depth: 1.15 },
      '+20% center · +15% depth',
      'HP-P3',
    ),
    ...micro(
      'HP-S',
      [
        'Better Balance I',
        'Better Balance II',
        'Recovery Grip I',
        'Recovery Grip II',
      ],
      'cycle',
      1 / 1.04,
      'Recover 4% faster while keeping the heavy swing.',
      'HP-S1',
    ),
    major(
      'HP-S5',
      'Momentum',
      'Every third hit in one area carries extra force.',
      { mechanic: 'momentum', thirdPower: 1.3 },
      'Third local hit: +30% force',
      'HP-S3',
    ),
    ...micro(
      'HP-C',
      ['Guided Strike I', 'Guided Strike II'],
      'side',
      1.1,
      'Reduce the penalty on side-face strikes by 8 percentage points.',
      'HP-C1',
    ),
    [
      'HP-C3',
      'Reach In',
      'Reach 8% deeper into side faces.',
      { sideDepth: 1.08 },
      '+8% side depth',
      false,
      'HP-C2',
    ],
    major(
      'HP-C4',
      'Deep Reach',
      'Reach another 12% deeper into side channels.',
      { sideDepth: 1.12 },
      '+12% side depth',
      'HP-C2',
    ),
    ...micro(
      'HP-T',
      ['Support Breaker I', 'Support Breaker II'],
      'support',
      1.15,
      'Break thin local supports 15% faster.',
      'HP-T1',
    ),
    major(
      'HP-T3',
      'Spall',
      'A hit can fracture one nearby weakened piece.',
      { mechanic: 'spall' },
      'One bounded secondary fracture',
      'HP-T2',
    ),
  ],
  sledge: [
    ...micro(
      'SH-P',
      ['Forged Head I', 'Forged Head II', 'Full Swing I', 'Full Swing II'],
      'power',
      1.05,
      'Drive 5% more force through the broad head.',
      'SH-P1',
    ),
    major(
      'SH-P5',
      'Demolition Blow',
      'A heavy blow shakes apart nearby weak fractures.',
      { detach: 1.7 },
      '+70% local fracture reach',
      'SH-P3',
    ),
    ...micro(
      'SH-S',
      ['Lighter Handle I', 'Lighter Handle II'],
      'cycle',
      1 / 1.04,
      'Recover 4% faster between heavy swings.',
      'SH-S1',
    ),
    [
      'SH-S3',
      'Quick Recovery',
      'Recover 5% faster after impact.',
      { cycle: 1 / 1.05 },
      '+5% cadence',
      false,
      'SH-S2',
    ],
    major(
      'SH-S4',
      'Balanced Swing',
      'Recover 7% faster while retaining a heavy, readable arc.',
      { cycle: 1 / 1.07 },
      '+7% cadence · heavy cycle floor',
      'SH-S2',
    ),
    ...micro(
      'SH-C',
      ['Wide Face I', 'Wide Face II', 'Wide Face III'],
      'area',
      1.05,
      'A broader face chips 5% more area.',
      'SH-C1',
    ),
    major(
      'SH-C4',
      'Shock Ring',
      'Spread the blow through nearby weak fractures.',
      { detach: 1.25 },
      '+25% weak-fracture influence',
      'SH-C2',
    ),
    major(
      'SH-T1',
      'Wind Up',
      'Hold up to 650ms, then release a charged blow.',
      { mechanic: 'charge', charge: 1.75 },
      'Charge up to 1.75× force',
      'SH-T1',
    ),
    [
      'SH-T2',
      'Heavier Charge I',
      'A full wind-up now delivers 1.90× force.',
      { charge: 1.9 / 1.75 },
      '1.75× → 1.90× maximum',
      false,
      'SH-T2',
    ],
    [
      'SH-T3',
      'Heavier Charge II',
      'A full wind-up now delivers 2.05× force.',
      { charge: 2.05 / 1.9 },
      '1.90× → 2.05× maximum',
      false,
      'SH-T2',
    ],
    major(
      'SH-T4',
      'Break Loose',
      'Charged blows detach weak fragments close to the impact.',
      { mechanic: 'breakLoose' },
      'Charged local breakaway',
      'SH-T3',
    ),
  ],
  breaker: [
    ...micro(
      'PB-P',
      [
        'Harder Stroke I',
        'Harder Stroke II',
        'Bigger Piston I',
        'Bigger Piston II',
      ],
      'power',
      1.05,
      'The piston delivers 5% more impact.',
      'PB-P1',
    ),
    major(
      'PB-P5',
      'Hammer Mode',
      'Maintain contact for one second to engage full hammer force.',
      { mechanic: 'hammer', sustainPower: 1.2 },
      '+20% sustained force',
      'PB-P3',
    ),
    ...micro(
      'PB-S',
      [
        'Faster Motor I',
        'Faster Motor II',
        'High Speed Drive I',
        'High Speed Drive II',
      ],
      'cycle',
      1 / 1.05,
      'Deliver 5% more strokes per second.',
      'PB-S1',
    ),
    major(
      'PB-S5',
      'Rapid Start',
      'Reach full motor speed 40% sooner.',
      { mechanic: 'rapid' },
      '1.0s → 0.6s motor ramp',
      'PB-S3',
    ),
    ...micro(
      'PB-C',
      ['Steadier Bit I', 'Steadier Bit II'],
      'steadiness',
      0.7,
      'Reduce physical bit drift and recoil by 30%.',
      'PB-C1',
    ),
    major(
      'PB-C3',
      'Precision Bit',
      'Choose a narrower bit for a deeper channel. Switch freely.',
      { mechanic: 'precisionBit' },
      'Narrower area · deeper channel',
      'PB-C1',
    ),
    major(
      'PB-C4',
      'Wide Bit',
      'Choose a wider bit for shallow clearing. Both bits stay available.',
      { mechanic: 'wideBit' },
      'Wide or precision · freely selectable',
      'PB-C2',
    ),
    ...micro(
      'PB-T',
      ['Resonance I', 'Resonance II'],
      'resonance',
      1.15,
      'Build local fracture resonance 15% faster while working.',
      'PB-T1',
    ),
    major(
      'PB-T3',
      'Debris Kick',
      'Sustained strokes kick loose nearby weak fragments.',
      { mechanic: 'debrisKick' },
      'Sustained local breakaway',
      'PB-T2',
    ),
  ],
  thermal: [
    ...micro(
      'TH-P',
      ['Hotter Heat I', 'Hotter Heat II', 'Focused Heat I', 'Focused Heat II'],
      'power',
      1.05,
      'Melt 5% faster with either nozzle.',
      'TH-P1',
    ),
    major(
      'TH-P5',
      'White Hot',
      'The precision nozzle concentrates a white-hot core.',
      { mechanic: 'whiteHot', focusPower: 1.2 },
      '+20% precision heat',
      'TH-P3',
    ),
    ...micro(
      'TH-S',
      ['Bigger Tank I', 'Bigger Tank II'],
      'fuel',
      1.05,
      'Carry 5% more fuel.',
      'TH-S1',
    ),
    [
      'TH-S3',
      'Efficient Burn I',
      'Use 5% less fuel per second.',
      { burn: 0.95 },
      '−5% fuel use',
      false,
      'TH-S2',
    ],
    [
      'TH-S4',
      'Efficient Burn II',
      'Use another 5% less fuel per second.',
      { burn: 0.95 },
      '−5% fuel use',
      false,
      'TH-S2',
    ],
    major(
      'TH-S5',
      'Rest Refill',
      'The tank slowly refills while you stop working.',
      { mechanic: 'refill' },
      '+2 fuel per second at rest',
      'TH-S3',
    ),
    ...micro(
      'TH-C',
      ['Wider Heat I', 'Wider Heat II'],
      'area',
      1.05,
      'Heat 5% more area with either nozzle.',
      'TH-C2',
    ),
    major(
      'TH-C3',
      'Fan Nozzle',
      'Unlock a broad fan for shallow surface clearing.',
      { mechanic: 'fan' },
      'Precision or wide heat',
      'TH-C1',
    ),
    [
      'TH-C4',
      'Wider Fan',
      'Spread the wide nozzle over 8% more area.',
      { wideArea: 1.08 },
      '+8% wide area',
      false,
      'TH-C2',
    ],
    major(
      'TH-C5',
      'Stronger Wide Heat',
      'A reinforced nozzle keeps more heat in the fan.',
      { mechanic: 'widePower' },
      'Wide heat: 80% precision power',
      'TH-C3',
    ),
    [
      'TH-T1',
      'Heat Stays I',
      'Warm ice keeps melting briefly after you move away.',
      { afterheat: 0.65 },
      'Lingering local heat',
      false,
      'TH-T1',
    ],
    [
      'TH-T2',
      'Heat Stays II',
      'Retain 10% more lingering heat.',
      { afterheat: 1.1 },
      '+10% lingering heat',
      false,
      'TH-T1',
    ],
    [
      'TH-T3',
      'Stored Heat',
      'Retain 15% more lingering heat.',
      { afterheat: 1.15 },
      '+15% lingering heat',
      false,
      'TH-T2',
    ],
    major(
      'TH-T4',
      'Heat Echo',
      'Leaving a hot spot releases one delayed pulse. It cannot chain.',
      { mechanic: 'echo' },
      'One extra melt pulse after 0.4s',
      'TH-T3',
    ),
  ],
};
// Individual workshop maps, authored in root-relative coordinates. Compact
// chisel fork, balanced pick, broad heavy pick, swept sledge, offset mechanical
// breaker and flowing thermal crown. Progression IDs and saved ownership stay stable.
const layouts: Record<MajorTool, Record<string, [number, number][]>> = {
  hand: {
    P: [
      [-112, -60],
      [-197, -139],
    ],
    S: [
      [74, -111],
      [162, -166],
    ],
    C: [
      [112, 52],
      [206, 118],
    ],
    T: [
      [-68, 111],
      [-147, 195],
    ],
  },
  pick: {
    P: [
      [-105, -85],
      [-194, -161],
      [-244, -274],
    ],
    S: [
      [86, -104],
      [186, -154],
      [293, -222],
    ],
    C: [
      [121, 62],
      [213, 140],
    ],
    T: [
      [-94, 97],
      [-185, 185],
    ],
  },
  heavy: {
    P: [
      [-148, -28],
      [-273, -88],
      [-367, -173],
    ],
    S: [
      [-28, -133],
      [52, -226],
      [172, -278],
    ],
    C: [
      [152, 20],
      [284, 75],
    ],
    T: [
      [-51, 137],
      [-167, 229],
    ],
  },
  sledge: {
    P: [
      [-130, -85],
      [-270, -109],
      [-362, -209],
    ],
    S: [
      [47, -142],
      [154, -225],
    ],
    C: [
      [145, 39],
      [268, 120],
    ],
    T: [
      [-65, 143],
      [-33, 283],
      [103, 344],
    ],
  },
  breaker: {
    P: [
      [-128, -75],
      [-226, -155],
      [-226, -275],
    ],
    S: [
      [28, -139],
      [127, -216],
      [245, -216],
    ],
    C: [
      [137, 63],
      [236, 143],
    ],
    T: [
      [-68, 127],
      [-167, 206],
    ],
  },
  thermal: {
    P: [
      [-115, -95],
      [-168, -216],
      [-107, -327],
    ],
    S: [
      [60, -137],
      [179, -199],
      [302, -176],
    ],
    C: [
      [139, 48],
      [235, 142],
      [237, 271],
    ],
    T: [
      [-85, 131],
      [-210, 171],
      [-319, 102],
    ],
  },
};
// Longer roots grow into branches rather than rows. Extra bends are authored per tool.
const tips: Record<MajorTool, Record<string, [number, number][]>> = {
  hand: {
    P: [
      [-300, -182],
      [-368, -281],
      [-482, -308],
    ],
    S: [
      [264, -222],
      [307, -334],
    ],
    C: [
      [292, 210],
      [410, 240],
    ],
    T: [[-250, 269]],
  },
  pick: {
    P: [
      [-352, -322],
      [-407, -432],
    ],
    S: [
      [322, -344],
      [434, -396],
    ],
    C: [
      [328, 175],
      [407, 273],
    ],
    T: [[-299, 225]],
  },
  heavy: {
    P: [
      [-397, -300],
      [-509, -363],
    ],
    S: [
      [289, -310],
      [347, -429],
    ],
    C: [
      [378, 169],
      [507, 186],
    ],
    T: [[-284, 293]],
  },
  sledge: {
    P: [
      [-476, -256],
      [-509, -383],
    ],
    S: [
      [274, -260],
      [332, -384],
    ],
    C: [
      [382, 176],
      [431, 299],
    ],
    T: [[209, 410]],
  },
  breaker: {
    P: [
      [-343, -326],
      [-372, -446],
    ],
    S: [
      [308, -323],
      [426, -342],
    ],
    C: [
      [324, 233],
      [447, 243],
    ],
    T: [[-283, 245]],
  },
  thermal: {
    P: [
      [-172, -435],
      [-296, -452],
    ],
    S: [
      [384, -269],
      [360, -391],
    ],
    C: [
      [344, 334],
      [468, 302],
    ],
    T: [[-398, 195]],
  },
};
for (const tool of TOOL_ORDER)
  for (const branch of ['P', 'S', 'C', 'T'])
    layouts[tool][branch].push(...tips[tool][branch]);
const branchCodes: Record<string, Branch> = {
  P: 'power',
  S: 'speed',
  C: 'control',
  T: 'technique',
};
export const TOOL_TREES = Object.fromEntries(
  TOOL_ORDER.map((tool) => [
    tool,
    authored[tool].map(
      ([id, name, description, effect, comparison, major, glyph]) => {
        const code = id.split('-')[1],
          rank = Number(code[1]),
          branch = branchCodes[code[0]];
        const [x, y] = layouts[tool][code[0]][rank - 1];
        return {
          id,
          toolId: tool,
          branch,
          rank,
          parentIds: rank === 1 ? [] : [id.slice(0, -1) + (rank - 1)],
          x: MAP.rootX + x,
          y: MAP.rootY + y,
          name,
          description,
          effect,
          comparison,
          glyph: glyph ?? id,
          major: !!major,
          cost: nodePrice(tool, rank, !!major, id),
        };
      },
    ),
  ]),
) as Record<MajorTool, ToolNode[]>;
export const ALL_TOOL_NODES = TOOL_ORDER.flatMap((t) => TOOL_TREES[t]);
export function nodeState(node: ToolNode, owned: string[]) {
  if (owned.includes(node.id)) return 'purchased';
  const frontier = Math.max(
    0,
    ...TOOL_TREES[node.toolId]
      .filter((n) => n.branch === node.branch && owned.includes(n.id))
      .map((n) => n.rank),
  );
  if (node.rank > frontier + 3) return 'hidden';
  if (node.parentIds.every((id) => owned.includes(id))) return 'available';
  const parent = TOOL_TREES[node.toolId].find((n) =>
    node.parentIds.includes(n.id),
  );
  return parent?.parentIds.every((id) => owned.includes(id))
    ? 'locked'
    : 'unknown';
}
export function toolEffects(owned: string[]) {
  const effects = {
    power: 1,
    cycle: 1,
    center: 1,
    depth: 1,
    area: 1,
    weak: 1,
    visible: 1,
    support: 1,
    detach: 1,
    fuel: 1,
    burn: 1,
    afterheat: 0,
    side: 1,
    sideDepth: 1,
    focusPower: 1,
    sustainPower: 1,
    thirdPower: 1,
    steadiness: 1,
    resonance: 1,
    charge: 1,
    wideArea: 1,
    release: 1,
    mechanics: new Set<string>(),
  };
  for (const id of owned) {
    const node = ALL_TOOL_NODES.find((n) => n.id === id);
    if (!node) continue;
    for (const [key, value] of Object.entries(node.effect)) {
      if (key === 'mechanic') effects.mechanics.add(value as string);
      else if (key === 'afterheat')
        effects.afterheat = (effects.afterheat || 1) * (value as number);
      else
        effects[key as keyof Omit<typeof effects, 'mechanics'>] *=
          value as number;
    }
  }
  return effects;
}
export function treeLink(node: ToolNode) {
  const parent = TOOL_TREES[node.toolId].find((n) =>
    node.parentIds.includes(n.id),
  );
  const a = parent ?? { x: MAP.rootX, y: MAP.rootY };
  const dx = node.x - a.x,
    dy = node.y - a.y,
    d = Math.hypot(dx, dy),
    start = parent ? 43 : 53,
    end = 43;
  return `M ${a.x + (dx / d) * start} ${a.y + (dy / d) * start} L ${node.x - (dx / d) * end} ${node.y - (dy / d) * end}`;
}

export function nodeComparison(node: ToolNode, owned: string[]) {
  if (node.major || node.effect.charge) return node.comparison;
  const key = Object.keys(node.effect).find((k) => k !== 'mechanic') as
    | Exclude<keyof NodeEffect, 'mechanic'>
    | undefined;
  if (!key) return node.comparison;
  const prior = new Set(owned.filter((id) => id !== node.id));
  // Locked previews include the prerequisites needed to reach that fitting.
  for (const n of TOOL_TREES[node.toolId])
    if (n.branch === node.branch && n.rank < node.rank) prior.add(n.id);
  const f = toolEffects([...prior]);
  let before = f[key],
    after = (before || 1) * (node.effect[key] as number);
  if (key === 'cycle') {
    before = 1 / before;
    after = 1 / after;
  }
  const label: Record<string, string> = {
    power: 'impact',
    cycle: 'cadence',
    center: 'center impact',
    depth: 'depth',
    area: 'area',
    weak: 'damaged-ice impact',
    support: 'support impact',
    fuel: 'tank capacity',
    burn: 'fuel use',
    afterheat: 'lingering heat',
    side: 'side control',
    sideDepth: 'side depth',
    steadiness: 'bit drift',
    resonance: 'resonance gain',
    wideArea: 'fan area',
    release: 'thin restraint threshold',
  };
  return `${before.toFixed(2)}× → ${after.toFixed(2)}× ${label[key] ?? ''}`;
}
