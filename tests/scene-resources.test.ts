import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { SceneResources, sharedResource } from '../lib/game/scene-resources';

void test('scene ownership releases mesh, points, line, sprite and all owned texture maps exactly once', () => {
  const root = new THREE.Scene(),
    tracker = new SceneResources();
  const diffuse = new THREE.Texture(),
    normal = new THREE.Texture();
  const geometry = new THREE.BoxGeometry();
  const material = new THREE.MeshStandardMaterial({
    map: diffuse,
    normalMap: normal,
  });
  root.add(
    new THREE.Mesh(geometry, material),
    new THREE.Mesh(geometry, material),
  );
  root.add(
    new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial()),
  );
  root.add(
    new THREE.Line(new THREE.BufferGeometry(), new THREE.LineBasicMaterial()),
  );
  root.add(new THREE.Sprite(new THREE.SpriteMaterial({ map: diffuse })));
  const events = { geometry: 0, material: 0, diffuse: 0, normal: 0 };
  geometry.addEventListener('dispose', () => events.geometry++);
  material.addEventListener('dispose', () => events.material++);
  diffuse.addEventListener('dispose', () => events.diffuse++);
  normal.addEventListener('dispose', () => events.normal++);
  tracker.disposeGraph(root);
  tracker.disposeGraph(root);
  assert.deepEqual(events, { geometry: 1, material: 1, diffuse: 1, normal: 1 });
  assert.deepEqual(tracker.counts, {
    geometry: 3,
    material: 4,
    texture: 2,
    target: 0,
  });
});

void test('disposing one scene preserves shared workshop assets used by another scene', () => {
  const material = sharedResource(new THREE.MeshBasicMaterial()),
    root = new THREE.Group();
  let disposed = 0;
  material.addEventListener('dispose', () => disposed++);
  root.add(new THREE.Mesh(new THREE.BoxGeometry(), material));
  const tracker = new SceneResources();
  tracker.disposeGraph(root);
  assert.equal(disposed, 0);
  assert.equal(tracker.counts.geometry, 1);
});

void test('shadow targets and detached pooled resources are explicitly released', () => {
  const light = new THREE.DirectionalLight(),
    target = new THREE.WebGLRenderTarget(4, 4),
    tracker = new SceneResources();
  light.shadow.map = target;
  let disposed = 0;
  target.addEventListener('dispose', () => disposed++);
  tracker.disposeGraph(light);
  tracker.disposeGraph(light);
  assert.equal(disposed, 1);
  assert.equal(tracker.counts.target, 1);
});
