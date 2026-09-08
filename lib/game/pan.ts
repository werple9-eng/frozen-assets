export class TreePan {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  dragging = false;
  minX = -2000;
  maxX = 2000;
  minY = -3000;
  maxY = 1000;
  clamp() {
    this.x = Math.max(this.minX, Math.min(this.maxX, this.x));
    this.y = Math.max(this.minY, Math.min(this.maxY, this.y));
  }
  begin() {
    this.dragging = true;
    this.vx = this.vy = 0;
  }
  drag(dx: number, dy: number, dt: number) {
    if (!this.dragging) return;
    this.x += dx;
    this.y += dy;
    const elapsed = Math.max(0.008, Math.min(0.05, dt));
    this.vx = Math.max(
      -1700,
      Math.min(1700, this.vx * 0.4 + (dx / elapsed) * 0.6),
    );
    this.vy = Math.max(
      -1700,
      Math.min(1700, this.vy * 0.4 + (dy / elapsed) * 0.6),
    );
    // Soft resistance while held; the spring brings any excess home on release.
    this.x = Math.max(this.minX - 55, Math.min(this.maxX + 55, this.x));
    this.y = Math.max(this.minY - 55, Math.min(this.maxY + 55, this.y));
  }
  end(reduced = false) {
    this.dragging = false;
    this.vx *= reduced ? 0 : 0.78;
    this.vy *= reduced ? 0 : 0.78;
  }
  cancel() {
    this.dragging = false;
    this.vx = this.vy = 0;
  }
  update(dt: number) {
    if (this.dragging) return;
    dt = Math.min(0.033, Math.max(0, dt));
    this.vx *= Math.exp(-dt * 18);
    this.vy *= Math.exp(-dt * 18);
    const dx = Math.max(this.minX, Math.min(this.maxX, this.x)) - this.x;
    const dy = Math.max(this.minY, Math.min(this.maxY, this.y)) - this.y;
    if (dx) this.vx += (dx * 230 - this.vx * 19) * dt;
    if (dy) this.vy += (dy * 230 - this.vy * 19) * dt;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (Math.abs(dx) < 0.02 && Math.abs(this.vx) < 0.5) this.x += dx;
    if (Math.abs(dy) < 0.02 && Math.abs(this.vy) < 0.5) this.y += dy;
    if (Math.abs(this.vx) < 0.5) this.vx = 0;
    if (Math.abs(this.vy) < 0.5) this.vy = 0;
  }
}
