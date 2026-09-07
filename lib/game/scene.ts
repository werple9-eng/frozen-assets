import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { IceField, surface } from './ice';
import { TrayRotation } from './rotation';
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
  settings?: { rotationSensitivity: number; reducedMotion: boolean };
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
  assembly = new THREE.Group();
  turntable = new TrayRotation();
  rotateMode = false;
  spaceHeld = false;
  gesture: 'idle' | 'melt' | 'rotate' = 'idle';
  pointerId: number | null = null;
  dragX = 0;
  dragY = 0;
  contactAge = 0;
  crackClock = 0;
  localHit = new THREE.Vector3();
  hitNormal = new THREE.Vector3();
  onViewChange: () => void = () => {};
  framing = { span: 5.2, x: 0, y: 0 };
  fitPoint = new THREE.Vector3();
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
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    this.renderer.domElement.setAttribute(
      'aria-label',
      '3D recovery tray. Hold on ice to melt. Drag empty tray to turn. Q and E also turn.',
    );
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(1.3, 17, 29);
    this.camera.lookAt(0, 3.2, 0);
    this.camera.near = 0.1;
    this.camera.far = 70;
    this.assembly.position.y = 0.65;
    this.scene.add(this.assembly);
    this.scene.add(new THREE.HemisphereLight(0xc8e2eb, 0x34302b, 1.65));
    const key = new THREE.DirectionalLight(0xffe8cd, 2.8);
    key.position.set(-7, 22, 8);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    Object.assign(key.shadow.camera, {
      left: -15,
      right: 15,
      top: 15,
      bottom: -15,
      near: 1,
      far: 55,
    });
    key.shadow.normalBias = 0.025;
    key.shadow.bias = -0.0002;
    key.shadow.radius = 5;
    key.shadow.blurSamples = 8;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xbcd7e2, 1.7);
    rim.position.set(7, 10, -8);
    this.scene.add(rim);
    const mat = (c: number, m = 0, r = 0.5) =>
      new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r });
    const tray = mat(0x414d54, 0.58, 0.52),
      edge = mat(0x68737a, 0.65, 0.38),
      dark = mat(0x20272b, 0.25, 0.74);
    this.scene.add(
      this.box(45, 0.6, 40, this.deskMaterial(), 0, -0.8, 0, 0.12),
    );
    const deck = new THREE.Group();
    deck.scale.set(TUNE.trayScale, 1, TUNE.trayScale);
    this.assembly.add(deck);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.45, 0.65, 64),
      dark,
    );
    pedestal.position.y = -0.16;
    pedestal.receiveShadow = true;
    this.scene.add(pedestal);
    const bearing = new THREE.Mesh(
      new THREE.TorusGeometry(2.13, 0.065, 8, 80),
      edge,
    );
    bearing.rotation.x = -Math.PI / 2;
    bearing.position.y = 0.19;
    this.scene.add(bearing);
    deck.add(this.box(7.35, 0.18, 5.4, dark, 0, -0.05, 0, 0.15));
    deck.add(this.box(7.12, 0.12, 5.18, tray, 0, 0.07, 0, 0.13));
    for (const x of [-3.5, 3.5])
      deck.add(this.box(0.16, 0.32, 5.1, edge, x, 0.23, 0, 0.065));
    deck.add(this.box(7.1, 0.32, 0.16, edge, 0, 0.23, -2.5, 0.065));
    deck.add(this.box(7.1, 0.24, 0.16, edge, 0, 0.18, 2.5, 0.065));
    deck.add(this.box(1.9, 0.055, 0.64, dark, 0, 0.158, 2.0, 0.1));
    for (let i = 0; i < 9; i++)
      deck.add(
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
        deck.add(s);
        deck.add(this.box(0.07, 0.012, 0.012, dark, x, 0.187, z, 0.001));
      }
    const scratchMat = new THREE.LineBasicMaterial({
      color: 0xc4d0cb,
      transparent: true,
      opacity: 0.035,
    });
    for (let i = 0; i < 22; i++) {
      const z = -2.3 + i * 0.21;
      deck.add(
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
        opacity: 0.055,
        roughness: 0.15,
        metalness: 0.2,
        depthWrite: false,
      }),
    );
    puddle.rotation.x = -Math.PI / 2;
    puddle.scale.set(2.85, 1.86, 1);
    puddle.position.set(0, 0.142, 0);
    deck.add(puddle);
    const label = this.label(
      'FA–01 / RECOVERY',
      512,
      80,
      '#bbc5c6',
      '#29343a',
      27,
    );
    label.rotation.x = -Math.PI / 2;
    label.position.set(-2.15, 0.16, 1.96);
    label.scale.set(1.28, 0.2, 1);
    deck.add(label);
    this.ice = new THREE.Mesh(
      new THREE.BufferGeometry(),
      new THREE.MeshPhysicalMaterial({
        color: 0xffffff,
        vertexColors: true,
        transparent: true,
        opacity: 0.82,
        roughness: 0.36,
        metalness: 0.03,
        clearcoat: 0.35,
        clearcoatRoughness: 0.24,
        side: THREE.FrontSide,
      }),
    );
    this.iceMaterial(this.ice.material as THREE.MeshPhysicalMaterial);
    this.ice.castShadow = true;
    this.ice.receiveShadow = true;
    this.assembly.add(this.ice, this.lootGroup);
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
    this.torch.scale.setScalar(1.22);
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
      new THREE.CircleGeometry(0.13, 7),
      new THREE.MeshBasicMaterial({
        color: 0xffeed4,
        transparent: true,
        opacity: 0.28,
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
  deskMaterial() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x302e2b,
      roughness: 0.92,
    });
    mat.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec3 vDesk;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvDesk=position;',
      );
      shader.fragmentShader = 'varying vec3 vDesk;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\nfloat grain=sin(vDesk.z*95.0+sin(vDesk.x*.6)*2.0+sin(vDesk.z*5.0)*4.0); float seam=smoothstep(.47,.495,abs(fract(vDesk.z*.3)-.5)); diffuseColor.rgb*=.95+grain*.032-seam*.15;',
      );
    };
    return mat;
  }
  iceMaterial(material: THREE.MeshPhysicalMaterial) {
    // Procedural frost and fine fracture lines are attached to the real surface.
    // Nothing remains floating when scalar-field material is removed.
    material.onBeforeCompile = (shader) => {
      shader.vertexShader =
        'varying vec3 vIcePoint;\nvarying vec3 vIceNormal;\n' +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvIcePoint = position; vIceNormal = normal;',
      );
      shader.fragmentShader =
        'varying vec3 vIcePoint;\nvarying vec3 vIceNormal;\n' +
        shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' +
          'vec3 p = vIcePoint;\n' +
          'float grain = fract(sin(dot(floor(p * 165.0), vec3(12.9898,78.233,39.425))) * 43758.5453);\n' +
          'float cloud = sin(p.x*.84 + sin(p.z*1.4)*1.2) * sin(p.y*1.3 + p.z*.9) + sin(p.x*3.1+p.y*2.7)*sin(p.z*2.8-p.y*1.6)*.24;\n' +
          'float rift = abs(p.x + .62*p.y + .045*sin(p.y*22.0) + .13*sin(p.y*5.0) + .25*sin(p.z*2.0) - .4);\n' +
          'float branch = abs(p.x - .8*p.y + .04*sin(p.y*19.0) + .2*sin(p.z*2.0) + 2.3);\n' +
          'float crack = max(1.0-smoothstep(.005,.018,rift), (1.0-smoothstep(.003,.013,branch))*smoothstep(1.5,2.2,p.y));\n' +
          'vec2 faceP = mix(p.xy,p.xz,step(.5,abs(vIceNormal.y)));\n' +
          'vec2 cell = floor(faceP*7.0); float seed = fract(sin(dot(cell,vec2(127.1,311.7)))*43758.5453);\n' +
          'float pore = (1.0-smoothstep(.06,.15,length(fract(faceP*7.0)-vec2(.3+seed*.4,.5))))*step(.90,seed);\n' +
          'diffuseColor.rgb *= .94 + grain*.065 + cloud*.038;\n' +
          'diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.83,.94,.96), crack*.65 + pore*.20);\n' +
          'diffuseColor.a *= .89 + cloud*.045 + pore*.04;',
      );
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <roughnessmap_fragment>',
        '#include <roughnessmap_fragment>\nroughnessFactor = mix(.2,.52,smoothstep(.55,.72,vColor.r)) + cloud*.045;',
      );
    };
  }
  setRotateMode(value: boolean) {
    this.cancelInput();
    this.rotateMode = value;
    this.onViewChange();
  }
  cancelInput() {
    this.model.stop();
    this.turntable.cancel();
    this.gesture = 'idle';
    this.pointerId = null;
    this.spaceHeld = false;
    this.audio.fire(false, false);
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
        1 - ((ev.clientY - r.top) / r.height) * 2,
      );
      this.hasPointer =
        ev.clientX >= r.left &&
        ev.clientX <= r.right &&
        ev.clientY >= r.top &&
        ev.clientY <= r.bottom;
    };
    on(canvas, 'contextmenu', ((ev: Event) =>
      ev.preventDefault()) as EventListener);
    on(canvas, 'pointermove', ((ev: PointerEvent) => {
      aim(ev);
      const over = document.elementFromPoint(ev.clientX, ev.clientY);
      if (
        this.pointerId !== null &&
        (!this.hasPointer ||
          over?.closest('[data-hud],[role="dialog"],[role="alertdialog"]'))
      ) {
        this.cancelInput();
        return;
      }
      if (this.gesture === 'rotate' && this.pointerId === ev.pointerId) {
        const sensitivity =
          0.5 + (this.model.settings?.rotationSensitivity ?? 0.5);
        this.turntable.move(
          (ev.clientX - this.dragX) * sensitivity,
          (ev.clientY - this.dragY) * sensitivity,
        );
        this.dragX = ev.clientX;
        this.dragY = ev.clientY;
        this.onViewChange();
      } else if (this.gesture === 'melt') {
        const over = document.elementFromPoint(ev.clientX, ev.clientY);
        if (!this.hasPointer || over?.closest('[data-hud], [role="dialog"]'))
          this.cancelInput();
      }
    }) as EventListener);
    on(canvas, 'pointerdown', ((ev: PointerEvent) => {
      if (
        this.model.paused ||
        ![0, 2].includes(ev.button) ||
        this.pointerId !== null
      )
        return;
      ev.preventDefault();
      aim(ev);
      this.audio.init();
      this.pointerId = ev.pointerId;
      this.dragX = ev.clientX;
      this.dragY = ev.clientY;
      if (ev.isTrusted) canvas.setPointerCapture(ev.pointerId);
      // Classify once, at contact. A stroke that starts on ice stays a melt
      // stroke even after it cuts a hole. A tray drag never fires the torch.
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const iceContact =
        this.raycaster.intersectObject(this.ice, false).length > 0;
      if (
        ev.button === 2 ||
        this.rotateMode ||
        this.spaceHeld ||
        ev.altKey ||
        !iceContact
      ) {
        this.model.stop();
        this.audio.fire(false, false);
        this.gesture = 'rotate';
        this.turntable.begin();
        this.audio.sound('tray', 0.28);
      } else {
        this.turntable.cancel();
        this.gesture = 'melt';
        this.model.press();
      }
    }) as EventListener);
    on(window, 'pointerup', ((ev: PointerEvent) => {
      if (this.pointerId !== null && ev.pointerId !== this.pointerId) return;
      if (this.gesture === 'rotate') {
        this.turntable.end();
        this.model.stop();
      } else if (!this.model.toggle) this.model.stop();
      const releasedId = this.pointerId;
      this.pointerId = null;
      this.gesture = 'idle';
      if (releasedId !== null && canvas.hasPointerCapture(releasedId))
        canvas.releasePointerCapture(releasedId);
    }) as EventListener);
    on(canvas, 'pointerleave', (() => {
      if (this.gesture !== 'rotate') {
        this.hasPointer = false;
        this.model.stop();
      }
    }) as EventListener);
    on(window, 'pointercancel', (() => this.cancelInput()) as EventListener);
    on(canvas, 'lostpointercapture', (() => {
      if (this.pointerId !== null) this.cancelInput();
    }) as EventListener);
    on(window, 'blur', (() => {
      this.hasPointer = false;
      this.cancelInput();
    }) as EventListener);
    on(document, 'visibilitychange', (() => {
      if (document.hidden) this.cancelInput();
    }) as EventListener);
    on(window, 'keydown', ((ev: KeyboardEvent) => {
      if (
        this.model.paused ||
        ev.defaultPrevented ||
        (ev.target as HTMLElement)?.closest(
          'input,[role="dialog"],[role="alertdialog"]',
        )
      )
        return;
      if (
        ev.code === 'Space' &&
        !(ev.target as HTMLElement)?.closest('button')
      ) {
        ev.preventDefault();
        this.spaceHeld = true;
        this.model.stop();
      }
      if (ev.key.toLowerCase() === 'q' || ev.key.toLowerCase() === 'e') {
        this.model.stop();
        this.turntable.targetYaw += ev.key.toLowerCase() === 'q' ? -0.22 : 0.22;
        this.turntable.demonstrated = true;
        this.onViewChange();
      }
      if (ev.key.toLowerCase() === 'c') {
        this.model.stop();
        this.turntable.home();
      }
    }) as EventListener);
    on(window, 'keyup', ((ev: KeyboardEvent) => {
      if (ev.code === 'Space') this.spaceHeld = false;
    }) as EventListener);
    const observer = new ResizeObserver(() => this.resize());
    observer.observe(this.host);
    this.disposables.push(() => observer.disconnect());
  }
  resize() {
    const w = Math.max(1, this.host.clientWidth),
      h = Math.max(1, this.host.clientHeight);
    this.renderer.setSize(w, h, false);
    this.assembly.updateMatrixWorld(true);
    this.camera.updateMatrixWorld(true);
    this.fitCamera(1);
  }
  fitCamera(dt: number) {
    const w = this.host.clientWidth,
      h = this.host.clientHeight,
      a = w / Math.max(1, h);
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;
    const sample = (x: number, y: number, z: number) => {
      const p = this.fitPoint
        .set(x, y, z)
        .applyMatrix4(this.assembly.matrixWorld)
        .applyMatrix4(this.camera.matrixWorldInverse);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    };
    const final = this.model.field.round === 19;
    for (const x of [-3.72, 3.72])
      for (const z of [-2.74, 2.74])
        sample(x * TUNE.trayScale, -0.1, z * TUNE.trayScale);
    for (const x of [-(final ? 2.44 : 2.16), final ? 2.44 : 2.16])
      for (const y of [0.18, final ? 2.84 : 2.4])
        for (const z of [-1.48, 1.48])
          sample(x * TUNE.worldScale, y * TUNE.worldScale, z * TUNE.worldScale);
    const top = w <= 600 ? 104 : 74,
      bottom = w <= 600 ? 86 : 65;
    const usable = Math.max(0.28, 1 - (top + bottom) / h);
    const span = Math.max(
      (maxY - minY) / 2 / usable,
      (maxX - minX) / 2 / a / 0.97,
    );
    const x = (minX + maxX) / 2,
      y = (minY + maxY) / 2 - ((bottom - top) / h) * span;
    const blend = 1 - Math.exp(-12 * dt);
    this.framing.span += (span - this.framing.span) * blend;
    this.framing.x += (x - this.framing.x) * blend;
    this.framing.y += (y - this.framing.y) * blend;
    this.camera.left = this.framing.x - this.framing.span * a;
    this.camera.right = this.framing.x + this.framing.span * a;
    this.camera.top = this.framing.y + this.framing.span;
    this.camera.bottom = this.framing.y - this.framing.span;
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
          ? new THREE.IcosahedronGeometry(0.16, 0)
          : new THREE.SphereGeometry(0.025, 5, 4),
        new THREE.MeshStandardMaterial({
          color: fragment ? 0xb3e3ea : 0xdcf7f8,
          transparent: true,
          opacity: fragment ? 0.72 : 0.5,
          roughness: 0.3,
        }),
      );
      mesh.position.copy(p);
      const size = TUNE.worldScale / 1.7;
      mesh.scale.set(
        size * (0.55 + Math.random() * 0.7),
        size * (fragment ? 0.35 : 1),
        size,
      );
      mesh.rotation.set(
        Math.random() * 3,
        Math.random() * 3,
        Math.random() * 3,
      );
      this.assembly.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.3 * size,
          (fragment ? 0.4 : 1) * size,
          (Math.random() - 0.5) * 1.2 * size,
        ),
        age: 0,
        duration: fragment ? 0.65 : 0.38,
        fragment,
      });
    }
  }
  frame = (now: number) => {
    if (document.hidden) {
      this.last = now;
      this.animation = requestAnimationFrame(this.frame);
      return;
    }
    const start = performance.now(),
      rawDt = this.last ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    const dt = Math.min(rawDt, 0.033);
    if (!document.hidden) {
      this.frames.push(rawDt * 1000);
      if (this.frames.length > 900) this.frames.shift();
    }
    if (this.oldField !== this.model.field) this.syncField();
    if (this.model.paused) {
      this.turntable.cancel();
      if (this.gesture !== 'idle') this.cancelInput();
    } else this.turntable.update(rawDt);
    this.assembly.rotation.set(
      this.turntable.tilt,
      this.turntable.yaw,
      0,
      'YXZ',
    );
    this.assembly.updateMatrixWorld(true);
    this.fitCamera(dt);
    this.automation?.();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.hasPointer
      ? this.raycaster.intersectObject(this.ice, false)[0]
      : undefined;
    this.renderer.domElement.style.cursor =
      this.gesture === 'rotate'
        ? 'grabbing'
        : this.rotateMode || !hit
          ? 'grab'
          : 'crosshair';
    if (hit) this.aim.copy(hit.point);
    else if (this.hasPointer) {
      this.plane.setFromNormalAndCoplanarPoint(
        this.hitNormal
          .set(0, 1, 0)
          .transformDirection(this.assembly.matrixWorld),
        this.assembly.localToWorld(this.localHit.set(0, 0.65, 0)),
      );
      this.raycaster.ray.intersectPlane(this.plane, this.scratch);
      this.assembly.worldToLocal(this.scratch);
      this.scratch.set(
        THREE.MathUtils.clamp(
          this.scratch.x,
          -3.6 * TUNE.trayScale,
          3.6 * TUNE.trayScale,
        ),
        0.65,
        THREE.MathUtils.clamp(
          this.scratch.z,
          -2.6 * TUNE.trayScale,
          2.6 * TUNE.trayScale,
        ),
      );
      this.aim.copy(this.assembly.localToWorld(this.scratch));
    }
    let simulationTime = Math.min(rawDt, 0.1);
    while (simulationTime > 0.00001) {
      const step = Math.min(simulationTime, 0.025);
      this.model.update(
        step,
        hit ? this.assembly.worldToLocal(this.localHit.copy(hit.point)) : null,
      );
      simulationTime -= step;
    }
    this.meshTime += dt;
    if (this.model.field.dirty && this.meshTime >= TUNE.meshInterval) {
      this.syncField();
      this.meshTime = 0;
    }
    const firing =
      this.model.firing && !this.model.paused && this.model.fuel > 0;
    this.contactAge = firing && hit ? this.contactAge + dt : 0;
    this.crackClock += dt;
    if (firing && hit && this.crackClock > 0.32 + Math.random() * 0.16) {
      this.crackClock = 0;
      this.audio.sound('chip', 0.25 + this.model.heatLevel * 0.07);
    }
    const dest = this.scratch.copy(this.aim);
    dest.x += 2.5;
    dest.y += 0.7;
    dest.z += 0.6;
    this.torch.position.lerp(dest, 1 - Math.exp(-TUNE.visualFollow * dt));
    this.torch.lookAt(this.aim);
    this.torch.rotateY(Math.PI);
    if (firing && hit && !this.model.settings?.reducedMotion)
      this.torch.rotateZ(Math.sin(this.contactAge * 37) * 0.004);
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
    this.torch.visible =
      this.hasPointer &&
      !!hit &&
      !this.rotateMode &&
      this.gesture !== 'rotate' &&
      !this.model.paused;
    this.contact.visible =
      !!hit &&
      this.hasPointer &&
      !this.model.paused &&
      !this.rotateMode &&
      this.gesture !== 'rotate';
    if (hit) {
      this.hitNormal
        .copy(hit.face!.normal)
        .transformDirection(this.ice.matrixWorld);
      this.contact.position
        .copy(hit.point)
        .addScaledVector(this.hitNormal, 0.02);
      this.contact.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        this.hitNormal,
      );
      this.contact.scale.setScalar(
        (firing ? 1.2 + Math.sin(this.contactAge * 30) * 0.1 : 0.45) *
          (this.model.mode === 'wide' ? 2.8 : 1.8),
      );
      (this.contact.material as THREE.MeshBasicMaterial).opacity = firing
        ? 0.2
        : 0.12;
    }
    this.heatLight.position.copy(this.aim);
    this.heatLight.intensity = firing && hit ? 0.35 : 0;
    this.audio.fire(firing, !!hit, this.model.mode === 'wide');
    if (firing && hit && Math.random() < dt * 14)
      this.burst(this.assembly.worldToLocal(this.localHit.copy(hit.point)), 1);
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
          t.z + (2 * TUNE.trayScale - t.z) * travel,
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
        if (p.fragment) p.mesh.rotation.x += dt * 3;
        p.mesh.position.y = Math.max(0.18, p.mesh.position.y);
        (p.mesh.material as THREE.MeshStandardMaterial).opacity *= Math.exp(
          -dt * 2,
        );
        if (p.age > p.duration) {
          this.disposeObject(p.mesh);
          this.assembly.remove(p.mesh);
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
    const direction = new THREE.Vector3(-t.x, 0, 2 * TUNE.trayScale - t.z),
      distance = direction.length();
    direction.normalize().transformDirection(this.assembly.matrixWorld);
    let limit = 1;
    const probe = new THREE.Raycaster(undefined, direction, 0, distance);
    for (const x of [-t.w * 0.5, 0, t.w * 0.5])
      for (const z of [-t.d * 0.5, t.d * 0.5])
        for (const y of [t.y, t.y + t.h * 0.5]) {
          this.assembly.localToWorld(probe.ray.origin.set(t.x + x, y, t.z + z));
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
      this.assembly.remove(p.mesh);
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
      documentVisible: !document.hidden,
      documentFocused: document.hasFocus(),
      rotation: {
        yaw: this.turntable.yaw,
        tilt: this.turntable.tilt,
        velocity: this.turntable.velocity,
        dragging: this.turntable.dragging,
        mode: this.rotateMode,
        gesture: this.gesture,
      },
      worldScale: TUNE.worldScale,
      samples: s.length,
      fps:
        1000 /
        (this.frames.reduce((a, b) => a + b, 0) /
          Math.max(1, this.frames.length)),
      frameP95: s[Math.floor(s.length * 0.95)],
      frameP99: s[Math.floor(s.length * 0.99)],
      frameMax: s[s.length - 1],
      framesOver50ms: s.filter((ms) => ms > 50).length,
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
