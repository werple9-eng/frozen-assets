import type {
  StoryEvent,
  StoryMessage,
  StoryObjectId,
  Trigger,
} from './campaign-content';

type Options = Partial<
  Omit<StoryEvent, 'id' | 'chapter' | 'trigger' | 'messages'>
>;
const call = (
  id: string,
  chapter: number,
  trigger: Trigger,
  speaker: StoryMessage['speaker'],
  lines: string[],
  options: Options = {},
): StoryEvent => ({
  id,
  chapter,
  trigger,
  priority: 40,
  required: true,
  once: true,
  ...options,
  messages: lines.map((text, index) => ({
    key: `story.${id}.${String(index + 1).padStart(3, '0')}`,
    speaker,
    text,
  })),
});

// Sequence gates use completed calls, never merely queued or opened calls.
// Retain the replaced Tony event IDs so old history remains valid.
export const MAJOR_STORY_EVENTS: StoryEvent[] = [
  call(
    'handling.hand',
    1,
    'BLOCK_START',
    'tony',
    [
      'The custody tag tells you what is in the ice. Clean recoveries get a little extra. The listed value is yours either way.',
      'That chisel is useful around exposed valuables. Bigger tools will clear more ice, but keep an eye on what is underneath.',
    ],
    { at: 0, priority: 10 },
  ),
  call(
    'handling.pick',
    2,
    'TOOL_UNLOCK',
    'tony',
    [
      'The pick works well across broad slabs. You can still use the chisel near anything delicate.',
    ],
    { tool: 'pick', priority: 10 },
  ),
  call(
    'handling.heavy',
    3,
    'TOOL_UNLOCK',
    'tony',
    [
      'Those dark seams carry the weight. The heavy pick is good at cutting through them.',
    ],
    { tool: 'heavy', priority: 10 },
  ),
  call(
    'handling.sledge',
    3,
    'TOOL_UNLOCK',
    'tony',
    [
      'A shared support holds up both sides. The sledge is good at taking that out. Watch the exposed cash when you swing.',
    ],
    { tool: 'sledge', priority: 10 },
  ),
  call(
    'handling.breaker',
    4,
    'TOOL_UNLOCK',
    'tony',
    [
      'Use the breaker to open layered archives. Once the valuables are showing, a lighter tool can keep them cleaner.',
    ],
    { tool: 'breaker', priority: 10 },
  ),
  call(
    'handling.thermal',
    5,
    'TOOL_UNLOCK',
    'tony',
    [
      'The service lanes respond to heat. Metal can take it; paper cannot. Your other tools still have a use.',
    ],
    { tool: 'thermal', priority: 10 },
  ),
  call(
    'ch1.tag',
    1,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "That tag isn't your account number.",
      'AP-7C-114. Your claim is sharing a hold with somebody else.',
    ],
    { object: 'tag' },
  ),
  call(
    'ch2.ring',
    2,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "Hold on. That ring. Don't sell it.",
      "It was my father's. Bellwether froze his estate after he died.",
      "That's why I started looking through your hold in the first place. I should've told you.",
      "I knew his account was mixed in. I didn't know how many others were.",
    ],
    { object: 'ring', priority: 60 },
  ),
  call(
    'ch2.internal',
    2,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'Preservation Review. Do Not Release.',
      "Somebody reviewed the discrepancy. This wasn't just sitting in a queue.",
    ],
    { object: 'hold', priority: 60 },
  ),
  call(
    'mercer.first',
    3,
    'STORY_REWARD_RECOVERED',
    'mercer',
    [
      'This is Helen Mercer, Asset Preservation.',
      'You are in possession of Bellwether custody material. Stop removing inventory and we can correct your account quietly.',
    ],
    { object: 'hold', requiresRead: ['ch2.internal'], priority: 55 },
  ),
  call(
    'tony.mercer.first',
    3,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'Helen Mercer. She runs Preservation.',
      "If she's calling you herself, they're finally paying attention.",
    ],
    { object: 'hold', requiresRead: ['mercer.first'], priority: 50 },
  ),
  call(
    'ch3.log',
    3,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'Classification error confirmed. Release deferred.',
      'They knew the accounts were wrong. They kept the hold anyway.',
    ],
    { object: 'log', priority: 60 },
  ),
  call(
    'mercer.exception',
    3,
    'STORY_REWARD_RECOVERED',
    'mercer',
    [
      "Internal review documents are not customer records. You do not understand what you're reading.",
      'Return the materials. This is the last informal request.',
    ],
    { object: 'log', requiresRead: ['ch3.log'], priority: 55 },
  ),
  call(
    'tony.mercer.exception',
    3,
    'STORY_REWARD_RECOVERED',
    'tony',
    ['She signed the review chain.'],
    { object: 'log', requiresRead: ['mercer.exception'], priority: 50 },
  ),
  call(
    'ch3.cut',
    3,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "I've been taking twelve percent while you clean up a mess they already knew about.",
      "Eight from here on. Don't make a thing out of it.",
    ],
    {
      object: 'log',
      requiresRead: ['tony.mercer.exception'],
      priority: 45,
      readEffect: { commission: 8, flag: 'commission.reviewed' },
    },
  ),
  call(
    'ch4.route',
    4,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'Sublevel B. They moved the affected records downstairs.',
      'This key is still in service. So is the door.',
    ],
    { object: 'access', priority: 60 },
  ),
  call(
    'mercer.access',
    4,
    'STORY_REWARD_RECOVERED',
    'mercer',
    [
      'Your access route has been identified.',
      'The next item removed from Sublevel B will be treated as deliberate theft.',
    ],
    { object: 'access', requiresRead: ['ch4.route'], priority: 55 },
  ),
  call(
    'tony.mercer.access',
    4,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "That's useful.",
      "Means they finally figured out which door we're using.",
    ],
    { object: 'access', requiresRead: ['mercer.access'], priority: 50 },
  ),
  call(
    'ch5.final',
    5,
    'BLOCK_START',
    'tony',
    [
      'This is the Preservation Vault.',
      'The braces come first. The ledger is further in.',
    ],
    { at: 31, atPhase: 0, priority: 60 },
  ),
  call(
    'mercer.offer',
    5,
    'FINAL_LAYER_OPENED',
    'mercer',
    [
      'You are about to remove protected master records.',
      'Put the ledger back. Bellwether will release your personal claim in full.',
    ],
    { at: 31, atPhase: 2, priority: 80 },
  ),
  call(
    'tony.mercer.offer',
    5,
    'FINAL_LAYER_OPENED',
    'tony',
    ["That's the first time they've offered you anything."],
    { at: 31, atPhase: 2, requiresRead: ['mercer.offer'], priority: 75 },
  ),
  call(
    'ch5.exposed',
    5,
    'FINAL_LEDGER_EXPOSED',
    'tony',
    [
      'There it is. The whole approval chain.',
      'Take your time with the last restraint.',
    ],
    { at: 31, atPhase: 4, priority: 85 },
  ),
  call(
    'ch5.recovered',
    5,
    'FINAL_LEDGER_RECOVERED',
    'tony',
    [
      'You got it.',
      "I'm copying it now. Every hold, every review, every account they buried.",
      "By the time they get to my desk, it won't matter.",
      "I'm not taking a cut on this one.",
    ],
    {
      priority: 100,
      readEffect: { commission: 0, flag: 'ledger.copied' },
    },
  ),
];

