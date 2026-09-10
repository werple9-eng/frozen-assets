// Player-authored dialogue, transcribed verbatim from the supplied correction brief.
export const TUTORIAL_SCRIPT = [
  'Hey. Listen before you hang up. I heard what Bellwether did to your account.',
  "They didn't just freeze the numbers. Your assets are sitting downstairs in Preservation, packed into blocks of ice.",
  'I can pull a little out without anybody upstairs noticing. You crack it open, I move the money back to you, and I keep twelve percent.',
  "Look, I'm doing you a favor here. You're doing me one too, so let's keep this between us.",
  "I started you small. Get this one open, and I'll see what else I can move.",
  'See the block? Start with the surface. Click the ice and break a little away.',
  "Good. Keep working across the surface. There's something sitting close to the front.",
  'There it is. Once the ice around an asset is clear, it comes free and your share goes straight into your balance.',
  'Work around each item until no ice is touching it. It will drop as soon as that last bit is clear.',
  "That's the arrangement. I find the frozen lot, you get the valuables out, and we both walk away with something.",
  'Before I send another one, spend a little of that money. No reason to keep doing this the hard way.',
  'Take Hold to Chip. After this, you can keep the tool moving instead of clicking every single strike.',
  'Much better. Head back to the bench and try it on the next one.',
  'This one is a little bigger. Hold the button down and keep the pick moving across the surface.',
  "That's it. Don't bury the tool in one spot; move around the item and peel the ice away from it.",
  'All right. You know enough to work without me standing over your shoulder.',
  "I'll keep the line open. If I find anything strange downstairs, you'll hear from me.",
] as const;
export const AUTHORED_DIALOGUE: Record<string, string[]> = {
  'ch1.more': [
    "You're moving faster than I expected. That's good, because I found a few more lots with your account number on them.",
    "Don't ask why they split your holdings into separate blocks. I don't know yet, and I'd rather get them out before somebody asks me.",
  ],
  'ch1.tag': [
    'Stop for a second. That metal tag that just dropped—leave it on the bench.',
    "That serial number isn't tied to your account. I'm going to find out why it was frozen with your property.",
  ],
  'ch2.pool': [
    'I checked the tag. Your account was bundled into something called a pooled preservation hold.',
    "I've worked here long enough to know that's not normal. Somebody else's inventory got mixed into yours.",
  ],
  'ch2.accounts': [
    'I found three more custody numbers under the same hold code. Different people, same storage batch.',
    'Either somebody made one unbelievable mistake, or somebody wanted all of this sitting in the same place.',
  ],
  'ch2.internal': [
    "That red label is internal. 'Do Not Release' means somebody reviewed the batch after it was already frozen.",
    'So they knew something was wrong. They just decided leaving it buried was easier.',
  ],
  'ch3.warning': [
    'Small problem. Security noticed the inventory downstairs getting lighter.',
    "If this phone rings twice and stops, don't pick it up. That won't be me.",
  ],
  'ch3.security': [
    'Unusual activity has been detected in connection with your restricted asset record.',
    'Please contact Asset Compliance immediately.',
    "Don't.",
  ],
  'ch3.log': [
    'Read the date on that page. They discovered the bad holds months ago.',
    "They didn't correct them. They moved the affected inventory farther downstairs.",
  ],
  'ch3.cut': [
    "I've been taking twelve percent while you clean up a mess they already knew about.",
    "Eight from here on. Don't make a thing out of it.",
  ],
  'ch4.monitored': [
    'My badge only opens half the floor now. I borrowed a maintenance key before they changed the permissions.',
    "That gets us into the bigger storage rooms, but we're running out of quiet ways to do this.",
  ],
  'ch4.breaker': [
    "I pulled a breaker from maintenance. It's loud, but subtle stopped being an option a while ago.",
  ],
  'ch4.thermal': [
    "This one's actual Bellwether equipment. They use it to service Preservation ice without cracking whatever is stored inside.",
    "Use it when you need control. The heavy tools are faster, but they don't care what they're hitting.",
  ],
  'ch4.coverup': [
    "I found the review chain. The original freeze wasn't what management was afraid of.",
    'They were afraid of admitting how many accounts got swept into it, so they buried the records with the inventory.',
    "It wasn't the freeze. It was the cover-up.",
  ],
  'ch4.route': ['My badge just died.', "I've got one route left. Sublevel B."],
  'ch5.intake': [
    "Sublevel B is where Bellwether stores things it doesn't want appearing on normal inventory.",
    'If your file is down there, the preservation ledger should be too. That ledger tells us who approved every hold.',
  ],
  'ch5.final': [
    'This is the last block I can move.',
    'Your claim is inside it. So is the preservation ledger.',
    "When this leaves the floor, they'll know exactly who touched it. Take your time and get everything.",
  ],
  'ch5.midpoint': [
    "You're getting close. Don't rush the center; the ledger is heavier than the other items, and they packed the ice tight around it.",
  ],
  'ch5.exposed': [
    'If that ledger drops, leave it on the tray for a second. I need it intact.',
  ],
  'ch5.recovered': [
    'You got it.',
    "I'm copying it now. Every hold, every review, every account they buried.",
    "By the time they get to my desk, it won't matter.",
  ],
  'ch5.cut': ["I'm not taking a cut on this one."],
  epilogue: [
    'Still got the bench?',
    "Good. Bellwether wasn't the only place freezing things it shouldn't.",
    '- T',
  ],
  'ch1.intro': [
    'Hey. Listen before you hang up. I heard what Bellwether did to your account.',
    "They didn't just freeze the numbers. Your assets are sitting downstairs in Preservation, packed into blocks of ice.",
    'I can pull a little out without anybody upstairs noticing. You crack it open, I move the money back to you, and I keep twelve percent.',
    "Look, I'm doing you a favor here. You're doing me one too, so let's keep this between us.",
    "I started you small. Get this one open, and I'll see what else I can move.",
  ],
  'ch5.notice': [
    'Bellwether Preservation suspended. Affected accounts under review. Tony no longer employed.',
  ],
};
