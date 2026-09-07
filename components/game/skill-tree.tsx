'use client';
/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- The application-role map implements keyboard pan and zoom. */
import { useEffect, useRef, useState } from 'react';
import { UPGRADES, type Upgrade } from '@/lib/game/model';
import {
  SKILLS,
  TREE,
  skillEffect,
  skillState,
  skillDescription,
} from '@/lib/game/skills';
import { TreePan } from '@/lib/game/pan';
import { TactileButton } from './tactile';
export function FittingDrawing({
  kind,
  level = 1,
}: {
  kind: Upgrade | 'torch';
  level?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      aria-hidden="true"
      className="fitting-drawing"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="miter"
    >
      {kind === 'heat' ? (
        <>
          <path d="M13 26h31v12H13zM7 23v18M44 29h9v6h-9M20 21v22M28 26v12M36 26v12" />
          <path
            d={`M54 ${28 - level}l6 -${level + 1}M55 32h7M54 ${36 + level}l6 ${level + 1}`}
          />
        </>
      ) : kind === 'tank' ? (
        <>
          <path d="M21 18h22v34H21zM25 18v-6h14v6M29 12V7h6M21 24h22M21 45h22M27 28v10" />
          <path d="M35 30h4M35 35h4" />
        </>
      ) : kind === 'wide' ? (
        <>
          <path d="M9 25h18l17-10v34L27 39H9zM27 25v14M17 25v14M49 21l9-6M49 32h12M49 43l9 6" />
        </>
      ) : kind === 'residual' ? (
        <>
          <path d="M11 26h42v13H11zM18 19v27M25 17v31M32 15v35M39 17v31M46 19v27M7 30v5M57 30v5" />
        </>
      ) : (
        <>
          <path d="M9 25h34v13H9zM43 29h13v5H43M19 38l-3 17h13l5-17M16 20h17M21 16v4M12 28v7M24 25v13M35 25v13" />
        </>
      )}
    </svg>
  );
}

