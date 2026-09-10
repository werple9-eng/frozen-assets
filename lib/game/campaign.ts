import {
  BLOCKS,
  CHAPTERS,
  STORY,
  TOOLS,
  blockSpec,
  type ToolId,
  type Trigger,
  type StoryObjectId,
  type StoryEvent,
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
  layoutVersion?: 1 | 2 | 3;
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
  evidenceInspected?: StoryObjectId[];
  rewards: string[];
  flags: string[];
  storyEffects?: string[];
  pending: string[];
  history: string[];
  read: string[];
  achievements: Milestone[];
  complete: boolean;
  contracts: boolean;
  legacyBlock: boolean;
  settled: boolean;
  settledId?: string;
};
export type CallCompletion = {
  completed: boolean;
  refund: number;
  commissionChanged?: 0 | 8 | 12;
};
const readEffectFlags = [
  ...new Set(
    STORY.flatMap((event) =>
      event.readEffect?.flag ? [event.readEffect.flag] : [],
    ),
  ),
];
export class Campaign {
  state: CampaignSave = {
    revision: 1,
    layoutVersion: 3,
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
    evidenceInspected: [],
    rewards: [],
    flags: [],
    storyEffects: [],
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
  private callCooldown = 0;
  lastDelivered?: string;
  onMilestone: (id: Milestone) => void = () => {};
  get block() {
    return blockSpec(this.state.block, this.state.layoutVersion ?? 1);
  }
  get chapter() {
    return CHAPTERS[this.block.chapter - 1];
  }
  get rate() {
    return this.state.legacyBlock ? 0 : this.state.blockRate;
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
    if (trigger === 'GAME_START' && this.state.complete) return;
    for (const event of STORY) {
      if (event.retired) continue;
      if (event.id === 'ch5.exposed' && this.state.objects.includes('ledger'))
        continue;
      if (
        event.trigger !== trigger ||
        this.state.flags.includes(event.id) ||
        this.state.read.includes(event.id)
      )
        continue;
      if (event.at !== undefined && event.at !== this.state.block) continue;
      if (event.atPhase !== undefined && event.atPhase !== this.state.phase)
        continue;
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
    }
  }
  advanceQuiet(dt: number, busy: boolean) {
    this.callCooldown = Math.max(0, this.callCooldown - dt);
    this.fileRoutineNotes();
    if (this.state.call) return false;
    this.quiet = busy ? 0 : this.quiet + dt;
    if (
      this.quiet < (this.state.complete ? 0.8 : 3) ||
      (this.callCooldown > 0 && !this.state.complete) ||
      !this.state.pending.length
    )
      return false;
    const delivered = this.deliver();
    if (delivered) this.quiet = 0;
    return !!delivered;
  }
  private fileRoutineNotes() {
    const routine = (e: StoryEvent) =>
      !e.effect &&
      !e.readEffect &&
      (e.id.startsWith('handling.') ||
        e.id.startsWith('equipment.') ||
        ['ch1.more', 'ch2.accounts', 'ch4.breaker', 'ch4.thermal'].includes(
          e.id,
        ));
    // Preserve every note and prerequisite without making the player answer
    // a second call just because a tool unlocked. Active conversations finish.
    for (const event of STORY) {
      if (!routine(event) || !this.canDeliver(event)) continue;
      if (this.state.call?.event === event.id) {
        if (this.state.call.status === 'active') continue;
        this.state.call = undefined;
      } else if (!this.state.pending.includes(event.id)) continue;
      if (!this.state.history.includes(event.id))
        this.state.history.push(event.id);
      if (!this.state.read.includes(event.id)) this.state.read.push(event.id);
      this.state.pending = this.state.pending.filter((id) => id !== event.id);
    }
  }
  private canDeliver(event: StoryEvent) {
    if (event.requiresRead?.some((id) => !this.state.read.includes(id)))
      return false;
    // Phase events remain queued if the player leaves before answering. They
    // cannot ring early, and an unread required call is not lost on phase change.
    if (
      event.atPhase !== undefined &&
      (event.at === undefined || event.at === this.state.block) &&
      this.state.phase < event.atPhase
    )
      return false;
    if (event.at !== undefined && this.state.block < event.at) return false;
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
    const ready = this.state.pending.findIndex((id) =>
      this.canDeliver(STORY.find((e) => e.id === id)!),
    );
    const id = ready >= 0 ? this.state.pending.splice(ready, 1)[0] : undefined;
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
    return id;
  }
  completeCall(id: string): CallCompletion {
    const empty: CallCompletion = { completed: false, refund: 0 };
    const call = this.state.call,
      event = STORY.find((e) => e.id === id);
    if (this.state.read.includes(id)) {
      if (call?.event === id) this.state.call = undefined;
      return empty;
    }
    if (
      !event ||
      event.retired ||
      call?.event !== id ||
      call.status !== 'active' ||
      call.line !== event.messages.length - 1
    )
      return empty;
    const authoredCommission =
      event.readEffect?.commission ??
      (event.effect === 'commission8' ? 8 : undefined);
    // Delayed earlier calls cannot restore a cut already waived by the ledger.
    const commission =
      authoredCommission === undefined
        ? undefined
        : (Math.min(this.state.commission, authoredCommission) as 0 | 8 | 12);
    // A zero-cut effect is reserved for the actual final ledger conversation.
    if (
      authoredCommission === 0 &&
      (event.trigger !== 'FINAL_LEDGER_RECOVERED' ||
        this.state.block !== 31 ||
        !this.state.objects.includes('ledger'))
    )
      return empty;
    this.state.read.push(id);
    this.state.pending = this.state.pending.filter((pending) => pending !== id);
    this.state.call = undefined;
    this.callCooldown = 45;
    let refund = 0;
    if (commission !== undefined) {
      this.state.commission = commission;
      if (authoredCommission === 8) this.milestone('COVER_UP_DISCOVERED');
      if (commission === 8 && !this.state.settled) {
        const revisedFee = Math.floor(
          (this.state.blockGross * commission) / 100,
        );
        refund = Math.max(0, this.state.blockFee - revisedFee);
        this.state.blockFee -= refund;
        this.state.blockRate = commission;
        this.state.commissionPaid -= refund;
        this.state.netEarned += refund;
      }
      if (authoredCommission === 0) {
        // Every phase of the Vault shares blockGross/blockFee. Waive its whole
        // fee once, preserving cumulative gross = net + commission identity.
        refund = this.state.blockFee;
        this.state.blockFee = 0;
        this.state.blockRate = 0;
        this.state.commissionPaid -= refund;
        this.state.netEarned += refund;
      }
      // An existing Delivery Complete keeps its stated rate. Otherwise Tony's
      // decision applies before that receipt is constructed, including prior finds.
    }
    if (
      event.readEffect?.flag &&
      !this.state.storyEffects?.includes(event.readEffect.flag)
    )
      (this.state.storyEffects ??= []).push(event.readEffect.flag);
    return {
      completed: true,
      refund,
      ...(commission !== undefined ? { commissionChanged: commission } : {}),
    };
  }
  openPhone() {
    this.trigger('PHONE_OPENED');
    // Legacy/headless API fast-forwards real call completions, including their
    // effects. Stop if every remaining event is gated; never spin forever.
    let refund = 0;
    for (let remaining = STORY.length + 1; remaining > 0; remaining--) {
      if (!this.state.call && !this.deliver()) break;
      const call = this.state.call;
      const event = STORY.find((e) => e.id === call?.event);
      if (!call || !event) break;
      if (event.retired) {
        this.state.call = undefined;
        continue;
      }
      call.status = 'active';
      call.line = event.messages.length - 1;
      const completion = this.completeCall(call.event);
      refund += completion.refund;
      if (!completion.completed) break;
    }
    return refund;
  }
  collect(id: StoryObjectId) {
    if (this.state.objects.includes(id)) return;
    this.state.objects.push(id);
    this.trigger('STORY_REWARD_RECOVERED', { object: id });
    if (id === 'tag') this.milestone('TONY_TAG_DISCOVERED');
    if (id === 'ledger') {
      this.retireLedgerAdvice();
      this.trigger('FINAL_LEDGER_RECOVERED');
      this.milestone('FREEZE_LEDGER_RECOVERED');
    }
  }
  private retireLedgerAdvice() {
    if (
      !this.state.objects.includes('ledger') ||
      this.state.read.includes('ch5.exposed')
    )
      return;
    // An unanswered call can outlive the last restraint. The recovery call
    // supersedes that advice; do not read it afterward or invent read history.
    this.state.pending = this.state.pending.filter(
      (id) => id !== 'ch5.exposed',
    );
    if (this.state.call?.event === 'ch5.exposed') this.state.call = undefined;
    this.state.history = this.state.history.filter(
      (id) => id !== 'ch5.exposed',
    );
  }
  inspectEvidence(id: StoryObjectId) {
    if (
      !this.state.objects.includes(id) ||
      this.state.evidenceInspected?.includes(id)
    )
      return false;
    (this.state.evidenceInspected ??= []).push(id);
    return true;
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
    if (this.state.block === 31) {
      if (
        !this.state.objects.includes('ledger') ||
        !this.state.read.includes('ch5.recovered') ||
        this.state.commission !== 0
      )
        return false;
      this.state.complete = true;
      this.trigger('CAMPAIGN_COMPLETE');
      this.milestone('CAMPAIGN_COMPLETE');
    }
    return true;
  }
  next() {
    this.state.block++;
    this.state.layoutVersion = 3;
    this.state.blockRate = this.state.commission;
    this.state.phase = 0;
    this.state.blockGross = 0;
    this.state.blockFee = 0;
    this.state.settled = false;
    this.state.settledId = undefined;
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
  ensureEpilogue() {
    if (
      !this.state.complete ||
      this.state.contracts ||
      this.state.read.includes('epilogue') ||
      this.state.call?.event === 'epilogue'
    )
      return false;
    // Restore only the playable coda, never campaign-complete effects or
    // previously paid rewards. The ending's fallback action uses this too.
    if (!this.state.flags.includes('epilogue'))
      this.state.flags.push('epilogue');
    if (this.state.pending.includes('epilogue')) return false;
    this.state.pending.push('epilogue');
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
      s.phase > 4
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
    if (![0, 8, 12].includes(s.commission) || ![0, 8, 12].includes(s.blockRate))
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
      s.layoutVersion !== 2 &&
      s.layoutVersion !== 3
    )
      throw Error('Invalid layout version');
    if (s.phase >= blockSpec(s.block, s.layoutVersion ?? 1).phases)
      throw Error('Invalid vault phase');
    if (
      s.settledId !== undefined &&
      (!s.settled ||
        s.settledId !== blockSpec(s.block, s.layoutVersion ?? 1).id)
    )
      throw Error('Invalid settlement identity');
    if (
      s.blockFee > s.blockGross ||
      s.blockFee > s.commissionPaid ||
      s.blockGross > s.grossEarned ||
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
    if (
      s.evidenceInspected !== undefined &&
      !valid(s.evidenceInspected, s.objects)
    )
      throw Error('Invalid evidence inspection history');
    for (const k of ['flags', 'pending', 'history', 'read'] as const)
      if (
        !valid(s[k], [
          ...STORY.map((e) => e.id),
          ...(k === 'flags' ? readEffectFlags : []),
        ])
      )
        throw Error('Invalid story');
    if (s.storyEffects !== undefined && !valid(s.storyEffects, readEffectFlags))
      throw Error('Invalid story effects');
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
    this.state.storyEffects = [
      ...new Set([
        ...(this.state.storyEffects ?? []),
        ...this.state.flags.filter((id) => readEffectFlags.includes(id)),
      ]),
    ];
    this.state.flags = this.state.flags.filter(
      (id) => !readEffectFlags.includes(id),
    );
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
        ((s.layoutVersion ?? 1) >= 3 && call.line >= event.messages.length) ||
        !['ringing', 'active'].includes(call.status)
      )
        throw Error('Invalid call checkpoint');
      if (this.state.read.includes(call.event) || event.retired)
        this.state.call = undefined;
      else call.line = Math.min(call.line, event.messages.length - 1);
    }
    if ((s.layoutVersion ?? 1) < 3) {
      // Historical completed saves already received a zero-fee final delivery.
      // Normalize that narrative state without replaying credits or clearing history.
      if (
        s.block === 31 &&
        (s.complete || s.read.includes('ch5.recovered')) &&
        s.blockFee === 0
      ) {
        this.state.commission = this.state.blockRate = 0;
        if (!this.state.storyEffects.includes('ledger.copied'))
          this.state.storyEffects.push('ledger.copied');
      }
      // Existing evidence may predate newly added prerequisite calls. Queue
      // only their missing events so an old pending cut cannot become stranded.
      if (!s.complete)
        for (const object of this.state.objects)
          this.trigger('STORY_REWARD_RECOVERED', { object });
      else {
        // A historical pending call may now require a newly authored sequence
        // that the completed import never had. Keep every chain that can still
        // resolve, but do not let impossible old queues hide the ending forever.
        const reachable = new Set(this.state.read);
        if (this.state.call) reachable.add(this.state.call.event);
        for (let pass = 0; pass < this.state.pending.length; pass++) {
          let added = false;
          for (const id of this.state.pending) {
            const event = STORY.find((event) => event.id === id)!;
            if (
              !reachable.has(id) &&
              (event.requiresRead ?? []).every((parent) =>
                reachable.has(parent),
              )
            ) {
              reachable.add(id);
              added = true;
            }
          }
          if (!added) break;
        }
        this.state.pending = this.state.pending.filter((id) =>
          reachable.has(id),
        );
      }
    }
    this.retireLedgerAdvice();
    this.ensureEpilogue();
  }
}
export const demoBoundary = (campaign: Campaign, edition: 'full' | 'demo') =>
  edition === 'demo' &&
  campaign.state.block === 4 &&
  campaign.state.objects.includes('tag');
export const campaignBlocks = BLOCKS.length;
