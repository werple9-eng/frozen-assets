'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions -- The full-screen dialog handles confirmation and contained keyboard focus. */
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { TactileButton } from './tactile';
import { SpringNumber } from './motion';
import { TOOLS, type ToolId } from '@/lib/game/campaign-content';
import {
  ALL_TOOL_NODES,
  nodeState,
  type MajorTool,
  type ToolNodesOwned,
} from '@/lib/game/tool-trees';
import '@/app/major-progression.css';

export type SettlementNextGoal = {
  kind: 'tool' | 'upgrade' | 'objective';
  name: string;
  cost?: number;
  detail?: string;
};

export function DeliveryComplete({
  settlement: s,
  remaining,
  money,
  owned,
  revealed,
  nodes,
  advance,
  sound,
}: {
  settlement: {
    gross: number;
    base?: number;
    conditionBonus?: number;
    contractBonus?: number;
    fee: number;
    net: number;
    name: string;
    seconds?: number;
    finds?: number;
    pristine?: number;
    economicFinds?: number;
    bestName?: string;
    bestValue?: number;
    nextGoal?: SettlementNextGoal;
  };
  remaining: number;
  money: number;
  owned: ToolId[];
  revealed: MajorTool[];
  nodes: ToolNodesOwned;
  advance: () => void;
  sound: () => void;
}) {
  const root = useRef<HTMLDialogElement>(null),
    played = useRef(false);
  const soundEvent = useEffectEvent(sound);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!played.current) {
        played.current = true;
        soundEvent();
      }
      root.current?.focus({ preventScroll: true });
    }, 150);
    return () => clearTimeout(timer);
  }, []);
  const next = TOOLS.find(
    (t) =>
      t.id !== 'grip' &&
      !owned.includes(t.id) &&
      revealed.includes(t.id as MajorTool),
  );
  const upgrade = ALL_TOOL_NODES.filter(
    (n) =>
      n.major &&
      owned.includes(n.toolId) &&
      nodeState(n, nodes[n.toolId]) === 'available',
  ).sort((a, b) => a.cost - b.cost)[0];
  const goal: SettlementNextGoal =
      s.nextGoal ??
      (next
        ? { kind: 'tool', name: next.name, cost: next.cost }
        : upgrade
          ? { kind: 'upgrade', name: upgrade.name, cost: upgrade.cost }
          : {
              kind: 'objective',
              name: 'The next recovery',
              detail: 'Your tools and fittings stay with the workshop.',
            }),
    goalCost = goal.cost ?? 0,
    goalReady = goalCost > 0 && money >= goalCost,
    contractBonus = Math.max(0, s.contractBonus ?? 0),
    base =
      s.base ?? Math.max(0, s.gross - (s.conditionBonus ?? 0) - contractBonus),
    bonus = s.conditionBonus ?? Math.max(0, s.gross - base - contractBonus);
  const rows = [
    { label: 'Base recovered', value: base, kind: 'base' },
    { label: 'Condition bonus', value: bonus, kind: 'bonus' },
    ...(s.contractBonus !== undefined
      ? [
          {
            label: 'Contract bonus',
            value: contractBonus,
            kind: 'contract-bonus',
          },
        ]
      : []),
    { label: 'Gross', value: s.gross, kind: 'gross' },
    { label: 'Tony’s cut', value: s.fee, kind: 'fee' },
    { label: 'You keep', value: s.net, kind: 'net' },
  ];
  const secs = Math.floor(s.seconds ?? 0),
    ready = remaining === 0;
  return (
    <dialog
      open
      ref={root}
      tabIndex={-1}
      aria-modal="true"
      aria-label="Delivery complete"
      className={`delivery-complete delivery-economy ${ready ? 'settled' : ''}`}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Tab') {
          e.preventDefault();
          root.current
            ?.querySelector<HTMLButtonElement>('.delivery-continue')
            ?.focus();
          return;
        }
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          if (!e.repeat) advance();
        }
      }}
    >
      <div className="delivery-board">
        <p className="delivery-claim">{s.name}</p>
        <h2 aria-label="Delivery complete">
          {['DELIVERY', 'COMPLETE'].map((word, row) => (
            <span className="delivery-word" key={word} aria-hidden="true">
              {Array.from(word).map((letter, i) => (
                <span
                  key={i}
                  style={
                    {
                      '--letter-time': `${150 + row * 160 + i * 22}ms`,
                    } as CSSProperties
                  }
                >
                  {letter}
                </span>
              ))}
            </span>
          ))}
        </h2>
        <div className="delivery-ledger">
          {rows.map(({ label, value, kind }, i) => (
            <div
              className={`delivery-row ${kind}`}
              key={kind}
              style={{ '--row-time': `${570 + i * 100}ms` } as CSSProperties}
            >
              <span>{label}</span>
              <strong>
                {kind === 'fee' && value > 0
                  ? '−'
                  : kind === 'bonus' || kind === 'contract-bonus'
                    ? '+'
                    : ''}
                <DeliveryNumber
                  value={value}
                  delay={570 + i * 100}
                  instant={ready}
                />
              </strong>
            </div>
          ))}
          <div className="delivery-details">
            <div>
              <span>Finds</span>
              <strong>{s.finds ?? 0}</strong>
            </div>
            <div className="delivery-pristine">
              <span>Pristine</span>
              <strong>
                {s.pristine ?? 0}
                <small> / {s.economicFinds ?? s.finds ?? 0}</small>
              </strong>
            </div>
            <div>
              <span>Best find</span>
              <strong>
                {s.bestName ?? '—'}
                {!!s.bestValue && (
                  <small>${s.bestValue.toLocaleString()}</small>
                )}
              </strong>
            </div>
            <div>
              <span>Time</span>
              <strong>
                {String(Math.floor(secs / 60)).padStart(2, '0')}:
                {String(secs % 60).padStart(2, '0')}
              </strong>
            </div>
          </div>
        </div>
        <div className={`delivery-next ${goalReady ? 'goal-ready' : ''}`}>
          <div className="delivery-goal-heading">
            <span>
              {goal.kind === 'tool'
                ? goalReady
                  ? 'Tool ready'
                  : 'Next tool'
                : goal.kind === 'upgrade'
                  ? goalReady
                    ? 'Fitting ready'
                    : 'Next milestone'
                  : 'Next recovery'}
            </span>
            <strong>{goal.name}</strong>
          </div>
          {goalCost > 0 ? (
            <>
              <div className="delivery-goal-funds">
                <b>
                  ${money.toLocaleString()}{' '}
                  <span>/ ${goalCost.toLocaleString()}</span>
                </b>
                <small>
                  {goalReady
                    ? 'Available from Upgrades'
                    : `$${(goalCost - money).toLocaleString()} to go`}
                </small>
              </div>
              <progress
                className="delivery-goal-accessible"
                aria-label={`Funds toward ${goal.name}`}
                max={goalCost}
                value={Math.min(goalCost, money)}
              />
              <div
                className="delivery-goal-progress"
                aria-hidden="true"
                style={
                  {
                    '--goal-start': Math.min(
                      1,
                      Math.max(0, money - s.net) / goalCost,
                    ),
                    '--goal-end': Math.min(1, money / goalCost),
                  } as CSSProperties
                }
              >
                <i />
              </div>
              {goal.detail && <small>{goal.detail}</small>}
            </>
          ) : (
            <small>{goal.detail}</small>
          )}
        </div>
        <TactileButton
          className="delivery-continue"
          onClick={advance}
          disabled={remaining > 1.6}
        >
          {ready ? 'Continue' : 'Show results'} <kbd>↵</kbd>
        </TactileButton>
      </div>
    </dialog>
  );
}

function DeliveryNumber({
  value,
  delay,
  instant,
}: {
  value: number;
  delay: number;
  instant: boolean;
}) {
  const [started, setStarted] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setStarted(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);
  return (
    <span className="delivery-number">
      <span className="number-reservation" aria-hidden="true">
        ${value.toLocaleString()}
      </span>
      <span className="number-roll">
        {instant ? (
          `$${value.toLocaleString()}`
        ) : (
          <SpringNumber value={started ? value : 0} />
        )}
      </span>
    </span>
  );
}
