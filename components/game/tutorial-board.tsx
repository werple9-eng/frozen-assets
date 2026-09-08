'use client';
import { useEffect, useEffectEvent, useState } from 'react';
import { CHAPTERS } from '@/lib/game/campaign-content';
import { KineticText } from './motion';
import { TactileButton } from './tactile';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
export function TutorialBoard({
  stamped,
  stamp,
  finish,
  sound,
  reduced = false,
}: {
  stamped: boolean;
  stamp: () => void;
  finish: () => void;
  sound: (c: string) => void;
  reduced?: boolean;
}) {
  const [replay] = useState(!stamped),
    [ready, setReady] = useState(stamped),
    [closing, setClosing] = useState(false);
  const stampNow = useEffectEvent(stamp);
  const finishNow = useEffectEvent(finish);
  useEffect(() => {
    if (!closing) return;
    const exit = setTimeout(() => finishNow(), reduced ? 120 : 300);
    return () => clearTimeout(exit);
  }, [closing, reduced]);
  useEffect(() => {
    if (!replay) return;
    const strike = setTimeout(() => stampNow(), 760),
      ready = setTimeout(() => setReady(true), 3050);
    return () => {
      clearTimeout(strike);
      clearTimeout(ready);
    };
  }, [replay]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && ready) setClosing(true);
      }}
    >
      <DialogContent
        unstyled
        showCloseButton={false}
        className={`tutorial-board-overlay ${stamped ? 'is-stamped' : ''} ${closing ? 'board-leaving' : ''} ${reduced ? 'reduced-motion' : ''}`}
        data-hud
        aria-label="Tutorial complete campaign board"
      >
        <div className="campaign-board">
          <header>
            <small>RECOVERY WORKSHOP · ASSIGNMENTS</small>
            <DialogTitle>YOUR NEXT CLAIM.</DialogTitle>
            <p>One job at a time.</p>
          </header>
          <div className="board-string" />
          <div className="board-cards">
            <article className="tutorial-card">
              <i className="paper-pin" />
              <small>00 / INDUCTION</small>
              <h3>TUTORIAL</h3>
              <span className="ink-stamp">COMPLETE</span>
            </article>
            {CHAPTERS.map((c) => (
              <article className={`chapter-card chapter-${c.id}`} key={c.id}>
                <i className="paper-pin" />
                <small>CHAPTER {c.id}</small>
                <h3>{c.name.toUpperCase()}</h3>
                {c.id === 1 && <span className="active-stamp">ACTIVE</span>}
              </article>
            ))}
          </div>
          {replay && (
            <div className="stamp-mechanism" aria-hidden="true">
              <i />
              <b />
              <span />
            </div>
          )}
          {replay && stamped && (
            <div className="complete-word" aria-hidden="true">
              <KineticText text="COMPLETE" interval={46} sound={sound} />
            </div>
          )}
          <TactileButton
            className="bench-return board-continue"
            disabled={!ready || closing}
            onClick={() => setClosing(true)}
          >
            {ready ? 'Back to your workshop' : 'Claim completed'} <span>→</span>
          </TactileButton>
        </div>
      </DialogContent>
    </Dialog>
  );
}
