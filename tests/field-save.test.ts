import test from 'node:test';
import assert from 'node:assert/strict';
import { IceField } from '../lib/game/ice';
import { type FieldSpec } from '../lib/game/ice-grid';
import { TUNE } from '../lib/game/tuning';
import {
  decodeIceField,
  encodeIceField,
  resampleLegacyField,
  MAX_SAVED_FIELD_SAMPLES,
} from '../lib/game/field-save';

const identity = { deliveryId: 'claim-test', phaseIndex: 0 };
const spec = (overrides: Partial<FieldSpec> = {}): FieldSpec => ({
  profile: 'parcel',
  dimensions: { width: 4.4, height: 2.6, depth: 2.4 },
  deliveryId: identity.deliveryId,
  phaseId: 'outer',
  ...overrides,
});
const field = (value: FieldSpec = spec()) =>
  new IceField(0, undefined, undefined, value);
const rawRuns = (...bytes: number[]) => btoa(String.fromCharCode(...bytes));
const close = (a: number, b: number, epsilon = 1e-8) =>
  assert.ok(Math.abs(a - b) < epsilon, `${a} != ${b}`);

void test('variable field compact save roundtrip quantizes within half a byte', () => {
  const source = field();
  for (let i = 0; i < source.values.length; i++)
    source.values[i] = (i % 997) / 996;
  const saved = encodeIceField(source, identity),
    target = field();
  const result = decodeIceField(
    JSON.parse(JSON.stringify(saved)),
    target,
    identity,
  );
  assert.equal(result.ok, true);
  assert.equal(saved.encoding, 'u8-rle-base64');
  assert.equal(saved.nx, source.grid.nx);
  assert.equal(saved.layoutHash, source.grid.layoutHash);
  for (let i = 0; i < source.values.length; i++)
    assert.ok(
      Math.abs(source.values[i] - target.values[i]) <= 0.5 / 255 + 1e-7,
    );
});

void test('ten save cycles are byte-identical after the first quantization', () => {
  let current = field();
  current.values.forEach((v, i) => {
    if (v > 0 && i % 3 === 0) current.values[i] = v * 0.637;
  });
  let saved = encodeIceField(current, identity);
  for (let i = 0; i < 10; i++) {
    const next = field();
    assert.equal(decodeIceField(saved, next, identity).ok, true);
    const again = encodeIceField(next, identity);
    assert.deepEqual(again, saved);
    current = next;
    saved = again;
  }
});

void test('saving at the exact isosurface threshold cannot recreate an already cut support', () => {
  const source = field();
  source.values.set([0.49999, 0.5, 0.50001, 0, 1]);
  const wasSolid = Array.from(source.values, (v) => v > 0.5);
  let saved = encodeIceField(source, identity);
  for (let cycle = 0; cycle < 10; cycle++) {
    const next = field();
    assert.equal(decodeIceField(saved, next, identity).ok, true);
    assert.deepEqual(
      Array.from(next.values, (v) => v > 0.5),
      wasSolid,
    );
    const encoded = encodeIceField(next, identity);
    assert.deepEqual(encoded, saved);
    saved = encoded;
  }
});

void test('intact and partially dug fields retain holes and damaged values', () => {
  const source = field();
  source.points.forEach((p, i) => {
    if (Math.abs(p.x) < 0.6 && p.y > 1) source.values[i] = 0;
    else if (source.values[i] > 0.5 && p.x > 0.4) source.values[i] = 0.7;
  });
  const target = field();
  decodeIceField(encodeIceField(source, identity), target, identity);
  for (let i = 0; i < source.values.length; i++) {
    if (source.values[i] === 0) assert.equal(target.values[i], 0);
    if (Math.abs(source.values[i] - 0.7) < 1e-6)
      assert.ok(target.values[i] > 0.69 && target.values[i] < 0.71);
  }
});

