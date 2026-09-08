'use client';
import { TOOLS, type ToolId } from '@/lib/game/campaign-content';
import { TactileButton } from './tactile';
import { canonicalTool, type MajorTool } from '@/lib/game/tool-trees';

export function ToolGlyph({ id }: { id: ToolId }) {
  return (
    <svg
      className="tool-glyph"
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {id === 'hand' || id === 'grip' ? (
        <>
          <path d="M24 52l10-27 7 3-10 27zM34 25l4-17 6 3-3 17" />
          {id === 'grip' && (
            <path d="M16 26a18 18 0 0131-13M48 6v9H39M13 36a18 18 0 0030 14M12 56v-9h9" />
          )}
        </>
      ) : id === 'pick' || id === 'heavy' ? (
        <>
          <path d="M23 53l14-32 6 3-13 32zM11 22Q35 2 55 28Q39 19 27 23z" />
          {id === 'heavy' && <path d="M28 27l9 4M24 37l9 4" />}
        </>
      ) : id === 'sledge' ? (
        <>
          <path d="M23 53l14-31 6 3-13 31zM16 12l7-8 34 16-5 11zM24 9l-5 12M48 20l-5 11" />
        </>
      ) : id === 'breaker' ? (
        <>
          <path d="M24 18h18v25H24zM29 43v13l5 5 4-18M20 20H9v9M46 20h10v9M28 11h11v7M29 25h8M29 31h8" />
        </>
      ) : (
        <>
          <path d="M9 18h33v18H9zM42 23h13v8H42M20 36l-5 19h13l6-19M14 12h19v6M17 19v16M31 19v16M57 21l4-3M57 34l4 3" />
        </>
      )}
    </svg>
  );
}
export function ToolSelector({
  block: _block,
  owned,
  selected,
  select,
  revealed,
  inspect,
}: {
  block: number;
  owned: ToolId[];
  selected: ToolId;
  select: (id: ToolId) => void;
  revealed: MajorTool[];
  inspect: (id: ToolId) => void;
}) {
  return (
    <div className="tool-choices">
      {TOOLS.filter((t) => t.id !== 'grip').map((t) => {
        const have = owned.some((id) => canonicalTool(id) === t.id),
          known = have || revealed.includes(t.id as MajorTool);
        return (
          <TactileButton
            key={t.id}
            className={`tool-choice ${have ? 'owned' : 'undiscovered'}`}
            aria-pressed={canonicalTool(selected) === t.id}
            aria-disabled={!known}
            onClick={() => {
              if (have) select(t.id);
              else if (known) inspect(t.id);
            }}
          >
            {known ? (
              <ToolGlyph id={t.id} />
            ) : (
              <span className="tool-mystery" aria-hidden="true">
                ?
              </span>
            )}
            <span className="tool-choice-copy">
              <strong>{known ? t.name : 'New tool'}</strong>
              <small>
                {have
                  ? t.description
                  : known
                    ? `$${t.cost.toLocaleString()} · View tool`
                    : 'Keep working to discover it.'}
              </small>
            </span>
            <span className="tool-state">
              {selected === t.id ? 'EQUIPPED' : have ? 'SELECT' : 'LOCKED'}
            </span>
          </TactileButton>
        );
      })}
    </div>
  );
}
