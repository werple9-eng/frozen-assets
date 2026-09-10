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
  nodeComparison,
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
import { UpgradeGlyph } from './upgrade-glyph';
import {
  TREE_GROWTH,
  growthPlan,
  connectedNode,
  tooltipPosition,
} from '@/lib/game/tree-presentation';
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
    canonicalTool(props.requestedTool ?? props.equipment?.selected ?? 'hand'),
  );
  const [leaving, setLeaving] = useState(false),
    timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const known = (id: MajorTool) =>
    id === 'hand' ||
    (!props.equipment
      ? false
      : props.equipment.revealed.includes(id) ||
        props.equipment.owned.some((t) => canonicalTool(t) === id));
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
    const choices = TOOL_ORDER.filter(
      (id) =>
        !props.equipment ||
        props.equipment.owned.some((t) => canonicalTool(t) === id),
    );
    if (!choices.length) return;
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
type Growth = {
  id: string;
  revealed: boolean;
  major: boolean;
  changes: ReturnType<typeof growthPlan>;
};
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
      page === 'hand' ||
      !equipment ||
      equipment.owned.some((t) => canonicalTool(t) === page),
    tool = TOOLS.find((t) => t.id === page)!;
  const viewport = useRef<HTMLDivElement>(null),
    map = useRef<HTMLDivElement>(null),
    tip = useRef<HTMLElement>(null);
  const pan = useRef(new TreePan()),
    zoom = useRef(new Spring(savedView?.zoom ?? 0.88, 220, 30));
  const [targetZoom, setTargetZoom] = useState(savedView?.zoom ?? 0.88),
    [inspection, setInspection] = useState<string | null>(null),
    [growth, setGrowth] = useState<Growth[]>([]);
  const growthTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const suppressedClick = useRef(false);
  useEffect(() => () => growthTimers.current.forEach(clearTimeout), []);
  const presentationState = (n: ToolNode) => {
    const pending = growth
      .filter((g) => !g.revealed)
      .flatMap((g) => g.changes)
      .find((c) => c.id === n.id);
    return pending?.from ?? nodeState(n, owned);
  };
  const selected = useRef<string | null>(null),
    drag = useRef<{
      id: number;
      x: number;
      y: number;
      startX: number;
      startY: number;
      time: number;
      active: boolean;
    } | null>(null),
    anchor = useRef({ x: 0, y: 0 });
  const travel = useRef<{ x: Spring; y: Spring } | null>(null);
  const ownership = useRef({
    hover: null as string | null,
    focus: null as string | null,
    touch: null as string | null,
  });
  const pointerKind = useRef('mouse');
  const pointerPressed = useRef(false),
    focusOwner = useRef<HTMLElement | null>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [closing, setClosing] = useState(false);
  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );
  const inspect = (id: string | null) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = null;
    setClosing(false);
    selected.current = id;
    setInspection(id);
  };
  const reconcileInspection = () => {
    const o = ownership.current;
    // Disabling the Buy button can remove native focus without a React blur.
    // A remembered id is not proof that anything still owns keyboard focus.
    if (
      o.focus &&
      (!focusOwner.current?.isConnected ||
        document.activeElement !== focusOwner.current ||
        focusOwner.current.matches(':disabled'))
    ) {
      o.focus = null;
      focusOwner.current = null;
    }
    const id = o.hover ?? o.focus ?? o.touch;
    if (id) {
      inspect(id);
      return;
    }
    if (closeTimer.current) return;
    setClosing(true);
    closeTimer.current = setTimeout(() => {
      closeTimer.current = null;
      inspect(null);
    }, 110);
  };
  const reconcileFrame = useEffectEvent(reconcileInspection);
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
        const neighbors = list
          .filter(
            (n) => n.id !== node.id && nodeState(n, owned) === 'available',
          )
          .map((n) => ({
            x: pan.current.x + n.x * zoom.current.value,
            y: pan.current.y + n.y * zoom.current.value,
          }));
        const pos = tooltipPosition(
          { x, y },
          neighbors,
          { w, h },
          { w: v.clientWidth, h: v.clientHeight },
          (node.major ? 44 : 32) * zoom.current.value,
        );
        panel.style.setProperty('--tip-x', `${pos.x}px`);
        panel.style.setProperty('--tip-y', `${pos.y}px`);
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
    if (
      pointerKind.current !== 'keyboard' &&
      !e.currentTarget.matches(':focus-visible')
    )
      return;
    const r = e.currentTarget.getBoundingClientRect(),
      v = viewport.current!.getBoundingClientRect();
    if (
      r.top < v.top + 160 ||
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
      // Covers native disabled-focus loss, removed nodes, and focus repair by
      // the surrounding dialog. Neither a purchase nor a render pins a tip.
      if (
        ownership.current.focus &&
        (document.activeElement !== focusOwner.current ||
          !focusOwner.current?.isConnected ||
          focusOwner.current.matches(':disabled'))
      )
        reconcileFrame();
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    const cancel = () => {
      p.cancel();
      drag.current = null;
      pointerPressed.current = false;
      focusOwner.current = null;
      ownership.current = { hover: null, focus: null, touch: null };
      reconcileFrame();
      v.removeAttribute('data-dragging');
    };
    const pointer = (e: PointerEvent) => {
      pointerKind.current = e.pointerType || 'mouse';
      if (e.type === 'pointerdown') pointerPressed.current = true;
      // Mouse movement takes over from keyboard inspection, including when
      // Chrome retains :focus-visible on a previously keyboard-focused node.
      ownership.current.focus = null;
      focusOwner.current = null;
      if (e.pointerType !== 'touch') {
        ownership.current.touch = null;
        const target = e.target instanceof Element ? e.target : null,
          button = target?.closest<HTMLElement>('.map-node'),
          panel = tip.current;
        ownership.current.hover =
          button && map.current?.contains(button)
            ? (button.dataset.skill ?? null)
            : target && panel?.contains(target)
              ? selected.current
              : null;
      }
      reconcileFrame();
    };
    const pointerUp = () => {
      pointerPressed.current = false;
    };
    const keyInput = () => {
      pointerKind.current = 'keyboard';
      pointerPressed.current = false;
    };
    const outside = (e: PointerEvent) => {
      if (!e.relatedTarget) cancel();
    };
    const visibility = () => {
      if (document.hidden) cancel();
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
    document.addEventListener('pointermove', pointer, true);
    document.addEventListener('pointerdown', pointer, true);
    document.addEventListener('pointerup', pointerUp, true);
    document.addEventListener('pointercancel', cancel, true);
    document.addEventListener('pointerout', outside, true);
    document.addEventListener('keydown', keyInput, true);
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('recovery:map-action', controller);
    return () => {
      saveView({ x: p.x, y: p.y, zoom: zoomSpring.target });
      cancelAnimationFrame(frame);
      v.removeEventListener('wheel', wheel);
      window.removeEventListener('blur', cancel);
      document.removeEventListener('pointermove', pointer, true);
      document.removeEventListener('pointerdown', pointer, true);
      document.removeEventListener('pointerup', pointerUp, true);
      document.removeEventListener('pointercancel', cancel, true);
      document.removeEventListener('pointerout', outside, true);
      document.removeEventListener('keydown', keyInput, true);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('recovery:map-action', controller);
    };
  }, []);

  const node = list.find((n) => n.id === inspection),
    state = node ? presentationState(node) : null;
  const buy = (id: string) => {
    const n = list.find((n) => n.id === id);
    if (!n || presentationState(n) !== 'available' || !canPurchase) return;
    const changes = growthPlan(page, id, owned);
    if (!purchase(id, page)) return;
    const reduced =
      !!viewport.current?.closest('.reduced-motion') ||
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    setGrowth((g) => [...g, { id, revealed: false, major: n.major, changes }]);
    growthTimers.current.push(
      setTimeout(
        () =>
          setGrowth((g) =>
            g.map((e) => (e.id === id ? { ...e, revealed: true } : e)),
          ),
        TREE_GROWTH.revealAt,
      ),
    );
    growthTimers.current.push(
      setTimeout(
        () => setGrowth((g) => g.filter((e) => e.id !== id)),
        TREE_GROWTH.settleAt,
      ),
    );
  };
  const spatial = (e: React.KeyboardEvent, id: string) => {
    const dx = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0,
      dy = e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : 0;
    if (!dx && !dy) return;
    e.preventDefault();
    e.stopPropagation();
    const next = connectedNode(page, id, dx, dy);
    if (next)
      map.current
        ?.querySelector<HTMLButtonElement>(`[data-skill="${next}"]`)
        ?.focus();
  };
  return (
    <div
      className={`upgrade-world radial-world tree-context tool-map-${page} ${ownTool ? '' : 'tool-unowned'} ${growth.some((g) => g.major) ? 'major-growing' : ''}`}
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
        onClickCapture={(e) => {
          if (suppressedClick.current) {
            suppressedClick.current = false;
            if (e.detail !== 0) {
              e.preventDefault();
              e.stopPropagation();
            }
          }
        }}
        onClick={(e) => {
          if (!(e.target as HTMLElement).closest('button')) {
            ownership.current = { hover: null, focus: null, touch: null };
            reconcileInspection();
          }
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const onNode = !!(e.target as HTMLElement).closest('button');
          if (!onNode) {
            e.preventDefault();
            e.currentTarget.setPointerCapture(e.pointerId);
          }
          suppressedClick.current = false;
          travel.current = null;
          pan.current.begin();
          if (!onNode) {
            ownership.current = { hover: null, focus: null, touch: null };
            inspect(null);
          }
          drag.current = {
            id: e.pointerId,
            x: e.clientX,
            y: e.clientY,
            startX: e.clientX,
            startY: e.clientY,
            time: e.timeStamp,
            active: !onNode,
          };
          if (!onNode) e.currentTarget.dataset.dragging = 'true';
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          if (!d.active) {
            if (Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 7)
              return;
            d.active = true;
            suppressedClick.current = true;
            ownership.current = { hover: null, focus: null, touch: null };
            inspect(null);
            e.currentTarget.setPointerCapture(e.pointerId);
            e.currentTarget.dataset.dragging = 'true';
          }
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
          if (!d || d.id !== e.pointerId) return;
          if (e.timeStamp - d.time > 90) pan.current.vx = pan.current.vy = 0;
          drag.current = null;
          delete e.currentTarget.dataset.dragging;
          if (d.active)
            pan.current.end(!!e.currentTarget.closest('.reduced-motion'));
          else pan.current.cancel();
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
            {list.map((n) => {
              const event = growth.find((g) => g.id === n.id),
                state = presentationState(n);
              const reveal = growth.some(
                (g) => g.revealed && g.changes.some((c) => c.id === n.id),
              );
              return (
                <g
                  key={n.id}
                  style={
                    {
                      '--branch': BRANCH_COLORS[n.branch],
                      '--path-delay': `${TREE_GROWTH.pathDelay}ms`,
                      '--path-duration': `${TREE_GROWTH.pathDuration}ms`,
                    } as CSSProperties
                  }
                >
                  <path
                    d={treeLink(n)}
                    pathLength="1"
                    className={`map-current ${event ? 'available' : state} ${inspection === n.id ? 'inspected' : ''} ${reveal ? 'path-revealed' : ''}`}
                  />
                  {event && (
                    <path
                      d={treeLink(n)}
                      pathLength="1"
                      className="map-current purchased purchase-travel"
                    />
                  )}
                </g>
              );
            })}
          </svg>
          <TactileButton
            data-skill="root"
            className="map-tool purchased"
            style={{ left: TREE.rootX, top: TREE.rootY }}
            aria-label={`${tool.name}, owned. Equip tool.`}
            onClick={() => equipment?.equip(page)}
            onFocus={(e) => focus(e, TREE.rootX, TREE.rootY)}
            onKeyDown={(e) => spatial(e, 'root')}
          >
            <ToolGlyph id={page} />
          </TactileButton>
          {list.map((n) => {
            const state = presentationState(n),
              unknown = state === 'unknown';
            const bought = growth.some((g) => g.id === n.id),
              child = growth.some(
                (g) =>
                  g.revealed && g.changes.some((c) => c.id === n.id && c.child),
              ),
              teased = growth.some(
                (g) =>
                  g.revealed &&
                  g.changes.some((c) => c.id === n.id && !c.child),
              );
            return (
              <button
                type="button"
                key={n.id}
                data-skill={n.id}
                hidden={state === 'hidden'}
                className={`map-node engraved-node ${state} ${n.major ? 'milestone' : ''} ${inspection === n.id ? 'selected' : ''} ${state === 'available' && money >= n.cost ? 'affordable' : ''} ${bought ? 'fitting' : ''} ${child ? 'child-revealed' : ''} ${teased ? 'tease-revealed' : ''}`}
                style={
                  {
                    left: n.x,
                    top: n.y,
                    '--branch': BRANCH_COLORS[n.branch],
                    '--entry-delay': `${45 + n.rank * 24}ms`,
                  } as CSSProperties
                }
                aria-label={
                  unknown
                    ? 'Unknown upgrade. Keep upgrading this branch.'
                    : `${n.name}. ${state}. ${n.cost} dollars.`
                }
                aria-pressed={state === 'purchased'}
                onPointerEnter={(e) => {
                  if (e.pointerType === 'touch') return;
                  ownership.current.hover = n.id;
                  if (!drag.current?.active) reconcileInspection();
                }}
                onPointerLeave={() => {
                  if (ownership.current.hover === n.id)
                    ownership.current.hover = null;
                  reconcileInspection();
                }}
                onPointerDown={(e) => {
                  pointerKind.current = e.pointerType;
                  ownership.current.focus = null;
                  ownership.current.touch = null;
                  if (e.pointerType === 'touch') ownership.current.hover = null;
                }}
                onFocus={(e) => {
                  if (
                    !pointerPressed.current &&
                    (pointerKind.current === 'keyboard' ||
                      e.currentTarget.matches(':focus-visible'))
                  ) {
                    ownership.current.hover = null;
                    ownership.current.focus = n.id;
                    focusOwner.current = e.currentTarget;
                    reconcileInspection();
                  }
                  focus(e, n.x, n.y);
                }}
                onBlur={() => {
                  if (ownership.current.focus === n.id)
                    ownership.current.focus = null;
                  reconcileInspection();
                }}
                onKeyDown={(e) => spatial(e, n.id)}
                onClick={(e) => {
                  if (pointerKind.current === 'touch' && e.detail !== 0) {
                    ownership.current.touch = n.id;
                    inspect(n.id);
                    return;
                  }
                  if (
                    e.detail === 0 &&
                    document.activeElement === e.currentTarget &&
                    (pointerKind.current === 'keyboard' ||
                      e.currentTarget.matches(':focus-visible'))
                  ) {
                    ownership.current.focus = n.id;
                    focusOwner.current = e.currentTarget;
                  }
                  reconcileInspection();
                  if (state === 'available' && canPurchase) buy(n.id);
                }}
              >
                <span className="node-entry">
                  <span className="node-arrival">
                    <span className="node-spring">
                      <span className="node-face">
                        {unknown ? (
                          <span className="node-question">?</span>
                        ) : (
                          <UpgradeGlyph
                            key={state === 'purchased' ? 'fitted' : 'unfitted'}
                            node={n}
                          />
                        )}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
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
          className={`map-inspection skill-detail node-tooltip ${closing ? 'closing' : ''}`}
          onPointerEnter={(e) => {
            if (e.pointerType !== 'touch') {
              ownership.current.hover = node.id;
              reconcileInspection();
            }
          }}
          onPointerLeave={() => {
            ownership.current.hover = null;
            reconcileInspection();
          }}
          onPointerDown={() => {
            ownership.current.focus = null;
          }}
          onFocus={(e) => {
            if (
              !pointerPressed.current &&
              (pointerKind.current === 'keyboard' ||
                (e.target as HTMLElement).matches(':focus-visible'))
            ) {
              ownership.current.focus = node.id;
              focusOwner.current = e.target as HTMLElement;
              reconcileInspection();
            }
          }}
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget)) {
              ownership.current.focus = null;
              reconcileInspection();
            }
          }}
          key={node.id}
          aria-live="polite"
        >
          <h3>{state === 'unknown' ? 'Unknown upgrade' : node.name}</h3>
          <p>
            {state === 'unknown'
              ? 'Keep upgrading this branch to discover more.'
              : node.description}
          </p>
          {state !== 'unknown' && (
            <strong>{nodeComparison(node, owned)}</strong>
          )}
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
