'use client';
import { TactileButton } from './tactile';
import {
  incomingCallPresentation,
  type IncomingCall as Call,
} from '@/lib/game/phone-call';

export function IncomingCall({
  call,
  tutorial,
  onAnswer,
}: {
  call?: Call;
  tutorial: boolean;
  onAnswer: () => void;
}) {
  const caller = incomingCallPresentation(tutorial ? undefined : call);
  return (
    <div
      className={`incoming-call ${caller.institutional ? 'incoming-institutional' : ''}`}
      data-hud
    >
      <small>{tutorial ? 'CURRENT TASK' : caller.label}</small>
      {caller.institutional && (
        <div className="incoming-caller">
          {caller.name !== caller.label && <strong>{caller.name}</strong>}
          <span>{caller.department}</span>
        </div>
      )}
      <TactileButton onClick={onAnswer}>
        Pick up the phone <kbd>P</kbd>
      </TactileButton>
    </div>
  );
}
