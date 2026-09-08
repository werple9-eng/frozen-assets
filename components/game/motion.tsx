'use client';
import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Spring, letterSchedule } from '@/lib/game/motion';

export function reducedMotion(element?: Element | null) {
  return (
    !!element?.closest('.reduced-motion') ||
    matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function SpringNumber({
  value,
  prefix = '$',
  className = '',
}: {
  value: number;
  prefix?: string;
  className?: string;
}) {
  const element = useRef<HTMLSpanElement>(null),
    spring = useRef(new Spring(value, 165, 25));
  const shape = useRef(new Spring(0, 310, 21));
  useLayoutEffect(() => {
    const el = element.current!;
    const delta = value - spring.current.target;
    spring.current.target = value;
    el.textContent = `${prefix}${Math.round(spring.current.value).toLocaleString('en-US')}`;
    const quiet = reducedMotion(el);
    if (delta && !quiet) shape.current.kick(delta > 0 ? 5 : -3);
    let frame = 0,
      last = performance.now();
    const step = (now: number) => {
      const dt = (now - last) / 1000;
      const n = spring.current.step(dt, reducedMotion(el));
      const response = shape.current.step(dt, quiet);
      last = now;
      el.textContent = `${prefix}${Math.max(0, Math.round(n)).toLocaleString('en-US')}`;
      el.style.transform = quiet
        ? ''
        : `scale(${1 + response * 0.65},${1 + response}) translateY(${-response * 10}px)`;
      if (spring.current.moving || shape.current.moving)
        frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [value, prefix]);
  return (
    <span className={className} ref={element}>
      {prefix}
      {value.toLocaleString('en-US')}
    </span>
  );
}

type KineticProps = {
  text: string;
  delay?: number;
  interval?: number;
  sound?: (character: string) => void;
  animate?: boolean;
  instant?: boolean;
  onComplete?: () => void;
};
// Text reserves its final layout before the first glyph. Changing a message
// cancels its entire schedule; skipping never plays the remaining sounds.
export function KineticText(props: KineticProps) {
  return <KineticLine key={props.text} {...props} />;
}
function KineticLine({
  text,
  delay = 0,
  interval = 32,
  sound,
  animate = true,
  instant = false,
  onComplete,
}: KineticProps) {
  const element = useRef<HTMLSpanElement>(null);
  const speak = useEffectEvent((c: string) => sound?.(c));
  const complete = useEffectEvent(() => onComplete?.());
  const completed = useRef(false);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(!animate);
  useEffect(() => {
    if (!animate || instant || finished) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setPlaying(true);
        else if (playing) setFinished(true); // Leaving history completes silently.
      },
      { threshold: 0.01 },
    );
    observer.observe(element.current!);
    return () => observer.disconnect();
  }, [animate, instant, finished, playing]);
  useEffect(() => {
    if (!playing || finished || instant || !animate) return;
    const schedule = letterSchedule(text, delay, interval);
    let frame = 0,
      index = 0;
    const start = performance.now();
    const step = (now: number) => {
      // CSS continues while hidden. Finish silently rather than replaying an
      // obsolete audio schedule when the player returns to this tab.
      if (document.hidden) {
        setFinished(true);
        return;
      }
      const elapsed = now - start;
      if (!document.hidden) {
        while (index < schedule.length && elapsed >= schedule[index].at) {
          if (/[\p{L}\p{N}]/u.test(schedule[index].character))
            speak(schedule[index].character);
          index++;
        }
      }
      if (elapsed >= (schedule.at(-1)?.at ?? 0) + 450) setFinished(true);
      else frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [playing, finished, instant, animate, text, delay, interval]);
  const done = finished || instant || !animate;
  useEffect(() => {
    if (done && !completed.current) {
      completed.current = true;
      complete();
    }
  }, [done]);
  const schedule = letterSchedule(text, delay, interval);
  const words: { word: string; glyphs: typeof schedule }[] = [];
  let cursor = 0;
  for (const word of text.split(/(\s+)/)) {
    const end = cursor + Array.from(word).length;
    words.push({ word, glyphs: schedule.slice(cursor, end) });
    cursor = end;
  }
  return (
    <span
      ref={element}
      data-typing={!done}
      className={`kinetic-sentence ${playing ? 'speaking' : ''} ${done ? 'sentence-settled' : ''}`}
      aria-label={text}
    >
      <span aria-hidden="true">
        {words.map(({ word, glyphs }, wi) =>
          word.trim() ? (
            <span className="spoken-word" key={wi}>
              {glyphs.map(({ character, at }, i) => (
                <span
                  className="spoken-glyph"
                  key={i}
                  style={
                    {
                      '--letter-delay': `${at}ms`,
                      animation: done ? 'none' : !playing ? 'none' : undefined,
                      opacity: done ? 1 : !playing ? 0 : undefined,
                      transform: done ? 'none' : undefined,
                      '--letter-tilt': `${((i % 5) - 2) * 0.9}deg`,
                    } as CSSProperties
                  }
                >
                  {character}
                </span>
              ))}
            </span>
          ) : (
            word
          ),
        )}
      </span>
    </span>
  );
}

// CSS presence keeps the departing child alive for its acknowledgement and exit.
// Re-entry reverses the transition immediately; the stale timeout is cancelled.
export function Presence({
  show,
  className,
  children,
}: {
  show: boolean;
  className: string;
  children: ReactNode;
}) {
  const [mounted, setMounted] = useState(show);
  useEffect(() => {
    if (show) {
      const frame = requestAnimationFrame(() => setMounted(true));
      return () => cancelAnimationFrame(frame);
    }
    const timer = setTimeout(() => setMounted(false), 650);
    return () => clearTimeout(timer);
  }, [show]);
  return mounted ? (
    <div className={`${className} motion-presence`} data-present={show}>
      {children}
    </div>
  ) : null;
}

export function Milestone({
  label,
  title,
  kind,
}: {
  label: string;
  title: string;
  kind: 'chapter' | 'tool' | 'delivery';
}) {
  return (
    <aside className={`motion-milestone ${kind}`} aria-live="polite">
      <small>{label}</small>
      <strong>
        <KineticText text={title} delay={120} />
      </strong>
      <i />
    </aside>
  );
}
