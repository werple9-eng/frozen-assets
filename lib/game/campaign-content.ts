import { AUTHORED_DIALOGUE } from './authored-dialogue';
import { TOOL_PRICES } from './tool-trees';
import { MAJOR_BLOCKS, recoveryContract } from './major-campaign';
import { LEGACY_V2_BLOCKS } from './legacy-layouts';
import { MAJOR_RETIRED_STORY_IDS, MAJOR_STORY_EVENTS } from './major-story';
export const CAMPAIGN_REVISION = 1;
export const CHAPTERS = [
  { id: 1, name: 'Small Change', start: 0, end: 4 },
  { id: 2, name: 'Cold Storage', start: 5, end: 10 },
  { id: 3, name: 'The Audit', start: 11, end: 17 },
  { id: 4, name: 'Sublevel B', start: 18, end: 24 },
  { id: 5, name: 'The Vault', start: 25, end: 31 },
];
export type ToolId =
  | 'hand'
  | 'grip'
  | 'pick'
  | 'heavy'
  | 'sledge'
  | 'breaker'
  | 'thermal';
export const TOOLS: {
  id: ToolId;
  name: string;
  block: number;
  cost: number;
  cadence: number;
  radius: number;
  force: number;
  description: string;
}[] = [
  {
    id: 'hand',
    name: 'Hand chisel',
    block: 0,
    cost: 0,
    cadence: 0.44,
    radius: 0.58,
    force: 1.4,
    description: 'Click to chip away the ice.',
  },
  {
    id: 'grip',
    name: 'Hold to Chip',
    block: 1,
    cost: 0,
    cadence: 0.36,
    radius: 0.68,
    force: 1.6,
    description: 'Hold the button to keep striking.',
  },
  {
    id: 'pick',
    name: 'Ice pick',
    block: 4,
    cost: TOOL_PRICES.pick,
    cadence: 0.525,
    radius: 0.98,
    force: 2.1,
    description: 'Break tougher ice with a sharp steel point.',
  },
  {
    id: 'heavy',
    name: 'Heavy pick',
    block: 9,
    cost: TOOL_PRICES.heavy,
    cadence: 0.75,
    radius: 1.45,
    force: 2.8,
    description: 'Slow, heavy hits break deep into the ice.',
  },
  {
    id: 'sledge',
    name: 'Sledgehammer',
    block: 16,
    cost: TOOL_PRICES.sledge,
    cadence: 1.1,
    radius: 2.3,
    force: 3.4,
    description: 'Smash wide chunks of ice with each swing.',
  },
  {
    id: 'breaker',
    name: 'Powered breaker',
    block: 23,
    cost: TOOL_PRICES.breaker,
    cadence: 0.13,
    radius: 1.35,
    force: 1.8,
    description: 'Quick, strong hits chew through thick ice.',
  },
  {
    id: 'thermal',
    name: 'Thermal tool',
    block: 27,
    cost: TOOL_PRICES.thermal,
    cadence: 0,
    radius: 1.39,
    force: 1,
    description: 'Hold to melt the ice with a hot flame.',
  },
];
export type Profile =
  | 'parcel'
  | 'slab'
  | 'tower'
  | 'wings'
  | 'seam'
  | 'archive'
  | 'vault';
export type StoryObjectId =
  | 'tag'
  | 'ring'
  | 'hold'
  | 'log'
  | 'access'
  | 'ledger';
export const STORY_OBJECTS: Record<
  StoryObjectId,
  { name: string; stamp: string; lines: string[] }
