// Ambient flavour only: no save state, no story flag, no achievement.
export const MUG_LINES = [
  'I could really use a coffee right now.',
  "That's definitely gone cold.",
  'One more delivery. Then coffee.',
  'I keep forgetting to refill this.',
  "I don't remember making this one.",
] as const;

// Never the line just played; avoid the two most recent when that leaves a
// choice, which with five lines it always does.
export function nextMugLine(history: number[], random = Math.random) {
  const recent = history.slice(0, 2);
  let candidates = MUG_LINES.map((_, i) => i).filter(
    (i) => !recent.includes(i),
  );
  if (!candidates.length)
    candidates = MUG_LINES.map((_, i) => i).filter((i) => i !== history[0]);
  return candidates[Math.floor(random() * candidates.length)];
}
