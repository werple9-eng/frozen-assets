import type { Vec3 } from './tuning';

export const ICE_CELL_SIZE = 0.3;
export const CHUNK_CELLS = 8;
export const PROFILE_GENERATION_VERSION = 2;
export const CARGO_LAYOUT_VERSION = 6;
export const MATERIAL_LAYOUT_VERSION = 1;
export type IceShape =
  | 'parcel'
  | 'slab'
  | 'tower'
  | 'wings'
  | 'seam'
  | 'archive'
  | 'vault';
export type MaterialPreset =
  | 'clear'
  | 'brittle'
  | 'dense'
  | 'reinforced'
  | 'service';
export type IceMaterialDefinition = {
  hardness: number;
  fractureEase: number;
  supportStrength: number;
  thermalConductivity: number;
};
export const MATERIAL_NAMES: MaterialPreset[] = [
  'clear',
  'brittle',
  'dense',
  'reinforced',
  'service',
];
export const ICE_MATERIALS: Record<MaterialPreset, IceMaterialDefinition> = {
  clear: {
    hardness: 1,
    fractureEase: 1,
    supportStrength: 1,
    thermalConductivity: 1,
  },
  brittle: {
    hardness: 0.95,
    fractureEase: 1.25,
    supportStrength: 0.85,
    thermalConductivity: 0.95,
  },
  dense: {
    hardness: 1.16,
    fractureEase: 0.8,
    supportStrength: 1.1,
    thermalConductivity: 0.8,
  },
  reinforced: {
    hardness: 1.05,
    fractureEase: 0.85,
    supportStrength: 1.33,
    thermalConductivity: 0.9,
  },
  service: {
    hardness: 1.1,
    fractureEase: 0.9,
    supportStrength: 1.1,
    thermalConductivity: 1.28,
  },
};
export const MATERIAL_DEFINITIONS = MATERIAL_NAMES.map(
  (name) => ICE_MATERIALS[name],
);
type Axis = 'x' | 'y' | 'z';
export type MaterialRegionShape =
  | { kind: 'all' }
  | {
      kind: 'box';
      min: [number, number, number];
      max: [number, number, number];
    }
  | { kind: 'band'; axis: Axis; min: number; max: number }
  | { kind: 'outer'; axis: Axis; threshold: number }
  | { kind: 'ribs'; axis: Axis; spacing: number; width: number };
