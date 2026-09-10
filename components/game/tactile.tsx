'use client';
import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { Spring } from '@/lib/game/motion';

// The outer button never moves. Only its visual surface and individual letters
// spring toward the pointer, so a press cannot move its own hit target.
export function TactileButton({
  children,
  className = '',
  onClick,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  onPointerDown,
  onPointerUp,
  onFocus,
  onBlur,
  onKeyDown,
  onKeyUp,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const button = useRef<HTMLButtonElement>(null),
    face = useRef<HTMLSpanElement>(null);
  const press = useRef({ x: 0, y: 0, moved: false });
  const labelIdentity = Children.toArray(children)
    .filter((c) => typeof c === 'string')
    .join('|');
  const motion = useRef({
    frame: 0,
    time: 0,
    hover: false,
    focused: false,
    down: false,
    px: 0,
    py: 0,
    x: 0,
    y: 0,
    vx: 0,
    vy: 0,
    sx: 1,
    sy: 1,
    vsx: 0,
    vsy: 0,
    letters: [] as Spring[],
    springs: [
      new Spring(0, 280, 20),
      new Spring(0, 280, 20),
      new Spring(1, 440, 23),
      new Spring(1, 440, 23),
    ],
  });
  const wakeRef = useRef<() => void>(() => {});
  useEffect(() => {
    const m = motion.current;
    const cancel = () => {
      motion.current.down =
        motion.current.hover =
        motion.current.focused =
          false;
      wakeRef.current();
    };
    window.addEventListener('blur', cancel);
    document.addEventListener('visibilitychange', cancel);
    return () => {
      cancelAnimationFrame(m.frame);
      m.frame = 0;
      window.removeEventListener('blur', cancel);
      document.removeEventListener('visibilitychange', cancel);
    };
  }, []);
  const selected =
    props['aria-pressed'] === true || props['aria-current'] === 'page';
  useEffect(() => {
    if (selected) {
      motion.current.springs[3].kick(2);
      wakeRef.current();
    }
  }, [selected]);
  const wake = () => {
    const m = motion.current;
    if (m.frame) return;
    m.time = performance.now();
    // Fixed motion envelope, measured before motion. Long labels keep their
    // typography and use a smaller wave instead of escaping the button face.
    const host = button.current,
      surface = face.current;
    const style = surface ? getComputedStyle(surface) : null;
    const hostStyle = host ? getComputedStyle(host) : null;
    const padding = Math.min(
      parseFloat(style?.paddingTop || '0') +
        parseFloat(hostStyle?.paddingTop || '0'),
      parseFloat(style?.paddingBottom || '0') +
        parseFloat(hostStyle?.paddingBottom || '0'),
    );
    const letterCount =
      surface?.querySelectorAll('.kinetic-letter').length ?? 0;
    const envelope = Math.max(
      1,
      Math.min(6, padding - 3, letterCount > 15 ? 3 : 6),
    );
    const step = (now: number) => {
      const b = button.current,
        f = face.current;
      if (!b || !f) {
        m.frame = 0;
        return;
      }
      // React may replace a label while a spring is running (Read now → Next).
      // Resolve live glyphs, never retain nodes from the previous label.
      const letters = f.querySelectorAll<HTMLElement>('.kinetic-letter');
      const reduce =
        !!b.closest('.reduced-motion') ||
        matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dt = Math.min((now - m.time) / 1000, 1 / 30);
      m.time = now;
      const targetX = m.hover ? m.px * 8 : 0,
        targetY = m.hover ? m.py * 5 : 0;
      const tx = m.down ? 0.96 : m.hover ? 1.085 : m.focused ? 1.015 : 1,
        ty = m.down ? 0.87 : m.hover ? 1.085 : m.focused ? 1.015 : 1;
      const targets = [targetX, targetY, tx, ty];
      m.springs.forEach((s, i) => {
        s.target = targets[i];
        s.step(dt, reduce);
      });
      [m.x, m.y, m.sx, m.sy] = m.springs.map((s) => s.value);
      f.style.transform = reduce
        ? 'none'
        : `translate3d(${m.x}px,${m.y}px,0) scale(${m.sx},${m.sy}) rotate(${m.hover ? m.px * 0.7 : 0}deg)`;
      let moving = m.springs.some((s) => s.moving);
      letters?.forEach((el, i) => {
        const l = (m.letters[i] ||= new Spring(0, 320 + (i % 3) * 35, 15));
        const distance = Math.abs((i + 0.5) / letters.length - (m.px + 1) / 2);
        const target = m.hover
          ? -Math.max(0, 1 - distance * 2.4) * (m.down ? -1.5 : envelope)
          : 0;
        l.target = target;
        l.step(dt, reduce);
        el.style.transform = reduce
          ? 'none'
          : `translateY(${Math.max(-envelope, Math.min(envelope * 0.65, l.value))}px) rotate(${l.value * (i % 2 ? -0.08 : 0.08)}deg)`;
        moving ||= l.moving;
      });
      if (moving) m.frame = requestAnimationFrame(step);
      else {
        m.frame = 0;
        if (!m.hover && !m.down) {
          f.style.transform = '';
          letters?.forEach((el) => {
            el.style.transform = '';
          });
        }
      }
    };
    m.frame = requestAnimationFrame(step);
  };
  useEffect(() => {
    wakeRef.current = wake;
  });
  useLayoutEffect(() => {
    const m = motion.current;
    cancelAnimationFrame(m.frame);
    m.frame = 0;
    m.letters = [];
    face.current
      ?.querySelectorAll<HTMLElement>('.kinetic-letter')
      .forEach((el) => (el.style.transform = ''));
    wakeRef.current();
  }, [labelIdentity]);
  const label = (node: ReactNode): ReactNode =>
    typeof node === 'string' ? (
      <span className="kinetic-word" aria-label={node} key={node}>
        {node.split(/(\s+)/).map((word, wi) =>
          word.trim() ? (
            <span className="button-word" key={wi}>
              {Array.from(word).map((c, i) => (
                <span className="kinetic-letter" aria-hidden="true" key={i}>
                  {c}
                </span>
              ))}
            </span>
          ) : (
            word
          ),
        )}
      </span>
    ) : (
      node
    );
  return (
    <button
      {...props}
      ref={button}
      className={`tactile ${className}`}
      onPointerEnter={(e) => {
        motion.current.hover = !props.disabled;
        wake();
        onPointerEnter?.(e);
      }}
      onPointerMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        motion.current.px = Math.max(
          -1,
          Math.min(1, ((e.clientX - r.left) / r.width) * 2 - 1),
        );
        motion.current.py = Math.max(
          -1,
          Math.min(1, ((e.clientY - r.top) / r.height) * 2 - 1),
        );
        if (
          motion.current.down &&
          Math.hypot(e.clientX - press.current.x, e.clientY - press.current.y) >
            7
        )
          press.current.moved = true;
        wake();
        onPointerMove?.(e);
      }}
      onPointerLeave={(e) => {
        if (motion.current.down) press.current.moved = true;
        motion.current.hover = false;
        motion.current.down = false;
        wake();
        onPointerLeave?.(e);
      }}
      onPointerDown={(e) => {
        press.current = { x: e.clientX, y: e.clientY, moved: false };
        motion.current.down = true;
        wake();
        onPointerDown?.(e);
      }}
      onPointerUp={(e) => {
        motion.current.down = false;
        motion.current.springs[3].kick(2.4);
        motion.current.springs[2].kick(-0.7);
        wake();
        onPointerUp?.(e);
      }}
      onPointerCancel={() => {
        motion.current.down = false;
        motion.current.hover = false;
        wake();
      }}
      onClick={(e) => {
        if (e.detail > 0 && press.current.moved) {
          e.preventDefault();
          return;
        }
        if (e.detail === 0) {
          motion.current.down = false;
          motion.current.springs[3].kick(2.4);
          wake();
        }
        onClick?.(e);
      }}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          motion.current.down = true;
          wake();
        }
        onKeyDown?.(e);
      }}
      onKeyUp={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          motion.current.down = false;
          wake();
        }
        onKeyUp?.(e);
      }}
      onFocus={(e) => {
        motion.current.focused = true;
        wake();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        motion.current.focused = false;
        motion.current.down = false;
        wake();
        onBlur?.(e);
      }}
    >
      <span className="tactile-face" ref={face}>
        {Children.map(children, label)}
      </span>
    </button>
  );
}

