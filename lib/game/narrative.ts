import type { StoryEvent, StoryMessage, Trigger } from './campaign-content';

export const NARRATIVE_REVISION = 2;
export const TONY_CALL_GAP = 8 * 60;
export const PHONE_CALL_GAP = 2 * 60;
export const RING_WINDOW = 12.6;
export type NarrativeDeliveryMode =
  | 'silent'
  | 'evidence'
  | 'tool-presentation'
  | 'mercer-call'
  | 'tony-call';
const call = (
  id: string,
  chapter: number,
  trigger: Trigger,
  speaker: StoryMessage['speaker'],
  lines: string[],
  options: Partial<StoryEvent> = {},
): StoryEvent => ({
  id,
  chapter,
  trigger,
  priority: 60,
  required: true,
  once: true,
  deliveryMode: speaker === 'mercer' ? 'mercer-call' : 'tony-call',
  ...options,
  messages: lines.map((text, i) => ({
    key: `story.${id}.${String(i + 1).padStart(3, '0')}`,
    speaker,
    text,
  })),
});
export const RESTRAINED_STORY: StoryEvent[] = [
  call(
    'ch1.tag',
    1,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "That tag isn't yours. Leave it on the tray and don't throw it out.",
      "Give me a little time. I want to know why somebody else's custody number is inside your block.",
    ],
    { object: 'tag' },
  ),
  call(
    'ch2.ring',
    2,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      "Hold on. That ring is my father's. Bellwether froze his estate after he died.",
      "That's why I started looking through your hold in the first place. I should've told you.",
      "I knew his account was mixed in. I didn't know how many others were.",
    ],
    { object: 'ring' },
  ),
  call(
    'mercer.first',
    2,
    'STORY_REWARD_RECOVERED',
    'mercer',
    [
      'This is Helen Mercer, Asset Preservation.',
      'You are in possession of Bellwether custody material. Stop removing inventory and we can correct your account quietly.',
    ],
    { object: 'hold' },
  ),
  call(
    'ch3.log',
    3,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'I checked the dates. They knew the holds were wrong and kept everything frozen anyway.',
      "I've been taking twelve percent while you clean up a mess they already knew about. Eight from here on.",
    ],
    {
      object: 'log',
      readEffect: { commission: 8, flag: 'commission.reviewed' },
    },
  ),
  call(
    'ch4.route',
    4,
    'STORY_REWARD_RECOVERED',
    'tony',
    [
      'My badge is dead, but that service key gets you into Sublevel B.',
      "From here on, they're going to notice everything we move.",
    ],
    { object: 'access' },
  ),
  call(
    'mercer.access',
    5,
    'BLOCK_START',
    'mercer',
    [
      'Your access route has been identified.',
      'Anything removed from Sublevel B from this point forward will be treated as deliberate theft.',
    ],
    { at: 26, requiresRead: ['ch4.route'] },
  ),
  call(
    'ch5.final',
    5,
    'BLOCK_COMPLETE',
    'tony',
    [
      'This is the last block I can move.',
      'Your claim is inside it. So is the master ledger.',
      "When it leaves the floor, they'll know exactly where it went.",
    ],
    { at: 30 },
  ),
  call(
    'mercer.offer',
    5,
    'FINAL_LAYER_OPENED',
    'mercer',
    [
      'You are about to remove protected master records.',
      'Put the ledger back and Bellwether will release your personal claim in full.',
    ],
    { at: 31, atPhase: 2, priority: 80 },
  ),
  call(
    'ch5.recovered',
    5,
    'FINAL_LEDGER_RECOVERED',
    'tony',
    [
      'You got it.',
      "I'm copying the ledger now. Every hold, every approval, every account they buried.",
      "By the time they get to my desk, it won't matter.",
      "I'm not taking a cut on this one.",
    ],
    {
      priority: 100,
      requiresRead: ['mercer.offer'],
      readEffect: { commission: 0, flag: 'ledger.copied' },
    },
  ),
  call(
    'epilogue',
    5,
    'CAMPAIGN_COMPLETE',
    'tony',
    [
      'Still got the bench?',
      "Good. Turns out Bellwether wasn't the only place doing this.",
    ],
    { priority: 1, effect: 'ending' },
  ),
];
export const isPhoneEvent = (event: StoryEvent) =>
  event.deliveryMode === 'tony-call' || event.deliveryMode === 'mercer-call';

// Keep historical IDs for archive/save validation, but never ring retired barks.
export function restrainedEvent(event: StoryEvent): StoryEvent {
  const authored = RESTRAINED_STORY.find((e) => e.id === event.id);
  if (authored) return authored;
  return {
    ...event,
    required: false,
    retired: true,
    deliveryMode:
      event.id.startsWith('equipment.') || event.id.startsWith('handling.')
        ? 'tool-presentation'
        : event.object
          ? 'evidence'
          : 'silent',
  };
}
