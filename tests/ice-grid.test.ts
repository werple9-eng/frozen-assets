import test from 'node:test';
import assert from 'node:assert/strict';
import { IceField, surface, surfaceChunk } from '../lib/game/ice';
import {
  createIceGrid,
  fieldLayoutHash,
  type FieldSpec,
  type MaterialPreset,
} from '../lib/game/ice-grid';
import { TUNE, type Loot } from '../lib/game/tuning';
import type { StoryObjectId } from '../lib/game/campaign-content';
import { ChunkedIceMesh } from '../lib/game/ice-renderer';
import * as THREE from 'three';
import { GameModel } from '../lib/game/model';
import { BLOCKS, blockSpec } from '../lib/game/campaign-content';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';

const evidence = (story: StoryObjectId, x = 0.13): Loot => ({
  id: story,
  story,
  kind: 'gold',
  value: 0,
  name: story,
  x,
  y: 3.17,
  z: 0.21,
  w: story === 'ring' ? 0.3 : 0.64,
  h: 0.09,
  d: 0.4,
  state: 'embedded',
  age: 0,
  vy: 0,
  credited: false,
});

const spec = (
  width = 4.4,
  height = 2.6,
  depth = 2.4,
  material: MaterialPreset = 'clear',
): FieldSpec => ({
  profile: 'parcel',
  dimensions: { width, height, depth },
  materials: [{ material, region: { kind: 'all' } }],
  deliveryId: 'test',
  phaseId: 'one',
});
const variable = (s = spec()) => new IceField(0, undefined, undefined, s);
const sum = (f: IceField) => f.values.reduce((s, n) => s + n, 0);
const strikeOptions = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };

void test('small, medium, large and odd grids own constant spacing with safe indexing and neighbors', () => {
  for (const s of [
    spec(1.2, 0.9, 0.9),
    spec(),
    spec(11, 7, 6.4),
    spec(3.31, 2.11, 1.73),
  ]) {
    const f = variable(s),
      { nx, ny, nz, cellSize } = f.grid;
    assert.equal(cellSize, 0.3);
    const ids = new Set<number>();
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = f.index(x, y, z);
          ids.add(i);
          assert.deepEqual(f.coordinates(i), { x, y, z });
          f.forEachNeighbor6(x, y, z, (n) => {
            const p = f.coordinates(n);
            assert.equal(
              Math.abs(p.x - x) + Math.abs(p.y - y) + Math.abs(p.z - z),
              1,
            );
          });
          if (x < nx - 1 && y < ny - 1 && z < nz - 1)
            assert.ok(
              Math.abs(f.density(f.points[i]) - f.values[i]) < 0.000001,
            );
        }
    assert.equal(ids.size, nx * ny * nz);
    assert.equal(f.index(-1, 1, 1), -1);
    assert.equal(f.index(nx, 0, 0), -1);
    assert.equal(f.index(0, ny, 0), -1);
    assert.equal(f.neighborIndex(0, 1, 1, -1, 0, 0), -1);
    assert.equal(f.density({ x: 1000, y: 2, z: 0 }), 0);
    assert.equal(f.density({ x: NaN, y: 2, z: 0 }), 0);
    assert.ok(f.points.every((p) => Number.isFinite(p.x + p.y + p.z)));
  }
  assert.ok(
    variable(spec(11, 7, 6.4)).remaining() > variable().remaining() * 10,
  );
});

void test('layout hashes are deterministic and change with authored identity, dimensions and materials', () => {
  const a = spec();
  assert.equal(
    fieldLayoutHash(a),
    fieldLayoutHash({
      ...a,
      dimensions: { depth: 2.4, height: 2.6, width: 4.4 },
    }),
  );
  assert.notEqual(
    fieldLayoutHash(a),
    fieldLayoutHash({ ...a, phaseId: 'two' }),
  );
  assert.notEqual(fieldLayoutHash(a), fieldLayoutHash(spec(4.5)));
  assert.notEqual(
    fieldLayoutHash(a),
    fieldLayoutHash(spec(4.4, 2.6, 2.4, 'service')),
  );
  assert.throws(() => createIceGrid(spec(NaN)), /Invalid/);
  assert.throws(() => createIceGrid(spec(100, 100, 100)), /safety/);
});

