import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Spring } from './motion';
import {
  DESK_PROPS,
  LAMP_ARM_MIN_Y,
  PHONE_SHELF_TOP,
  RAISED_PROP_MIN_Y,
  ROOM,
  TRAY_CLEARANCE_RADIUS,
  clearsTray,
  prop,
} from './room-layout';

const CHAPTER_CARDS = [
  'TUTORIAL',
  'SMALL CHANGE',
  'COLD STORAGE',
  'THE AUDIT',
  'SUBLEVEL B',
  'THE VAULT',
];

// A cramped Bellwether back office that has become a recovery bench. Authored
// on the desk plane (local Y = 0, the desk top) and scaled with the delivery so
// the tray's swept clearance, the walls and the lamp keep their relationship.
export class WorkshopRoom {
  group = new THREE.Group();
  mug = new THREE.Group();
  mugProxy: THREE.Mesh;
  mugHovered = false;
  mugTilt = new Spring(0, 260, 22);
  mugHover = new Spring(0, 240, 24);
  lampShade = new THREE.Group();
  lampLight: THREE.PointLight;
  overheadLight: THREE.PointLight;
  lampRecoil = new Spring(0, 180, 18);
  board = new THREE.Group();
  cards: THREE.Mesh[] = [];
  stamps: THREE.Mesh[] = [];
  chapterPapers: THREE.Object3D[][] = [];
  textures: THREE.CanvasTexture[] = [];
  props = new Map<string, THREE.Object3D>();
  debug?: THREE.Group;
  signature = '';
  private readonly lampAnchor = new THREE.Vector3();
  private readonly lampAim = new THREE.Vector3();
  private paperCorners: { page: THREE.Mesh; corner: number; base: number }[] =
    [];
  private coffeeSurface?: THREE.Mesh;
  private coffeeRipples: THREE.Mesh[] = [];
  private coffeeAge = 10;
  private ceilingParts: THREE.Object3D[] = [];