// These versions contradicted the new physical/story arc. Keep their records
// for old save/history validation, but never enqueue them in a new campaign.
export const MAJOR_RETIRED_STORY_IDS = [
  'ch2.father',
  'ch3.warning',
  'ch3.security',
  'ch4.liability',
  'ch4.coverup',
  'ch5.finalroute',
  'ch5.midpoint',
  'ch5.cut',
] as const;

export function storySpeaker(speaker: StoryMessage['speaker']) {
  if (speaker === 'mercer')
    return {
      name: 'HELEN MERCER',
      subtitle: 'BELLWETHER NATIONAL · ASSET PRESERVATION',
      institutional: true,
    };
  if (speaker === 'bank')
    return {
      name: 'BELLWETHER NATIONAL',
      subtitle: 'ASSET PRESERVATION',
      institutional: true,
    };
  return {
    name: speaker === 'system' ? 'WORKSHOP' : 'TONY',
    subtitle: speaker === 'system' ? 'RECOVERY RECORD' : 'ON THE LINE',
    institutional: false,
  };
}

// Optional document details add context without carrying a required plot beat.
// No annotation appears before the associated story call has been read.
export const EVIDENCE_ANNOTATIONS: Record<
  StoryObjectId,
  {
    requiresRead: string;
    text: string;
  }
> = {
  tag: {
    requiresRead: 'ch1.tag',
    text: 'Your hold and AP-7C-114 were entered separately. The Preservation pool joined them afterward. — T.',
  },
  ring: {
    requiresRead: 'ch2.ring',
    text: 'Dad worked for Bellwether. They called this an estate reconciliation. Never gave me a date. — T.',
  },
  hold: {
    requiresRead: 'tony.mercer.first',
    text: 'The review stamp predates our first recovery. Mercer inherited the classification problem; she approved keeping Preservation in place. — T.',
  },
  log: {
    requiresRead: 'tony.mercer.exception',
    text: 'The stated reason is custody integrity pending reconciliation. The approval chain is Mercer’s. Release would have exposed the liability. — T.',
  },
  access: {
    requiresRead: 'ch4.route',
    text: 'The maintenance route stayed active after the customer route closed. They moved the records, not the problem. — T.',
  },
  ledger: {
    requiresRead: 'ch5.recovered',
    text: 'Every affected account. Every review. Every approval to keep the hold. Copies are already outside Bellwether. — T.',
  },
};
