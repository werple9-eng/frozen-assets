// Presentation springs use bounded substeps, retain velocity on retarget, and
// settle exactly. No timers, React renders, or gameplay state live here.
export class Spring {
  velocity = 0;
  target: number;
  constructor(
    public value = 0,
    public stiffness = 260,
    public damping = 23,
  ) {
    this.target = value;
  }
  set(value: number) {
    this.value = this.target = value;
    this.velocity = 0;
  }
  kick(velocity: number) {
    this.velocity += velocity;
  }
  step(dt: number, reduced = false) {
    let remaining = Math.max(0, Math.min(dt, 0.1));
    while (remaining > 0.000001) {
      const h = Math.min(remaining, 1 / 240);
      const k = reduced ? 540 : this.stiffness;
      const c = reduced ? 48 : this.damping;
      this.velocity += ((this.target - this.value) * k - this.velocity * c) * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    if (
      Math.abs(this.target - this.value) < 0.0005 &&
      Math.abs(this.velocity) < 0.005
    )
      this.set(this.target);
    return this.value;
  }
  get moving() {
    return this.value !== this.target || this.velocity !== 0;
  }
}

export const TOOL_MOTION = {
  hand: {
    lift: 0.26,
    recoil: 0.32,
    twist: 0.07,
    weight: 0.18,
    stiffness: 510,
    damping: 29,
  },
  grip: {
    lift: 0.34,
    recoil: 0.45,
    twist: -0.1,
    weight: 0.24,
    stiffness: 450,
    damping: 25,
  },
  pick: {
    lift: 0.64,
    recoil: 0.94,
    twist: -0.22,
    weight: 0.4,
    stiffness: 360,
    damping: 21,
  },
  heavy: {
    lift: 0.84,
    recoil: 1.12,
    twist: 0.25,
    weight: 0.67,
    stiffness: 265,
    damping: 19,
  },
  sledge: {
    lift: 1.2,
    recoil: 1.48,
    twist: 0.38,
    weight: 1,
    stiffness: 195,
    damping: 17,
  },
  breaker: {
    lift: 0.22,
    recoil: 0.23,
    twist: 0.035,
    weight: 0.48,
    stiffness: 650,
    damping: 29,
  },
  thermal: {
    lift: 0.1,
    recoil: 0.12,
    twist: 0.02,
    weight: 0.08,
    stiffness: 310,
    damping: 26,
  },
} as const;

// Punctuation provides breathing room, while each glyph gets its own impulse.
export function letterSchedule(text: string, start = 0, interval = 32) {
  let time = start;
  return Array.from(text).map((character) => {
    const at = time;
    time += /[.!?]/.test(character)
      ? Math.max(interval, 130)
      : /[,;:]/.test(character)
        ? Math.max(interval, 85)
        : character === ' '
          ? interval
          : interval;
    return { character, at };
  });
}
