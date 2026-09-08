'use client';
import { useEffect, useEffectEvent, useState, useRef } from 'react';
import { KineticText } from './motion';
import { TactileButton } from './tactile';

export type TonyLine = {
  id: string;
  text: string;
  speaker?: string;
  task?: string;
  waiting?: boolean;
};
export function TonyPanel({
  line,
  speed,
  sounds,
  sound,
  advance,
  timed = false,
}: {
  line: TonyLine;
  speed: number;
  sounds: boolean;
  sound: (c: string) => void;
  advance: () => void;
  timed?: boolean;
}) {
  return (
    <Panel key={line.id} {...{ line, speed, sounds, sound, advance, timed }} />
  );
}
function Panel({
  line,
  speed,
  sounds,
  sound,
  advance,
  timed,
}: Parameters<typeof TonyPanel>[0]) {
  const [instant, setInstant] = useState(false),
    [typed, setTyped] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const frame = requestAnimationFrame(() =>
      panel.current
        ?.querySelector<HTMLButtonElement>('.tony-continue')
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);
  const confirm = () => {
    if (!typed) {
      setInstant(true);
      setTyped(true);
    } else if (!line.waiting) advance();
  };
  const confirmFromInput = useEffectEvent(confirm);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (
        e.repeat ||
        e.defaultPrevented ||
        !['Enter', ' '].includes(e.key) ||
        (e.target as HTMLElement)?.closest(
          'button,input,[role="slider"],[role="dialog"]',
        )
      )
        return;
      e.preventDefault();
      confirmFromInput();
    };
    const controller = () => confirmFromInput();
    window.addEventListener('keydown', key, true);
    window.addEventListener('recovery:dialogue-confirm', controller);
    return () => {
      window.removeEventListener('keydown', key, true);
      window.removeEventListener('recovery:dialogue-confirm', controller);
    };
  }, []);
  void timed; // Kept for compatibility with older presentation fixtures; calls are player paced.
  return (
    <aside
      ref={panel}
      className={`tony-panel live-dialogue ${line.speaker?.startsWith('BELLWETHER') ? 'bank-call' : ''}`}
      data-hud
      data-message={line.id}
      aria-live="polite"
    >
      <header>
        <strong>
          <KineticText text={line.speaker ?? 'TONY'} delay={20} interval={42} />
        </strong>
        <span>
          {line.speaker?.startsWith('BELLWETHER')
            ? 'ASSET COMPLIANCE'
            : 'ON THE LINE'}
        </span>
        <i />
      </header>
      <button
        className="tony-text-action"
        onClick={confirm}
        aria-label="Read Tony message"
      >
        <span className="tony-text">
          <KineticText
            text={line.text}
            delay={120}
            interval={speed < 0.25 ? 50 : speed < 0.75 ? 30 : 22}
            instant={instant || speed >= 0.99}
            sound={sounds ? sound : undefined}
            onComplete={() => setTyped(true)}
          />
        </span>
      </button>
      <footer>
        {line.task ? (
          <div className="tony-task">
            <small>CURRENT TASK</small>
            <b>{line.task}</b>
          </div>
        ) : (
          <span className="dialogue-read-hint">
            {typed ? 'YOUR WORK. YOUR PACE.' : 'CLICK OR CONFIRM TO REVEAL'}
          </span>
        )}
        <TactileButton
          className="tony-continue"
          aria-label={
            typed
              ? line.waiting
                ? 'Instruction stays until complete'
                : 'Next dialogue'
              : 'Read message instantly'
          }
          disabled={typed && line.waiting}
          onClick={() => confirm()}
        >
          {typed ? (line.waiting ? 'Listening…' : 'Next') : 'Read now'}{' '}
          <span>↵</span>
        </TactileButton>
      </footer>
    </aside>
  );
}
