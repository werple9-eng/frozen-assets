import { TUNE, worldY, type Loot, type Vec3 } from './tuning';
import type { Profile } from './campaign-content';
import {
  CHUNK_CELLS,
  createIceChunks,
  createIceGrid,
  materialAt,
  MATERIAL_DEFINITIONS,
  MATERIAL_NAMES,
  profileDensity,
  type FieldSpec,
  type IceChunkBounds,
  type IceGridSpec,
} from './ice-grid';

const NEIGHBORS6 = [
  [-1, 0, 0],
  [1, 0, 0],
  [0, -1, 0],
  [0, 1, 0],
  [0, 0, -1],
  [0, 0, 1],
] as const;

export type MeltBrush = { normal: Vec3; depthScale: number };

// One scalar field owns the visible surface, ray hits, restraints, and connectivity.
export class IceField {
  values: Float32Array;
  warmth: Float32Array;
  points: Vec3[] = [];
  dirty = true;
  revision = 0;
  grid: IceGridSpec;
  materialIds: Uint8Array;
  chunks: IceChunkBounds[];
  dirtyChunks = new Map<number, number>();
  metrics = {
    directRemoved: 0,
    detachedRemoved: 0,
    thermalRemoved: 0,
    directSolidRemoved: 0,
    thermalSolidRemoved: 0,
    detachedSolidRemoved: 0,
    lastConnectivityMs: 0,
    lastReleaseConnectivityMs: 0,
    releaseConnectivityBuilds: 0,
  };
  private pocketRestraints = new Map<string, number[]>();
  private pocketSeeds = new Map<string, number>();
  private outsideAir: Uint8Array;
  private outsideAirRevision = -1;
  private visited: Uint8Array;
  private queue: Int32Array;
  constructor(
    public round = 0,
    saved?: ArrayLike<number>,
    public profile?: {
      scale: number;
      shape: Profile;
      releaseMode?: 'surfaceExposure';
      historicalFinal?: boolean;
    },
    public spec?: FieldSpec,
  ) {
    const { step, baseY } = TUNE;
    const scale = TUNE.worldScale * (profile?.scale ?? 1);
    this.grid = spec
      ? createIceGrid(spec)
      : {
          nx: TUNE.nx,
          ny: TUNE.ny,
          nz: TUNE.nz,
          cellSize: step * scale,
          physicalWidth: 4.2 * scale,
          physicalHeight: (profile?.shape === 'slab' ? 1.75 : 2.35) * scale,
          physicalDepth: 2.76 * scale,
          originX: (-(TUNE.nx - 1) * step * scale) / 2,
          originY: 0.18 + (-0.13 - 0.18) * scale,
          originZ: (-(TUNE.nz - 1) * step * scale) / 2,
          layoutVersion: 2,
          layoutHash: `legacy-${round}-${profile?.shape ?? 'round'}-${profile?.scale ?? 1}`,
          legacy: true,
        };
    const { nx, ny, nz } = this.grid;
    this.values = new Float32Array(nx * ny * nz);
    this.materialIds = new Uint8Array(this.values.length);
    this.warmth = new Float32Array(this.values.length);
    this.visited = new Uint8Array(this.values.length);
    this.outsideAir = new Uint8Array(this.values.length);
    this.queue = new Int32Array(this.values.length);
    this.chunks = createIceChunks(this.grid);
    const final =
      (!profile || profile.historicalFinal) && round === TUNE.finalRound - 1;
    const width = final ? 2.37 : 2.1;
    const height = profile?.shape === 'slab' ? 1.75 : final ? 2.8 : 2.35;
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = this.index(x, y, z);
          if (spec) {
            const p = this.sampleToWorld(x, y, z);
            this.points[i] = p;
            this.values[i] =
              x && y && z && x < nx - 1 && y < ny - 1 && z < nz - 1
                ? profileDensity(spec, p)
                : 0;
            this.materialIds[i] = materialAt(spec, p);
            continue;
          }
          const p = {
            x: (x - (nx - 1) / 2) * step,
            // Place the lower isosurface at the tray floor while retaining the
            // interior grid spacing and authored treasure coordinates.
            y: y === 0 ? -0.13 : baseY + y * step,
            z: (z - (nz - 1) / 2) * step,
          };
          this.points[i] = {
            x: p.x * TUNE.worldScale * (profile?.scale ?? 1),
            y: 0.18 + (worldY(p.y) - 0.18) * (profile?.scale ?? 1),
            z: p.z * TUNE.worldScale * (profile?.scale ?? 1),
          };
          const edge = Math.min(
            width - Math.abs(p.x),
            height - (p.y - baseY),
            1.38 - Math.abs(p.z),
          );
          this.values[i] =
            x && y && z && x < nx - 1 && y < ny - 1 && z < nz - 1
              ? Math.max(0, Math.min(1, edge / 0.17))
              : 0;
          // Cluster family: a broad cap on a clearly visible shared central restraint.
          if (
            (profile ? profile.shape === 'wings' : round % 4 === 2) &&
            p.y < 1.48 &&
            (Math.abs(p.x) > 0.46 || Math.abs(p.z) > 0.38)
          )
            this.values[i] = 0;
          if (profile?.shape === 'tower' && Math.abs(p.x) > 1.35)
            this.values[i] = 0;
          if (profile?.shape === 'seam' && Math.abs(p.x) < 0.18 && p.y > 1.1)
            this.values[i] *= 0.3;
          if (
            profile?.shape === 'archive' &&
            (Math.abs(p.y - 1.35) < 0.14 || Math.abs(p.x) < 0.18) &&
            p.z > 0.4
          )
            this.values[i] = 0;
        }
    if (
      saved?.length === this.values.length &&
      Array.from(saved).every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    )
      this.values.set(saved);
    this.markAllDirty();
  }
  index(x: number, y: number, z: number) {
    const { nx, ny, nz } = this.grid;
    return x >= 0 &&
      x < nx &&
      y >= 0 &&
      y < ny &&
      z >= 0 &&
      z < nz &&
      Number.isInteger(x) &&
      Number.isInteger(y) &&
      Number.isInteger(z)
      ? x + nx * (y + ny * z)
      : -1;
  }
  coordinates(i: number): Vec3 {
    return {
      x: i % this.grid.nx,
      y: Math.floor(i / this.grid.nx) % this.grid.ny,
      z: Math.floor(i / (this.grid.nx * this.grid.ny)),
    };
  }
  neighborIndex(
    x: number,
    y: number,
    z: number,
    dx: number,
    dy: number,
    dz: number,
  ) {
    return this.index(x + dx, y + dy, z + dz);
  }
  forEachNeighbor6(
    x: number,
    y: number,
    z: number,
    visit: (index: number) => void,
  ) {
    for (const [dx, dy, dz] of NEIGHBORS6) {
      const n = this.neighborIndex(x, y, z, dx, dy, dz);
      if (n !== -1) visit(n);
    }
  }
  private supportNeighbors(i: number) {
    const p = this.coordinates(i);
    let count = 0;
    this.forEachNeighbor6(p.x, p.y, p.z, (n) => {
      if (this.values[n] > 0.5) count++;
    });
    return count;
  }
  sampleToWorld(x: number, y: number, z: number): Vec3 {
    const g = this.grid;
    if (g.legacy) {
      const scale = TUNE.worldScale * (this.profile?.scale ?? 1);
      return {
        x: g.originX + x * g.cellSize,
        y:
          0.18 +
          ((y === 0 ? -0.13 : TUNE.baseY + y * TUNE.step) - 0.18) * scale,
        z: g.originZ + z * g.cellSize,
      };
    }
    return {
      x: g.originX + x * g.cellSize,
      y: g.originY + y * g.cellSize,
      z: g.originZ + z * g.cellSize,
    };
  }
  markAllDirty() {
    this.dirty = true;
    for (const c of this.chunks) this.dirtyChunks.set(c.id, this.revision);
  }
  markSampleChanged(i: number) {
    this.dirty = true;
    const p = this.coordinates(i),
      g = this.grid;
    const cx = Math.ceil((g.nx - 1) / CHUNK_CELLS),
      cy = Math.ceil((g.ny - 1) / CHUNK_CELLS);
    // A sample belongs to up to eight neighboring extraction cells. This is
    // deliberately cell ownership, not a shortcut using its sample chunk.
    for (let dz = -1; dz <= 0; dz++)
      for (let dy = -1; dy <= 0; dy++)
        for (let dx = -1; dx <= 0; dx++) {
          const x = p.x + dx,
            y = p.y + dy,
            z = p.z + dz;
          if (
            x < 0 ||
            y < 0 ||
            z < 0 ||
            x >= g.nx - 1 ||
            y >= g.ny - 1 ||
            z >= g.nz - 1
          )
            continue;
          const id =
            Math.floor(x / CHUNK_CELLS) +
            cx *
              (Math.floor(y / CHUNK_CELLS) + cy * Math.floor(z / CHUNK_CELLS));
          this.dirtyChunks.set(id, this.revision);
        }
  }
  acknowledgeChunk(id: number, revision: number) {
    if (this.dirtyChunks.get(id) === revision) this.dirtyChunks.delete(id);
    this.dirty = this.dirtyChunks.size > 0;
  }
  priorityChunks(point: Vec3) {
    const g = this.grid;
    const q = {
      x: (point.x - g.originX) / g.cellSize,
      y: (point.y - g.originY) / g.cellSize,
      z: (point.z - g.originZ) / g.cellSize,
    };
    const distance = (c: IceChunkBounds) =>
      Math.max(c.cellMinX - q.x, 0, q.x - c.cellMaxX) ** 2 +
      Math.max(c.cellMinY - q.y, 0, q.y - c.cellMaxY) ** 2 +
      Math.max(c.cellMinZ - q.z, 0, q.z - c.cellMaxZ) ** 2;
    return this.chunks
      .filter((c) => this.dirtyChunks.has(c.id))
      .sort((a, b) => distance(a) - distance(b) || a.id - b.id);
  }
  materialCounts() {
    const counts = Object.fromEntries(
      MATERIAL_NAMES.map((name) => [name, 0]),
    ) as Record<(typeof MATERIAL_NAMES)[number], number>;
    this.values.forEach((value, i) => {
      if (value > 0.5) counts[MATERIAL_NAMES[this.materialIds[i]]]++;
    });
    return counts;
  }
  density(p: Vec3, exactSurface = false) {
    const { nx, ny, nz, cellSize, originX, originY, originZ } = this.grid;
    const x = (p.x - originX) / cellSize,
      z = (p.z - originZ) / cellSize;
    const scale = TUNE.worldScale * (this.profile?.scale ?? 1),
      localY = (p.y - 0.18) / scale;
    const y = this.grid.legacy
      ? localY < 0.31
        ? (localY + 0.31) / 0.62
        : (localY - 0.07) / TUNE.step
      : (p.y - originY) / cellSize;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      iz = Math.floor(z);
    if (
      ix < 0 ||
      iy < 0 ||
      iz < 0 ||
      ix >= nx - 1 ||
      iy >= ny - 1 ||
      iz >= nz - 1 ||
      !Number.isFinite(x + y + z)
    )
      return 0;
    if (exactSurface) {
      // Match the six tetrahedra used by surface(), not trilinear interpolation.
      const axes = [
        { f: x - ix, offset: 1 },
        { f: y - iy, offset: nx },
        { f: z - iz, offset: nx * ny },
      ].sort((a, b) => b.f - a.f);
      const i = this.index(ix, iy, iz),
        [a, b, c] = axes;
      return (
        this.values[i] * (1 - a.f) +
        this.values[i + a.offset] * (a.f - b.f) +
        this.values[i + a.offset + b.offset] * (b.f - c.f) +
        this.values[i + 1 + nx + nx * ny] * c.f
      );
    }
    let density = 0;
    for (let dz = 0; dz < 2; dz++)
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 2; dx++)
          density +=
            this.values[this.index(ix + dx, iy + dy, iz + dz)] *
            (dx ? x - ix : 1 - x + ix) *
            (dy ? y - iy : 1 - y + iy) *
            (dz ? z - iz : 1 - z + iz);
    return density;
  }
  carveLoot(loot: Loot[], legacyCavities = false) {
    // Cargo is frozen into the solid volume. Cutting a voxel-sized box around
    // its mesh makes a visible air room, especially around thin coins. The
    // transparent outer surface needs no such subtraction; actual mesh contact
    // still decides release as the player removes the surrounding ice.
    if (!legacyCavities) return;
    for (const t of loot) {
      if (
        (t.story || !this.grid.legacy) &&
        this.profile?.releaseMode !== 'surfaceExposure'
      ) {
        const step = this.grid.cellSize;
        const cleared = new Set<number>();
        let nearest = Infinity;
        for (let i = 0; i < this.values.length; i++) {
          const p = this.points[i];
          if (
            Math.abs(p.x - t.x) <= t.w / 2 + step * 0.85 &&
            Math.abs(p.y - t.y) <= t.h / 2 + step * 0.85 &&
            Math.abs(p.z - t.z) <= t.d / 2 + step * 0.85
          ) {
            cleared.add(i);
            const distance =
              (p.x - t.x) ** 2 + (p.y - t.y) ** 2 + (p.z - t.z) ** 2;
            if (distance < nearest) {
              nearest = distance;
              this.pocketSeeds.set(t.id, i);
            }
            this.values[i] = 0;
          }
        }
        const shell = new Set<number>();
        for (const i of cleared) {
          const { x, y, z } = this.coordinates(i);
          this.forEachNeighbor6(x, y, z, (n) => {
            if (!cleared.has(n)) shell.add(n);
          });
        }
        this.pocketRestraints.set(t.id, [...shell]);
        continue;
      }
      for (let i = 0; i < this.values.length; i++) {
        const p = this.points[i];
        if (
          Math.abs(p.x - t.x) < t.w * 0.46 &&
          Math.abs(p.y - t.y) < t.h * 0.46 &&
          Math.abs(p.z - t.z) < t.d * 0.46
        )
          this.values[i] = 0;
      }
    }
    this.revision++;
    this.markAllDirty();
  }
  repairLegacyCavities(loot: Loot[], packed: Float32Array) {
    // Only refill completely sealed, machine-authored cavities in old saves.
    // An opened pocket belongs to the player's excavation and stays untouched.
    const saved = this.values.slice();
    this.carveLoot(loot, true);
    this.values.set(saved);
    this.revision++;
    for (const t of loot) {
      if (
        t.state !== 'embedded' ||
        !this.pocketSeeds.has(t.id) ||
        this.pocketConnectsOutside(t.id)
      )
        continue;
      const padding = this.grid.cellSize * 0.85;
      this.points.forEach((p, i) => {
        if (
          saved[i] === 0 &&
          Math.abs(p.x - t.x) <= t.w / 2 + padding &&
          Math.abs(p.y - t.y) <= t.h / 2 + padding &&
          Math.abs(p.z - t.z) <= t.d / 2 + padding
        )
          this.values[i] = packed[i];
      });
    }
    this.pocketRestraints.clear();
    this.pocketSeeds.clear();
    this.revision++;
    this.markAllDirty();
  }
  solidIntersectionCount(t: Loot) {
    const half = this.grid.cellSize / 2;
    let count = 0;
    for (let i = 0; i < this.values.length; i++) {
      const p = this.points[i];
      if (
        this.values[i] > 0.5 &&
        Math.abs(p.x - t.x) < t.w / 2 + half &&
        Math.abs(p.y - t.y) < t.h / 2 + half &&
        Math.abs(p.z - t.z) < t.d / 2 + half
      )
        count++;
    }
    return count;
  }
  melt(
    point: Vec3 | null,
    dt: number,
    power: number,
    radius: number,
    residual = 0,
    brush?: MeltBrush,
  ) {
    let changed = false;
    const normalLength = brush
      ? Math.hypot(brush.normal.x, brush.normal.y, brush.normal.z)
      : 0;
    const depthScale = brush?.depthScale ?? 1;
    const flatten =
      !this.grid.legacy &&
      normalLength > 1e-8 &&
      Number.isFinite(normalLength) &&
      Number.isFinite(depthScale) &&
      depthScale > 0 &&
      depthScale < 1
        ? 1 / (depthScale * depthScale) - 1
        : 0;
    for (let i = 0; i < this.values.length; i++) {
      if (this.values[i] <= 0) continue;
      const p = this.points[i];
      let heat = 0;
      if (point) {
        const dx = p.x - point.x,
          dy = p.y - point.y,
          dz = p.z - point.z;
        let d2 = dx * dx + dy * dy + dz * dz;
        if (flatten && brush) {
          const along =
            (dx * brush.normal.x + dy * brush.normal.y + dz * brush.normal.z) /
            normalLength;
          d2 += along * along * flatten;
        }
        if (d2 < radius * radius) {
          heat = power * (1 - d2 / (radius * radius));
          this.warmth[i] = Math.max(this.warmth[i], heat);
        }
      }
      if (residual && this.warmth[i] > 0.01)
        heat = Math.max(heat, this.warmth[i] * 0.28 * residual);
      this.warmth[i] *= Math.exp(-dt * 4);
      if (heat) {
        const previous = this.values[i];
        this.values[i] = Math.max(
          0,
          previous -
            heat *
              dt *
              MATERIAL_DEFINITIONS[this.materialIds[i]].thermalConductivity,
        );
        this.metrics.thermalRemoved += previous - this.values[i];
        if (previous > 0.5 && this.values[i] <= 0.5)
          this.metrics.thermalSolidRemoved++;
        if (!changed) this.revision++;
        changed = true;
        this.markSampleChanged(i);
      }
    }
    if (changed) {
      this.dirty = true;
    }
    return changed;
  }
  surfaceNormal(point: Vec3): Vec3 {
    const e = this.grid.cellSize * 0.5;
    const gradient = (axis: 'x' | 'y' | 'z') =>
      this.density({ ...point, [axis]: point[axis] - e }) -
      this.density({ ...point, [axis]: point[axis] + e });
    const x = gradient('x'),
      y = gradient('y'),
      z = gradient('z'),
      d = Math.hypot(x, y, z) || 1;
    return { x: x / d, y: y / d, z: z / d };
  }
  strikeAt(
    point: Vec3,
    power: number,
    radius: number,
    options: {
      center: number;
      depth: number;
      weak: number;
      support: number;
      detach: number;
    },
    normal = this.surfaceNormal(point),
  ) {
    const rr = radius * radius,
      step = this.grid.cellSize;
    let changed = false;
    for (let i = 0; i < this.values.length; i++) {
      const value = this.values[i];
      if (value <= 0) continue;
      const p = this.points[i],
        dx = p.x - point.x,
        dy = p.y - point.y,
        dz = p.z - point.z;
      const along = dx * normal.x + dy * normal.y + dz * normal.z;
      const side = Math.max(0, dx * dx + dy * dy + dz * dz - along * along);
      const distance = side + (along * along) / (options.depth * options.depth);
      if (distance >= rr) continue;
      const material = MATERIAL_DEFINITIONS[this.materialIds[i]];
      const neighbors =
        options.support > 1 ||
        options.detach > 1 ||
        material.supportStrength !== 1
          ? this.supportNeighbors(i)
          : 6;
      const center = side < rr * 0.45 * 0.45 ? options.center : 1;
      const weak = value < 0.95 ? options.weak : 1;
      const support =
        neighbors <= 3 ? options.support / material.supportStrength : 1;
      this.values[i] = Math.max(
        0,
        value -
          (power * (1 - distance / rr) * center * weak * support) /
            material.hardness,
      );
      this.metrics.directRemoved += value - this.values[i];
      if (value > 0.5 && this.values[i] <= 0.5)
        this.metrics.directSolidRemoved++;
      if (!changed) this.revision++;
      changed = true;
      this.markSampleChanged(i);
    }
    if (options.detach > 1) {
      // Remove only genuinely weakened, thin local bridges. The geometry is
      // removed before object release is considered; no clipping shortcut.
      const reach = radius * options.detach + step;
      for (let i = 0; i < this.values.length; i++) {
        if (
          this.values[i] <= 0.5 ||
          this.values[i] >
            0.5 +
              (0.18 *
                (options.detach - 1) *
                MATERIAL_DEFINITIONS[this.materialIds[i]].fractureEase) /
                MATERIAL_DEFINITIONS[this.materialIds[i]].supportStrength
        )
          continue;
        const p = this.points[i];
        if (Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) > reach)
          continue;
        const neighbors = this.supportNeighbors(i);
        if (neighbors <= 3) {
          this.metrics.detachedRemoved += this.values[i];
          if (this.values[i] > 0.5) this.metrics.detachedSolidRemoved++;
          this.values[i] = 0;
          if (!changed) this.revision++;
          changed = true;
          this.markSampleChanged(i);
        }
      }
    }
    if (changed) {
      this.dirty = true;
    }
    return changed;
  }
  detach(): Vec3[] {
    const started = performance.now();
    const { nx, nz } = this.grid;
    this.visited.fill(0);
    let head = 0,
      tail = 0;
    for (let z = 1; z < nz - 1; z++)
      for (let x = 1; x < nx - 1; x++) {
        const i = this.index(x, 1, z);
        if (this.values[i] > 0.5) {
          this.visited[i] = 1;
          this.queue[tail++] = i;
        }
      }
    while (head < tail) {
      const i = this.queue[head++];
      const p = this.coordinates(i);
      this.forEachNeighbor6(p.x, p.y, p.z, (n) => {
        if (this.values[n] > 0.5 && !this.visited[n]) {
          this.visited[n] = 1;
          this.queue[tail++] = n;
        }
      });
    }
    const fragments: Vec3[] = [];
    let count = 0;
    for (let i = 0; i < this.values.length; i++)
      if (this.values[i] > 0.5 && !this.visited[i]) {
        if (!count) this.revision++;
        if (count++ % 9 === 0 && fragments.length < TUNE.fragmentCap)
          fragments.push({ ...this.points[i] });
        this.metrics.detachedRemoved += this.values[i];
        this.metrics.detachedSolidRemoved++;
        this.values[i] = 0;
        this.warmth[i] = 0;
        this.markSampleChanged(i);
      }
    if (count) {
      this.dirty = true;
    }
    this.metrics.lastConnectivityMs = performance.now() - started;
    return fragments;
  }
  private pocketConnectsOutside(id: string) {
    const seed = this.pocketSeeds.get(id);
    if (seed === undefined) return false;
    if (this.outsideAirRevision !== this.revision) {
      const started = performance.now();
      const { nx, ny, nz } = this.grid;
      const plane = nx * ny;
      this.outsideAir.fill(0);
      let head = 0,
        tail = 0;
      const visit = (i: number) => {
        if (this.outsideAir[i] || this.values[i] > 0.5) return;
        this.outsideAir[i] = 1;
        this.queue[tail++] = i;
      };
      for (let z = 0; z < nz; z++)
        for (let y = 0; y < ny; y++) {
          visit(this.index(0, y, z));
          visit(this.index(nx - 1, y, z));
        }
      for (let z = 0; z < nz; z++)
        for (let x = 0; x < nx; x++) {
          visit(this.index(x, 0, z));
          visit(this.index(x, ny - 1, z));
        }
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          visit(this.index(x, y, 0));
          visit(this.index(x, y, nz - 1));
        }
      // Follow face-connected air in all directions, including the underside
      // and paths around corners. Reuse one bounded flood for all cargo in a
      // geometry revision; never require a direct sightline to the object.
      while (head < tail) {
        const i = this.queue[head++];
        const x = i % nx,
          y = Math.floor(i / nx) % ny,
          z = Math.floor(i / plane);
        if (x > 0) visit(i - 1);
        if (x < nx - 1) visit(i + 1);
        if (y > 0) visit(i - nx);
        if (y < ny - 1) visit(i + nx);
        if (z > 0) visit(i - plane);
        if (z < nz - 1) visit(i + plane);
      }
      this.outsideAirRevision = this.revision;
      this.metrics.lastReleaseConnectivityMs = performance.now() - started;
      this.metrics.releaseConnectivityBuilds++;
    }
    return this.outsideAir[seed] === 1;
  }
  canRelease(t: Loot, contactSamples?: Vec3[]) {
    // Historical cavity fixtures need to distinguish sealed air from cleared
    // ice. New cargo has solid packing and does not enter this legacy branch.
    // As soon as it opens to the outside, remaining remote walls or roof cannot
    // restrain the object: only actual mesh contact below can do that.
    if (
      this.pocketRestraints.get(t.id)?.some((i) => this.values[i] > 0.5) &&
      this.exposure(t).exposed === 0 &&
      !this.pocketConnectsOutside(t.id)
    )
      return false;
    if (contactSamples?.length) {
      return contactSamples.every(
        (p) =>
          this.density({ x: t.x + p.x, y: t.y + p.y, z: t.z + p.z }, true) <=
          0.5,
      );
    }
    // Headless simulation fallback: test the item's volume itself, with no
    // invisible buffer outside it. The renderer supplies exact mesh probes.
    const step = this.grid.cellSize / 4;
    const nx = Math.max(2, Math.ceil(t.w / step)),
      ny = Math.max(2, Math.ceil(t.h / step)),
      nz = Math.max(2, Math.ceil(t.d / step));
    for (let x = 0; x <= nx; x++)
      for (let y = 0; y <= ny; y++)
        for (let z = 0; z <= nz; z++) {
          const dx = (x / nx - 0.5) * t.w,
            dz = (z / nz - 0.5) * t.d;
          if (
            t.kind === 'coin' &&
            !t.story &&
            (dx / (t.w / 2)) ** 2 + (dz / (t.d / 2)) ** 2 > 1.001
          )
            continue;
          if (
            this.density(
              { x: t.x + dx, y: t.y + (y / ny - 0.5) * t.h, z: t.z + dz },
              true,
            ) > 0.5
          )
            return false;
        }
    return true;
  }
  landingHeight(t: Loot, nextY: number) {
    const floor = 0.2 + t.h / 2;
    const from = t.y - t.h / 2,
      to = Math.max(0.2, nextY - t.h / 2),
      step = this.grid.cellSize / 4;
    // Sweep the footprint through this frame's fall; this cannot tunnel through
    // a thin remaining shelf, even on a slow frame.
    for (let y = from; y >= to; y -= Math.min(step, y - to || step)) {
      for (const x of [-0.42, 0, 0.42])
        for (const z of [-0.42, 0, 0.42]) {
          const point = { x: t.x + t.w * x, y, z: t.z + t.d * z };
          if (this.density(point, true) <= 0.5) continue;
          let low = y,
            high = Math.min(from, y + step);
          for (let i = 0; i < 8; i++) {
            const mid = (low + high) / 2;
            if (this.density({ ...point, y: mid }, true) > 0.5) low = mid;
            else high = mid;
          }
          return Math.max(floor, high + t.h / 2 + 0.005);
        }
    }
    return floor;
  }
  remaining() {
    let n = 0;
    for (const v of this.values) if (v > 0.5) n++;
    return n;
  }
  private exposureCache = new WeakMap<
    Loot,
    {
      revision: number;
      x: number;
      y: number;
      z: number;
      w: number;
      h: number;
      d: number;
      result: { exposed: number; topCover: number };
    }
  >();
  exposure(t: Loot) {
    if (!this.grid.legacy || this.pocketRestraints.has(t.id)) {
      if (t.state !== 'embedded') return { exposed: 1, topCover: 0 };
      const cached = this.exposureCache.get(t);
      if (
        cached?.revision === this.revision &&
        cached.x === t.x &&
        cached.y === t.y &&
        cached.z === t.z &&
        cached.w === t.w &&
        cached.h === t.h &&
        cached.d === t.d
      )
        return cached.result;
      const { originX, originY, originZ, nx, ny, nz, cellSize } = this.grid;
      const low = { x: originX, y: originY, z: originZ },
        high = {
          x: originX + (nx - 1) * cellSize,
          y: originY + (ny - 1) * cellSize,
          z: originZ + (nz - 1) * cellSize,
        };
      const offset = cellSize * 0.08,
        step = cellSize / 2;
      const offsets = [
        [0, 0],
        [-0.32, -0.32],
        [-0.32, 0.32],
        [0.32, -0.32],
        [0.32, 0.32],
      ];
      const faces = [
        {
          axis: 'x' as const,
          sign: -1,
          a: 'y' as const,
          b: 'z' as const,
          half: t.w / 2,
          sizeA: t.h,
          sizeB: t.d,
        },
        {
          axis: 'x' as const,
          sign: 1,
          a: 'y' as const,
          b: 'z' as const,
          half: t.w / 2,
          sizeA: t.h,
          sizeB: t.d,
        },
        {
          axis: 'z' as const,
          sign: -1,
          a: 'x' as const,
          b: 'y' as const,
          half: t.d / 2,
          sizeA: t.w,
          sizeB: t.h,
        },
        {
          axis: 'z' as const,
          sign: 1,
          a: 'x' as const,
          b: 'y' as const,
          half: t.d / 2,
          sizeA: t.w,
          sizeB: t.h,
        },
        {
          axis: 'y' as const,
          sign: 1,
          a: 'x' as const,
          b: 'z' as const,
          half: t.h / 2,
          sizeA: t.w,
          sizeB: t.d,
        },
      ];
      let visible = 0,
        visibleTop = 0;
      for (const face of faces)
        for (const [a, b] of offsets) {
          const p = { x: t.x, y: t.y, z: t.z };
          p[face.axis] += face.sign * (face.half + offset);
          p[face.a] += a * face.sizeA;
          p[face.b] += b * face.sizeB;
          let clear = true;
          // Traverse to the outside of the finite field. Pocket air alone is never
          // exposure: an actual unobstructed path through rendered ice is required.
          const limit = (nx + ny + nz) * 2;
          for (let n = 0; n < limit; n++) {
            if (p[face.axis] < low[face.axis] || p[face.axis] > high[face.axis])
              break;
            if (this.density(p, true) > 0.5) {
              clear = false;
              break;
            }
            p[face.axis] += face.sign * step;
          }
          if (clear) {
            visible++;
            if (face.axis === 'y') visibleTop++;
          }
        }
      const result = { exposed: visible / 25, topCover: 1 - visibleTop / 5 };
      this.exposureCache.set(t, {
        revision: this.revision,
        x: t.x,
        y: t.y,
        z: t.z,
        w: t.w,
        h: t.h,
        d: t.d,
        result,
      });
      return result;
    }
    const margin = this.grid.cellSize * 1.8;
    let shell = 0,
      covered = 0,
      top = 0,
      roof = 0;
    this.points.forEach((p, i) => {
      const dx = Math.abs(p.x - t.x),
        dz = p.z - t.z,
        dy = p.y - t.y;
      if (
        dx < t.w / 2 + margin &&
        Math.abs(dz) < t.d / 2 + margin &&
        dy > -t.h / 2 &&
        dy < t.h / 2 + margin &&
        (dy > t.h / 2 || dz > t.d / 2)
      ) {
        shell++;
        if (this.values[i] > 0.5) covered++;
      }
      if (
        dx < t.w * 0.48 &&
        Math.abs(dz) < t.d * 0.48 &&
        dy > t.h / 2 &&
        dy < t.h / 2 + margin
      ) {
        top++;
        if (this.values[i] > 0.5) roof++;
      }
    });
    return {
      exposed: shell ? 1 - covered / shell : 1,
      topCover: top ? roof / top : 0,
    };
  }
}

