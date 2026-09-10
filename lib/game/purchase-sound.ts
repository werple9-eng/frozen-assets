export type ConfirmationKind =
  | 'purchase'
  | 'unlock'
  | 'tool-acquired'
  | 'delivery';
export type SoundCandidate = 'A' | 'B' | 'C';
// Offline sample construction keeps the mechanical attack aligned to the
// confirmation frame, independent of network fetches or oscillator scheduling.
export function confirmationSample(
  rate: number,
  kind: ConfirmationKind,
  variant = 0,
  candidate: SoundCandidate = 'B',
) {
  const duration =
    kind === 'purchase'
      ? 0.19
      : kind === 'unlock'
        ? 0.36
        : kind === 'tool-acquired'
          ? 0.56
          : 0.55;
  const data = new Float32Array(Math.ceil(rate * duration));
  let seed = 719 + variant * 139;
  const noise = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 2147483648 - 1;
  };
  const mass = kind === 'purchase' ? 1 : kind === 'unlock' ? 1.2 : 1.4;
  const pitch = 1 + (variant - 1.5) * 0.012;
  const bodyHz = candidate === 'A' ? 340 : candidate === 'B' ? 265 : 410;
  const bright = candidate === 'A' ? 0.12 : candidate === 'B' ? 0.075 : 0.045;
  const tone = (t: number, hz: number, decay: number) =>
    t < 0
      ? 0
      : Math.sin(t * hz * pitch * Math.PI * 2) *
        Math.min(1, t / 0.002) *
        Math.exp(-t * decay);
  for (let i = 0; i < data.length; i++) {
    const t = i / rate,
      attack = Math.min(1, t / 0.0007),
      n = noise();
    let value =
      tone(t, bodyHz / mass, 45 / mass) * 0.42 +
      tone(t, (bodyHz * 1.67) / mass, 65) * 0.11 +
      n * Math.exp(-t * 560) * 0.14;
    value += tone(t, 2200, 190) * bright;
    const tick = t - 0.034 - variant * 0.0015;
    if (tick >= 0)
      value += Math.sin(tick * 3100 * 6.283) * n * Math.exp(-tick * 180) * 0.08;
    if (kind === 'delivery') {
      value +=
        tone(t - 0.12, 160, 28) * 0.36 +
        noise() *
          Math.exp(-Math.max(0, t - 0.12) * 90) *
          (t > 0.12 ? 0.075 : 0);
      value +=
        tone(t - 0.22, 430, 22) * 0.025 + tone(t - 0.32, 540, 24) * 0.025;
    } else {
      value +=
        tone(t - 0.022, 480, 38) * 0.055 + tone(t - 0.082, 620, 42) * 0.047;
      if (kind !== 'purchase')
        value +=
          tone(t - 0.145, 740, 34) * 0.037 + tone(t - 0.014, 125, 20) * 0.12;
      if (kind === 'tool-acquired')
        value +=
          tone(t - 0.245, 830, 22) * 0.025 + tone(t - 0.11, 190, 24) * 0.2;
    }
    const tail = Math.min(1, (duration - t) / 0.012);
    data[i] = Math.tanh(value * attack) * tail;
  }
  return data;
}
