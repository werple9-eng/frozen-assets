import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { Loot } from './tuning';

/** Original, solid miniature valuables. All detailing stays inside the custody envelope. */
export function valuableArt(t: Loot) {
  const g = new THREE.Group();
  g.name = `valuable-${t.asset}`;
  const metal = (color: number, roughness = 0.32) =>
    new THREE.MeshStandardMaterial({ color, metalness: 0.78, roughness });
  const gold = metal(0xcaa14e),
    silver = metal(0xb5bfbd),
    dark = metal(0x35454a, 0.5);
  const paper = new THREE.MeshStandardMaterial({
    color: 0xd8cfaa,
    roughness: 0.92,
  });
  const green = new THREE.MeshStandardMaterial({
    color: 0x6b7f6a,
    roughness: 0.8,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: 0x4d3930,
    roughness: 0.8,
  });
  const red = new THREE.MeshStandardMaterial({
    color: 0x883f36,
    roughness: 0.6,
  });
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) =>
    add(
      new RoundedBoxGeometry(w, h, d, 2, Math.min(w, h, d) * 0.1),
      material,
      x,
      y,
      z,
    );
  const disk = (
    r: number,
    h: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => add(new THREE.CylinderGeometry(r, r, h, 32), material, x, y, z);
  const ring = (
    r: number,
    tube: number,
    material: THREE.Material,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const m = add(new THREE.TorusGeometry(r, tube, 8, 32), material, x, y, z);
    m.rotation.x = Math.PI / 2;
    return m;
  };
  const bars = (large = false) => {
    const xs = large ? [-0.28, 0.28] : [0];
    for (const x of xs) {
      box(large ? 0.5 : 0.9, 0.28, 0.64, gold, x);
      box(0.24, 0.01, 0.18, dark, x, 0.145);
      for (let n = 0; n < 3; n++)
        box(0.035, 0.012, 0.08, gold, x - 0.07 + n * 0.07, 0.153);
    }
  };
  const face = (pocket: boolean) => {
    disk(0.31, 0.12, gold);
    disk(0.263, 0.016, paper, 0, 0.07);
    ring(0.284, 0.019, gold, 0, 0.079);
    for (let n = 0; n < 12; n++) {
      const a = (n * Math.PI) / 6;
      const mark = box(
        0.018,
        0.012,
        n % 3 ? 0.025 : 0.048,
        dark,
        Math.sin(a) * 0.218,
        0.086,
        Math.cos(a) * 0.218,
      );
      mark.rotation.y = a;
    }
    box(0.018, 0.018, 0.17, dark, 0, 0.098, -0.065).rotation.y = 0.4;
    box(0.14, 0.018, 0.02, dark, 0.055, 0.099, 0.01).rotation.y = -0.3;
    disk(0.026, 0.02, gold, 0, 0.11);
    if (pocket) {
      ring(0.074, 0.022, gold, 0, 0, -0.39).rotation.x = 0;
      box(0.11, 0.09, 0.045, gold, 0, 0, -0.32);
    } else {
      for (const z of [-0.49, 0.49]) {
        box(0.26, 0.05, 0.4, leather, 0, -0.015, z);
        for (const x of [-0.095, 0.095])
          box(0.008, 0.006, 0.32, paper, x, 0.014, z);
      }
      box(0.29, 0.065, 0.065, silver, 0, 0, -0.64);
      for (let i = 0; i < 3; i++)
        disk(0.012, 0.008, dark, 0, 0.018, 0.45 + i * 0.07);
    }
  };
  switch (t.asset) {
    case 'coin':
      disk(0.45, 0.1, gold);
      ring(0.37, 0.012, gold, 0, 0.055);
      box(0.028, 0.012, 0.32, dark, -0.055, 0.056);
      box(0.18, 0.012, 0.028, dark, 0.02, 0.056, -0.14);
      box(0.13, 0.012, 0.026, dark, -0.005, 0.056, -0.015);
      break;
    case 'roll': {
      const roll = disk(0.2, 0.8, paper);
      roll.rotation.z = Math.PI / 2;
      for (const x of [-0.39, 0.39]) {
        const end = disk(0.175, 0.025, silver, x);
        end.rotation.z = Math.PI / 2;
      }
      for (const x of [-0.28, 0.28]) {
        const band = disk(0.205, 0.035, red, x);
        band.rotation.z = Math.PI / 2;
      }
      break;
    }
    case 'cash':
    case 'pack':
      for (let n = 0; n < (t.asset === 'pack' ? 7 : 4); n++)
        box(0.9, 0.022, 0.48, n % 2 ? paper : green, 0, n * 0.027);
      box(
        0.15,
        t.asset === 'pack' ? 0.21 : 0.125,
        0.5,
        paper,
        0,
        t.asset === 'pack' ? 0.09 : 0.04,
      );
      for (const x of [-0.31, 0.31])
        box(0.14, 0.009, 0.3, green, x, t.asset === 'pack' ? 0.193 : 0.108);
      break;
    case 'silver':
      box(0.9, 0.24, 0.48, silver);
      box(0.28, 0.01, 0.2, dark, 0, 0.126);
      for (let i = 0; i < 3; i++)
        box(0.018, 0.012, 0.12, silver, -0.07 + i * 0.07, 0.135);
      break;
    case 'smallGold':
    case 'gold':
      bars();
      break;
    case 'bullion':
      bars(true);
      for (const x of [-0.4, 0.4]) box(0.07, 0.3, 0.67, paper, x);
      box(0.27, 0.013, 0.15, red, 0.29, 0.158);
      break;
    case 'ring':
      ring(0.3, 0.055, gold);
      box(0.19, 0.07, 0.14, gold, 0, 0.048, -0.28);
      break;
    case 'bracelet':
      ring(0.36, 0.035, gold);
      ring(0.29, 0.026, gold);
      for (let i = 0; i < 10; i++) {
        const a = (i * Math.PI) / 5;
        box(
          0.065,
          0.045,
          0.08,
          gold,
          Math.sin(a) * 0.33,
          0,
          Math.cos(a) * 0.33,
        ).rotation.y = a;
      }
      box(0.13, 0.08, 0.12, silver, 0, 0, 0.33);
      break;
    case 'chain':
      for (let i = 0; i < 12; i++) {
        const a = (i * Math.PI) / 6;
        const link = ring(
          0.072,
          0.016,
          gold,
          Math.sin(a) * 0.29,
          0,
          Math.cos(a) * 0.4,
        );
        link.rotation.z = i % 2 ? 0.65 : 0;
        link.rotation.y = -a;
      }
      disk(0.1, 0.025, gold, 0, 0, 0.43);
      break;
    case 'watch':
      face(false);
      break;
    case 'pocketWatch':
      face(true);
      break;
    case 'rareCase':
      box(0.8, 0.14, 0.64, dark);
      box(0.72, 0.04, 0.56, leather, 0, 0.09);
      disk(0.215, 0.04, gold, 0, 0.128);
      ring(0.17, 0.01, silver, 0, 0.153);
      box(0.12, 0.035, 0.05, gold, 0, 0, 0.335);
      for (const x of [-0.27, 0.27]) box(0.1, 0.07, 0.05, silver, x, 0, -0.32);
      break;
    case 'bond':
      box(0.94, 0.08, 0.62, paper);
      box(0.82, 0.012, 0.035, green, 0, 0.048, 0.19);
      const flap = box(0.5, 0.014, 0.45, paper, 0, 0.049, -0.08);
      flap.rotation.y = Math.PI / 4;
      disk(0.082, 0.028, red, 0.07, 0.068, 0.06);
      for (let i = 0; i < 3; i++)
        box(0.26, 0.009, 0.012, dark, -0.2, 0.05, 0.16 + i * 0.04);
      break;
    case 'gem':
      box(0.86, 0.16, 0.62, dark);
      box(0.76, 0.045, 0.52, leather, 0, 0.1);
      for (const x of [-0.24, 0, 0.24]) {
        const jewel = add(
          new THREE.OctahedronGeometry(x ? 0.12 : 0.16),
          metal(x ? 0xa9bdc5 : 0x658e7d, 0.16),
          x,
          0.2,
        );
        jewel.rotation.y = x ? 0.4 : 0.8;
      }
      for (const x of [-0.36, 0.36]) box(0.08, 0.08, 0.1, gold, x, 0.04, 0.3);
      break;
  }
  // Normalize once before surface-contact samples are computed. Thus new art
  // cannot escape the packed volume or create invisible release constraints.
  const bounds = new THREE.Box3().setFromObject(g),
    size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  for (const child of g.children) child.position.sub(center);
  g.scale.set(t.w / size.x, t.h / size.y, t.d / size.z);
  g.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  // Unused palette entries never enter scene ownership.
  const used = new Set<THREE.Material>();
  g.traverse((o) => {
    if (o instanceof THREE.Mesh)
      (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) =>
        used.add(m),
      );
  });
  for (const m of [gold, silver, dark, paper, green, leather, red])
    if (!used.has(m)) m.dispose();
  return g;
}
