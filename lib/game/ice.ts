import { TUNE, worldY, type Loot, type Vec3 } from './tuning';
import type { Profile } from './campaign-content';

// One scalar field owns the visible surface, ray hits, restraints, and connectivity.
export class IceField {
  values: Float32Array;
  warmth: Float32Array;
  points: Vec3[] = [];
  dirty = true;
  revision = 0;
  private visited: Uint8Array;
  private queue: Int32Array;
  constructor(
    public round = 0,
    saved?: number[],
    public profile?: {
      scale: number;
      shape: Profile;
      releaseMode?: 'surfaceExposure';
    },
  ) {
    const { nx, ny, nz, step, baseY } = TUNE;
    this.values = new Float32Array(nx * ny * nz);
    this.warmth = new Float32Array(this.values.length);
    this.visited = new Uint8Array(this.values.length);
    this.queue = new Int32Array(this.values.length);
    const final = round === TUNE.finalRound - 1;
    const width = final ? 2.37 : 2.1;
    const height = profile?.shape === 'slab' ? 1.75 : final ? 2.8 : 2.35;
    for (let z = 0; z < nz; z++)
      for (let y = 0; y < ny; y++)
        for (let x = 0; x < nx; x++) {
          const i = this.index(x, y, z);
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
      saved.every((v) => Number.isFinite(v) && v >= 0 && v <= 1)
    )
      this.values.set(saved);
  }
  index(x: number, y: number, z: number) {
    return x + TUNE.nx * (y + TUNE.ny * z);
  }
  density(p: Vec3, exactSurface = false) {
    const scale = TUNE.worldScale * (this.profile?.scale ?? 1);
    const x = p.x / (TUNE.step * scale) + (TUNE.nx - 1) / 2;
    const z = p.z / (TUNE.step * scale) + (TUNE.nz - 1) / 2;
    const localY = (p.y - 0.18) / scale;
    const y =
      localY < 0.31 ? (localY + 0.31) / 0.62 : (localY - 0.07) / TUNE.step;
    const ix = Math.floor(x),
      iy = Math.floor(y),
      iz = Math.floor(z);
    if (
      ix < 0 ||
      iy < 0 ||
      iz < 0 ||
      ix >= TUNE.nx - 1 ||
      iy >= TUNE.ny - 1 ||
      iz >= TUNE.nz - 1
    )
      return 0;
    if (exactSurface) {
      // Match the six tetrahedra used by surface(), not trilinear interpolation.
      const axes = [
        { f: x - ix, offset: 1 },
        { f: y - iy, offset: TUNE.nx },
        { f: z - iz, offset: TUNE.nx * TUNE.ny },
      ].sort((a, b) => b.f - a.f);
      const i = this.index(ix, iy, iz),
        [a, b, c] = axes;
      return (
        this.values[i] * (1 - a.f) +
        this.values[i + a.offset] * (a.f - b.f) +
        this.values[i + a.offset + b.offset] * (b.f - c.f) +
        this.values[i + 1 + TUNE.nx + TUNE.nx * TUNE.ny] * c.f
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
  carveLoot(loot: Loot[]) {
    for (const t of loot)
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
  melt(
    point: Vec3 | null,
    dt: number,
    power: number,
    radius: number,
    residual = 0,
  ) {
    let changed = false;
    for (let i = 0; i < this.values.length; i++) {
      if (this.values[i] <= 0) continue;
      const p = this.points[i];
      let heat = 0;
      if (point) {
        const d2 =
          (p.x - point.x) ** 2 + (p.y - point.y) ** 2 + (p.z - point.z) ** 2;
        if (d2 < radius * radius) {
          heat = power * (1 - d2 / (radius * radius));
          this.warmth[i] = Math.max(this.warmth[i], heat);
        }
      }
      if (residual && this.warmth[i] > 0.01)
        heat = Math.max(heat, this.warmth[i] * 0.28 * residual);
      this.warmth[i] *= Math.exp(-dt * 4);
      if (heat) {
        this.values[i] = Math.max(0, this.values[i] - heat * dt);
        changed = true;
      }
    }
    if (changed) {
      this.dirty = true;
      this.revision++;
    }
    return changed;
  }
  surfaceNormal(point: Vec3): Vec3 {
    const e = TUNE.step * TUNE.worldScale * (this.profile?.scale ?? 1) * 0.5;
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
      step = TUNE.step * TUNE.worldScale * (this.profile?.scale ?? 1);
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
      const neighbors =
        options.support > 1 || options.detach > 1
          ? [
              -1,
              1,
              -TUNE.nx,
              TUNE.nx,
              -TUNE.nx * TUNE.ny,
              TUNE.nx * TUNE.ny,
            ].filter((d) => this.values[i + d] > 0.5).length
          : 6;
      const center = side < rr * 0.45 * 0.45 ? options.center : 1;
      const weak = value < 0.95 ? options.weak : 1;
      const support = neighbors <= 3 ? options.support : 1;
      this.values[i] = Math.max(
        0,
        value - power * (1 - distance / rr) * center * weak * support,
      );
      changed = true;
    }
    if (options.detach > 1) {
      // Remove only genuinely weakened, thin local bridges. The geometry is
      // removed before object release is considered; no clipping shortcut.
      const reach = radius * options.detach + step;
      for (let i = 0; i < this.values.length; i++) {
        if (
          this.values[i] <= 0.5 ||
          this.values[i] > 0.5 + 0.18 * (options.detach - 1)
        )
          continue;
        const p = this.points[i];
        if (Math.hypot(p.x - point.x, p.y - point.y, p.z - point.z) > reach)
          continue;
        const neighbors = [
          -1,
          1,
          -TUNE.nx,
          TUNE.nx,
          -TUNE.nx * TUNE.ny,
          TUNE.nx * TUNE.ny,
        ].filter((d) => this.values[i + d] > 0.5).length;
        if (neighbors <= 3) {
          this.values[i] = 0;
          changed = true;
        }
      }
    }
    if (changed) {
      this.dirty = true;
      this.revision++;
    }
    return changed;
  }
  detach(): Vec3[] {
    const { nx, ny, nz } = TUNE;
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
      for (const d of [-1, 1, -nx, nx, -nx * ny, nx * ny]) {
        const n = i + d;
        if (
          n >= 0 &&
          n < this.values.length &&
          this.values[n] > 0.5 &&
          !this.visited[n]
        ) {
          this.visited[n] = 1;
          this.queue[tail++] = n;
        }
      }
    }
    const fragments: Vec3[] = [];
    let count = 0;
    for (let i = 0; i < this.values.length; i++)
      if (this.values[i] > 0.5 && !this.visited[i]) {
        if (count++ % 9 === 0 && fragments.length < TUNE.fragmentCap)
          fragments.push({ ...this.points[i] });
        this.values[i] = 0;
        this.warmth[i] = 0;
      }
    if (count) {
      this.dirty = true;
      this.revision++;
    }
    return fragments;
  }
  canRelease(t: Loot, contactSamples?: Vec3[]) {
    if (this.profile?.releaseMode === 'surfaceExposure') {
      const e = this.exposure(t);
      if (e.exposed < 0.58 || e.topCover > 0.12) return false;
      // Once the exposed shell cracks, its narrow remaining pedestal crumbles.
      // Remove that real geometry before gravity starts; later fields never use this path.
      const margin = TUNE.step * TUNE.worldScale * this.profile.scale;
      this.points.forEach((p, i) => {
        if (
          Math.abs(p.x - t.x) < t.w * 0.55 + margin &&
          Math.abs(p.z - t.z) < t.d * 0.55 + margin &&
          p.y < t.y + t.h * 0.5 + margin
        ) {
          this.values[i] = this.warmth[i] = 0;
        }
      });
      this.dirty = true;
      this.revision++;
      return true;
    }
    if (contactSamples?.length) {
      return contactSamples.every(
        (p) =>
          this.density({ x: t.x + p.x, y: t.y + p.y, z: t.z + p.z }, true) <=
          0.5,
      );
    }
    // Headless simulation fallback: test the item's volume itself, with no
    // invisible buffer outside it. The renderer supplies exact mesh probes.
    const step = (TUNE.step * TUNE.worldScale * (this.profile?.scale ?? 1)) / 4;
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
      step = (TUNE.step * TUNE.worldScale * (this.profile?.scale ?? 1)) / 4;
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
  exposure(t: Loot) {
    const margin =
      TUNE.step * TUNE.worldScale * (this.profile?.scale ?? 1) * 1.8;
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
export function surface(field: IceField) {
  const positions: number[] = [],
    colors: number[] = [];
  const { nx, ny, nz } = TUNE;
  const put = (a: Vec3, b: Vec3, c: Vec3, outward: Vec3, frost: number) => {
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
      colors.push(
        0.48 + frost * 0.23 + variation,
        0.77 + frost * 0.13 + variation,
        0.86 + frost * 0.12 + variation,
      );
    }
  };
  for (let z = 0; z < nz - 1; z++)
    for (let y = 0; y < ny - 1; y++)
      for (let x = 0; x < nx - 1; x++) {
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
          if (hits.length === 3) put(hits[0], hits[1], hits[2], n, frost);
          else {
            put(hits[0], hits[1], hits[2], n, frost);
            put(hits[1], hits[3], hits[2], n, frost);
          }
        }
      }
  field.dirty = false;
  return { positions, colors };
}
