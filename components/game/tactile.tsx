'use client';
import {
  Children,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

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
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  const button = useRef<HTMLButtonElement>(null),
    face = useRef<HTMLSpanElement>(null);
  const press = useRef({ x: 0, y: 0, moved: false });
  const motion = useRef({
    frame: 0,
    time: 0,
    hover: false,
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
    letters: [] as { y: number; v: number }[],
  });
  useEffect(() => () => cancelAnimationFrame(motion.current.frame), []);
  const wake = () => {
    const m = motion.current;
    if (m.frame) return;
    m.time = performance.now();
    const step = (now: number) => {
      const b = button.current,
        f = face.current;
      if (!b || !f) {
        m.frame = 0;
        return;
      }
      const reduce =
        !!b.closest('.reduced-motion') ||
        matchMedia('(prefers-reduced-motion: reduce)').matches;
      const dt = Math.min((now - m.time) / 1000, 1 / 30);
      m.time = now;
      const targetX = m.hover ? m.px * 5 : 0,
        targetY = m.hover ? m.py * 3 : 0;
      const tx = m.down ? 1.04 : m.hover ? 1.065 : 1,
        ty = m.down ? 0.9 : m.hover ? 1.065 : 1;
      m.vx += ((targetX - m.x) * 280 - m.vx * 20) * dt;
      m.x += m.vx * dt;
      m.vy += ((targetY - m.y) * 280 - m.vy * 20) * dt;
      m.y += m.vy * dt;
      m.vsx += ((tx - m.sx) * 440 - m.vsx * 23) * dt;
      m.sx += m.vsx * dt;
      m.vsy += ((ty - m.sy) * 440 - m.vsy * 23) * dt;
      m.sy += m.vsy * dt;
      f.style.transform = reduce
        ? 'none'
        : `translate3d(${m.x}px,${m.y}px,0) scale(${m.sx},${m.sy}) rotate(${m.hover ? m.px * 0.7 : 0}deg)`;
      const letters = f.querySelectorAll<HTMLElement>('.kinetic-letter');
      let energy =
        Math.abs(m.vx) + Math.abs(m.vy) + Math.abs(m.vsx) + Math.abs(m.vsy);
      letters.forEach((el, i) => {
        const l = (m.letters[i] ||= { y: 0, v: 0 });
        const distance = Math.abs((i + 0.5) / letters.length - (m.px + 1) / 2);
        const target = m.hover
          ? -Math.max(0, 1 - distance * 2.4) * (m.down ? 1 : 6)
          : 0;
        l.v += ((target - l.y) * (320 + (i % 3) * 35) - l.v * 15) * dt;
        l.y += l.v * dt;
        el.style.transform = reduce
          ? 'none'
          : `translateY(${l.y}px) rotate(${l.y * (i % 2 ? -0.35 : 0.35)}deg)`;
        energy += Math.abs(l.v);
      });
      if (
        energy > 0.03 ||
        Math.abs(m.sx - tx) > 0.0001 ||
        Math.abs(m.sy - ty) > 0.0001
      )
        m.frame = requestAnimationFrame(step);
      else {
        m.frame = 0;
        if (!m.hover && !m.down) f.style.transform = '';
      }
    };
    m.frame = requestAnimationFrame(step);
  };
  const label = (node: ReactNode): ReactNode =>
    typeof node === 'string' ? (
      <span className="kinetic-word" aria-label={node}>
        {Array.from(node).map((c, i) => (
          <span className="kinetic-letter" aria-hidden="true" key={i}>
            {c === ' ' ? '\u00a0' : c}
          </span>
        ))}
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
        motion.current.vsy = 1.6;
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
        onClick?.(e);
      }}
      onFocus={(e) => {
        motion.current.hover = true;
        wake();
        onFocus?.(e);
      }}
      onBlur={(e) => {
        motion.current.hover = false;
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
    const move = (e: PointerEvent) => {
      const d = dot.current;
      if (!d || e.pointerType === 'touch') return;
      document.documentElement.classList.add('dot-cursor-active');
      d.style.opacity = '1';
      d.style.transform = `translate3d(${e.clientX}px,${e.clientY}px,0)`;
      const target = e.target as HTMLElement;
      d.dataset.kind = target.closest('button,[role="switch"],[role="slider"]')
        ? 'ui'
        : target.closest('canvas')
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
