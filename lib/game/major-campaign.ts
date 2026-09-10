import type {
  BlockSpec,
  Profile,
  StoryObjectId,
  ToolId,
} from './campaign-content';
import type { FieldSpec, IceMaterialRegion } from './ice-grid';

export type IcePhaseSpec = FieldSpec & {
  id: string;
  name: string;
  targetSolidSamples: { min: number; max: number };
  targetActiveSeconds: { min: number; max: number };
  idealTools: ToolId[];
  lots: number;
  payoutWeight: number;
};
export type DeliveryIceSpec = { phases: IcePhaseSpec[] };
export type RecoveryContract = {
  archetype:
    | 'clean-recovery'
    | 'bulk-clearance'
    | 'service-call'
    | 'deep-retrieval'
    | 'mixed-custody';
  objective: {
    kind: 'pristine' | 'bulk' | 'rush' | 'precision' | 'noThermal';
    bonus: number;
    count?: number;
    seconds?: number;
  };
};
type AuthoredDelivery = [
  string,
  Profile,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  StoryObjectId?,
];
// Dimensions and first-phase solid budgets are independent authored facts. Inner
// compartments add real work and report their own budgets; the first-phase target
// is never copied into every phase or converted into a hit-point requirement.
const AUTHORED: AuthoredDelivery[] = [
  ['First claim', 'parcel', 4.4, 2.6, 2.4, 900, 1100, 1, 30, 40, 250],
  ['Petty cash', 'parcel', 4.8, 2.8, 2.5, 1100, 1300, 1, 45, 55, 350],
  ['Personal effects', 'slab', 5.2, 3, 2.8, 1350, 1600, 1, 55, 65, 500],
  ['Counter deposit', 'tower', 5.4, 3.6, 3, 1650, 1950, 1, 65, 75, 700],
  [
    'Wrong account',
    'archive',
    5.8,
    3.8,
    3.2,
    2000,
    2350,
    2,
    80,
    90,
    950,
    'tag',
  ],
  ['Pooled custody', 'slab', 5.9, 3.7, 3.3, 1900, 2200, 1, 55, 65, 1200],
  ['Maintenance lot', 'seam', 6.2, 4, 3.5, 2300, 2600, 2, 65, 75, 1400],
  ['Estate effects', 'wings', 6.4, 4, 3.6, 2600, 3000, 2, 75, 85, 1600, 'ring'],
  ['Mixed identifiers', 'tower', 6.6, 4.3, 3.8, 2900, 3300, 2, 80, 90, 1800],
  ['Sealed cash', 'archive', 6.8, 4.5, 4, 3300, 3800, 2, 90, 100, 2100],
  [
    'Internal review',
    'seam',
    7,
    4.6,
    4.1,
    3900,
    4400,
    3,
    105,
    115,
    2400,
    'hold',
  ],
  ['Inventory variance', 'slab', 6.9, 4.5, 4, 3500, 3900, 1, 75, 85, 2600],
  ['Emergency access', 'wings', 7.3, 4.8, 4.2, 4100, 4500, 2, 85, 95, 2900],
  ['Bearer instruments', 'tower', 7.6, 5, 4.4, 4500, 5000, 2, 90, 100, 3200],
  ['Exception inventory', 'archive', 7.9, 5, 4.6, 5000, 5500, 3, 95, 105, 3500],
  ['Brittle annex', 'wings', 8.1, 5.2, 4.8, 5400, 5900, 2, 100, 110, 3900],
  ['Withheld release', 'seam', 8.3, 5.2, 4.9, 5900, 6500, 3, 105, 115, 4300],
  [
    'Exception 7C',
    'archive',
    8.5,
    5.4,
    5,
    6500,
    7300,
    3,
    120,
    135,
    4800,
    'log',
  ],
  [
    'Downstairs equipment',
    'tower',
    8.2,
    5.1,
    4.8,
    5800,
    6400,
    1,
    90,
    100,
    5000,
  ],
  ['Service channel', 'seam', 8.6, 5.4, 5, 6500, 7100, 2, 100, 110, 5400],
  [
    'Preservation machinery',
    'wings',
    8.9,
    5.6,
    5.1,
    7100,
    7800,
    2,
    110,
    120,
    5800,
  ],
  ['Thermal service', 'archive', 9.1, 5.7, 5.2, 7600, 8300, 3, 120, 130, 6300],
  ['Unreleased holdings', 'slab', 9.3, 5.9, 5.4, 8100, 8800, 2, 125, 135, 6800],
  ['Liability archive', 'archive', 9.6, 6, 5.5, 8800, 9600, 3, 140, 150, 7400],
  [
    'The remaining route',
    'seam',
    9.8,
    6.2,
    5.6,
    9600,
    10600,
    3,
    155,
    170,
    8200,
    'access',
  ],
  ['Sublevel B intake', 'tower', 9.2, 5.7, 5.2, 8000, 8800, 1, 105, 115, 8500],
  ['Prestige custody', 'wings', 9.7, 6, 5.5, 9000, 9900, 2, 115, 125, 9300],
  ['Manual clearance', 'seam', 10, 6.2, 5.6, 9900, 10800, 2, 125, 135, 10200],
  [
    'Master records',
    'archive',
    10.3,
    6.4,
    5.8,
    10800,
    11800,
    3,
    135,
    145,
    11200,
  ],
  ['Last holdings', 'slab', 10.6, 6.6, 6, 11800, 12800, 3, 150, 160, 12300],
  [
    'Archive antechamber',
    'wings',
    11,
    7,
    6.4,
    13200,
    14500,
    3,
    165,
    175,
    13600,
  ],
];
const all = (material: IceMaterialRegion['material']): IceMaterialRegion => ({
  material,
  region: { kind: 'all' },
});
const band = (
  material: IceMaterialRegion['material'],
  axis: 'x' | 'y' | 'z',
  min: number,
  max: number,
): IceMaterialRegion => ({
  material,
  region: { kind: 'band', axis, min, max },
});
export function authoredMaterials(
  profile: Profile,
  delivery: number,
  phase = 0,
): IceMaterialRegion[] {
  const out: IceMaterialRegion[] = [all('clear')];
  // The first archive teaches a single divider, not the later full lattice.
  if (delivery === 4 && profile === 'archive')
    return [...out, band('reinforced', 'x', -0.08, 0.08)];
  if (delivery === 1)
    out.push({
      material: 'brittle',
      region: { kind: 'outer', axis: 'x', threshold: 0.8 },
    });
  if (profile === 'wings') {
    out.push({
      material: 'brittle',
      region: { kind: 'outer', axis: 'x', threshold: 0.36 },
    });
    if (delivery === 7) {
      // Estate effects has small physical wing anchors and a clear inner body.
      for (const side of [-1, 1])
        out.push({
          material: 'reinforced',
          region: {
            kind: 'box',
            min: [side < 0 ? -0.54 : 0.32, 0.19, -0.75],
            max: [side < 0 ? -0.32 : 0.54, 0.62, 0.75],
          },
        });
    } else out.push(band('reinforced', 'x', -0.22, 0.22));
  }
  if (profile === 'seam') out.push(band('dense', 'x', -0.2, 0.2));
  if (profile === 'archive' || profile === 'vault') {
    out.push({
      material: 'reinforced',
      region: { kind: 'ribs', axis: 'x', spacing: 2 / 3, width: 0.15 },
    });
    out.push({
      material: 'reinforced',
      region: { kind: 'ribs', axis: 'y', spacing: 1 / 3, width: 0.08 },
    });
  }
  if (delivery === 8 || delivery === 13)
    out.push(band('dense', 'y', 0.1, 0.31));
  if (delivery === 17) out.push(band('dense', 'z', -0.6, -0.18));
  if (delivery === 18 || delivery === 25)
    out.push(band('brittle', 'y', 0.48, 1));
  if (delivery === 22 || delivery === 29)
    out.push(band('dense', 'x', -0.3, 0.05));
  if (
    delivery === 21 ||
    delivery === 27 ||
    delivery === 28 ||
    (delivery >= 24 && phase === 2)
  ) {
    // A continuous maintenance lane exposes the service material physically;
    // it is not an invisible thermal-only gate or an all-dense late block.
    out.push(band('service', 'z', -0.3, delivery === 28 ? 0.9 : 0.55));
  }
  return out;
}
export const STRUCTURE_TOOLS: Record<Profile, ToolId[]> = {
  parcel: ['hand', 'pick'],
  slab: ['pick'],
  tower: ['pick', 'heavy'],
  wings: ['sledge', 'heavy'],
  seam: ['heavy', 'breaker'],
  archive: ['breaker', 'thermal'],
  vault: ['pick', 'hand', 'thermal'],
};
const hints: Record<Profile, string> = {
  parcel: 'Compact custody parcel. Open the ice around each find.',
  slab: 'A broad exposed face. Move between the holdings.',
  tower: 'High holdings share lower structural connections.',
  wings: 'Brittle wings hang from narrow reinforced anchors.',
  seam: 'A dense channel joins the two outer masses.',
  archive: 'Reinforced ribs separate the custody compartments.',
  vault:
    'Outer braces, compression seam, archive lattice, service seal, ledger cradle.',
};
const chapterAt = (i: number) =>
  i < 5 ? 1 : i < 11 ? 2 : i < 18 ? 3 : i < 25 ? 4 : 5;