// Marching tetrahedra creates a continuous, recessed surface instead of drawing cubes.
const TETS = [
  [0, 5, 1, 6],
  [0, 1, 2, 6],
  [0, 2, 3, 6],
  [0, 3, 7, 6],
  [0, 7, 4, 6],
  [0, 4, 5, 6],
];
const EDGES = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 2],
  [1, 3],
  [2, 3],
];
export function surface(field: IceField, bounds?: IceChunkBounds) {
  const positions: number[] = [],
    colors: number[] = [];
  const { nx, ny, nz } = field.grid;
  const put = (
    a: Vec3,
    b: Vec3,
    c: Vec3,
    outward: Vec3,
    frost: number,
    materialId: number,
  ) => {
    const ux = b.x - a.x,
      uy = b.y - a.y,
      uz = b.z - a.z,
      vx = c.x - a.x,
      vy = c.y - a.y,
      vz = c.z - a.z;
    if (
      (uy * vz - uz * vy) * outward.x +
        (uz * vx - ux * vz) * outward.y +
        (ux * vy - uy * vx) * outward.z <
      0
    )
      [b, c] = [c, b];
    for (const p of [a, b, c]) {
      positions.push(p.x, p.y, p.z);
      const variation = 0.025 * Math.sin(p.x * 13 + p.y * 19 + p.z * 17);
      const service = materialId === 4,
        reinforced = materialId === 3,
        dense = materialId === 2,
        brittle = materialId === 1;
      // The palette belongs to the extracted surface, including newly cut
      // faces. Dense collars and frame ribs remain readable through frost;
      // service lanes stay a quieter, clearer blue instead of a glowing mask.
      colors.push(
        0.48 +
          frost * 0.23 +
          variation -
          (service ? 0.1 : 0) -
          (dense ? 0.12 : 0) -
          (reinforced ? 0.08 : 0) +
          (brittle ? 0.08 : 0),
        0.77 +
          frost * 0.13 +
          variation -
          (dense ? 0.14 : 0) -
          (reinforced ? 0.12 : 0) -
          (service ? 0.025 : 0) +
          (brittle ? 0.035 : 0),
        0.86 +
          frost * 0.12 +
          variation +
          (service ? 0.025 : 0) -
          (dense ? 0.12 : 0) -
          (reinforced ? 0.15 : 0),
      );
    }
  };
  for (let z = bounds?.cellMinZ ?? 0; z < (bounds?.cellMaxZ ?? nz - 1); z++)
    for (let y = bounds?.cellMinY ?? 0; y < (bounds?.cellMaxY ?? ny - 1); y++)
      for (
        let x = bounds?.cellMinX ?? 0;
        x < (bounds?.cellMaxX ?? nx - 1);
        x++
      ) {
        const c = [
          field.index(x, y, z),
          field.index(x + 1, y, z),
          field.index(x + 1, y + 1, z),
          field.index(x, y + 1, z),
          field.index(x, y, z + 1),
          field.index(x + 1, y, z + 1),
          field.index(x + 1, y + 1, z + 1),
          field.index(x, y + 1, z + 1),
        ];
        let mask = 0;
        for (let j = 0; j < 8; j++)
          if (field.values[c[j]] > 0.5) mask |= 1 << j;
        if (!mask || mask === 255) continue;
        for (const tet of TETS) {
          const ids = tet.map((v) => c[v]);
          const inside = ids.filter((i) => field.values[i] > 0.5),
            outside = ids.filter((i) => field.values[i] <= 0.5);
          if (!inside.length || !outside.length) continue;
          const hits: Vec3[] = [];
          for (const [a, b] of EDGES) {
            const ia = ids[a],
              ib = ids[b],
              va = field.values[ia],
              vb = field.values[ib];
            if (va > 0.5 === vb > 0.5) continue;
            const f = (0.5 - va) / (vb - va),
              p = field.points[ia],
              q = field.points[ib];
            hits.push({
              x: p.x + (q.x - p.x) * f,
              y: p.y + (q.y - p.y) * f,
              z: p.z + (q.z - p.z) * f,
            });
          }
          const ip = field.points[inside[0]],
            op = field.points[outside[0]];
          const n = { x: op.x - ip.x, y: op.y - ip.y, z: op.z - ip.z };
          const frost = Math.min(
            1,
            inside.reduce((s, i) => s + field.values[i], 0) / inside.length,
          );
          const materialId = field.materialIds[inside[0]];
          if (hits.length === 3)
            put(hits[0], hits[1], hits[2], n, frost, materialId);
          else {
            put(hits[0], hits[1], hits[2], n, frost, materialId);
            put(hits[1], hits[3], hits[2], n, frost, materialId);
          }
        }
      }
  if (!bounds) {
    field.dirty = false;
    field.dirtyChunks.clear();
  }
  return { positions, colors };
}
export const surfaceChunk = (field: IceField, chunk: IceChunkBounds) =>
  surface(field, chunk);