void test('legacy tutorial topology uses the same codec descriptor', () => {
  const source = new IceField(0, undefined, {
    scale: 0.34,
    shape: 'parcel',
    releaseMode: 'surfaceExposure',
  });
  assert.equal(source.grid.legacy, true);
  assert.equal(source.values.length, 4830);
  const target = new IceField(0, undefined, {
    scale: 0.34,
    shape: 'parcel',
    releaseMode: 'surfaceExposure',
  });
  const tutorial = { deliveryId: 'tutorial-parcel-1', phaseIndex: 0 };
  assert.equal(
    decodeIceField(encodeIceField(source, tutorial), target, tutorial).ok,
    true,
  );
  assert.deepEqual(
    encodeIceField(target, tutorial),
    encodeIceField(source, tutorial),
  );
});

void test('RLE splits runs beyond uint16 without losing samples', () => {
  const source = field(
    spec({ dimensions: { width: 12, height: 12, depth: 12 } }),
  );
  assert.ok(
    source.values.length > 65535 &&
      source.values.length < MAX_SAVED_FIELD_SAMPLES,
  );
  source.values.fill(1);
  const saved = encodeIceField(source, identity),
    target = field(spec({ dimensions: { width: 12, height: 12, depth: 12 } }));
  assert.ok(saved.density.length < 32);
  assert.equal(decodeIceField(saved, target, identity).ok, true);
  assert.ok(target.values.every((v) => v === 1));
});

void test('invalid encoding, identities and layout metadata are rejected atomically', () => {
  const target = field(),
    saved = encodeIceField(target, identity),
    before = target.values.slice(),
    revision = target.revision;
  const variants = [
    [{ ...saved, encoding: 'json' }, 'unsupported-encoding'],
    [{ ...saved, deliveryId: 'different' }, 'identity-mismatch'],
    [{ ...saved, phaseIndex: 1 }, 'identity-mismatch'],
    [{ ...saved, layoutHash: 'different' }, 'layout-mismatch'],
    [{ ...saved, layoutVersion: saved.layoutVersion + 1 }, 'layout-mismatch'],
    [{ ...saved, nx: saved.nx + 1 }, 'grid-mismatch'],
    [{ ...saved, cellSize: 0.31 }, 'grid-mismatch'],
    [{ ...saved, nx: Infinity }, 'invalid-metadata'],
    [{ ...saved, phaseIndex: -1 }, 'invalid-metadata'],
  ] as const;
  for (const [raw, reason] of variants) {
    assert.deepEqual(decodeIceField(raw, target, identity), {
      ok: false,
      reason,
    });
    assert.deepEqual(target.values, before);
    assert.equal(target.revision, revision);
  }
});

void test('corrupt truncated and oversized base64 never partially applies a field', () => {
  const target = field(),
    saved = encodeIceField(target, identity),
    before = target.values.slice();
  for (const density of [
    '',
    '!!!!',
    'A',
    'A===',
    saved.density.slice(0, -4),
    'AAAA'.repeat(target.values.length + 1),
  ]) {
    const result = decodeIceField({ ...saved, density }, target, identity);
    assert.equal(result.ok, false);
    assert.deepEqual(target.values, before);
  }
  assert.deepEqual(
    decodeIceField(
      { ...saved, density: 'AAAA'.repeat(target.values.length + 1) },
      target,
      identity,
    ),
    { ok: false, reason: 'encoded-size-limit' },
  );
});

void test('zero-run, truncated-run, underflow and overflow RLE streams reject safely', () => {
  const target = field(),
    saved = encodeIceField(target, identity),
    n = target.values.length;
  const cases = [
    [rawRuns(0, 0, 128), 'invalid-rle'],
    [rawRuns(1, 0), 'invalid-rle'],
    [rawRuns(1, 0, 128), 'sample-count-mismatch'],
    [rawRuns((n + 1) & 255, (n + 1) >>> 8, 128), 'sample-count-mismatch'],
  ] as const;
  for (const [density, reason] of cases)
    assert.deepEqual(decodeIceField({ ...saved, density }, target, identity), {
      ok: false,
      reason,
    });
});

