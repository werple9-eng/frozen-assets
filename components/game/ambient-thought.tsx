'use client';
import { useEffect, useRef, useState } from 'react';

export type Thought = { id: number; text: string };
const LETTER_MS = 32,
  HOLD_MS = 2600,
  LEAVE_MS = 240;

// A quiet internal thought at the bottom of the bench. Not Tony: no speaker,
// no panel, no per-letter sound. Layout is fixed up front; only opacity and
// transform animate, so nothing reflows while the letters arrive.
export function AmbientThought({
  thought,
  onDone,
}: {
  thought: Thought | null;
  onDone: () => void;
}) {
  if (!thought) return null;
  return <ThoughtLine key={thought.id} text={thought.text} onDone={onDone} />;
}

function ThoughtLine({ text, onDone }: { text: string; onDone: () => void }) {
  const [leaving, setLeaving] = useState(false);
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  }, [onDone]);
  useEffect(() => {
    const settle = text.length * LETTER_MS + HOLD_MS;
    const hold = setTimeout(() => setLeaving(true), settle);
    const end = setTimeout(() => done.current(), settle + LEAVE_MS);
    return () => {
      clearTimeout(hold);
      clearTimeout(end);
    };
  }, [text]);
  return (
    <output
      className={`ambient-thought ${leaving ? 'leaving' : ''}`}
      aria-label={text}
    >
      {text.split('').map((ch, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{ animationDelay: `${i * LETTER_MS}ms` }}
        >
          {ch === ' ' ? ' ' : ch}
        </span>
      ))}
    </output>
  );
}
