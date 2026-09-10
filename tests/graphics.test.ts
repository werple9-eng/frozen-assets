import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {
  GRAPHICS_LEVELS,
  graphicsBudget,
  graphicsPixelRatio,
} from '../lib/game/graphics';
import { GameModel } from '../lib/game/model';
import {
  workshopFrame,
  type ProjectedBounds,
} from '../lib/game/workshop-framing';
import { WORKBENCH_PROPS } from '../lib/game/room-layout';
import { MAJOR_BLOCKS } from '../lib/game/major-campaign';
import { campaignField } from '../lib/game/campaign-layout';
import { TUNE } from '../lib/game/tuning';

void test('graphics survives saves, migrates old settings and rejects invalid profiles', () => {
  const model = new GameModel();
  for (const graphics of GRAPHICS_LEVELS) {
    model.setSetting('graphics', graphics);
    assert.equal(new GameModel(model.serialize()).settings.graphics, graphics);
  }
  const old = JSON.parse(model.serialize());
  delete old.settings.graphics;
  assert.equal(new GameModel(JSON.stringify(old)).settings.graphics, 'high');
  old.settings.graphics = '__proto__';
  assert.equal(new GameModel(JSON.stringify(old)).settings.graphics, 'high');
});

void test('quality budgets scale rendering cost and comfort preferences override Ultra', () => {
  const budgets = GRAPHICS_LEVELS.map((q) => graphicsBudget(q));
  for (let i = 1; i < budgets.length; i++) {
    assert.ok(budgets[i].dust > budgets[i - 1].dust);
    assert.ok(budgets[i].mist > budgets[i - 1].mist);
    assert.ok(budgets[i].shadowSize > budgets[i - 1].shadowSize);
    assert.ok(
      graphicsPixelRatio(GRAPHICS_LEVELS[i], 2) >
        graphicsPixelRatio(GRAPHICS_LEVELS[i - 1], 2),
    );
  }
  assert.equal(graphicsBudget('ultra', true).mist, 0);
  assert.equal(graphicsBudget('ultra', true).dust, 24);
  assert.equal(graphicsBudget('ultra', false, true).dust, 0);
  assert.equal(graphicsBudget('ultra', false, true).mist, 0);
  assert.ok(graphicsPixelRatio('ultra', 1) <= 1);
});

void test('all authored deliveries compose a wide workshop, close default and extreme inspection zoom at every aspect and rotation', () => {
  const camera = new THREE.OrthographicCamera();
  camera.position.set(1.3, 14.7, 29);
  camera.lookAt(0, 3.2, 0);
  camera.updateMatrixWorld(true);
  const point = new THREE.Vector3();
  const bounds = (): ProjectedBounds => ({
    minX: Infinity,
    maxX: -Infinity,
    minY: Infinity,
    maxY: -Infinity,
  });
  const add = (
    b: ProjectedBounds,
    x: number,
    y: number,
    z: number,
    transform?: THREE.Matrix4,
  ) => {
    point.set(x, y, z);
    if (transform) point.applyMatrix4(transform);
    point.applyMatrix4(camera.matrixWorldInverse);
    b.minX = Math.min(b.minX, point.x);
    b.maxX = Math.max(b.maxX, point.x);
    b.minY = Math.min(b.minY, point.y);
    b.maxY = Math.max(b.maxY, point.y);
  };
  let checks = 0;
  for (let block = 0; block < MAJOR_BLOCKS.length; block++) {
    for (
      let phase = 0;
      phase < (MAJOR_BLOCKS[block].ice?.phases.length ?? 1);
      phase++
    ) {
      const field = campaignField(block, phase);
      const scale = Math.max(
        field.grid.physicalWidth / 12.8,
        field.grid.physicalDepth / 8.5,
      );
      const solid = new THREE.Box3();
      for (let i = 0; i < field.values.length; i++)
        if (field.values[i] > 0) {
          const p = field.points[i];
          solid.expandByPoint(point.set(p.x, p.y, p.z));
        }
      const props = bounds();
      for (const p of WORKBENCH_PROPS)
        for (const x of [p.x - p.w / 2, p.x + p.w / 2])
          for (const z of [p.z - p.d / 2, p.z + p.d / 2])
            for (const y of [p.y ?? 0, (p.y ?? 0) + p.height])
              add(props, x * scale, y * scale - 0.5, z * scale);
      for (const yaw of [0, Math.PI / 4, Math.PI / 2, Math.PI, 5.5])
        for (const tilt of [
          -TUNE.rotationTiltLimit,
          0,
          TUNE.rotationTiltLimit,
        ]) {
          const ice = bounds();
          const transform = new THREE.Matrix4()
            .makeRotationFromEuler(new THREE.Euler(tilt, yaw, 0, 'YXZ'))
            .setPosition(0, -0.3, 0);
          for (const x of [solid.min.x, solid.max.x])
            for (const y of [solid.min.y, solid.max.y])
              for (const z of [solid.min.z, solid.max.z])
                add(ice, x, y, z, transform);
          for (const aspect of [0.65, 1, 4 / 3, 16 / 9, 21 / 9]) {
            let previous = Infinity;
            for (const zoom of [0, 0.25, 0.5, 0.75, 1]) {
              const frame = workshopFrame(ice, props, aspect, zoom);
              assert.ok(frame.span <= previous, 'zoom stays monotonic');
              previous = frame.span;
              for (const b of zoom === 0
                ? [ice, props]
                : zoom === 0.5
                  ? [ice]
                  : []) {
                assert.ok(b.minX >= frame.x - frame.span * aspect * 0.9);
                assert.ok(b.maxX <= frame.x + frame.span * aspect * 0.9);
                assert.ok(b.minY >= frame.y - frame.span * 0.79);
                assert.ok(b.maxY <= frame.y + frame.span * 0.79);
              }
              if (zoom === 1) {
                const standard = workshopFrame(ice, props, aspect, 0.5);
                assert.ok(
                  standard.span / frame.span > 6,
                  'extreme inspection zoom',
                );
                assert.equal(frame.x, (ice.minX + ice.maxX) / 2);
                assert.equal(frame.y, (ice.minY + ice.maxY) / 2);
              }
              checks++;
            }
          }
        }
    }
  }
  assert.ok(checks > 25000, `${checks} compositions checked`);
});
