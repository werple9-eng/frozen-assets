import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { IceField, surface } from './ice';
import { GameAudio } from './audio';
import { TUNE, type Loot, type Vec3 } from './tuning';
export type SceneModel = {
  field: IceField;
  loot: Loot[];
  firing: boolean;
  paused: boolean;
  fuel: number;
  mode: string;
  heatLevel: number;
  residual: number;
  reducedParticles: boolean;
  toggle?: boolean;
  update: (dt: number, hit: Vec3 | null) => void;
  press: () => void;
  stop: () => void;
  emit: () => void;
};
type Particle = {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  age: number;
  duration: number;
  fragment: boolean;
};
export class GameScene {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.OrthographicCamera();
  audio = new GameAudio();
  ice: THREE.Mesh;
  lootGroup = new THREE.Group();
  torch = new THREE.Group();
  flame: THREE.Mesh;
  core: THREE.Mesh;
  contact: THREE.Mesh;
  heatLight = new THREE.PointLight(0xffbc78, 0, 3);
  raycaster = new THREE.Raycaster();
  pointer = new THREE.Vector2(0.35, -0.05);
  aim = new THREE.Vector3(1, 1, 0.7);
  hasPointer = false;
  animation = 0;
  last = 0;
  meshTime = 0;
  uiTime = 0;
  oldField?: IceField;
  particles: Particle[] = [];
  lootMeshes = new Map<string, THREE.Group>();
  disposables: (() => void)[] = [];
  frames: number[] = [];
  renderTimes: number[] = [];
  scratch = new THREE.Vector3();
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
  automation?: () => void;
  constructor(
    public host: HTMLElement,
    public model: SceneModel,
  ) {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.65));
    this.renderer.setClearColor(0, 0);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '3D recovery tray. Move to aim, hold primary button to melt.',
    );
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(6.5, 9.6, 12);
    this.camera.lookAt(0, 0.65, 0);
    this.scene.add(new THREE.HemisphereLight(0xe7f6ff, 0x958779, 2.5));
    const key = new THREE.DirectionalLight(0xffead4, 3.5);
    key.position.set(-4, 9, 5);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -6,
      right: 6,
      top: 6,
      bottom: -6,
      near: 1,
      far: 25,
    });
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0002;
    key.shadow.radius = 4;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xc1efff, 2);
    rim.position.set(4, 5, -5);
    this.scene.add(rim);
    const mat = (c: number, m = 0, r = 0.5) =>
      new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
    const tray = mat(0x8a9697, 0.72, 0.48),
      edge = mat(0xb8c4c2, 0.65, 0.36),
      dark = mat(0x303d40, 0.6, 0.45);
    this.scene.add(
      this.box(10, 0.32, 7.5, mat(0x706458, 0, 0.95), 0, -0.29, 0, 0.12),
    );
    this.scene.add(this.box(7.35, 0.18, 5.4, dark, 0, -0.05, 0, 0.15));
    this.scene.add(this.box(7.12, 0.12, 5.18, tray, 0, 0.07, 0, 0.13));
    for (const x of [-3.5, 3.5])
      this.scene.add(this.box(0.16, 0.32, 5.1, edge, x, 0.23, 0, 0.065));
    this.scene.add(this.box(7.1, 0.32, 0.16, edge, 0, 0.23, -2.5, 0.065));
    this.scene.add(this.box(7.1, 0.24, 0.16, edge, 0, 0.18, 2.5, 0.065));
    this.scene.add(this.box(1.9, 0.055, 0.64, dark, 0, 0.158, 2.0, 0.1));
    for (let i = 0; i < 9; i++)
      this.scene.add(
        this.box(
          0.04,
          0.02,
          0.44,
          mat(0x627375, 0.5),
          -0.76 + i * 0.19,
          0.19,
          2,
          0.005,
        ),
      );
    for (const x of [-3.24, 3.24])
      for (const z of [-2.23, 2.23]) {
        const s = new THREE.Mesh(
          new THREE.CylinderGeometry(0.068, 0.068, 0.022, 12),
          mat(0x45565b, 0.7),
        );
        s.position.set(x, 0.17, z);
        this.scene.add(s);
        this.scene.add(this.box(0.07, 0.012, 0.012, dark, x, 0.187, z, 0.001));
      }
    const scratchMat = new THREE.LineBasicMaterial({
      color: 0xc4d0cb,
      transparent: true,
      opacity: 0.14,
    });
    for (let i = 0; i < 22; i++) {
      const z = -2.3 + i * 0.21;
      this.scene.add(
        new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(-3.2, 0.138, z),
            new THREE.Vector3(3.2, 0.138, z + 0.03),
          ]),
          scratchMat,
        ),
      );
    }
    const puddle = new THREE.Mesh(
      new THREE.CircleGeometry(1, 64),
      new THREE.MeshStandardMaterial({
        color: 0x9ed0d7,
        transparent: true,
        opacity: 0.2,
        roughness: 0.15,
        metalness: 0.2,
        depthWrite: false,
      }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(2.85, 1.86, 1);
    puddle.position.set(0, 0.142, 0);
    this.scene.add(puddle);
    const label = this.label(
      'RECOVERY  /  01',
      512,
      80,
      '#425156',
      '#c3ccbf',
      27,
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(-2.15, 0.16, 1.96);
    label.scale.set(1.28, 0.2, 1);
    this.scene.add(label);
    this.ice = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.84,
        roughness: 0.3,
        metalness: 0.03,
        clearcoat: 0.35,
        clearcoatRoughness: 0.24,
        side: THREE.FrontSide,
      }),
    );
    this.ice.castShadow = true;
    this.ice.receiveShadow = true;
    this.scene.add(this.ice, this.lootGroup);
    const steel = mat(0x63757b, 0.8, 0.28),
      brass = mat(0xc6a363, 0.7, 0.37),
      rubber = mat(0x334348, 0.05, 0.82);
    this.torch.add(
      this.box(0.32, 0.38, 1.22, mat(0xe8ad55, 0.3, 0.43), 0, 0, 0.8, 0.08),
    );
    this.torch.add(this.box(0.3, 0.32, 0.49, rubber, 0, -0.15, 1.36, 0.06));
    for (let i = 0; i < 5; i++)
      this.torch.add(
        this.box(0.33, 0.05, 0.033, rubber, 0, 0.2, 0.5 + i * 0.13, 0.008),
      );
    const cylinder = (r: number, l: number, z: number, m: THREE.Material) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, l, 18), m);
      mesh.rotation.x = Math.PI / 2;
      mesh.position.z = z;
      this.torch.add(mesh);
    };
    cylinder(0.11, 0.55, 0.02, steel);
    cylinder(0.155, 0.17, -0.28, brass);
    cylinder(0.125, 0.12, -0.4, rubber);
    const valve = new THREE.Mesh(
      new THREE.CylinderGeometry(0.13, 0.13, 0.07, 12),
      rubber,
    );
    valve.position.set(0, 0.26, 1.13);
    this.torch.add(valve);
    this.torch.add(this.box(0.1, 0.08, 0.24, steel, 0, 0.25, 0.66, 0.02));
    this.scene.add(this.torch);
    this.flame = new THREE.Mesh(
      new THREE.ConeGeometry(0.12, 1, 18),
      new THREE.MeshBasicMaterial({
        color: 0x63ccfa,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
      }),
    );
    this.flame.geometry.translate(0, -0.5, 0);
    this.core = new THREE.Mesh(
      new THREE.ConeGeometry(0.045, 1, 12),
      new THREE.MeshBasicMaterial({
        color: 0xe8fcff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      }),
    );
    this.core.geometry.translate(0, -0.5, 0);
    this.contact = new THREE.Mesh(
      new THREE.RingGeometry(0.095, 0.115, 32),
      new THREE.MeshBasicMaterial({
        color: 0xffeed4,
        transparent: true,
        opacity: 0.7,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.scene.add(this.flame, this.core, this.contact, this.heatLight);
    this.bind();
    this.resize();
    this.syncField();
    this.animation = requestAnimationFrame(this.frame);
  }
  box(
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
    r = 0.025,
  ) {
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 2, r), material);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  }
  label(
    text: string,
    w: number,
    h: number,
    color: string,
    bg: string,
    size: number,
  ) {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const cx = c.getContext('2d')!;
    cx.fillStyle = bg;
    cx.fillRect(0, 0, w, h);
    cx.fillStyle = color;
    cx.font = `600 ${size}px monospace`;
    cx.textAlign = 'center';
    cx.textBaseline = 'middle';
    cx.fillText(text, w / 2, h / 2);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshStandardMaterial({
        map: tex,
        roughness: 0.55,
        side: THREE.DoubleSide,
      }),
    );
  }
  makeLoot(t: Loot) {
    const g = new THREE.Group(),
      gold = new THREE.MeshStandardMaterial({
        color: t.kind === 'coin' ? 0xf3c66f : 0xe8b94f,
        metalness: 0.72,
        roughness: 0.27,
      });
    if (t.kind === 'coin') {
      g.add(
        new THREE.Mesh(
          new THREE.CylinderGeometry(t.w / 2, t.w / 2, t.h, 32),
          gold,
        ),
      );
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(t.w * 0.38, 0.014, 5, 32),
        gold,
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = t.h / 2 + 0.008;
      g.add(ring);
      const face = this.label('F', 128, 128, '#77542a', '#eac16b', 76);
      face.rotation.x = -Math.PI / 2;
      face.position.y = t.h / 2 + 0.01;
      face.scale.set(t.w * 0.52, t.w * 0.52, 1);
      g.add(face);
    } else if (t.kind === 'cash') {
      g.add(
        this.box(
          t.w,
          t.h,
          t.d,
          new THREE.MeshStandardMaterial({ color: 0x83a997, roughness: 0.8 }),
          0,
          0,
          0,
          0.035,
        ),
      );
      for (let i = 0; i < 4; i++)
        g.add(
          this.box(
            t.w + 0.01,
            0.009,
            t.d + 0.01,
            new THREE.MeshStandardMaterial({ color: 0xc1d6bc, roughness: 0.9 }),
            0,
            -t.h * 0.35 + i * t.h * 0.22,
            0,
            0.01,
          ),
        );
      g.add(
        this.box(
          0.2,
          t.h + 0.025,
          t.d + 0.025,
          new THREE.MeshStandardMaterial({ color: 0xe7dfbd, roughness: 0.8 }),
          0,
          0,
          0,
          0.018,
        ),
      );
      const face = this.label('F  100', 256, 100, '#355f51', '#a1bf9e', 32);
      face.rotation.x = -Math.PI / 2;
      face.position.set(-0.21, t.h / 2 + 0.012, 0);
      face.scale.set(0.32, 0.26, 1);
      g.add(face);
    } else {
      g.add(this.box(t.w, t.h, t.d, gold, 0, 0, 0, 0.055));
      const stamp = this.label('F  /  999', 256, 110, '#94652b', '#e5b952', 31);
      stamp.rotation.x = -Math.PI / 2;
      stamp.position.y = t.h / 2 + 0.006;
      stamp.scale.set(t.w * 0.66, t.d * 0.57, 1);
      g.add(stamp);
    }
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    g.position.set(t.x, t.y, t.z);
    g.rotation.y = t.kind === 'coin' ? 0.1 : -0.12 + t.x * 0.05;
    this.lootGroup.add(g);
    this.lootMeshes.set(t.id, g);
  }
  syncField() {
    if (this.oldField !== this.model.field) {
      for (const g of this.lootMeshes.values()) this.disposeObject(g);
      this.lootGroup.clear();
      this.lootMeshes.clear();
      this.clearParticles();
      this.oldField = this.model.field;
      for (const t of this.model.loot)
        if (t.state !== 'collected') this.makeLoot(t);
    }
    const data = surface(this.model.field),
      geo = new THREE.BufferGeometry();
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(data.positions, 3),
    );
    geo.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    this.ice.geometry.dispose();
    this.ice.geometry = geo;
  }
  bind() {
    const canvas = this.renderer.domElement;
    const on = (target: EventTarget, event: string, fn: EventListener) => {
      target.addEventListener(event, fn);
      this.disposables.push(() => target.removeEventListener(event, fn));
    };
    const aim = (ev: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      this.pointer.set(
        ((ev.clientX - r.left) / r.width) * 2 - 1,
        (-(ev.clientY - r.top) / r.height) * 2 + 1,
      );
      this.hasPointer = true;
    };
    on(canvas, 'pointermove', ((ev: PointerEvent) => aim(ev)) as EventListener);
    on(canvas, 'pointerdown', ((ev: PointerEvent) => {
      if (ev.button !== 0) return;
      ev.preventDefault();
      aim(ev);
      this.audio.init();
      this.model.press();
    }) as EventListener);
    on(window, 'pointerup', (() => {
      if (!this.model.toggle) this.model.stop();
    }) as EventListener);
    on(canvas, 'pointerleave', (() => {
      this.hasPointer = false;
      this.model.stop();
    }) as EventListener);
    on(window, 'pointercancel', (() => this.model.stop()) as EventListener);
    on(window, 'blur', (() => {
      this.hasPointer = false;
      this.model.stop();
      this.audio.fire(false, false);
    }) as EventListener);
    on(document, 'visibilitychange', (() => {
      if (document.hidden) {
        this.model.stop();
        this.audio.fire(false, false);
      }
    }) as EventListener);
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.host);
    this.disposables.push(() => observer.disconnect());
  }
  resize() {
    const w = Math.max(1, this.host.clientWidth),
      h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    const a = w / h,
      span = Math.max(3.9, 4.7 / a);
    this.camera.left = -span * a;
    this.camera.right = span * a;
    this.camera.top = span;
    this.camera.bottom = -span;
    this.camera.updateProjectionMatrix();
  }
  burst(p: Vec3, count: number, fragment = false) {
    if (this.model.reducedParticles && !fragment) return;
    for (
      let i = 0;
      i < count && this.particles.length < TUNE.particleCap;
      i++
    ) {
      const mesh = new THREE.Mesh(
        fragment
          ? new THREE.IcosahedronGeometry(0.12, 0)
          : new THREE.SphereGeometry(0.025, 5, 4),
        new THREE.MeshStandardMaterial({
          color: fragment ? 0xb3e3ea : 0xdcf7f8,
          transparent: true,
          opacity: fragment ? 0.72 : 0.5,
          roughness: 0.3,
        }),
      );
      mesh.position.copy(p);
      this.scene.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.3,
          fragment ? 0.4 : 1,
          (Math.random() - 0.5) * 1.2,
        ),
        age: 0,
        duration: fragment ? 0.65 : 0.38,
        fragment,
      });
    }
  }
  frame = (now: number) => {
    const start = performance.now(),
      rawDt = this.last ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    const dt = Math.min(rawDt, 0.033);
    if (rawDt < 0.2) {
      this.frames.push(rawDt * 1000);
      if (this.frames.length > 900) this.frames.shift();
    }
    if (this.oldField !== this.model.field) this.syncField();
    this.automation?.();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.hasPointer
      ? this.raycaster.intersectObject(this.ice, false)[0]
      : undefined;
    if (hit) this.aim.copy(hit.point);
    else if (this.hasPointer) {
      this.raycaster.ray.intersectPlane(this.plane, this.scratch);
      this.aim.set(
        THREE.MathUtils.clamp(this.scratch.x, -3.6, 3.6),
        0.5,
        THREE.MathUtils.clamp(this.scratch.z, -2.5, 2.5),
      );
    }
    let simulationTime = Math.min(rawDt, 0.1);
    while (simulationTime > 0.00001) {
      const step = Math.min(simulationTime, 0.025);
      this.model.update(step, hit?.point ?? null);
      simulationTime -= step;
    }
    this.meshTime += dt;
    if (this.model.field.dirty && this.meshTime >= TUNE.meshInterval) {
      this.syncField();
      this.meshTime = 0;
    }
    const firing =
      this.model.firing && !this.model.paused && this.model.fuel > 0;
    const dest = this.scratch.copy(this.aim);
    dest.x += 1.8;
    dest.y += 0.5;
    dest.z += 0.4;
    this.torch.position.lerp(dest, 1 - Math.exp(-TUNE.visualFollow * dt));
    this.torch.lookAt(this.aim);
    this.torch.rotateY(Math.PI);
    const tip = this.torch.localToWorld(new THREE.Vector3(0, 0, -0.46));
    for (const flame of [this.flame, this.core]) {
      flame.visible = firing;
      flame.position.copy(tip);
      const dir = this.aim.clone().sub(tip);
      flame.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        dir.clone().normalize(),
      );
      flame.scale.set(
        this.model.mode === 'wide' ? 1.7 : 1,
        dir.length(),
        this.model.mode === 'wide' ? 1.7 : 1,
      );
    }
    this.contact.visible = !!hit && this.hasPointer && !this.model.paused;
    if (hit) {
      this.contact.position
        .copy(hit.point)
        .addScaledVector(hit.face!.normal, 0.014);
      this.contact.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        hit.face!.normal,
      );
      this.contact.scale.setScalar(firing ? 0.8 : 1);
    }
    this.heatLight.position.copy(this.aim);
    this.heatLight.intensity = firing && hit ? 0.35 : 0;
    this.audio.fire(firing, !!hit, this.model.mode === 'wide');
    if (firing && hit && Math.random() < dt * 10) this.burst(hit.point, 1);
    for (const t of this.model.loot) {
      const g = this.lootMeshes.get(t.id);
      if (!g) continue;
      if (t.state === 'collected') {
        g.visible = false;
        continue;
      }
      g.position.set(t.x, t.y, t.z);
      if (t.state === 'collecting') {
        const f = Math.min(1, t.age / TUNE.collectionTime),
          e = f * f * (3 - 2 * f);
        if (g.userData.slideLimit === undefined)
          g.userData.slideLimit = this.collectionLimit(t);
        const travel = e * g.userData.slideLimit;
        g.position.set(
          t.x * (1 - travel),
          t.y - 0.12 * e,
          t.z + (2 - t.z) * travel,
        );
        g.scale.setScalar(1 - 0.5 * e);
      }
      if (t.state === 'landed' && t.kind === 'coin')
        g.rotation.z = Math.sin(t.age * 35) * Math.exp(-t.age * 15) * 0.16;
    }
    if (!this.model.paused)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.age += dt;
        p.velocity.y -= dt * (p.fragment ? 10 : 3);
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.position.y = Math.max(0.18, p.mesh.position.y);
        (p.mesh.material as THREE.MeshStandardMaterial).opacity *= Math.exp(
          -dt * 2,
        );
        if (p.age > p.duration) {
          this.disposeObject(p.mesh);
          this.scene.remove(p.mesh);
          this.particles.splice(i, 1);
        }
      }
    const phaseModel = this.model as SceneModel & {
      phase?: string;
      elapsed?: number;
    };
    const slide =
      phaseModel.phase === 'transitioning'
        ? Math.pow(
            1 - Math.min(1, (phaseModel.elapsed ?? 0) / TUNE.transitionTime),
            3,
          )
        : 0;
    this.ice.position.z = -slide * 1.6;
    this.lootGroup.position.z = -slide * 1.6;
    this.renderer.render(this.scene, this.camera);
    this.renderTimes.push(performance.now() - start);
    if (this.renderTimes.length > 900) this.renderTimes.shift();
    this.uiTime += dt;
    if (this.uiTime > 0.08) {
      this.model.emit();
      this.uiTime = 0;
    }
    this.animation = requestAnimationFrame(this.frame);
  };
  collectionLimit(t: Loot) {
    // Sweep the item's footprint against the actual remaining surface once.
    // A blocked slide settles into the tray locally as a safe recovery path.
    const direction = new THREE.Vector3(-t.x, 0, 2 - t.z),
      distance = direction.length();
    direction.normalize();
    let limit = 1;
    const probe = new THREE.Raycaster(undefined, direction, 0, distance);
    for (const x of [-t.w * 0.5, 0, t.w * 0.5])
      for (const z of [-t.d * 0.5, t.d * 0.5])
        for (const y of [t.y, t.y + t.h * 0.5]) {
          probe.ray.origin.set(t.x + x, y, t.z + z);
          const hit = probe.intersectObject(this.ice, false)[0];
          if (hit)
            limit = Math.min(
              limit,
              Math.max(0, (hit.distance - 0.06) / distance),
            );
        }
    return limit;
  }
  clearParticles() {
    for (const p of this.particles) {
      this.scene.remove(p.mesh);
      this.disposeObject(p.mesh);
    }
    this.particles = [];
  }
  disposeObject(o: THREE.Object3D) {
    o.traverse((n) => {
      if (n instanceof THREE.Mesh) {
        n.geometry.dispose();
        for (const m of Array.isArray(n.material) ? n.material : [n.material]) {
          m.map?.dispose();
          m.dispose();
        }
      }
    });
  }
  stats() {
    const s = [...this.frames].sort((a, b) => a - b),
      work = [...this.renderTimes].sort((a, b) => a - b);
    return {
      samples: s.length,
      fps:
        1000 /
        (this.frames.reduce((a, b) => a + b, 0) /
          Math.max(1, this.frames.length)),
      frameP95: s[Math.floor(s.length * 0.95)],
      frameP99: s[Math.floor(s.length * 0.99)],
      workMean:
        this.renderTimes.reduce((a, b) => a + b, 0) /
        Math.max(1, this.renderTimes.length),
      workP95: work[Math.floor(work.length * 0.95)],
      drawCalls: this.renderer.info.render.calls,
      triangles: this.renderer.info.render.triangles,
      geometries: this.renderer.info.memory.geometries,
      particles: this.particles.length,
      voices: this.audio.voices,
      width: this.host.clientWidth,
      height: this.host.clientHeight,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }
  dispose() {
    cancelAnimationFrame(this.animation);
    this.disposables.forEach((fn) => fn());
    this.audio.dispose();
    this.disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
