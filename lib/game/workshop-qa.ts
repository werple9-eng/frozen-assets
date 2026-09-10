import * as THREE from 'three';
import type { GameScene } from './scene';
import type { GameModel } from './model';
import {
  GRAPHICS_LEVELS,
  graphicsBudget,
  graphicsPixelRatio,
} from './graphics';

// Called only by the localhost isolated practice registry. Exercise the live
// renderer, not a second scene or a replacement for the visible composition.
export async function workshopGraphicsAudit(scene: GameScene) {
  const model = scene.model as GameModel;
  const settings = { ...model.settings },
    wasPaused = model.paused;
  const results: object[] = [],
    failures: string[] = [];
  const nextFrame = () =>
    new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
  const point = new THREE.Vector3();
  const baseline = new Map<string, { geometries: number; textures: number }>();
  try {
    model.stop();
    model.paused = true;
    model.setSetting('reducedMotion', false);
    model.setSetting('reducedParticles', false);
    for (let cycle = 0; cycle < 2; cycle++) {
      for (const quality of GRAPHICS_LEVELS) {
        model.setSetting('graphics', quality);
        for (const zoom of [0, 0.5, 1]) {
          model.setSetting('gameplayZoom', zoom);
          for (let frame = 0; frame < 4; frame++) await nextFrame();
          scene.fitCamera(10);
          await nextFrame();
          const profile = graphicsBudget(quality);
          const stats = scene.stats();
          if (scene.frameError)
            failures.push(`Frame error: ${scene.frameError.message}`);
          if (
            stats.pixelRatio !== graphicsPixelRatio(quality, devicePixelRatio)
          )
            failures.push(`${quality}: wrong resolution`);
          if (stats.graphics.shadows !== profile.shadowSize > 0)
            failures.push(`${quality}: wrong shadows`);
          const scale = scene.workshop.group.getWorldScale(point).x;
          if (Math.abs(scene.room.group.getWorldScale(point).x - scale) > 1e-6)
            failures.push(`${quality}: room and tray scale diverged`);
          const props: Record<string, object> = {};
          for (const [name, object] of [
            ['mug', scene.room.mug],
            ['phone', scene.workshop.phone],
            ['files', scene.workshop.files],
          ] as const) {
            const box = new THREE.Box3().setFromObject(object);
            let left = 1,
              right = 0,
              top = 1,
              bottom = 0;
            for (const x of [box.min.x, box.max.x])
              for (const y of [box.min.y, box.max.y])
                for (const z of [box.min.z, box.max.z]) {
                  point.set(x, y, z).project(scene.camera);
                  left = Math.min(left, (point.x + 1) / 2);
                  right = Math.max(right, (point.x + 1) / 2);
                  top = Math.min(top, (1 - point.y) / 2);
                  bottom = Math.max(bottom, (1 - point.y) / 2);
                }
            props[name] = { left, right, top, bottom };
            if (left < 0.015 || right > 0.985 || top < 0.06 || bottom > 0.94)
              failures.push(`${quality}/${zoom}: ${name} outside usable frame`);
          }
          if (zoom === 1) {
            if (!cycle) baseline.set(quality, stats);
            else {
              const before = baseline.get(quality)!;
              if (
                stats.geometries > before.geometries + 1 ||
                stats.textures > before.textures + 1
              )
                failures.push(
                  `${quality}: allocations grew on repeated switch`,
                );
            }
          }
          results.push({
            cycle,
            quality,
            zoom,
            graphics: stats.graphics,
            pixelRatio: stats.pixelRatio,
            props,
            geometries: stats.geometries,
            textures: stats.textures,
          });
        }
      }
    }
    model.setSetting('reducedMotion', true);
    await nextFrame();
    await nextFrame();
    if (scene.air.dust.visible || scene.air.mist.points.visible)
      failures.push('Reduced motion left airborne movement enabled');
    return {
      passed: failures.length === 0,
      failures,
      cases: results,
      comfort: scene.stats().graphics,
    };
  } finally {
    Object.assign(model.settings, settings);
    model.paused = wasPaused;
    model.emit();
  }
}