void test('base64 noncanonical padding bits and extra whitespace are rejected', () => {
  const target = field(),
    saved = encodeIceField(target, identity);
  for (const density of ['AB==', 'AAB=', ' AAAA', 'AAAA\n'])
    assert.deepEqual(decodeIceField({ ...saved, density }, target, identity), {
      ok: false,
      reason: 'invalid-base64',
    });
});

void test('decoding refreshes dirty chunks and clears transient warmth', () => {
  const target = field();
  target.dirty = false;
  target.dirtyChunks.clear();
  target.warmth.fill(10);
  const revision = target.revision;
  assert.equal(
    decodeIceField(encodeIceField(field(), identity), target, identity).ok,
    true,
  );
  assert.equal(target.dirty, true);
  assert.ok(target.revision > revision);
  assert.equal(target.dirtyChunks.size, target.chunks.length);
  assert.ok(target.warmth.every((v) => v === 0));
});

void test('invalid source density cannot be encoded silently as undamaged ice', () => {
  for (const value of [NaN, Infinity, -0.1, 1.1]) {
    const source = field();
    source.values[2] = value;
    assert.throws(() => encodeIceField(source, identity));
  }
});

void test('layout-hash mismatch is explicit even when sample dimensions match', () => {
  const a = field(
    spec({ materials: [{ material: 'clear', region: { kind: 'all' } }] }),
  );
  const b = field(
    spec({ materials: [{ material: 'dense', region: { kind: 'all' } }] }),
  );
  assert.equal(a.values.length, b.values.length);
  assert.notEqual(a.grid.layoutHash, b.grid.layoutHash);
  assert.deepEqual(decodeIceField(encodeIceField(a, identity), b, identity), {
    ok: false,
    reason: 'layout-mismatch',
  });
});

void test('legacy world-space migration preserves a real carved channel and new pockets', () => {
  const old = new IceField(0, undefined, { scale: 0.34, shape: 'parcel' });
  old.points.forEach((p, i) => {
    if (Math.abs(p.x) < 0.65 && p.y > 1) old.values[i] = 0;
  });
  const target = field();
  const pocket = target.points.findIndex(
    (p, i) => target.values[i] > 0.5 && p.x > 1 && p.y > 1,
  );
  assert.ok(pocket >= 0);
  target.values[pocket] = 0;
  const result = resampleLegacyField(old, target);
  assert.equal(result.ok, true);
  assert.ok(result.coverage >= 0.85);
  assert.ok(result.preservedEmptySamples > 0);
  assert.equal(target.values[pocket], 0);
  for (let i = 0; i < target.values.length; i++)
    if (
      Math.abs(target.points[i].x) < 0.2 &&
      target.points[i].y > 1.3 &&
      target.points[i].y < 2.2
    )
      assert.equal(target.values[i], 0);
});

void test('historical 4830 sample coordinate model migrates with its existing interpolation', () => {
  const old = new IceField(TUNE.finalRound - 1, undefined, {
    scale: 0.34,
    shape: 'parcel',
    historicalFinal: true,
  });
  assert.equal(old.values.length, 4830);
  old.points.forEach((p, i) => {
    if (p.x > 0.5 && p.y > 1) old.values[i] *= 0.4;
  });
  const target = field();
  const original = target.values.slice();
  const result = resampleLegacyField(old, target);
  assert.equal(result.ok, true);
  for (let i = 0; i < target.values.length; i++)
    close(
      target.values[i],
      Math.min(original[i], old.density(target.points[i])),
      1e-6,
    );
});

