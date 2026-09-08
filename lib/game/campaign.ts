import {
  BLOCKS,
  CHAPTERS,
  STORY,
  TOOLS,
  blockSpec,
  type ToolId,
  type Trigger,
  type StoryObjectId,
} from './campaign-content';
export const MILESTONES = [
  'FIRST_RELEASE',
  'FIRST_UPGRADE',
  'HOLD_UNLOCKED',
  'ICE_PICK_UNLOCKED',
  'SLEDGE_UNLOCKED',
  'THERMAL_UNLOCKED',
  'FIRST_RARE_FIND',
  'TONY_TAG_DISCOVERED',
  'COVER_UP_DISCOVERED',
  'FINAL_VAULT_OPENED',
  'FREEZE_LEDGER_RECOVERED',
  'CAMPAIGN_COMPLETE',
] as const;
export type Milestone = (typeof MILESTONES)[number];
export type CampaignSave = {
  revision: 1;
  layoutVersion?: 1 | 2;
  call?: { event: string; line: number; status: 'ringing' | 'active' };
  block: number;
  phase: number;
  commission: number;
  blockRate: number;
  grossEarned: number;
  netEarned: number;
  commissionPaid: number;
  blockGross: number;
  blockFee: number;
  tools: ToolId[];
  selected: ToolId;
  objects: StoryObjectId[];
  rewards: string[];
  flags: string[];
  pending: string[];
  history: string[];
  read: string[];
  achievements: Milestone[];
  complete: boolean;
  contracts: boolean;
  legacyBlock: boolean;
  settled: boolean;
};
export class Campaign {
  state: CampaignSave = {
    revision: 1,
    layoutVersion: 2,
    block: 0,
    phase: 0,
    commission: 12,
    blockRate: 12,
    grossEarned: 0,
    netEarned: 0,
    commissionPaid: 0,
    blockGross: 0,
    blockFee: 0,
    tools: ['hand'],
    selected: 'hand',
    objects: [],
    rewards: [],
    flags: [],
    pending: [],
    history: [],
    read: [],
    achievements: [],
    complete: false,
    contracts: false,
    legacyBlock: false,
    settled: false,
  };
  quiet = 0;
  lastDelivered?: string;
  onMilestone: (id: Milestone) => void = () => {};
  get block() {
    return blockSpec(this.state.block, this.state.layoutVersion ?? 1);
  }
  get chapter() {
    return CHAPTERS[this.block.chapter - 1];
  }
  get rate() {
    return this.state.legacyBlock || this.state.block === 31
      ? 0
      : this.state.blockRate;
  }
  get tool() {
    return TOOLS.find((t) => t.id === this.state.selected)!;
  }
  get unread() {
    return this.state.history.filter((id) => !this.state.read.includes(id))
      .length;
  }
  milestone(id: Milestone) {
    if (!this.state.achievements.includes(id)) {
      this.state.achievements.push(id);
      this.onMilestone(id);
    }
  }
  trigger(
    trigger: Trigger,
    context: { object?: StoryObjectId; tool?: ToolId } = {},
  ) {
    for (const event of STORY) {
      if (event.retired) continue;
      if (
        event.trigger !== trigger ||
        this.state.flags.includes(event.id) ||
        this.state.read.includes(event.id)
      )
        continue;
      if (event.at !== undefined && event.at !== this.state.block) continue;
      if (event.tool && event.tool !== context.tool) continue;
      if (
        event.object &&
        (trigger === 'STORY_REWARD_RECOVERED'
          ? event.object !== context.object
          : !this.state.objects.includes(event.object))
      )
        continue;
      if (
        trigger === 'FINAL_LEDGER_RECOVERED' &&
        (this.state.block !== 31 || !this.state.objects.includes('ledger'))
      )
        continue;
      if (trigger === 'CAMPAIGN_COMPLETE' && !this.state.complete) continue;
      this.state.flags.push(event.id);
      this.state.pending.push(event.id);
      if (event.effect === 'commission8') {
        this.state.commission = 8;
        this.milestone('COVER_UP_DISCOVERED');
      }
    }
  }
  advanceQuiet(dt: number, busy: boolean) {
    if (this.state.call) return false;
    this.quiet = busy ? 0 : this.quiet + dt;
    if (this.quiet < 0.8 || !this.state.pending.length) return false;
    this.deliver();
    this.quiet = 0;
    return true;
  }
  deliver() {
    if (this.state.call) return;
    this.state.pending = [...new Set(this.state.pending)].filter(
      (id) =>
        !this.state.read.includes(id) &&
        STORY.some((e) => e.id === id && !e.retired),
    );
    // Mandatory evidence always precedes incidental barks. All remain in history.
    this.state.pending.sort(
      (a, b) =>
        STORY.find((e) => e.id === b)!.priority -
        STORY.find((e) => e.id === a)!.priority,
    );
    const id = this.state.pending.shift();
    this.lastDelivered = id;
    if (id && !this.state.history.includes(id)) {
      this.state.history.push(id);
      // Delivery priority controls the notification, not the order of the story.
      this.state.history.sort(
        (a, b) => this.state.flags.indexOf(a) - this.state.flags.indexOf(b),
      );
    }
    if (id && !STORY.find((e) => e.id === id)?.retired)
      this.state.call = { event: id, line: 0, status: 'ringing' };
  }
  openPhone() {
    this.trigger('PHONE_OPENED');
    // Legacy archive API consumes the queue explicitly. Live pickup uses deliver.
    while (this.state.pending.length) {
      this.state.call = undefined;
      this.deliver();
    }
    this.state.read = [...this.state.history];
    this.state.call = undefined;
  }
  collect(id: StoryObjectId) {
    if (this.state.objects.includes(id)) return;
    this.state.objects.push(id);
    this.trigger('STORY_REWARD_RECOVERED', { object: id });
    if (id === 'tag') this.milestone('TONY_TAG_DISCOVERED');
    if (id === 'ledger') {
      this.trigger('FINAL_LEDGER_RECOVERED');
      this.milestone('FREEZE_LEDGER_RECOVERED');
    }
  }
  credit(value: number, identity: string) {
    if (this.state.rewards.includes(identity)) return 0;
    this.state.rewards.push(identity);
    const priorFee = this.state.blockFee;
    this.state.blockGross += value;
    this.state.blockFee = Math.floor((this.state.blockGross * this.rate) / 100);
    const fee = this.state.blockFee - priorFee;
    this.state.grossEarned += value;
    this.state.netEarned += value - fee;
    this.state.commissionPaid += fee;
    this.milestone('FIRST_RELEASE');
    if (value >= 500) this.milestone('FIRST_RARE_FIND');
    return value - fee;
  }
  unlock(id: ToolId) {
    if (this.state.tools.includes(id)) return false;
    this.state.tools.push(id);
    this.state.selected = id;
    this.trigger('TOOL_UNLOCK', { tool: id });
    const ids: Partial<Record<ToolId, Milestone>> = {
      grip: 'HOLD_UNLOCKED',
      pick: 'ICE_PICK_UNLOCKED',
      sledge: 'SLEDGE_UNLOCKED',
      thermal: 'THERMAL_UNLOCKED',
    };
    if (ids[id]) this.milestone(ids[id]!);
    return true;
  }
  finish() {
    this.trigger('BLOCK_COMPLETE');
    if (this.state.block === 31 && this.state.objects.includes('ledger')) {
      this.state.complete = true;
      this.trigger('CAMPAIGN_COMPLETE');
      this.milestone('CAMPAIGN_COMPLETE');
    }
  }
  next() {
    this.state.block++;
    this.state.layoutVersion = 2;
    this.state.blockRate = this.state.commission;
    this.state.phase = 0;
    this.state.blockGross = 0;
    this.state.blockFee = 0;
    this.state.settled = false;
    this.trigger('BLOCK_START');
    if (this.state.block === 31) this.milestone('FINAL_VAULT_OPENED');
  }
  startContracts() {
    if (!this.state.complete || !this.state.read.includes('epilogue'))
      return false;
    this.state.contracts = true;
    this.state.commission = 8;
    this.next();
    this.trigger('POSTGAME_START');
    return true;
  }
  restore(raw: unknown) {
    const s = raw as CampaignSave;
    if (
      !s ||
      s.revision !== 1 ||
      !Number.isInteger(s.block) ||
      s.block < 0 ||
      s.block > 10000 ||
      !Number.isInteger(s.phase) ||
      s.phase < 0 ||
      s.phase > 2
    )
      throw Error('Invalid campaign');
    for (const k of [
      'grossEarned',
      'netEarned',
      'commissionPaid',
      'blockGross',
      'blockFee',
    ] as const)
      if (!Number.isInteger(s[k]) || s[k] < 0 || s[k] > 1e10)
        throw Error('Invalid settlement');
    if (![8, 12].includes(s.commission) || ![8, 12].includes(s.blockRate))
      throw Error('Invalid commission');
    for (const key of [
      'complete',
      'contracts',
      'legacyBlock',
      'settled',
    ] as const)
      if (typeof s[key] !== 'boolean') throw Error('Invalid campaign phase');
    if (
      s.layoutVersion !== undefined &&
      s.layoutVersion !== 1 &&
      s.layoutVersion !== 2
    )
      throw Error('Invalid layout version');
    if (s.phase >= blockSpec(s.block, s.layoutVersion ?? 1).phases)
      throw Error('Invalid vault phase');
    if (
      s.blockFee > s.blockGross ||
      s.commissionPaid + s.netEarned !== s.grossEarned
    )
      throw Error('Unbalanced settlement');
    const valid = (list: unknown, ids: string[]) =>
      Array.isArray(list) &&
      list.every((x) => typeof x === 'string' && ids.includes(x)) &&
      new Set(list).size === list.length;
    if (
      !valid(
        s.tools,
        TOOLS.map((t) => t.id),
      ) ||
      !s.tools.includes(s.selected) ||
      !valid(s.objects, ['tag', 'ring', 'hold', 'log', 'access', 'ledger'])
    )
      throw Error('Invalid collection');
    for (const k of ['flags', 'pending', 'history', 'read'] as const)
      if (
        !valid(
          s[k],
          STORY.map((e) => e.id),
        )
      )
        throw Error('Invalid story');
    if (
      !valid(s.achievements, [...MILESTONES]) ||
      !Array.isArray(s.rewards) ||
      s.rewards.some((x) => typeof x !== 'string' || x.length > 80)
    )
      throw Error('Invalid achievements');
    if (
      s.pending.some((id) => !s.flags.includes(id)) ||
      s.history.some((id) => !s.flags.includes(id)) ||
      s.read.some((id) => !s.history.includes(id))
    )
      throw Error('Inconsistent story');
    if (
      (s.complete && (!s.objects.includes('ledger') || s.block < 31)) ||
      (s.contracts && !s.complete)
    )
      throw Error('Premature ending');
    this.state = structuredClone(s);
    this.state.pending = this.state.pending.filter(
      (id) =>
        !STORY.find((e) => e.id === id)?.retired &&
        !this.state.read.includes(id) &&
        id !== this.state.call?.event,
    );
    if (this.state.call) {
      const call = this.state.call,
        event = STORY.find((e) => e.id === call.event);
      if (
        !event ||
        !s.history.includes(call.event) ||
        !Number.isInteger(call.line) ||
        call.line < 0 ||
        call.line >= event.messages.length ||
        !['ringing', 'active'].includes(call.status)
      )
        throw Error('Invalid call checkpoint');
      if (this.state.read.includes(call.event) || event.retired)
        this.state.call = undefined;
    }
  }
}
export const demoBoundary = (campaign: Campaign, edition: 'full' | 'demo') =>
  edition === 'demo' &&
  campaign.state.block === 4 &&
  campaign.state.objects.includes('tag');
export const campaignBlocks = BLOCKS.length;