> = {
  tag: {
    name: 'Custody tag AP-7C-114',
    stamp: 'BELLWETHER NATIONAL · ASSET PRESERVATION',
    lines: [
      'AP-7C-114',
      'Custody account: 008114',
      'Your claim: 001903',
      'Pooled hold authorization: [withheld]',
    ],
  },
  ring: {
    name: 'Plain silver ring',
    stamp: 'PERSONAL EFFECTS · ESTATE HOLD',
    lines: [
      'One silver band. Worn smooth on the inside.',
      'Employee estate 41-09. Release unresolved.',
    ],
  },
  hold: {
    name: 'Red Internal Hold label',
    stamp: 'PRESERVATION REVIEW · DO NOT RELEASE',
    lines: [
      'Internal review opened: 14 February',
      'Custody discrepancies acknowledged.',
      'Release authority: suspended.',
    ],
  },
  log: {
    name: 'Preservation Exception Log',
    stamp: 'EXCEPTION 7C · INTERNAL APPROVAL',
    lines: [
      '02 Feb — Incorrect hold classifications detected.',
      '14 Feb — Account pooling confirmed.',
      '21 Feb — Release deferred by management.',
      'Continue preservation pending record reconciliation.',
    ],
  },
  access: {
    name: 'Sublevel service key',
    stamp: 'SUBLEVEL B · MANUAL ACCESS',
    lines: [
      'Maintenance bypass assembly.',
      'Asset Preservation archive route.',
      'Badge authorization is not required at this door.',
    ],
  },
  ledger: {
    name: 'The Freeze Ledger',
    stamp: 'BELLWETHER NATIONAL · CUSTODY MASTER',
    lines: [
      'Original holds. Affected account identities.',
      'Exception log and management approval trail.',
      'Inventory retained after the error was confirmed.',
      'A complete record. Every copy counts.',
    ],
  },
};
export type BlockSpec = {
  id: string;
  name: string;
  chapter: number;
  scale: number;
  profile: Profile;
  lots: number;
  value: number;
  object?: StoryObjectId;
  optional?: StoryObjectId;
  phases: number;
  layers?: Profile[];
  hint: string;
  ice?: import('./major-campaign').DeliveryIceSpec;
  baseNet?: number;
  baseGross?: number;
  targetActiveSeconds?: { min: number; max: number };
  structure?: string;
  cargoLabel?: string;
  contract?: import('./major-campaign').RecoveryContract;
};
const blocks: [
  string,
  Profile,
  number,
  number,
  number,
  StoryObjectId?,
  StoryObjectId?,
][] = [
  ['First claim', 'parcel', 0.34, 2, 1],
  ['Petty cash', 'parcel', 0.5, 3, 1],
  ['Personal effects', 'slab', 0.66, 3, 1],
  ['Counter deposit', 'tower', 0.82, 4, 1],
  ['Wrong account', 'archive', 0.98, 4, 1, 'tag'],
  ['Pooled custody', 'slab', 1, 5, 1.3],
  ['Maintenance lot', 'seam', 1.04, 5, 1.5],
  ['Estate effects', 'wings', 1.06, 5, 1.6, undefined, 'ring'],
  ['Mixed identifiers', 'tower', 1.1, 6, 1.7],
  ['Sealed cash', 'archive', 1.13, 6, 1.8],
  ['Internal review', 'seam', 1.16, 6, 2, 'hold'],
  ['Inventory variance', 'slab', 1.2, 6, 2.2],
  ['Emergency access', 'wings', 1.25, 7, 2.4],
  ['Bearer instruments', 'tower', 1.28, 7, 2.5],
  ['Exception inventory', 'archive', 1.32, 7, 2.7],
  ['Brittle annex', 'wings', 1.35, 8, 2.8],
  ['Withheld release', 'seam', 1.4, 8, 3],
  ['Exception 7C', 'archive', 1.45, 8, 3.2, 'log'],
  ['Downstairs equipment', 'tower', 1.5, 8, 3.5],
  ['Service channel', 'seam', 1.55, 9, 3.8],
  ['Preservation machinery', 'wings', 1.58, 9, 4],
  ['Thermal service', 'archive', 1.62, 9, 4.3],
  ['Unreleased holdings', 'slab', 1.67, 10, 4.5],
  ['Liability archive', 'seam', 1.7, 10, 4.8],
  ['The remaining route', 'archive', 1.75, 10, 5, 'access'],
  ['Sublevel B intake', 'tower', 1.8, 10, 5.4],
  ['Prestige custody', 'wings', 1.85, 11, 5.8],
  ['Manual clearance', 'seam', 1.9, 11, 6],
  ['Master records', 'archive', 1.95, 12, 6.2],
  ['Last holdings', 'slab', 2, 12, 6.5],
  ['Archive antechamber', 'wings', 2.05, 12, 7],
  ['The Vault', 'vault', 2.15, 14, 8, 'ledger'],
];
const hints: Record<Profile, string> = {
  parcel: 'A small claim. Work around each object.',
  slab: 'Broad and shallow. Open one side, then turn the tray.',
  tower: 'Clear the lower restraints before the upper holdings.',
  wings: 'The wings share narrow supports. Sever the supports.',
  seam: 'Follow the visible center seam for a deeper opening.',
  archive:
    'Separate shelves protect the records. Work one compartment at a time.',
  vault:
    'Outer supports → service channels → sealed archive. Change tools for each layer.',
};
// Compound custody lots introduce inner compartments before the three-part vault.
// Each layer is a different physical layout with its own recoveries, never extra HP.
const compartments: Record<number, Profile[]> = {
  8: ['tower', 'seam'],
  10: ['slab', 'archive'],
  14: ['seam', 'archive'],
  17: ['tower', 'archive'],
  19: ['archive', 'seam'],
  24: ['seam', 'archive'],
  27: ['wings', 'seam'],
  29: ['slab', 'archive'],
  31: ['wings', 'seam', 'archive'],
};
export const LEGACY_BLOCKS: BlockSpec[] = blocks.map(
  ([name, profile, scale, lots, value, object, optional], i) => ({
    id: `claim-${String(i + 1).padStart(2, '0')}`,
    name,
    profile,
    scale,
    lots,
    value,
    object,
    optional,
    chapter: CHAPTERS.find((c) => i >= c.start && i <= c.end)!.id,
    phases: compartments[i]?.length ?? 1,
    layers: compartments[i],
    hint: hints[profile],
  }),
);
export const BLOCKS: BlockSpec[] = MAJOR_BLOCKS;
export function blockSpec(index: number, layoutVersion = 3): BlockSpec {
  if (index < 32)
    return (layoutVersion === 1 ? LEGACY_BLOCKS : layoutVersion === 2 ? LEGACY_V2_BLOCKS : BLOCKS)[Math.max(0, index)];
  if (layoutVersion >= 3) return recoveryContract(index);
  const base = (layoutVersion === 1 ? LEGACY_BLOCKS : LEGACY_V2_BLOCKS)[18 + ((index - 32) % 13)];
  return {
    ...base,
    id: `contract-${index - 31}`,
    name: `Recovery contract ${index - 31}`,
    object: undefined,
    optional: undefined,
    phases: 1,
    layers: undefined,
    value: base.value * (1 + ((index - 32) % 5) * 0.1),
    hint: [
      'Precision contract · narrow channels',
      'Bulk contract · clear the supports',
      'Archive contract · recover every compartment',
    ][(index - 32) % 3],
  };
}
export type Trigger =
  | 'GAME_START'
  | 'FIRST_ICE_HIT'
  | 'FIRST_REWARD'
  | 'BLOCK_START'
  | 'BLOCK_COMPLETE'
  | 'TOOL_UNLOCK'
  | 'STORY_REWARD_RECOVERED'
  | 'PHONE_OPENED'
  | 'FINAL_LEDGER_RECOVERED'
  | 'FINAL_LAYER_OPENED'
  | 'FINAL_LEDGER_EXPOSED'
  | 'CAMPAIGN_COMPLETE'
  | 'POSTGAME_START';
