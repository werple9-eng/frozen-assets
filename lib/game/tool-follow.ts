import { Vector3, Quaternion } from 'three';

export class ToolFollow {
  targetPosition = new Vector3();
  displayPosition = new Vector3();
  targetNormal = new Vector3(0, 1, 0);
  smoothedNormal = new Vector3(0, 1, 0);
  targetRotation = new Quaternion();
  displayRotation = new Quaternion();
  initialized = false;
  private delta = new Vector3();
  private normalTurn = new Quaternion();
  private identity = new Quaternion();
  private candidate = new Quaternion();
  private zero = new Quaternion();
  // 40–50ms follow time. Large pointer moves raise the speed ceiling without
  // letting adjacent triangle normals snap the displayed tool around.
  followPosition(dt: number, pointerSpeed = 0) {
    dt = Math.min(0.05, Math.max(0, dt));
    if (!this.initialized) {
      this.displayPosition.copy(this.targetPosition);
      this.smoothedNormal.copy(this.targetNormal);
      this.initialized = true;
    }
    this.delta.copy(this.targetPosition).sub(this.displayPosition);
    const distance = this.delta.length(),
      speed = 25 + Math.min(135, pointerSpeed * 0.22) + distance * 14;
    this.delta.multiplyScalar(1 - Math.exp(-25 * dt));
    if (this.delta.length() > speed * dt) this.delta.setLength(speed * dt);
    this.displayPosition.add(this.delta);
    this.normalTurn.setFromUnitVectors(this.smoothedNormal, this.targetNormal);
    this.identity.identity().slerp(this.normalTurn, 1 - Math.exp(-23 * dt));
    const angle = this.identity.angleTo(this.zero);
    if (angle > 10 * dt)
      this.identity.slerp(this.zero, 1 - (10 * dt) / angle);
    this.smoothedNormal.applyQuaternion(this.identity).normalize();
  }
  followRotation(dt: number) {
    this.candidate
      .copy(this.displayRotation)
      .slerp(this.targetRotation, 1 - Math.exp(-26 * dt));
    this.displayRotation.rotateTowards(this.candidate, 14 * dt);
  }
  reset() {
    this.initialized = false;
  }
}
