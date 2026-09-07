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
  init() {
    if (this.ctx) {
      void this.ctx.resume();
      return;
    }
    const ctx = (this.ctx = new AudioContext());
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
    if (
      !this.ctx ||
      this.ctx.state !== 'running' ||
      !this.master ||
      this.voices >= TUNE.audioVoices
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
    osc.frequency.exponentialRampToValueAtTime(
      (freq[kind] || 500) *
        (kind === 'purchase' || kind === 'complete' ? 1.5 : 0.62),
      t + 0.16,
    );
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
  dispose() {
    this.fire(false, false);
    this.sources.forEach((s) => s.stop());
    void this.ctx?.close();
  }
}
