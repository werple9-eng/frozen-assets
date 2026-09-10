import * as THREE from 'three';

const NORMAL = 48,
  REDUCED = 14;
const VOLUME = {
  minX: -19,
  maxX: 19,
  minY: 0.6,
  maxY: 15.2,
  minZ: -13.6,
  maxZ: 10,
};

// Forty-eight slow motes in one Points draw. Most are nearly invisible; they
// read where they cross the lamp's light. Nothing here answers a raycast.
export class WorkshopAir {
  group = new THREE.Group();
  geometry = new THREE.BufferGeometry();
  positions = new Float32Array(NORMAL * 3);
  colors = new Float32Array(NORMAL * 3);
  base = new Float32Array(NORMAL * 3);
  velocity = new Float32Array(NORMAL * 3);
  kick = new Float32Array(NORMAL * 3);
  phase = new Float32Array(NORMAL);
  tint = new Float32Array(NORMAL);
  dust: THREE.Points;
  texture: THREE.CanvasTexture;
  private readonly local = new THREE.Vector3();
  private readonly axis = new THREE.Vector3();
  private readonly toMote = new THREE.Vector3();
  constructor() {
    // The desk top is world Y = -0.5; the volume is authored above it.
    this.group.position.y = -0.5;
    let seeded = 0;
    const random = () => {
      seeded = (seeded * 1664525 + 1013904223) % 4294967296;
      return seeded / 4294967296;
    };
    for (let i = 0; i < NORMAL; i++) {
      // 15% foreground, 55% midground, 30% background; sparse over the tray.
      const band = random();
      let x = 0,
        y = 0,
        z = 0;
      do {
        x = VOLUME.minX + random() * (VOLUME.maxX - VOLUME.minX);
        y = VOLUME.minY + random() * (VOLUME.maxY - VOLUME.minY);
        z =
          band < 0.15
            ? 2 + random() * 8
            : band < 0.7
              ? -7 + random() * 9
              : VOLUME.minZ + random() * 6.6;
      } while (Math.hypot(x, z) < 7 && y < 4.5);
      this.base.set([x, y, z], i * 3);
      this.velocity.set(
        [
          (random() - 0.5) * 0.012,
          0.003 + random() * 0.012,
          (random() - 0.5) * 0.008,
        ],
        i * 3,
      );
      this.phase[i] = random() * Math.PI * 2;
      this.tint[i] = 0.5 + random() * 0.5;
    }
    this.positions.set(this.base);
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3),
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.colors, 3),
    );
    const speck = document.createElement('canvas');
    speck.width = speck.height = 32;
    const ctx = speck.getContext('2d')!;
    const glow = ctx.createRadialGradient(15, 16, 0, 15, 16, 14);
    glow.addColorStop(0, 'rgba(255,255,255,1)');
    glow.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    glow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(16, 16, 13, 11, 0.6, 0, Math.PI * 2);
    ctx.fill();
    this.texture = new THREE.CanvasTexture(speck);
    this.dust = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({
        size: 2.4,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.17,
        depthTest: true,
        depthWrite: false,
        map: this.texture,
      }),
    );
    this.dust.frustumCulled = false;
    this.dust.raycast = () => {};
    this.group.add(this.dust);
  }
  // A brief local push, felt more than seen. World-space point.
  impulse(x: number, y: number, z: number, strength: number) {
    this.local.set(x, y, z);
    this.group.worldToLocal(this.local);
    for (let i = 0; i < NORMAL; i++) {
      const dx = this.positions[i * 3] - this.local.x,
        dy = this.positions[i * 3 + 1] - this.local.y,
        dz = this.positions[i * 3 + 2] - this.local.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 6 || d < 0.01) continue;
      const push = (strength * 0.04 * (1 - d / 6)) / d;
      this.kick[i * 3] += dx * push;
      this.kick[i * 3 + 1] += dy * push * 0.6 + strength * 0.006;
      this.kick[i * 3 + 2] += dz * push;
    }
  }
  update(
    time: number,
    reduced: boolean,
    fewer: boolean,
    dt: number,
    lamp: THREE.Vector3,
    lampTarget: THREE.Vector3,
  ) {
    const count = fewer ? REDUCED : NORMAL;
    this.geometry.setDrawRange(0, count);
    const decay = Math.exp(-dt / 1.1);
    this.group.worldToLocal(this.axis.copy(lampTarget));
    this.group.worldToLocal(this.local.copy(lamp));
    this.axis.sub(this.local).normalize();
    const p = this.positions,
      c = this.colors;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      if (!reduced) {
        const drift = 0.002;
        p[o] +=
          (this.velocity[o] + this.kick[o]) * dt +
          Math.sin(time * 0.17 + this.phase[i]) * drift * dt;
        p[o + 1] += (this.velocity[o + 1] + this.kick[o + 1]) * dt;
        p[o + 2] +=
          (this.velocity[o + 2] + this.kick[o + 2]) * dt +
          Math.cos(time * 0.13 + this.phase[i] * 1.7) * drift * dt;
        this.kick[o] *= decay;
        this.kick[o + 1] *= decay;
        this.kick[o + 2] *= decay;
        // Wrap far from the camera: a mote that leaves the top returns low at the back.
        if (p[o + 1] > VOLUME.maxY) {
          p[o + 1] = VOLUME.minY;
          p[o + 2] =
            VOLUME.minZ +
            ((p[o + 2] - VOLUME.minZ + 5.3) % (VOLUME.maxZ - VOLUME.minZ));
        }
        if (p[o] < VOLUME.minX) p[o] = VOLUME.maxX;
        else if (p[o] > VOLUME.maxX) p[o] = VOLUME.minX;
        if (p[o + 2] < VOLUME.minZ) p[o + 2] = VOLUME.maxZ;
        else if (p[o + 2] > VOLUME.maxZ) p[o + 2] = VOLUME.minZ;
      }
      // Brightness follows the lamp cone; elsewhere the mote nearly vanishes.
      this.toMote.set(
        p[o] - this.local.x,
        p[o + 1] - this.local.y,
        p[o + 2] - this.local.z,
      );
      const along = this.toMote.dot(this.axis);
      const radial = Math.sqrt(
        Math.max(0, this.toMote.lengthSq() - along * along),
      );
      const cone =
        along > 0 ? Math.max(0, 1 - radial / (0.9 + along * 0.42)) : 0;
      const bright = (0.28 + cone * 0.9) * this.tint[i];
      c[o] = bright * 0.93;
      c[o + 1] = bright * 0.97;
      c[o + 2] = bright;
    }
    (
      this.geometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (this.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate =
      true;
  }
  dispose() {
    this.geometry.dispose();
    (this.dust.material as THREE.PointsMaterial).dispose();
    this.texture.dispose();
  }
}
