import * as THREE from 'three';
import { Spring } from './motion';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import {
  STORY_OBJECTS,
  type ToolId,
  type StoryObjectId,
} from './campaign-content';
const metal = new THREE.MeshStandardMaterial({
  color: 0x7e9197,
  metalness: 0.75,
  roughness: 0.3,
});
const grip = new THREE.MeshStandardMaterial({
  color: 0x66513b,
  roughness: 0.85,
});
const black = new THREE.MeshStandardMaterial({
  color: 0x263239,
  roughness: 0.65,
});
const brass = new THREE.MeshStandardMaterial({
  color: 0xb99b56,
  metalness: 0.7,
  roughness: 0.35,
});
const red = new THREE.MeshStandardMaterial({ color: 0x9c4037 });
const lamp = new THREE.MeshStandardMaterial({
  color: 0xefdfab,
  emissive: 0xc5b989,
  emissiveIntensity: 1,
});
function box(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
export function toolMesh(id: ToolId) {
  // The contact tip is the origin; +Y is outside the struck surface, +Z the grip.
  const g = new THREE.Group();
  const bevel = (
    w: number,
    h: number,
    d: number,
    m: THREE.Material,
    x: number,
    y: number,
    z: number,
  ) => {
    const mesh = new THREE.Mesh(
      new RoundedBoxGeometry(w, h, d, 3, Math.min(w, h, d) * 0.18),
      m,
    );
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };
  const shaft = (
    a: THREE.Vector3,
    b: THREE.Vector3,
    r: number,
    m: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(
      new THREE.CylinderGeometry(r * 0.86, r, a.distanceTo(b), 12),
      m,
    );
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      b.clone().sub(a).normalize(),
    );
    mesh.castShadow = true;
    g.add(mesh);
  };
  if (id === 'hand' || id === 'grip') {
    bevel(0.105, 0.055, 0.22, metal, 0, 0.045, 0.1);
    shaft(
      new THREE.Vector3(0, 0.085, 0.19),
      new THREE.Vector3(0, 0.115, 0.5),
      0.045,
      metal,
    );
    bevel(
      0.21,
      0.2,
      id === 'hand' ? 0.49 : 0.69,
      black,
      0,
      0.14,
      id === 'hand' ? 0.7 : 0.8,
    );
    bevel(0.19, 0.21, 0.09, brass, 0, 0.135, 0.48);
    for (let i = 0; i < 5; i++)
      bevel(0.218, 0.018, 0.035, grip, 0, 0.244, 0.57 + i * 0.065);
    bevel(0.13, 0.022, 0.21, metal, 0.013, 0.24, id === 'hand' ? 0.84 : 0.94);
    if (id === 'grip')
      for (let i = 0; i < 7; i++) {
        const ring = new THREE.Mesh(
          new THREE.TorusGeometry(0.1, 0.014, 6, 12),
          metal,
        );
        ring.position.set(0, 0.135, 0.36 + i * 0.025);
        g.add(ring);
      }
  } else if (id === 'pick' || id === 'heavy') {
    const large = id === 'heavy' ? 1.15 : 1;
    // Curved tapered forged head, with a narrow point and a real adze heel.
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0.02, 0),
      new THREE.Vector3(0.24, 0.14, 0.04),
      new THREE.Vector3(0.55, 0.24, 0.12),
      new THREE.Vector3(0.79, 0.25, 0.15),
    ]);
    const head = new THREE.TubeGeometry(curve, 18, 0.075 * large, 8, false);
    const position = head.getAttribute('position');
    for (let i = 0; i < position.count; i++) {
      const along = Math.floor(i / 9) / 18,
        center = curve.getPointAt(Math.min(1, along));
      const taper = 0.12 + 0.88 * Math.min(1, along * 2.1);
      position.setXYZ(
        i,
        center.x + (position.getX(i) - center.x) * taper,
        center.y + (position.getY(i) - center.y) * taper,
        center.z + (position.getZ(i) - center.z) * taper,
      );
    }
    head.computeVertexNormals();
    const h = new THREE.Mesh(head, metal);
    h.castShadow = true;
    g.add(h);
    bevel(0.29, 0.17, 0.25, metal, 0.79, 0.24, 0.17);
    bevel(0.32, 0.11, 0.22, metal, 1.04, 0.22, 0.17);
    shaft(
      new THREE.Vector3(0.8, 0.22, 0.24),
      new THREE.Vector3(0.8, 0.24, 1.92 * large),
      0.065 * large,
      grip,
    );
    bevel(0.21, 0.24, 0.24, brass, 0.8, 0.25, 0.36);
    bevel(0.22, 0.23, 0.65, black, 0.8, 0.25, 1.6 * large);
    for (let i = 0; i < 8; i++)
      bevel(0.226, 0.025, 0.038, grip, 0.8, 0.37, 1.32 * large + i * 0.07);
    bevel(0.24, 0.25, 0.09, metal, 0.8, 0.25, 1.95 * large);
  } else {
    const length = id === 'sledge' ? 2.3 : 1.6;
    bevel(0.18, 0.18, length, grip, 0, 0.22, length * 0.55);
    if (id === 'sledge') bevel(1.1, 0.49, 0.48, metal, 0, 0.25, 0.23);
    else {
      bevel(0.62, 0.5, 0.95, id === 'thermal' ? brass : black, 0, 0.31, 0.65);
      shaft(
        new THREE.Vector3(0, 0.08, 0),
        new THREE.Vector3(0, 0.18, 0.48),
        0.06,
        metal,
      );
      bevel(1, 0.12, 0.17, black, 0, 0.5, 0.88);
    }
    bevel(0.23, 0.25, 0.58, black, 0, 0.24, length * 0.83);
  }
  g.userData.contact = new THREE.Vector3(0, 0, 0);
  return g;
}
export class Workshop {
  group = new THREE.Group();
  phone = new THREE.Group();
  handset = new THREE.Group();
  files = new THREE.Group();
  keypad = new THREE.Group();
  handsetLift = new Spring(0, 120, 17);
  phoneBounce = new Spring(0, 260, 19);
  phoneHover = new Spring(0, 240, 24);
  phoneHovered = false;
  handsetMaterial = new THREE.MeshStandardMaterial({
    color: 0xaaa78b,
    roughness: 0.76,
    emissive: 0xc9c69c,
    emissiveIntensity: 0,
  });
  secondRing = -1;
  ring() {
    this.phoneBounce.kick(3.7);
    this.secondRing = 0.94;
  }
  labels: THREE.CanvasTexture[] = [];
  screen: THREE.Mesh;
  display = new THREE.Group();
  rack = new THREE.Group();
  hand = new THREE.Group();
  signature = '';
  current = '';
  lastUnread = 0;
  buzzUntil = 0;
  lastTime = 0;
  roomRecoil = 0;
  knownTools = new Set<ToolId>();
  arrivals = new Map<ToolId, Spring>();
  screenLight = new Spring(0.08, 140, 19);
  toolSwap = new Spring(1, 290, 20);
  drops: THREE.Mesh[] = [];
  react(recoil: number) {
    this.roomRecoil = recoil;
  }
  constructor() {
    const plastic = new THREE.MeshStandardMaterial({
      color: 0xaaa78b,
      roughness: 0.79,
    });
    const paper = new THREE.MeshStandardMaterial({
      color: 0xbda573,
      roughness: 0.96,
    });
    const label = (
      text: string,
      w: number,
      d: number,
      x: number,
      y: number,
      z: number,
      parent = this.phone,
    ) => {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 128;
      const c = canvas.getContext('2d')!;
      c.fillStyle = '#d0c498';
      c.fillRect(0, 0, 512, 128);
      c.fillStyle = '#26372b';
      c.font = 'bold 36px monospace';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(text, 256, 64, 480);
      const map = new THREE.CanvasTexture(canvas);
      map.colorSpace = THREE.SRGBColorSpace;
      this.labels.push(map);
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(w, d),
        new THREE.MeshStandardMaterial({ map, roughness: 0.9 }),
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };
    const base = new THREE.Mesh(
      new RoundedBoxGeometry(3.4, 0.65, 3, 3, 0.15),
      plastic,
    );
    base.position.y = 0.25;
    base.castShadow = base.receiveShadow = true;
    this.phone.add(base);
    for (const x of [-1.35, 1.35])
      for (const z of [-1.12, 1.12])
        this.phone.add(box(0.35, 0.17, 0.38, black, x, -0.14, z));
    this.phone.add(box(2.9, 0.14, 0.65, black, 0, 0.62, -0.88));
    for (const x of [-1.05, 1.05]) {
      const end = new THREE.Mesh(
        new RoundedBoxGeometry(0.85, 0.52, 0.84, 3, 0.16),
        this.handsetMaterial,
      );
      end.position.set(x, 0, 0);
      end.castShadow = true;
      this.handset.add(end);
      for (let i = 0; i < 4; i++)
        this.handset.add(
          box(0.42, 0.018, 0.028, black, x, 0.27, -0.15 + i * 0.1),
        );
    }
    const bridge = new THREE.Mesh(
      new RoundedBoxGeometry(1.85, 0.26, 0.43, 3, 0.1),
      this.handsetMaterial,
    );
    bridge.position.y = 0.12;
    bridge.castShadow = true;
    this.handset.add(bridge);
    this.handset.position.set(0, 0.91, -0.9);
    this.phone.add(this.handset);
    for (let i = 0; i < 12; i++) {
      const key = box(
        0.38,
        0.16,
        0.3,
        black,
        ((i % 3) - 1) * 0.54,
        0.64,
        -0.05 + Math.floor(i / 3) * 0.4,
      );
      key.userData.digit = '123456789*0#'[i];
      this.keypad.add(key);
      label(
        key.userData.digit,
        0.29,
        0.19,
        key.position.x,
        0.732,
        key.position.z,
        this.keypad,
      ).userData.digit = key.userData.digit;
    }
    this.phone.add(this.keypad);
    for (let i = 0; i < 8; i++)
      this.phone.add(
        box(0.03, 0.022, 0.64, black, 0.95 + i * 0.065, 0.59, 0.15),
      );
    const cordPoints = Array.from({ length: 240 }, (_, i) => {
      const t = i / 239;
      return new THREE.Vector3(
        -1.55 - 0.2 * Math.sin(t * Math.PI * 42),
        0.35 + 0.09 * Math.cos(t * Math.PI * 42),
        -0.8 + t * 3.7,
      );
    });
    this.phone.add(
      new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(cordPoints),
          180,
          0.04,
          6,
          false,
        ),
        black,
      ),
    );
    label('TONY — 7', 1.12, 0.3, 1, 0.615, 1.05);
    label('BELLWETHER / LINE 04', 2.4, 0.22, 0, 0.59, -1.32);
    this.screen = box(
      0.16,
      0.05,
      0.16,
      new THREE.MeshStandardMaterial({
        color: 0xc79548,
        emissive: 0xff8b20,
        emissiveIntensity: 0.08,
      }),
      1.34,
      0.62,
      -0.43,
    );
    this.phone.add(this.screen);
    this.phone.rotation.y = 0.13;
    this.files.add(box(2.75, 0.12, 2, paper));
    this.files.add(box(0.86, 0.13, 0.35, paper, -0.7, 0.01, -1.09));
    this.files.add(box(2.4, 0.045, 1.6, plastic, 0.08, 0.09, 0.04));
    this.files.add(box(2.7, 0.04, 1.84, paper, 0, 0.13, 0.1));
    label('RECOVERY FILES', 2.3, 0.5, 0, 0.155, 0.25, this.files);
    label('CALLS / PAPERS', 1.8, 0.3, 0, 0.157, 0.7, this.files);
    this.files.rotation.y = -0.13;
    this.group.add(this.phone, this.files, this.display, this.rack);
    for (let i = 0; i < 2; i++) {
      const drop = new THREE.Mesh(
        new THREE.SphereGeometry(0.035, 5, 4),
        new THREE.MeshStandardMaterial({
          color: 0xa9d9d5,
          transparent: true,
          opacity: 0.5,
        }),
      );
      this.group.add(drop);
      this.drops.push(drop);
    }
  }
  update(
    chapter: number,
    tools: ToolId[],
    objects: StoryObjectId[],
    unread: number,
    time: number,
    scale: number,
    selected: ToolId,
    reduced = false,
    ringing = false,
    offHook = false,
  ) {
    reduced ||= matchMedia('(prefers-reduced-motion: reduce)').matches;
    const dt = this.lastTime ? Math.min(0.1, time - this.lastTime) : 1 / 60;
    this.lastTime = time;
    const span = 1;
    this.group.scale.setScalar(scale);
    this.group.position.y = -0.5;
    if (unread > this.lastUnread) this.buzzUntil = time + 0.45;
    this.lastUnread = unread;
    this.phone.position.set(-8.6 * span, 0.225, -10.8 * span);
    if (this.secondRing >= 0) {
      this.secondRing -= dt;
      if (this.secondRing < 0 && ringing) this.phoneBounce.kick(3.2);
    }
    if (!ringing) this.secondRing = -1;
    this.phoneHover.target = this.phoneHovered ? 0.06 : 0;
    const bounce = this.phoneBounce.step(dt, reduced),
      hover = this.phoneHover.step(dt, reduced);
    this.handsetMaterial.emissiveIntensity = hover * 1.5;
    this.phone.position.y += reduced ? 0 : bounce + hover;
    this.files.position.set(-9 * span, 0.06, 0.4 * span);
    this.phone.rotation.z = reduced
      ? 0
      : (ringing ? Math.sin(time * 42) * 0.006 : 0) + bounce * 0.13;
    this.handsetLift.target = offHook ? 1 : 0;
    const picked = this.handsetLift.step(dt, reduced);
    this.handset.position.set(
      0.32 * picked,
      0.91 + 1.2 * picked,
      -0.9 + 0.6 * picked,
    );
    this.handset.rotation.set(
      -0.15 * picked,
      0,
      0.12 * picked + (ringing && !reduced ? Math.sin(time * 50) * 0.014 : 0),
    );
    this.screenLight.target = ringing
      ? Math.sin(time * 8) > 0
        ? 2.4
        : 0.1
      : offHook
        ? 0.65
        : 0.03;
    (this.screen.material as THREE.MeshStandardMaterial).emissiveIntensity =
      this.screenLight.step(dt, reduced);
    lamp.emissiveIntensity = Math.max(0.65, 1 + this.roomRecoil * 0.15);
    const key = [chapter, scale, ...tools, ...objects].join(':');
    if (key !== this.signature) {
      this.signature = key;
      for (const group of [this.rack, this.display]) {
        group.traverse((o) => {
          if (o instanceof THREE.Mesh) o.geometry.dispose();
        });
        group.clear();
      }
      this.rack.add(box(8, 0.2, 1.4, grip, 5 * span, 0.1, -7 * span));
      for (const [i, id] of tools.filter(t=>t!=='grip').entries()) {
        const t = toolMesh(id);
        t.position.set(2 * span + i * 0.9, 0.2, -7 * span);
        t.rotation.y = 0.15;
        t.userData.tool = id;
        if (!this.knownTools.has(id)) {
          const arrival = new Spring(
            this.knownTools.size && !reduced ? 3.2 : 0,
            200,
            17,
          );
          arrival.target = 0;
          this.arrivals.set(id, arrival);
        }
        this.rack.add(t);
      }
      tools.forEach((id) => this.knownTools.add(id));
      objects.forEach((id, i) => {
        const g = new THREE.Group();
        if (id === 'ring') {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(0.29, 0.065, 8, 24),
            metal,
          );
          ring.rotation.x = Math.PI / 2;
          g.add(ring);
        } else {
          g.add(
            box(
              1.1,
              id === 'ledger' ? 0.27 : 0.12,
              0.8,
              id === 'hold' ? red : id === 'log' ? metal : brass,
            ),
          );
          if (id === 'ledger')
            for (const x of [-0.4, 0.4]) g.add(box(0.1, 0.3, 0.82, metal, x));
          if (id === 'access')
            g.add(box(0.8, 0.025, 0.16, black, 0, 0.075, 0.15));
          if (id === 'tag') {
            const eye = new THREE.Mesh(
              new THREE.TorusGeometry(0.08, 0.025, 6, 12),
              black,
            );
            eye.rotation.x = Math.PI / 2;
            eye.position.set(-0.38, 0.075, 0);
            g.add(eye);
          }
        }
        const bottom = new THREE.Box3().setFromObject(g).min.y;
        g.position.set(8 * span, -bottom, -3 + i * 1.1);
        this.display.add(g);
      });
      if (chapter >= 3) {
        this.rack.add(box(2, 1.4, 2, black, -9 * span, 0.2, -5 * span));
        this.rack.add(box(1.7, 0.12, 1.7, grip, -9 * span, 0.96, -5 * span));
      }
      if (chapter >= 4) {
        this.rack.add(box(0.15, 3.8, 0.15, metal, -7 * span, 1.3, -6 * span));
        this.rack.add(box(2.2, 0.14, 0.4, lamp, -7 * span, 3.1, -6 * span));
        this.rack.add(box(2.3, 2.5, 2, black, 9 * span, 0.4, -5 * span));
        for (let i = 0; i < 6; i++)
          this.rack.add(
            box(1.8, 0.07, 0.08, metal, 9 * span, 0.1 + i * 0.2, -3.96 * span),
          );
      }
      this.rack.children.forEach((o) => {
        o.userData.rest = o.position.clone();
      });
      this.display.children.forEach((o) => {
        o.userData.rest = o.position.clone();
      });
    }
    this.rack.children.forEach((o, i) => {
      const rest = o.userData.rest as THREE.Vector3;
      if (!rest) return;
      const arrival = this.arrivals.get(o.userData.tool);
      const lift = arrival?.step(dt, reduced) ?? 0;
      o.position.copy(rest);
      o.position.y += reduced
        ? 0
        : Math.max(0, lift) + this.roomRecoil * Math.sin(i * 1.8) * 0.045;
      o.rotation.z = reduced
        ? 0
        : lift * -0.08 + this.roomRecoil * 0.009 * Math.sin(i + 1);
      o.scale.y = 1 + Math.min(0, lift) * 0.1;
    });
    this.display.children.forEach((o, i) => {
      o.rotation.z = reduced ? 0 : this.roomRecoil * Math.sin(i + 1) * 0.008;
    });
    this.drops.forEach((drop, i) => {
      const phase = (time * 0.37 + i * 0.43) % 1;
      drop.visible = !reduced && phase < 0.28;
      drop.position.set(
        (i ? 4 : -5) * span,
        0.3 - phase * phase * 21,
        4.8 * span,
      );
      drop.scale.set(1, 1 + phase * 3, 1);
    });
    this.toolSwap.target = this.current && this.current !== selected ? 0 : 1;
    if (
      !this.current ||
      (this.current !== selected && this.toolSwap.value < 0.035)
    ) {
      this.current = selected;
      this.hand.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose();
      });
      this.hand.clear();
      this.hand.add(toolMesh(selected));
      this.toolSwap.set(reduced ? 1 : 0.025);
      this.toolSwap.target = 1;
    }
    const swap = this.toolSwap.step(dt, reduced);
    this.hand.children.forEach((o) => {
      o.scale.setScalar(Math.max(0.001, swap));
      o.rotation.y = reduced ? 0 : (1 - swap) * -0.65;
    });
  }
  dispose() {
    this.handsetMaterial.dispose();
    this.labels.forEach((t) => t.dispose());
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    this.hand.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
  }
}
export function objectCaption(id: StoryObjectId) {
  return STORY_OBJECTS[id].name;
}