void test('material hardness, support strength, fracture ease and conductivity affect their own operations', () => {
  const clear = variable(),
    dense = variable(spec(4.4, 2.6, 2.4, 'dense'));
  const before = sum(clear),
    p = { x: 0, y: 1.4, z: 1.05 };
  clear.strikeAt(p, 0.25, 0.8, strikeOptions, { x: 0, y: 0, z: 1 });
  dense.strikeAt(p, 0.25, 0.8, strikeOptions, { x: 0, y: 0, z: 1 });
  assert.ok(before - sum(dense) < before - sum(clear));
  const thermalClear = variable(),
    service = variable(spec(4.4, 2.6, 2.4, 'service'));
  thermalClear.melt(p, 0.1, 1, 0.8);
  service.melt(p, 0.1, 1, 0.8);
  assert.ok(before - sum(service) > before - sum(thermalClear) * 1.2);
  const weak = (material: MaterialPreset, density: number) => {
    const f = variable(spec(4.4, 2.6, 2.4, material));
    f.values.fill(0);
    const i = f.index(8, 5, 5),
      q = f.points[i];
    f.values[i] = density;
    f.strikeAt(
      { x: q.x - 0.7, y: q.y, z: q.z },
      0.05,
      0.4,
      { ...strikeOptions, detach: 2 },
      { x: 0, y: 0, z: 1 },
    );
    return f.values[i];
  };
  assert.ok(weak('clear', 0.72) > 0.5);
  assert.equal(
    weak('brittle', 0.72),
    0,
    'brittle weak bridge fractures earlier',
  );
  assert.equal(weak('clear', 0.65), 0);
  assert.ok(
    weak('reinforced', 0.65) > 0.5,
    'reinforced bridge retains its structural connection',
  );
});

void test('variable-grid packed evidence stays held until local visible restraints are removed', () => {
  for (const id of [
    'tag',
    'ring',
    'hold',
    'log',
    'access',
    'ledger',
  ] as StoryObjectId[]) {
    const f = variable(spec(5, 4, 3));
    const t = { ...evidence(id), y: 2.1 };
    f.carveLoot([t]);
    assert.ok(f.solidIntersectionCount(t) > 0, id);
    assert.equal(f.canRelease(t), false, id);
    f.points.forEach((p, i) => {
      if (Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) < 1.5) f.values[i] = 0;
    });
    assert.equal(f.canRelease(t), true, id);
    assert.ok(f.remaining() > 0);
  }
});

void test('dirty chunks include all extraction cells sharing a changed boundary sample', () => {
  const f = variable(spec(6, 5, 5));
  f.dirtyChunks.clear();
  f.markSampleChanged(f.index(4, 4, 4));
  assert.equal(f.dirtyChunks.size, 1);
  f.dirtyChunks.clear();
  f.markSampleChanged(f.index(8, 4, 4));
  assert.equal(f.dirtyChunks.size, 2);
  f.dirtyChunks.clear();
  f.markSampleChanged(f.index(8, 8, 8));
  assert.equal(f.dirtyChunks.size, 8);
  const c = f.priorityChunks(f.points[f.index(7, 7, 7)])[0];
  assert.equal(c.id, 0);
  const revision = f.dirtyChunks.get(c.id)!;
  f.revision++;
  f.markSampleChanged(f.index(7, 7, 7));
  f.acknowledgeChunk(c.id, revision);
  assert.ok(
    f.dirtyChunks.has(c.id),
    'older mesh job cannot acknowledge a newer scalar edit',
  );
  f.acknowledgeChunk(c.id, f.revision);
  assert.equal(f.dirtyChunks.has(c.id), false);
});

void test('partitioned marching tetrahedra exactly matches full extraction before and after a seam strike', () => {
  const f = variable(spec(5.3, 3.1, 3.4));
  const triangles = (positions: number[]) => {
    const output: string[] = [];
    for (let i = 0; i < positions.length; i += 9)
      output.push(positions.slice(i, i + 9).join(','));
    return output.sort();
  };
  for (let pass = 0; pass < 2; pass++) {
    const whole = surface(f),
      parts = f.chunks.map((chunk) => surfaceChunk(f, chunk));
    assert.ok(whole.positions.length > 0);
    assert.deepEqual(
      triangles(parts.flatMap((p) => p.positions)),
      triangles(whole.positions),
    );
    assert.ok(
      parts.every(
        (p) =>
          p.positions.length === p.colors.length &&
          p.positions.every(Number.isFinite),
      ),
    );
    const q = f.points[f.index(8, 8, 8)];
    f.strikeAt(q, 2, 0.8, strikeOptions, { x: 0, y: 1, z: 0 });
  }
});

