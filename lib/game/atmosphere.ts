import * as THREE from 'three';
import { GRAPHICS, graphicsBudget, type GraphicsQuality } from './graphics';
import { TRAY_SWEEP_RADIUS } from './room-layout';

const NORMAL = GRAPHICS.ultra.dust;
const VOLUME = {
  minX: -19,
  maxX: 19,
  minY: 0.6,
  maxY: 15.2,
  minZ: -13.6,
  maxZ: 10,
};

// Two bounded draws: lamplit motes and cold wisps. No per-frame spawning,
// raycasts, collision bodies or changes to the recovery simulation.
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
  mist = new ColdAir();
  elapsed = 0;
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
      // Fine dust above the work and larger, softer foreground specks.
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
      } while (Math.hypot(x, z) < 6 && y < 3.0);
      this.base.set([x, y, z], i * 3);
      this.velocity.set(
        [
          0.035 + (random() - 0.5) * 0.18,
          0.015 + random() * 0.055,
          (random() - 0.5) * 0.08,
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
        size: 3.5,
        sizeAttenuation: true,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        depthTest: true,
        depthWrite: false,
        map: this.texture,
      }),
    );
    this.dust.frustumCulled = false;
    this.dust.raycast = () => {};
    this.group.add(this.dust, this.mist.points);
  }
  // A brief local push, felt more than seen. World-space point.
  impulse(x: number, y: number, z: number, strength: number) {
    this.mist.gust = Math.min(1, this.mist.gust + strength);
    this.local.set(x, y, z);
    this.group.worldToLocal(this.local);
    for (let i = 0; i < NORMAL; i++) {
      const dx = this.positions[i * 3] - this.local.x,
        dy = this.positions[i * 3 + 1] - this.local.y,
        dz = this.positions[i * 3 + 2] - this.local.z;
      const d = Math.hypot(dx, dy, dz);
      if (d > 6 || d < 0.01) continue;
      const push = (strength * 1.1 * (1 - d / 6)) / d;
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
    quality: GraphicsQuality = 'high',
    renderHeight = 900,
    icePresent = true,
  ) {
    const budget = graphicsBudget(quality, fewer, reduced);
    const count = budget.dust;
    dt = Math.min(0.05, Math.max(0, dt));
    if (!reduced) this.elapsed += dt;
    time = this.elapsed;
    this.dust.visible = count > 0;
    this.geometry.setDrawRange(0, count);
    this.mist.update(dt, time, icePresent ? budget.mist : 0, renderHeight);
    const decay = Math.exp(-dt / 1.1);
    this.group.worldToLocal(this.axis.copy(lampTarget));
    this.group.worldToLocal(this.local.copy(lamp));
    this.axis.sub(this.local).normalize();
    const p = this.positions,
      c = this.colors;
    for (let i = 0; i < count; i++) {
      const o = i * 3;
      if (!reduced) {
        const drift = 0.09;
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
      const bright = (0.52 + cone * 1.05) * this.tint[i];
      c[o] = bright * (0.8 + cone * 0.28);
      c[o + 1] = bright * 0.92;
      c[o + 2] = bright * (1.0 - cone * 0.3);
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
    this.mist.geometry.dispose();
    this.mist.material.dispose();
  }
}

class ColdAir {
  geometry = new THREE.BufferGeometry();
  positions = new Float32Array(GRAPHICS.ultra.mist * 3);
  life = new Float32Array(GRAPHICS.ultra.mist);
  gust = 0;
  material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    depthTest: true,
    uniforms: { height: { value: 900 }, time: { value: 0 } },
    vertexShader: `
      attribute float life;
      varying float fade;
      varying float seed;
      uniform float height;
      void main() {
        fade = sin(life * 3.14159265);
        seed = position.x * 1.7 + position.z;
        vec4 eye = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * eye;
        float scale = length(modelMatrix[0].xyz);
        gl_PointSize = clamp((1.3 + life * 2.3) * scale * height * projectionMatrix[1][1] * 0.5, 1.0, 240.0);
      }`,
    fragmentShader: `
      varying float fade;
      varying float seed;
      uniform float time;
      void main() {
        vec2 uv = gl_PointCoord * 2.0 - 1.0;
        uv.y *= 1.65;
        uv.x += sin(uv.y * 3.0 + time * 0.45 + seed) * 0.14;
        float falloff = max(0.0, 1.0 - dot(uv, uv));
        float filaments = 0.7 + 0.3 * sin(uv.x * 6.0 + uv.y * 4.0 + seed + time * 0.3);
        float alpha = falloff * falloff * fade * filaments * 0.115;
        if (alpha < 0.002) discard;
        gl_FragColor = vec4(0.68, 0.86, 0.88, alpha);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  points = new THREE.Points(this.geometry, this.material);
  constructor() {
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.positions, 3).setUsage(
        THREE.DynamicDrawUsage,
      ),
    );
    this.geometry.setAttribute(
      'life',
      new THREE.BufferAttribute(this.life, 1).setUsage(THREE.DynamicDrawUsage),
    );
    this.geometry.setDrawRange(0, 0);
    this.points.frustumCulled = false;
    this.points.raycast = () => {};
  }
  update(dt: number, time: number, count: number, height: number) {
    this.geometry.setDrawRange(0, count);
    this.points.visible = count > 0;
    this.gust *= Math.exp(-dt * 1.8);
    if (!count) return;
    this.material.uniforms.height.value = height;
    this.material.uniforms.time.value = time;
    for (let i = 0; i < count; i++) {
      // Golden-angle spacing keeps every quality preset evenly distributed.
      const angle = i * 2.399963 + Math.sin(time * 0.12 + i) * 0.12;
      const life = (time * (0.05 + (i % 4) * 0.006) + i * 0.618034) % 1;
      const radius = TRAY_SWEEP_RADIUS * 0.69 + life * (1.8 + this.gust);
      this.positions[i * 3] = Math.cos(angle) * radius;
      this.positions[i * 3 + 1] =
        1.15 + Math.sin(life * Math.PI) * 0.45 - life * 0.9;
      this.positions[i * 3 + 2] = Math.sin(angle) * radius * 0.7;
      this.life[i] = life;
    }
    (
      this.geometry.getAttribute('position') as THREE.BufferAttribute
    ).needsUpdate = true;
    (this.geometry.getAttribute('life') as THREE.BufferAttribute).needsUpdate =
      true;
  }
}
