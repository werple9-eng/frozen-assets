'use client';
import { useState } from 'react';
import { TactileButton } from './tactile';
import { CONTINUOUS_COST } from '@/lib/game/tutorial';
export function TutorialUpgrade({
  owned,
  buy,
  money,
  ready = true,
}: {
  owned: boolean;
  buy: () => boolean;
  money: number;
  ready?: boolean;
}) {
  const [bought, setBought] = useState(false);
  return (
    <div className={`tutorial-upgrade ${bought || owned ? 'fitted' : ''}`}>
      <div className="quiet-branches" aria-hidden="true">
        <i />
        <i />
        <i />
        <span>MORE EQUIPMENT AHEAD</span>
      </div>
      <div className="tutorial-upgrade-path">
        <svg viewBox="0 0 20 100">
          <path d="M10 0V100" pathLength="1" />
        </svg>
      </div>
      <TactileButton
        className="continuous-node"
        data-skill="continuous-work"
        disabled={owned || !ready || money < CONTINUOUS_COST}
        onClick={() => {
          if (buy()) setBought(true);
        }}
      >
        <small>{owned ? 'READY TO USE' : 'YOUR FIRST UPGRADE'}</small>
        <div className="spring-drawing" aria-hidden="true">
          ⟪⟪⟪
        </div>
        <strong>
          HOLD TO
          <br />
          CHIP
        </strong>
        <span>Hold the button to keep striking.</span>
        <b>{owned ? 'BOUGHT ✓' : `$${CONTINUOUS_COST} · BUY`}</b>
      </TactileButton>
      <p>One click becomes a rhythm.</p>
    </div>
  );
}
