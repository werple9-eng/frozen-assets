'use client';
/* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex -- Spatial keyboard and controller map. */
import {
  useEffect,
  useEffectEvent,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { TOOLS, type ToolId } from '@/lib/game/campaign-content';
import {
  MAP as TREE,
  TOOL_ORDER,
  TOOL_TREES,
  BRANCH_COLORS,
  canonicalTool,
  nodeState,
  treeLink,
  type MajorTool,
  type ToolNodesOwned,
  type ToolNode,
} from '@/lib/game/tool-trees';
import { TreePan } from '@/lib/game/pan';
import { Spring } from '@/lib/game/motion';
import { TactileButton } from './tactile';
import { ToolGlyph } from './tool-selector';
import { ToolDisplay } from './tool-display';
import { SpringNumber } from './motion';
import { ZoomSlider } from './zoom-slider';
export type MapView = { x: number; y: number; zoom: number };
export type ToolMapViews = Partial<Record<ToolId, MapView>>;
type Props = {
  nodes: ToolNodesOwned;
  money: number;
  canPurchase: boolean;
  purchase: (id: string, tool: ToolId) => boolean;
  savedViews: ToolMapViews;
  remember: (tool: ToolId, view: MapView) => void;
  requestedTool?: ToolId;
  equipment?: {
    block: number;
    owned: ToolId[];
    revealed: MajorTool[];
    selected: ToolId;
    buy: (id: ToolId) => boolean;
    equip: (id: ToolId) => boolean;
  };
};
const MIN_ZOOM = 0.42,
  MAX_ZOOM = 1.65;
const short: Record<MajorTool, string> = {
  hand: 'Chisel',
  pick: 'Ice pick',
  heavy: 'Heavy pick',
  sledge: 'Sledge',
  breaker: 'Breaker',
  thermal: 'Thermal',
};
export function SkillTree(props: Props) {
  const [page, setPage] = useState<MajorTool>(
    canonicalTool(
      props.requestedTool ?? props.equipment?.selected ?? 'thermal',
    ),
  );
  const [leaving, setLeaving] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const known = (id: MajorTool) =>
    !props.equipment
      ? id === 'thermal'
      : props.equipment.revealed.includes(id) ||
        props.equipment.owned.some((t) => canonicalTool(t) === id);
  const switchPage = (id: MajorTool) => {
    if (id === page || !known(id)) return;
    if (timer.current) clearTimeout(timer.current);
    setLeaving(true);
    timer.current = setTimeout(() => {
      setPage(id);
      setLeaving(false);
    }, 110);
  };
  const switchDirection = (direction: number) => {
    const choices = TOOL_ORDER.filter(known);
    switchPage(
      choices[
        (choices.indexOf(page) + direction + choices.length) % choices.length
      ],
    );
  };
  const switchEvent = useEffectEvent(switchDirection);
  useEffect(() => {
    const change = (e: Event) =>
      switchEvent((e as CustomEvent).detail.direction);
    window.addEventListener('recovery:tree-tool', change);
    return () => {
      window.removeEventListener('recovery:tree-tool', change);
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);
  return (
    <>
      <nav className="tool-page-tabs" aria-label="Tool upgrade pages">
        {TOOL_ORDER.map((id, i) => (
          <TactileButton
            key={id}
            aria-pressed={id === page}
            aria-disabled={!known(id)}
            aria-label={
              known(id)
                ? `${TOOLS.find((t) => t.id === id)!.name} upgrades`
                : `Unknown tool ${i + 1}`
            }
            title={
              known(id)
                ? short[id]
                : 'New tool — keep progressing to discover it.'
            }
            onClick={() => switchPage(id)}
            onKeyDown={(e) => {
              if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                e.preventDefault();
                switchDirection(e.key === 'ArrowRight' ? 1 : -1);
              }
            }}
          >
            {known(id) ? (
              <>
                <ToolGlyph id={id} />
                <span>{short[id]}</span>
              </>
            ) : (
              <span className="unknown-tool">?</span>
            )}
          </TactileButton>
        ))}
      </nav>
      <div
        className="tree-funds"
        aria-label={`Recovered funds: ${props.money} dollars`}
      >
        <SpringNumber value={props.money} />
      </div>
      <div className={`tool-tree-stage ${leaving ? 'leaving' : ''}`}>
        <ToolPage
          key={`${page}-${props.equipment?.owned.some((t) => canonicalTool(t) === page)}`}
          {...props}
          page={page}
          savedView={props.savedViews[page]}
          remember={(view) => props.remember(page, view)}
        />
      </div>
    </>
  );
}
function NodeGlyph({ node }: { node: ToolNode }) {
  return (
    <span className={`node-glyph branch-${node.branch}`}>
      <ToolGlyph id={node.toolId} />
      <svg
        viewBox="0 0 32 32"
        className="node-mark"
        aria-hidden="true"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        {node.branch === 'power' ? (
          <path d="M8 24L18 5l-1 11h8L12 28l3-11" />
        ) : node.branch === 'speed' ? (
          <path d="M5 9h20M3 16h17M7 23h16" />
        ) : node.branch === 'control' ? (
          <path d="M4 12V4h8M20 4h8v8M28 20v8h-8M12 28H4v-8M13 16h6M16 13v6" />
        ) : (
          <path d="M16 3l-4 11 9 6-6 10M12 14l-8-4M21 20l8-7" />
        )}
      </svg>
    </span>
  );
}
function ToolPage({
  page,
  nodes,
  money,
  canPurchase,
  purchase,
  equipment,
  savedView,
  remember,
}: Omit<Props, 'remember'> & {
  page: MajorTool;
  savedView?: MapView;
  remember: (view: MapView) => void;
}) {
  const list = TOOL_TREES[page],
    owned = nodes[page],
    ownTool =
      !equipment || equipment.owned.some((t) => canonicalTool(t) === page),
    tool = TOOLS.find((t) => t.id === page)!;
  const viewport = useRef<HTMLDivElement>(null),
    map = useRef<HTMLDivElement>(null),
    tip = useRef<HTMLElement>(null);
  const pan = useRef(new TreePan()),
    zoom = useRef(new Spring(savedView?.zoom ?? 0.88, 220, 30));
  const [targetZoom, setTargetZoom] = useState(savedView?.zoom ?? 0.88),
    [inspection, setInspection] = useState<string | null>(null),
    [fitted, setFitted] = useState('');
  const selected = useRef<string | null>(null),
    drag = useRef<{ id: number; x: number; y: number; time: number } | null>(
      null,
    ),
    anchor = useRef({ x: 0, y: 0 });
  const travel = useRef<{ x: Spring; y: Spring } | null>(null);
  const inspect = (id: string | null) => {
    selected.current = id;
    setInspection(id);
  };
  const draw = () => {
    if (map.current) {
      map.current.style.transform = `translate3d(${pan.current.x}px,${pan.current.y}px,0) scale(${zoom.current.value})`;
      const node = list.find((n) => n.id === selected.current),
        panel = tip.current,
        v = viewport.current;
      if (node && panel && v) {
        const x = pan.current.x + node.x * zoom.current.value,
          y = pan.current.y + node.y * zoom.current.value,
          w = panel.offsetWidth,
          h = panel.offsetHeight;
        panel.style.setProperty(
          '--tip-x',
          `${Math.max(18, Math.min(v.clientWidth - w - 18, x + 45 + w < v.clientWidth - 62 ? x + 45 : x - 45 - w))}px`,
        );
        panel.style.setProperty(
          '--tip-y',
          `${Math.max(152, Math.min(v.clientHeight - h - 96, y - h * 0.4))}px`,
        );
      }
      map.current.dataset.zoom = zoom.current.value.toFixed(4);
      map.current.dataset.targetZoom = zoom.current.target.toFixed(4);
    }
  };
  const drawFrame = useEffectEvent(draw);
  const bounds = () => {
    const v = viewport.current,
      p = pan.current;
    if (!v) return;
    p.minX = 160 - TREE.width * zoom.current.value;
    p.maxX = v.clientWidth - 160;
    p.minY = 160 - TREE.height * zoom.current.value;
    p.maxY = v.clientHeight - 160;
  };
  const zoomTo = (z: number, x?: number, y?: number) => {
    const v = viewport.current;
    if (!v) return;
    anchor.current = { x: x ?? v.clientWidth / 2, y: y ?? v.clientHeight / 2 };
    zoom.current.target = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));
    setTargetZoom(zoom.current.target);
    travel.current = null;
  };
  const locate = (x: number, y: number) => {
    const v = viewport.current!;
    pan.current.cancel();
    const t = travel.current ?? {
      x: new Spring(pan.current.x, 170, 26),
      y: new Spring(pan.current.y, 170, 26),
    };
    t.x.target = v.clientWidth / 2 - x * zoom.current.value;
    t.y.target = v.clientHeight * 0.52 - y * zoom.current.value;
    travel.current = t;
  };
  const focus = (
    e: React.FocusEvent<HTMLButtonElement>,
    x: number,
    y: number,
  ) => {
    const r = e.currentTarget.getBoundingClientRect(),
      v = viewport.current!.getBoundingClientRect();
    if (
      r.top < v.top + 100 ||
      r.bottom > v.bottom - 110 ||
      r.left < v.left + 90 ||
      r.right > v.right - 90
    )
      locate(x, y);
  };
  const saveView = useEffectEvent(remember);
  const initialView = useEffectEvent(() => savedView);
  useEffect(() => {
    const v = viewport.current!,
      p = pan.current;
    const savedView = initialView(),
      zoomSpring = zoom.current;
    p.x = savedView?.x ?? v.clientWidth / 2 - TREE.rootX * zoom.current.value;
    p.y =
      savedView?.y ?? v.clientHeight * 0.5 - TREE.rootY * zoom.current.value;
    anchor.current = { x: v.clientWidth / 2, y: v.clientHeight / 2 };
    bounds();
    drawFrame();
    let frame = 0,
      last = 0;
    const loop = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
      last = now;
      const old = zoom.current.value;
      zoom.current.step(dt, !!v.closest('.reduced-motion'));
      const ratio = zoom.current.value / old,
        a = anchor.current;
      p.x = a.x - (a.x - p.x) * ratio;
      p.y = a.y - (a.y - p.y) * ratio;
      bounds();
      if (travel.current) {
        p.x = travel.current.x.step(dt);
        p.y = travel.current.y.step(dt);
        if (!travel.current.x.moving && !travel.current.y.moving)
          travel.current = null;
      } else p.update(dt);
      drawFrame();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const cancel = () => {
      p.cancel();
      drag.current = null;
      v.removeAttribute('data-dragging');
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      const r = v.getBoundingClientRect();
      zoomTo(
        zoom.current.target * Math.exp(-e.deltaY * 0.0014),
        e.clientX - r.left,
        e.clientY - r.top,
      );
    };
    const controller = (event: Event) => {
      const { x = 0, y = 0, zoom: dz = 0 } = (event as CustomEvent).detail;
      travel.current = null;
      p.cancel();
      p.x -= x;
      p.y -= y;
      if (dz) zoomTo(zoom.current.target + dz);
    };
    v.addEventListener('wheel', wheel, { passive: false });
    window.addEventListener('blur', cancel);
    window.addEventListener('recovery:map-action', controller);
    return () => {
      saveView({ x: p.x, y: p.y, zoom: zoomSpring.target });
      cancelAnimationFrame(frame);
      v.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', cancel);
      window.removeEventListener('recovery:map-action', controller);
    };
  }, []);

  const node = list.find((n) => n.id === inspection),
    state = node ? nodeState(node, owned) : null;
  const buy = (id: string) => {
    if (purchase(id, page)) setFitted(id);
  };
  const spatial = (e: React.KeyboardEvent, x: number, y: number) => {
    const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0,
      dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    e.stopPropagation();
    const candidates = [{ id: 'root', x: TREE.rootX, y: TREE.rootY }, ...list]
      .filter((n) => (n.x - x) * dx + (n.y - y) * dy > 1)
      .sort((a, b) => {
        const score = (n: { x: number; y: number }) => {
          const xx = n.x - x,
            yy = n.y - y;
          return (
            Math.hypot(xx, yy) *
            (1 + Math.abs(xx * dy - yy * dx) / Math.max(1, xx * dx + yy * dy))
          );
        };
        return score(a) - score(b);
      });
    const next = candidates[0];
    if (next)
      map.current
        ?.querySelector<HTMLButtonElement>(`[data-skill="${next.id}"]`)
        ?.focus();
  };
  return (
    <div
      className={`upgrade-world radial-world tree-context ${ownTool ? '' : 'tool-unowned'}`}
    >
      {!ownTool && (
        <section className="tool-inspection">
          <ToolDisplay tool={page} />
          <div>
            <small>WORKSHOP EQUIPMENT</small>
            <h2>{tool.name}</h2>
            <p>{tool.description}</p>
            <div className="equipment-price">
              <span>
                PRICE <strong>${tool.cost.toLocaleString()}</strong>
              </span>
              <span>
                YOU HAVE <SpringNumber value={money} />
              </span>
            </div>
            <TactileButton
              disabled={money < tool.cost || !canPurchase}
              onClick={() => equipment?.buy(page)}
            >
              {money < tool.cost
                ? `Need $${(tool.cost - money).toLocaleString()} more`
                : `Buy ${short[page]} · $${tool.cost.toLocaleString()}`}
            </TactileButton>
          </div>
        </section>
      )}
      <div
        ref={viewport}
        className="tree-viewport"
        hidden={!ownTool}
        role="application"
        tabIndex={0}
        aria-label="Upgrade map. Drag to explore, wheel to zoom, arrow keys to pan."
        onPointerDown={(e) => {
          if (e.button !== 0 || (e.target as HTMLElement).closest('button'))
            return;
          e.preventDefault();
          e.currentTarget.setPointerCapture(e.pointerId);
          travel.current = null;
          pan.current.begin();
          inspect(null);
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            time: e.timeStamp,
          };
          e.currentTarget.dataset.dragging = 'true';
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const now = e.timeStamp;
          pan.current.drag(
            e.clientX - d.x,
            e.clientY - d.y,
            (now - d.time) / 1000,
          );
          Object.assign(d, { x: e.clientX, y: e.clientY, time: now });
          draw();
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          if (!d) return;
          if (e.timeStamp - d.time > 90) pan.current.vx = pan.current.vy = 0;
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
          pan.current.end(!!e.currentTarget.closest('.reduced-motion'));
        }}
        onPointerCancel={(e) => {
          drag.current = null;
          pan.current.cancel();
          delete e.currentTarget.dataset.dragging;
        }}
        onLostPointerCapture={(e) => {
          if (drag.current) {
            drag.current = null;
            pan.current.cancel();
          }
          delete e.currentTarget.dataset.dragging;
        }}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return;
          const dx =
              e.key === 'ArrowLeft' ? 100 : e.key === 'ArrowRight' ? -100 : 0,
            dy = e.key === 'ArrowUp' ? 100 : e.key === 'ArrowDown' ? -100 : 0;
          if (dx || dy) {
            e.preventDefault();
            travel.current = null;
            pan.current.cancel();
            pan.current.x += dx;
            pan.current.y += dy;
          }
          if (e.key === 'Home') {
            e.preventDefault();
            locate(TREE.rootX, TREE.rootY);
          }
        }}
      >
        <div
          ref={map}
          className="tree-map"
          style={{ width: TREE.width, height: TREE.height }}
        >
          <svg
            className="map-paths"
            width={TREE.width}
            height={TREE.height}
            aria-hidden="true"
          >
            {list.map((n) => (
              <path
                key={n.id}
                d={treeLink(n)}
                pathLength="1"
                style={{ '--branch': BRANCH_COLORS[n.branch] } as CSSProperties}
                className={`map-current ${nodeState(n, owned)} ${fitted === n.id ? 'waking' : ''}`}
              />
            ))}
          </svg>
          <TactileButton
            data-skill="root"
            className="map-tool purchased"
            style={{ left: TREE.rootX, top: TREE.rootY }}
            aria-label={`${tool.name}, owned. Equip tool.`}
            onClick={() => equipment?.equip(page)}
            onKeyDown={(e) => spatial(e, TREE.rootX, TREE.rootY)}
          >
            <ToolGlyph id={page} />
          </TactileButton>
          {list.map((n) => {
            const state = nodeState(n, owned),
              unknown = state === 'unknown';
            return (
              <TactileButton
                key={n.id}
                data-skill={n.id}
                className={`map-node ${state} ${n.major ? 'milestone' : ''} ${inspection === n.id ? 'selected' : ''} ${state === 'available' && money >= n.cost ? 'affordable' : ''} ${fitted === n.id ? 'bought' : ''} ${n.parentIds.includes(fitted) ? 'awakened' : ''}`}
                style={
                  {
                    left: n.x,
                    top: n.y,
                    '--branch': BRANCH_COLORS[n.branch],
                  } as CSSProperties
                }
                aria-label={
                  unknown
                    ? 'Unknown upgrade. Keep upgrading this branch.'
                    : `${n.name}. ${state}. ${n.cost} dollars.`
                }
                aria-pressed={state === 'purchased'}
                onPointerEnter={() => inspect(n.id)}
                onFocus={(e) => {
                  inspect(n.id);
                  focus(e, n.x, n.y);
                }}
                onKeyDown={(e) => spatial(e, n.x, n.y)}
                onClick={() => {
                  inspect(n.id);
                  if (state === 'available' && canPurchase) buy(n.id);
                }}
              >
                <span className="node-face">
                  {unknown ? (
                    <span className="node-question">?</span>
                  ) : (
                    <NodeGlyph node={n} />
                  )}
                </span>
              </TactileButton>
            );
          })}
          <div
            className="map-origin"
            style={{ left: TREE.rootX, top: TREE.rootY + 72 }}
          >
            {short[page]}
          </div>
        </div>
      </div>
      {ownTool && (
        <ZoomSlider
          label="Upgrades zoom"
          value={(targetZoom - MIN_ZOOM) / (MAX_ZOOM - MIN_ZOOM)}
          onChange={(v) => zoomTo(MIN_ZOOM + v * (MAX_ZOOM - MIN_ZOOM))}
        />
      )}
      {node && ownTool && (
        <aside
          ref={tip}
          className="map-inspection skill-detail node-tooltip"
          key={node.id}
          aria-live="polite"
        >
          <h3>{state === 'unknown' ? 'Unknown upgrade' : node.name}</h3>
          <p>
            {state === 'unknown'
              ? 'Keep upgrading this branch to discover more.'
              : node.description}
          </p>
          {state !== 'unknown' && <strong>{node.comparison}</strong>}
          <TactileButton
            className="tree-buy"
            disabled={
              state !== 'available' || !canPurchase || money < node.cost
            }
            onClick={() => buy(node.id)}
          >
            {state === 'purchased'
              ? 'Fitted'
              : state === 'unknown'
                ? 'Undiscovered'
                : state === 'locked'
                  ? `Requires ${list.find((n) => node.parentIds.includes(n.id))?.name}`
                  : `${money < node.cost ? 'Need' : 'Buy'} $${(money < node.cost ? node.cost - money : node.cost).toLocaleString()}`}
          </TactileButton>
        </aside>
      )}
    </div>
  );
}
