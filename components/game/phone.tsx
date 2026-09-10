'use client';
import { useState, useEffect, useRef } from 'react';
import {
  STORY,
  STORY_OBJECTS,
  type StoryObjectId,
} from '@/lib/game/campaign-content';
import type { CampaignSave } from '@/lib/game/campaign';
import { TactileButton } from './tactile';
import { tutorialHistory, type TutorialSave } from '@/lib/game/tutorial';
import { EVIDENCE_ANNOTATIONS, storySpeaker } from '@/lib/game/major-story';
import '@/app/major-progression.css';
export function Phone({
  state,
  tutorial,
  onInspect,
}: {
  state: CampaignSave;
  tutorial?: TutorialSave;
  onInspect?: (id: StoryObjectId) => void;
}) {
  const [section, setSection] = useState<'messages' | 'evidence'>('messages');
  const [object, setObject] = useState<StoryObjectId>(
    state.objects[0] ?? 'tag',
  );
  const inspected = useRef(new Set<StoryObjectId>());
  useEffect(() => {
    if (
      onInspect &&
      section === 'evidence' &&
      state.objects.includes(object) &&
      !state.evidenceInspected?.includes(object) &&
      !inspected.current.has(object)
    ) {
      inspected.current.add(object);
      onInspect(object);
    }
  }, [section, object, state.objects, state.evidenceInspected, onInspect]);
  return (
    <div className="phone-body">
      <div className="phone-tabs">
        <TactileButton
          aria-pressed={section === 'messages'}
          onClick={() => setSection('messages')}
        >
          Call history
        </TactileButton>
        <TactileButton
          aria-pressed={section === 'evidence'}
          onClick={() => setSection('evidence')}
        >
          Workbench evidence
        </TactileButton>
      </div>
      {section === 'messages' ? (
        <History state={state} tutorial={tutorial} />
      ) : (
        <div className="evidence-view">
          <nav aria-label="Recovered evidence">
            {state.objects.map((id) => (
              <TactileButton
                key={id}
                aria-pressed={object === id}
                onClick={() => setObject(id)}
              >
                {STORY_OBJECTS[id].name}
              </TactileButton>
            ))}
          </nav>
          {state.objects.includes(object) ? (
            <article className={`evidence-document ${object}`} key={object}>
              <small>{STORY_OBJECTS[object].stamp}</small>
              <h3>{STORY_OBJECTS[object].name}</h3>
              {STORY_OBJECTS[object].lines.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {state.read.includes(
                EVIDENCE_ANNOTATIONS[object].requiresRead,
              ) && (
                <aside className="evidence-annotation">
                  <small>TONY&apos;S NOTE</small>
                  <p>{EVIDENCE_ANNOTATIONS[object].text}</p>
                </aside>
              )}
              <footer>RETAINED AT WORKBENCH · NOT FOR SALE</footer>
            </article>
          ) : (
            <p className="phone-empty">
              Anything that belongs to the investigation stays on the bench.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function History({
  state,
  tutorial,
}: {
  state: CampaignSave;
  tutorial?: TutorialSave;
}) {
  const root = useRef<HTMLDivElement>(null);
  const [rows] = useState(() => [
    ...tutorialHistory(tutorial).map((x) => ({
      ...x,
      label: 'INDUCTION · TONY',
    })),
    ...state.history.flatMap((id) => {
      const event = STORY.find((e) => e.id === id)!;
      const count =
        state.call?.event === id
          ? state.call.line + (state.call.status === 'active' ? 1 : 0)
          : event.messages.length;
      return event.messages.slice(0, count).map((line, i) => ({
        id: `${id}:${i}`,
        text: line.text,
        speaker: line.speaker,
        label:
          i && event.messages[i - 1].speaker === line.speaker
            ? ''
            : id === 'epilogue'
              ? 'SOME WEEKS LATER · UNKNOWN NUMBER'
              : `CHAPTER ${event.chapter} · ${storySpeaker(line.speaker).name}${line.speaker === 'mercer' ? ' · BELLWETHER NATIONAL' : ''}`,
      }));
    }),
  ]);
  useEffect(() => {
    const el = root.current!;
    if (rows.length > 6) el.scrollTop = el.scrollHeight;
  }, [rows]);
  return (
    <div
      className="message-history"
      ref={root}
      role="log"
      aria-label="Message history"
    >
      {rows.map((row) => {
        return (
          <section
            data-history-id={row.id}
            key={row.id}
            className="history-section history-read"
          >
            {row.label && <header>{row.label}</header>}
            <p className={`message ${row.speaker}`}>{row.text}</p>
          </section>
        );
      })}
      {!rows.length && (
        <p className="phone-empty">No messages yet. The line is open.</p>
      )}
    </div>
  );
}
