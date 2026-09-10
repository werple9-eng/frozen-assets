import * as THREE from 'three';
import { IceField, surfaceChunk } from './ice';
import { CHUNK_CELLS, type IceChunkBounds } from './ice-grid';
import type { Vec3 } from './tuning';

export type IceMeshStats = {
  chunks: number;
  dirtyChunks: number;
  triangles: number;
  geometryCount: number;
  lastRebuildMs: number;
  averageRebuildMs: number;
  totalRebuilds: number;
  rebuiltLastFrame: number;
  lastRebuiltIds: number[];
};

// This owner controls geometry lifetime only. The workshop owns the shared
// material and may keep it across fields, phase transitions and renderer reloads.
export class ChunkedIceMesh extends THREE.Mesh<
  THREE.BufferGeometry,
  THREE.MeshPhysicalMaterial
> {
  field: IceField | null = null;
  readonly chunkMeshes = new Map<
    number,
    THREE.Mesh<THREE.BufferGeometry, THREE.MeshPhysicalMaterial>
  >();
  private dead = false;
  private totalMeshMs = 0;
  private totalRebuilds = 0;
  private lastRebuildMs = 0;
  private lastRebuiltIds: number[] = [];
  constructor(material: THREE.MeshPhysicalMaterial) {
    super(new THREE.BufferGeometry(), material);
    this.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([], 3),
    );
    this.name = 'Ice field';
    this.castShadow = true;
    this.receiveShadow = true;
  }
  setField(field: IceField) {
    if (this.dead) throw new Error('Cannot reuse a disposed ice mesh');
    if (this.field === field) return;
    this.clearChunks();
    this.field = field;
    field.markAllDirty();
    const g = field.grid;
    // Record immutable arrival bounds. Subsequent strikes cannot yank the camera.
    const bounds = new THREE.Box3();
    bounds.min.set(g.originX, field.points[0].y, g.originZ);
    const corner = field.points[field.points.length - 1];
    bounds.max.set(corner.x, corner.y, corner.z);
    this.geometry.boundingBox = bounds.clone();
    this.geometry.boundingSphere = bounds.getBoundingSphere(new THREE.Sphere());
    this.userData.deliveryBounds = bounds.clone();
    this.lastRebuiltIds = [];
    this.lastRebuildMs = 0;
  }
  private priority(impact?: Vec3, camera?: Vec3) {
    const f = this.field!;
    const list = f.chunks.filter((c) => f.dirtyChunks.has(c.id));
    if (!impact && !camera) return list;
    const g = f.grid;
    const toCell = (p: Vec3) => ({
      x: (p.x - g.originX) / g.cellSize,
      y: (p.y - g.originY) / g.cellSize,
      z: (p.z - g.originZ) / g.cellSize,
    });
    const hit = impact ? toCell(impact) : null,
      eye = camera ? toCell(camera) : hit;
    const dist = (c: IceChunkBounds, p: Vec3 | null) =>
      p
        ? Math.max(c.cellMinX - p.x, 0, p.x - c.cellMaxX) ** 2 +
          Math.max(c.cellMinY - p.y, 0, p.y - c.cellMaxY) ** 2 +
          Math.max(c.cellMinZ - p.z, 0, p.z - c.cellMaxZ) ** 2
        : 0;
    const tier = (c: IceChunkBounds) => {
      if (!hit) return 2;
      const dx = Math.abs(c.cx - Math.floor(hit.x / CHUNK_CELLS)),
        dy = Math.abs(c.cy - Math.floor(hit.y / CHUNK_CELLS)),
        dz = Math.abs(c.cz - Math.floor(hit.z / CHUNK_CELLS));
      return Math.max(dx, dy, dz) === 0 ? 0 : Math.max(dx, dy, dz) <= 1 ? 1 : 2;
    };
    return list.sort(
      (a, b) =>
        tier(a) - tier(b) ||
        (tier(a) < 2
          ? dist(a, hit) - dist(b, hit)
          : dist(a, eye) - dist(b, eye)) ||
        a.id - b.id,
    );
  }
  rebuild(budgetMs = 2.5, impact?: Vec3, camera?: Vec3) {
    const field = this.field;
    if (!field || this.dead) return this.stats;
    // Existing QA editing tools may mutate typed arrays directly. Their explicit
    // dirty flag is a full invalidation; normal strikes mark exact chunk sets.
    if (field.dirty && !field.dirtyChunks.size) field.markAllDirty();
    const started = performance.now();
    this.lastRebuiltIds = [];
    for (const chunk of this.priority(impact, camera)) {
      if (
        this.lastRebuiltIds.length &&
        performance.now() - started >= Math.max(0, budgetMs)
      )
        break;
      const revision = field.dirtyChunks.get(chunk.id);
      if (revision === undefined) continue;
      const jobStart = performance.now();
      const data = surfaceChunk(field, chunk);
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        'position',
        new THREE.Float32BufferAttribute(data.positions, 3),
      );
      geometry.setAttribute(
        'color',
        new THREE.Float32BufferAttribute(data.colors, 3),
      );
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      let mesh = this.chunkMeshes.get(chunk.id);
      if (mesh) {
        const obsolete = mesh.geometry;
        mesh.geometry = geometry;
        obsolete.dispose();
      } else {
        mesh = new THREE.Mesh(geometry, this.material);
        mesh.name = `Ice chunk ${chunk.cx},${chunk.cy},${chunk.cz}`;
        mesh.castShadow = this.castShadow;
        mesh.receiveShadow = this.receiveShadow;
        mesh.userData.chunkId = chunk.id;
        this.chunkMeshes.set(chunk.id, mesh);
        this.add(mesh);
      }
      mesh.visible = data.positions.length > 0;
      mesh.userData.revision = revision;
      field.acknowledgeChunk(chunk.id, revision);
      this.lastRebuiltIds.push(chunk.id);
      this.totalRebuilds++;
      this.totalMeshMs += performance.now() - jobStart;
    }
    this.lastRebuildMs = performance.now() - started;
    return this.stats;
  }
  override raycast(
    raycaster: THREE.Raycaster,
    intersections: THREE.Intersection[],
  ) {
    if (!this.visible || this.dead) return false;
    for (const mesh of this.chunkMeshes.values()) {
      if (mesh.visible && mesh.layers.test(raycaster.layers))
        mesh.raycast(raycaster, intersections);
    }
    // Three r180 treats a false raycast result as "do not recurse". This root
    // deliberately delegates itself, so recursive and nonrecursive callers agree.
    return false;
  }
  get stats(): IceMeshStats {
    let triangles = 0;
    for (const mesh of this.chunkMeshes.values())
      triangles += mesh.geometry.getAttribute('position').count / 3;
    return {
      chunks: this.field?.chunks.length ?? 0,
      dirtyChunks: this.field?.dirtyChunks.size ?? 0,
      triangles,
      geometryCount: this.chunkMeshes.size + (this.dead ? 0 : 1),
      lastRebuildMs: this.lastRebuildMs,
      averageRebuildMs: this.totalRebuilds
        ? this.totalMeshMs / this.totalRebuilds
        : 0,
      totalRebuilds: this.totalRebuilds,
      rebuiltLastFrame: this.lastRebuiltIds.length,
      lastRebuiltIds: [...this.lastRebuiltIds],
    };
  }
  private clearChunks() {
    for (const mesh of this.chunkMeshes.values()) {
      this.remove(mesh);
      mesh.geometry.dispose();
    }
    this.chunkMeshes.clear();
  }
  dispose() {
    if (this.dead) return;
    this.dead = true;
    this.clearChunks();
    this.geometry.dispose();
    this.field = null;
  }
}
