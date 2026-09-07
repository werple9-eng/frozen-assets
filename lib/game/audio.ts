import { TUNE } from './tuning';
export class GameAudio {
  ctx?: AudioContext;
  master?: GainNode;
  hiss?: GainNode;
  contact?: GainNode;
  filter?: BiquadFilterNode;
  sources: AudioBufferSourceNode[] = [];
  voices = 0;
  active = false;
  masterVolume = 0.65;
  effects = 0.7;
  muted = false;
  wood?: AudioBuffer;
  materials = new Map<string, AudioBuffer[]>();
  lastUI = -Infinity;
  uiPlayed = 0;
  uiSuppressed = 0;
  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = (this.ctx = new AudioContext());
    // Reusable, damped wooden resonances with a tiny broadband mallet attack.
    // The buffer avoids oscillator chirps and repeated hover allocations.
    this.wood = ctx.createBuffer(
      1,
      Math.floor(ctx.sampleRate * 0.085),
      ctx.sampleRate,
    );
    const wood = this.wood.getChannelData(0);
    for (let i = 0; i < wood.length; i++) {
      const t = i / ctx.sampleRate,
        attack = Math.min(1, t / 0.0015);
      wood[i] =
        attack *
        (Math.sin(t * 2 * Math.PI * 720) * Math.exp(-t * 85) * 0.48 +
          Math.sin(t * 2 * Math.PI * 1160) * Math.exp(-t * 120) * 0.16 +
          (Math.random() * 2 - 1) * Math.exp(-t * 700) * 0.06);
    }
    for (const kind of ['chip', 'crack', 'tray', 'coin', 'gold', 'cash']) {
      const variants: AudioBuffer[] = [];
      for (let v = 0; v < 3; v++) {
        const duration =
          kind === 'crack' ? 0.32 : kind === 'gold' ? 0.26 : 0.14;
        const sample = ctx.createBuffer(
          1,
          Math.ceil(ctx.sampleRate * duration),
          ctx.sampleRate,
        );
        const out = sample.getChannelData(0);
        let previous = 0;
        for (let i = 0; i < out.length; i++) {
          const t = i / ctx.sampleRate,
            noise = Math.random() * 2 - 1;
          const high = noise - previous;
          previous = noise;
          const frequency =
            kind === 'gold'
              ? 104
              : kind === 'coin'
                ? 1740
                : kind === 'tray'
                  ? 280
                  : 510;
          const ring =
            Math.sin(t * frequency * 6.283) * 0.32 +
            Math.sin(t * frequency * 1.493 * 6.283) * 0.13;
          const cracks =
            Math.exp(-t * 180) +
            (t > 0.025 + v * 0.004
              ? Math.exp(-(t - 0.025 - v * 0.004) * 220) * 0.4
              : 0);
          const attack = Math.min(1, t / 0.0008);
          out[i] =
            attack *
            (kind === 'cash'
              ? high * Math.exp(-t * 45) * 0.17
              : kind === 'chip' || kind === 'crack'
                ? high * cracks * 0.22 +
                  ring * Math.exp(-t * (kind === 'crack' ? 26 : 90)) * 0.25
                : ring * Math.exp(-t * (kind === 'gold' ? 22 : 48)) +
                  high * Math.exp(-t * 280) * 0.06);
        }
        variants.push(sample);
      }
      this.materials.set(kind, variants);
    }
    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.masterVolume * this.effects;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.ratio.value = 7;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate),
      data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < data.length; i++) {
      last = (last + Math.random() * 0.12 - 0.06) / 1.025;
      data[i] = last * 4;
    }
    for (let i = 0; i < 2; i++) {
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = i ? 'highpass' : 'bandpass';
      filter.frequency.value = i ? 2600 : 950;
      filter.Q.value = 0.45;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(filter);
      filter.connect(gain);
      gain.connect(this.master);
      src.start();
      this.sources.push(src);
      if (i) this.contact = gain;
      else {
        this.hiss = gain;
        this.filter = filter;
      }
    }
    this.volume();
    // Filtered jsfxr noise adds only a dry mechanical latch to purchase sounds.
    // Wood resonances remain the common hover/press voice. Cache once per session.
    void Promise.all(
      [0, 1, 2].map(async (i) => {
        const response = await fetch(`/sounds/latch-${i}.wav`);
        if (!response.ok) throw new Error('Sound unavailable');
        return ctx.decodeAudioData(await response.arrayBuffer());
      }),
    )
      .then((buffers) => {
        if (ctx.state !== 'closed') this.materials.set('latch', buffers);
      })
      .catch(() => {});
  }
  volume() {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.masterVolume * this.effects,
        this.ctx.currentTime,
        0.025,
      );
  }
  fire(on: boolean, contact: boolean, wide = false) {
    if (!this.ctx) return;
    if (on && !this.active) this.sound('ignite');
    this.active = on;
    this.hiss!.gain.setTargetAtTime(on ? 0.21 : 0, this.ctx.currentTime, 0.025);
    this.contact!.gain.setTargetAtTime(
      on && contact ? 0.14 : 0,
      this.ctx.currentTime,
      0.035,
    );
    this.filter!.frequency.setTargetAtTime(
      wide ? 650 : 1050,
      this.ctx.currentTime,
      0.06,
    );
  }
  sound(kind: string, intensity = 1) {
    if (['purchase', 'unlock', 'unavailable'].includes(kind)) {
      this.ui(kind);
      if (kind !== 'unavailable')
        this.physical(
          this.materials.has('latch') ? 'latch' : 'chip',
          kind === 'unlock' ? 0.5 : 0.3,
        );
      if (kind === 'unlock') this.physical('gold', 0.27);
      return;
    }
    if (this.materials.has(kind)) {
      this.physical(kind, intensity);
      return;
    }
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.master ||
      this.voices >= TUNE.audioVoices - 2
    )
      return;
    const ctx = this.ctx,
      t = ctx.currentTime;
    this.voices++;
    const osc = ctx.createOscillator(),
      gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(this.master);
    const freq: Record<string, number> = {
      coin: 1650,
      cash: 140,
      gold: 88,
      crack: 240,
      tick: 2300,
      collect: 950,
      purchase: 620,
      refill: 330,
      ignite: 180,
      unavailable: 110,
      complete: 780,
    };
    osc.type = ['crack', 'ignite', 'cash'].includes(kind) ? 'triangle' : 'sine';
    osc.frequency.setValueAtTime(
      (freq[kind] || 500) * (0.97 + Math.random() * 0.06),
      t,
    );
    // Utility sounds stay short and dry; no rising reward chirps.
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(
      Math.min(
        0.2,
        (kind === 'tick' ? 0.026 : kind === 'gold' ? 0.19 : 0.1) * intensity,
      ),
      t + 0.006,
    );
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    osc.start(t);
    osc.stop(t + 0.22);
    osc.onended = () => {
      this.voices--;
      osc.disconnect();
      gain.disconnect();
    };
  }
  physical(kind: string, intensity = 1) {
    if (
      !this.ctx ||
      !this.master ||
      this.ctx.state !== 'running' ||
      this.muted ||
      this.voices >=
        (kind === 'latch' ? TUNE.audioVoices : TUNE.audioVoices - 2)
    )
      return;
    const variants = this.materials.get(kind);
    if (!variants) return;
    const src = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    src.buffer = variants[Math.floor(Math.random() * variants.length)];
    src.playbackRate.value = 0.98 + Math.random() * 0.04;
    gain.gain.value =
      Math.min(0.65, intensity * (kind === 'crack' ? 0.55 : 0.42)) *
      (0.97 + Math.random() * 0.06);
    src.connect(gain);
    gain.connect(this.master);
    this.voices++;
    src.start();
    src.onended = () => {
      this.voices--;
      src.disconnect();
      gain.disconnect();
    };
  }
  ui(kind: string) {
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.wood ||
      !this.master ||
      this.muted
    )
      return;
    const now = this.ctx.currentTime;
    if (
      (!['purchase', 'unlock'].includes(kind) &&
        now - this.lastUI < (kind === 'hover' ? 0.14 : 0.045)) ||
      this.voices >=
        (kind === 'hover' ? TUNE.audioVoices - 3 : TUNE.audioVoices)
    ) {
      this.uiSuppressed++;
      return;
    }
    this.lastUI = now;
    this.uiPlayed++;
    this.voices++;
    const src = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    src.buffer = this.wood;
    src.playbackRate.value =
      (0.98 + Math.random() * 0.04) *
      (kind === 'hover'
        ? 1.08
        : kind === 'purchase' || kind === 'unlock'
          ? 0.92
          : kind === 'unavailable'
            ? 0.84
            : 0.97);
    gain.gain.value =
      kind === 'hover'
        ? 0.085
        : kind === 'unlock'
          ? 0.22
          : kind === 'purchase'
            ? 0.16
            : 0.13;
    gain.gain.value *= 0.96 + Math.random() * 0.08;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
    src.onended = () => {
      this.voices--;
      src.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    this.fire(false, false);
    this.sources.forEach((s) => s.stop());
    void this.ctx?.close();
  }
}