export type IceMaterialRegion = {
  material: MaterialPreset;
  region: MaterialRegionShape;
};
export type FieldSpec = {
  profile: IceShape;
  dimensions: { width: number; height: number; depth: number };
  materials?: IceMaterialRegion[];
  cellSize?: number;
  layoutVersion?: number;
  layoutHash?: string;
  deliveryId?: string;
  phaseId?: string;
  seed?: number;
  /** Defaults to the established generic cargo layout; authored revisions opt in. */
  cargoLayoutVersion?: number;
  /** Archive compartment front, as a fraction of depth from its center. */
  archiveRecess?: number;
};
export type IceGridSpec = {
  cellSize: number;
  physicalWidth: number;
  physicalHeight: number;
  physicalDepth: number;
  nx: number;
  ny: number;
  nz: number;
  originX: number;
  originY: number;
  originZ: number;
  layoutVersion: number;
  layoutHash: string;
  legacy: boolean;
};
// Min is inclusive, max is exclusive. A cell x needs samples x and x+1;
// neighboring chunks share those samples, never the extraction cell itself.
export type IceChunkBounds = {
  id: number;
  cx: number;
  cy: number;
  cz: number;
  cellMinX: number;
  cellMinY: number;
  cellMinZ: number;
  cellMaxX: number;
  cellMaxY: number;
  cellMaxZ: number;
};
function regionKey(region: MaterialRegionShape) {
  switch (region.kind) {
    case 'all':
      return 'all';
    case 'box':
      return `box:${region.min.join(',')}:${region.max.join(',')}`;
    case 'band':
      return `band:${region.axis}:${region.min}:${region.max}`;
    case 'outer':
      return `outer:${region.axis}:${region.threshold}`;
    case 'ribs':
      return `ribs:${region.axis}:${region.spacing}:${region.width}`;
  }
}
export function fieldLayoutHash(spec: FieldSpec) {
  const source = [
    spec.layoutVersion ?? 3,
    spec.deliveryId ?? '',
    spec.phaseId ?? '',
    spec.profile,
    spec.dimensions.width,
    spec.dimensions.height,
    spec.dimensions.depth,
    spec.cellSize ?? ICE_CELL_SIZE,
    PROFILE_GENERATION_VERSION,
    spec.cargoLayoutVersion ?? 2,
    MATERIAL_LAYOUT_VERSION,
    spec.seed ?? 0,
    ...(spec.archiveRecess === undefined
      ? []
      : [`recess:${spec.archiveRecess}`]),
    ...(spec.materials ?? []).map(
      (r) => `${r.material}:${regionKey(r.region)}`,
    ),
  ].join('|');
  let hash = 2166136261;
  for (let i = 0; i < source.length; i++)
    hash = Math.imul(hash ^ source.charCodeAt(i), 16777619);
  return `ice-${(hash >>> 0).toString(16).padStart(8, '0')}`;
}
export function createIceGrid(spec: FieldSpec): IceGridSpec {
  const cellSize = spec.cellSize ?? ICE_CELL_SIZE;
  const { width, height, depth } = spec.dimensions;
  if (
    spec.archiveRecess !== undefined &&
    (!Number.isFinite(spec.archiveRecess) ||
      spec.archiveRecess < 0.1 ||
      spec.archiveRecess > 0.5)
  )
    throw new Error('Archive recess must lie inside its physical field');
  if (
    ![width, height, depth, cellSize].every((n) => Number.isFinite(n) && n > 0)
  )
    throw new Error('Invalid ice dimensions');
  const nx = Math.ceil(width / cellSize) + 3,
    ny = Math.ceil(height / cellSize) + 3,
    nz = Math.ceil(depth / cellSize) + 3;
  if (nx * ny * nz > 250000)
    throw new Error('Ice grid exceeds the authored safety budget');
  return {
    cellSize,
    physicalWidth: width,
    physicalHeight: height,
    physicalDepth: depth,
    nx,
    ny,
    nz,
    originX: (-(nx - 1) * cellSize) / 2,
    originY: 0.18 - cellSize,
    originZ: (-(nz - 1) * cellSize) / 2,
    layoutVersion: spec.layoutVersion ?? 3,
    layoutHash: spec.layoutHash ?? fieldLayoutHash(spec),
    legacy: false,
  };
}
export function createIceChunks(grid: IceGridSpec): IceChunkBounds[] {
  const chunks: IceChunkBounds[] = [];
  for (let z = 0; z < grid.nz - 1; z += CHUNK_CELLS)
    for (let y = 0; y < grid.ny - 1; y += CHUNK_CELLS)
      for (let x = 0; x < grid.nx - 1; x += CHUNK_CELLS)
        chunks.push({
          id: chunks.length,
          cx: x / CHUNK_CELLS,
          cy: y / CHUNK_CELLS,
          cz: z / CHUNK_CELLS,
          cellMinX: x,
          cellMinY: y,
          cellMinZ: z,
          cellMaxX: Math.min(grid.nx - 1, x + CHUNK_CELLS),
          cellMaxY: Math.min(grid.ny - 1, y + CHUNK_CELLS),
          cellMaxZ: Math.min(grid.nz - 1, z + CHUNK_CELLS),
        });
  return chunks;
}
export function materialAt(spec: FieldSpec, p: Vec3): number {
  const q: Vec3 = {
    x: (p.x * 2) / spec.dimensions.width,
    y: (p.y - 0.18) / spec.dimensions.height,
    z: (p.z * 2) / spec.dimensions.depth,
  };
  let material = 0;
  for (const entry of spec.materials ?? []) {
    const r = entry.region;
    const match =
      r.kind === 'all' ||
      (r.kind === 'box'
        ? q.x >= r.min[0] &&
          q.y >= r.min[1] &&
          q.z >= r.min[2] &&
          q.x <= r.max[0] &&
          q.y <= r.max[1] &&
          q.z <= r.max[2]
        : r.kind === 'band'
          ? q[r.axis] >= r.min && q[r.axis] <= r.max
          : r.kind === 'outer'
            ? Math.abs(q[r.axis]) >= r.threshold
            : r.kind === 'ribs' &&
              r.spacing > 0 &&
              Math.abs(
                q[r.axis] / r.spacing - Math.round(q[r.axis] / r.spacing),
              ) *
                r.spacing <=
                r.width / 2);
    if (match) material = MATERIAL_NAMES.indexOf(entry.material);
  }
  return material;
}
export function profileDensity(spec: FieldSpec, p: Vec3) {
  const { width, height, depth } = spec.dimensions;
  const x = Math.abs(p.x),
    y = p.y - 0.18,
    z = Math.abs(p.z);
  const cell = spec.cellSize ?? ICE_CELL_SIZE;
  let edge = Math.min(width / 2 - x, y + cell * 0.5, height - y, depth / 2 - z);
  if (spec.profile === 'parcel') {
    // Light corner chamfers retain the amount of real ice while removing the
    // perfect-box silhouette. No density or hit-point inflation by delivery.
    edge = Math.min(edge, (width / 2 + depth / 2 - cell * 0.6 - x - z) * 0.707);
  } else if (spec.profile === 'slab') {
    edge = Math.min(
      edge,
      height - y - height * 0.34 * Math.max(0, (p.z / (depth / 2) + 0.3) / 1.3),
    );
  } else if (spec.profile === 'tower') {
    if (y < height * 0.2) edge = Math.min(edge, width * 0.37 - x);
  } else if (spec.profile === 'wings') {
    const spine = Math.min(width * 0.18 - x, depth * 0.43 - z);
    const wing = y - height * 0.19;
    // Wide overhead masses really depend on the central grounded spine.
    edge = Math.min(edge, Math.max(spine, wing));
    if (x > width * 0.18 && x < width * 0.27 && y < height * 0.58)
      edge = Math.min(edge, Math.max(height * 0.31 - y, y - height * 0.47));
  } else if (spec.profile === 'seam') {
    // A visible recessed channel exposes the dense center. It does not replace
    // the seam with a weaker generic HP band or sever it before play begins.
    const groove = Math.max(
      x - width * 0.075,
      depth * 0.12 - p.z,
      height * 0.32 - y,
    );
    edge = Math.min(edge, groove);
  } else if (spec.profile === 'archive' || spec.profile === 'vault') {
    const ribX = Math.abs(
      (p.x / width + 0.5) * 3 - Math.round((p.x / width + 0.5) * 3),
    );
    const ribY = Math.abs((y / height) * 3 - Math.round((y / height) * 3));
    if (ribX > 0.11 && ribY > 0.12)
      edge = Math.min(edge, depth * (spec.archiveRecess ?? 0.25) - p.z);
  }
  return Math.max(0, Math.min(1, edge / (cell * 0.55) + 0.5));
}
