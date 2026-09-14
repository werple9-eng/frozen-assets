import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { mkdirSync, writeFileSync } from 'node:fs';
import { valuableArt } from '../lib/game/valuable-art';
import { meshContactSamples } from '../lib/game/mesh-contact';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import {
  cutReleasePassage,
  releaseCorpus,
  RELEASE_CASES,
} from '../lib/game/release-qa';
import { SceneResources } from '../lib/game/scene-resources';

void test('every new valuable mesh is packed at spawn and frees on every cleared contact passage', () => {
  let items = 0,
    cases = 0,
    samples = 0;
  const kinds = new Set<string>(),
    failures: string[] = [];
  for (const { block, phase } of releaseCorpus()) {
    const field = campaignField(block, phase),
      loot = campaignLoot(block, phase);
    field.carveLoot(loot);
    const before = field.values.slice();
    for (const item of loot) {
      if (!item.asset) continue;
      kinds.add(item.asset);
      items++;
      const root = new THREE.Group();
      root.add(valuableArt(item));
      const contact = meshContactSamples(root, field.grid.cellSize / 4);
      samples += contact.length;
      const bounds = new THREE.Box3()
        .setFromObject(root)
        .getSize(new THREE.Vector3());
      assert.ok(
        Math.abs(bounds.x - item.w) < 1e-5 &&
          Math.abs(bounds.y - item.h) < 1e-5 &&
          Math.abs(bounds.z - item.d) < 1e-5,
      );
      field.values.set(before);
      field.revision++;
      assert.equal(field.canRelease(item, contact), false, item.id);
      assert.ok(
        contact.every(
          (p) =>
            field.density(
              { x: p.x + item.x, y: p.y + item.y, z: p.z + item.z },
              true,
            ) > 0.5,
        ),
        `${item.id}: no air around initial model`,
      );
      for (let scenario = 0; scenario < RELEASE_CASES; scenario++) {
        field.values.set(before);
        cutReleasePassage(field, item, scenario);
        if (!field.canRelease(item, contact))
          failures.push(`${item.id}:${scenario}`);
        cases++;
      }
      new SceneResources().disposeGraph(root);
    }
  }
  mkdirSync('qa-artifacts', { recursive: true });
  writeFileSync(
    'qa-artifacts/valuable-art-stress.json',
    JSON.stringify(
      { items, cases, samples, kinds: [...kinds], failures },
      null,
      2,
    ),
  );
  assert.equal(kinds.size, 16);
  assert.deepEqual(failures, []);
});
