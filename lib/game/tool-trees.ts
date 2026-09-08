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
    | 'afterheat',
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
// Node budget anchors calibrated against measured claim earnings and eight real
// surface-targeting campaign policies. Mid-game anchors sit below median income
// so small fittings remain reachable while saving for equipment.
export const NODE_BUDGET: Record<MajorTool, number> = {
  hand: 175,
  pick: 550,
  heavy: 1900,
  sledge: 4200,
  breaker: 6500,
  thermal: 13000,
};
export const TOOL_PRICES: Record<MajorTool, number> = {
  hand: 0,
  pick: 650,
  heavy: 2800,
  sledge: 8000,
  breaker: 17500,
  thermal: 20000,
};
type Entry = [string, string, string, NodeEffect, string, boolean?];
const authored: Record<MajorTool, Entry[]> = {
  hand: [
    [
      'HC-P1',
      'Stronger tap',
      'Break 20% more ice with each hit.',
      { power: 1.2 },
      '1.00× → 1.20× impact',
    ],
    [
      'HC-P2',
      'Hard edge',
      'Break another 20% more ice.',
      { power: 1.2 },
      '1.20× → 1.44× impact',
    ],
    [
      'HC-S1',
      'Hold to Chip',
      'Hold the button to keep striking.',
      { mechanic: 'hold' },
      'Click → click or hold',
      true,
    ],
    [
      'HC-S2',
      'Quick hands',
      'Swing again 14% sooner.',
      { cycle: 0.86 },
      '100% → 86% recovery',
    ],
    [
      'HC-C1',
      'Sharp point',
      'Break more ice right where you aim.',
      { center: 1.3 },
      '1.00× → 1.30× center impact',
    ],
    [
      'HC-C2',
      'Surface peel',
      'Break ice around visible valuables 30% faster.',
      { visible: 1.3 },
      '1.00× → 1.30× near visible finds',
    ],
    [
      'HC-T1',
      'Clean release',
      'Chip the last thin ice around small finds.',
      { mechanic: 'cleanRelease' },
      'Thin restraints crumble sooner',
    ],
    [
      'HC-T2',
      'Flick loose',
      'Weak pieces break away sooner.',
      { detach: 1.25 },
      '1.00× → 1.25× weak-ice reach',
    ],
  ],
  pick: [
    [
      'IP-P1',
      'Deeper bite',
      'Break 22% more ice with each hit.',
      { power: 1.22 },
      '1.00× → 1.22× impact',
    ],
    [
      'IP-P2',
      'Hardened point',
      'Break another 22% more ice.',
      { power: 1.22 },
      '1.22× → 1.49× impact',
    ],
    [
      'IP-P3',
      'Split strike',
      'Every fourth hit in one spot chips a second piece.',
      { mechanic: 'split' },
      '4 local hits → a second chip',
      true,
    ],
    [
      'IP-S1',
      'Faster swing',
      'Swing again 12% sooner.',
      { cycle: 0.88 },
      '100% → 88% recovery',
    ],
    [
      'IP-S2',
      'Balanced shaft',
      'Swing again another 12% sooner.',
      { cycle: 0.88 },
      '88% → 77% recovery',
    ],
    [
      'IP-S3',
      'Rhythm',
      'Keep holding the pick on ice to swing faster.',
      { mechanic: 'rhythm' },
      '1.2s contact → 15% faster',
      true,
    ],
    [
      'IP-C1',
      'Sharp point',
      'Hits near the center break 25% more ice.',
      { center: 1.25 },
      '1.00× → 1.25× center impact',
    ],
    [
      'IP-C2',
      'Reward carve',
      'Break ice around visible valuables 30% faster.',
      { visible: 1.3 },
      '1.00× → 1.30× near visible finds',
    ],
    [
      'IP-T1',
      'Crack chaser',
      'Weakened ice breaks 35% faster.',
      { weak: 1.35 },
      '1.00× → 1.35× on damaged ice',
    ],
    [
      'IP-T2',
      'Hook out',
      'Weak chunks break loose sooner.',
      { detach: 1.4 },
      '1.00× → 1.40× weak-ice reach',
      true,
    ],
  ],
  heavy: [
    [
      'HP-P1',
      'Heavier head',
      'Break 25% more ice.',
      { power: 1.25 },
      '1.00× → 1.25× impact',
    ],
    [
      'HP-P2',
      'Deep bite',
      'Your hit reaches deeper into the ice.',
      { depth: 1.2 },
      '1.00× → 1.20× depth',
    ],
    [
      'HP-P3',
      'Breakthrough',
      'Hard hits punch deep into thick ice.',
      { center: 1.4, depth: 1.25 },
      '+40% center power · +25% depth',
      true,
    ],
    [
      'HP-S1',
      'Better balance',
      'Swing again 10% sooner.',
      { cycle: 0.9 },
      '100% → 90% recovery',
    ],
    [
      'HP-S2',
      'Recovery grip',
      'Swing again another 12% sooner.',
      { cycle: 0.88 },
      '90% → 79% recovery',
    ],
    [
      'HP-S3',
      'Momentum',
      'Three hits in one area make the third much stronger.',
      { mechanic: 'momentum' },
      'Every third local hit → +40%',
      true,
    ],
    [
      'HP-C1',
      'Guided strike',
      'Keep full power on the side of a block.',
      { mechanic: 'guided' },
      'Side impact: 80% → 100%',
    ],
    [
      'HP-C2',
      'Reach in',
      'Deep side hits reach 20% farther.',
      { mechanic: 'reach' },
      '1.00× → 1.20× side depth',
    ],
    [
      'HP-T1',
      'Support breaker',
      'Thin supports break 50% faster.',
      { support: 1.5 },
      '1.00× → 1.50× on thin supports',
    ],
    [
      'HP-T2',
      'Spall',
      'Big hits knock loose nearby weak ice.',
      { mechanic: 'spall' },
      'Strong hit → one nearby chip',
      true,
    ],
  ],
  sledge: [
    [
      'SH-P1',
      'Forged head',
      'Break 30% more ice.',
      { power: 1.3 },
      '1.00× → 1.30× impact',
    ],
    [
      'SH-P2',
      'Full swing',
      'Break another 25% more ice.',
      { power: 1.25 },
      '1.30× → 1.63× impact',
    ],
    [
      'SH-P3',
      'Demolition blow',
      'Heavy hits shake loose much bigger chunks.',
      { detach: 1.7 },
      '1.00× → 1.70× fracture reach',
      true,
    ],
    [
      'SH-S1',
      'Lighter handle',
      'Recover from a swing 10% sooner.',
      { cycle: 0.9 },
      '100% → 90% recovery',
    ],
    [
      'SH-S2',
      'Quick recovery',
      'Recover another 12% sooner.',
      { cycle: 0.88 },
      '90% → 79% recovery',
    ],
    [
      'SH-C1',
      'Wide face',
      'Each hit covers 18% more area.',
      { area: 1.18 },
      '1.00× → 1.18× hit area',
    ],
    [
      'SH-C2',
      'Shock ring',
      'Heavy hits spread through nearby ice.',
      { area: 1.2, detach: 1.2 },
      '+20% area · +20% fracture reach',
    ],
    [
      'SH-T1',
      'Wind up',
      'Hold the button to charge a huge hit.',
      { mechanic: 'charge' },
      'Hold up to 0.65s → 2.00× impact',
      true,
    ],
    [
      'SH-T2',
      'Heavy charge',
      'Fully charged hits are even stronger.',
      { mechanic: 'heavyCharge' },
      '2.00× → 2.60× charged impact',
    ],
    [
      'SH-T3',
      'Break loose',
      'Charged hits shake weak chunks loose at once.',
      { mechanic: 'breakLoose' },
      'Charged hit → immediate fracture',
      true,
    ],
  ],
  breaker: [
    [
      'PB-P1',
      'Harder stroke',
      'Each hit breaks 18% more ice.',
      { power: 1.18 },
      '1.00× → 1.18× impact',
    ],
    [
      'PB-P2',
      'Bigger piston',
      'Each hit breaks another 20% more ice.',
      { power: 1.2 },
      '1.18× → 1.42× impact',
    ],
    [
      'PB-P3',
      'Hammer mode',
      'Stay on one spot to hit much harder.',
      { mechanic: 'hammer' },
      '1s local contact → +30% power',
      true,
    ],
    [
      'PB-S1',
      'Faster motor',
      'Strike 15% faster.',
      { cycle: 1 / 1.15 },
      '1.00× → 1.15× strike rate',
    ],
    [
      'PB-S2',
      'High-speed drive',
      'Strike another 15% faster.',
      { cycle: 1 / 1.15 },
      '1.15× → 1.32× strike rate',
    ],
    [
      'PB-S3',
      'Rapid start',
      'Reach full striking speed much faster.',
      { mechanic: 'rapid' },
      '1.0s → 0.6s motor ramp',
      true,
    ],
    [
      'PB-C1',
      'Precision bit',
      'Choose a narrow bit that digs deeper.',
      { mechanic: 'precisionBit' },
      '−25% area · +35% center power',
      true,
    ],
    [
      'PB-C2',
      'Wide bit',
      'Choose a wide bit to clear more surface.',
      { mechanic: 'wideBit' },
      '+35% area · −18% depth',
      true,
    ],
    [
      'PB-T1',
      'Resonance',
      'Holding one area releases a fracture pulse.',
      { mechanic: 'resonance' },
      '12 local impacts → fracture pulse',
    ],
    [
      'PB-T2',
      'Debris kick',
      'Loose ice breaks away sooner while working.',
      { detach: 1.45 },
      '1.00× → 1.45× weak-ice reach',
      true,
    ],
  ],
  thermal: [
    [
      'TH-P1',
      'Hotter flame',
      'Melt ice 20% faster.',
      { power: 1.2 },
      '1.00× → 1.20× heat',
    ],
    [
      'TH-P2',
      'Focused heat',
      'Melt another 25% faster.',
      { power: 1.25 },
      '1.20× → 1.50× heat',
    ],
    [
      'TH-P3',
      'White hot',
      'Focused heat becomes much stronger.',
      { mechanic: 'whiteHot' },
      'Precision heat: +30%',
      true,
    ],
    [
      'TH-S1',
      'Bigger tank',
      'Use the heat tool 25% longer.',
      { fuel: 1.25 },
      '75s → 94s fuel',
    ],
    [
      'TH-S2',
      'Efficient burn',
      'Use 15% less fuel.',
      { burn: 0.85 },
      '100% → 85% fuel use',
    ],
    [
      'TH-S3',
      'Rest refill',
      'Your tank slowly refills while the tool is off.',
      { mechanic: 'refill' },
      '+2 seconds of fuel each second',
      true,
    ],
    [
      'TH-C1',
      'Fan nozzle',
      'Unlock a wide heat mode.',
      { mechanic: 'fan' },
      'Precision / wide',
      true,
    ],
    [
      'TH-C2',
      'Wider fan',
      'Wide heat covers 20% more area.',
      { area: 1.2 },
      '1.00× → 1.20× wide area',
    ],
    [
      'TH-C3',
      'Stronger wide heat',
      'Wide heat melts much deeper.',
      { mechanic: 'wideHeat' },
      '52% → 80% useful power',
      true,
    ],
    [
      'TH-T1',
      'Heat stays longer',
      'Ice keeps melting after you move.',
      { afterheat: 1, mechanic: 'afterheat' },
      'Moving away leaves stored heat',
      true,
    ],
    [
      'TH-T2',
      'Stored heat',
      'Lingering heat becomes 60% stronger.',
      { afterheat: 1.6 },
      '1.00× → 1.60× stored heat',
    ],
    [
      'TH-T3',
      'Heat echo',
      'Hot ice releases one final wave of heat.',
      { mechanic: 'echo' },
      'One extra melt wave after 0.4s',
      true,
    ],
  ],
};
// Authored directions and bends give each tool its own silhouette. Each branch
// owns a sector; links end outside hit targets and never cross another node.
const angles: Record<MajorTool, number[]> = {
  hand: [-148, -54, 28, 116],
  pick: [-127, -29, 61, 164],
  heavy: [-165, -72, 37, 128],
  sledge: [-137, -44, 53, 154],
  breaker: [-160, -63, 21, 112],
  thermal: [-126, -22, 70, 161],
};
const branchCodes: Record<string, Branch> = {
  P: 'power',
  S: 'speed',
  C: 'control',
  T: 'technique',
};
export const TOOL_TREES = Object.fromEntries(
  TOOL_ORDER.map((tool, ti) => [
    tool,
    authored[tool].map(([id, name, description, effect, comparison, major]) => {
      const code = id.split('-')[1],
        rank = Number(code[1]),
        branch = branchCodes[code[0]],
        bi = ['power', 'speed', 'control', 'technique'].indexOf(branch);
      const angle =
        ((angles[tool][bi] +
          (rank === 2
            ? ti % 2
              ? 12
              : -12
            : rank === 3
              ? bi % 2
                ? -8
                : 8
              : 0)) *
          Math.PI) /
        180;
      const radius = [0, 120, 225, 335][rank];
      const ratio =
        rank === 1
          ? major
            ? 0.35
            : 0.25
          : rank === 2
            ? major
              ? 1.1
              : 0.6
            : major
              ? 1.9
              : 0.85;
      return {
        id,
        toolId: tool,
        branch,
        rank,
        parentIds: rank === 1 ? [] : [id.slice(0, -1) + (rank - 1)],
        x: 800 + Math.cos(angle) * radius,
        y: 800 + Math.sin(angle) * radius,
        name,
        description,
        effect,
        comparison,
        major: !!major,
        cost:
          id === 'HC-S1'
            ? 25
            : Math.max(25, Math.round((NODE_BUDGET[tool] * ratio) / 25) * 25),
      };
    }),
  ]),
) as Record<MajorTool, ToolNode[]>;
export const ALL_TOOL_NODES = TOOL_ORDER.flatMap((t) => TOOL_TREES[t]);
export function nodeState(node: ToolNode, owned: string[]) {
  if (owned.includes(node.id)) return 'purchased';
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