void test('D19 authored tower never borrows historical final-round dimensions', () => {
  const a = new IceField(17, undefined, { scale: 1, shape: 'tower' });
  const b = new IceField(18, undefined, { scale: 1, shape: 'tower' });
  const c = new IceField(19, undefined, { scale: 1, shape: 'tower' });
  assert.deepEqual(a.values, b.values);
  assert.deepEqual(a.values, c.values);
  assert.notDeepEqual(
    new IceField(TUNE.finalRound - 1).values,
    new IceField(0).values,
  );
});

void test('all six small evidence items start packed in actual surrounding ice', () => {
  for (const id of [
    'tag',
    'ring',
    'hold',
    'log',
    'access',
    'ledger',
  ] as StoryObjectId[]) {
    const field = new IceField(0, undefined, { scale: 1, shape: 'parcel' });
    const t = evidence(id);
    assert.ok(field.solidIntersectionCount(t) > 0, id);
    field.carveLoot([t]);
    assert.ok(field.solidIntersectionCount(t) > 0, id);
    assert.equal(
      field.canRelease(t),
      false,
      `${id} cannot release inside a sealed cavity`,
    );
    field.points.forEach((p, i) => {
      if (Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) < 2.5)
        field.values[i] = 0;
    });
    assert.ok(field.remaining() > 0);
    assert.equal(
      field.canRelease(t),
      true,
      `${id} releases the same update its actual restraint is gone`,
    );
  }
});

void test('chunk renderer prioritizes impact, retains queued work across budget and owns obsolete geometry only', () => {
  const material = new THREE.MeshPhysicalMaterial();
  let materialDisposals = 0;
  material.addEventListener('dispose', () => materialDisposals++);
  const mesh = new ChunkedIceMesh(material),
    f = variable(spec(6, 5, 5));
  mesh.setField(f);
  const bounds = (mesh.userData.deliveryBounds as THREE.Box3).clone();
  const impact = f.points[f.index(17, 9, 9)],
    expected = f.chunks.find((c) => c.cx === 2 && c.cy === 1 && c.cz === 1)!;
  const first = mesh.rebuild(0, impact);
  assert.deepEqual(first.lastRebuiltIds, [expected.id]);
  assert.ok(first.dirtyChunks > 0);
  mesh.rebuild(Infinity);
  assert.equal(f.dirtyChunks.size, 0);
  assert.equal(f.dirty, false);
  const old = mesh.chunkMeshes.get(expected.id)!.geometry;
  let replacementDisposals = 0;
  old.addEventListener('dispose', () => replacementDisposals++);
  f.revision++;
  f.values[f.index(17, 9, 9)] = 0;
  f.markSampleChanged(f.index(17, 9, 9));
  mesh.rebuild(Infinity, impact);
  assert.equal(replacementDisposals, 1);
  assert.deepEqual(mesh.userData.deliveryBounds, bounds);
  let levelDisposals = 0;
  const count = mesh.chunkMeshes.size;
  for (const child of mesh.chunkMeshes.values())
    child.geometry.addEventListener('dispose', () => levelDisposals++);
  mesh.setField(variable());
  assert.equal(levelDisposals, count);
  mesh.rebuild(Infinity);
  let rootDisposals = 0;
  mesh.geometry.addEventListener('dispose', () => rootDisposals++);
  mesh.dispose();
  mesh.dispose();
  assert.equal(rootDisposals, 1);
  assert.equal(materialDisposals, 0);
  assert.equal(mesh.chunkMeshes.size, 0);
  assert.equal(mesh.stats.geometryCount, 0);
  material.dispose();
});

