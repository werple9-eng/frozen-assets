import { TUNE } from './tuning';

// Desk-local units: the desk top is y = 0 and the tray turns about the origin.
// The tray's yaw is unbounded, so its sweep is a full circle; tilt lifts a
// corner by at most the half-depth times the tilt limit.
const TRAY_HALF_WIDTH = 3.675 * TUNE.trayScale * 1.12,
  TRAY_HALF_DEPTH = 2.7 * TUNE.trayScale * 1.05;
export const TRAY_SWEEP_RADIUS = Math.hypot(TRAY_HALF_WIDTH, TRAY_HALF_DEPTH);
export const TRAY_CLEARANCE_MARGIN = 0.3;
export const TRAY_CLEARANCE_RADIUS = TRAY_SWEEP_RADIUS + TRAY_CLEARANCE_MARGIN;
export const TRAY_TOP = 1.3;
export const TRAY_SWEEP_TOP =
  TRAY_TOP + TRAY_SWEEP_RADIUS * Math.sin(TUNE.rotationTiltLimit);
// A prop inside the sweep circle must sit this high to stay clear of the tray.
export const RAISED_PROP_MIN_Y = TRAY_SWEEP_TOP + 0.3;
export const PHONE_SHELF_TOP = 3.15;
// The lamp arm crosses the tray no lower than this, above the tallest ice.
export const LAMP_ARM_MIN_Y = 11.2;
export const ROOM = {
  halfWidth: 21,
  back: -14.6,
  front: 11.4,
  floor: -7.4,
  ceiling: 16.6,
  deskHalfWidth: 17,
  deskHalfDepth: 11,
};

export type Footprint = {
  id: string;
  x: number;
  z: number;
  w: number;
  d: number;
  y?: number;
};
// Authored placements. Every desk prop either lies outside the tray sweep or
// rests on the raised phone shelf above it. Wall-mounted pieces are listed too.
export const DESK_PROPS: Footprint[] = [
  { id: 'phone-shelf', x: -10.4, z: -8.8, w: 6.2, d: 3.8, y: PHONE_SHELF_TOP },
  { id: 'phone', x: -10.6, z: -8.8, w: 3.5, d: 3.1, y: PHONE_SHELF_TOP },
  { id: 'notepad', x: -7.8, z: -8.3, w: 1.4, d: 1.8, y: PHONE_SHELF_TOP },
  { id: 'recovery-files', x: -9.6, z: 8.2, w: 2.9, d: 2.1 },
  { id: 'papers-a', x: -12.6, z: 4.0, w: 3.2, d: 3.4 },
  { id: 'folders', x: -13.2, z: 0.6, w: 2.4, d: 1.8 },
  { id: 'pen', x: -12.3, z: 7.4, w: 1.6, d: 0.3 },
  { id: 'binder-clip', x: -11.6, z: 4.2, w: 0.5, d: 0.5 },
  { id: 'mug', x: 10.8, z: 4.2, w: 1.15, d: 1.15 },
  { id: 'coffee-ring', x: 11.3, z: 3.6, w: 1.3, d: 1.3 },
  { id: 'papers-b', x: 11.4, z: 5.6, w: 2.9, d: 2.0 },
  { id: 'receipt', x: 11.9, z: 7.7, w: 1.0, d: 1.4 },
  { id: 'papers-c-left', x: -14.0, z: -9.6, w: 3.0, d: 2.2 },
  { id: 'papers-c-right', x: 14.4, z: -9.4, w: 2.8, d: 2.0 },
  { id: 'calculator', x: 14.6, z: -7.0, w: 1.7, d: 2.3 },
  { id: 'rag', x: 15.4, z: -4.6, w: 2.2, d: 1.6 },
  { id: 'lamp-base', x: 12.4, z: -10.4, w: 1.3, d: 1.3 },
  { id: 'tool-rack', x: 9.6, z: -13.9, w: 9.5, d: 0.3 },
  { id: 'evidence-shelf', x: -13.5, z: -13.6, w: 7.4, d: 1.3 },
];
export const prop = (id: string) => DESK_PROPS.find((f) => f.id === id)!;

export function nearestDistance(f: Footprint) {
  const dx = Math.max(0, Math.abs(f.x) - f.w / 2),
    dz = Math.max(0, Math.abs(f.z) - f.d / 2);
  return Math.hypot(dx, dz);
}
export function clearsTray(f: Footprint) {
  return (
    (f.y ?? 0) >= RAISED_PROP_MIN_Y ||
    nearestDistance(f) >= TRAY_CLEARANCE_RADIUS
  );
}
// Tray corners after the assembly's YXZ rotation: tilt about X, then yaw.
export function trayCorners(yaw: number, tilt: number) {
  const out: { x: number; y: number; z: number }[] = [];
  for (const x of [-TRAY_HALF_WIDTH, TRAY_HALF_WIDTH])
    for (const z of [-TRAY_HALF_DEPTH, TRAY_HALF_DEPTH]) {
      const y = TRAY_TOP - z * Math.sin(tilt),
        zt = z * Math.cos(tilt);
      out.push({
        x: x * Math.cos(yaw) + zt * Math.sin(yaw),
        y,
        z: -x * Math.sin(yaw) + zt * Math.cos(yaw),
      });
    }
  return out;
}
