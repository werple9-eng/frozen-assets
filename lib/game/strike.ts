import type { Vec3 } from './tuning';

// One committed motion plus at most one late buffered click. The visual and
// damage use this same clock; pausing cancels it, releasing a click does not.
export class StrikeCycle {
  age = -1;
  duration = 0.525;
  queued = false;
  impacted = false;
  point: Vec3 = { x: 0, y: 0, z: 0 };
  get active() {
    return this.age >= 0;
  }
  get progress() {
    return this.active ? this.age / this.duration : 1;
  }
  request() {
    if (!this.active || this.progress >= 0.6) this.queued = true;
  }
  cancel() {
    this.age = -1;
    this.queued = false;
    this.impacted = false;
  }
  update(
    dt: number,
    held: boolean,
    hit: Vec3 | null,
    duration: number,
    immediate = false,
  ): Vec3 | null {
    const start = () => {
      this.queued = false;
      if (!hit) return false;
      this.age = 0;
      this.duration = duration;
      this.impacted = false;
      this.point = { ...hit };
      return true;
    };
    if (!this.active && !((this.queued || held) && start())) return null;
    if (this.progress < 0.08 / 0.525 && hit) this.point = { ...hit };
    const before = this.age;
    this.age += dt;
    let impact: Vec3 | null = null;
    if (
      !this.impacted &&
      (immediate || before < this.duration * 0.4) &&
      (immediate || this.age >= this.duration * 0.4)
    ) {
      this.impacted = true;
      impact = { ...this.point };
    }
    if (this.age >= this.duration) {
      const remainder = this.age - this.duration;
      this.age = -1;
      if ((this.queued || held) && start()) this.age = remainder;
      else this.queued = false;
    }
    return impact;
  }
}
const smooth = (a: number, b: number, t: number) =>
  a + (b - a) * t * t * (3 - 2 * t);
// Tip-space pose, authored in seconds. Contact is exactly at the 210ms key.
export function strikePose(progress: number, immediate = false, tool?: string) {
  if (immediate) {
    const t = Math.max(0, Math.min(1, progress));
    return {
      lift: Math.sin(Math.PI * t) * 0.18,
      angle: Math.sin(Math.PI * t) * 0.22,
    };
  }
  const t = Math.max(0, Math.min(1, progress)) * 0.525;
  const keys = [
    [0, 0.08, 0.12],
    [0.07, 0.68, 0.74],
    [0.21, 0, 0],
    [0.275, -0.024, -0.085],
    [0.39, 0.17, 0.2],
    [0.525, 0.08, 0.12],
  ];
  const i = Math.max(
    0,
    keys.findIndex(
      (k, j) => j < keys.length - 1 && t >= k[0] && t <= keys[j + 1][0],
    ),
  );
  const a = keys[i],
    b = keys[i + 1],
    u = Math.max(0, Math.min(1, (t - a[0]) / (b[0] - a[0])));
  const mass =
    tool === 'heavy'
      ? 1.22
      : tool === 'sledge'
        ? 1.5
        : tool === 'breaker'
          ? 0.15
          : 1;
  // The downward arc accelerates into contact; recovery eases and settles.
  const arc = i === 1 ? u * u : u;
  return {
    lift: smooth(a[1], b[1], arc) * mass,
    angle:
      smooth(a[2], b[2], arc) *
      (tool === 'heavy'
        ? 1.12
        : tool === 'sledge'
          ? 1.22
          : tool === 'breaker'
            ? 0.1
            : 1),
  };
}
