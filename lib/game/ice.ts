import { TUNE, worldY, type Loot, type Vec3 } from './tuning';

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
  ) {
    const { nx, ny, nz, step, baseY } = TUNE;
    this.values = new Float32Array(nx * ny * nz);
    this.warmth = new Float32Array(this.values.length);
    this.visited = new Uint8Array(this.values.length);
    this.queue = new Int32Array(this.values.length);
    const final = round === TUNE.finalRound - 1;
    const width = final ? 2.37 : 2.1;
    const height = final ? 2.8 : 2.35;
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
            x: p.x * TUNE.worldScale,
            y: worldY(p.y),
            z: p.z * TUNE.worldScale,
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
            round % 4 === 2 &&
            p.y < 1.48 &&
            (Math.abs(p.x) > 0.46 || Math.abs(p.z) > 0.38)
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
  canRelease(t: Loot) {
    let count = 0;
    // Visible material immediately around the item, plus its vertical drop corridor.
    for (let i = 0; i < this.values.length; i++) {
      if (this.values[i] <= 0.5) continue;
      const p = this.points[i];
      if (
        Math.abs(p.x - t.x) < t.w * 0.5 + 0.06 * TUNE.worldScale &&
        Math.abs(p.z - t.z) < t.d * 0.5 + 0.06 * TUNE.worldScale &&
        p.y < t.y + t.h * 0.5 + 0.06 * TUNE.worldScale
      )
        count++;
    }
    if (count > 3) return false;
    // The last brittle contact points fracture visibly before the drop begins.
    for (let i = 0; i < this.values.length; i++) {
      const p = this.points[i];
      if (
        Math.abs(p.x - t.x) < t.w * 0.5 + 0.18 * TUNE.worldScale &&
        Math.abs(p.z - t.z) < t.d * 0.5 + 0.18 * TUNE.worldScale &&
        p.y < t.y + t.h * 0.5 + 0.15 * TUNE.worldScale
      ) {
        this.values[i] = 0;
        this.warmth[i] = 0;
      }
    }
    this.dirty = true;
    this.revision++;
    return true;
  }
  remaining() {
    let n = 0;
    for (const v of this.values) if (v > 0.5) n++;
    return n;
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
