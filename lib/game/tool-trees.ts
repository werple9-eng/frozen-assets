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
  pick: 2250,
  heavy: 6000,
  sledge: 20000,
  breaker: 33000,
  thermal: 42500,
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
// Every fitting is priced explicitly. The first fitting of a branch is the
// cheap choice that stays reachable while saving for equipment; a second
// fitting costs what the previous map charged for its third rank; mechanical
// milestones keep their previous prices exactly.
export const FITTING_PRICES: Record<MajorTool, [number, number]> = {
  hand: [60, 170],
  pick: [280, 430],
  heavy: [550, 800],
  sledge: [1100, 1550],
  breaker: [1800, 2450],
  thermal: [2350, 3200],
};
type Entry = [
  id: string,
  name: string,
  description: string,
  effect: NodeEffect,
  comparison: string,
  cost: number,
  glyph: string,
  major?: boolean,
];
const fitting = (
  id: string,
  name: string,
  description: string,
  effect: NodeEffect,
  comparison: string,
  cost: number,
  glyph: string,
): Entry => [id, name, description, effect, comparison, cost, glyph];
const major = (
  id: string,
  name: string,
  description: string,
  effect: NodeEffect,
  comparison: string,
  cost: number,
  glyph: string,
): Entry => [id, name, description, effect, comparison, cost, glyph, true];
// A branch holds at most two tiers of one subject. A second tier never repeats
// its predecessor's sentence: it adds a second real effect or names a different
// feel, so every purchase reads as its own decision.
const authored: Record<MajorTool, Entry[]> = {
  hand: [
    fitting(
      'HC-P1',
      'Stronger Tap',
      'Break 10% more ice with every tap.',
      { power: 1.1 },
      '+10% impact',
      60,
      'HC-P1',
    ),
    fitting(
      'HC-P2',
      'Hard Tap',
      'Another 10% per tap, and cracked ice gives way a little easier.',
      { power: 1.1, weak: 1.06 },
      '+10% impact · +6% on damaged ice',
      170,
      'HC-P1',
    ),
    major(
      'HC-P3',
      'Hard Edge',
      'A hardened edge drives 20% more force into the center of each tap.',
      { center: 1.2 },
      '+20% center impact',
      650,
      'HC-P2',
    ),
    major(
      'HC-S1',
      'Hold to Chip',
      'Hold the button to keep striking.',
      { mechanic: 'hold' },
      'Click → click or hold',
      25,
      'HC-S1',
    ),
    fitting(
      'HC-S2',
      'Quick Hands',
      'Work 10% faster, with the same instant first tap.',
      { cycle: 1 / 1.1 },
      '+10% cadence',
      60,
      'HC-S2',
    ),
    fitting(
      'HC-S3',
      'Steady Hands',
      'Keep the pace: another 10% faster between taps.',
      { cycle: 1 / 1.1 },
      '+10% cadence',
      170,
      'HC-S2',
    ),
    fitting(
      'HC-C1',
      'Sharp Point',
      'Concentrate 10% more impact at the point.',
      { center: 1.1 },
      '+10% center impact',
      60,
      'HC-C1',
    ),
    fitting(
      'HC-C2',
      'Fine Point',
      'Sharper still, and small finds shake free a little sooner.',
      { center: 1.1, release: 0.96 },
      '+10% center impact · finds release 4% sooner',
      170,
      'HC-C1',
    ),
    major(
      'HC-C3',
      'Surface Peel',
      'Peel ice around visible finds 25% faster.',
      { visible: 1.25 },
      '+25% near visible finds',
      550,
      'HC-C2',
    ),
    fitting(
      'HC-T1',
      'Clean Release',
      'Clear the last thin restraints around small finds 10% sooner. Solid ice still holds them.',
      { release: 0.9 },
      'Finds release 10% sooner',
      60,
      'HC-T1',
    ),
    major(
      'HC-T2',
      'Flick Loose',
      'Dislodge weak pieces close to the tip.',
      { detach: 1.25 },
      '+25% local weak-ice reach',
      500,
      'HC-T2',
    ),
  ],
  pick: [
    fitting(
      'IP-P1',
      'Deeper Bite',
      'Drive the point through 10% more ice.',
      { power: 1.1 },
      '+10% impact',
      280,
      'IP-P1',
    ),
    fitting(
      'IP-P2',
      'Hardened Point',
      'A hardened point drives another 10% and splits cracked ice more easily.',
      { power: 1.1, weak: 1.06 },
      '+10% impact · +6% on damaged ice',
      430,
      'IP-P2',
    ),
    major(
      'IP-P3',
      'Split Strike',
      'Every fourth hit in one spot chips a second piece. Moving resets the count.',
      { mechanic: 'split' },
      '4 local hits → a second chip',
      1400,
      'IP-P3',
    ),
    fitting(
      'IP-S1',
      'Faster Swing',
      'Swing 10% faster without losing the readable impact.',
      { cycle: 1 / 1.1 },
      '+10% cadence',
      280,
      'IP-S1',
    ),
    fitting(
      'IP-S2',
      'Balanced Shaft',
      'A balanced shaft brings the pick back another 10% sooner.',
      { cycle: 1 / 1.1 },
      '+10% cadence',
      430,
      'IP-S2',
    ),
    major(
      'IP-S3',
      'Rhythm',
      'Hold on one spot for 1.2 seconds to find a faster rhythm.',
      { mechanic: 'rhythm' },
      '+15% sustained cadence',
      1400,
      'IP-S3',
    ),
    fitting(
      'IP-C1',
      'Sharp Point',
      'Put 10% more force into the center of the strike.',
      { center: 1.1 },
      '+10% center impact',
      280,
      'IP-C1',
    ),
    fitting(
      'IP-C2',
      'Keen Edge',
      'Keener still, and small finds come loose a touch sooner.',
      { center: 1.1, release: 0.96 },
      '+10% center impact · finds release 4% sooner',
      430,
      'IP-C1',
    ),
    major(
      'IP-C3',
      'Reward Carve',
      'Carve around visible valuables 25% faster.',
      { visible: 1.25 },
      '+25% near visible finds',
      1300,
      'IP-C2',
    ),
    fitting(
      'IP-T1',
      'Crack Chaser',
      'Strike already damaged ice 14% harder.',
      { weak: 1.14 },
      '+14% on damaged ice',
      280,
      'IP-T1',
    ),
    major(
      'IP-T2',
      'Hook Out',
      'Pull loose weak fragments around your strike.',
      { detach: 1.4 },
      '+40% local weak-ice reach',
      1150,
      'IP-T2',
    ),
  ],
  heavy: [
    fitting(
      'HP-P1',
      'Heavier Head',
      'A heavier forged head breaks 10% more ice.',
      { power: 1.1 },
      '+10% impact',
      550,
      'HP-P1',
    ),
    fitting(
      'HP-P2',
      'Forged Mass',
      'More mass behind every blow, and thin supports give a little sooner.',
      { power: 1.1, support: 1.05 },
      '+10% impact · +5% on supports',
      800,
      'HP-P1',
    ),
    fitting(
      'HP-P3',
      'Deep Bite',
      'Reach 8% deeper along the contact normal.',
      { depth: 1.08 },
      '+8% depth',
      900,
      'HP-P2',
    ),
    major(
      'HP-P4',
      'Breakthrough',
      'Punch a deeper channel with the forged point.',
      { center: 1.2, depth: 1.15 },
      '+20% center · +15% depth',
      2800,
      'HP-P3',
    ),
    fitting(
      'HP-S1',
      'Better Balance',
      'Recover 8% faster while keeping the heavy swing.',
      { cycle: 1 / 1.08 },
      '+8% cadence',
      550,
      'HP-S1',
    ),
    fitting(
      'HP-S2',
      'Recovery Grip',
      'A reinforced grip brings the head back another 8% sooner.',
      { cycle: 1 / 1.08 },
      '+8% cadence',
      800,
      'HP-S2',
    ),
    major(
      'HP-S3',
      'Momentum',
      'Every third hit in one area carries extra force.',
      { mechanic: 'momentum', thirdPower: 1.3 },
      'Third local hit: +30% force',
      2800,
      'HP-S3',
    ),
    fitting(
      'HP-C1',
      'Guided Strike',
      'Side-face strikes keep 21% more of their force.',
      { side: 1.21 },
      '+21% side control',
      550,
      'HP-C1',
    ),
    fitting(
      'HP-C2',
      'Reach In',
      'Reach 8% deeper into side faces.',
      { sideDepth: 1.08 },
      '+8% side depth',
      800,
      'HP-C2',
    ),
    major(
      'HP-C3',
      'Deep Reach',
      'Reach another 12% deeper into side channels.',
      { sideDepth: 1.12 },
      '+12% side depth',
      2600,
      'HP-C2',
    ),
    fitting(
      'HP-T1',
      'Support Breaker',
      'Break thin local supports 32% faster.',
      { support: 1.32 },
      '+32% on supports',
      550,
      'HP-T1',
    ),
    major(
      'HP-T2',
      'Spall',
      'A hit can fracture one nearby weakened piece.',
      { mechanic: 'spall' },
      'One bounded secondary fracture',
      2400,
      'HP-T2',
    ),
  ],
  sledge: [
    fitting(
      'SH-P1',
      'Forged Head',
      'Drive 10% more force through the broad head.',
      { power: 1.1 },
      '+10% impact',
      1100,
      'SH-P1',
    ),
    fitting(
      'SH-P2',
      'Full Swing',
      'A fuller swing lands harder and a touch wider.',
      { power: 1.1, area: 1.04 },
      '+10% impact · +4% area',
      1550,
      'SH-P2',
    ),
    major(
      'SH-P3',
      'Demolition Blow',
      'A heavy blow shakes apart nearby weak fractures.',
      { detach: 1.7 },
      '+70% local fracture reach',
      6000,
      'SH-P3',
    ),
    fitting(
      'SH-S1',
      'Lighter Handle',
      'Recover 10% faster between heavy swings.',
      { cycle: 1 / 1.1 },
      '+10% cadence',
      1100,
      'SH-S1',
    ),
    fitting(
      'SH-S2',
      'Quick Recovery',
      'Reset your stance 8% sooner after impact.',
      { cycle: 1 / 1.08 },
      '+8% cadence',
      1550,
      'SH-S2',
    ),
    major(
      'SH-S3',
      'Balanced Swing',
      'Recover 7% faster while retaining a heavy, readable arc.',
      { cycle: 1 / 1.07 },
      '+7% cadence · heavy cycle floor',
      5500,
      'SH-S2',
    ),
    fitting(
      'SH-C1',
      'Wide Face',
      'A broader face chips 10% more area.',
      { area: 1.1 },
      '+10% area',
      1100,
      'SH-C1',
    ),
    fitting(
      'SH-C2',
      'Flat Face',
      'A flatter face: 8% more area, and loose ice shakes off easier.',
      { area: 1.08, detach: 1.05 },
      '+8% area · +5% weak-ice reach',
      1550,
      'SH-C1',
    ),
    major(
      'SH-C3',
      'Shock Ring',
      'Spread the blow through nearby weak fractures.',
      { detach: 1.25 },
      '+25% weak-fracture influence',
      5500,
      'SH-C2',
    ),
    major(
      'SH-T1',
      'Wind Up',
      'Hold up to 650ms, then release a charged blow.',
      { mechanic: 'charge', charge: 1.75 },
      'Charge up to 1.75× force',
      4000,
      'SH-T1',
    ),
    fitting(
      'SH-T2',
      'Heavier Charge',
      'A full wind-up now delivers 2.05× force.',
      { charge: 2.05 / 1.75 },
      '1.75× → 2.05× maximum',
      1550,
      'SH-T2',
    ),
    major(
      'SH-T3',
      'Break Loose',
      'Charged blows detach weak fragments close to the impact.',
      { mechanic: 'breakLoose' },
      'Charged local breakaway',
      5500,
      'SH-T3',
    ),
  ],
  breaker: [
    fitting(
      'PB-P1',
      'Harder Stroke',
      'The piston delivers 10% more impact.',
      { power: 1.1 },
      '+10% impact',
      1800,
      'PB-P1',
    ),
    fitting(
      'PB-P2',
      'Bigger Piston',
      'A bigger piston hits harder and drives a little deeper.',
      { power: 1.1, depth: 1.04 },
      '+10% impact · +4% depth',
      2450,
      'PB-P2',
    ),
    major(
      'PB-P3',
      'Hammer Mode',
      'Maintain contact for one second to engage full hammer force.',
      { mechanic: 'hammer', sustainPower: 1.2 },
      '+20% sustained force',
      9000,
      'PB-P3',
    ),
    fitting(
      'PB-S1',
      'Faster Motor',
      'Deliver 10% more strokes per second.',
      { cycle: 1 / 1.1 },
      '+10% stroke rate',
      1800,
      'PB-S1',
    ),
    fitting(
      'PB-S2',
      'High-Speed Drive',
      'A high-speed drive adds another 10% to the stroke rate.',
      { cycle: 1 / 1.1 },
      '+10% stroke rate',
      2450,
      'PB-S2',
    ),
    major(
      'PB-S3',
      'Rapid Start',
      'Reach full motor speed 40% sooner.',
      { mechanic: 'rapid' },
      '1.0s → 0.6s motor ramp',
      9000,
      'PB-S3',
    ),
    fitting(
      'PB-C1',
      'Steadier Bit',
      'Cut physical bit drift and recoil in half.',
      { steadiness: 0.5 },
      '−50% bit drift',
      1800,
      'PB-C1',
    ),
    major(
      'PB-C2',
      'Precision Bit',
      'Choose a narrower bit for a deeper channel. Switch freely.',
      { mechanic: 'precisionBit' },
      'Narrower area · deeper channel',
      7500,
      'PB-C1',
    ),
    major(
      'PB-C3',
      'Wide Bit',
      'Choose a wider bit for shallow clearing. Both bits stay available.',
      { mechanic: 'wideBit' },
      'Wide or precision · freely selectable',
      8250,
      'PB-C2',
    ),
    fitting(
      'PB-T1',
      'Resonance',
      'Build local fracture resonance 32% faster while working.',
      { resonance: 1.32 },
      '+32% resonance gain',
      1800,
      'PB-T1',
    ),
    major(
      'PB-T2',
      'Debris Kick',
      'Sustained strokes kick loose nearby weak fragments.',
      { mechanic: 'debrisKick' },
      'Sustained local breakaway',
      7500,
      'PB-T2',
    ),
  ],
  thermal: [
    fitting(
      'TH-P1',
      'Hotter Heat',
      'Melt 10% faster with either nozzle.',
      { power: 1.1 },
      '+10% heat',
      2350,
      'TH-P1',
    ),
    fitting(
      'TH-P2',
      'Focused Heat',
      'Hotter again, with extra bite in the precision nozzle.',
      { power: 1.1, focusPower: 1.04 },
      '+10% heat · +4% precision heat',
      3200,
      'TH-P2',
    ),
    major(
      'TH-P3',
      'White Hot',
      'The precision nozzle concentrates a white-hot core.',
      { mechanic: 'whiteHot', focusPower: 1.2 },
      '+20% precision heat',
      11000,
      'TH-P3',
    ),
    fitting(
      'TH-S1',
      'Bigger Tank',
      'Carry 10% more fuel.',
      { fuel: 1.1 },
      '+10% tank capacity',
      2350,
      'TH-S1',
    ),
    fitting(
      'TH-S2',
      'Efficient Burn',
      'Use 10% less fuel per second.',
      { burn: 0.9 },
      '−10% fuel use',
      3200,
      'TH-S2',
    ),
    major(
      'TH-S3',
      'Rest Refill',
      'The tank slowly refills while you stop working.',
      { mechanic: 'refill' },
      '+2 fuel per second at rest',
      11000,
      'TH-S3',
    ),
    fitting(
      'TH-C1',
      'Wider Heat',
      'Heat 10% more area with either nozzle.',
      { area: 1.1 },
      '+10% area',
      2350,
      'TH-C2',
    ),
    major(
      'TH-C2',
      'Fan Nozzle',
      'Unlock a broad fan for shallow surface clearing.',
      { mechanic: 'fan' },
      'Precision or wide heat',
      9500,
      'TH-C1',
    ),
    fitting(
      'TH-C3',
      'Wider Fan',
      'Spread the wide nozzle over 8% more area.',
      { wideArea: 1.08 },
      '+8% wide area',
      3600,
      'TH-C2',
    ),
    major(
      'TH-C4',
      'Stronger Wide Heat',
      'A reinforced nozzle keeps more heat in the fan.',
      { mechanic: 'widePower' },
      'Wide heat: 80% precision power',
      11000,
      'TH-C3',
    ),
    fitting(
      'TH-T1',
      'Heat Stays',
      'Warm ice keeps melting briefly after you move away.',
      { afterheat: 0.65 },
      'Lingering local heat',
      2350,
      'TH-T1',
    ),
    fitting(
      'TH-T2',
      'Stored Heat',
      'Retain 27% more lingering heat.',
      { afterheat: 1.265 },
      '+27% lingering heat',
      3200,
      'TH-T2',
    ),
    major(
      'TH-T3',
      'Heat Echo',
      'Leaving a hot spot releases one delayed pulse. It cannot chain.',
      { mechanic: 'echo' },
      'One extra melt pulse after 0.4s',
      10250,
      'TH-T3',
    ),
  ],
};
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
      ([id, name, description, effect, comparison, cost, glyph, major]) => {
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
          glyph,
          major: !!major,
          cost,
        };
      },
    ),
  ]),
) as Record<MajorTool, ToolNode[]>;
export const ALL_TOOL_NODES = TOOL_ORDER.flatMap((t) => TOOL_TREES[t]);
// Mechanics are addressed by name, so re-ranking a map never breaks a lookup.
export const MECHANIC_NODE: Record<string, string> = Object.fromEntries(
  ALL_TOOL_NODES.filter((n) => n.effect.mechanic).map((n) => [
    n.effect.mechanic!,
    n.id,
  ]),
);
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