export function DotCursor() {
  const mounted = useSyncExternalStore(
    subscribeClient,
    () => true,
    () => false,
  );
  const dot = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let lastApproach = 0;
    const approached = new Set<HTMLElement>();
    const move = (e: PointerEvent) => {
      const d = dot.current;
      if (!d || e.pointerType === 'touch') return;
      document.documentElement.classList.add('dot-cursor-active');
      d.style.opacity = '1';
      d.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      const target = e.target as HTMLElement;
      if (performance.now() - lastApproach > 32) {
        lastApproach = performance.now();
        approached.forEach((el) => {
          el.style.removeProperty('--approach-x');
          el.style.removeProperty('--approach-y');
        });
        approached.clear();
        if (
          !target.closest('.reduced-motion') &&
          !matchMedia('(prefers-reduced-motion: reduce)').matches
        )
          for (const [x, y] of [
            [0, 0],
            [-48, 0],
            [48, 0],
            [0, -40],
            [0, 40],
          ]) {
            const b = document
              .elementFromPoint(e.clientX + x, e.clientY + y)
              ?.closest<HTMLButtonElement>('.tactile');
            if (!b || b.disabled || b.matches(':hover,:focus-visible'))
              continue;
            const face = b.querySelector<HTMLElement>('.tactile-face');
            if (!face) continue;
            const r = b.getBoundingClientRect();
            face.style.setProperty(
              '--approach-x',
              `${Math.sign(e.clientX - r.left - r.width / 2) * 3}px`,
            );
            face.style.setProperty(
              '--approach-y',
              `${Math.sign(e.clientY - r.top - r.height / 2) * 2}px`,
            );
            approached.add(face);
          }
      }
      d.dataset.kind = target.closest('button,[role="switch"],[role="slider"]')
        ? 'ui'
        : target.closest('canvas[data-contact="phone"]')
          ? 'ui'
          : target.closest('canvas[data-contact="ice"]')
            ? 'ice'
            : 'rest';
    };
    const down = () => {
      if (dot.current) dot.current.dataset.down = 'true';
    };
    const up = () => {
      if (dot.current) dot.current.dataset.down = 'false';
    };
    const hide = () => {
      if (dot.current) dot.current.style.opacity = '0';
      up();
    };
    document.addEventListener('pointermove', move);
    document.addEventListener('pointerdown', down);
    document.addEventListener('pointerup', up);
    document.addEventListener('pointercancel', hide);
    document.addEventListener('pointerleave', hide);
    window.addEventListener('blur', hide);
    return () => {
      document.documentElement.classList.remove('dot-cursor-active');
      document.removeEventListener('pointermove', move);
      document.removeEventListener('pointerdown', down);
      document.removeEventListener('pointerup', up);
      document.removeEventListener('pointercancel', hide);
      document.removeEventListener('pointerleave', hide);
      window.removeEventListener('blur', hide);
    };
  }, []);
  return !mounted
    ? null
    : createPortal(
        <div ref={dot} className="dot-cursor" aria-hidden="true">
          <i />
        </div>,
        document.body,
      );
}
const subscribeClient = () => () => {};