  constructor() {
    const g = this.group;
    g.position.y = -0.5;
    const mat = (
      color: number,
      roughness = 0.85,
      metalness = 0,
      extra: Partial<THREE.MeshStandardMaterialParameters> = {},
    ) =>
      new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
    const wall = mat(0x5a6564, 0.92);
    this.scuff(wall);
    const ceilingPaint = mat(0x5c605a, 0.95);
    const tile = mat(0x6b6f68, 0.96);
    const stainedTile = mat(0x615f56, 0.97);
    const grid = mat(0x3f4441, 0.7, 0.35);
    const floor = mat(0x2f3536, 0.88);
    const laminate = mat(0x45433f, 0.66, 0.04);
    this.grain(laminate);
    const steel = mat(0x3b4246, 0.5, 0.6);
    const doorPaint = mat(0x4f5658, 0.78, 0.08);
    const dark = mat(0x2a3033, 0.7, 0.2);
    const cork = mat(0x6d5a43, 0.98);
    const frame = mat(0x3b3328, 0.85);
    const cabinet = mat(0x59645f, 0.62, 0.45);
    const grille = mat(0x3c4548, 0.55, 0.5);
    const conduit = mat(0x596262, 0.6, 0.35);
    const paper = mat(0xb4ae8d, 0.97);
    const manila = mat(0xb39d76, 0.95);
    const red = mat(0x8d3d33, 0.9);
    const ceramic = mat(0xd6d3c9, 0.42, 0.02, { clearcoat: 0.2 } as never);
    const coffee = mat(0x2b1c14, 0.35, 0.05);
    const lampMetal = mat(0x4b5358, 0.48, 0.55);
    const bulb = new THREE.MeshStandardMaterial({
      color: 0xfff0d2,
      emissive: 0xffd8a2,
      emissiveIntensity: 1.6,
    });
    const box = (
      w: number,
      h: number,
      d: number,
      m: THREE.Material,
      x: number,
      y: number,
      z: number,
      r = 0.02,
      shadow = false,
    ) => {
      const mesh = new THREE.Mesh(
        r > 0
          ? new RoundedBoxGeometry(w, h, d, 2, r)
          : new THREE.BoxGeometry(w, h, d),
        m,
      );
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      mesh.castShadow = shadow;
      g.add(mesh);
      return mesh;
    };
    // Shell. The front stays open toward the camera.
    const floorMesh = new THREE.Mesh(new THREE.PlaneGeometry(44, 27), floor);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.set(0, ROOM.floor, -1.6);
    floorMesh.receiveShadow = true;
    g.add(floorMesh);
    const wallMid = (ROOM.floor + ROOM.ceiling) / 2,
      wallH = ROOM.ceiling - ROOM.floor;
    box(44, wallH, 0.4, wall, 0, wallMid, ROOM.back - 0.2, 0);
    box(0.4, wallH, 26, wall, -ROOM.halfWidth - 0.2, wallMid, -1.6, 0);
    box(0.4, wallH, 26, wall, ROOM.halfWidth + 0.2, wallMid, -1.6, 0);
    // Base strip where wall meets floor.
    box(44, 0.7, 0.12, dark, 0, ROOM.floor + 0.35, ROOM.back + 0.06, 0);
    // Drop ceiling: 2×4 tiles in a dark grid, one water-stained, and a troffer.
    const ceilingStart = g.children.length;
    box(44, 0.3, 26, ceilingPaint, 0, ROOM.ceiling + 0.15, -1.6, 0);
    const rows = [-9.1, 1.9],
      cols = [-16.5, -11, -5.5, 0, 5.5, 11, 16.5];
    for (const z of rows)
      for (const [i, x] of cols.entries())
        box(
          5.3,
          0.08,
          10.8,
          i === 5 && z < 0 ? stainedTile : tile,
          x,
          ROOM.ceiling - 0.04,
          z,
          0,
        );
    for (const z of [-14.6, -3.6, 7.4])
      box(44, 0.1, 0.16, grid, 0, ROOM.ceiling - 0.08, z, 0);
    for (const x of cols)
      box(0.16, 0.1, 26, grid, x + 2.75, ROOM.ceiling - 0.08, -1.6, 0);
    box(
      10.4,
      0.36,
      4.6,
      mat(0x9aa19c, 0.6, 0.3),
      0,
      ROOM.ceiling - 0.28,
      -3.6,
      0.03,
    );
    const lens = box(
      9.6,
      0.06,
      3.8,
      new THREE.MeshStandardMaterial({
        color: 0xdfeef2,
        emissive: 0xe4f3f6,
        emissiveIntensity: 0.85,
        roughness: 0.5,
      }),
      0,
      ROOM.ceiling - 0.48,
      -3.6,
      0,
    );
    lens.receiveShadow = false;
    this.ceilingParts = g.children.slice(ceilingStart);
    const overhead = new THREE.PointLight(0xd9ebf1, 34, 46, 1.15);
    this.overheadLight = overhead;
    overhead.position.set(0, ROOM.ceiling - 1.2, -3.6);
    g.add(overhead);
    // Door, back-right: closed, institutional, with a service plate.
    box(7.2, 16.4, 0.5, dark, 16.6, ROOM.floor + 8.2, ROOM.back + 0.05, 0);
    box(
      6.4,
      15.6,
      0.32,
      doorPaint,
      16.6,
      ROOM.floor + 7.8,
      ROOM.back + 0.2,
      0.04,
    );
    box(
      0.9,
      0.18,
      0.36,
      steel,
      14.35,
      ROOM.floor + 7.4,
      ROOM.back + 0.46,
      0.05,
    );
    box(0.5, 0.5, 0.1, steel, 14.35, ROOM.floor + 7.4, ROOM.back + 0.36, 0.02);
    const sign = this.plate(
      ['ASSET PRESERVATION', 'SERVICE ACCESS'],
      2.7,
      0.95,
      '#c6cfca',
      '#33403f',
      [30, 24],
    );
    sign.position.set(16.6, 4.6, ROOM.back + 0.38);
    g.add(sign);
    // Vent, high on the back wall, static.
    box(3.4, 2.0, 0.16, grille, -12.5, 12.6, ROOM.back + 0.08, 0);
    for (let i = 0; i < 6; i++)
      box(3.0, 0.12, 0.1, dark, -12.5, 11.85 + i * 0.3, ROOM.back + 0.2, 0);
    // Conduit and boxes.
    const run = (a: THREE.Vector3, b: THREE.Vector3, r = 0.09) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r, a.distanceTo(b), 8),
        conduit,
      );
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      );
      g.add(m);
    };
    const wz = ROOM.back + 0.3;
    run(new THREE.Vector3(-20.6, 13.8, wz), new THREE.Vector3(12.0, 13.8, wz));
    box(0.9, 0.9, 0.4, grille, 12.4, 13.8, wz, 0.02);
    run(new THREE.Vector3(12.4, 13.35, wz), new THREE.Vector3(12.4, 8.9, wz));
    run(
      new THREE.Vector3(-19.0, 13.8, wz),
      new THREE.Vector3(-19.0, 0.9, wz),
      0.07,
    );
    box(0.7, 1.0, 0.3, grille, -19.0, 0.5, wz, 0.02);
    // Filing cabinet, back-left, on the floor behind the desk corner.
    box(3.6, 8.4, 3.2, cabinet, -19.0, ROOM.floor + 4.2, -12.8, 0.05, true);
    for (let i = 0; i < 3; i++) {
      const y = ROOM.floor + 1.55 + i * 2.65;
      box(3.2, 2.35, 0.1, cabinet, -19.0, y, -11.15, 0.03);
      box(1.1, 0.14, 0.18, steel, -19.0, y + 0.5, -11.05, 0.03);
      box(0.9, 0.4, 0.05, paper, -19.0, y - 0.55, -11.08, 0);
    }
    // Bulletin board with chapter cards and two pinned forms.
    this.board.position.set(-2.5, 8.4, ROOM.back + 0.28);
    const corkMesh = new THREE.Mesh(new THREE.BoxGeometry(11.5, 7, 0.25), cork);
    corkMesh.receiveShadow = true;
    this.board.add(corkMesh);
    for (const [w, h, x, y] of [
      [11.9, 0.3, 0, 3.55],
      [11.9, 0.3, 0, -3.55],
      [0.3, 7.3, -5.85, 0],
      [0.3, 7.3, 5.85, 0],
    ] as const) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(w, h, 0.32), frame);
      f.position.set(x, y, 0.02);
      this.board.add(f);
    }
    CHAPTER_CARDS.forEach((name, i) => {
      const card = this.plate([name], 1.55, 1.05, '#2e3a37', '#c9c2a5', [17]);
      card.position.set(-4.7 + i * 1.88, 1.4, 0.16);
      card.rotation.z = (i % 2 ? -1 : 1) * 0.02 * (1 + (i % 3));
      this.board.add(card);
      this.cards.push(card);
      const stamp = this.plate(
        ['COMPLETE'],
        1.3,
        0.42,
        '#8f3a2e',
        'rgba(0,0,0,0)',
        [22],
      );
      stamp.position.set(card.position.x + 0.05, 1.0, 0.19);
      stamp.rotation.z = -0.12 + (i % 2) * 0.08;
      stamp.visible = false;
      this.board.add(stamp);
      this.stamps.push(stamp);
      const pin = new THREE.Mesh(
        new THREE.CylinderGeometry(0.07, 0.07, 0.08, 8),
        red,
      );
      pin.rotation.x = Math.PI / 2;
      pin.position.set(card.position.x, 1.9, 0.2);
      this.board.add(pin);
    });
    for (const [x, y, rot, lines] of [
      [-3.3, -1.5, 0.03, ['BELLWETHER NATIONAL', 'CUSTODY REVIEW — FORM 12']],
      [2.6, -1.7, -0.05, ['MAINTENANCE', 'SERVICE LOG']],
    ] as const) {
      const form = this.plate(
        [...lines],
        2.6,
        1.7,
        '#3a4939',
        '#b6b08d',
        [15, 12],
      );
      form.position.set(x, y, 0.16);
      form.rotation.z = rot;
      this.board.add(form);
    }
    g.add(this.board);
    // Desk: worn laminate top on a painted steel frame.
    const top = box(34, 0.5, 22, laminate, 0, -0.25, 0, 0.06);
    top.castShadow = true;
    for (const z of [-10.4, 10.4]) box(33.6, 0.3, 0.3, steel, 0, -0.7, z, 0.04);
    for (const x of [-16.3, 16.3])
      for (const z of [-10.4, 10.4])
        box(0.5, 6.7, 0.5, steel, x, -4.05, z, 0.04, true);
    box(33, 5, 0.15, steel, 0, -3.9, -10.7, 0.02);
    // Raised phone shelf at the back-left of the work area.
    const shelf = prop('phone-shelf');
    box(
      shelf.w,
      0.25,
      shelf.d,
      laminate,
      shelf.x,
      PHONE_SHELF_TOP - 0.125,
      shelf.z,
      0.04,
      true,
    );
    // Cantilevered from the outside edge: no support leg enters the tray sweep.
    for (const id of ['phone-post-back', 'phone-post-front']) {
      const post = prop(id);
      box(
        post.w,
        PHONE_SHELF_TOP - 0.25,
        post.d,
        steel,
        post.x,
        (PHONE_SHELF_TOP - 0.25) / 2,
        post.z,
        0.03,
      );
    }
    const pad = prop('notepad');
    box(pad.w, 0.18, pad.d, paper, pad.x, PHONE_SHELF_TOP + 0.09, pad.z, 0.01);
    const note = this.plate(['TONY — 7'], 1.2, 0.5, '#2a3a30', '#c9c39e', [26]);
    note.rotation.x = -Math.PI / 2;
    note.position.set(pad.x, PHONE_SHELF_TOP + 0.185, pad.z - 0.2);
    g.add(note);
    this.pen(pad.x, PHONE_SHELF_TOP + 0.24, pad.z, 1.1, dark);
    // Clamp work lamp, rear-right, reaching over the tray above the ice envelope.
    const base = prop('lamp-base');
    box(base.w, 0.5, base.d, lampMetal, base.x, 0.25, base.z, 0.05, true);
    box(0.7, 1.1, 0.7, lampMetal, base.x, 1.0, base.z, 0.05);
    const j1 = new THREE.Vector3(base.x, 1.5, base.z),
      j2 = new THREE.Vector3(10.6, 8.4, -8.2),
      j3 = new THREE.Vector3(7.9, LAMP_ARM_MIN_Y + 1.5, -4.2);
    const arm = (a: THREE.Vector3, b: THREE.Vector3) => {
      const m = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.14, a.distanceTo(b), 10),
        lampMetal,
      );
      m.position.copy(a).add(b).multiplyScalar(0.5);
      m.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        b.clone().sub(a).normalize(),
      );
      m.castShadow = true;
      g.add(m);
    };
    arm(j1, j2);
    arm(j2, j3);
    for (const j of [j1, j2, j3]) {
      const k = new THREE.Mesh(
        new THREE.SphereGeometry(0.24, 10, 8),
        lampMetal,
      );
      k.position.copy(j);
      g.add(k);
    }
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(1.15, 1.35, 22, 1, true),
      mat(0x525b5e, 0.5, 0.45, { side: THREE.DoubleSide }),
    );
    shade.rotation.x = Math.PI;
    shade.castShadow = true;
    this.lampShade.add(shade);
    const bulbMesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.3, 12, 10),
      bulb,
    );
    bulbMesh.position.y = -0.35;
    this.lampShade.add(bulbMesh);
    this.lampLight = new THREE.PointLight(0xffd7a0, 38, 24, 1.3);
    this.lampLight.position.y = -0.7;
    this.lampShade.add(this.lampLight);
    this.lampShade.position.copy(j3);
    this.lampShade.lookAt(0, 1.5, 0);
    this.lampShade.rotateX(Math.PI / 2);
    g.add(this.lampShade);
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(base.x + 0.4, 0.2, base.z + 0.2),
      new THREE.Vector3(base.x + 1.2, 0.03, base.z - 0.4),
      new THREE.Vector3(16.6, -0.9, -10.6),
      new THREE.Vector3(16.9, -4.5, -10.4),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(cable, 24, 0.045, 6), dark));
    // Mug, front-right, with cold coffee and a faint ring beside it.
    const mugSpot = prop('mug');
    this.mug.position.set(mugSpot.x, 0, mugSpot.z);
    this.mug.scale.setScalar(1.35);
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.46, 1.05, 24, 1, true),
      ceramic,
    );
    body.position.y = 0.525;
    body.castShadow = true;
    this.mug.add(body);
    const bottom = new THREE.Mesh(new THREE.CircleGeometry(0.46, 24), ceramic);
    bottom.rotation.x = -Math.PI / 2;
    bottom.position.y = 0.06;
    this.mug.add(bottom);
    const rim = new THREE.Mesh(
      new THREE.TorusGeometry(0.48, 0.035, 8, 28),
      ceramic,
    );
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 1.05;
    this.mug.add(rim);
    const drink = new THREE.Mesh(new THREE.CircleGeometry(0.44, 24), coffee);
    drink.rotation.x = -Math.PI / 2;
    drink.position.y = 0.42;
    this.mug.add(drink);
    this.coffeeSurface = drink;
    for (let i = 0; i < 2; i++) {
      const ripple = new THREE.Mesh(
        new THREE.RingGeometry(0.28, 0.3, 32),
        new THREE.MeshBasicMaterial({
          color: 0xbbaa84,
          transparent: true,
          opacity: 0,
          depthWrite: false,
        }),
      );
      ripple.rotation.x = -Math.PI / 2;
      ripple.position.y = 0.424 + i * 0.002;
      ripple.visible = false;
      this.mug.add(ripple);
      this.coffeeRipples.push(ripple);
    }
    const handle = new THREE.Mesh(
      new THREE.TorusGeometry(0.3, 0.075, 8, 18, Math.PI),
      ceramic,
    );
    handle.position.set(0.52, 0.56, 0);
    handle.rotation.z = -Math.PI / 2;
    handle.castShadow = true;
    this.mug.add(handle);
    this.mugProxy = new THREE.Mesh(
      new THREE.BoxGeometry(1.5, 1.6, 1.5),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.mugProxy.position.y = 0.8;
    this.mug.add(this.mugProxy);
    g.add(this.mug);
    this.props.set('mug', this.mug);
    const ringSpot = prop('coffee-ring');
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.56, 0.66, 40),
      new THREE.MeshStandardMaterial({
        color: 0x2a1d15,
        transparent: true,
        opacity: 0.16,
        roughness: 1,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(ringSpot.x, 0.004, ringSpot.z);
    g.add(ring);
    // Authored clutter, in groups. Uniform scatter reads as generated.
    const a = prop('papers-a');
    const groupA = [
      this.sheet(a.x - 0.2, 0.004, a.z - 0.6, 0.035, 'form'),
      this.sheet(a.x + 0.15, 0.008, a.z - 0.2, -0.07, 'letter'),
      this.sheet(a.x - 0.1, 0.012, a.z + 0.3, 0.12, 'form', true),
      this.sheet(a.x + 0.3, 0.016, a.z + 0.7, -0.02, 'letter'),
      this.sheet(a.x - 0.35, 0.02, a.z + 1.0, 0.05, 'form'),
    ];
    const b = prop('papers-b');
    this.sheet(b.x, 0.004, b.z - 0.2, -0.1, 'letter');
    this.sheet(b.x + 0.2, 0.008, b.z + 0.3, 0.05, 'form', true);
    const cl = prop('papers-c-left'),
      cr = prop('papers-c-right');
    this.sheet(cl.x + 0.2, 0.004, cl.z, -0.05, 'order');
    this.sheet(cl.x - 0.3, 0.008, cl.z + 0.3, 0.02, 'form');
    this.sheet(cr.x, 0.004, cr.z, 0.03, 'letter');
    const later = [
      [
        this.sheet(a.x + 0.5, 0.024, a.z + 0.2, -0.16, 'form'),
        this.sheet(a.x - 0.5, 0.028, a.z - 0.9, 0.09, 'letter'),
      ],
      [this.sheet(a.x + 0.1, 0.032, a.z - 0.4, 0.2, 'hold')],
      [this.sheet(cr.x - 0.3, 0.008, cr.z + 0.4, -0.08, 'order', true)],
      [
        this.sheet(cl.x + 0.6, 0.012, cl.z - 0.5, 0.14, 'hold'),
        this.sheet(b.x - 0.3, 0.012, b.z + 0.7, 0.18, 'form'),
      ],
    ];
    this.chapterPapers = [groupA, ...later];
    for (const set of later) for (const s of set) s.visible = false;
    const fold = prop('folders');
    box(2.4, 0.14, 1.8, manila, fold.x, 0.07, fold.z, 0.01).rotation.y = 0.06;
    box(
      2.3,
      0.14,
      1.75,
      manila,
      fold.x + 0.15,
      0.22,
      fold.z + 0.12,
      0.01,
    ).rotation.y = -0.05;
    const pen = prop('pen');
    this.pen(pen.x, 0.06, pen.z, 1.6, dark).rotation.y = 0.28;
    this.pen(
      pen.x + 0.3,
      0.06,
      pen.z - 0.5,
      1.5,
      mat(0x7a7c73, 0.4, 0.5),
    ).rotation.y = -0.12;
    const clip = prop('binder-clip');
    box(0.5, 0.3, 0.4, dark, clip.x, 0.15, clip.z, 0.03);
    const calc = prop('calculator');
    box(calc.w, 0.35, calc.d, dark, calc.x, 0.175, calc.z, 0.04, true);
    box(
      1.3,
      0.04,
      0.5,
      mat(0x3f4a46, 0.3, 0.1),
      calc.x,
      0.36,
      calc.z - 0.75,
      0,
    );
    for (let i = 0; i < 12; i++)
      box(
        0.3,
        0.1,
        0.26,
        mat(0x5b615c, 0.6),
        calc.x - 0.45 + (i % 3) * 0.45,
        0.39,
        calc.z - 0.15 + Math.floor(i / 3) * 0.4,
        0.02,
      );
    const ragSpot = prop('rag');
    const rag = new THREE.Mesh(
      new THREE.SphereGeometry(0.75, 12, 7),
      mat(0x4f5f59, 1),
    );
    rag.scale.set(1.4, 0.09, 0.95);
    rag.position.set(ragSpot.x, 0.06, ragSpot.z);
    rag.rotation.y = 0.4;
    rag.castShadow = rag.receiveShadow = true;
    g.add(rag);
    const rec = prop('receipt');
    const receipt = this.plate(
      ['BELLWETHER', 'CAFETERIA', '#0412  $2.60'],
      1.0,
      1.4,
      '#4a4d43',
      '#d4d0bd',
      [11, 10, 10],
    );
    receipt.rotation.set(-Math.PI / 2, 0, -0.2);
    receipt.position.set(rec.x, 0.004, rec.z);
    g.add(receipt);
    // Static room geometry never moves relative to its group.
    g.updateMatrixWorld(true);
    g.traverse((o) => {
      if (
        o !== g &&
        o !== this.mug &&
        o !== this.lampShade &&
        o !== this.board &&
        !this.mug.children.includes(o)
      )
        o.matrixAutoUpdate = false;
    });
    this.mug.matrixAutoUpdate = true;
    this.lampShade.matrixAutoUpdate = true;
  }
  private scuff(m: THREE.MeshStandardMaterial) {
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec3 vRoom;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvRoom = (modelMatrix * vec4(position, 1.0)).xyz;',
      );
      shader.fragmentShader = 'varying vec3 vRoom;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' +
          'float grime = smoothstep(2.2, -3.0, vRoom.y) * 0.10 + smoothstep(13.0, 18.0, vRoom.y) * 0.05;\n' +
          'float scuff = (1.0 - smoothstep(0.0, 0.05, abs(sin(vRoom.x * 0.9 + sin(vRoom.y * 2.3) * 0.7) - 0.6))) * 0.05;\n' +
          'float speck = step(0.995, fract(sin(dot(floor(vRoom.xy * 6.0), vec2(12.9898, 78.233))) * 43758.5453)) * 0.08;\n' +
          'diffuseColor.rgb *= 1.0 - grime - scuff - speck;',
      );
    };
  }
  private grain(m: THREE.MeshStandardMaterial) {
    m.onBeforeCompile = (shader) => {
      shader.vertexShader = 'varying vec3 vDesk;\n' + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvDesk = position;',
      );
      shader.fragmentShader = 'varying vec3 vDesk;\n' + shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        '#include <color_fragment>\n' +
          'float lam = sin(vDesk.z * 60.0 + sin(vDesk.x * 0.4) * 3.0) * 0.02 + sin(vDesk.x * 17.0) * 0.012;\n' +
          'float wear = smoothstep(15.5, 17.0, abs(vDesk.x)) * 0.06 + smoothstep(9.8, 11.0, abs(vDesk.z)) * 0.04;\n' +
          'float scratch = (1.0 - smoothstep(0.0, 0.012, abs(vDesk.z - 0.31 * vDesk.x + 4.2))) * step(abs(vDesk.x + 6.0), 3.0) * 0.06;\n' +
          'diffuseColor.rgb *= 0.98 + lam - wear + scratch;',
      );
    };
  }
  private plate(
    lines: string[],
    w: number,
    h: number,
    color: string,
    bg: string,
    sizes: number[],
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = Math.round((256 * h) / w);
    const c = canvas.getContext('2d')!;
    if (bg !== 'rgba(0,0,0,0)') {
      c.fillStyle = bg;
      c.fillRect(0, 0, canvas.width, canvas.height);
    }
    c.fillStyle = color;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    const step = canvas.height / (lines.length + 1);
    lines.forEach((line, i) => {
      c.font = `700 ${sizes[i] ?? sizes[0]}px monospace`;
      c.fillText(line, canvas.width / 2, step * (i + 1), canvas.width - 16);
    });
    const map = new THREE.CanvasTexture(canvas);
    map.colorSpace = THREE.SRGBColorSpace;
    this.textures.push(map);
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(w, h),
      new THREE.MeshStandardMaterial({
        map,
        roughness: 0.9,
        transparent: bg === 'rgba(0,0,0,0)',
      }),
    );
    mesh.receiveShadow = true;
    return mesh;
  }
  private sheetMaterials = new Map<string, THREE.MeshStandardMaterial>();
  private sheet(
    x: number,
    y: number,
    z: number,
    rot: number,
    kind: 'form' | 'letter' | 'order' | 'hold',
    curl = false,
  ) {
    let m = this.sheetMaterials.get(kind);
    if (!m) {
      const canvas = document.createElement('canvas');
      canvas.width = 256;
      canvas.height = 160;
      const c = canvas.getContext('2d')!;
      c.fillStyle = kind === 'hold' ? '#c9b6a4' : '#b6b08d';
      c.fillRect(0, 0, 256, 160);
      c.fillStyle = '#3a4939';
      c.font = 'bold 13px sans-serif';
      c.fillText(
        kind === 'order'
          ? 'MAINTENANCE WORK ORDER'
          : kind === 'hold'
            ? 'INTERNAL HOLD'
            : 'BELLWETHER NATIONAL',
        14,
        24,
      );
      c.strokeStyle = '#6a7460';
      for (let i = 0; i < 6; i++) {
        c.beginPath();
        c.moveTo(14, 46 + i * 15);
        c.lineTo(240 - (i % 3) * 30, 46 + i * 15);
        c.stroke();
      }
      if (kind === 'form')
        for (let i = 0; i < 4; i++) c.strokeRect(190, 44 + i * 15, 9, 9);
      if (kind === 'hold') {
        c.fillStyle = '#8d3d33';
        c.font = 'bold 18px monospace';
        c.fillText('DO NOT RELEASE', 60, 140);
      }
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      this.textures.push(map);
      m = new THREE.MeshStandardMaterial({
        map,
        roughness: 1,
        side: THREE.DoubleSide,
      });
      this.sheetMaterials.set(kind, m);
    }
    const geometry = new THREE.PlaneGeometry(2.5, 1.56, 4, 4);
    if (curl) {
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++)
        if (p.getX(i) > 1.2 && p.getY(i) > 0.7) p.setZ(i, 0.06);
      geometry.computeVertexNormals();
    }
    const page = new THREE.Mesh(geometry, m);
    if (curl) {
      const p = geometry.getAttribute('position');
      for (let i = 0; i < p.count; i++)
        if (p.getZ(i) > 0)
          this.paperCorners.push({ page, corner: i, base: p.getZ(i) });
    }
    page.rotation.set(-Math.PI / 2, 0, rot);
    page.position.set(x, y, z);
    page.receiveShadow = true;
    this.group.add(page);
    return page;
  }
  private pen(
    x: number,
    y: number,
    z: number,
    length: number,
    m: THREE.Material,
  ) {
    const pen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.05, length, 8),
      m,
    );
    pen.rotation.z = Math.PI / 2;
    pen.position.set(x, y, z);
    pen.castShadow = true;
    this.group.add(pen);
    return pen;
  }
  tapMug() {
    this.mugTilt.kick(1.4);
    this.coffeeAge = 0;
  }
  react(recoil: number) {
    this.lampRecoil.kick(recoil * 0.4);
  }
  lampWorld() {
    return this.lampLight.getWorldPosition(this.lampAnchor);
  }
  lampTarget() {
    return this.lampAim.set(0, 1.5 * this.group.scale.y - 0.5, 0);
  }
  update(
    scale: number,
    chapter: number,
    tutorialComplete: boolean,
    reduced: boolean,
    time: number,
    dt: number,
    recoil = 0,
    cameraY = 14.7,
  ) {
    this.group.scale.setScalar(scale);
    // A dollhouse cutaway when the fixed camera is above a small workshop.
    // Otherwise the ceiling's outside face masks the lamp and upper work area.
    const beneathCeiling =
      cameraY < ROOM.ceiling * scale + this.group.position.y - 0.1;
    for (const part of this.ceilingParts) part.visible = beneathCeiling;
    this.mugHover.target = this.mugHovered ? 1 : 0;
    const hover = this.mugHover.step(dt, reduced),
      tilt = this.mugTilt.step(dt, reduced);
    this.mug.position.y = hover * 0.01 + Math.max(0, tilt) * 0.01;
    this.mug.rotation.z = reduced ? 0 : tilt * 0.012 + hover * 0.008;
    if (recoil) this.react(recoil);
    const shake = this.lampRecoil.step(dt, reduced);
    this.lampShade.rotation.z = reduced ? 0 : shake * 0.004;
    // Lights are authored in desk-local units as well. Compensate attenuation
    // when the workshop scales, so the tutorial isn't washed out by tiny distances.
    this.overheadLight.intensity = 18 * scale ** this.overheadLight.decay;
    this.overheadLight.distance = 46 * scale;
    this.lampLight.distance = 24 * scale;
    this.lampLight.intensity =
      24 *
      scale ** this.lampLight.decay *
      (reduced
        ? 1
        : 1 + Math.sin(time * 0.61) * 0.018 + Math.sin(time * 1.13) * 0.007);
    this.coffeeAge += Math.min(0.05, dt);
    this.coffeeRipples.forEach((ripple, i) => {
      const age = this.coffeeAge - i * 0.22;
      ripple.visible = !reduced && age > 0 && age < 1.3;
      if (!ripple.visible) {
        ripple.scale.setScalar(0.001);
        return;
      }
      ripple.scale.setScalar(0.2 + Math.max(0, age) * 0.85);
      (ripple.material as THREE.MeshBasicMaterial).opacity = Math.max(
        0,
        (1 - age / 1.3) * 0.2,
      );
    });
    if (this.coffeeSurface)
      this.coffeeSurface.rotation.x =
        -Math.PI / 2 +
        (reduced
          ? 0
          : Math.sin(this.coffeeAge * 18) *
            Math.exp(-this.coffeeAge * 4) *
            0.018);
    for (const [i, { page, corner, base }] of this.paperCorners.entries()) {
      const p = page.geometry.getAttribute('position');
      p.setZ(
        corner,
        base +
          (reduced ? 0 : (0.5 + Math.sin(time * 1.4 + i * 2.1) * 0.5) * 0.055),
      );
      p.needsUpdate = true;
    }
    const key = `${chapter}:${tutorialComplete}`;
    if (key !== this.signature) {
      this.signature = key;
      this.stamps.forEach((stamp, i) => {
        stamp.visible = i === 0 ? tutorialComplete : chapter > i;
      });
      this.chapterPapers.forEach((set, i) => {
        for (const s of set) s.visible = i === 0 || chapter >= i + 1;
      });
      this.board.updateMatrixWorld(true);
    }
  }
  // Development only: the tray sweep as a hull, with intruding props in red.
  debugClearance(on: boolean) {
    if (this.debug) {
      this.group.remove(this.debug);
      this.debug.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (o.material as THREE.Material).dispose();
        }
      });
      this.debug = undefined;
    }
    if (!on) return;
    const d = new THREE.Group();
    const hull = new THREE.Mesh(
      new THREE.CylinderGeometry(
        TRAY_CLEARANCE_RADIUS,
        TRAY_CLEARANCE_RADIUS,
        RAISED_PROP_MIN_Y,
        48,
        1,
        true,
      ),
      new THREE.MeshBasicMaterial({
        color: 0x5fd0ff,
        wireframe: true,
        transparent: true,
        opacity: 0.35,
      }),
    );
    hull.position.y = RAISED_PROP_MIN_Y / 2;
    d.add(hull);
    for (const f of DESK_PROPS) {
      const ok = clearsTray(f);
      const m = new THREE.Mesh(
        new THREE.BoxGeometry(f.w, 0.4, f.d),
        new THREE.MeshBasicMaterial({
          color: ok ? 0x5fd0ff : 0xff3b30,
          wireframe: true,
        }),
      );
      m.position.set(f.x, (f.y ?? 0) + 0.2, f.z);
      d.add(m);
    }
    this.debug = d;
    this.group.add(d);
  }
}
