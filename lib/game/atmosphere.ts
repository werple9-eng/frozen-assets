import * as THREE from 'three';
// A few practical details and 36 drifting points. One draw call for all the air.
export class WorkshopAir {
  group = new THREE.Group();
  seeds = new Float32Array(36 * 3);
  geometry = new THREE.BufferGeometry();
  dust: THREE.Points;
  vent = new THREE.Group();
  mist: THREE.Sprite[] = [];
  lastCycle = -1;
  constructor() {
    // The desk top is world Y=-0.5. All practical props use a local Y=0
    // contact plane, so scaling the workshop never lifts them off the desk.
    this.group.position.y = -0.5;
    const positions = new Float32Array(this.seeds.length);
    for (let i = 0; i < 36; i++) {
      this.seeds[i * 3] = Math.sin(i * 53.7) * 13;
      this.seeds[i * 3 + 1] = 0.7 + (i % 11) * 0.38;
      this.seeds[i * 3 + 2] = Math.cos(i * 31.7) * 8;
    }
    positions.set(this.seeds);
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3),
    );
    const dot = document.createElement('canvas');
    dot.width = dot.height = 32;
    const ctx = dot.getContext('2d')!,
      glow = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    glow.addColorStop(0, 'rgba(238,230,192,.7)');
    glow.addColorStop(0.25, 'rgba(202,224,212,.22)');
    glow.addColorStop(1, 'rgba(202,224,212,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 32, 32);
    this.dust = new THREE.Points(
      this.geometry,
      new THREE.PointsMaterial({
        color: 0xd8e8cb,
        size: 0.095,
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        map: new THREE.CanvasTexture(dot),
      }),
    );
    this.group.add(this.dust);
    const iron = new THREE.MeshStandardMaterial({
      color: 0x374643,
      roughness: 0.82,
      metalness: 0.4,
    });
    const base = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.16, 1.15), iron);
    this.vent.add(base);
    for (let i = 0; i < 7; i++) {
      const slat = new THREE.Mesh(
        new THREE.BoxGeometry(1.9, 0.08, 0.055),
        iron,
      );
      slat.position.set(0, 0.12, -0.4 + i * 0.13);
      this.vent.add(slat);
    }
    this.vent.position.set(-10.7, 0.08, -4.7);
    this.vent.rotation.y = 0.14;
    this.group.add(this.vent);
    this.paper(
      'BELLWETHER NATIONAL',
      'COLD STORAGE / LOT 001',
      'RECOVERY AUTHORIZATION',
      9.1,
      0.008,
      3.4,
      0.14,
    );
    this.paper(
      'MAINTENANCE',
      'RETURN SPRING / INSPECT WEEKLY',
      'KEEP DRAIN CHANNEL CLEAR',
      -10.5,
      0.008,
      -1.7,
      -0.12,
    );
    const cable = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-7.9, 0.028, 4.8),
      new THREE.Vector3(-8.2, 0.028, 5.5),
      new THREE.Vector3(-10.5, 0.028, 5.7),
      new THREE.Vector3(-12.3, 0.028, 4.4),
    ]);
    this.group.add(
      new THREE.Mesh(new THREE.TubeGeometry(cable, 22, 0.028, 6), iron),
    );
    const rag = new THREE.Mesh(
      new THREE.SphereGeometry(0.65, 12, 7),
      new THREE.MeshStandardMaterial({ color: 0x526962, roughness: 1 }),
    );
    rag.scale.set(1.2, 0.08, 0.7);
    rag.position.set(9.7, 0.052, 0.6);
    rag.castShadow = rag.receiveShadow = true;
    this.group.add(rag);
    // Thin cold air catches the practical light; it stays behind the work.
    for (let i = 0; i < 7; i++) {
      const cloud = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: (this.dust.material as THREE.PointsMaterial).map,
          color: 0xb9d9d0,
          opacity: 0.1,
          transparent: true,
          depthWrite: false,
        }),
      );
      cloud.position.set(-6 + i * 2, 0.25, -5.6);
      cloud.scale.set(4, 0.8, 1);
      this.group.add(cloud);
      this.mist.push(cloud);
    }
    // Worn file crate and an amber bench lamp make the edges of the room legible.
    const wood = new THREE.MeshStandardMaterial({
      color: 0x615438,
      roughness: 0.94,
    });
    for (const z of [-8.2, -6.6])
      for (let row = 0; row < 3; row++) {
        const slat = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 0.28, 0.16),
          wood,
        );
        slat.position.set(8.8, 0.14 + row * 0.34, z);
        slat.castShadow = true;
        this.group.add(slat);
      }
    const crateFloor = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 1.76),
      wood,
    );
    crateFloor.position.set(8.8, 0.06, -7.4);
    crateFloor.castShadow = crateFloor.receiveShadow = true;
    this.group.add(crateFloor);
    for (const x of [7.62, 9.98]) {
      const side = new THREE.Mesh(
        new THREE.BoxGeometry(0.16, 0.96, 1.76),
        wood,
      );
      side.position.set(x, 0.48, -7.4);
      side.castShadow = side.receiveShadow = true;
      this.group.add(side);
    }
    this.paper(
      'HOLD / DO NOT SHRED',
      'EXCEPTIONS · FEBRUARY',
      'RETURN TO PRESERVATION',
      8.8,
      0.968,
      -7.3,
      0.08,
    );
    const lampStem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.06, 3.4, 10),
      iron,
    );
    const lampBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.47, 0.56, 0.15, 24),
      iron,
    );
    lampBase.position.set(-5.7, 0.075, -8.2);
    lampBase.castShadow = lampBase.receiveShadow = true;
    this.group.add(lampBase);
    lampStem.position.set(-5.7, 1.85, -8.2);
    lampStem.castShadow = true;
    this.group.add(lampStem);
    const shade = new THREE.Mesh(
      new THREE.ConeGeometry(0.8, 0.65, 24, 1, true),
      new THREE.MeshStandardMaterial({
        color: 0x657363,
        side: THREE.DoubleSide,
        metalness: 0.45,
        roughness: 0.5,
      }),
    );
    shade.position.set(-5.7, 3.52, -8.2);
    shade.castShadow = true;
    this.group.add(shade);
    const warm = new THREE.PointLight(0xffca79, 3.5, 14, 1.4);
    warm.position.set(-5.7, 3.25, -8.2);
    this.group.add(warm);
  }
  paper(
    title: string,
    sub: string,
    foot: string,
    x: number,
    y: number,
    z: number,
    angle: number,
  ) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 320;
    const c = canvas.getContext('2d')!;
    c.fillStyle = '#b1ad88';
    c.fillRect(0, 0, 512, 320);
    c.fillStyle = '#3a4939';
    c.font = 'bold 25px sans-serif';
    c.fillText(title, 32, 58);
    c.font = '16px monospace';
    c.fillText(sub, 32, 94);
    c.strokeStyle = '#657255';
    for (let i = 0; i < 5; i++) {
      c.beginPath();
      c.moveTo(32, 125 + i * 23);
      c.lineTo(460 - (i % 2) * 54, 125 + i * 23);
      c.stroke();
    }
    c.fillStyle = '#884733';
    c.font = 'bold 15px monospace';
    c.fillText(foot, 32, 284);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const page = new THREE.Mesh(
      new THREE.PlaneGeometry(2.5, 1.56),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 1 }),
    );
    page.rotation.set(-Math.PI / 2, 0, angle);
    page.position.set(x, y, z);
    page.receiveShadow = true;
    this.group.add(page);
  }
  update(time: number, reduced: boolean, fewer: boolean) {
    this.dust.visible = !fewer;
    this.mist.forEach((cloud, i) => {
      cloud.visible = !fewer;
      cloud.position.x =
        -6 + i * 2 + (reduced ? 0 : Math.sin(time * 0.13 + i) * 0.9);
      cloud.position.y =
        0.25 + (reduced ? 0 : Math.cos(time * 0.19 + i) * 0.12);
    });
    const p = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < 36; i++)
      p.setXYZ(
        i,
        this.seeds[i * 3] + (reduced ? 0 : Math.sin(time * 0.11 + i) * 0.28),
        this.seeds[i * 3 + 1] +
          (reduced ? 0 : Math.sin(time * 0.16 + i * 3) * 0.35),
        this.seeds[i * 3 + 2],
      );
    p.needsUpdate = true;
    const compressor = time % 39 > 29;
    this.vent.rotation.z =
      compressor && !reduced ? Math.sin(time * 52) * 0.001 : 0;
  }
  dispose() {
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points) {
        o.geometry.dispose();
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          (m as THREE.MeshStandardMaterial).map?.dispose();
          m.dispose();
        }
      }
    });
  }
}
