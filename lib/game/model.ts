import { IceField } from './ice';
import { SKILLS, skillState } from './skills';
import {
  HEAT,
  CAPACITY,
  AFTERHEAT,
  FAN_RADIUS,
  COSTS,
  LEGACY_LEVELS,
} from './progression';
import {
  TUNE,
  VALUES,
  FAMILY_NAMES,
  type Loot,
  type LootKind,
  type Vec3,
} from './tuning';
export type Phase =
  | 'playing'
  | 'paused'
  | 'refilling'
  | 'transitioning'
  | 'completing'
  | 'completed';
export type Upgrade = 'heat' | 'tank' | 'wide' | 'residual';
export const UPGRADES: Record<
  Upgrade,
  { name: string; costs: number[]; effects: string[]; description: string }
> = {
  heat: {
    name: 'Heat output',
    costs: COSTS.heat,
    effects: [
      '65% more local heat',
      '2.3× starting heat',
      '3.1× starting heat',
      '4× starting heat',
    ],
    description: 'Cut through the cold, faster.',
  },
  tank: {
    name: 'Fuel capacity',
    costs: COSTS.tank,
    effects: ['75 → 115 seconds', '115 → 155 seconds', '155 → 195 seconds'],
    description: 'More time in the zone.',
  },
  wide: {
    name: 'Fan nozzle',
    costs: COSTS.wide,
    effects: ['2.6× area · 52% penetration'],
    description: 'Sweep broad areas of shallow ice.',
  },
  residual: {
    name: 'Residual heat',
    costs: COSTS.residual,
    effects: ['Warmth lingers for 0.7s', 'Stronger lingering warmth'],
    description: 'Keep moving. Let the heat finish.',
  },
};
export type Settings = {
  master: number;
  effects: number;
  muted: boolean;
  toggle: boolean;
  reducedParticles: boolean;
  largeUI: boolean;
  reducedMotion: boolean;
  rotationSensitivity: number;
};
const DEFAULT_SETTINGS: Settings = {
  master: 0.65,
  effects: 0.7,
  muted: false,
  toggle: false,
  reducedParticles: false,
  largeUI: false,
  reducedMotion: false,
  rotationSensitivity: 0.5,
};
export const SAVE_KEY = 'frozen-assets-v3';
export function layout(round: number): Loot[] {
  const result: Loot[] = [];
  const add = (kind: LootKind, x: number, y: number, z: number) => {
    const dims =
      kind === 'coin'
        ? [0.58, 0.14, 0.58]
        : kind === 'cash'
          ? [0.88, 0.28, 0.52]
          : [1.04, 0.34, 0.55];
    result.push({
      id: `${round}-${result.length}`,
      kind,
      value: VALUES[kind] * (round === 19 ? 2 : 1),
      x: x * TUNE.worldScale,
      y: 0.18 + (y - 0.18) * TUNE.worldScale,
      z: z * TUNE.worldScale,
      w: dims[0] * TUNE.worldScale,
      h: dims[1] * TUNE.worldScale,
      d: dims[2] * TUNE.worldScale,
      state: 'embedded',
      age: 0,
      vy: 0,
      credited: false,
    });
  };
  if (round === 0) {
    add('coin', -0.8, 0.79, 0.63);
    add('coin', 0.55, 1.03, 0.1);
    return result;
  }
  const variation = ((round % 3) - 1) * 0.1;
  if (round === 19) {
    add('gold', -1.3, 0.9, 0.7);
    add('gold', 0.15, 1.15, 0.65);
    add('gold', 1.45, 1.4, 0.55);
    add('gold', -0.85, 2.35, -0.5);
    add('gold', 0.8, 2.15, -0.7);
    add('cash', -1.55, 1.85, -0.55);
    add('cash', 1.5, 0.75, -0.65);
    add('coin', -0.15, 1.8, -0.1);
    return result;
  }
  switch (round % 4) {
    case 0:
      add('coin', -1.25, 0.8, 0.83);
      add('coin', -0.45, 1.02, 0.65);
      add('cash', 0.75, 1.13, 0.6);
      add('coin', 0.5, 1.85, -0.55);
      break;
    case 1:
      add('coin', -1.25, 0.8, 0.86);
      add('coin', 0.05, 0.86, 0.86);
      add('cash', -0.75, 1.7, -0.18 + variation);
      add(round > 4 ? 'gold' : 'cash', 0.95, 1.85, -0.55);
      break;
    case 2:
      add('coin', -1.22, 1.88, 0.6);
      add('cash', 1.1, 1.9, 0.55);
      add(round > 3 ? 'gold' : 'cash', -0.8, 2.05, -0.65);
      add('coin', 0.65, 2.13, -0.6);
      break;
    case 3:
      add('coin', -1.35, 0.82, 0.87);
      add('cash', 0.97, 1.1, 0.65);
      add('gold', -0.6, 1.53, -0.62);
      add('coin', 1.03, 2.14, -0.65);
      break;
  }
  return result;
}
export class GameModel {
  phase: Phase = 'playing';
  resumePhase: Phase = 'playing';
  round = 0;
  money = 0;
  earned = 0;
  recovered = 0;
  playTime = 0;
  continuing = false;
  upgrades: Record<Upgrade, number> = {
    heat: 0,
    tank: 0,
    wide: 0,
    residual: 0,
  };
  settings = { ...DEFAULT_SETTINGS };
  mode = 'precision';
  fuel = TUNE.fuelSeconds;
  field: IceField;
  loot: Loot[];
  firing = false;
  elapsed = 0;
  connect = 0;
  saveElapsed = 0;
  tickTime = 0;
  purchaseTime = -Infinity;
  focusTime = 0;
  pulseTime = 0;
  lastContact: Vec3 | null = null;
  message = '';
  messageTime = 0;
  saveStatus = 'saved';
  onSound: (kind: string, intensity?: number) => void = () => {};
  onBurst: (p: Vec3, count: number, fragment?: boolean) => void = () => {};
  onChange: () => void = () => {};
  onSave: () => void = () => {};
  onCredit: (t: Loot) => void = () => {};
  constructor(saved?: string | null) {
    this.loot = layout(0);
    this.field = new IceField(0);
    this.field.carveLoot(this.loot);
    if (saved) this.restore(saved);
  }
  get paused() {
    return this.phase === 'paused' || this.phase === 'completed';
  }
  set paused(value: boolean) {
    this.pause(value);
  }
  get toggle() {
    return this.settings.toggle;
  }
  get reducedParticles() {
    return this.settings.reducedParticles;
  }
  get heatLevel() {
    return this.upgrades.heat / 3;
  }
  get residual() {
    return AFTERHEAT[this.upgrades.residual];
  }
  get capacity() {
    return CAPACITY[this.upgrades.tank];
  }
  get power() {
    return (
      ((TUNE.heat * HEAT[this.upgrades.heat]) /
        (1 + Math.min(this.round, 19) * 0.045)) *
      (this.mode === 'wide'
        ? this.upgrades.wide >= 9
          ? 0.8
          : this.upgrades.wide >= 5
            ? 0.65
            : TUNE.widePower
        : 1) *
      (this.upgrades.heat >= 4 && this.focusTime >= 1.2 ? 1.2 : 1)
    );
  }
  get radius() {
    return this.mode === 'wide'
      ? TUNE.wideRadius * FAN_RADIUS[this.upgrades.wide]
      : TUNE.radius;
  }
  get family() {
    return this.round === 19 ? 'The vault' : FAMILY_NAMES[this.round % 4];
  }
  press() {
    if (this.phase === 'playing' && this.fuel > 0)
      this.firing = this.toggle ? !this.firing : true;
  }
  stop() {
    this.firing = false;
    this.focusTime = 0;
    this.pulseTime = 0;
  }
  pause(value = true) {
    this.stop();
    if (value && this.phase !== 'paused' && this.phase !== 'completed') {
      this.resumePhase = this.phase;
      this.phase = 'paused';
      this.onSave();
    } else if (!value && this.phase === 'paused') this.phase = this.resumePhase;
    this.emit();
  }
  emit() {
    this.onChange();
  }
  notify(message: string) {
    this.message = message;
    this.messageTime = 3.5;
    this.emit();
  }
  refill() {
    if (this.phase !== 'playing') return false;
    this.stop();
    this.phase = 'refilling';
    this.elapsed = 0;
    this.fuel = this.capacity;
    this.onSound('refill');
    this.onSave();
    this.emit();
    return true;
  }
  price(key: Upgrade) {
    return UPGRADES[key].costs[this.upgrades[key]] ?? null;
  }
  purchaseSkill(id: string, now = Date.now()) {
    const node = SKILLS.find((n) => n.id === id);
    if (!node || skillState(node, this.upgrades) !== 'available') return false;
    return this.purchase(node.key, now);
  }
  purchase(key: Upgrade, now = Date.now()) {
    this.stop();
    if (
      !(key in UPGRADES) ||
      !(
        this.phase === 'playing' ||
        (this.phase === 'paused' && this.resumePhase === 'playing')
      ) ||
      now - this.purchaseTime < 130
    )
      return false;
    const cost = this.price(key);
    if (cost === null || this.money < cost) {
      this.onSound('unavailable', 0.3);
      return false;
    }
    this.money -= cost;
    this.upgrades[key]++;
    this.purchaseTime = now;
    this.onSound(
      SKILLS.find((n) => n.key === key && n.level === this.upgrades[key])?.major
        ? 'unlock'
        : 'purchase',
    );
    this.notify(
      key === 'wide' && this.upgrades.wide === 1
        ? 'Fan nozzle unlocked. Try a wider sweep.'
        : `${UPGRADES[key].name} upgraded.`,
    );
    this.onSave();
    return true;
  }
  selectMode(mode: string) {
    this.stop();
    if (mode !== 'precision' && mode !== 'wide') return false;
    if (mode === 'wide' && !this.upgrades.wide) return false;
    this.mode = mode;
    this.onSound('ignite', 0.4);
    this.onSave();
    this.emit();
    return true;
  }
  setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
    this.stop();
    this.settings[key] = value;
    this.onSave();
    this.emit();
  }
  credit(t: Loot) {
    if (t.credited || !this.loot.includes(t)) return false;
    t.credited = true;
    this.money += t.value;
    this.earned += t.value;
    this.recovered++;
    this.onCredit(t);
    return true;
  }
  update = (dt: number, hit: Vec3 | null) => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.paused) return;
    this.playTime += dt;
    this.saveElapsed += dt;
    this.messageTime = Math.max(0, this.messageTime - dt);
    if (this.phase === 'refilling') {
      this.elapsed += dt;
      if (this.elapsed >= 0.3) {
        this.phase = 'playing';
        this.elapsed = 0;
      }
      return;
    }
    if (this.phase === 'transitioning') {
      this.elapsed += dt;
      if (this.elapsed >= TUNE.transitionTime) {
        this.phase = 'playing';
        this.elapsed = 0;
      }
      return;
    }
    if (this.phase === 'completing') {
      this.elapsed += dt;
      if (this.elapsed > 0.55) {
        this.phase = 'completed';
        this.onSound('complete');
        this.onSave();
        this.emit();
      }
      return;
    }
    if (this.firing) {
      const used = Math.min(dt, this.fuel);
      if (hit) {
        this.focusTime += used;
        this.pulseTime += used;
        this.lastContact = { ...hit };
        if (this.upgrades.heat >= 8 && this.pulseTime >= 1.5) {
          this.pulseTime = 0;
          this.field.melt(
            hit,
            0.16,
            this.power,
            this.radius * 1.2,
            this.residual,
          );
          this.onBurst(hit, 5, true);
          this.onSound('crack', 0.4);
        }
      } else {
        this.focusTime = 0;
        this.pulseTime = 0;
      }
      this.fuel = Math.max(0, this.fuel - used);
      if (
        used > 0 &&
        this.field.melt(hit, used, this.power, this.radius, this.residual) &&
        hit
      ) {
        this.tickTime += used;
        if (this.tickTime > 0.42) {
          this.onSound('tick', 0.5);
          this.tickTime = 0;
        }
      }
      if (this.fuel === 0) {
        this.stop();
        this.notify('Tank empty. Refill for free to keep going.');
      }
    } else {
      if (this.lastContact && this.upgrades.residual >= 9) {
        this.field.melt(
          this.lastContact,
          0.12,
          this.power * 0.5,
          this.radius * 1.6,
          this.residual,
        );
        this.onBurst(this.lastContact, 4);
      }
      this.lastContact = null;
      if (this.residual)
        this.field.melt(null, dt, 0, this.radius, this.residual);
      if (this.upgrades.tank >= 8)
        this.fuel = Math.min(this.capacity, this.fuel + dt * 2);
    }
    this.connect += dt;
    if (this.connect >= TUNE.connectivityInterval) {
      this.connect = 0;
      const pieces = this.field.detach();
      if (pieces.length) {
        this.onSound('crack', Math.min(1, 0.35 + pieces.length * 0.07));
        for (const p of pieces) this.onBurst(p, 1, true);
      }
      for (const t of this.loot)
        if (t.state === 'embedded' && this.field.canRelease(t)) {
          t.state = 'freed';
          t.age = 0;
          this.credit(t);
          this.onSound('crack', 0.45);
          this.onBurst(t, 3, true);
          this.onSave();
        }
    }
    for (const t of this.loot) {
      if (t.state === 'freed') {
        t.age += dt;
        t.vy -= TUNE.gravity * dt;
        t.y += t.vy * dt;
        if (t.y <= 0.2 + t.h / 2 || t.age > 1.5) {
          const impact = Math.min(1, Math.abs(t.vy) / 5);
          t.y = 0.2 + t.h / 2;
          t.state = 'landed';
          t.age = 0;
          this.onSound(t.kind, 0.45 + impact * 0.5);
        }
      } else if (t.state === 'landed') {
        t.age += dt;
        if (t.age > TUNE.landingPause) {
          t.state = 'collecting';
          t.age = 0;
          this.onSound('collect', t.kind === 'coin' ? 0.45 : 0.65);
          if (t.kind === 'gold') this.notify(`Gold recovered · +$${t.value}`);
        }
      } else if (t.state === 'collecting') {
        t.age += dt;
        if (t.age > TUNE.collectionTime) {
          t.state = 'collected';
          t.age = 0;
          this.onSave();
        }
      }
    }
    if (this.loot.every((t) => t.state === 'collected')) {
      this.stop();
      this.field.warmth.fill(0);
      this.elapsed = 0;
      if (this.round === TUNE.finalRound - 1 && !this.continuing)
        this.phase = 'completing';
      else {
        this.nextBlock();
        this.phase = 'transitioning';
      }
      this.onSave();
    }
    if (this.saveElapsed > 4) {
      this.saveElapsed = 0;
      this.onSave();
    }
  };
  nextBlock() {
    this.round++;
    if (this.upgrades.tank >= 4)
      this.fuel = Math.min(
        this.capacity,
        this.fuel + this.capacity * (this.upgrades.tank >= 12 ? 0.5 : 0.2),
      );
    this.lastContact = null;
    this.loot = layout(this.round);
    this.field = new IceField(this.round);
    this.field.carveLoot(this.loot);
    this.stop();
    this.elapsed = 0;
    this.connect = 0;
    this.phase = 'playing';
    this.onSave();
    this.emit();
  }
  continuePlaying() {
    if (this.phase !== 'completed') return;
    this.continuing = true;
    this.nextBlock();
  }
  restart() {
    this.stop();
    this.round = 0;
    this.money = 0;
    this.earned = 0;
    this.recovered = 0;
    this.playTime = 0;
    this.continuing = false;
    this.upgrades = { heat: 0, tank: 0, wide: 0, residual: 0 };
    this.mode = 'precision';
    this.fuel = TUNE.fuelSeconds;
    this.phase = 'playing';
    this.resumePhase = 'playing';
    this.loot = layout(0);
    this.field = new IceField(0);
    this.field.carveLoot(this.loot);
    this.elapsed = 0;
    this.connect = 0;
    this.saveElapsed = 0;
    this.tickTime = 0;
    this.purchaseTime = -Infinity;
    this.message = '';
    this.messageTime = 0;
    this.onSave();
    this.emit();
  }
  snapshot() {
    return {
      phase: this.phase,
      canPurchase:
        this.phase === 'playing' ||
        (this.phase === 'paused' && this.resumePhase === 'playing'),
      round: this.round,
      money: this.money,
      earned: this.earned,
      recovered: this.recovered,
      playTime: this.playTime,
      upgrades: { ...this.upgrades },
      settings: { ...this.settings },
      mode: this.mode,
      fuel: this.fuel,
      capacity: this.capacity,
      firing: this.firing,
      family: this.family,
      collected: this.loot.filter((t) => t.credited).length,
      total: this.loot.length,
      message: this.messageTime > 0 ? this.message : '',
      saveStatus: this.saveStatus,
      continuing: this.continuing,
      ice: this.field.remaining(),
    };
  }
  serialize() {
    return JSON.stringify({
      version: TUNE.saveVersion,
      progression: 2,
      round: this.round,
      money: this.money,
      earned: this.earned,
      recovered: this.recovered,
      playTime: this.playTime,
      upgrades: this.upgrades,
      settings: this.settings,
      mode: this.mode,
      fuel: this.fuel,
      continuing: this.continuing,
      completed: this.phase === 'completed',
      ice: Array.from(this.field.values, (v) => Math.round(v * 10000) / 10000),
      loot: this.loot.map((t) => ({ id: t.id, credited: t.credited })),
    });
  }
  restore(raw: string) {
    try {
      const s = JSON.parse(raw);
      if (s && s.progression === undefined && s.upgrades) {
        s.upgrades = { ...s.upgrades };
        for (const key of Object.keys(LEGACY_LEVELS) as Upgrade[]) {
          const old = s.upgrades[key];
          if (
            !Number.isInteger(old) ||
            old < 0 ||
            old >= LEGACY_LEVELS[key].length
          )
            throw new Error('Invalid legacy upgrade');
          s.upgrades[key] = LEGACY_LEVELS[key][old];
        }
      } else if (s?.progression !== 2) throw new Error('Unknown progression');
      const integer = (v: unknown, min: number, max: number) =>
        typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max;
      if (
        s.version !== TUNE.saveVersion ||
        !integer(s.round, 0, 10000) ||
        !integer(s.money, 0, 1e9) ||
        !integer(s.earned, 0, 1e9) ||
        s.money > s.earned ||
        !integer(s.recovered, 0, 1e6) ||
        !Number.isFinite(s.playTime) ||
        s.playTime < 0
      )
        throw new Error('Invalid progress');
      for (const key of Object.keys(UPGRADES) as Upgrade[])
        if (!integer(s.upgrades?.[key], 0, UPGRADES[key].costs.length))
          throw new Error('Invalid upgrades');
      if (
        !Array.isArray(s.ice) ||
        s.ice.length !== TUNE.nx * TUNE.ny * TUNE.nz ||
        !s.ice.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 1)
      )
        throw new Error('Invalid thaw');
      const loot = layout(s.round);
      if (
        !Array.isArray(s.loot) ||
        loot.length !== s.loot.length ||
        loot.some(
          (t, i) =>
            s.loot[i].id !== t.id || typeof s.loot[i].credited !== 'boolean',
        )
      )
        throw new Error('Invalid loot');
      if (
        !Number.isFinite(s.fuel) ||
        s.fuel < 0 ||
        s.fuel > CAPACITY[s.upgrades.tank]
      )
        throw new Error('Invalid fuel');
      this.round = s.round;
      this.money = s.money;
      this.earned = s.earned;
      this.recovered = s.recovered;
      this.playTime = s.playTime;
      this.upgrades = { ...s.upgrades };
      this.mode = s.mode === 'wide' && s.upgrades.wide ? 'wide' : 'precision';
      this.fuel = s.fuel;
      this.continuing = !!s.continuing;
      this.loot = loot;
      this.loot.forEach((t, i) => {
        if (s.loot[i].credited) {
          t.credited = true;
          t.state = 'collected';
        }
      });
      this.field = new IceField(this.round, s.ice);
      this.firing = false;
      this.phase =
        s.completed && this.round === 19 && !this.continuing
          ? 'completed'
          : 'playing';
      if (s.settings) {
        for (const k of ['master', 'effects', 'rotationSensitivity'] as const)
          if (Number.isFinite(s.settings[k]))
            this.settings[k] = Math.max(0, Math.min(1, s.settings[k]));
        for (const k of [
          'muted',
          'toggle',
          'reducedParticles',
          'largeUI',
          'reducedMotion',
        ] as const)
          if (typeof s.settings[k] === 'boolean')
            this.settings[k] = s.settings[k];
      }
      return true;
    } catch {
      this.saveStatus = 'invalid';
      return false;
    }
  }
}