void test('chunk root raycasts match one full surface with either recursive setting', () => {
  const material = new THREE.MeshPhysicalMaterial({ side: THREE.DoubleSide });
  const f = variable(spec(6, 5, 5)),
    mesh = new ChunkedIceMesh(material);
  mesh.setField(f);
  mesh.rebuild(Infinity);
  mesh.updateMatrixWorld(true);
  const ray = new THREE.Raycaster(
    new THREE.Vector3(0.17, 12, 0.27),
    new THREE.Vector3(0, -1, 0),
  );
  const noRecursion = ray.intersectObject(mesh, false),
    recursive = ray.intersectObject(mesh, true);
  assert.ok(noRecursion.length > 0);
  assert.equal(
    noRecursion.length,
    recursive.length,
    'root delegation cannot duplicate recursive hits',
  );
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(surface(f).positions, 3),
  );
  const full = new THREE.Mesh(geometry, material);
  full.updateMatrixWorld(true);
  const hits = ray.intersectObject(full, false);
  assert.equal(noRecursion.length, hits.length);
  assert.ok(
    noRecursion.every(
      (hit, i) => Math.abs(hit.distance - hits[i].distance) < 0.000001,
    ),
  );
  geometry.dispose();
  mesh.dispose();
  material.dispose();
});

void test('twenty field replacements keep chunk geometry ownership bounded after each dispose', () => {
  const material = new THREE.MeshPhysicalMaterial();
  let created = 0,
    disposed = 0;
  for (let i = 0; i < 20; i++) {
    const mesh = new ChunkedIceMesh(material);
    created++;
    mesh.geometry.addEventListener('dispose', () => disposed++);
    mesh.setField(variable(spec(2.1, 1.8, 1.6)));
    mesh.rebuild(Infinity);
    for (const child of mesh.chunkMeshes.values()) {
      created++;
      child.geometry.addEventListener('dispose', () => disposed++);
    }
    mesh.dispose();
    assert.equal(
      disposed,
      created,
      `iteration ${i}: all owner geometries disposed`,
    );
  }
  material.dispose();
});

void test('held edits throttle global connectivity while an exposed object releases on the edited frame', () => {
  const m = new GameModel(undefined, { legacy: true });
  const f = variable(spec(6, 5, 5));
  m.field = f;
  const target: Loot = {
    ...evidence('ring'),
    id: 'release-now',
    story: undefined,
    value: 35,
    x: 0,
    y: 2.1,
    z: 0,
    w: 0.24,
    h: 0.12,
    d: 0.24,
  };
  m.loot = [target, { ...target, id: 'still-held', x: 1.8 }];
  let searches = 0,
    credits = 0;
  const detach = f.detach.bind(f);
  f.detach = () => {
    searches++;
    return detach();
  };
  m.onCredit = () => credits++;
  const i = f.index(3, 3, 3);
  for (let frame = 0; frame < 60; frame++) {
    f.values[i] = Math.max(0.8, f.values[i] - 0.001);
    f.revision++;
    f.markSampleChanged(i);
    m.update(1 / 60, null);
  }
  assert.ok(
    searches >= 5 && searches <= 7,
    `global flood fill ran ${searches} times per 60 edited frames`,
  );
  assert.equal(target.state, 'embedded');
  // Deliberately reset the cadence below threshold. Clearing the actual local
  // volume must still recover this object without waiting for the next BFS.
  m.connect = 0;
  const before = searches;
  f.points.forEach((p, index) => {
    if (Math.hypot(p.x - target.x, p.y - target.y, p.z - target.z) < 0.8) {
      f.values[index] = 0;
      f.markSampleChanged(index);
    }
  });
  f.revision++;
  m.update(1 / 60, null);
  assert.equal(
    searches,
    before,
    'same-frame release does not require another global search',
  );
  assert.notEqual(target.state, 'embedded');
  assert.equal(target.credited, true);
  assert.equal(credits, 1);
  const money = m.money;
  for (let frame = 0; frame < 10; frame++) m.update(1 / 60, null);
  assert.equal(m.money, money);
  assert.equal(
    credits,
    1,
    'falling and delayed connectivity cannot credit the same reward twice',
  );
});

