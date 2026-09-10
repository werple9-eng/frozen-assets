import * as THREE from 'three';
import type { GameScene } from './scene';
import { GameModel } from './model';
import { TUNE } from './tuning';
import { campaignField } from './campaign-layout';

const POSES = [
  { name: 'front', yaw: 0, tilt: 0, x: 0, z: 0.65, side: false },
  { name: 'left rotation', yaw: -1.1, tilt: 0, x: -0.6, z: 0, side: false },
  { name: 'right rotation', yaw: 1.1, tilt: 0, x: 0.6, z: 0, side: false },
  {
    name: 'maximum up tilt',
    yaw: 0.4,
    tilt: -TUNE.rotationTiltLimit,
    x: 0,
    z: 0,
    side: false,
  },
  {
    name: 'maximum down tilt',
    yaw: -0.4,
    tilt: TUNE.rotationTiltLimit,
    x: 0,
    z: 0,
    side: false,
  },
  { name: 'near edge', yaw: 0, tilt: 0, x: 0, z: 0.92, side: false },
  { name: 'far edge', yaw: 0, tilt: 0, x: 0, z: -0.92, side: false },
  { name: 'side face', yaw: 0, tilt: 0, x: 0, z: 1.08, side: true },
];
// Local practice tool: measures rendered tool vertices against the actual hit
// plane during rest, impact and return. No depth-test overrides are allowed.
export async function contactAudit(s: GameScene) {
  const m = s.model as GameModel,
    saved = m.serialize();
  const rows: Record<string, unknown>[] = [],
    point = new THREE.Vector3();
  const wait = (ms: number, inspect?: () => void) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      let frame = 0,
        done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        resolve();
      };
      const deadline = setTimeout(finish, ms + 100);
      const sample = () => {
        if (done) return;
        inspect?.();
        if (performance.now() - start >= ms) {
          clearTimeout(deadline);
          finish();
        } else frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    });
  try {
    s.automation = undefined;
    s.cancelInput();
    m.restart();
    m.settings.gameplayZoom = 0.4;
    m.campaign!.state.pending = [];
    m.pause(false);
    m.emit();
    await wait(650);
    for (const tool of ['hand', 'pick'] as const) {
      m.campaign!.unlock(tool);
      m.selectTool(tool);
      for (const pose of POSES) {
        // Each pose starts on intact geometry; a previous pick strike must not
        // turn the next contact probe into a hole/empty-space test.
        m.stop();
        m.field = campaignField(0);
        m.field.carveLoot(m.loot);
        m.strikeClock = 0;
        s.swing.set(0);
        s.turntable.yaw = s.turntable.targetYaw = pose.yaw;
        s.turntable.tilt = s.turntable.targetTilt = pose.tilt;
        s.turntable.velocity = s.turntable.tiltVelocity = 0;
        const {
          physicalWidth: width,
          physicalHeight: height,
          physicalDepth: iceDepth,
        } = m.field.grid;
        s.automation = () => {
          point
            .set(
              pose.x * width * 0.4,
              pose.side ? height * 0.35 : height * 0.84,
              pose.z * iceDepth * 0.42,
            )
            .applyMatrix4(s.ice.matrixWorld)
            .project(s.camera);
          s.pointer.set(point.x, point.y);
          s.hasPointer = true;
        };
        await wait(300);
        let min = Infinity,
          visible = 0,
          samples = 0,
          depth = true;
        const inspect = () => {
          s.raycaster.setFromCamera(s.pointer, s.camera);
          if (!s.raycaster.intersectObject(s.ice, false).length) return;
          samples++;
          if (s.workshop.hand.visible) visible++;
          s.workshop.hand.updateMatrixWorld(true);
          s.workshop.hand.traverse((obj) => {
            if (!(obj instanceof THREE.Mesh)) return;
            const mats = Array.isArray(obj.material)
              ? obj.material
              : [obj.material];
            depth &&= mats.every((mat) => mat.depthTest);
            const a = obj.geometry.getAttribute('position');
            for (let i = 0; i < a.count; i += 7) {
              point.fromBufferAttribute(a, i).applyMatrix4(obj.matrixWorld);
              min = Math.min(min, point.sub(s.aim).dot(s.toolOut));
            }
          });
        };
        // Isolate presentation from excavation: a pick would remove this exact
        // far-edge ray target in one hit. Use its real strike-serial impulse on
        // intact ice; actual input/removal is exercised by the tutorial UI run.
        m.strikeSerial++;
        await wait(380, inspect);
        m.stop();
        rows.push({
          tool,
          pose: pose.name,
          samples,
          visible,
          depthTest: depth,
          minPlaneDistance: Number(min.toFixed(4)),
          pass:
            samples > 0 &&
            visible === samples &&
            depth &&
            min >= -0.06 &&
            min < 0.07,
        });
      }
    }
    return { pass: rows.every((r) => r.pass), rows, performance: s.stats() };
  } finally {
    s.automation = undefined;
    s.cancelInput();
    m.restore(saved);
    m.pause(false);
    m.emit();
    s.turntable.home();
  }
}
