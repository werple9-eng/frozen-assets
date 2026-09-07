export const TUNE = {
  step: 0.24,
  nx: 23,
  ny: 14,
  nz: 15,
  baseY: 0.25,
  heat: 1.45,
  radius: 0.48,
  wideRadius: 0.78,
  widePower: 0.52,
  fuelSeconds: 75,
  fuelGain: 40,
  visualFollow: 30,
  meshInterval: 1 / 40,
  connectivityInterval: 0.16,
  gravity: 13,
  landingPause: 0.23,
  collectionTime: 0.34,
  transitionTime: 0.38,
  particleCap: 48,
  fragmentCap: 18,
  audioVoices: 12,
  finalRound: 20,
  saveVersion: 3,
};
export type Vec3 = { x: number; y: number; z: number };
export type LootKind = 'coin' | 'cash' | 'gold';
export type Loot = {
  id: string;
  kind: LootKind;
  value: number;
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  state: 'embedded' | 'freed' | 'landed' | 'collecting' | 'collected';
  age: number;
  vy: number;
  credited: boolean;
};
export const FAMILY_NAMES = [
  'Loose change',
  'Cold storage',
  'Joint account',
  'Deep deposit',
];
export const VALUES = { coin: 35, cash: 140, gold: 380 };
