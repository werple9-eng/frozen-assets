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
  launch: (index: number) => void | Promise<void>;
  remove: (index: number) => Promise<void>;
  restore: (index: number) => Promise<void>;
  returnToGame?: () => void;
}) {
  const [selected, setSelected] = useState(active),
    [deleting, setDeleting] = useState<number | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const run = async (operation: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await operation();
    } catch {
      setError(
        'The file could not be saved. Your recovery copy is retained. Try again.',
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="save-menu-body">
      <fieldset
        className="save-slot-list"
        aria-label="Choose a save slot"
        data-selection={selected}
        disabled={busy}
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
          disabled={busy}
          onClick={() => void run(() => launch(selected))}
        >
          {slots[selected].raw ? 'Continue recovery' : 'New game'}{' '}
          <span>→</span>
        </TactileButton>
        {returnToGame && (
          <TactileButton
            className="save-back"
            disabled={busy}
            onClick={returnToGame}
          >
            Back to the bench
          </TactileButton>
        )}
        {slots[selected].raw && (
          <TactileButton
            className="restart-link"
            disabled={busy}
            onClick={() => setDeleting(selected)}
          >
            Delete this file
          </TactileButton>
        )}
      </div>
      {!slots[selected].raw && slots[selected].backup && (
        <TactileButton
          className="restart-link"
          disabled={busy}
          onClick={() => void run(() => restore(selected))}
        >
          Restore cleared file
        </TactileButton>
      )}
      {deleting !== null && (
        <fieldset
          className="slot-confirm"
          aria-label="Confirm save deletion"
          disabled={busy}
        >
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
            onClick={() =>
              void run(async () => {
                await remove(deleting);
                setDeleting(null);
              })
            }
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
