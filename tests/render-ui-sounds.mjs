// jsfxr is used as an offline material generator, never as an arcade preset player.
import { sfxr } from 'jsfxr';
import { mkdir, writeFile } from 'node:fs/promises';
await mkdir('public/sounds', { recursive: true });
for (let variant = 0; variant < 3; variant++) {
  const definition = {
    ...sfxr.generate('click'),
    wave_type: 3,
    oldParams: true,
    p_env_attack: 0.008,
    p_env_sustain: 0.025,
    p_env_decay: 0.12 + variant * 0.006,
    p_env_punch: 0,
    p_base_freq: 0.18,
    p_freq_ramp: 0,
    p_freq_dramp: 0,
    p_vib_strength: 0,
    p_arp_mod: 0,
    p_repeat_speed: 0,
    p_lpf_freq: 0.24,
    p_lpf_ramp: 0,
    p_lpf_resonance: 0.12,
    p_hpf_freq: 0.06,
    p_hpf_ramp: 0,
    p_pha_offset: 0,
    p_pha_ramp: 0,
    sound_vol: 0.3,
    sample_rate: 44100,
    sample_size: 16,
  };
  const wave = sfxr.toWave(definition);
  const data = Buffer.from(wave.dataURI.split(',')[1], 'base64');
  await writeFile(`public/sounds/latch-${variant}.wav`, data);
  console.log(
    `Latch ${variant}: ${data.length} bytes, ${(data.length - 44) / 88200}s`,
  );
}
