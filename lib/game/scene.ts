import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { IceField } from './ice';
import { ChunkedIceMesh } from './ice-renderer';
import { meshContactSamples } from './mesh-contact';
import { TrayRotation } from './rotation';
import { GameAudio } from './audio';
import { incomingCallPresentation, type IncomingCall } from './phone-call';
import { TUNE, type Loot, type Vec3 } from './tuning';
import { Workshop } from './workshop';
import { WorkshopAir } from './atmosphere';
import { Spring, TOOL_MOTION } from './motion';
import { ToolFollow } from './tool-follow';
import { SceneResources } from './scene-resources';
import { strikePose, type StrikeCycle } from './strike';
import type { ToolId, StoryObjectId } from './campaign-content';
export type SceneModel = {
  contactSamples?: (t: Loot) => Vec3[] | undefined;
  field: IceField;
  loot: Loot[];
  firing: boolean;
  paused: boolean;
  phase?: string;
  fuel: number;
  mode: string;
  heatLevel: number;
  residual: number;
  reducedParticles: boolean;
  toggle?: boolean;
  thermal?: boolean;
  toolId?: ToolId;
  strikePulse?: number;
  strikeSerial?: number;
  strike?: StrikeCycle;
  chargeTime?: number;
  fittings?: { steadiness: number };
  campaignScale?: number;
  chapter?: number;
  unread?: number;
  phoneRinging?: boolean;
  phoneOffHook?: boolean;
  dialing?: boolean;
  liveCall?: unknown;
  storyObjects?: StoryObjectId[];
  interactionBusy?: boolean;
  campaign?: {
    state: {
      tools: ToolId[];
      block?: number;
      phase?: number;
      call?: IncomingCall;
    };
  };
  settings?: {
    rotationSensitivity: number;
    reducedMotion: boolean;
    gameplayZoom?: number;
  };
  inTutorial?: boolean;
  tutorial?: { step: number; stage: string; block: number; mode?: string };
  update: (dt: number, hit: Vec3 | null) => void;
  press: () => void;
  stop: () => void;
  release?: () => void;
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
  resources = new SceneResources();
  destroyed = false;
  frameError: {
    message: string;
    stack?: string;
    phase?: string;
    gridSamples: number;
    tool?: ToolId;
  } | null = null;
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  assembly = new THREE.Group();
  contents = new THREE.Group();
  delivery = new Spring(0, 170, 17);
  recoil = new Spring(0, 330, 19);
  swing = new Spring(0, 360, 21);
  toolPresence = new Spring(0, 290, 23);
  toolFollow = new ToolFollow();
  cameraZoom = new Spring(1, 220, 30);
  guardMatrix = new THREE.Matrix4();
  guardScale = new THREE.Vector3();
  lastToolPointer = new THREE.Vector2();
  flameFlow = new Spring(0, 240, 29);
  entry = new Spring(0, 95, 19);
  surfaceBasis = new THREE.Matrix4();
  toolOut = new THREE.Vector3(0, 1, 0);
  toolAcross = new THREE.Vector3();
  toolAlong = new THREE.Vector3();
  toolRoll = new THREE.Quaternion();
  toolGuard = new THREE.Vector3();
  toolAxis = new THREE.Vector3(1, 0, 0);
  previousStrike = 0;
  deliveryLanded = true;
  deliveryMass = 1;
  deliveryFade = new Spring(1, 540, 48);
  impactAge = 10;
  iceImpact = {
    point: { value: new THREE.Vector3() },
    age: { value: 10 },
    strength: { value: 0 },
  };
  particlePool: Particle[] = [];
  fragmentGeometry = new THREE.IcosahedronGeometry(0.16, 0);
  vaporGeometry = new THREE.SphereGeometry(0.025, 5, 4);
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
  ice: ChunkedIceMesh;
  lootGroup = new THREE.Group();
  torch = new THREE.Group();
  flame: THREE.Mesh;
  core: THREE.Mesh;
  contact: THREE.Mesh;
  heatLight = new THREE.PointLight(0xffbc78, 0, 3);
  raycaster = new THREE.Raycaster();
  revealRay = new THREE.Raycaster();
  revealPoint = new THREE.Vector3();
  revealScreen = new THREE.Vector3();
  revealNdc = new THREE.Vector2();
  pointer = new THREE.Vector2(0.35, -0.05);
  aim = new THREE.Vector3(1, 1, 0.7);
  hasPointer = false;
  animation = 0;
  last = 0;
  meshTime = 0;
  uiTime = 0;
  oldField?: IceField;
  particles: Particle[] = [];
  phaseShells: { mesh: THREE.Mesh; age: number; direction: THREE.Vector3 }[] =
    [];
  lootMeshes = new Map<string, THREE.Group>();
  disposables: (() => void)[] = [];
  frames: number[] = [];
  renderTimes: number[] = [];
  meshTimings: number[] = [];
  scratch = new THREE.Vector3();
  startup = {
    created: performance.now(),
    firstRender: 0,
    interactiveReady: 0,
    firstInput: 0,
    firstStrike: 0,
  };
  workshop = new Workshop();
  air = new WorkshopAir();
  deck = new THREE.Group();
  pedestal = new THREE.Group();
  onOpenPhone: () => void = () => {};
  onOpenFiles: () => void = () => {};
  onDialKey: (key: string) => void = () => {};
  ringClock = 0;
  phoneFocus = { ringing: false, released: false, distance: Infinity };
  messageBusy = false;
  plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.45);
  automation?: () => void;
  constructor(
    public host: HTMLElement,
    public model: SceneModel,
  ) {
    model.contactSamples = (t) =>
      this.lootMeshes.get(t.id)?.userData.contactSamples;
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
      '3D recovery tray. Click with the starter chisel; hold with later equipment. Drag empty tray to turn. Q and E also turn.',
    );
    host.appendChild(this.renderer.domElement);
    this.camera.position.set(1.3, 14.7, 29);
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
    key.shadow.normalBias = 0.008;
    key.shadow.bias = -0.0002;
    key.shadow.radius = 2;
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
    const deck = this.deck;
    deck.scale.set(TUNE.trayScale, 1, TUNE.trayScale);
    this.assembly.add(deck);
    this.scene.add(this.workshop.group, this.workshop.hand);
    this.scene.add(this.air.group);
    this.scene.fog = new THREE.FogExp2(0x314039, 0.007);
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(2.15, 2.45, 0.65, 64),
      dark,
    );
    pedestal.position.y = -0.16;
    pedestal.receiveShadow = true;
    this.pedestal.add(pedestal);
    const bearing = new THREE.Mesh(
      new THREE.TorusGeometry(2.13, 0.065, 8, 80),
      edge,
    );
    bearing.rotation.x = -Math.PI / 2;
    bearing.position.y = 0.19;
    this.pedestal.add(bearing);
    this.scene.add(this.pedestal);
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
    this.ice = new ChunkedIceMesh(
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
    this.contents.add(this.ice, this.lootGroup);
    this.assembly.add(this.contents);
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
    this.startup.interactiveReady = performance.now();
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
    // Deterministic silhouettes preserve saved reward IDs, values and physics.
    const [batch, item] = t.id.split('-').map(Number);
    const variant = t.variant ?? (batch + item) % 3;
    const silver = new THREE.MeshStandardMaterial({
      color: 0xc5d9df,
      metalness: 0.88,
      roughness: 0.23,
    });
    const enamel = new THREE.MeshStandardMaterial({
      color: 0x285968,
      metalness: 0.35,
      roughness: 0.28,
    });
    if (t.story === 'ring') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(t.d * 0.32, t.d * 0.07, 10, 32),
        silver,
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
    } else if (t.story) {
      const color =
        t.story === 'hold'
          ? 0x9d4438
          : t.story === 'ledger'
            ? 0x526468
            : 0x9b9e91;
      const mat = new THREE.MeshStandardMaterial({
        color,
        metalness: 0.6,
        roughness: 0.45,
      });
      g.add(this.box(t.w, t.h, t.d, mat, 0, 0, 0, 0.04));
      const label = this.label(
        t.story === 'tag'
          ? 'AP-7C-114'
          : t.story === 'ledger'
            ? 'FREEZE LEDGER'
            : t.story === 'log'
              ? 'EXCEPTION 7C'
              : t.story === 'access'
                ? 'SUBLEVEL B'
                : 'DO NOT RELEASE',
        512,
        128,
        '#ecdfb7',
        '#334246',
        36,
      );
      label.rotation.x = -Math.PI / 2;
      label.position.y = t.h / 2 + 0.015;
      label.scale.set(t.w * 0.92, t.d * 0.7, 1);
      g.add(label);
      if (t.story === 'ledger')
        for (const x of [-0.4, 0.4])
          g.add(
            this.box(t.w * 0.09, t.h + 0.025, t.d, gold, t.w * x, 0, 0, 0.01),
          );
    } else if (variant >= 3) {
      if (t.kind === 'coin' && variant === 4) {
        g.add(this.box(t.w, t.h, t.d * 0.65, silver, 0, 0, 0, 0.04));
        g.add(
          this.box(t.w * 0.6, 0.018, t.d * 0.35, enamel, 0, t.h / 2, 0, 0.01),
        );
      } else if (t.kind === 'coin' && variant === 5) {
        const medal = new THREE.Mesh(
          new THREE.CylinderGeometry(t.w * 0.32, t.w * 0.32, t.h, 24),
          gold,
        );
        medal.position.z = t.d * 0.15;
        g.add(
          medal,
          this.box(
            t.w * 0.38,
            t.h * 0.3,
            t.d * 0.7,
            enamel,
            0,
            0,
            -t.d * 0.25,
            0.01,
          ),
        );
      } else if (t.kind === 'coin') {
        for (let i = 0; i < 4; i++) {
          const roll = new THREE.Mesh(
            new THREE.CylinderGeometry(t.d * 0.25, t.d * 0.25, t.h * 0.55, 16),
            silver,
          );
          roll.position.set(
            ((i % 2) - 0.5) * t.w * 0.45,
            Math.floor(i / 2) * t.h * 0.4,
            0,
          );
          g.add(roll);
        }
      } else if (t.kind === 'cash' && variant === 4) {
        g.add(this.box(t.w, t.h, t.d, enamel, 0, 0, 0, 0.025));
        for (let i = 0; i < 4; i++)
          g.add(
            this.box(
              t.w * 0.82,
              t.h * 0.07,
              t.d * 0.8,
              silver,
              i * 0.018,
              t.h * (0.22 + i * 0.1),
              0,
              0.005,
            ),
          );
        g.add(
          this.box(t.w * 0.45, t.h * 0.35, 0.025, gold, 0, 0, t.d / 2, 0.01),
        );
      } else if (t.kind === 'cash' && variant === 5) {
        g.add(this.box(t.w, t.h * 0.35, t.d, silver, 0, 0, 0, 0.015));
        g.add(
          this.box(t.w * 0.13, t.h * 0.4, t.d, enamel, -t.w * 0.2, 0, 0, 0.01),
        );
        const seal = new THREE.Mesh(
          new THREE.CylinderGeometry(t.d * 0.18, t.d * 0.18, t.h * 0.18, 12),
          gold,
        );
        seal.position.set(t.w * 0.2, t.h * 0.25, t.d * 0.15);
        g.add(seal);
      } else if (t.kind === 'cash') {
        g.add(this.box(t.w, t.h, t.d, enamel, 0, 0, 0, 0.04));
        g.add(
          this.box(
            t.w * 0.8,
            t.h * 0.15,
            t.d * 0.75,
            silver,
            0,
            t.h * 0.5,
            0,
            0.02,
          ),
        );
        for (const x of [-0.25, 0.25])
          g.add(
            this.box(t.w * 0.1, t.h + 0.02, t.d, gold, x * t.w, 0, 0, 0.01),
          );
        const jewel = new THREE.Mesh(
          new THREE.OctahedronGeometry(t.d * 0.22),
          gold,
        );
        jewel.position.y = t.h * 0.65;
        g.add(jewel);
      } else if (variant === 4) {
        g.add(this.box(t.w, t.h * 0.4, t.d, enamel, 0, -t.h * 0.2, 0, 0.04));
        for (const x of [-0.25, 0, 0.25]) {
          const jewel = new THREE.Mesh(
            new THREE.OctahedronGeometry(t.d * 0.18),
            x ? silver : gold,
          );
          jewel.position.set(x * t.w, t.h * 0.25, 0);
          g.add(jewel);
        }
      } else if (variant === 5) {
        g.add(this.box(t.w, t.h, t.d, enamel, 0, 0, 0, 0.035));
        for (const x of [-0.4, 0.4])
          g.add(
            this.box(t.w * 0.12, t.h * 1.1, t.d, gold, x * t.w, 0, 0, 0.01),
          );
        g.add(
          this.box(t.w * 0.45, t.h * 0.25, 0.025, silver, 0, 0, t.d / 2, 0.005),
        );
      } else {
        for (let i = 0; i < 3; i++)
          g.add(
            this.box(
              t.w * 0.7,
              t.h * 0.3,
              t.d * 0.6,
              gold,
              ((i % 2) - 0.5) * t.w * 0.15,
              -t.h * 0.3 + i * t.h * 0.3,
              0,
              0.03,
            ),
          );
      }
    } else if (variant === 1 && t.kind === 'coin') {
      const token = new THREE.Mesh(
        new THREE.CylinderGeometry(t.w / 2, t.w / 2, t.h, 6),
        silver,
      );
      g.add(token);
      const seal = new THREE.Mesh(
        new THREE.CylinderGeometry(t.w * 0.3, t.w * 0.3, t.h + 0.02, 6),
        enamel,
      );
      g.add(seal);
      g.add(
        this.box(t.w * 0.08, t.h + 0.04, t.d * 0.45, silver, 0, 0, 0, 0.01),
      );
    } else if (variant === 2 && t.kind === 'coin') {
      const washer = new THREE.Mesh(
        new THREE.TorusGeometry(t.w * 0.33, t.w * 0.12, 8, 24),
        silver,
      );
      washer.rotation.x = Math.PI / 2;
      washer.scale.z = t.h / (t.w * 0.24);
      g.add(washer);
      for (let i = 0; i < 4; i++)
        g.add(
          this.box(
            t.w * 0.12,
            t.h,
            t.d * 0.12,
            gold,
            Math.cos((i * Math.PI) / 2) * t.w * 0.34,
            0,
            Math.sin((i * Math.PI) / 2) * t.d * 0.34,
            0.01,
          ),
        );
    } else if (variant === 1 && t.kind === 'cash') {
      const paper = new THREE.MeshStandardMaterial({
        color: 0xd2b98d,
        roughness: 0.95,
      });
      g.add(this.box(t.w, t.h * 0.55, t.d, paper, 0, 0, 0, 0.025));
      const flap = this.box(
        t.w * 0.65,
        t.h * 0.15,
        t.d * 0.6,
        paper,
        0,
        t.h * 0.35,
        0,
        0.015,
      );
      flap.rotation.y = 0.32;
      g.add(flap);
      const seal = new THREE.Mesh(
        new THREE.CylinderGeometry(t.d * 0.16, t.d * 0.17, t.h * 0.25, 12),
        new THREE.MeshStandardMaterial({ color: 0x9d483a, roughness: 0.6 }),
      );
      seal.position.y = t.h * 0.48;
      g.add(seal);
    } else if (variant === 2 && t.kind === 'cash') {
      const paper = new THREE.MeshStandardMaterial({
        color: 0xd8ded0,
        roughness: 0.9,
      });
      const roll = new THREE.Mesh(
        new THREE.CylinderGeometry(t.h * 0.48, t.h * 0.48, t.w, 20),
        paper,
      );
      roll.rotation.z = Math.PI / 2;
      g.add(roll);
      const strap = new THREE.Mesh(
        new THREE.CylinderGeometry(t.h * 0.52, t.h * 0.52, t.w * 0.14, 20),
        enamel,
      );
      strap.rotation.z = Math.PI / 2;
      g.add(strap);
    } else if (variant === 1 && t.kind === 'gold') {
      g.add(this.box(t.w * 0.8, t.h * 0.35, t.d * 0.46, gold, 0, 0, 0, 0.07));
      const watch = new THREE.Mesh(
        new THREE.CylinderGeometry(t.d * 0.46, t.d * 0.46, t.h * 0.7, 32),
        gold,
      );
      watch.position.y = t.h * 0.15;
      g.add(watch);
      const dial = new THREE.Mesh(
        new THREE.CylinderGeometry(t.d * 0.36, t.d * 0.36, 0.025, 32),
        enamel,
      );
      dial.position.y = t.h * 0.52;
      g.add(dial);
      g.add(this.box(0.035, 0.03, t.d * 0.48, gold, 0, t.h * 0.55, 0, 0.005));
      g.add(
        this.box(
          t.d * 0.28,
          0.03,
          0.035,
          gold,
          t.d * 0.1,
          t.h * 0.56,
          0,
          0.005,
        ),
      );
    } else if (variant === 2 && t.kind === 'gold') {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(t.d * 0.31, t.d * 0.085, 10, 32),
        gold,
      );
      ring.rotation.x = Math.PI / 2;
      g.add(ring);
      const gem = new THREE.Mesh(
        new THREE.OctahedronGeometry(t.h * 0.48),
        new THREE.MeshStandardMaterial({
          color: 0x96e5e9,
          metalness: 0.5,
          roughness: 0.12,
          emissive: 0x194a50,
          emissiveIntensity: 0.3,
        }),
      );
      gem.position.set(0, t.h * 0.27, -t.d * 0.28);
      g.add(gem);
    } else if (t.kind === 'coin') {
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
    g.userData.contactSamples = meshContactSamples(
      g,
      this.model.field.grid.cellSize / 4,
    );
    g.position.set(t.x, t.y, t.z);
    g.rotation.y = t.kind === 'coin' ? 0.1 : -0.12 + t.x * 0.05;
    this.lootGroup.add(g);
    this.lootMeshes.set(t.id, g);
  }
  syncField() {
    const meshStarted = performance.now();
    const delivered = this.oldField !== this.model.field;
    if (delivered) {
      const inner =
        !!this.oldField?.spec &&
        this.oldField.spec.deliveryId === this.model.field.spec?.deliveryId &&
        this.oldField.spec.phaseId !== this.model.field.spec?.phaseId;
      if (inner && !this.model.settings?.reducedMotion) {
        for (const chunk of this.ice.chunkMeshes.values()) {
          if (!chunk.geometry.getAttribute('position')?.count) continue;
          const material = new THREE.MeshPhysicalMaterial({
            color: 0xabc4ca,
            transparent: true,
            opacity: 0.24,
            roughness: 0.55,
            depthWrite: false,
          });
          const mesh = new THREE.Mesh(chunk.geometry.clone(), material);
          const center =
            chunk.geometry.boundingSphere?.center ?? new THREE.Vector3();
          this.contents.add(mesh);
          this.phaseShells.push({
            mesh,
            age: 0,
            direction: new THREE.Vector3(
              Math.sign(center.x) * 0.8,
              -1,
              Math.sign(center.z) * 0.45,
            ),
          });
        }
      }
      for (const g of this.lootMeshes.values()) this.disposeObject(g);
      this.lootGroup.clear();
      this.lootMeshes.clear();
      this.clearParticles();
      this.oldField = this.model.field;
      this.ice.setField(this.model.field);
      this.deliver(inner);
      for (const t of this.model.loot)
        if (t.state !== 'collected') this.makeLoot(t);
    }
    this.ice.rebuild(
      2.5,
      this.model.firing ? this.localHit : undefined,
      this.contents.worldToLocal(this.scratch.copy(this.camera.position)),
    );
    this.meshTimings.push(performance.now() - meshStarted);
    if (this.meshTimings.length > 300) this.meshTimings.shift();
    // A visible cavity is distinct from physically freeing its supported find.
    for (const t of this.model.loot) {
      const g = this.lootMeshes.get(t.id);
      if (!g || t.state !== 'embedded' || g.userData.revealedAt) continue;
      this.contents.localToWorld(this.revealPoint.set(t.x, t.y, t.z));
      this.revealScreen.copy(this.revealPoint).project(this.camera);
      this.revealNdc.set(this.revealScreen.x, this.revealScreen.y);
      this.revealRay.setFromCamera(this.revealNdc, this.camera);
      const front = this.revealRay.intersectObject(this.ice, false)[0];
      if (
        !front ||
        front.distance >
          this.revealRay.ray.origin.distanceTo(this.revealPoint) -
            Math.min(t.w, t.h) * 0.45
      )
        g.userData.revealedAt = performance.now() / 1000;
    }
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
      shader.uniforms.impactPoint = this.iceImpact.point;
      shader.uniforms.impactAge = this.iceImpact.age;
      shader.uniforms.impactStrength = this.iceImpact.strength;
      shader.vertexShader =
        'varying vec3 vIcePoint;\nvarying vec3 vIceNormal;\n' +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvIcePoint = position; vIceNormal = normal;',
      );
      shader.fragmentShader =
        'uniform vec3 impactPoint; uniform float impactAge; uniform float impactStrength; varying vec3 vIcePoint;\nvarying vec3 vIceNormal;\n' +
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
          'float contact = exp(-dot(p-impactPoint,p-impactPoint)*24.0)*exp(-impactAge*27.0)*impactStrength; diffuseColor.rgb += vec3(.10,.15,.16)*contact; diffuseColor.a *= .89 + cloud*.045 + pore*.04;',
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
        (this.model.paused && !this.model.phoneRinging) ||
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
      if (
        ev.button === 0 &&
        this.raycaster.intersectObject(this.workshop.files, true).length
      ) {
        this.cancelInput();
        this.onOpenFiles();
        return;
      }
      if (
        ev.button === 0 &&
        this.raycaster.intersectObject(this.workshop.phone, true).length
      ) {
        this.cancelInput();
        const key = this.raycaster.intersectObject(
          this.workshop.keypad,
          true,
        )[0];
        if (this.model.dialing && key) {
          let o: THREE.Object3D | null = key.object;
          while (o && !o.userData.digit) o = o.parent;
          if (o?.userData.digit) {
            this.onDialKey(o.userData.digit);
          }
        } else this.onOpenPhone();
        return;
      }
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
        if (!this.startup.firstInput)
          this.startup.firstInput = performance.now();
        this.model.press();
      }
    }) as EventListener);
    on(window, 'pointerup', ((ev: PointerEvent) => {
      if (this.pointerId !== null && ev.pointerId !== this.pointerId) return;
      if (this.gesture === 'rotate') {
        this.turntable.end();
        this.model.stop();
      } else if (!this.model.toggle) {
        if (this.model.release) this.model.release();
        else this.model.stop();
      }
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
    // Fit the delivered solid, not the distant desk props. Cache its original
    // bounds so chipping never causes a distracting zoom into the leftovers.
    const bounds = this.ice.userData.deliveryBounds as THREE.Box3 | undefined;
    const empty = this.model.inTutorial && this.model.tutorial?.block === 0;
    if (bounds && !empty) {
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) sample(x, y, z);
    } else {
      sample(-5.8, 0, -4.7);
      sample(5.8, 2, 4.1);
    }
    const chapter = this.model.chapter ?? 1;
    const widthTarget = empty
      ? 0.85
      : this.model.inTutorial
        ? 0.52
        : chapter <= 2
          ? 0.57
          : chapter <= 4
            ? 0.64
            : 0.72;
    const heightTarget = this.model.inTutorial
      ? 0.48
      : chapter >= 4
        ? 0.82
        : 0.72;
    const span = Math.max(
      (maxX - minX) / (2 * a * widthTarget),
      (maxY - minY) / (2 * heightTarget),
    );
    const x = (minX + maxX) / 2;
    // Keep the upper work area steady when a call opens beneath it.
    const y = (minY + maxY) / 2 + span * (this.model.inTutorial ? -0.16 : 0.08);
    const blend = 1 - Math.exp(-4.5 * dt);
    this.framing.span += (span - this.framing.span) * blend;
    this.framing.x += (x - this.framing.x) * blend;
    this.framing.y += (y - this.framing.y) * blend;
    // Orthographic distance never changes: zoom cannot move the camera into a
    // tool or block. A projected-size guard keeps the complete solid usable.
    const safeRatio = Math.min(
      (this.framing.span * 2 * 0.86) / Math.max(0.01, maxY - minY),
      (this.framing.span * 2 * a * 0.87) / Math.max(0.01, maxX - minX),
    );
    this.cameraZoom.target = Math.min(
      safeRatio,
      2 ** (((this.model.settings?.gameplayZoom ?? 0.5) - 0.5) * 0.75),
    );
    this.cameraZoom.step(dt, this.model.settings?.reducedMotion);
    const introSpan =
      (this.framing.span / Math.max(0.65, this.cameraZoom.value)) *
      (1 + this.entry.value * 0.13);
    this.camera.left = this.framing.x - introSpan * a;
    this.camera.right = this.framing.x + introSpan * a;
    this.camera.top = this.framing.y + introSpan;
    this.camera.bottom = this.framing.y - introSpan;
    this.camera.updateProjectionMatrix();
  }
  burst(p: Vec3, count: number, fragment = false) {
    if (this.model.reducedParticles && !fragment) return;
    const epsilon = 0.06,
      density = this.model.field.density.bind(this.model.field);
    const normal = new THREE.Vector3(
      density({ x: p.x - epsilon, y: p.y, z: p.z }) -
        density({ x: p.x + epsilon, y: p.y, z: p.z }),
      density({ x: p.x, y: p.y - epsilon, z: p.z }) -
        density({ x: p.x, y: p.y + epsilon, z: p.z }),
      density({ x: p.x, y: p.y, z: p.z - epsilon }) -
        density({ x: p.x, y: p.y, z: p.z + epsilon }),
    ).normalize();
    for (
      let i = 0;
      i < count && this.particles.length < TUNE.particleCap;
      i++
    ) {
      const reused = this.particlePool.pop();
      const mesh =
        reused?.mesh ??
        new THREE.Mesh(
          fragment ? this.fragmentGeometry : this.vaporGeometry,
          new THREE.MeshStandardMaterial({
            color: fragment ? 0xb3e3ea : 0xdcf7f8,
            transparent: true,
            opacity: fragment ? 0.72 : 0.5,
            roughness: 0.3,
          }),
        );
      mesh.geometry = fragment ? this.fragmentGeometry : this.vaporGeometry;
      (mesh.material as THREE.MeshStandardMaterial).opacity = fragment
        ? 0.72
        : this.model.thermal === false
          ? 0.18
          : 0.5;
      (mesh.material as THREE.MeshStandardMaterial).color.setHex(
        fragment ? 0xb3e3ea : 0xdcf7f8,
      );
      mesh.position.copy(p);
      mesh.userData.detached = fragment && count === 1;
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
      if (mesh.userData.detached) mesh.scale.multiplyScalar(1.7);
      this.contents.add(mesh);
      this.particles.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 1.3 * size,
          (fragment ? 0.4 : 1) * size,
          (Math.random() - 0.5) * 1.2 * size,
        ).addScaledVector(normal, fragment ? 0.65 : 0.2),
        age: 0,
        duration: mesh.userData.detached ? 0.9 : fragment ? 0.65 : 0.38,
        fragment,
      });
    }
  }
  frame = (now: number) => {
    if (this.destroyed || this.frameError) return;
    try {
      this.runFrame(now);
    } catch (error) {
      const failure = error instanceof Error ? error : new Error(String(error));
      this.frameError = {
        message: failure.message,
        stack: failure.stack,
        phase: this.model.phase,
        gridSamples: this.model.field.values.length,
        tool: this.model.toolId,
      };
      this.cancelInput();
      cancelAnimationFrame(this.animation);
      console.error('Frozen Assets frame stopped safely', this.frameError);
      const notice = document.createElement('div');
      notice.className = 'frame-failure';
      notice.setAttribute('role', 'alert');
      notice.textContent =
        'The bench stopped unexpectedly. Reload to resume your last recovery.';
      this.host.appendChild(notice);
      this.disposables.push(() => notice.remove());
    }
  };
  private runFrame = (now: number) => {
    if (document.hidden) {
      this.last = now;
      this.animation = requestAnimationFrame(this.frame);
      return;
    }
    const start = performance.now(),
      rawDt = this.last ? (now - this.last) / 1000 : 1 / 60;
    this.last = now;
    const dt = Math.min(rawDt, 0.033);
    for (let i = this.phaseShells.length - 1; i >= 0; i--) {
      const shell = this.phaseShells[i];
      shell.age += dt;
      shell.mesh.position.addScaledVector(
        shell.direction,
        dt * (1 + shell.age * 3),
      );
      (shell.mesh.material as THREE.MeshPhysicalMaterial).opacity = Math.max(
        0,
        0.24 * (1 - shell.age / 0.75),
      );
      if (shell.age >= 0.75) {
        shell.mesh.removeFromParent();
        this.resources.disposeGraph(shell.mesh);
        this.phaseShells.splice(i, 1);
      }
    }
    this.model.interactionBusy = this.gesture === 'rotate' || this.messageBusy;
    const scale =
      this.model.inTutorial && this.model.tutorial?.block === 0
        ? 0.54
        : (this.model.campaignScale ?? 1);
    this.deck.scale.set(
      TUNE.trayScale * scale * 1.12,
      Math.min(1.4, scale),
      TUNE.trayScale * scale * 1.05,
    );
    this.pedestal.scale.set(scale, 0.5, scale);
    this.pedestal.position.y = -0.275;
    this.assembly.position.y = -0.3;
    this.workshop.update(
      this.model.chapter ?? 1,
      this.model.campaign?.state.tools ?? ['thermal'],
      this.model.storyObjects ?? [],
      this.model.unread ?? 0,
      now / 1000,
      scale,
      this.model.toolId ?? 'thermal',
      this.model.settings?.reducedMotion,
      this.model.phoneRinging,
      this.model.phoneOffHook,
    );
    if (
      this.model.phoneRinging &&
      (!this.model.paused || this.model.phase === 'completed')
    ) {
      this.ringClock -= dt;
      if (this.ringClock <= 0) {
        this.audio.ring(
          incomingCallPresentation(this.model.campaign?.state.call).ring,
        );
        this.workshop.ring();
        this.ringClock = 4.2;
      }
    } else {
      this.ringClock = 0;
      this.audio.stopRing();
    }
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
    const reduced =
      this.model.settings?.reducedMotion ||
      matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lift = this.delivery.step(rawDt, reduced),
      recoil = this.recoil.step(rawDt, reduced);
    this.entry.step(rawDt, reduced);
    this.air.group.scale.setScalar(scale);
    this.air.update(now / 1000, reduced, this.model.reducedParticles);
    this.audio.room(
      now / 1000,
      this.model.paused || !!this.model.phoneOffHook,
      this.entry.value,
      this.model.campaign?.state.block === 31
        ? (this.model.campaign.state.phase ?? 0)
        : undefined,
    );
    const deliveryFade = this.deliveryFade.step(rawDt, reduced);
    (this.ice.material as THREE.MeshPhysicalMaterial).opacity =
      0.82 * deliveryFade;
    this.contents.position.y = reduced ? 0 : Math.max(0, lift) + recoil * 0.1;
    this.contents.scale.set(
      1 + Math.min(0, lift) * -0.025,
      1 + Math.min(0, lift) * 0.045,
      1 + Math.min(0, lift) * -0.025,
    );
    this.contents.rotation.z = reduced ? 0 : recoil * 0.006;
    this.deck.position.y =
      0.18 * (1 - this.deck.scale.y) + (reduced ? 0 : recoil * 0.035);
    this.workshop.react(reduced ? 0 : recoil);
    if (!this.deliveryLanded && lift <= 0.025) {
      this.deliveryLanded = true;
      this.recoil.kick(-4 * this.deliveryMass);
      this.audio.sound('tray', 0.32 + this.deliveryMass * 0.1);
      for (const x of [-4, 4])
        this.burst({ x, y: 0.25, z: 1 }, Math.ceil(4 * this.deliveryMass));
    }
    this.iceImpact.age.value += dt;
    this.assembly.updateMatrixWorld(true);
    this.fitCamera(dt);
    this.automation?.();
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hit = this.hasPointer
      ? this.raycaster.intersectObject(this.ice, false)[0]
      : undefined;
    const phoneHover =
      this.hasPointer &&
      !this.model.paused &&
      this.raycaster.intersectObject(this.workshop.phone, true).length > 0;
    this.workshop.phoneHovered = phoneHover;
    this.renderer.domElement.dataset.contact = phoneHover
      ? 'phone'
      : hit
        ? 'ice'
        : 'tray';
    this.updatePhoneFocus(phoneHover);
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
        hit ? this.contents.worldToLocal(this.localHit.copy(hit.point)) : null,
      );
      simulationTime -= step;
    }
    this.meshTime += dt;
    if (this.model.field.dirty || this.model.field.dirtyChunks.size) {
      this.syncField();
      this.meshTime = 0;
    }
    const serial = this.model.strikeSerial ?? 0;
    const motion = TOOL_MOTION[this.model.toolId ?? 'thermal'];
    this.swing.stiffness = motion.stiffness;
    this.swing.damping = motion.damping;
    if (serial !== this.previousStrike) {
      this.previousStrike = serial;
      this.swing.velocity = Math.max(
        -24,
        this.swing.velocity - (13.8 + motion.weight * 13.8),
      );
      this.recoil.kick(-0.28 - motion.weight * 0.72);
      this.iceImpact.point.value.copy(
        this.model.strike?.point ?? this.localHit,
      );
      this.iceImpact.age.value = 0;
      this.iceImpact.strength.value = reduced ? 0.15 : 0.4 + motion.weight;
    }
    this.swing.step(rawDt, reduced);
    const firing =
      this.model.firing && !this.model.paused && this.model.fuel > 0;
    this.contactAge = firing && hit ? this.contactAge + dt : 0;
    this.crackClock += dt;
    if (
      firing &&
      this.model.thermal !== false &&
      hit &&
      this.crackClock > 0.32 + Math.random() * 0.16
    ) {
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
    this.flameFlow.target = firing && this.model.thermal !== false ? 1 : 0;
    const flow = Math.max(0, this.flameFlow.step(rawDt, reduced));
    const tip = this.torch.localToWorld(new THREE.Vector3(0, 0, -0.46));
    for (const flame of [this.flame, this.core]) {
      flame.visible = flow > 0.005 && !this.model.paused;
      flame.position.copy(tip);
      const dir = this.aim.clone().sub(tip);
      flame.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, -1, 0),
        dir.clone().normalize(),
      );
      flame.scale.set(
        (this.model.mode === 'wide' ? 1.7 : 1) * flow,
        dir.length() * flow,
        (this.model.mode === 'wide' ? 1.7 : 1) * flow,
      );
    }
    const toolVisible =
      this.hasPointer &&
      (!!hit ||
        this.model.firing ||
        this.model.strike?.active ||
        this.swing.moving) &&
      !this.rotateMode &&
      this.gesture !== 'rotate' &&
      !this.model.paused;
    this.toolPresence.target = toolVisible ? 1 : 0;
    const presence = Math.max(0, this.toolPresence.step(rawDt, reduced));
    this.torch.visible = presence > 0.005 && this.model.thermal !== false;
    this.torch.scale.setScalar(Math.max(0.001, presence));
    this.workshop.hand.visible =
      presence > 0.005 && this.model.thermal === false;
    const follower = this.toolFollow;
    if (this.model.strike?.active)
      this.aim.copy(
        this.contents.localToWorld(this.localHit.copy(this.model.strike.point)),
      );
    follower.targetPosition.copy(this.aim);
    if (hit?.face)
      follower.targetNormal
        .copy(hit.face.normal)
        .transformDirection(this.ice.matrixWorld);
    const pointerSpeed =
      (this.pointer.distanceTo(this.lastToolPointer) * this.host.clientWidth) /
      Math.max(0.001, dt);
    this.lastToolPointer.copy(this.pointer);
    follower.followPosition(dt, pointerSpeed);
    this.toolOut.copy(follower.smoothedNormal);
    follower.orient(this.camera.position);
    const toolScale = Math.min(
      1.2,
      Math.max(0.38, Math.sqrt(this.model.campaignScale ?? 1)),
    );
    this.guardScale.setScalar(toolScale);
    // Solve clearance on the target pose, then smooth toward it. Topology never
    // rotates the displayed mesh directly, and the contact tip remains the pivot.
    if (hit && this.model.thermal === false) {
      for (let attempt = 0; attempt < 6; attempt++) {
        this.guardMatrix.compose(
          follower.targetPosition,
          follower.targetRotation,
          this.guardScale,
        );
        let blocked = false;
        for (const z of [0.45, 0.8, 1.2, 1.65]) {
          this.toolGuard.set(0, 0.2, z).applyMatrix4(this.guardMatrix);
          this.contents.worldToLocal(this.toolGuard);
          if (this.model.field.density(this.toolGuard) > 0.35) {
            blocked = true;
            break;
          }
        }
        if (!blocked) break;
        follower.targetRotation.multiply(
          this.toolRoll.setFromAxisAngle(this.toolAxis, -0.12),
        );
      }
    }
    follower.guardHemisphere();
    follower.followRotation(dt);
    const pose = strikePose(
      this.model.strike?.active ? this.model.strike.progress : 1,
      this.model.toolId === 'hand' || this.model.toolId === 'grip',
      this.model.toolId,
    );
    if (this.model.toolId === 'sledge' && (this.model.chargeTime ?? 0) > 0) {
      const charge = Math.min(1, this.model.chargeTime! / 0.65);
      pose.lift = 0.15 + charge * 0.85;
      pose.angle = 0.2 + charge * 0.8;
    }
    const liftAmount = reduced ? pose.lift * 0.15 : pose.lift * motion.lift;
    this.workshop.hand.position
      .copy(follower.displayPosition)
      .addScaledVector(this.toolOut, liftAmount);
    this.workshop.hand.quaternion
      .copy(follower.displayRotation)
      .multiply(
        this.toolRoll.setFromAxisAngle(
          this.toolAxis,
          -pose.angle * motion.recoil * (reduced ? 0.1 : 1),
        ),
      );
    this.workshop.hand.scale.setScalar(toolScale * presence);
    const bit = this.workshop.hand.getObjectByName('working-bit');
    if (bit)
      bit.position.z =
        bit.userData.restZ +
        (firing && !reduced ? Math.max(0, Math.sin(now * 0.135)) * 0.025 : 0);
    const hose = this.workshop.hand.getObjectByName('thermal-hose');
    if (hose)
      hose.quaternion.setFromAxisAngle(
        this.toolAxis,
        reduced
          ? 0
          : Math.sin(now * 0.004) * 0.012 +
              Math.min(pointerSpeed / 20000, 0.025),
      );
    if (this.model.toolId === 'breaker' && firing && !reduced) {
      const steady = this.model.fittings?.steadiness ?? 1;
      this.workshop.hand.position.addScaledVector(
        this.toolOut,
        Math.sin(now * 0.135) * 0.018 * steady,
      );
      this.workshop.hand.quaternion.multiply(
        this.toolRoll.setFromAxisAngle(
          this.toolOut,
          Math.sin(now * 0.089) * 0.012 * steady,
        ),
      );
    }
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
        (this.model.thermal === false
          ? 0.45 *
            (1 -
              0.28 *
                Math.max(0, 1 - (this.model.strikePulse ?? 0) / 0.22) *
                ((this.model.strikePulse ?? 0) > 0 ? 1 : 0))
          : firing
            ? 1.2 + Math.sin(this.contactAge * 30) * 0.1
            : 0.45) * (this.model.mode === 'wide' ? 2.8 : 1.8),
      );
      (this.contact.material as THREE.MeshBasicMaterial).opacity = firing
        ? 0.2
        : 0.12;
    }
    this.heatLight.position.copy(this.aim);
    this.heatLight.intensity = flow * 0.35;
    this.audio.fire(
      firing && this.model.thermal !== false,
      !!hit,
      this.model.mode === 'wide',
    );
    if (
      firing &&
      this.model.thermal !== false &&
      hit &&
      Math.random() < dt * 14
    )
      this.burst(this.contents.worldToLocal(this.localHit.copy(hit.point)), 1);
    for (const t of this.model.loot) {
      const g = this.lootMeshes.get(t.id);
      if (!g) continue;
      if (t.state === 'collected') {
        g.visible = false;
        continue;
      }
      g.position.set(t.x, t.y, t.z);
      g.scale.setScalar(1);
      g.rotation.set(0, 0, 0);
      const valueWeight = Math.min(1.5, 0.65 + t.value / 1200);
      if (t.state === 'embedded') {
        const distance = g.position.distanceTo(this.iceImpact.point.value);
        const shiver =
          (Math.sin(this.iceImpact.age.value * 45 + distance) *
            Math.exp(-this.iceImpact.age.value * 9)) /
          (1 + distance);
        if (!reduced) {
          g.rotation.z = shiver * 0.025;
          g.position.x += shiver * 0.015;
        }
        if (g.userData.revealedAt && !reduced) {
          const revealAge = Math.max(0, now / 1000 - g.userData.revealedAt);
          const reveal = Math.sin(revealAge * 24) * Math.exp(-revealAge * 9);
          g.scale.setScalar(1 + reveal * 0.055);
          g.rotation.z += reveal * 0.035;
        }
      }
      if (t.state === 'freed' && !reduced) {
        const breakaway =
          Math.sin(Math.min(1, t.age / 0.16) * Math.PI) * Math.exp(-t.age * 9);
        g.scale.set(
          1 + breakaway * 0.12,
          1 - breakaway * 0.13,
          1 + breakaway * 0.06,
        );
        g.rotation.z =
          Math.sin(t.age * 13) *
          (t.kind === 'cash' ? 0.23 : t.kind === 'gold' ? 0.045 : 0.15);
        g.rotation.y = t.age * (t.kind === 'coin' ? 4 : 0.7);
      }
      if (t.state === 'collecting') {
        const f = Math.min(1, t.age / TUNE.collectionTime),
          e = f * f * (3 - 2 * f);
        if (!g.userData.recoveryPath)
          g.userData.recoveryPath = this.collectionPath(t);
        const path = g.userData.recoveryPath as THREE.Vector3[];
        const segment = e * (path.length - 1),
          index = Math.min(path.length - 2, Math.floor(segment));
        g.position.copy(path[index]).lerp(path[index + 1], segment - index);
        const shrink = Math.max(0.001, 1 - Math.max(0, (e - 0.72) / 0.28) ** 2);
        g.scale.set(
          shrink * (1 + Math.sin(f * Math.PI) * 0.14),
          shrink,
          shrink,
        );
        if (!reduced)
          g.rotation.z =
            Math.sin(f * Math.PI) * (t.kind === 'cash' ? 0.12 : 0.05);
      }
      if (t.state === 'landed') {
        const frequency = t.kind === 'gold' ? 23 : t.kind === 'cash' ? 33 : 40;
        const bounce = reduced
          ? 0
          : Math.sin(t.age * frequency) * Math.exp(-t.age * 13) * valueWeight;
        g.rotation.z = bounce * (t.kind === 'cash' ? 0.07 : 0.18);
        g.position.y += Math.abs(bounce) * (t.kind === 'gold' ? 0.13 : 0.07);
        const softness =
          t.kind === 'cash' ? 0.19 : t.kind === 'gold' ? 0.035 : 0.065;
        g.scale.set(
          1 + bounce * softness,
          1 - bounce * softness * 1.4,
          1 + bounce * softness,
        );
      }
    }
    if (!this.model.paused)
      for (let i = this.particles.length - 1; i >= 0; i--) {
        const p = this.particles[i];
        p.age += dt;
        const hanging = p.mesh.userData.detached && p.age < 0.12;
        p.velocity.y -= dt * (hanging ? 1.2 : p.fragment ? 10 : 3);
        if (hanging) p.mesh.rotation.z = Math.sin(p.age * 65) * 0.12;
        p.mesh.position.addScaledVector(p.velocity, dt);
        if (p.fragment) p.mesh.rotation.x += dt * 3;
        p.mesh.position.y = Math.max(0.18, p.mesh.position.y);
        (p.mesh.material as THREE.MeshStandardMaterial).opacity *= Math.exp(
          -dt * 2,
        );
        if (p.age > p.duration) {
          this.contents.remove(p.mesh);
          this.particlePool.push(p);
          this.particles.splice(i, 1);
        }
      }
    this.renderer.render(this.scene, this.camera);
    if (!this.startup.firstRender) this.startup.firstRender = performance.now();
    if (!this.startup.firstStrike && (this.model.strikePulse ?? 0) > 0)
      this.startup.firstStrike = performance.now();
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
    const direction = new THREE.Vector3(-t.x, 0, 2 * this.deck.scale.z - t.z),
      distance = direction.length();
    direction.normalize().transformDirection(this.contents.matrixWorld);
    let limit = 1;
    const probe = new THREE.Raycaster(undefined, direction, 0, distance);
    for (const x of [-t.w * 0.5, 0, t.w * 0.5])
      for (const z of [-t.d * 0.5, t.d * 0.5])
        for (const y of [t.y, t.y + t.h * 0.5]) {
          this.contents.localToWorld(probe.ray.origin.set(t.x + x, y, t.z + z));
          const hit = probe.intersectObject(this.ice, false)[0];
          if (hit)
            limit = Math.min(
              limit,
              Math.max(0, (hit.distance - 0.06) / distance),
            );
        }
    return limit;
  }
  collectionPath(t: Loot) {
    // The tray's shallow lanes guide loose finds around remaining ice. A small
    // footprint search prevents a rear find from sliding straight through it.
    const cols = 31,
      rows = 23,
      halfX = 3.32 * this.deck.scale.x,
      halfZ = 2.2 * this.deck.scale.z;
    const point = (x: number, z: number) =>
      new THREE.Vector3(
        ((x / (cols - 1)) * 2 - 1) * halfX,
        t.y,
        ((z / (rows - 1)) * 2 - 1) * halfZ,
      );
    const sx = Math.max(
        0,
        Math.min(cols - 1, Math.round((t.x / halfX + 1) * 0.5 * (cols - 1))),
      ),
      sz = Math.max(
        0,
        Math.min(rows - 1, Math.round((t.z / halfZ + 1) * 0.5 * (rows - 1))),
      );
    const start = sz * cols + sx,
      previous = new Int32Array(cols * rows).fill(-1),
      queue = [start];
    previous[start] = start;
    let end = -1;
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i],
        x = cell % cols,
        z = Math.floor(cell / cols);
      if (z === rows - 1) {
        end = cell;
        break;
      }
      for (const [dx, dz] of [
        [0, 1],
        [-1, 0],
        [1, 0],
        [0, -1],
      ]) {
        const nx = x + dx,
          nz = z + dz,
          next = nz * cols + nx;
        if (
          nx < 0 ||
          nx >= cols ||
          nz < 0 ||
          nz >= rows ||
          previous[next] !== -1
        )
          continue;
        const p = point(nx, nz);
        let blocked = false;
        for (const ox of [-t.w * 0.48, 0, t.w * 0.48])
          for (const oz of [-t.d * 0.48, 0, t.d * 0.48])
            if (
              this.model.field.density({
                x: p.x + ox,
                y: p.y + t.h * 0.35,
                z: p.z + oz,
              }) > 0.42
            )
              blocked = true;
        if (!blocked) {
          previous[next] = cell;
          queue.push(next);
        }
      }
    }
    if (end < 0) {
      const limit = this.collectionLimit(t);
      return [
        new THREE.Vector3(t.x, t.y, t.z),
        new THREE.Vector3(
          t.x * (1 - limit),
          t.y - 0.08,
          t.z + (2 * this.deck.scale.z - t.z) * limit,
        ),
      ];
    }
    const path: THREE.Vector3[] = [];
    for (let cell = end; cell !== start; cell = previous[cell])
      path.push(point(cell % cols, Math.floor(cell / cols)));
    path.push(new THREE.Vector3(t.x, t.y, t.z));
    path.reverse();
    path.push(new THREE.Vector3(0, t.y - 0.08, halfZ));
    return path;
  }
  phoneOrigin() {
    const p = this.workshop.phone
      .getWorldPosition(this.scratch)
      .project(this.camera);
    const r = this.host.getBoundingClientRect();
    document.documentElement.style.setProperty(
      '--phone-x',
      `${r.left + ((p.x + 1) * r.width) / 2}px`,
    );
    document.documentElement.style.setProperty(
      '--phone-y',
      `${r.top + ((1 - p.y) * r.height) / 2}px`,
    );
    this.workshop.buzzUntil = performance.now() / 1000 + 0.45;
  }
  updatePhoneFocus(hover: boolean) {
    const ringing = !!this.model.phoneRinging;
    const f = this.phoneFocus;
    const p = this.workshop.phone
      .getWorldPosition(this.scratch)
      .project(this.camera);
    const distance = this.pointer.distanceTo(new THREE.Vector2(p.x, p.y));
    if (ringing && !f.ringing) {
      f.released = false;
      f.distance = distance;
    }
    if (
      hover ||
      this.model.phoneOffHook ||
      (this.hasPointer && distance < Math.min(0.3, f.distance * 0.6))
    )
      f.released = true;
    f.ringing = ringing;
    const shell = this.host.parentElement;
    if (shell) {
      shell.style.setProperty('--phone-focus-x', `${(p.x + 1) * 50}%`);
      shell.style.setProperty('--phone-focus-y', `${(1 - p.y) * 50}%`);
      shell.style.setProperty(
        '--phone-focus-opacity',
        String(
          ringing && !f.released && !this.model.paused
            ? this.model.inTutorial
              ? 0.15
              : (this.model.chapter ?? 1) <= 1
                ? 0.12
                : (this.model.chapter ?? 1) === 2
                  ? 0.08
                  : 0
            : 0,
        ),
      );
    }
  }
  deliver(inner = false) {
    this.deliveryMass = THREE.MathUtils.clamp(
      (this.model.campaignScale ?? 1) ** 2,
      0.65,
      1.9,
    );
    const massRoot = Math.sqrt(this.deliveryMass);
    this.delivery.stiffness = 170 / massRoot;
    this.delivery.damping = 17 + (this.deliveryMass - 1) * 1.5;
    this.delivery.set(
      this.model.settings?.reducedMotion ? 0 : inner ? 0.1 : 3.6 * massRoot,
    );
    this.deliveryFade.set(0);
    this.deliveryFade.target = 1;
    this.delivery.target = 0;
    this.deliveryLanded = inner;
    this.swing.set(0);
    this.toolFollow.reset();
    this.flameFlow.set(0);
  }
  enterWorkshop() {
    this.entry.set(this.model.settings?.reducedMotion ? 0 : 1);
    this.entry.target = 0;
    this.workshop.buzzUntil = performance.now() / 1000 + 0.8;
  }
  impact(t: Loot) {
    this.recoil.kick(
      -(t.kind === 'gold' ? 2.1 : t.kind === 'cash' ? 0.35 : 0.75),
    );
  }
  clearParticles() {
    for (const p of this.particles) {
      this.contents.remove(p.mesh);
      this.particlePool.push(p);
    }
    this.particles = [];
  }
  disposeObject(o: THREE.Object3D) {
    this.resources.disposeGraph(o);
  }
  stats() {
    const s = [...this.frames].sort((a, b) => a - b),
      work = [...this.renderTimes].sort((a, b) => a - b);
    const bounds = this.ice.userData.deliveryBounds as THREE.Box3 | undefined;
    const projected = {
      left: Infinity,
      right: -Infinity,
      top: Infinity,
      bottom: -Infinity,
    };
    if (bounds)
      for (const x of [bounds.min.x, bounds.max.x])
        for (const y of [bounds.min.y, bounds.max.y])
          for (const z of [bounds.min.z, bounds.max.z]) {
            const p = this.scratch
              .set(x, y, z)
              .applyMatrix4(this.ice.matrixWorld)
              .project(this.camera);
            projected.left = Math.min(projected.left, (p.x + 1) / 2);
            projected.right = Math.max(projected.right, (p.x + 1) / 2);
            projected.top = Math.min(projected.top, (1 - p.y) / 2);
            projected.bottom = Math.max(projected.bottom, (1 - p.y) / 2);
          }
    return {
      frameError: this.frameError,
      grid: this.model.field.grid,
      materials: this.model.field.materialCounts(),
      chunks: this.ice.stats,
      fieldMetrics: this.model.field.metrics,
      framing: {
        ...projected,
        width: projected.right - projected.left,
        height: projected.bottom - projected.top,
      },
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
      frameP50: s[Math.floor(s.length * 0.5)],
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
      textures: this.renderer.info.memory.textures,
      programs: this.renderer.info.programs?.length ?? 0,
      meshMs: this.meshTimings.at(-1) ?? 0,
      meshMean:
        this.meshTimings.reduce((a, b) => a + b, 0) /
        Math.max(1, this.meshTimings.length),
      particles: this.particles.length,
      pooledParticles: this.particlePool.length,
      motion: {
        delivery: this.delivery.value,
        recoil: this.recoil.value,
        swing: this.swing.value,
        flame: this.flameFlow.value,
        activeTool: this.model.toolId,
      },
      voices: this.audio.voices,
      width: this.host.clientWidth,
      startup: {
        firstRenderMs: this.startup.firstRender,
        interactiveReadyMs: this.startup.interactiveReady,
        rendererReadyMs: this.startup.firstRender - this.startup.created,
        firstStrikeResponseMs:
          this.startup.firstInput && this.startup.firstStrike
            ? this.startup.firstStrike - this.startup.firstInput
            : null,
      },
      height: this.host.clientHeight,
      pixelRatio: this.renderer.getPixelRatio(),
    };
  }
  dispose() {
    if (this.destroyed) return;
    this.destroyed = true;
    this.automation = undefined;
    this.model.stop();
    this.model.contactSamples = undefined;
    cancelAnimationFrame(this.animation);
    this.disposables.forEach((fn) => fn());
    this.audio.dispose();
    this.particlePool.forEach((p) => this.resources.disposeGraph(p.mesh));
    this.resources.dispose(this.fragmentGeometry);
    this.resources.dispose(this.vaporGeometry);
    this.ice.removeFromParent();
    this.ice.dispose();
    this.resources.dispose(this.ice.material);
    this.disposeObject(this.scene);
    this.particles = [];
    this.phaseShells = [];
    this.particlePool = [];
    this.lootMeshes.clear();
    this.workshop.labels.length = 0;
    this.workshop.arrivals.clear();
    this.renderer.renderLists.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.renderer.domElement.remove();
  }
}