export type StoryMessage = {
  key: string;
  speaker: 'tony' | 'bank' | 'mercer' | 'system';
  text: string;
};
export type StoryEvent = {
  id: string;
  chapter: number;
  trigger: Trigger;
  at?: number;
  object?: StoryObjectId;
  tool?: ToolId;
  priority: number;
  required: boolean;
  messages: StoryMessage[];
  effect?: 'commission8' | 'ending';
  /** These prerequisites are resolved when the player finishes the call. */
  requiresRead?: string[];
  /** Zero-based physical phase. Used by authored Vault calls. */
  atPhase?: number;
  readEffect?: { commission?: 0 | 8 | 12; flag?: string };
  once: true;
  retired?: boolean;
};
const story = (
  id: string,
  chapter: number,
  trigger: Trigger,
  lines: string[],
  options: Partial<StoryEvent> = {},
): StoryEvent => ({
  id,
  chapter,
  trigger,
  priority: 10,
  required: true,
  once: true,
  ...options,
  messages: lines.map((text, i) => ({
    key: `story.${id}.${String(i + 1).padStart(3, '0')}`,
    speaker: 'tony',
    text,
  })),
});
const LEGACY_STORY: StoryEvent[] = [
  story('ch1.intro', 1, 'GAME_START', [
    'Got something of yours.',
    'Bank froze it.',
    'Literally.',
  ]),
  story(
    'ch1.arrangement',
    1,
    'GAME_START',
    [
      'I can get pieces out.',
      "You recover what's inside.",
      'I take twelve percent.',
    ],
    {},
  ),
  story(
    'ch1.first',
    1,
    'FIRST_REWARD',
    ["That's it.", "I'll move the next piece."],
    { priority: 3 },
  ),
  story(
    'ch1.grip',
    1,
    'TOOL_UNLOCK',
    ['Found a return spring.', 'It was written off.'],
    { tool: 'grip' },
  ),
  story('ch1.pick', 1, 'TOOL_UNLOCK', ['Found something less embarrassing.'], {
    tool: 'pick',
  }),
  story(
    'ch1.tag',
    1,
    'STORY_REWARD_RECOVERED',
    ['Hold on.', "That tag isn't yours.", 'I need to check something.'],
    { object: 'tag', priority: 30 },
  ),
  story(
    'ch2.pool',
    2,
    'BLOCK_START',
    [
      'Your account is in a pooled hold.',
      "It shouldn't be.",
      'Neither should that tag.',
    ],
    { at: 5 },
  ),
  story('ch2.heavy', 2, 'TOOL_UNLOCK', ["Next one's heavier.", 'Block too.'], {
    tool: 'heavy',
  }),
  story(
    'ch2.ring',
    2,
    'STORY_REWARD_RECOVERED',
    ['I know that one.', 'Long story.'],
    { object: 'ring', required: false },
  ),
  story(
    'ch2.accounts',
    2,
    'BLOCK_START',
    ['They mixed accounts.', "That's not supposed to happen."],
    { at: 8 },
  ),
  story(
    'ch2.father',
    2,
    'BLOCK_COMPLETE',
    [
      "The ring was my father's.",
      'Employee estate dispute. Still pending.',
      'Keep it somewhere dry.',
    ],
    { at: 9, object: 'ring', required: false },
  ),
  story(
    'ch2.internal',
    2,
    'STORY_REWARD_RECOVERED',
    ["That one's internal.", 'They knew.'],
    { object: 'hold', priority: 30 },
  ),
  {
    ...story('ch3.security', 3, 'BLOCK_START', [], { at: 11 }),
    messages: [
      {
        key: 'story.ch3.security.001',
        speaker: 'bank',
        text: 'We detected unusual activity associated with your restricted asset record.',
      },
      {
        key: 'story.ch3.security.002',
        speaker: 'bank',
        text: 'Please contact Asset Compliance.',
      },
      { key: 'story.ch3.security.003', speaker: 'tony', text: "Don't." },
    ],
  },
  story('ch3.sledge', 3, 'TOOL_UNLOCK', ["You'll like this one."], {
    tool: 'sledge',
  }),
  story(
    'ch3.records',
    3,
    'BLOCK_START',
    ['The exception numbers match.', 'Someone signed off on this.'],
    { at: 14 },
  ),
  story(
    'ch3.log',
    3,
    'STORY_REWARD_RECOVERED',
    ['They caught it.', 'And left it running.'],
    { object: 'log', priority: 40 },
  ),
  story(
    'ch3.cut',
    3,
    'STORY_REWARD_RECOVERED',
    ['I was taking twelve.', 'Eight from here.'],
    { object: 'log', priority: 35, effect: 'commission8' },
  ),
  story(
    'ch4.breaker',
    4,
    'TOOL_UNLOCK',
    ['They use these downstairs.', 'Used to.'],
    { tool: 'breaker' },
  ),
  story(
    'ch4.monitored',
    4,
    'BLOCK_START',
    ['They check my transfers now.', 'These are going through maintenance.'],
    { at: 19 },
  ),
  story(
    'ch4.thermal',
    4,
    'TOOL_UNLOCK',
    ['Maintenance wand.', 'Try not to ask how.'],
    { tool: 'thermal' },
  ),
  story(
    'ch4.liability',
    4,
    'BLOCK_START',
    [
      'Releasing them exposes the missing records.',
      'Management chose to keep everything frozen.',
    ],
    { at: 22 },
  ),
  story(
    'ch4.coverup',
    4,
    'BLOCK_COMPLETE',
    ["It wasn't the freeze.", 'It was the cover-up.'],
    { at: 23, priority: 30 },
  ),
  story(
    'ch4.route',
    4,
    'STORY_REWARD_RECOVERED',
    ['Badge died.', "I've got one route left.", 'Sublevel B.'],
    { object: 'access', priority: 40 },
  ),
  story(
    'ch5.intake',
    5,
    'BLOCK_START',
    [
      'This door still takes a physical key.',
      'Nobody downstairs is asking for the equipment back.',
    ],
    { at: 25 },
  ),
  story(
    'ch5.ledger',
    5,
    'BLOCK_START',
    [
      'The master ledger links the accounts to the inventory.',
      'Original signatures. Not the scanned copies.',
    ],
    { at: 28 },
  ),
  story(
    'ch5.final',
    5,
    'BLOCK_START',
    ['This is the one.', 'Your last claim is in there.', 'So is theirs.'],
    { at: 31, priority: 50 },
  ),
  story(
    'ch5.finalroute',
    5,
    'BLOCK_START',
    [
      'The freeze ledger.',
      'That transfer closes my remaining access.',
      'Make it count.',
    ],
    { at: 31, priority: 49 },
  ),
  story(
    'ch5.recovered',
    5,
    'FINAL_LEDGER_RECOVERED',
    [
      'You got it?',
      'Good.',
      'Sending copies.',
      "By the time they find my desk, it won't matter.",
    ],
    { priority: 100 },
  ),
  {
    ...story('ch5.notice', 5, 'CAMPAIGN_COMPLETE', [], { priority: 45 }),
    messages: [
      {
        key: 'story.ch5.notice.001',
        speaker: 'bank',
        text: 'Asset Preservation operations are suspended. Affected holds are under review for release.',
      },
      {
        key: 'story.ch5.notice.002',
        speaker: 'tony',
        text: 'They cleared my desk.',
      },
      {
        key: 'story.ch5.notice.003',
        speaker: 'tony',
        text: 'The copies arrived first.',
      },
    ],
  },
  story(
    'epilogue',
    5,
    'CAMPAIGN_COMPLETE',
    [
      'Still got the bench?',
      'Turns out a lot of people need things unfrozen.',
      'T.',
    ],
    { priority: 1, effect: 'ending' },
  ),
];

