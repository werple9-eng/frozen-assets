'use client';
import { useState } from 'react';
import type { GameModel } from '@/lib/game/model';
import { LESSONS } from '@/lib/game/tutorial';

export function TutorialDebug({
  state,
  slot,
  run,
}: {
  state: ReturnType<GameModel['snapshot']>;
  slot: number;
  run: (action: string, step?: number) => void;
}) {
  const [step, setStep] = useState('0');
  const t = state.tutorial;
  return (
    <details className="tutorial-debug" data-hud>
      <summary>
        QA · {t ? `Tutorial ${t.step} / ${t.stage}` : 'Tutorial inactive'}
      </summary>
      <p>ISOLATED MEMORY SAVE · SLOT {slot + 1}</p>
      <p>
        {t ? LESSONS[t.step].name : 'Existing recovery'} ·{' '}
        {t?.timeInStep.toFixed(1) ?? 0}s
      </p>
      <p>
        Condition:{' '}
        {t?.message?.task ||
          (t?.stage === 'board' ? 'Stamp and return' : 'Read and continue')}
      </p>
      <p>Current: {t?.message?.text ?? '—'}</p>
      <p>
        Queue: {t ? LESSONS[t.step].lines.slice(t.line + 1).join(' / ') : '—'}
      </p>
      <p>
        Profile:{' '}
        {t?.block === 1
          ? '45% micro'
          : t?.block === 2
            ? '68% micro'
            : 'Empty / campaign'}
      </p>
      {t?.exposure.map((e) => (
        <p key={e.id}>
          {e.id}: exposed {Math.round(e.exposed * 100)}% · roof{' '}
          {Math.round(e.topCover * 100)}%
        </p>
      ))}
      <p>
        Flags: {t?.flags.join(', ') || 'none'} · impact {String(t?.firstImpact)}{' '}
        · fitted {String(t?.continuous)} · stamped {String(t?.boardStamped)}
      </p>
      <label>
        Step{' '}
        <select value={step} onChange={(e) => setStep(e.target.value)}>
          {LESSONS.map((l, i) => (
            <option key={l.name} value={i}>
              {i}: {l.name}
            </option>
          ))}
        </select>
      </label>
      <button onClick={() => run('goto', Number(step))}>Go</button>
      <div>
        {[
          'reset',
          'replay',
          'block1',
          'block2',
          'reward',
          'board',
          'stamp',
          'complete',
          'resetCompletion',
        ].map((a) => (
          <button key={a} onClick={() => run(a)}>
            {a}
          </button>
        ))}
      </div>
    </details>
  );
}
