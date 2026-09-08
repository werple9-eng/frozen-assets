'use client';
import { useState, type CSSProperties } from 'react';
import { TactileButton } from './tactile';
import { slotSummary, type SaveSlot } from '@/lib/game/save-slots';
export function SaveMenu({
  slots,
  active,
  launch,
  remove,
  restore,
  returnToGame,
}: {
  slots: SaveSlot[];
  active: number;
  launch: (index: number) => void;
  remove: (index: number) => Promise<void>;
  restore: (index: number) => Promise<void>;
  returnToGame?: () => void;
}) {
  const [selected, setSelected] = useState(active),
    [deleting, setDeleting] = useState<number | null>(null),
    [error, setError] = useState('');
  return (
    <div className="save-menu-body">
      <fieldset
        className="save-slot-list"
        aria-label="Choose a save slot"
        data-selection={selected}
      >
        {slots.map((slot, i) => {
          const summary = slotSummary(slot);
          return (
            <TactileButton
              key={i}
              className={`save-slot ${selected === i ? 'chosen' : ''}`}
              style={{ '--slot-index': i } as CSSProperties}
              aria-pressed={selected === i}
              onClick={() => {
                setSelected(i);
                setDeleting(null);
              }}
            >
              <small>SAVE SLOT {String(i + 1).padStart(2, '0')}</small>
              <strong>
                {summary
                  ? summary.completed
                    ? 'Reclaimed'
                    : summary.induction
                      ? 'Induction in progress'
                      : `Batch ${String(summary.batch).padStart(2, '0')}`
                  : 'A fresh start'}
              </strong>
              <span>
                {summary
                  ? `${summary.induction ? 'Your first recovery' : `Chapter ${summary.chapter}`} · $${summary.money.toLocaleString()} available`
                  : 'Cold ice. Unclaimed money. Your workbench.'}
              </span>
              <i>
                {selected === i
                  ? 'SELECTED'
                  : summary
                    ? 'SAVED ON THIS DEVICE'
                    : 'EMPTY FILE'}
              </i>
            </TactileButton>
          );
        })}
      </fieldset>
      <div className="save-actions">
        <TactileButton
          className="bench-return launch-recovery"
          onClick={() => launch(selected)}
        >
          {slots[selected].raw ? 'Continue recovery' : 'New game'}{' '}
          <span>→</span>
        </TactileButton>
        {returnToGame && (
          <TactileButton className="save-back" onClick={returnToGame}>
            Back to the bench
          </TactileButton>
        )}
        {slots[selected].raw && (
          <TactileButton
            className="restart-link"
            onClick={() => setDeleting(selected)}
          >
            Delete this file
          </TactileButton>
        )}
      </div>
      {!slots[selected].raw && slots[selected].backup && (
        <TactileButton
          className="restart-link"
          onClick={async () => {
            try {
              await restore(selected);
            } catch {
              setError(
                'This browser could not restore the file. The recovery copy is retained.',
              );
            }
          }}
        >
          Restore cleared file
        </TactileButton>
      )}
      {deleting !== null && (
        <fieldset className="slot-confirm" aria-label="Confirm save deletion">
          <div>
            <strong>Clear recovery file {deleting + 1}?</strong>
            <p>
              This frees the slot for a new game. A recovery copy stays on this
              device.
            </p>
          </div>
          <TactileButton onClick={() => setDeleting(null)}>
            Keep this file
          </TactileButton>
          <TactileButton
            className="delete-slot"
            onClick={async () => {
              try {
                await remove(deleting);
                setDeleting(null);
              } catch {
                setError(
                  'This browser could not save the change. Your recovery copy is retained.',
                );
              }
            }}
          >
            Clear file
          </TactileButton>
        </fieldset>
      )}
      {error && <p role="alert">{error}</p>}
      <p className="local-note">
        LOCAL SAVE SLOTS · AUTOMATICALLY SAVED · NO ACCOUNT REQUIRED
      </p>
    </div>
  );
}
