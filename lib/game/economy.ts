import type { LootKind } from './tuning';
export const ECONOMY_REVISION = 2;
export const BASE_LOOT_VALUES = { coin: 15, cash: 55, gold: 150 };
type Valuable = {
  name: string;
  value: number;
  kind: LootKind;
  variant: number;
};
// Authored bases, independent of delivery, commission and condition grade.
export const VALUABLES = {
  coin: { name: 'Loose coin', value: 15, kind: 'coin', variant: 0 },
  roll: { name: 'Coin roll', value: 40, kind: 'coin', variant: 3 },
  cash: { name: 'Cash bundle', value: 55, kind: 'cash', variant: 0 },
  pack: { name: 'Sealed cash pack', value: 110, kind: 'cash', variant: 1 },
  silver: { name: 'Silver ingot', value: 125, kind: 'coin', variant: 4 },
  smallGold: { name: 'Small gold bar', value: 150, kind: 'gold', variant: 0 },
  gold: { name: 'Gold bar', value: 250, kind: 'gold', variant: 0 },
  ring: { name: 'Plain ring', value: 180, kind: 'gold', variant: 2 },
  bracelet: { name: 'Bracelet', value: 300, kind: 'gold', variant: 2 },
  chain: { name: 'Chain', value: 360, kind: 'gold', variant: 3 },
  pocketWatch: { name: 'Pocket watch', value: 425, kind: 'gold', variant: 1 },
  watch: { name: 'Watch', value: 550, kind: 'gold', variant: 1 },
  rareCase: { name: 'Rare coin case', value: 650, kind: 'coin', variant: 5 },
  bond: { name: 'Bond envelope', value: 800, kind: 'cash', variant: 2 },
  gem: { name: 'Gem case', value: 1000, kind: 'gold', variant: 4 },
  bullion: {
    name: 'Large bullion pack',
    value: 1250,
    kind: 'gold',
    variant: 5,
  },
} satisfies Record<string, Valuable>;
export type ValuableId = keyof typeof VALUABLES;
// Each row is a physical manifest, distributed over the delivery's compartments.
export const CARGO_MANIFESTS: ValuableId[][] = [
  ['roll', 'cash'],
  ['smallGold', 'cash', 'coin'],
  ['smallGold', 'silver', 'cash'],
  ['ring', 'smallGold', 'pack', 'cash'],
  ['chain', 'bracelet', 'silver', 'roll'],
  ['watch', 'rareCase', 'bracelet', 'cash'],
  ['rareCase', 'bond', 'pack', 'silver'],
  ['gem', 'watch', 'ring', 'chain', 'silver'],
  ['gem', 'bond', 'bracelet', 'chain', 'pack'],
  ['gem', 'bond', 'rareCase', 'watch', 'chain', 'pack'],
  ['gem', 'bond', 'rareCase', 'pocketWatch', 'bracelet', 'silver'],
  ['gem', 'bond', 'rareCase', 'watch', 'gold', 'pocketWatch'],
  ['gem', 'bond', 'rareCase', 'watch', 'chain', 'pocketWatch'],
  ['bullion', 'bond', 'rareCase', 'watch', 'chain', 'pocketWatch', 'pack'],
  ['bullion', 'gem', 'bond', 'rareCase', 'watch', 'chain', 'bracelet'],
  [
    'bullion',
    'gem',
    'bond',
    'rareCase',
    'watch',
    'pocketWatch',
    'chain',
    'gold',
  ],
  ['bullion', 'gem', 'gem', 'bond', 'rareCase', 'watch', 'chain', 'ring'],
  [
    'bullion',
    'bullion',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
    'pocketWatch',
  ],
  ['bullion', 'bullion', 'bullion', 'gem', 'gem', 'bond', 'rareCase', 'watch'],
  ['bullion', 'bullion', 'bullion', 'gem', 'gem', 'bond', 'bond', 'rareCase'],
  [
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
    'pocketWatch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'rareCase',
    'watch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
    'watch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
    'watch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'rareCase',
    'watch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'rareCase',
    'watch',
  ],
  [
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'bullion',
    'gem',
    'gem',
    'gem',
    'bond',
    'bond',
    'rareCase',
  ],
  [
    'bullion',
    'gem',
    'bond',
    'rareCase',
    'watch',
    'pocketWatch',
    'chain',
    'bracelet',
    'gold',
    'ring',
    'silver',
    'pack',
  ],
  [
    'bullion',
    'gem',
    'bond',
    'rareCase',
    'watch',
    'pocketWatch',
    'chain',
    'bracelet',
    'gold',
    'ring',
    'silver',
    'pack',
  ],
  [
    'bullion',
    'gem',
    'bond',
    'rareCase',
    'watch',
    'pocketWatch',
    'chain',
    'bracelet',
    'bullion',
    'gem',
    'bond',
    'rareCase',
    'watch',
    'pocketWatch',
    'gold',
    'smallGold',
  ],
];
export function phaseCargo(
  block: number,
  phase: number,
  phases: number,
  contractLots = 4,
): ValuableId[] {
  if (block >= 32) {
    const selection: ValuableId[] = [
      'bullion',
      'gem',
      'bond',
      'watch',
      'rareCase',
      'silver',
      'chain',
      'pocketWatch',
    ];
    return Array.from(
      { length: contractLots },
      (_, i) => selection[(block + phase * 3 + i) % selection.length],
    );
  }
  const manifest = CARGO_MANIFESTS[block] ?? [
    'bullion',
    'gem',
    'bond',
    'watch',
    'rareCase',
    'silver',
    'chain',
    'pocketWatch',
  ];
  if (block === 31) {
    const boundaries = [0, 4, 7, 11, 14, 16];
    return manifest.slice(boundaries[phase], boundaries[phase + 1]);
  }
  const start = Math.floor((manifest.length * phase) / phases);
  const end = Math.floor((manifest.length * (phase + 1)) / phases);
  return manifest.slice(start, end);
}
export function reducedLegacyValue(old: number) {
  const value = old * 0.4;
  const step = value < 500 ? 5 : value < 2000 ? 10 : value < 5000 ? 25 : 50;
  return old === 0 ? 0 : Math.max(5, Math.round(value / step) * step);
}