// Separate authored budgets for physically smaller interior structures. Profile
// changes (for example Wings -> Tower) do not preserve a fixed fill percentage.
const INNER_SOLID_BUDGETS: Record<number, [number, number][]> = {
  4: [[740, 900]],
  6: [[900, 1100]],
  7: [[1050, 1250]],
  8: [[1200, 1450]],
  9: [[1500, 1750]],
  10: [
    [1450, 1750],
    [530, 650],
  ],
  12: [[1800, 2100]],
  13: [[1800, 2100]],
  14: [
    [2250, 2600],
    [850, 1020],
  ],
  15: [[2450, 2850]],
  16: [
    [2600, 3000],
    [850, 1020],
  ],
  17: [
    [2850, 3300],
    [1020, 1230],
  ],
  19: [[2450, 2850]],
  20: [[3100, 3600]],
  21: [
    [3400, 3850],
    [1080, 1290],
  ],
  22: [[3200, 3650]],
  23: [
    [3800, 4300],
    [1150, 1380],
  ],
  24: [
    [3650, 4150],
    [1400, 1680],
  ],
  26: [[3750, 4250]],
  27: [[3900, 4400]],
  28: [
    [4850, 5400],
    [1540, 1800],
  ],
  29: [
    [5200, 5750],
    [1650, 1940],
  ],
  30: [
    [5450, 6050],
    [1890, 2190],
  ],
};
const layerProfiles = (
  i: number,
  profile: Profile,
  phases: number,
): Profile[] => {
  if (i === 10) return ['seam', 'archive', 'parcel'];
  if (i === 24) return ['seam', 'archive', 'archive'];
  if (i === 30) return ['wings', 'archive', 'archive'];
  if (phases === 1) return [profile];
  if (phases === 2)
    return [
      profile,
      profile === 'archive'
        ? 'parcel'
        : profile === 'wings'
          ? 'tower'
          : 'archive',
    ];
  return [
    profile,
    profile === 'seam' ? 'archive' : 'seam',
    i >= 21 ? 'archive' : 'parcel',
  ];
};
export const MAJOR_BLOCKS: BlockSpec[] = AUTHORED.map(
  (
    [
      name,
      profile,
      width,
      height,
      depth,
      min,
      max,
      count,
      timeMin,
      timeMax,
      baseNet,
      object,
    ],
    i,
  ) => {
    const id = `claim-${String(i + 1).padStart(2, '0')}`,
      chapter = chapterAt(i),
      layers = layerProfiles(i, profile, count);
    const phaseWeights =
      count === 1 ? [1] : count === 2 ? [0.68, 0.32] : [0.57, 0.28, 0.15];
    const phases = layers.map((shape, phase): IcePhaseSpec => {
      const scale =
        phase === 0
          ? [1, 1, 1]
          : phase === 1
            ? [0.76, 0.7, 0.74]
            : [0.54, 0.5, 0.54];
      const budget = phase ? INNER_SOLID_BUDGETS[i][phase - 1] : [min, max];
      return {
        id: `${id}-phase-${phase + 1}`,
        name:
          phase === 0
            ? 'Outer holdings'
            : phase === count - 1 && object
              ? 'Evidence compartment'
              : `Inner compartment ${phase}`,
        deliveryId: id,
        phaseId: `phase-${phase + 1}`,
        profile: shape,
        layoutVersion: 3,
        seed: i * 7 + phase,
        dimensions: {
          width: width * scale[0],
          height: height * scale[1],
          depth: depth * scale[2],
        },
        materials: authoredMaterials(shape, i, phase),
        targetSolidSamples: { min: budget[0], max: budget[1] },
        targetActiveSeconds: {
          min: timeMin * phaseWeights[phase],
          max: timeMax * phaseWeights[phase],
        },
        idealTools:
          i >= 21 && (i === 28 || phase === 2)
            ? ['thermal', 'breaker']
            : STRUCTURE_TOOLS[shape],
        lots:
          phase === 0
            ? Math.min(7, 2 + Math.floor((i + 1) / 3))
            : phase === 1
              ? 2 + Math.floor(chapter / 2)
              : 2,
        payoutWeight: phaseWeights[phase],
      };
    });
    return {
      id,
      name,
      chapter,
      profile,
      scale: 0.34 + i * 0.055,
      lots: phases.reduce((s, p) => s + p.lots, 0),
      value: 1,
      object,
      phases: count,
      layers,
      hint: hints[profile],
      ice: { phases },
      baseNet,
      // Commission is floored on cumulative gross, so floor here is the exact
      // inverse for integer net targets. Rounding overpays some claims by $1.
      baseGross: Math.floor((baseNet * 100) / (i >= 17 ? 92 : 88)),
      targetActiveSeconds: { min: timeMin, max: timeMax },
      structure: {
        parcel: 'COMPACT PARCEL',
        slab: 'BROAD SLAB',
        tower: 'VERTICAL HOLDINGS',
        wings: 'BRITTLE WINGS',
        seam: 'DENSE SEAM',
        archive: 'REINFORCED ARCHIVE',
        vault: 'PRESERVATION VAULT',
      }[profile],
      cargoLabel:
        i < 2
          ? 'DURABLE COIN'
          : i === 13
            ? 'HEAT-SENSITIVE PAPER'
            : i % 3 === 1
              ? 'MIXED / IMPACT-SENSITIVE'
              : 'MIXED CUSTODY',
    };
  },
);
const vaultPhases: IcePhaseSpec[] = (
  [
    {
      id: 'outer-braces',
      name: 'Outer braces',
      profile: 'wings',
      dimensions: { width: 11.5, height: 7.2, depth: 6.6 },
      targetSolidSamples: { min: 14800, max: 16300 },
      targetActiveSeconds: { min: 60, max: 75 },
      idealTools: ['sledge', 'heavy'],
      lots: 6,
      payoutWeight: 0.25,
      materials: authoredMaterials('wings', 31),
    },
    {
      id: 'compression-seam',
      name: 'Compression seam',
      profile: 'seam',
      dimensions: { width: 10.5, height: 6.4, depth: 6 },
      targetSolidSamples: { min: 12800, max: 14300 },
      targetActiveSeconds: { min: 60, max: 75 },
      idealTools: ['heavy', 'breaker'],
      lots: 5,
      payoutWeight: 0.22,
      materials: [all('clear'), band('dense', 'x', -0.42, 0.42)],
    },
    {
      id: 'archive-lattice',
      name: 'Archive lattice',
      profile: 'archive',
      archiveRecess: 0.42,
      dimensions: { width: 10.8, height: 6.8, depth: 6.2 },
      targetSolidSamples: { min: 13000, max: 15000 },
      targetActiveSeconds: { min: 75, max: 90 },
      idealTools: ['breaker', 'heavy'],
      lots: 6,
      payoutWeight: 0.25,
      materials: authoredMaterials('archive', 31),
    },
    {
      id: 'service-seal',
      name: 'Service seal',
      profile: 'archive',
      archiveRecess: 0.42,
      dimensions: { width: 9.8, height: 6, depth: 5.8 },
      targetSolidSamples: { min: 10500, max: 12300 },
      targetActiveSeconds: { min: 75, max: 90 },
      idealTools: ['thermal', 'breaker'],
      lots: 4,
      payoutWeight: 0.18,
      materials: [all('service'), band('reinforced', 'x', -0.12, 0.12)],
    },
    {
      id: 'ledger-cradle',
      name: 'Ledger cradle',
      profile: 'parcel',
      dimensions: { width: 9.6, height: 5.9, depth: 5.75 },
      targetSolidSamples: { min: 10800, max: 11900 },
      targetActiveSeconds: { min: 60, max: 90 },
      idealTools: ['pick', 'hand', 'thermal'],
      lots: 2,
      payoutWeight: 0.1,
      materials: [
        all('clear'),
        {
          material: 'dense',
          region: {
            kind: 'box',
            min: [-0.94, 0.04, -0.94],
            max: [0.94, 0.96, 0.94],
          },
        },
      ],
    },
  ] satisfies IcePhaseSpec[]
).map((p, phase) => ({
  ...p,
  layoutVersion: 3,
  deliveryId: 'claim-32',
  phaseId: p.id,
  cargoLayoutVersion: phase === 4 ? 6 : 4,
  seed: 217 + phase,
}));
MAJOR_BLOCKS.push({
  id: 'claim-32',
  name: 'The Vault',
  chapter: 5,
  profile: 'vault',
  scale: 2.15,
  lots: 23,
  value: 1,
  object: 'ledger',
  phases: 5,
  layers: vaultPhases.map((p) => p.profile),
  hint: hints.vault,
  ice: { phases: vaultPhases },
  baseNet: 22000,
  baseGross: 22000,
  targetActiveSeconds: { min: 330, max: 420 },
  structure: 'PRESERVATION VAULT',
  cargoLabel: 'MASTER RECORDS / PRECISION RECOVERY',
});

