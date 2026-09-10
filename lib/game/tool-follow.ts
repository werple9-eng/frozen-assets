import { Vector3, Quaternion, Matrix4 } from 'three';

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
  private along = new Vector3(0, 0, 1);
  private across = new Vector3();
  private basis = new Matrix4();
  private up = new Vector3(0, 1, 0);
  private tilt = new Quaternion();
  private authoredAxis = new Vector3(1, 0, 0);
  // +Y leaves the contact surface; +Z runs toward the authored handle.
  // World-up supplies the side-face tangent. A horizontal camera preference
  // smoothly supplies the tangent as that projection vanishes on top faces.
  orient(cameraPosition: Vector3) {
    const n = this.smoothedNormal;
    this.along
      .copy(cameraPosition)
      .sub(this.displayPosition)
      .setY(0)
      .normalize()
      .multiplyScalar(Math.abs(n.y) ** 4);
    this.along.addScaledVector(this.up, 1 - Math.abs(n.y) ** 4);
    this.along.addScaledVector(n, -this.along.dot(n));
    if (this.along.lengthSq() < 0.0001)
      this.along.set(0, 0, 1).addScaledVector(n, -n.z);
    if (this.along.lengthSq() < 0.0001)
      this.along.set(1, 0, 0).addScaledVector(n, -n.x);
    this.along.normalize();
    if (this.along.y < -0.001) this.along.negate();
    this.across.crossVectors(n, this.along).normalize();
    this.along.crossVectors(this.across, n).normalize();
    this.basis.makeBasis(this.across, n, this.along);
    this.targetRotation
      .setFromRotationMatrix(this.basis)
      .multiply(this.tilt.setFromAxisAngle(this.authoredAxis, -0.58));
    this.guardHemisphere();
  }
  guardHemisphere() {
    this.along.set(0, 0, 1).applyQuaternion(this.targetRotation);
    if (this.along.y < -0.02)
      this.targetRotation.premultiply(
        this.tilt.setFromAxisAngle(this.smoothedNormal, Math.PI),
      );
    if (this.displayRotation.dot(this.targetRotation) < 0)
      this.targetRotation.set(
        -this.targetRotation.x,
        -this.targetRotation.y,
        -this.targetRotation.z,
        -this.targetRotation.w,
      );
  }
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
    if (angle > 10 * dt) this.identity.slerp(this.zero, 1 - (10 * dt) / angle);
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
