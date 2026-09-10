import type { IceField } from './ice';
import type { IceGridSpec } from './ice-grid';

export const FIELD_SAVE_ENCODING = 'u8-rle-base64' as const;
export const MAX_SAVED_FIELD_SAMPLES = 250_000;
export type FieldIdentity = { deliveryId: string; phaseIndex: number };
export type SavedIceField = FieldIdentity & {
  encoding: typeof FIELD_SAVE_ENCODING;
  layoutVersion: number;
  layoutHash: string;
  nx: number;
  ny: number;
  nz: number;
  cellSize: number;
  density: string;
  payloadChecksum: string;
};
export type FieldSaveFailure =
  | 'invalid-record'
  | 'unsupported-encoding'
  | 'invalid-metadata'
  | 'identity-mismatch'
  | 'layout-mismatch'
  | 'grid-mismatch'
  | 'invalid-field'
  | 'encoded-size-limit'
  | 'invalid-base64'
  | 'invalid-rle'
  | 'sample-count-mismatch'
  | 'checksum-mismatch';
export type FieldLoadResult =
  | { ok: true; samples: number; encodedBytes: number }
  | { ok: false; reason: FieldSaveFailure };
type StorageField = {
  grid: IceGridSpec;
  values: Float32Array;
  warmth?: Float32Array;
  dirty?: boolean;
  revision?: number;
  markAllDirty?: () => void;
};
const validNumber = (n: unknown): n is number =>
  typeof n === 'number' && Number.isFinite(n);
const validId = (id: unknown): id is string =>
  typeof id === 'string' && id.length > 0 && id.length <= 160;
const validPhase = (phase: unknown): phase is number =>
  Number.isInteger(phase) && (phase as number) >= 0 && (phase as number) < 256;