void test('all 32 authored deliveries meet physical budgets with deterministic captive cargo and exact payout pools', () => {
  const phaseCounts = [
    1, 1, 1, 1, 2, 1, 2, 2, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 1, 2, 2, 3, 2, 3, 3,
    1, 2, 2, 3, 3, 3, 5,
  ];
  const firstSolids: number[] = [];
  assert.equal(BLOCKS.length, 32);
  for (let delivery = 0; delivery < 32; delivery++) {
    const b = blockSpec(delivery, 3);
    assert.equal(b.phases, phaseCounts[delivery]);
    assert.equal(b.ice!.phases.length, b.phases);
    let gross = 0;
    for (let phase = 0; phase < b.phases; phase++) {
      const f = campaignField(delivery, phase, undefined, 3),
        loot = campaignLoot(delivery, phase, 3),
        p = b.ice!.phases[phase];
      assert.equal(f.grid.legacy, false);
      assert.equal(f.grid.cellSize, 0.3);
      assert.deepEqual(loot, campaignLoot(delivery, phase, 3));
      assert.equal(new Set(loot.map((t) => t.id)).size, loot.length);
      f.carveLoot(loot);
      const solid = f.remaining();
      // The authored outer-shell budgets predate solid cargo packing. Account
      // explicitly for the now-filled cavity volume instead of shrinking ice.
      const historical = campaignField(delivery, phase, undefined, 3);
      historical.carveLoot(loot, true);
      const packing = solid - historical.remaining();
      assert.ok(
        solid >= p.targetSolidSamples.min * 0.88 &&
          solid <= p.targetSolidSamples.max * 1.12 + packing,
        `delivery ${delivery + 1} phase ${phase + 1}: ${solid} solid samples outside ${p.targetSolidSamples.min}–${p.targetSolidSamples.max}`,
      );
      assert.equal(
        Object.values(f.materialCounts()).reduce((s, n) => s + n, 0),
        solid,
      );
      if (!phase) firstSolids.push(solid - packing);
      for (const t of loot) {
        assert.ok(f.solidIntersectionCount(t) > 0, t.id);
        assert.equal(
          f.canRelease(t),
          false,
          `${t.id} must initially be held by real bordering ice`,
        );
        gross += t.value;
      }
      assert.equal(
        loot.some((t) => t.story === b.object && !!b.object),
        !!b.object && phase === b.phases - 1,
      );
    }
    assert.equal(
      gross,
      b.baseGross,
      `${b.id} payout pool must not multiply with phase count`,
    );
  }
  assert.equal(blockSpec(7, 3).object, 'ring');
  assert.equal(blockSpec(18, 3).ice!.phases[0].profile, 'tower');
  assert.deepEqual(
    blockSpec(31, 3).ice!.phases.map((p) => p.id),
    [
      'outer-braces',
      'compression-seam',
      'archive-lattice',
      'service-seal',
      'ledger-cradle',
    ],
  );
  for (const relief of [5, 11, 18, 25])
    assert.ok(
      firstSolids[relief] < firstSolids[relief - 1],
      `D${relief + 1} retains its lighter outer shell`,
    );
  const early = firstSolids.slice(0, 5).reduce((s, n) => s + n, 0) / 5,
    late = firstSolids.slice(25, 31).reduce((s, n) => s + n, 0) / 6;
  assert.ok(
    late > early * 6,
    'late campaign contains substantially more actual ice',
  );
  assert.equal(campaignField(0, 0, undefined, 2).values.length, 4830);
  assert.equal(
    blockSpec(0, 2).phases,
    3,
    'explicit legacy descriptors remain frozen',
  );
});

void test('postgame contracts combine deterministic structures, sizes, materials, cargo and bonus-only objectives', () => {
  const archetypes = new Set<string>(),
    hashes = new Set<string>();
  for (let index = 32; index < 42; index++) {
    const b = blockSpec(index, 3);
    assert.deepEqual(b, blockSpec(index, 3));
    archetypes.add(b.contract!.archetype);
    assert.ok(b.contract!.objective.bonus > 0);
    assert.ok(b.baseGross! > b.baseNet!);
    assert.equal(b.object, undefined);
    assert.equal(b.ice!.phases.length, b.phases);
    let gross = 0;
    for (let phase = 0; phase < b.phases; phase++) {
      const field = campaignField(index, phase),
        loot = campaignLoot(index, phase);
      hashes.add(field.grid.layoutHash);
      field.carveLoot(loot);
      assert.ok(
        loot.every(
          (t) => !field.canRelease(t) && field.solidIntersectionCount(t) > 0,
        ),
      );
      gross += loot.reduce((s, t) => s + t.value, 0);
    }
    assert.equal(gross, b.baseGross);
  }
  assert.equal(archetypes.size, 5);
  assert.ok(hashes.size >= 10);
});