export function recoveryContract(index: number): BlockSpec {
  const serial = Math.max(1, index - 31),
    seed = serial - 1;
  const archetypes: RecoveryContract['archetype'][] = [
    'clean-recovery',
    'bulk-clearance',
    'service-call',
    'deep-retrieval',
    'mixed-custody',
  ];
  const archetype = archetypes[seed % archetypes.length];
  const profile: Profile = (
    {
      'clean-recovery': 'slab',
      'bulk-clearance': 'wings',
      'service-call': 'archive',
      'deep-retrieval': 'seam',
      'mixed-custody': 'archive',
    } as const
  )[archetype];
  const scale = 0.83 + (seed % 5) * 0.035;
  const dimensions = {
    width: 11 * scale,
    height: 6.7 * scale,
    depth: 6.1 * scale,
  };
  const id = `contract-${serial}`,
    baseNet = 10400 + (seed % 7) * 850,
    baseGross = Math.floor((baseNet * 100) / 92);
  const count = archetype === 'mixed-custody' ? 2 : 1;
  const lots = archetype === 'deep-retrieval' ? 4 : 6 + (seed % 3);
  const phases: IcePhaseSpec[] = Array.from({ length: count }, (_, phase) => {
    const inner = phase ? 0.72 : 1,
      shape = phase ? 'tower' : profile;
    const d = {
      width: dimensions.width * inner,
      height: dimensions.height * inner,
      depth: dimensions.depth * inner,
    };
    const occupancy =
      shape === 'wings'
        ? 0.84
        : shape === 'slab'
          ? 0.88
          : shape === 'seam'
            ? 0.94
            : 0.86;
    const expected =
      ((d.width * d.height * d.depth) / 0.027) * occupancy - lots * 30;
    return {
      id: `${id}-phase-${phase + 1}`,
      name: phase ? 'Mixed custody interior' : 'Contract holdings',
      deliveryId: id,
      phaseId: `phase-${phase + 1}`,
      layoutVersion: 3,
      seed: 1000 + seed * 3 + phase,
      profile: shape,
      dimensions: d,
      materials:
        archetype === 'service-call'
          ? [all('service'), band('reinforced', 'x', -0.15, 0.15)]
          : authoredMaterials(
              shape,
              archetype === 'deep-retrieval' ? 27 : 30,
              phase,
            ),
      targetSolidSamples: {
        min: Math.floor((expected * 0.85) / 100) * 100,
        max: Math.ceil((expected * 1.06) / 100) * 100,
      },
      targetActiveSeconds: { min: phase ? 45 : 100, max: phase ? 70 : 155 },
      idealTools:
        archetype === 'service-call'
          ? ['thermal', 'breaker']
          : STRUCTURE_TOOLS[shape],
      lots: phase ? 4 : lots,
      payoutWeight: count === 1 ? 1 : phase ? 0.3 : 0.7,
    };
  });
  const objective: RecoveryContract['objective'] =
    archetype === 'clean-recovery'
      ? {
          kind: 'pristine',
          count: Math.ceil(lots * 0.6),
          bonus: Math.round(baseGross * 0.15),
        }
      : archetype === 'bulk-clearance'
        ? { kind: 'bulk', bonus: Math.round(baseGross * 0.12) }
        : archetype === 'service-call'
          ? {
              kind: 'rush',
              seconds: 135 + (seed % 3) * 10,
              bonus: Math.round(baseGross * 0.15),
            }
          : archetype === 'deep-retrieval'
            ? { kind: 'precision', bonus: Math.round(baseGross * 0.16) }
            : { kind: 'noThermal', bonus: Math.round(baseGross * 0.15) };
  const label = (
    {
      'clean-recovery': 'Clean recovery',
      'bulk-clearance': 'Bulk clearance',
      'service-call': 'Service call',
      'deep-retrieval': 'Deep retrieval',
      'mixed-custody': 'Mixed custody',
    } as const
  )[archetype];
  return {
    id,
    name: `${label} ${serial}`,
    chapter: 5,
    scale: 1,
    profile,
    lots: phases.reduce((s, p) => s + p.lots, 0),
    value: 1,
    phases: count,
    layers: phases.map((p) => p.profile),
    ice: { phases },
    baseNet,
    baseGross,
    targetActiveSeconds: {
      min: count === 1 ? 100 : 145,
      max: count === 1 ? 155 : 225,
    },
    hint: hints[profile],
    structure: profile.toUpperCase(),
    cargoLabel:
      archetype === 'clean-recovery'
        ? 'FRAGILE / CONDITION PREMIUM'
        : archetype === 'bulk-clearance'
          ? 'DURABLE BULK CARGO'
          : 'SPECIALIST CUSTODY',
    contract: { archetype, objective },
  };
}
