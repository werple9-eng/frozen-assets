import test from 'node:test';
import assert from 'node:assert/strict';
import {
  incomingCallPresentation,
  phoneRingSample,
} from '../lib/game/phone-call';
import { GameAudio } from '../lib/game/audio';

void test('the physical ring and incoming banner distinguish every Mercer call from Tony and the epilogue', () => {
  for (const event of [
    'mercer.first',
    'mercer.exception',
    'mercer.access',
    'mercer.offer',
  ]) {
    const caller = incomingCallPresentation({ event, line: 0 });
    assert.equal(caller.ring, 'institutional');
    assert.equal(caller.institutional, true);
    assert.equal(caller.label, 'BELLWETHER NATIONAL');
    assert.equal(caller.name, 'HELEN MERCER');
    assert.equal(caller.department, 'ASSET PRESERVATION');
  }
  assert.equal(
    incomingCallPresentation({ event: 'ch5.notice', line: 0 }).ring,
    'institutional',
  );
  for (const event of [
    'ch2.ring',
    'tony.mercer.first',
    'tony.mercer.offer',
    'epilogue',
    'unknown',
  ]) {
    const caller = incomingCallPresentation({ event, line: 0 });
    assert.equal(caller.ring, 'private');
    assert.equal(caller.institutional, false);
    assert.equal(caller.label, 'INCOMING CALL');
  }
  assert.equal(incomingCallPresentation().ring, 'private');
});

void test('the institutional switchboard ring has four bounded pulses and a silent tail, distinct from the private line', () => {
  for (const rate of [22050, 44100, 48000]) {
    const institutional = phoneRingSample(rate, 'institutional');
    const privateLine = phoneRingSample(rate, 'private');
    assert.equal(institutional.length, Math.ceil(rate * 1.35));
    assert.equal(privateLine.length, Math.ceil(rate * 1.65));
    assert.ok(
      institutional.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.215),
    );
    assert.ok(
      privateLine.every((v) => Number.isFinite(v) && Math.abs(v) <= 0.335),
    );
    const energy = (sample: Float32Array, from: number, to: number) =>
      sample
        .subarray(Math.ceil(rate * from), Math.floor(rate * to))
        .reduce((sum, v) => sum + v * v, 0);
    for (const start of [0, 0.24, 0.8, 1.04])
      assert.ok(energy(institutional, start + 0.02, start + 0.1) > 0.1);
    for (const [from, to] of [
      [0.15, 0.23],
      [0.39, 0.79],
      [0.95, 1.03],
      [1.19, 1.35],
    ])
      assert.equal(energy(institutional, from, to), 0);
    assert.ok(
      energy(privateLine, 0.4, 0.5) > 1,
      'Tony retains the longer mechanical ring',
    );
    assert.equal(institutional[0], 0);
    assert.equal(institutional.at(-1), 0);
    assert.deepEqual(phoneRingSample(rate, 'institutional'), institutional);
  }
});

void test('repeated and switched incoming rings reuse two buffers, stop the prior voice and dispose cleanly', () => {
  class Source {
    buffer?: unknown;
    stopped = 0;
    disconnected = 0;
    onended?: () => void;
    connect() {}
    start() {}
    disconnect() {
      this.disconnected++;
    }
    stop() {
      this.stopped++;
      this.onended?.();
    }
  }
  let allocated = 0,
    closed = 0;
  const sources: Source[] = [];
  const ctx = {
    sampleRate: 44100,
    state: 'running',
    currentTime: 0,
    createBuffer(_channels: number, length: number) {
      allocated++;
      const data = new Float32Array(length);
      return { getChannelData: () => data };
    },
    createBufferSource() {
      const source = new Source();
      sources.push(source);
      return source;
    },
    createGain() {
      return { gain: { value: 0 }, connect() {}, disconnect() {} };
    },
    close() {
      closed++;
      return Promise.resolve();
    },
  };
  const audio = new GameAudio();
  audio.ctx = ctx as unknown as AudioContext;
  audio.master = {} as GainNode;
  audio.hiss = audio.contact = {
    gain: { setTargetAtTime() {} },
  } as unknown as GainNode;
  audio.filter = {
    frequency: { setTargetAtTime() {} },
  } as unknown as BiquadFilterNode;
  audio.ring('institutional');
  const bankBuffer = sources[0].buffer;
  audio.ring('institutional');
  assert.equal(allocated, 1);
  assert.equal(sources[1].buffer, bankBuffer);
  assert.equal(sources[0].stopped, 1);
  assert.equal(sources[0].disconnected, 1);
  audio.ring('private');
  assert.equal(allocated, 2);
  assert.notEqual(sources[2].buffer, bankBuffer);
  assert.equal(sources[1].stopped, 1);
  audio.ring('institutional');
  assert.equal(allocated, 2);
  assert.equal(sources[3].buffer, bankBuffer);
  audio.stopRing();
  assert.equal(audio.ringSource, undefined);
  assert.equal(sources[3].stopped, 1);
  audio.muted = true;
  audio.ring('private');
  assert.equal(sources.length, 4);
  audio.muted = false;
  audio.ring('institutional');
  audio.dispose();
  assert.equal(sources[4].stopped, 1);
  assert.equal(audio.ringSource, undefined);
  assert.equal(audio.ringBuffer, undefined);
  assert.equal(audio.institutionalRingBuffer, undefined);
  assert.equal(closed, 1);
});