void test('unsafe legacy profile, size and overlap mappings preserve the generated target', () => {
  const old = new IceField(0, undefined, { scale: 0.34, shape: 'parcel' });
  const wrongProfile = field(spec({ profile: 'seam' }));
  const before = wrongProfile.values.slice();
  assert.equal(
    resampleLegacyField(old, wrongProfile).reason,
    'profile-mismatch',
  );
  assert.deepEqual(wrongProfile.values, before);
  const oversized = field(
      spec({ dimensions: { width: 11, height: 7, depth: 6 } }),
    ),
    largeBefore = oversized.values.slice();
  assert.equal(resampleLegacyField(old, oversized).reason, 'size-mismatch');
  assert.deepEqual(oversized.values, largeBefore);
  const translated = field();
  translated.points.forEach((p) => {
    p.x += 100;
  });
  const farBefore = translated.values.slice();
  assert.equal(resampleLegacyField(old, translated).reason, 'no-overlap');
  assert.deepEqual(translated.values, farBefore);
});

void test('malformed legacy interpolation rejects without a partial migration', () => {
  const old = new IceField(0, undefined, { scale: 0.34, shape: 'parcel' }),
    target = field(),
    before = target.values.slice();
  let calls = 0;
  old.density = () => (++calls > 50 ? NaN : 0);
  assert.equal(
    resampleLegacyField(old, target).reason,
    'invalid-interpolation',
  );
  assert.deepEqual(target.values, before);
});

void test('the worst legal RLE payload is bounded and decodes without regex recursion', () => {
  const grid = { ...field().grid, nx: 100, ny: 50, nz: 50 };
  const source = {
    grid,
    values: Float32Array.from(
      { length: MAX_SAVED_FIELD_SAMPLES },
      (_, i) => i % 2,
    ),
  };
  const saved = encodeIceField(source, identity);
  assert.equal(saved.density.length, MAX_SAVED_FIELD_SAMPLES * 4);
  const target = { grid, values: new Float32Array(MAX_SAVED_FIELD_SAMPLES) };
  assert.equal(decodeIceField(saved, target, identity).ok, true);
  assert.deepEqual(target.values, source.values);
});

void test('a decoded partially worked field can continue normal impacts and release', () => {
  const source = field();
  const point = { x: 0, y: 2.3, z: 0 };
  const options = { center: 1, depth: 1, weak: 1, support: 1, detach: 1 };
  source.strikeAt(point, 0.2, 0.9, options, { x: 0, y: 1, z: 0 });
  const target = field();
  assert.equal(
    decodeIceField(encodeIceField(source, identity), target, identity).ok,
    true,
  );
  const before = target.values.reduce((sum, value) => sum + value, 0);
  target.strikeAt(point, 0.2, 0.9, options, { x: 0, y: 1, z: 0 });
  assert.ok(target.values.reduce((sum, value) => sum + value, 0) < before);
  const item = {
    id: 'released-coin',
    kind: 'coin' as const,
    value: 100,
    x: 0,
    y: 1.4,
    z: 0,
    w: 0.5,
    h: 0.15,
    d: 0.5,
    state: 'embedded' as const,
    age: 0,
    vy: 0,
    credited: false,
  };
  target.values.fill(0);
  const clear = field();
  assert.equal(
    decodeIceField(encodeIceField(target, identity), clear, identity).ok,
    true,
  );
  assert.equal(clear.canRelease(item), true);
});

void test('a corrupted value byte with otherwise valid RLE triggers the safe fallback', () => {
  const source = field();
  source.values.fill(1);
  const saved = encodeIceField(source, identity);
  const bytes = atob(saved.density);
  const corrupted = btoa(
    bytes.slice(0, 2) + String.fromCharCode(64) + bytes.slice(3),
  );
  const target = field(),
    before = target.values.slice();
  assert.deepEqual(
    decodeIceField({ ...saved, density: corrupted }, target, identity),
    {
      ok: false,
      reason: 'checksum-mismatch',
    },
  );
  assert.deepEqual(target.values, before);
  assert.deepEqual(
    decodeIceField({ ...saved, payloadChecksum: undefined }, target, identity),
    {
      ok: false,
      reason: 'checksum-mismatch',
    },
  );
});
