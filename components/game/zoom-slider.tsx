'use client';
/* eslint-disable jsx-a11y/prefer-tag-over-role -- Custom physical slider implements pointer capture, keyboard input and ARIA value semantics. */
import { useEffect, useRef } from 'react';
import { Spring } from '@/lib/game/motion';
import { reducedMotion } from './motion';

// The hit area stays still. The brass carriage alone responds to the hand.
export function ZoomSlider({
  value,
  onChange,
  label,
}: {
  value: number;
  onChange: (value: number) => void;
  label: string;
}) {
  const rail = useRef<HTMLDivElement>(null),
    knob = useRef<HTMLSpanElement>(null);
  const gesture = useRef({
    down: false,
    hover: false,
    frame: 0,
    spring: new Spring(1, 380, 23),
  });
  const wake = () => {
    const g = gesture.current;
    if (g.frame) return;
    let last = performance.now();
    const tick = (now: number) => {
      g.spring.target = g.down ? 1.36 : g.hover ? 1.18 : 1;
      g.spring.step((now - last) / 1000, reducedMotion(rail.current));
      last = now;
      if (knob.current)
        knob.current.style.setProperty('--knob-scale', String(g.spring.value));
      g.frame = g.spring.moving ? requestAnimationFrame(tick) : 0;
    };
    g.frame = requestAnimationFrame(tick);
  };
  useEffect(() => {
    const g = gesture.current;
    const cancel = () => {
      g.down = g.hover = false;
      wake();
    };
    window.addEventListener('blur', cancel);
    return () => {
      cancelAnimationFrame(g.frame);
      g.frame = 0;
      window.removeEventListener('blur', cancel);
    };
  }, []);
  const change = (n: number) => onChange(Math.max(0, Math.min(1, n)));
  const point = (y: number) => {
    const r = rail.current!.getBoundingClientRect();
    change(1 - (y - r.top - 18) / (r.height - 36));
  };
  return (
    <div className="zoom-control" data-hud>
      <div
        ref={rail}
        className="zoom-rail"
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-orientation="vertical"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(value * 100)}
        aria-valuetext={`${Math.round(value * 100)} percent`}
        onPointerEnter={() => {
          gesture.current.hover = true;
          wake();
        }}
        onPointerLeave={() => {
          gesture.current.hover = false;
          wake();
        }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          e.preventDefault();
          e.currentTarget.focus();
          e.currentTarget.setPointerCapture(e.pointerId);
          gesture.current.down = true;
          point(e.clientY);
          wake();
        }}
        onPointerMove={(e) => {
          if (gesture.current.down) point(e.clientY);
        }}
        onPointerUp={(e) => {
          gesture.current.down = false;
          gesture.current.spring.kick(-1.7);
          if (e.currentTarget.hasPointerCapture(e.pointerId))
            e.currentTarget.releasePointerCapture(e.pointerId);
          wake();
        }}
        onPointerCancel={() => {
          gesture.current.down = false;
          wake();
        }}
        onLostPointerCapture={() => {
          gesture.current.down = false;
          wake();
        }}
        onKeyDown={(e) => {
          const delta = ['ArrowUp', 'ArrowRight'].includes(e.key)
            ? 0.025
            : ['ArrowDown', 'ArrowLeft'].includes(e.key)
              ? -0.025
              : 0;
          if (delta || ['Home', 'End'].includes(e.key)) {
            e.preventDefault();
            change(e.key === 'Home' ? 0 : e.key === 'End' ? 1 : value + delta);
          }
        }}
      >
        <i className="zoom-track" />
        <span
          className="zoom-carriage"
          style={{ bottom: `calc(18px + (100% - 36px) * ${value})` }}
        >
          <span ref={knob} className="zoom-knob" />
        </span>
      </div>
    </div>
  );
}
