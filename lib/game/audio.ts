import { confirmationSample, type ConfirmationKind } from './purchase-sound';
import { TUNE } from './tuning';
import { phoneRingSample, type PhoneRing } from './phone-call';
export type RoomState = {
  ringing?: boolean;
  inCall?: boolean;
  settlement?: boolean;
  ice?: boolean;
};
export class GameAudio {
  ctx?: AudioContext;
  master?: GainNode;
  hiss?: GainNode;
  contact?: GainNode;
  filter?: BiquadFilterNode;
  sources: AudioBufferSourceNode[] = [];
  voices = 0;
  letterVoices = 0;
  lettersPlayed = 0;
  active = false;
  masterVolume = 0.65;
  effects = 0.7;
  muted = false;
  wood?: AudioBuffer;
  materials = new Map<string, AudioBuffer[]>();
  ambience?: GainNode;
  ambienceFilter?: BiquadFilterNode;
  roomBeat = -1;
  hum?: GainNode;
  reverb?: ConvolverNode;
  nextMidground = 0;
  recentEvents: string[] = [];
  compressorAt = 0;
  compressorUntil = 0;
  nextEventAt: Record<string, number> = {};
  lastUI = -Infinity;
  uiPlayed = 0;
  uiSuppressed = 0;
  ringBuffer?: AudioBuffer;
  institutionalRingBuffer?: AudioBuffer;
  ringSource?: AudioBufferSourceNode;
  stopRing() {
    try {
      this.ringSource?.stop();
    } catch {
      /* already ended */
    }
    this.ringSource = undefined;
  }
  ring(kind: PhoneRing = 'private') {
    if (!this.ctx || !this.master || this.muted || this.ctx.state !== 'running')
      return;
    const ctx = this.ctx;
    const bufferKey =
      kind === 'institutional' ? 'institutionalRingBuffer' : 'ringBuffer';
    if (!this[bufferKey]) {
      const sample = phoneRingSample(ctx.sampleRate, kind);
      this[bufferKey] = ctx.createBuffer(1, sample.length, ctx.sampleRate);
      this[bufferKey]!.getChannelData(0).set(sample);
    }
    this.stopRing();
    const src = ctx.createBufferSource(),
      gain = ctx.createGain();
    src.buffer = this[bufferKey]!;
    gain.gain.value = this.effects * 0.46;
    src.connect(gain);
    gain.connect(this.master);
    src.start();
    this.ringSource = src;
    src.onended = () => {
      src.disconnect();
      gain.disconnect();
      if (this.ringSource === src) this.ringSource = undefined;
    };
  }
  dial(key: string) {
    this.init();
    if (this.muted || !this.ctx || !this.master) return;
    const index = '123456789*0#'.indexOf(key);
    if (index < 0) return;
    const t = this.ctx.currentTime;
    for (const hz of [
      [697, 770, 852, 941][Math.floor(index / 3)],
      [1209, 1336, 1477][index % 3],
    ]) {
      const o = this.ctx.createOscillator(),
        g = this.ctx.createGain();
      o.frequency.value = hz;
      g.gain.setValueAtTime(0.022 * this.effects, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      o.connect(g);
      g.connect(this.master);
      o.start(t);
      o.stop(t + 0.13);
      o.onended = () => {
        o.disconnect();
        g.disconnect();
      };
    }
  }
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
    const buzz = ctx.createBuffer(
        1,
        Math.floor(ctx.sampleRate * 0.22),
        ctx.sampleRate,
      ),
      buzzData = buzz.getChannelData(0);
    for (let i = 0; i < buzzData.length; i++) {
      const t = i / ctx.sampleRate;
      buzzData[i] =
        Math.sin(t * 6.283 * 135) *
        Math.sin((Math.PI * t) / 0.22) ** 2 *
        (0.22 + 0.06 * Math.sin(t * 6.283 * 39));
    }
    this.materials.set('phone', [buzz]);
    const synth = (
      kind: string,
      duration: number,
      make: (t: number, noise: number, i: number) => number,
      variants = 2,
    ) => {
      const list: AudioBuffer[] = [];
      for (let v = 0; v < variants; v++) {
        const b = ctx.createBuffer(
            1,
            Math.ceil(ctx.sampleRate * duration),
            ctx.sampleRate,
          ),
          d = b.getChannelData(0);
        for (let i = 0; i < d.length; i++)
          d[i] =
            Math.min(1, i / (ctx.sampleRate * 0.0008)) *
            make(i / ctx.sampleRate, Math.random() * 2 - 1, v);
        list.push(b);
      }
      this.materials.set(kind, list);
    };
    // Ceramic tap, paper slide, conduit tick, distant door, distant cart, drip.
    synth(
      'mug',
      0.1,
      (t, n, v) =>
        Math.sin(t * 6.283 * (2350 + v * 180)) * Math.exp(-t * 62) * 0.5 +
        Math.sin(t * 6.283 * 3900) * Math.exp(-t * 95) * 0.18 +
        n * Math.exp(-t * 900) * 0.15,
    );
    let slide = 0;
    synth('paper', 0.17, (t, n) => {
      slide = (slide + n * 0.5) / 1.35;
      return (n - slide) * Math.min(1, t / 0.02) * Math.exp(-t * 20) * 0.28;
    });
    synth(
      'knock',
      0.13,
      (t, n, v) =>
        Math.sin(t * 6.283 * (1580 + v * 220)) * Math.exp(-t * 68) * 0.4 +
        Math.sin(t * 6.283 * 2650) * Math.exp(-t * 110) * 0.14 +
        n * Math.exp(-t * 600) * 0.2,
    );
    let low = 0;
    synth('door', 0.55, (t, n) => {
      low = (low + n * 0.25) / 1.25;
      return (
        low * Math.exp(-t * 8.5) * 0.7 +
        Math.sin(t * 6.283 * 68) * Math.exp(-t * 13) * 0.35
      );
    });
    let roll = 0;
    synth('cart', 2.9, (t, n) => {
      roll = (roll + n * 0.35) / 1.3;
      const rattle = n * Math.exp(-((t * 4.7) % 1) * 9) * 0.12;
      return (
        (roll * (0.55 + 0.45 * Math.sin(t * 6.283 * 6.5)) + rattle) *
        Math.sin((Math.PI * t) / 2.9) *
        0.3
      );
    });
    synth(
      'drip',
      0.15,
      (t, n) =>
        Math.sin(t * 6.283 * (1250 - t * 2200)) * Math.exp(-t * 38) * 0.36 +
        n * Math.exp(-t * 500) * 0.05,
    );
    this.master.gain.value = this.muted ? 0 : this.masterVolume * this.effects;
    const limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -15;
    limiter.ratio.value = 7;
    this.master.connect(limiter);
    limiter.connect(ctx.destination);
    // One short, damped room: ~0.3s tail, lowpassed so reflections stay small.
    const ir = ctx.createBuffer(
      2,
      Math.floor(ctx.sampleRate * 0.34),
      ctx.sampleRate,
    );
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) {
        const t = i / ctx.sampleRate;
        d[i] =
          t < 0.008 ? 0 : (Math.random() * 2 - 1) * Math.exp(-t * 11) * 0.5;
      }
    }
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = ir;
    const reverbLow = ctx.createBiquadFilter();
    reverbLow.type = 'lowpass';
    reverbLow.frequency.value = 4200;
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.9;
    this.reverb.connect(reverbLow);
    reverbLow.connect(reverbGain);
    reverbGain.connect(this.master);
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
    const room = ctx.createBufferSource();
    room.buffer = buffer;
    room.loop = true;
    this.ambienceFilter = ctx.createBiquadFilter();
    this.ambienceFilter.type = 'lowpass';
    this.ambienceFilter.frequency.value = 165;
    this.ambience = ctx.createGain();
    this.ambience.gain.value = 0.035;
    room.connect(this.ambienceFilter);
    this.ambienceFilter.connect(this.ambience);
    this.ambience.connect(this.master);
    room.start();
    this.sources.push(room);
    // Refrigeration undertone: a narrow band of the same noise, never a pure tone.
    const humSource = ctx.createBufferSource();
    humSource.buffer = buffer;
    humSource.loop = true;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'bandpass';
    humFilter.frequency.value = 92;
    humFilter.Q.value = 3.2;
    this.hum = ctx.createGain();
    this.hum.gain.value = 0.02;
    humSource.connect(humFilter);
    humFilter.connect(this.hum);
    this.hum.connect(this.master);
    humSource.start();
    this.sources.push(humSource);
    this.volume();
    for (const kind of [
      'purchase',
      'unlock',
      'tool-acquired',
      'delivery',
    ] as ConfirmationKind[]) {
      const variants = Array.from({ length: 4 }, (_, i) => {
        const samples = confirmationSample(ctx.sampleRate, kind, i);
        const buffer = ctx.createBuffer(1, samples.length, ctx.sampleRate);
        buffer.copyToChannel(samples, 0);
        return buffer;
      });
      this.materials.set(kind, variants);
    }
  }

  volume() {
    if (this.ctx && this.master)
      this.master.gain.setTargetAtTime(
        this.muted ? 0 : this.masterVolume * this.effects,
        this.ctx.currentTime,
        0.025,
      );
  }
  // Three tiers. Background: HVAC bed and a refrigeration undertone with an
  // irregular compressor cycle. Midground: rare, irregular building events that
  // never repeat back to back and never interrupt a call. Foreground sounds are
  // triggered by the objects themselves.
  room(
    time: number,
    paused: boolean,
    entering: number,
    vaultPhase?: number,
    state: RoomState = {},
  ) {
    if (!this.ctx || !this.ambience || !this.ambienceFilter) return;
    const now = this.ctx.currentTime;
    if (time >= this.compressorAt) {
      this.compressorUntil = time + 8 + Math.random() * 8;
      this.compressorAt = this.compressorUntil + 28 + Math.random() * 27;
    }
    const running = time < this.compressorUntil;
    const bed =
      (paused ? 0.014 : 0.036) *
      (1 - entering * 0.7) *
      (vaultPhase === 4 ? 0.25 : 1 + (vaultPhase ?? 0) * 0.12) *
      (state.ringing ? 0.71 : 1) *
      (state.settlement ? 0.85 : 1);
    this.ambience.gain.setTargetAtTime(
      bed * (running ? 1.25 : 1),
      now,
      running ? 1.4 : 2.2,
    );
    this.ambienceFilter.frequency.setTargetAtTime(
      (running ? 205 : 150) + (vaultPhase === 4 ? -45 : (vaultPhase ?? 0) * 18),
      now,
      0.8,
    );
    this.hum?.gain.setTargetAtTime(
      bed * (running ? 1.9 : 0.75),
      now,
      running ? 1.6 : 2.6,
    );
    if (!this.nextMidground) this.nextMidground = time + 6 + Math.random() * 6;
    if (time < this.nextMidground || paused || state.inCall || state.ringing)
      return;
    const spans: Record<string, [number, number]> = {
      knock: [18, 50],
      door: [60, 150],
      cart: [90, 180],
      drip: [20, 55],
    };
    const candidates = Object.keys(spans).filter(
      (k) =>
        (k !== 'drip' || state.ice) &&
        time >= (this.nextEventAt[k] ?? 0) &&
        !this.recentEvents.includes(k),
    );
    this.nextMidground = time + 7 + Math.random() * 6;
    if (!candidates.length) return;
    const pick = candidates[Math.floor(Math.random() * candidates.length)];
    const [min, max] = spans[pick];
    this.nextEventAt[pick] = time + min + Math.random() * (max - min);
    this.recentEvents = [pick, ...this.recentEvents].slice(0, 2);
    this.physical(
      pick,
      pick === 'door'
        ? 0.22
        : pick === 'cart'
          ? 0.14
          : pick === 'drip'
            ? 0.2
            : 0.18,
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
  letter(character: string, weight = 1) {
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.master ||
      this.muted ||
      !this.wood ||
      !/[\p{L}\p{N}]/u.test(character)
    )
      return;
    // The same cached wood sample, tiny and dry. No per-letter synthesis/filter.
    const source = this.ctx.createBufferSource(),
      gain = this.ctx.createGain();
    source.buffer = this.wood;
    source.playbackRate.value = 1.7 + (character.charCodeAt(0) % 7) * 0.07;
    gain.gain.value = 0.024 * weight;
    source.connect(gain);
    gain.connect(this.master);
    this.letterVoices++;
    this.lettersPlayed++;
    source.start();
    source.stop(this.ctx.currentTime + 0.025);
    source.onended = () => {
      this.letterVoices--;
      source.disconnect();
      gain.disconnect();
    };
  }
  sound(kind: string, intensity = 1) {
    if (kind === 'mug' || kind === 'paper' || kind === 'knock') {
      this.physical(kind, intensity);
      return;
    }
    if (kind === 'stamp') {
      this.physical('tray', 0.85);
      this.physical('cash', 0.5);
      this.ui('press');
      return;
    }
    if (kind === 'chisel' || kind === 'pick') {
      this.physical('chip', intensity * (kind === 'pick' ? 0.95 : 0.65));
      this.physical('coin', kind === 'pick' ? 0.14 : 0.085);
      if (kind === 'pick') this.physical('crack', 0.2);
      return;
    }
    if (['purchase', 'unlock', 'tool-acquired', 'delivery'].includes(kind)) {
      this.physical(kind, kind === 'purchase' ? 0.82 : 1);
      return;
    }
    if (kind === 'unavailable') {
      this.ui(kind);
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
    if (this.reverb) {
      const wet = this.ctx.createGain();
      wet.gain.value =
        kind === 'crack' ? 0.07 : kind === 'phone' ? 0.025 : 0.045;
      gain.connect(wet);
      wet.connect(this.reverb);
      src.addEventListener('ended', () => wet.disconnect());
    }
    this.voices++;
    src.start();
    src.onended = () => {
      this.voices--;
      src.disconnect();
      gain.disconnect();
    };
  }
  ui(kind: string) {
    if (['purchase', 'unlock', 'tool-acquired', 'delivery'].includes(kind)) {
      this.sound(kind);
      return;
    }
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
      kind !== 'hover' &&
      ((!['purchase', 'unlock'].includes(kind) && now - this.lastUI < 0.045) ||
        this.voices >= TUNE.audioVoices)
    ) {
      this.uiSuppressed++;
      return;
    }
    if (kind !== 'hover') this.lastUI = now;
    this.uiPlayed++;
    // Hover entries overlap freely and never consume the gameplay voice pool.
    if (kind !== 'hover') this.voices++;
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
      if (kind !== 'hover') this.voices--;
      src.disconnect();
      gain.disconnect();
    };
  }
  dispose() {
    this.stopRing();
    this.fire(false, false);
    this.sources.forEach((s) => s.stop());
    void this.ctx?.close();
    this.ringBuffer = this.institutionalRingBuffer = undefined;
  }
}
