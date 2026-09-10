'use client';
import { useEffect, useEffectEvent, useRef, type CSSProperties } from 'react';
import { Vector3 } from 'three';
import type { GameScene } from '@/lib/game/scene';
import '@/app/major-progression.css';

export type ConditionCueData = {
  id: string;
  grade: 'PRISTINE' | 'CLEAN' | 'FAIR' | 'RECOVERED';
  x: number;
  y: number;
  z: number;
  until: number;
};

export function ConditionCue({
  cue,
  getScene,
}: {
  cue: ConditionCueData;
  getScene: () => GameScene | null;
}) {
  const root = useRef<HTMLOutputElement>(null);
  const currentScene = useEffectEvent(getScene);
  useEffect(() => {
    const point = new Vector3();
    let frame = 0;
    const position = () => {
      const scene = currentScene(),
        element = root.current;
      if (!scene || !element || scene.destroyed) return;
      const item = scene.lootMeshes.get(cue.id);
      if (item) item.getWorldPosition(point);
      else scene.contents.localToWorld(point.set(cue.x, cue.y, cue.z));
      point.project(scene.camera);
      const bounds = scene.host.getBoundingClientRect(),
        x = bounds.left + ((point.x + 1) * bounds.width) / 2,
        y = bounds.top + ((1 - point.y) * bounds.height) / 2 - 25;
      element.style.left = `${Math.max(60, Math.min(innerWidth - 60, x))}px`;
      element.style.top = `${Math.max(90, Math.min(innerHeight - 135, y))}px`;
      element.style.visibility =
        point.z < -1 || point.z > 1 ? 'hidden' : 'visible';
      frame = requestAnimationFrame(position);
    };
    frame = requestAnimationFrame(position);
    return () => cancelAnimationFrame(frame);
  }, [cue.id, cue.x, cue.y, cue.z]);
  return (
    <output
      ref={root}
      className={`condition-cue condition-${cue.grade.toLowerCase()}`}
      aria-label={`${cue.grade.toLowerCase()} recovery condition`}
    >
      <span aria-hidden="true">
        {Array.from(cue.grade).map((letter, index) => (
          <b
            key={index}
            style={{ '--condition-letter': `${index * 17}ms` } as CSSProperties}
          >
            {letter}
          </b>
        ))}
      </span>
    </output>
  );
}