// Stable event identifiers keep old files valid. Superseded barks remain readable
// in older archives but no longer trigger in the authored campaign.
const authoredEvents: StoryEvent[] = [
  story('ch1.intro', 1, 'GAME_START', AUTHORED_DIALOGUE['ch1.intro']),
  story('ch1.more', 1, 'BLOCK_START', AUTHORED_DIALOGUE['ch1.more'], { at: 2 }),
  story('ch1.tag', 1, 'STORY_REWARD_RECOVERED', AUTHORED_DIALOGUE['ch1.tag'], {
    object: 'tag',
    priority: 30,
  }),
  story('ch2.pool', 2, 'BLOCK_START', AUTHORED_DIALOGUE['ch2.pool'], { at: 5 }),
  story('ch2.accounts', 2, 'BLOCK_START', AUTHORED_DIALOGUE['ch2.accounts'], {
    at: 8,
  }),
  story(
    'ch2.internal',
    2,
    'STORY_REWARD_RECOVERED',
    AUTHORED_DIALOGUE['ch2.internal'],
    { object: 'hold', priority: 30 },
  ),
  story('ch3.warning', 3, 'BLOCK_START', AUTHORED_DIALOGUE['ch3.warning'], {
    at: 11,
  }),
  {
    ...story(
      'ch3.security',
      3,
      'BLOCK_START',
      AUTHORED_DIALOGUE['ch3.security'],
      { at: 12 },
    ),
    messages: AUTHORED_DIALOGUE['ch3.security'].map((text, i) => ({
      key: `story.ch3.security.${i + 1}`,
      text,
      speaker: i < 2 ? 'bank' : 'tony',
    })),
  },
  story('ch3.log', 3, 'STORY_REWARD_RECOVERED', AUTHORED_DIALOGUE['ch3.log'], {
    object: 'log',
    priority: 40,
  }),
  story('ch3.cut', 3, 'STORY_REWARD_RECOVERED', AUTHORED_DIALOGUE['ch3.cut'], {
    object: 'log',
    priority: 35,
    effect: 'commission8',
  }),
  story('ch4.monitored', 4, 'BLOCK_START', AUTHORED_DIALOGUE['ch4.monitored'], {
    at: 18,
  }),
  story('ch4.breaker', 4, 'TOOL_UNLOCK', AUTHORED_DIALOGUE['ch4.breaker'], {
    tool: 'breaker',
  }),
  story('ch4.thermal', 4, 'TOOL_UNLOCK', AUTHORED_DIALOGUE['ch4.thermal'], {
    tool: 'thermal',
  }),
  story('ch4.coverup', 4, 'BLOCK_COMPLETE', AUTHORED_DIALOGUE['ch4.coverup'], {
    at: 23,
    priority: 30,
  }),
  story(
    'ch4.route',
    4,
    'STORY_REWARD_RECOVERED',
    AUTHORED_DIALOGUE['ch4.route'],
    { object: 'access', priority: 40 },
  ),
  story('ch5.intake', 5, 'BLOCK_START', AUTHORED_DIALOGUE['ch5.intake'], {
    at: 25,
  }),
  story('ch5.final', 5, 'BLOCK_START', AUTHORED_DIALOGUE['ch5.final'], {
    at: 31,
    priority: 50,
  }),
  story(
    'ch5.midpoint',
    5,
    'FINAL_LAYER_OPENED',
    AUTHORED_DIALOGUE['ch5.midpoint'],
    { at: 31, priority: 50 },
  ),
  story(
    'ch5.exposed',
    5,
    'FINAL_LEDGER_EXPOSED',
    AUTHORED_DIALOGUE['ch5.exposed'],
    { at: 31, priority: 60 },
  ),
  story(
    'ch5.recovered',
    5,
    'FINAL_LEDGER_RECOVERED',
    AUTHORED_DIALOGUE['ch5.recovered'],
    { priority: 100 },
  ),
  story('ch5.cut', 5, 'CAMPAIGN_COMPLETE', AUTHORED_DIALOGUE['ch5.cut'], {
    priority: 70,
  }),
  {
    ...story(
      'ch5.notice',
      5,
      'CAMPAIGN_COMPLETE',
      AUTHORED_DIALOGUE['ch5.notice'],
      { priority: 45 },
    ),
    messages: [
      {
        key: 'story.ch5.notice.001',
        text: AUTHORED_DIALOGUE['ch5.notice'][0],
        speaker: 'bank',
      },
    ],
  },
  story('epilogue', 5, 'CAMPAIGN_COMPLETE', AUTHORED_DIALOGUE.epilogue, {
    priority: 1,
    effect: 'ending',
  }),
];
const majorStoryById = new Map(
  MAJOR_STORY_EVENTS.map((event) => [event.id, event]),
);
const retiredStoryIds = new Set<string>(MAJOR_RETIRED_STORY_IDS);
export const STORY: StoryEvent[] = [
  ...(
    [
      [
        'pick',
        'I found something better than that little chisel. Guy in maintenance owes me a favor.',
        "It's not free, though. Nothing downstairs is.",
      ],
      [
        'heavy',
        'These next blocks are too thick for that little pick.',
        "I can get you the heavy one. You're paying for it.",
      ],
      [
        'sledge',
        "All right. We're past delicate.",
        "There's a sledge in emergency maintenance. I can make it disappear, but it'll cost you.",
      ],
      [
        'breaker',
        'The stuff downstairs gets bigger from here.',
        'Maintenance has a powered breaker. Expensive piece of equipment. Very effective piece of equipment.',
      ],
      [
        'thermal',
        'I found the tool Bellwether actually uses on Preservation blocks.',
        'Controlled heat. No swinging. No guessing. And they charge a fortune for the thing.',
      ],
    ] as const
  ).map(([id, ...lines]) => {
    const tool = TOOLS.find((t) => t.id === id)!;
    return story(
      `equipment.${id}`,
      CHAPTERS.find((c) => tool.block >= c.start && tool.block <= c.end)!.id,
      'BLOCK_START',
      [...lines],
      { at: tool.block, priority: 60 },
    );
  }),
  ...authoredEvents.map(
    (event) =>
      majorStoryById.get(event.id) ??
      (retiredStoryIds.has(event.id) ? { ...event, retired: true } : event),
  ),
  ...MAJOR_STORY_EVENTS.filter(
    (event) => !authoredEvents.some((old) => old.id === event.id),
  ),
  ...LEGACY_STORY.filter(
    (old) =>
      !authoredEvents.some((e) => e.id === old.id) &&
      !majorStoryById.has(old.id),
  ).map((e) => ({ ...e, retired: true })),
];
