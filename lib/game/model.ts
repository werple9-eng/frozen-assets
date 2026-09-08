import { IceField } from './ice';
import { SKILLS, skillState } from './skills';
import { Campaign } from './campaign';
import { StrikeCycle } from './strike';
import {
  ALL_TOOL_NODES,
  TOOL_TREES,
  TOOL_ORDER,
  canonicalTool,
  freshNodes,
  nodeState,
  toolEffects,
  type MajorTool,
} from './tool-trees';
import {
  freshToolUpgrades,
  copyToolUpgrades,
  TOOL_FITTINGS,
  type UpgradeLevels,
} from './tool-upgrades';
import { TOOLS, STORY, type ToolId } from './campaign-content';
import { campaignField, campaignLoot } from './campaign-layout';
import {
  freshTutorial,
  tutorialActive,
  tutorialCanWork,
  tutorialMessage,
  tutorialTask,
  tutorialField,
  tutorialLoot,
  validateTutorial,
  LESSONS,
  CONTINUOUS_COST,
  type TutorialSave,
} from './tutorial';
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
  textSpeed: number;
  dialogueSounds: boolean;
  gameplayZoom: number;
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
  textSpeed: 0.5,
  dialogueSounds: true,
  gameplayZoom: 0.5,
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
  toolUpgrades = freshToolUpgrades();
  nodes = freshNodes();
  toolNotice: {
    tool: MajorTool;
    kind: 'available' | 'ready' | 'acquired';
  } | null = null;
  toolNotices: string[] = [];
  revealedTools: MajorTool[] = ['hand'];
  breakerBit: 'standard' | 'precision' | 'wide' = 'standard';
  chargeTime = 0;
  chargedPower = 1;
  localHits = 0;
  localTime = 0;
  localPoint: Vec3 | null = null;
  echoes: { point: Vec3; time: number; power: number; radius: number }[] = [];
  echoAnchor: Vec3 | null = null;
  get fittings() {
    return toolEffects(this.nodes[canonicalTool(this.toolId)]);
  }
  hasNode(id: string) {
    return this.nodes[
      ALL_TOOL_NODES.find((n) => n.id === id)?.toolId ?? 'hand'
    ].includes(id);
  }
  get hasFan() {
    return this.hasNode('TH-C1') || this.toolUpgrades.thermal.wide > 0;
  }
  dismissToolNotice() {
    this.toolNotice = null;
    this.onSave();
    this.emit();
  }
  checkTools() {
    if (!this.campaign || this.inTutorial || this.liveCall || this.toolNotice)
      return;
    for (const t of TOOLS.filter((t) => t.id !== 'hand' && t.id !== 'grip')) {
      const id = t.id as MajorTool;
      if (this.campaign.state.tools.includes(id)) continue;
      const intro = STORY.find((e) => e.id === `equipment.${id}`);
      if (
        this.campaign.state.block < t.block ||
        (intro && !this.campaign.state.read.includes(intro.id))
      )
        continue;
      if (!this.revealedTools.includes(id)) this.revealedTools.push(id);
      const kind = !this.toolNotices.includes(`available:${id}`)
        ? 'available'
        : this.money >= t.cost && !this.toolNotices.includes(`ready:${id}`)
          ? 'ready'
          : null;
      if (kind) {
        this.toolNotices.push(`${kind}:${id}`);
        this.toolNotice = { tool: id, kind };
        this.stop();
        this.onSave();
        this.emit();
        return;
      }
    }
  }
  purchaseNode(id: string, now = Date.now()) {
    const node = ALL_TOOL_NODES.find((n) => n.id === id);
    if (
      !node ||
      !this.campaign ||
      !this.campaign.state.tools.some((t) => canonicalTool(t) === node.toolId)
    )
      return false;
    if (this.inTutorial) return id === 'HC-S1' && this.buyContinuous();
    if (
      !['playing', 'paused'].includes(this.phase) ||
      !!this.settlement ||
      !!this.liveCall ||
      !!this.toolNotice ||
      now - this.purchaseTime < 130 ||
      nodeState(node, this.nodes[node.toolId]) !== 'available' ||
      this.money < node.cost
    )
      return false;
    this.stop();
    this.money -= node.cost;
    this.nodes[node.toolId].push(id);
    this.purchaseTime = now;
    this.campaign.milestone('FIRST_UPGRADE');
    if (id === 'HC-S1') this.campaign.milestone('HOLD_UNLOCKED');
    this.onSound(node.major ? 'unlock' : 'purchase');
    this.onSave();
    this.emit();
    return true;
  }
  get upgrades() {
    return this.toolUpgrades[this.toolId];
  }
  set upgrades(levels: UpgradeLevels) {
    this.toolUpgrades[this.toolId] = { ...levels };
  }
  settings = { ...DEFAULT_SETTINGS };
  mode = 'precision';
  fuel = TUNE.fuelSeconds;
  field: IceField;
  loot: Loot[];
  firing = false;
  elapsed = 0;
  connect = 0;
  private releaseField?: IceField;
  private releaseRevision = -1;
  contactSamples?: (t: Loot) => Vec3[] | undefined;
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
  onImpact: (t: Loot) => void = () => {};
  campaign?: Campaign;
  interactionBusy = false;
  strikeClock = 0;
  strikePulse = 0;
  strikeSerial = 0;
  strike = new StrikeCycle();
  private creditedInFlight = new WeakMap<Loot, number>();
  shotPending = false;
  settlement: {
    gross: number;
    fee: number;
    net: number;
    rate: number;
    name: string;
  } | null = null;
  settlementTime = 0;
  onPhone: () => void = () => {};
  tutorial?: TutorialSave;
  dialing = false;
  onTutorial: () => void = () => {};
  constructor(
    saved?: string | null,
    options: { legacy?: boolean; tutorial?: boolean } = {},
  ) {
    if (!options.legacy) this.campaign = new Campaign();
    this.loot = this.campaign ? campaignLoot(0) : layout(0);
    this.field = this.campaign ? campaignField(0) : new IceField(0);
    this.field.carveLoot(this.loot);
    if (saved) this.restore(saved);
    else if (options.tutorial && this.campaign) this.startTutorial();
    if (!this.inTutorial) this.campaign?.trigger('GAME_START');
  }
  get inTutorial() {
    return tutorialActive(this.tutorial);
  }
  startTutorial() {
    this.restart();
    this.tutorial = freshTutorial();
    this.tutorial.metrics.run = Date.now();
    if (this.campaign) {
      this.campaign.state.flags = [
        'ch1.intro',
        'ch1.arrangement',
        'ch1.first',
        'ch1.grip',
      ];
      this.campaign.state.pending = this.campaign.state.history = [];
    }
    this.loadTutorialBlock(0);
    this.onSave();
    this.emit();
  }
  tutorialStep(step: number, line = 0, mode?: TutorialSave['mode']) {
    const t = this.tutorial;
    if (!t || !this.inTutorial) return;
    t.step = step;
    t.line = line;
    t.mode =
      mode ??
      ([2, 5, 7, 10].includes(step) ||
      (step === 4 && !t.firstImpact) ||
      (step === 12 && line === 0)
        ? 'task'
        : 'dialogue');
    if (t.mode !== 'task') this.stop();
    t.timeInStep = 0;
    const id = `${step}:${line}`;
    if (
      !t.history.includes(id) &&
      t.mode === 'dialogue' &&
      !['board', 'chapter'].includes(t.stage)
    )
      t.history.push(id);
    t.metrics[`step${step}`] ??= t.elapsed;
    this.onTutorial();
    this.onSave();
    this.emit();
  }
  get phoneRinging() {
    return this.inTutorial
      ? this.tutorial!.mode === 'ringing'
      : this.campaign?.state.call?.status === 'ringing';
  }
  get liveCall() {
    const c = this.campaign?.state.call;
    if (this.inTutorial || !c || c.status !== 'active') return null;
    const event = STORY.find((e) => e.id === c.event)!,
      line = event.messages[c.line];
    return {
      id: `${c.event}:${c.line}`,
      text: line.text,
      speaker:
        line.speaker === 'bank'
          ? 'BELLWETHER NATIONAL'
          : c.event === 'epilogue'
            ? 'UNKNOWN LINE'
            : 'TONY',
    };
  }
  get phoneOffHook() {
    return (
      this.dialing ||
      !!this.liveCall ||
      (this.inTutorial &&
        this.tutorial!.mode === 'dialogue' &&
        !['board', 'chapter'].includes(this.tutorial!.stage))
    );
  }
  answerPhone() {
    if (this.phoneOffHook) return;
    this.stop();
    if (this.inTutorial && this.tutorial!.mode === 'ringing') {
      this.tutorialStep(this.tutorial!.step, this.tutorial!.line, 'dialogue');
    } else if (this.campaign?.state.call) {
      this.campaign.state.call.status = 'active';
    } else this.dialing = true;
    this.onSave();
    this.emit();
  }
  dialTony(digit: string) {
    if (!this.dialing || digit !== '7') return false;
    if (this.campaign?.state.pending.length) this.campaign.deliver();
    if (this.campaign?.state.call) {
      this.dialing = false;
      this.answerPhone();
      return true;
    }
    return false;
  }
  hangUp() {
    this.dialing = false;
    this.emit();
  }
  advanceCall(expectedId?: string) {
    const c = this.campaign?.state.call;
    if (!c || c.status !== 'active') return false;
    if (expectedId && expectedId !== `${c.event}:${c.line}`) return false;
    const event = STORY.find((e) => e.id === c.event)!;
    if (c.line + 1 < event.messages.length) {
      const previous = event.messages[c.line].speaker;
      c.line++;
      if (event.messages[c.line].speaker !== previous) c.status = 'ringing';
    } else {
      if (!this.campaign!.state.read.includes(c.event))
        this.campaign!.state.read.push(c.event);
      this.campaign!.state.call = undefined;
      this.checkTools();
    }
    this.onSave();
    this.emit();
    return true;
  }
  loadTutorialBlock(block: 0 | 1 | 2) {
    if (!this.tutorial) return;
    this.stop();
    this.strikeClock = 0;
    this.tutorial.block = block;
    this.tutorial.legacyParcel = false;
    this.field = tutorialField(block);
    this.loot = tutorialLoot(block);
    this.field.carveLoot(this.loot);
    this.connect = 0;
    if (this.campaign) {
      this.campaign.state.blockGross = this.campaign.state.blockFee = 0;
    }
    this.settlement = null;
    this.settlementTime = 0;
  }
  advanceTutorial() {
    const t = this.tutorial;
    if (!t || !this.inTutorial) return false;
    const message = tutorialMessage(t);
    if (!message || message.waiting) return false;
    if (t.line + 1 < LESSONS[t.step].lines.length)
      this.tutorialStep(t.step, t.line + 1);
    else if (t.stage === 'post') {
      t.stage = 'chapter';
      t.mode = 'task';
      this.onSave();
      this.emit();
    } else if (t.step === 8 || t.step === 12) {
      this.tutorialStep(t.step, t.line, 'task');
    } else {
      const next = t.step + 1;
      if (next === 1) this.loadTutorialBlock(1);
      if (next === 7) {
        this.settlement = null;
        this.settlementTime = 0;
      }
      if (next === 11) this.loadTutorialBlock(2);
      this.tutorialStep(next);
    }
    return true;
  }
  tutorialMenu(menu: string | null) {
    const t = this.tutorial;
    if (!this.inTutorial || !t) return;
    if (menu === 'skills' && t.step === 7) this.tutorialStep(8);
    else if (!menu && t.step === 10) {
      this.loadTutorialBlock(2);
      this.tutorialStep(11);
    } else if (!menu && t.step === 8) this.tutorialStep(7);
  }
  buyContinuous() {
    const t = this.tutorial;
    if (
      !this.inTutorial ||
      !t ||
      t.step !== 8 ||
      t.mode !== 'task' ||
      t.continuous ||
      this.money < CONTINUOUS_COST
    )
      return false;
    this.money -= CONTINUOUS_COST;
    t.continuous = true;
    if (!this.nodes.hand.includes('HC-S1')) this.nodes.hand.push('HC-S1');
    this.campaign?.unlock('grip');
    this.campaign?.milestone('FIRST_UPGRADE');
    this.onSound('unlock');
    this.tutorialStep(9);
    return true;
  }
  stampTutorial() {
    const t = this.tutorial;
    if (!t || t.stage !== 'board' || t.boardStamped) return false;
    t.boardStamped = true;
    t.flags.push('stamped');
    this.onSound('stamp');
    this.onSave();
    this.emit();
    return true;
  }
  finishTutorialBoard() {
    const t = this.tutorial;
    if (!t || t.stage !== 'board' || !t.boardStamped) return;
    t.stage = 'post';
    this.tutorialStep(13, 0, 'ringing');
  }
  finishTutorial() {
    const t = this.tutorial;
    if (!t || t.stage !== 'chapter') return false;
    t.stage = 'done';
    t.metrics.complete = t.elapsed;
    this.loadTutorialBlock(0);
    this.field = campaignField(0);
    this.loot = campaignLoot(0);
    this.field.carveLoot(this.loot);
    this.campaign?.trigger('BLOCK_START');
    this.onSave();
    this.emit();
    return true;
  }
  get thermal() {
    return !this.campaign || this.campaign.state.selected === 'thermal';
  }
  get activeTool() {
    return this.campaign?.tool;
  }
  get toolId() {
    return this.campaign?.state.selected ?? 'thermal';
  }
  get storyObjects() {
    return this.campaign?.state.objects ?? [];
  }
  get unread() {
    return this.campaign?.unread ?? 0;
  }
  get chapter() {
    return this.campaign?.block.chapter ?? 1;
  }
  get campaignScale() {
    if (this.inTutorial) return this.field.profile?.scale ?? 1;
    return this.campaign && !this.campaign.state.legacyBlock
      ? this.campaign.block.scale
      : 1;
  }
  openPhone() {
    this.stop();
    this.campaign?.openPhone();
    this.onSave();
    this.emit();
  }
  selectTool(id: ToolId) {
    if (!this.campaign?.state.tools.includes(id)) return false;
    this.stop();
    this.campaign.state.selected = id;
    this.onSave();
    this.emit();
    return true;
  }
  buyTool(id: ToolId) {
    if (this.inTutorial) return id === 'grip' && this.buyContinuous();
    const t = TOOLS.find((x) => x.id === id),
      c = this.campaign;
    if (
      !t ||
      !c ||
      !['playing', 'paused'].includes(this.phase) ||
      !!this.settlement ||
      c.state.tools.includes(id) ||
      (id !== 'grip' && !this.revealedTools.includes(id as MajorTool)) ||
      this.money < t.cost
    )
      return false;
    this.stop();
    this.money -= t.cost;
    c.unlock(id);
    if (id !== 'grip') {
      this.toolNotice = { tool: id, kind: 'acquired' };
      this.toolNotices.push(`acquired:${id}`);
    }
    this.onSound('unlock');
    this.onSave();
    this.emit();
    return true;
  }
  cycleTool(direction: number) {
    const c = this.campaign;
    if (!c) return;
    const a = [...new Set(c.state.tools.map(canonicalTool))];
    this.selectTool(
      a[
        (a.indexOf(canonicalTool(c.state.selected)) + direction + a.length) %
          a.length
      ],
    );
  }
  skipSettlement() {
    this.settlementTime = 0;
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
    return Math.max(
      this.upgrades.heat / 3,
      this.nodes.thermal.filter((id) => id.startsWith('TH-P')).length / 3,
    );
  }
  get residual() {
    return Math.max(
      AFTERHEAT[this.upgrades.residual],
      this.thermal ? this.fittings.afterheat : 0,
    );
  }
  get capacity() {
    return (
      CAPACITY[this.toolUpgrades.thermal.tank] *
      toolEffects(this.nodes.thermal).fuel
    );
  }
  get power() {
    return (
      ((TUNE.heat *
        (this.campaign ? 1.5 : 1) *
        HEAT[this.upgrades.heat] *
        this.fittings.power *
        (this.mode === 'precision' && this.hasNode('TH-P3') ? 1.3 : 1)) /
        (this.campaign ? 1 : 1 + Math.min(this.round, 19) * 0.045)) *
      (this.mode === 'wide'
        ? this.upgrades.wide >= 9 || this.hasNode('TH-C3')
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
      ? TUNE.wideRadius *
          FAN_RADIUS[this.upgrades.wide] *
          Math.sqrt(this.fittings.area)
      : TUNE.radius;
  }
  get family() {
    if (this.inTutorial)
      return this.tutorial?.block === 2
        ? 'Return spring practice'
        : 'First small claim';
    if (this.campaign?.state.legacyBlock) return 'Imported recovery';
    return (
      this.campaign?.block.name ??
      (this.round === 19 ? 'The vault' : FAMILY_NAMES[this.round % 4])
    );
  }
  press() {
    if (
      this.phase === 'playing' &&
      !this.settlement &&
      (!this.inTutorial || tutorialCanWork(this.tutorial!)) &&
      !this.liveCall &&
      !this.toolNotice &&
      !this.dialing &&
      (this.fuel > 0 || !this.thermal)
    ) {
      this.firing = this.toggle ? !this.firing : true;
      this.shotPending = true;
      if (!this.thermal && !(this.toolId === 'sledge' && this.hasNode('SH-T1')))
        this.strike.request();
    }
  }
  release() {
    if (!this.thermal) {
      if (this.toolId === 'sledge' && this.hasNode('SH-T1') && this.firing) {
        this.chargedPower =
          1 +
          Math.min(1, this.chargeTime / 0.65) *
            (this.hasNode('SH-T2') ? 1.6 : 1);
        this.strike.request();
        this.chargeTime = 0;
      }
      this.firing = false;
      this.focusTime = this.pulseTime = 0;
      return;
    }
    const pending = this.shotPending;
    this.stop();
    if (!this.thermal) this.shotPending = pending;
  }
  stop() {
    this.firing = false;
    this.focusTime = 0;
    this.pulseTime = 0;
    this.shotPending = false;
    this.strike.cancel();
    this.chargeTime = 0;
    this.chargedPower = 1;
    this.localTime = 0;
    this.localHits = 0;
    this.localPoint = null;
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
  price(key: Upgrade, tool = this.toolId) {
    return UPGRADES[key].costs[this.toolUpgrades[tool][key]] ?? null;
  }
  purchaseSkill(id: string, now = Date.now(), tool = this.toolId) {
    const node = SKILLS.find((n) => n.id === id);
    if (
      !node ||
      !this.toolUpgrades[tool] ||
      skillState(node, this.toolUpgrades[tool]) !== 'available'
    )
      return false;
    return this.purchase(node.key, now, tool);
  }
  purchase(key: Upgrade, now = Date.now(), tool = this.toolId) {
    if (this.inTutorial) return false;
    if (
      !this.toolUpgrades[tool] ||
      (this.campaign
        ? !this.campaign.state.tools.includes(tool)
        : tool !== 'thermal')
    )
      return false;
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
    const levels = this.toolUpgrades[tool];
    const cost = this.price(key, tool);
    if (cost === null || this.money < cost) {
      this.onSound('unavailable', 0.3);
      return false;
    }
    this.money -= cost;
    levels[key]++;
    this.campaign?.milestone('FIRST_UPGRADE');
    this.purchaseTime = now;
    this.onSound(
      SKILLS.find((n) => n.key === key && n.level === levels[key])?.major
        ? 'unlock'
        : 'purchase',
    );
    this.notify(
      tool !== 'thermal'
        ? `${TOOL_FITTINGS[tool].names[key]} upgraded.`
        : key === 'wide' && levels.wide === 1
          ? 'Fan nozzle unlocked. Try a wider sweep.'
          : `${UPGRADES[key].name} upgraded.`,
    );
    this.onSave();
    return true;
  }
  selectMode(mode: string) {
    this.stop();
    if (mode !== 'precision' && mode !== 'wide') return false;
    if (mode === 'wide' && !this.hasFan) return false;
    this.mode = mode;
    this.onSound('ignite', 0.4);
    this.onSave();
    this.emit();
    return true;
  }
  selectBreakerBit(bit: 'standard' | 'precision' | 'wide') {
    if (
      (bit === 'precision' && !this.hasNode('PB-C1')) ||
      (bit === 'wide' && !this.hasNode('PB-C2'))
    )
      return false;
    this.stop();
    this.breakerBit = bit;
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
    if (t.story) {
      this.campaign?.collect(t.story);
      return true;
    }
    const net = this.campaign ? this.campaign.credit(t.value, t.id) : t.value;
    this.money += net;
    this.creditedInFlight.set(t, net);
    this.earned += t.value;
    this.recovered++;
    this.onCredit(t);
    return true;
  }
  update = (dt: number, hit: Vec3 | null) => {
    if (!Number.isFinite(dt) || dt <= 0) return;
    dt = Math.min(dt, 0.05);
    if (this.inTutorial && this.tutorial) {
      this.tutorial.elapsed += dt;
      this.tutorial.timeInStep += dt;
    }
    if (
      this.phase === 'paused' ||
      this.liveCall ||
      this.dialing ||
      this.toolNotice
    )
      return;
    if (this.phase === 'completed') {
      if (this.campaign?.advanceQuiet(dt, false)) {
        this.onPhone();
        this.onSave();
        this.emit();
      }
      return;
    }
    this.playTime += dt;
    this.checkTools();
    if (this.toolNotice) return;
    if (this.inTutorial && this.tutorial) {
      if (!tutorialCanWork(this.tutorial)) return;
      if (this.tutorial.step === 12 && this.firing && hit) {
        this.tutorial.holdSeconds += dt;
        if (this.tutorial.holdSeconds > 2 && this.tutorial.line === 0)
          this.tutorialStep(12, 1);
      }
    }
    this.strikePulse = Math.max(0, this.strikePulse - dt);
    this.strikeClock = Math.max(0, this.strikeClock - dt);
    if (
      !this.inTutorial &&
      this.campaign?.advanceQuiet(
        dt,
        this.firing ||
          this.interactionBusy ||
          this.loot.some((t) => t.state === 'freed' || t.state === 'landed') ||
          this.strikePulse > 0 ||
          this.strike.active ||
          this.strike.queued,
      )
    ) {
      this.onPhone();
      this.onSave();
      this.emit();
    }
    if (this.settlementTime > 0) {
      this.settlementTime = Math.max(0, this.settlementTime - dt);
      return;
    }
    if (this.settlement) {
      this.settlement = null;
      if (this.campaign?.state.complete) {
        this.phase = 'completing';
        this.elapsed = 0;
      } else {
        this.nextBlock();
        this.phase = 'transitioning';
      }
      this.emit();
      return;
    }
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
    if (!this.thermal && this.activeTool) {
      const f = this.fittings,
        mechanics = f.mechanics;
      const charging = this.toolId === 'sledge' && mechanics.has('charge');
      const continuous =
        !charging &&
        (this.toolId !== 'hand' ||
          this.hasNode('HC-S1') ||
          this.settings.toggle);
      if (this.firing && hit) {
        if (
          !this.localPoint ||
          Math.hypot(
            hit.x - this.localPoint.x,
            hit.y - this.localPoint.y,
            hit.z - this.localPoint.z,
          ) >
            this.activeTool.radius * 0.65
        ) {
          this.localPoint = { ...hit };
          this.localHits = 0;
          this.localTime = 0;
        }
        this.localTime += dt;
        if (charging && !this.strike.active)
          this.chargeTime = Math.min(0.65, this.chargeTime + dt);
      } else this.localTime = 0;
      const tempo =
        (mechanics.has('rhythm') && this.localTime >= 1.2 ? 1.15 : 1) *
        (this.toolId === 'breaker'
          ? 0.72 +
            0.28 *
              Math.min(1, this.localTime / (mechanics.has('rapid') ? 0.6 : 1))
          : 1);
      const impact = this.strike.update(
        dt,
        continuous && this.firing,
        hit,
        (this.activeTool.cadence * f.cycle) /
          ((1 + this.upgrades.tank * TOOL_FITTINGS[this.toolId].speed) * tempo),
        this.toolId === 'hand' || this.toolId === 'grip',
      );
      this.shotPending = this.strike.queued;
      this.strikeClock = this.strike.active
        ? this.strike.duration - this.strike.age
        : 0;
      if (impact) {
        const t = this.activeTool;
        const fittings = TOOL_FITTINGS[this.toolId];
        const effect = this.upgrades.heat * fittings.force;
        const shape = this.field.profile?.shape;
        const match =
          (t.id === 'sledge' && shape === 'wings') ||
          (t.id === 'heavy' && shape === 'seam') ||
          (t.id === 'breaker' && shape === 'archive');
        const tutorialRadius = this.inTutorial
          ? this.tutorial!.block === 1
            ? 0.42
            : 0.42
          : 1;
        this.localHits++;
        const normal = this.field.surfaceNormal(impact),
          side = Math.abs(normal.y) < 0.5;
        const visible =
          f.visible > 1 &&
          this.loot.some(
            (reward) =>
              reward.state === 'embedded' &&
              Math.hypot(
                reward.x - impact.x,
                reward.y - impact.y,
                reward.z - impact.z,
              ) <
                t.radius + reward.w &&
              this.field.exposure(reward).exposed > 0.18,
          );
        const bit = this.toolId === 'breaker' ? this.breakerBit : 'standard';
        const force =
          t.force *
          (this.inTutorial ? 0.5 : 1) *
          (1 + effect) *
          (match ? 1.5 : 1) *
          f.power *
          (visible ? f.visible : 1) *
          (mechanics.has('momentum') && this.localHits % 3 === 0 ? 1.4 : 1) *
          (mechanics.has('hammer') && this.localTime >= 1 ? 1.3 : 1) *
          this.chargedPower *
          (this.toolId === 'heavy' && side && !mechanics.has('guided')
            ? 0.8
            : 1) *
          (bit === 'wide' ? 0.82 : 1);
        const radius =
          t.radius *
          tutorialRadius *
          (1 + this.upgrades.wide * fittings.radius) *
          Math.sqrt(
            f.area * (bit === 'precision' ? 0.75 : bit === 'wide' ? 1.35 : 1),
          );
        const options = {
          center: f.center * (bit === 'precision' ? 1.35 : 1),
          depth:
            f.depth *
            (side && mechanics.has('reach') ? 1.2 : 1) *
            (bit === 'precision' ? 1.35 : bit === 'wide' ? 0.82 : 1),
          weak: f.weak,
          support: f.support,
          detach: f.detach,
        };
        this.field.strikeAt(impact, force, radius, options, normal);
        if (mechanics.has('split') && this.localHits % 4 === 0)
          this.field.strikeAt(
            { ...impact, x: impact.x + radius * 0.4 },
            force * 0.5,
            radius * 0.55,
            options,
            normal,
          );
        if (mechanics.has('resonance') && this.localHits % 12 === 0)
          this.field.strikeAt(
            impact,
            force * 0.65,
            radius * 1.65,
            { ...options, detach: 1.7 },
            normal,
          );
        if (mechanics.has('spall')) {
          const weak = this.field.points.find(
            (p, i) =>
              this.field.values[i] > 0.5 &&
              this.field.values[i] < 0.8 &&
              Math.hypot(p.x - impact.x, p.y - impact.y, p.z - impact.z) <
                radius * 1.5,
          );
          if (weak)
            this.field.strikeAt(
              weak,
              force * 0.3,
              radius * 0.5,
              options,
              normal,
            );
        }
        if (mechanics.has('cleanRelease'))
          for (const reward of this.loot) {
            if (
              reward.state !== 'embedded' ||
              reward.kind !== 'coin' ||
              this.field.exposure(reward).exposed < 0.75 ||
              Math.hypot(
                reward.x - impact.x,
                reward.y - impact.y,
                reward.z - impact.z,
              ) >
                radius + reward.w
            )
              continue;
            this.field.strikeAt(
              reward,
              force * 0.15,
              Math.max(reward.w, reward.d) * 0.65,
              { ...options, weak: 1.5, detach: 1.3 },
            );
          }
        if (mechanics.has('breakLoose') && this.chargedPower >= 1.8)
          this.field.strikeAt(
            impact,
            force * 0.18,
            radius * 1.7,
            { ...options, detach: 1.8 },
            normal,
          );
        this.chargedPower = 1;
        if (this.upgrades.residual > 0)
          this.field.melt(
            impact,
            0.2,
            t.force * this.upgrades.residual * fittings.fracture,
            t.radius * 1.5,
            0,
          );
        this.onBurst(
          impact,
          t.id === 'sledge' ? 6 : t.id === 'hand' ? 2 : 4,
          true,
        );
        this.onBurst(impact, 2, false);
        this.onSound(
          t.id === 'sledge'
            ? 'tray'
            : t.id === 'hand'
              ? 'chisel'
              : t.id === 'pick'
                ? 'pick'
                : 'chip',
          t.id === 'sledge' ? 0.9 : 0.5,
        );
        this.strikePulse = 0.22;
        this.strikeSerial++;
        if (this.inTutorial && this.tutorial) {
          this.tutorial.strikes++;
          const key = `block${this.tutorial.block}Strikes`;
          this.tutorial.metrics[key] = (this.tutorial.metrics[key] ?? 0) + 1;
          this.tutorial.metrics.firstStrike ??= this.tutorial.elapsed;
          if (this.tutorial.step === 2) this.tutorialStep(3);
        } else this.campaign?.trigger('FIRST_ICE_HIT');
      }
      if (!continuous && !charging) this.firing = false;
    } else if (this.firing) {
      const used = Math.min(dt, this.fuel);
      if (hit) {
        this.focusTime += used;
        this.pulseTime += used;
        this.echoAnchor ??= { ...hit };
        if (
          this.hasNode('TH-T3') &&
          Math.hypot(
            hit.x - this.echoAnchor.x,
            hit.y - this.echoAnchor.y,
            hit.z - this.echoAnchor.z,
          ) >
            this.radius * 0.4
        ) {
          if (this.echoes.length < 4)
            this.echoes.push({
              point: { ...this.echoAnchor },
              time: 0.4,
              power: this.power * 0.28,
              radius: this.radius * 1.2,
            });
          this.echoAnchor = { ...hit };
        }
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
      this.fuel = Math.max(0, this.fuel - used * this.fittings.burn);
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
      if (this.lastContact && this.hasNode('TH-T3'))
        this.echoes.push({
          point: { ...this.lastContact },
          time: 0.4,
          power: this.power * 0.28,
          radius: this.radius * 1.2,
        });
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
      this.echoAnchor = null;
      if (this.residual)
        this.field.melt(null, dt, 0, this.radius, this.residual);
      if (this.upgrades.tank >= 8 || this.hasNode('TH-S3'))
        this.fuel = Math.min(this.capacity, this.fuel + dt * 2);
    }
    this.connect += dt;
    for (const echo of this.echoes) {
      echo.time -= dt;
      if (echo.time <= 0) {
        this.field.melt(echo.point, 1, echo.power, echo.radius, 0);
        this.onBurst(echo.point, 3);
      }
    }
    this.echoes = this.echoes.filter((e) => e.time > 0);
    if (
      this.connect >= TUNE.connectivityInterval ||
      this.releaseField !== this.field ||
      this.releaseRevision !== this.field.revision
    ) {
      this.connect = 0;
      const pieces = this.field.detach();
      if (pieces.length) {
        this.onSound('crack', Math.min(1, 0.35 + pieces.length * 0.07));
        for (const p of pieces) this.onBurst(p, 1, true);
      }
      for (const t of this.loot)
        if (
          t.state === 'embedded' &&
          this.field.canRelease(t, this.contactSamples?.(t))
        ) {
          t.state = 'freed';
          t.age = 0;
          this.credit(t);
          this.onSound('crack', 0.45);
          this.onBurst(t, this.inTutorial ? 9 : 3, true);
          this.onSave();
        }
      this.releaseField = this.field;
      this.releaseRevision = this.field.revision;
      if (this.campaign?.state.block === 31) {
        const ledger = this.loot.find(
          (t) => t.story === 'ledger' && t.state === 'embedded',
        );
        if (ledger && this.field.exposure(ledger).exposed >= 0.58)
          this.campaign.trigger('FINAL_LEDGER_EXPOSED');
      }
    }
    for (const t of this.loot) {
      if (t.state === 'freed') {
        t.age += dt;
        t.vy -= TUNE.gravity * dt;
        const nextY = t.y + t.vy * dt,
          landing = this.field.landingHeight(t, nextY);
        t.y = nextY;
        if (t.y <= landing) {
          const impact = Math.min(1, Math.abs(t.vy) / 5);
          t.y = landing;
          t.state = 'landed';
          t.age = 0;
          if (!t.story) this.onSound(t.kind, 0.45 + impact * 0.5);
          this.onImpact(t);
          if (t.story) {
            this.onSound('tray', t.story === 'ledger' ? 1 : 0.5);
            if (t.story === 'ledger') this.stop();
          } else if (this.inTutorial && this.tutorial) {
            if (!this.tutorial.firstImpact) {
              this.tutorial.firstImpact = true;
              this.tutorial.metrics.firstReward = this.tutorial.elapsed;
              this.tutorial.metrics.firstRewardStrikes = this.tutorial.strikes;
              this.tutorialStep(4);
            }
          } else this.campaign?.trigger('FIRST_REWARD');
          this.onBurst(
            { x: t.x, y: t.y - t.h / 2 + 0.04, z: t.z },
            t.kind === 'gold' ? 8 : 3,
          );
          if (t.kind === 'gold') this.onSound('tray', 0.3);
        }
      } else if (t.state === 'landed') {
        t.age += dt;
        if (
          t.age > (t.story === 'ledger' ? 3 : t.story ? 1 : TUNE.landingPause)
        ) {
          t.state = 'collecting';
          t.age = 0;
          if (t.story)
            this.notify(
              t.story === 'ledger'
                ? 'The Freeze Ledger is safe.'
                : 'Evidence retained at the workbench.',
            );
          else {
            this.onSound('collect', t.kind === 'coin' ? 0.45 : 0.65);
            if (t.kind === 'gold')
              this.notify(`${t.name ?? 'Gold'} recovered · +$${t.value}`);
          }
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
    if (
      this.loot.length > 0 &&
      this.loot
        .filter((t) => t.story !== 'ring')
        .every((t) => t.state === 'collected')
    ) {
      this.stop();
      this.field.warmth.fill(0);
      this.elapsed = 0;
      if (this.inTutorial && this.tutorial && this.campaign) {
        const t = this.tutorial;
        if (t.block === 1 && t.step < 5) return;
        for (let i = 0; i < this.field.values.length; i += 18)
          if (this.field.values[i] > 0.5)
            this.onBurst(this.field.points[i], 1, true);
        this.field.values.fill(0);
        this.field.dirty = true;
        if (t.block === 1) {
          const c = this.campaign;
          this.settlement = {
            gross: c.state.blockGross,
            fee: c.state.blockFee,
            net: c.state.blockGross - c.state.blockFee,
            rate: 12,
            name: 'Your first recovery',
          };
          this.tutorialStep(6);
        } else {
          t.stage = 'board';
          this.tutorialStep(13);
        }
        return;
      } else if (this.campaign) {
        const c = this.campaign;
        if (!c.state.legacyBlock && c.state.phase < c.block.phases - 1) {
          this.echoes = [];
          this.echoAnchor = null;
          this.lastContact = null;
          c.state.phase++;
          if (c.state.block === 31) c.trigger('FINAL_LAYER_OPENED');
          this.loot = campaignLoot(
            c.state.block,
            c.state.phase,
            c.state.layoutVersion ?? 1,
          );
          this.field = campaignField(
            c.state.block,
            c.state.phase,
            undefined,
            c.state.layoutVersion ?? 1,
          );
          this.field.carveLoot(this.loot);
          this.phase = 'transitioning';
          this.notify(
            c.state.block !== 31
              ? `Compartment ${c.state.phase + 1} of ${c.block.phases} · ${c.block.layers?.[c.state.phase] ?? c.block.profile}`
              : c.block.phases === 2
                ? 'Outer custody cleared. The inner compartment is exposed.'
                : [
                    'Outer supports cleared. Service channels exposed.',
                    'Archive shell exposed. The ledger is inside.',
                  ][c.state.phase - 1],
          );
        } else {
          c.finish();
          this.settlement = {
            gross: c.state.blockGross,
            fee: c.state.blockFee,
            net: c.state.blockGross - c.state.blockFee,
            rate: c.rate,
            name: this.family,
          };
          c.state.settled = true;
          this.settlementTime = 2;
        }
      } else if (this.round === TUNE.finalRound - 1 && !this.continuing)
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
    this.echoes = [];
    this.echoAnchor = null;
    if (this.campaign) {
      if (this.campaign.state.legacyBlock) {
        this.campaign.state.legacyBlock = false;
        this.campaign.state.block = 0;
        this.campaign.state.blockGross = 0;
        this.campaign.state.blockFee = 0;
      } else this.campaign.next();
      this.round = this.campaign.state.block;
    } else this.round++;
    if (this.toolUpgrades.thermal.tank >= 4)
      this.fuel = Math.min(
        this.capacity,
        this.fuel +
          this.capacity * (this.toolUpgrades.thermal.tank >= 12 ? 0.5 : 0.2),
      );
    this.lastContact = null;
    this.loot = this.campaign ? campaignLoot(this.round) : layout(this.round);
    this.field = this.campaign
      ? campaignField(this.round)
      : new IceField(this.round);
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
    if (this.campaign) {
      if (!this.campaign.startContracts()) return;
      this.campaign.state.block--;
    }
    this.continuing = true;
    this.nextBlock();
  }
  restart() {
    this.dialing = false;
    this.tutorial = undefined;
    this.stop();
    this.strikeClock = this.strikePulse = 0;
    this.round = 0;
    this.money = 0;
    this.earned = 0;
    this.recovered = 0;
    this.playTime = 0;
    this.continuing = false;
    this.toolUpgrades = freshToolUpgrades();
    this.nodes = freshNodes();
    this.revealedTools = ['hand'];
    this.toolNotice = null;
    this.toolNotices = [];
    this.breakerBit = 'standard';
    this.echoes = [];
    this.echoAnchor = null;
    this.mode = 'precision';
    this.fuel = TUNE.fuelSeconds;
    this.phase = 'playing';
    this.resumePhase = 'playing';
    if (this.campaign) {
      this.campaign = new Campaign();
      this.campaign.trigger('GAME_START');
    }
    this.settlement = null;
    this.settlementTime = 0;
    this.loot = this.campaign ? campaignLoot(0) : layout(0);
    this.field = this.campaign ? campaignField(0) : new IceField(0);
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
      phone: {
        ringing: !!this.phoneRinging,
        offHook: this.phoneOffHook,
        dialing: this.dialing,
      },
      liveCall: this.liveCall,
      tutorial: this.tutorial
        ? {
            ...structuredClone(this.tutorial),
            message: tutorialMessage(this.tutorial),
            task: tutorialTask(this.tutorial),
            exposure: (this.inTutorial ? this.loot : []).map((t) => ({
              id: t.id,
              ...this.field.exposure(t),
            })),
          }
        : null,
      phase: this.phase,
      canPurchase:
        this.phase === 'playing' ||
        (this.phase === 'paused' && this.resumePhase === 'playing'),
      round: this.round,
      money: this.money,
      visibleMoney:
        this.money -
        this.loot.reduce(
          (sum, t) =>
            sum +
            (t.state === 'freed' ? (this.creditedInFlight.get(t) ?? 0) : 0),
          0,
        ),
      earned: this.earned,
      recovered: this.recovered,
      playTime: this.playTime,
      upgrades: { ...this.upgrades },
      toolUpgrades: copyToolUpgrades(this.toolUpgrades),
      nodes: structuredClone(this.nodes),
      toolNotice: this.toolNotice,
      revealedTools: [...this.revealedTools],
      breakerBit: this.breakerBit,
      hasFan: this.hasFan,
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
      campaign: this.campaign
        ? {
            ...structuredClone(this.campaign.state),
            chapter: this.chapter,
            chapterName: this.campaign.chapter.name,
            unread: this.unread,
            toolName: this.activeTool?.name,
            hint:
              this.campaign.block.phases > 1
                ? `Compartment ${this.campaign.state.phase + 1} / ${this.campaign.block.phases} · ${this.field.profile?.shape === 'wings' ? 'Sever the shared supports.' : this.field.profile?.shape === 'archive' ? 'Open each archive shelf.' : this.field.profile?.shape === 'seam' ? 'Follow the service seam.' : this.campaign.block.hint}`
                : this.campaign.block.hint,
          }
        : null,
      thermal: this.thermal,
      settlement: this.settlement,
    };
  }
  serialize() {
    return JSON.stringify({
      version: TUNE.saveVersion,
      progression: 2,
      campaign: this.campaign?.state,
      tutorial: this.tutorial,
      round: this.round,
      money: this.money,
      earned: this.earned,
      recovered: this.recovered,
      playTime: this.playTime,
      upgrades: this.upgrades,
      toolUpgrades: this.toolUpgrades,
      treeRevision: 1,
      nodes: this.nodes,
      revealedTools: this.revealedTools,
      toolNotices: this.toolNotices,
      toolNotice: this.toolNotice,
      breakerBit: this.breakerBit,
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
        ![3, TUNE.saveVersion].includes(s.version) ||
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
      const perTool = freshToolUpgrades(s.upgrades);
      if (s.toolUpgrades !== undefined) {
        for (const tool of TOOLS) {
          for (const key of Object.keys(UPGRADES) as Upgrade[]) {
            const level = s.toolUpgrades?.[tool.id]?.[key];
            if (!integer(level, 0, UPGRADES[key].costs.length))
              throw new Error('Invalid tool upgrades');
            perTool[tool.id][key] = level;
          }
        }
      }
      if (
        !Array.isArray(s.ice) ||
        s.ice.length !== TUNE.nx * TUNE.ny * TUNE.nz ||
        !s.ice.every((v: number) => Number.isFinite(v) && v >= 0 && v <= 1)
      )
        throw new Error('Invalid thaw');
      const restoredCampaign = this.campaign ? new Campaign() : undefined;
      if (restoredCampaign && s.campaign) restoredCampaign.restore(s.campaign);
      else if (restoredCampaign) {
        restoredCampaign.state.legacyBlock = true;
        restoredCampaign.state.tools = TOOLS.map((t) => t.id);
        restoredCampaign.state.selected = 'thermal';
        restoredCampaign.state.grossEarned = s.earned;
        restoredCampaign.state.netEarned = s.earned;
      }
      if (
        restoredCampaign &&
        !restoredCampaign.state.legacyBlock &&
        (s.round !== restoredCampaign.state.block ||
          s.earned !== restoredCampaign.state.grossEarned ||
          s.money > restoredCampaign.state.netEarned)
      )
        throw new Error('Inconsistent campaign progress');
      const tutorial = validateTutorial(s.tutorial);
      const nodes = freshNodes();
      if (s.treeRevision !== undefined) {
        if (s.treeRevision !== 1) throw Error('Unknown tree revision');
        for (const tool of TOOL_ORDER) {
          const list = s.nodes?.[tool];
          if (
            !Array.isArray(list) ||
            new Set(list).size !== list.length ||
            list.some(
              (id: unknown) =>
                typeof id !== 'string' ||
                !TOOL_TREES[tool].some((n) => n.id === id),
            )
          )
            throw Error('Invalid tool nodes');
          if (
            TOOL_TREES[tool].some(
              (n) =>
                list.includes(n.id) &&
                !n.parentIds.every((id) => list.includes(id)),
            )
          )
            throw Error('Missing node prerequisite');
          nodes[tool] = [...list];
        }
      } else {
        // Old numerical benefits remain grandfathered. Fold their branch
        // progress into the new authored map without charging again.
        for (const tool of TOOL_ORDER)
          for (const [old, branch] of Object.entries({
            heat: 'power',
            tank: 'speed',
            wide: 'control',
            residual: 'technique',
          })) {
            const level = Math.max(
              perTool[tool][old as Upgrade],
              tool === 'hand' ? perTool.grip[old as Upgrade] : 0,
            );
            const branchNodes = TOOL_TREES[tool].filter(
              (n) => n.branch === branch,
            );
            const count = level
              ? Math.min(branchNodes.length, Math.ceil(level / 4))
              : 0;
            nodes[tool].push(...branchNodes.slice(0, count).map((n) => n.id));
          }
        if (
          (tutorial?.continuous ||
            restoredCampaign?.state.tools.includes('grip')) &&
          !nodes.hand.includes('HC-S1')
        )
          nodes.hand.push('HC-S1');
      }
      const loot = tutorialActive(tutorial)
        ? tutorialLoot(tutorial!.block, tutorial!.legacyParcel)
        : restoredCampaign && !restoredCampaign.state.legacyBlock
          ? campaignLoot(
              restoredCampaign.state.block,
              restoredCampaign.state.phase,
              restoredCampaign.state.layoutVersion ?? 1,
            )
          : layout(s.round);
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
        s.fuel >
          CAPACITY[perTool.thermal.tank] * toolEffects(nodes.thermal).fuel
      )
        throw new Error('Invalid fuel');
      this.round = s.round;
      this.campaign = restoredCampaign;
      this.tutorial = tutorial;
      this.money = s.money;
      this.earned = s.earned;
      this.recovered = s.recovered;
      this.playTime = s.playTime;
      this.toolUpgrades = perTool;
      this.nodes = nodes;
      this.echoes = [];
      this.echoAnchor = null;
      this.lastContact = null;
      this.revealedTools = TOOL_ORDER.filter(
        (id) =>
          id === 'hand' ||
          restoredCampaign?.state.tools.includes(id) ||
          (Array.isArray(s.revealedTools) && s.revealedTools.includes(id)) ||
          (!s.treeRevision &&
            restoredCampaign &&
            restoredCampaign.state.block >=
              TOOLS.find((t) => t.id === id)!.block),
      );
      this.toolNotices = Array.isArray(s.toolNotices)
        ? s.toolNotices.filter(
            (id: unknown) =>
              typeof id === 'string' &&
              /^(available|ready|acquired):(pick|heavy|sledge|breaker|thermal)$/.test(
                id,
              ),
          )
        : this.revealedTools.flatMap((id) => [
            `available:${id}`,
            `ready:${id}`,
          ]);
      this.toolNotice =
        s.toolNotice &&
        this.revealedTools.includes(s.toolNotice.tool) &&
        ['available', 'ready', 'acquired'].includes(s.toolNotice.kind)
          ? s.toolNotice
          : null;
      this.breakerBit =
        s.breakerBit === 'precision' && nodes.breaker.includes('PB-C1')
          ? 'precision'
          : s.breakerBit === 'wide' && nodes.breaker.includes('PB-C2')
            ? 'wide'
            : 'standard';
      this.mode =
        s.mode === 'wide' &&
        (perTool.thermal.wide || nodes.thermal.includes('TH-C1'))
          ? 'wide'
          : 'precision';
      this.fuel = s.fuel;
      this.continuing = !!s.continuing;
      this.loot = loot;
      this.loot.forEach((t, i) => {
        if (s.loot[i].credited) {
          t.credited = true;
          // Resume the first physical impact without crediting it twice.
          // Otherwise reloading between release and landing loses Tony's confirmation.
          t.state =
            this.inTutorial && !this.tutorial!.firstImpact
              ? 'freed'
              : 'collected';
        }
      });
      this.field = this.inTutorial
        ? tutorialField(
            this.tutorial!.block,
            s.ice,
            this.tutorial!.legacyParcel,
          )
        : this.campaign && !this.campaign.state.legacyBlock
          ? campaignField(
              this.campaign.state.block,
              this.campaign.state.phase,
              s.ice,
              this.campaign.state.layoutVersion ?? 1,
            )
          : new IceField(this.round, s.ice);
      this.stop();
      this.dialing = false;
      this.strikeClock = this.strikePulse = 0;
      this.phase =
        s.completed &&
        (this.campaign ? this.campaign.state.complete : this.round === 19) &&
        !this.continuing
          ? 'completed'
          : 'playing';
      this.settlement = null;
      this.settlementTime = 0;
      if (
        (this.inTutorial && this.tutorial?.step === 6) ||
        (this.campaign?.state.settled && !this.campaign.state.complete)
      ) {
        this.settlement = {
          gross: this.campaign!.state.blockGross,
          fee: this.campaign!.state.blockFee,
          net: this.campaign!.state.blockGross - this.campaign!.state.blockFee,
          rate: this.campaign!.rate,
          name: this.family,
        };
        this.settlementTime = 0.5;
      }
      if (s.settings) {
        for (const k of [
          'master',
          'effects',
          'rotationSensitivity',
          'textSpeed',
          'gameplayZoom',
        ] as const)
          if (Number.isFinite(s.settings[k]))
            this.settings[k] = Math.max(0, Math.min(1, s.settings[k]));
        for (const k of [
          'muted',
          'toggle',
          'reducedParticles',
          'largeUI',
          'reducedMotion',
          'dialogueSounds',
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