export function SkillTree({
  levels,
  money,
  canPurchase,
  purchase,
}: {
  levels: Record<Upgrade, number>;
  money: number;
  canPurchase: boolean;
  purchase: (id: string) => boolean;
}) {
  const [selected, setSelected] = useState('heat-1'),
    [fitted, setFitted] = useState(''),
    [zoom, setZoom] = useState(0.8);
  const viewport = useRef<HTMLDivElement>(null),
    map = useRef<HTMLDivElement>(null);
  const pan = useRef(new TreePan()),
    scale = useRef(0.8),
    drag = useRef<{ id: number; x: number; y: number; time: number } | null>(
      null,
    );
  const node = SKILLS.find((n) => n.id === selected)!;
  const status = skillState(node, levels),
    cost = UPGRADES[node.key].costs[node.level - 1];
  const draw = () => {
    if (map.current)
      map.current.style.transform = `translate3d(${pan.current.x}px,${pan.current.y}px,0) scale(${scale.current})`;
  };
  const bounds = () => {
    const v = viewport.current;
    if (!v) return;
    const p = pan.current;
    p.minX = 100 - TREE.width * scale.current;
    p.maxX = v.clientWidth - 100;
    p.minY = 100 - TREE.height * scale.current;
    p.maxY = v.clientHeight - 100;
    p.clamp();
  };
  const home = () => {
    const v = viewport.current;
    if (!v) return;
    pan.current.cancel();
    pan.current.x = v.clientWidth / 2 - TREE.rootX * scale.current;
    pan.current.y = v.clientHeight - 105 - TREE.rootY * scale.current;
    bounds();
    draw();
  };
  const locate = (id: string) => {
    const n = SKILLS.find((s) => s.id === id),
      v = viewport.current;
    if (!n || !v) return;
    pan.current.cancel();
    setSelected(id);
    pan.current.x =
      v.clientWidth * (v.clientWidth > 700 ? 0.4 : 0.5) - n.x * scale.current;
    pan.current.y = v.clientHeight * 0.4 - n.y * scale.current;
    bounds();
    draw();
  };
  const zoomTo = (value: number) => {
    const v = viewport.current;
    if (!v) return;
    const z = Math.max(0.65, Math.min(1.15, value)),
      p = pan.current,
      ratio = z / scale.current;
    p.x = v.clientWidth / 2 - (v.clientWidth / 2 - p.x) * ratio;
    p.y = v.clientHeight / 2 - (v.clientHeight / 2 - p.y) * ratio;
    p.cancel();
    scale.current = z;
    setZoom(z);
    bounds();
    draw();
  };
  useEffect(() => {
    home();
    let frame = 0,
      previous = 0;
    const loop = (now: number) => {
      const moving = pan.current.vx !== 0 || pan.current.vy !== 0;
      pan.current.update(previous ? (now - previous) / 1000 : 0);
      previous = now;
      if (moving) draw();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const resize = new ResizeObserver(() => {
      bounds();
      draw();
    });
    resize.observe(viewport.current!);
    const cancel = () => {
      pan.current.cancel();
      drag.current = null;
      viewport.current?.removeAttribute('data-dragging');
    };
    window.addEventListener('blur', cancel);
    return () => {
      cancelAnimationFrame(frame);
      resize.disconnect();
      window.removeEventListener('blur', cancel);
    };
  }, []);
  const buy = (id: string) => {
    setSelected(id);
    if (purchase(id)) {
      setFitted(id);
    }
  };
  const owned = Object.values(levels).reduce((a, b) => a + b, 0);
  return (
    <div className="tree-explorer">
      <div className="tree-context">
        <span>
          {owned} / {SKILLS.length} FITTED
        </span>
        <span>
          Drag empty space to explore · Click an available node to buy
        </span>
      </div>
      {/* This map implements its own arrow-key pan and +/- zoom interaction. */}
      {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
      <div
        className="tree-viewport"
        role="application"
        ref={viewport}
        tabIndex={0}
        aria-label="Pannable skill tree. Drag empty space. Arrow keys pan, plus and minus zoom."
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest('button'))
            return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          e.currentTarget.dataset.dragging = 'true';
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            time: performance.now(),
          };
          pan.current.begin();
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const now = performance.now();
          pan.current.drag(
            e.clientX - d.x,
            e.clientY - d.y,
            (now - d.time) / 1000,
          );
          d.x = e.clientX;
          d.y = e.clientY;
          d.time = now;
          draw();
        }}
        onPointerUp={(e) => {
          if (!drag.current) return;
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
          pan.current.end(
            !!e.currentTarget.closest('.reduced-motion') ||
              matchMedia('(prefers-reduced-motion: reduce)').matches,
          );
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          pan.current.cancel();
          delete e.currentTarget.dataset.dragging;
        }}
        onLostPointerCapture={(e) => {
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
          pan.current.dragging = false;
        }}
        onWheel={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          if (e.ctrlKey) zoomTo(scale.current - e.deltaY * 0.002);
          else {
            pan.current.cancel();
            pan.current.x -= e.deltaX;
            pan.current.y -= e.deltaY;
            bounds();
            draw();
          }
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          if (
            ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
          ) {
            e.preventDefault();
            pan.current.cancel();
            pan.current.x +=
              e.key === 'ArrowLeft' ? 100 : e.key === 'ArrowRight' ? -100 : 0;
            pan.current.y +=
              e.key === 'ArrowUp' ? 100 : e.key === 'ArrowDown' ? -100 : 0;
            bounds();
            draw();
          }
          if (e.key === '+' || e.key === '=') zoomTo(scale.current + 0.1);
          if (e.key === '-') zoomTo(scale.current - 0.1);
        }}
      >
        <div
          className="tree-map"
          ref={map}
          style={{ width: TREE.width, height: TREE.height }}
        >
          <svg
            className="map-paths"
            width={TREE.width}
            height={TREE.height}
            aria-hidden="true"
          >
            {SKILLS.map((n) => {
              const p = SKILLS.find((s) => s.id === n.parent) || {
                x: TREE.rootX,
                y: TREE.rootY,
              };
              const active = skillState(n, levels) !== 'locked';
              const path = `M${p.x} ${p.y} L${n.x} ${n.y}`;
              return (
                <g
                  key={n.id}
                  className={selected === n.id ? 'inspected-path' : ''}
                >
                  <path className="map-groove" d={path} />
                  <path
                    className={`map-current ${active ? 'live' : ''} ${fitted === n.parent ? 'waking' : ''}`}
                    pathLength="1"
                    d={path}
                  />
                </g>
              );
            })}
          </svg>
          <div
            className="tree-root"
            style={{ left: TREE.rootX, top: TREE.rootY }}
          >
            <FittingDrawing kind="torch" />
            <b>YOUR TORCH</b>
            <small>Start anywhere. Make it yours.</small>
          </div>
          {(['heat', 'residual', 'tank', 'wide'] as Upgrade[]).map((key, i) => (
            <span
              className="map-branch"
              key={key}
              style={{ left: 425 + i * 330, top: 2350 }}
            >
              {key === 'heat'
                ? 'MELT FASTER'
                : key === 'residual'
                  ? 'LEAVE HEAT'
                  : key === 'tank'
                    ? 'BURN LONGER'
                    : 'SWEEP WIDER'}
            </span>
          ))}
          {SKILLS.map((n) => {
            const state = skillState(n, levels),
              price = UPGRADES[n.key].costs[n.level - 1];
            return (
              <TactileButton
                key={n.id}
                className={`map-node ${state} ${n.major ? 'milestone' : ''} ${selected === n.id ? 'selected' : ''} ${fitted === n.id ? 'bought' : ''} ${fitted === n.parent ? 'awakened' : ''} ${state === 'available' && money >= price ? 'affordable' : ''}`}
                style={{ left: n.x, top: n.y }}
                data-skill={n.id}
                aria-label={`${n.name}. ${skillEffect(n.key, n.level)}. ${state}. ${price} dollars.`}
                aria-pressed={selected === n.id}
                onPointerEnter={() => setSelected(n.id)}
                onFocus={(e) => {
                  if (!drag.current) {
                    setSelected(n.id);
                    const r = e.currentTarget.getBoundingClientRect(),
                      v = viewport.current?.getBoundingClientRect();
                    if (
                      v &&
                      (r.top < v.top ||
                        r.bottom > v.bottom ||
                        r.left < v.left ||
                        r.right > v.right)
                    )
                      locate(n.id);
                  }
                }}
                onClick={() => {
                  if (drag.current) return;
                  if (state === 'available' && canPurchase) buy(n.id);
                  else setSelected(n.id);
                }}
              >
                <span className="node-object">
                  <FittingDrawing kind={n.key} level={Math.min(n.level, 4)} />
                  <i>
                    {state === 'purchased'
                      ? '✓'
                      : state === 'locked'
                        ? '−'
                        : '+'}
                  </i>
                </span>
                {n.name}
                <small className="map-effect">
                  {skillEffect(n.key, n.level)}
                </small>
                <strong className="map-cost">
                  {state === 'purchased'
                    ? 'FITTED'
                    : `$${price.toLocaleString()}`}
                </strong>
              </TactileButton>
            );
          })}
        </div>
      </div>
      <div className="map-tools">
        <TactileButton onClick={home}>Start</TactileButton>
        <TactileButton
          onClick={() => {
            const next = SKILLS.filter(
              (n) => skillState(n, levels) === 'available',
            ).sort(
              (a, b) =>
                UPGRADES[a.key].costs[a.level - 1] -
                UPGRADES[b.key].costs[b.level - 1],
            );
            const index = next.findIndex((n) => n.id === selected);
            if (next.length) locate(next[(index + 1) % next.length].id);
          }}
        >
          Next upgrade
        </TactileButton>
        <TactileButton aria-label="Zoom out" onClick={() => zoomTo(zoom - 0.1)}>
          −
        </TactileButton>
        <span>{Math.round(zoom * 100)}%</span>
        <TactileButton aria-label="Zoom in" onClick={() => zoomTo(zoom + 0.1)}>
          +
        </TactileButton>
      </div>
      <aside
        className={`skill-detail ${node.major ? 'is-milestone' : ''}`}
        aria-live="polite"
      >
        <span className="detail-tier">
          {node.major ? 'MILESTONE' : 'UPGRADE'} · {node.level} /{' '}
          {UPGRADES[node.key].costs.length}
        </span>
        <h3 key={node.id}>{node.name}</h3>
        <p>{skillDescription(node)}</p>
        <div className="detail-change" key={`${node.id}-${levels[node.key]}`}>
          <span>{skillEffect(node.key, levels[node.key])}</span>
          <b>→</b>
          <strong>
            {skillEffect(node.key, Math.max(levels[node.key], node.level))}
          </strong>
        </div>
        <small>
          {status === 'locked'
            ? `Requires ${SKILLS.find((n) => n.id === node.parent)?.name}`
            : status === 'purchased'
              ? '✓ Fitted permanently'
              : `Unlocks ${SKILLS.find((n) => n.parent === node.id)?.name || 'the full branch'}`}
        </small>
        <TactileButton
          className={`tree-buy ${status === 'available' && money >= cost ? 'can-buy' : ''}`}
          disabled={status !== 'available' || !canPurchase}
          onClick={() => buy(node.id)}
        >
          {status === 'purchased'
            ? 'Fitted'
            : status === 'locked'
              ? 'Locked'
              : money >= cost
                ? `Buy · $${cost.toLocaleString()}`
                : `Need $${(cost - money).toLocaleString()}`}
        </TactileButton>
        {fitted === node.id && (
          <span className="purchase-snow" key={fitted} aria-hidden="true">
            <i /><i /><i /><i /><i />
          </span>
        )}
      </aside>
    </div>
  );
}
