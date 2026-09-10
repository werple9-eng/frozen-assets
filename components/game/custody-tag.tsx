'use client';
import { useLayoutEffect, useRef } from 'react';
import '@/app/major-progression.css';

export type HandlingTag = {
  structure: string;
  cargo: string;
  match?: string;
  phase?: string;
  security?: string;
  contract?: string;
};

export function CustodyTag({ tag }: { tag: HandlingTag }) {
  const element = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const paper = element.current;
    const shell = paper?.closest<HTMLElement>('.game-shell');
    const rail = shell?.querySelector<HTMLElement>('.control-rail');
    if (!paper || !shell || !rail) return;
    const place = () => {
      const footer = rail.getBoundingClientRect();
      if (!footer.height) return;
      // Tool modes and large text can make the footer several rows tall.
      // Anchor the paper above its actual top, including its bottom margin.
      paper.style.setProperty(
        '--custody-footer-clearance',
        `${Math.ceil(shell.getBoundingClientRect().bottom - footer.top + 14)}px`,
      );
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(rail);
    observer.observe(shell);
    window.addEventListener('resize', place);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', place);
    };
  }, []);
  return (
    <aside ref={element} className="custody-tag" aria-label="Custody handling tag">
      <span className="custody-tag-eyelet" aria-hidden="true" />
      {(tag.phase || tag.security) && (
        <header className="custody-phase">
          {tag.phase && <strong>{tag.phase}</strong>}
          {tag.security && <span>{tag.security}</span>}
        </header>
      )}
      <p>
        <span>Structure</span>
        <strong>{tag.structure}</strong>
      </p>
      <p>
        <span>Cargo</span>
        <strong>{tag.cargo}</strong>
      </p>
      {tag.match && <small>{tag.match}</small>}
      {tag.contract && (
        <div className="custody-contract">
          <span>Optional · bonus only</span>
          <strong>{tag.contract}</strong>
        </div>
      )}
    </aside>
  );
}