function sampleCount(grid: Pick<IceGridSpec, 'nx' | 'ny' | 'nz'>) {
  if (
    ![grid.nx, grid.ny, grid.nz].every(
      (n) => Number.isInteger(n) && n >= 2 && n <= 1024,
    )
  )
    return 0;
  const n = grid.nx * grid.ny * grid.nz;
  return Number.isSafeInteger(n) && n <= MAX_SAVED_FIELD_SAMPLES ? n : 0;
}
function validGrid(grid: IceGridSpec) {
  return (
    sampleCount(grid) > 0 &&
    validNumber(grid.cellSize) &&
    grid.cellSize > 0 &&
    grid.cellSize <= 100 &&
    Number.isInteger(grid.layoutVersion) &&
    grid.layoutVersion > 0 &&
    grid.layoutVersion <= 1_000_000 &&
    validId(grid.layoutHash)
  );
}
function validDensity(values: Float32Array) {
  for (const value of values)
    if (!Number.isFinite(value) || value < 0 || value > 1) return false;
  return true;
}
function dirty(field: StorageField) {
  field.warmth?.fill(0);
  field.dirty = true;
  field.revision = (field.revision ?? 0) + 1;
  field.markAllDirty?.();
}
function toBase64(bytes: Uint8Array) {
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += 8192)
    parts.push(String.fromCharCode(...bytes.subarray(i, i + 8192)));
  return btoa(parts.join(''));
}
const alphabet =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function payloadChecksum(text: string) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++)
    hash = Math.imul(hash ^ text.charCodeAt(i), 16777619);
  return `fnv1a-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
function validBase64(text: string) {
  if (!text.length || text.length % 4 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
    return false;
  // Reject non-canonical padding bits rather than accepting multiple strings
  // for the same save. No decoded array is needed for this check.
  if (text.endsWith('=='))
    return (alphabet.indexOf(text[text.length - 3]) & 15) === 0;
  if (text.endsWith('='))
    return (alphabet.indexOf(text[text.length - 2]) & 3) === 0;
  return true;
}

/** Deterministic little-endian uint16 count / uint8 value runs. */
export function encodeIceField(
  field: StorageField,
  identity: FieldIdentity,
): SavedIceField {
  if (
    !validGrid(field.grid) ||
    field.values.length !== sampleCount(field.grid) ||
    !validDensity(field.values) ||
    !validId(identity.deliveryId) ||
    !validPhase(identity.phaseIndex)
  )
    throw new Error('Cannot encode an invalid ice field');
  const bytes = new Uint8Array(field.values.length * 3);
  let offset = 0,
    run = 0,
    last = -1;
  const flush = () => {
    bytes[offset++] = run & 255;
    bytes[offset++] = run >>> 8;
    bytes[offset++] = last;
  };
  for (const value of field.values) {
    // The renderer/release boundary is strictly > 0.5. Its exact midpoint
    // must round toward air, otherwise a reload can recreate a cut support.
    const quantized = value === 0.5 ? 127 : Math.round(value * 255);
    if (quantized === last && run < 65535) run++;
    else {
      if (run) flush();
      last = quantized;
      run = 1;
    }
  }
  if (run) flush();
  const { layoutVersion, layoutHash, nx, ny, nz, cellSize } = field.grid;
  const density = toBase64(bytes.subarray(0, offset));
  return {
    encoding: FIELD_SAVE_ENCODING,
    layoutVersion,
    layoutHash,
    deliveryId: identity.deliveryId,
    phaseIndex: identity.phaseIndex,
    nx,
    ny,
    nz,
    cellSize,
    density,
    payloadChecksum: payloadChecksum(density),
  };
}

/** Decode atomically into an already generated field. Failures leave it intact. */
export function decodeIceField(
  raw: unknown,
  field: StorageField,
  identity: FieldIdentity,
): FieldLoadResult {
  const fail = (reason: FieldSaveFailure): FieldLoadResult => ({
    ok: false,
    reason,
  });
  if (!raw || typeof raw !== 'object' || Array.isArray(raw))
    return fail('invalid-record');
  const save = raw as Record<string, unknown>;
  if (save.encoding !== FIELD_SAVE_ENCODING)
    return fail('unsupported-encoding');
  if (!validGrid(field.grid) || field.values.length !== sampleCount(field.grid))
    return fail('invalid-field');
  if (
    !validId(save.deliveryId) ||
    !validPhase(save.phaseIndex) ||
    !validId(save.layoutHash) ||
    !Number.isInteger(save.layoutVersion) ||
    (save.layoutVersion as number) <= 0 ||
    !validNumber(save.cellSize) ||
    save.cellSize <= 0 ||
    ![save.nx, save.ny, save.nz].every(
      (n) => Number.isInteger(n) && (n as number) >= 2 && (n as number) <= 1024,
    )
  )
    return fail('invalid-metadata');
  if (
    save.deliveryId !== identity.deliveryId ||
    save.phaseIndex !== identity.phaseIndex
  )
    return fail('identity-mismatch');
  if (
    save.layoutVersion !== field.grid.layoutVersion ||
    save.layoutHash !== field.grid.layoutHash
  )
    return fail('layout-mismatch');
  if (
    save.nx !== field.grid.nx ||
    save.ny !== field.grid.ny ||
    save.nz !== field.grid.nz ||
    save.cellSize !== field.grid.cellSize
  )
    return fail('grid-mismatch');
  const count = field.values.length;
  if (typeof save.density !== 'string') return fail('invalid-record');
  // A legal run costs three bytes; the worst case is one run per sample.
  // Check the bounded input length before atob or any output allocation.
  if (save.density.length > count * 4) return fail('encoded-size-limit');
  if (!validBase64(save.density)) return fail('invalid-base64');
  let binary: string;
  try {
    binary = atob(save.density);
  } catch {
    return fail('invalid-base64');
  }
  if (binary.length % 3) return fail('invalid-rle');
  let decoded = 0;
  for (let i = 0; i < binary.length; i += 3) {
    const run = binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8);
    if (!run) return fail('invalid-rle');
    decoded += run;
    if (decoded > count) return fail('sample-count-mismatch');
  }
  if (decoded !== count) return fail('sample-count-mismatch');
  if (
    typeof save.payloadChecksum !== 'string' ||
    save.payloadChecksum !== payloadChecksum(save.density)
  )
    return fail('checksum-mismatch');
  // Every run is now validated. Mutation cannot partially apply a bad stream.
  let index = 0;
  for (let i = 0; i < binary.length; i += 3) {
    const run = binary.charCodeAt(i) | (binary.charCodeAt(i + 1) << 8);
    field.values.fill(binary.charCodeAt(i + 2) / 255, index, index + run);
    index += run;
  }
  dirty(field);
  return { ok: true, samples: count, encodedBytes: binary.length };
}

type ResampleField = Pick<IceField, 'grid' | 'points' | 'values' | 'density'> &
  Partial<
    Pick<
      IceField,
      'profile' | 'spec' | 'warmth' | 'dirty' | 'revision' | 'markAllDirty'
    >
  >;
export type LegacyResampleReason =
  | 'invalid-source'
  | 'invalid-target'
  | 'profile-mismatch'
  | 'size-mismatch'
  | 'no-overlap'
  | 'low-overlap'
  | 'invalid-interpolation';
export type LegacyResampleResult = {
  ok: boolean;
  reason?: LegacyResampleReason;
  confidence: number;
  coverage: number;
  dimensionRatios: [number, number, number];
  samples: number;
  preservedEmptySamples: number;
};

/** Conservative world-space migration. Never rescales old holes to invent a fit. */
export function resampleLegacyField(
  oldField: ResampleField,
  newField: ResampleField,
): LegacyResampleResult {
  const result: LegacyResampleResult = {
    ok: false,
    confidence: 0,
    coverage: 0,
    dimensionRatios: [0, 0, 0],
    samples: 0,
    preservedEmptySamples: 0,
  };
  const fail = (reason: LegacyResampleReason) => ({ ...result, reason });
  if (
    !validGrid(oldField.grid) ||
    oldField.values.length !== sampleCount(oldField.grid) ||
    oldField.points.length !== oldField.values.length ||
    !validDensity(oldField.values)
  )
    return fail('invalid-source');
  if (
    !validGrid(newField.grid) ||
    newField.values.length !== sampleCount(newField.grid) ||
    newField.points.length !== newField.values.length ||
    !validDensity(newField.values)
  )
    return fail('invalid-target');
  const oldProfile = oldField.spec?.profile ?? oldField.profile?.shape,
    newProfile = newField.spec?.profile ?? newField.profile?.shape;
  if (oldProfile && newProfile && oldProfile !== newProfile)
    return fail('profile-mismatch');
  const oldSize = [
      oldField.grid.physicalWidth,
      oldField.grid.physicalHeight,
      oldField.grid.physicalDepth,
    ],
    newSize = [
      newField.grid.physicalWidth,
      newField.grid.physicalHeight,
      newField.grid.physicalDepth,
    ];
  if (![...oldSize, ...newSize].every((n) => Number.isFinite(n) && n > 0))
    return fail('size-mismatch');
  result.dimensionRatios = newSize.map((n, i) => n / oldSize[i]) as [
    number,
    number,
    number,
  ];
  const volumeRatio = result.dimensionRatios.reduce((a, b) => a * b, 1);
  if (
    result.dimensionRatios.some((r) => r < 0.5 || r > 2) ||
    volumeRatio < 0.25 ||
    volumeRatio > 4
  )
    return fail('size-mismatch');
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of oldField.points) {
    if (![p.x, p.y, p.z].every(Number.isFinite)) return fail('invalid-source');
    for (const axis of ['x', 'y', 'z'] as const) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  }
  let reference = 0,
    covered = 0;
  for (let i = 0; i < newField.points.length; i++) {
    const p = newField.points[i];
    if (![p.x, p.y, p.z].every(Number.isFinite)) return fail('invalid-target');
    if (newField.values[i] <= 0.5) continue;
    reference++;
    if (
      p.x >= min.x &&
      p.x <= max.x &&
      p.y >= min.y &&
      p.y <= max.y &&
      p.z >= min.z &&
      p.z <= max.z
    )
      covered++;
  }
  result.coverage = reference ? covered / reference : 0;
  if (!covered) return fail('no-overlap');
  if (result.coverage < 0.85) return fail('low-overlap');
  result.confidence =
    result.coverage *
    Math.min(...result.dimensionRatios.map((r) => Math.min(r, 1 / r)));
  const migrated = new Float32Array(newField.values.length);
  for (let i = 0; i < migrated.length; i++) {
    let density: number;
    try {
      density = oldField.density(newField.points[i]);
    } catch {
      return fail('invalid-interpolation');
    }
    if (!Number.isFinite(density)) return fail('invalid-interpolation');
    // Fresh geometry/pockets remain authoritative. Only transfer removed ice.
    migrated[i] = Math.min(
      newField.values[i],
      Math.max(0, Math.min(1, density)),
    );
    if (newField.values[i] > 0.5 && migrated[i] <= 0.5)
      result.preservedEmptySamples++;
  }
  newField.values.set(migrated);
  dirty(newField);
  result.ok = true;
  result.samples = migrated.length;
  return result;
}
