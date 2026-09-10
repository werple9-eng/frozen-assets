import { STORY } from './campaign-content';
import { storySpeaker } from './major-story';

export type PhoneRing = 'private' | 'institutional';
export type IncomingCall = { event: string; line: number };

/** Both the physical phone and incoming banner resolve the same caller. */
export function incomingCallPresentation(call?: IncomingCall) {
  const event = call && STORY.find((event) => event.id === call.event);
  const message = event?.messages[call?.line ?? 0];
  const caller = message && storySpeaker(message.speaker);
  const institutional = caller?.institutional ?? false;
  return {
    ring: (institutional ? 'institutional' : 'private') as PhoneRing,
    institutional,
    label: institutional ? 'BELLWETHER NATIONAL' : 'INCOMING CALL',
    name: institutional ? caller!.name : undefined,
    department: institutional ? 'ASSET PRESERVATION' : undefined,
  };
}

/** Two cached, restrained landline signals; no persistent oscillators. */
export function phoneRingSample(sampleRate: number, kind: PhoneRing) {
  const duration = kind === 'institutional' ? 1.35 : 1.65;
  const data = new Float32Array(Math.ceil(sampleRate * duration));
  for (let i = 0; i < data.length; i++) {
    const t = i / sampleRate;
    if (kind === 'institutional') {
      // Short, even PBX pairs distinguish the bank's switchboard from Tony's
      // mechanical private-line ring without turning the call into an alarm.
      const start = [0, 0.24, 0.8, 1.04].find(
        (start) => t >= start && t < start + 0.14,
      );
      if (start === undefined) continue;
      const segment = t - start;
      const envelope =
        Math.min(1, segment / 0.008) * Math.min(1, (0.14 - segment) / 0.022);
      data[i] =
        envelope *
        (Math.sin(t * 2 * Math.PI * 660) * 0.17 +
          Math.sin(t * 2 * Math.PI * 880) * 0.045);
    } else {
      const segment = t < 0.62 ? t : t - 0.94;
      if (segment < 0 || segment > 0.62) continue;
      const envelope =
        Math.min(1, segment / 0.012) * Math.min(1, (0.62 - segment) / 0.04);
      data[i] =
        envelope *
        (0.45 + 0.55 * Math.sin(t * 2 * Math.PI * 23) ** 2) *
        (Math.sin(t * 2 * Math.PI * 480) * 0.18 +
          Math.sin(t * 2 * Math.PI * 620) * 0.12 +
          Math.sin(t * 2 * Math.PI * 960) * 0.035);
    }
  }
  return data;
}
