import { TUNE } from './tuning';

// A bounded spring carries the turntable's weight. Pointer deltas change its
// destination, never the rendered transform. No timers or per-frame tweens.
export class TrayRotation {
  yaw = 0;
  tilt = 0;
  targetYaw = 0;
  targetTilt = 0;
  velocity = 0;
  tiltVelocity = 0;
  dragging = false;
  demonstrated = false;
  begin() {
    this.dragging = true;
  }
  move(dx: number, dy: number) {
    if (!this.dragging) return;
    this.targetYaw += dx * TUNE.rotationSensitivity;
    this.targetTilt = Math.max(
      -TUNE.rotationTiltLimit,
      Math.min(
        TUNE.rotationTiltLimit,
        this.targetTilt + dy * TUNE.rotationSensitivity * 0.42,
      ),
    );
    if (Math.abs(dx) + Math.abs(dy) > 2) this.demonstrated = true;
  }
  end(momentum = true) {
    if (this.dragging && momentum)
      this.targetYaw += this.velocity * TUNE.rotationMomentum;
    this.dragging = false;
  }
  cancel() {
    this.dragging = false;
    this.targetYaw = this.yaw;
    this.targetTilt = this.tilt;
    this.velocity = this.tiltVelocity = 0;
  }
  home() {
    this.end(false);
    this.targetYaw =
      this.yaw + Math.atan2(-Math.sin(this.yaw), Math.cos(this.yaw));
    this.targetTilt = 0;
  }
  update(dt: number) {
    let time = Math.min(dt, 0.1);
    while (time > 0) {
      const h = Math.min(time, 1 / 120);
      this.velocity +=
        ((this.targetYaw - this.yaw) * TUNE.rotationSpring -
          this.velocity * TUNE.rotationDamping) *
        h;
      this.tiltVelocity +=
        ((this.targetTilt - this.tilt) * TUNE.rotationSpring -
          this.tiltVelocity * TUNE.rotationDamping) *
        h;
      this.yaw += this.velocity * h;
      this.tilt += this.tiltVelocity * h;
      this.tilt = Math.max(
        -TUNE.rotationTiltLimit,
        Math.min(TUNE.rotationTiltLimit, this.tilt),
      );
      time -= h;
    }
    if (
      Math.abs(this.targetYaw - this.yaw) < 0.00001 &&
      Math.abs(this.velocity) < 0.001
    ) {
      this.yaw = this.targetYaw;
      this.velocity = 0;
    }
  }
}
