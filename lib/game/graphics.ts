// Presentation budgets only. Ice topology, tool timing and rewards are identical
// at every setting. Keep buffers sized to Ultra; changing quality never rebuilds
// the workshop or its saved state.
export const GRAPHICS_LEVELS = ['low', 'medium', 'high', 'ultra'] as const;
export type GraphicsQuality = (typeof GRAPHICS_LEVELS)[number];
export const GRAPHICS = {
  low: {
    label: 'Low',
    description: 'A lighter workshop. Built for smooth play.',
    resolution: 0.8,
    pixelRatio: 1,
    shadowSize: 0,
    shadowBlur: 0,
    dust: 48,
    mist: 0,
    particles: 24,
  },
  medium: {
    label: 'Medium',
    description: 'Soft drifting dust and cool air around the tray.',
    resolution: 1,
    pixelRatio: 1.25,
    shadowSize: 512,
    shadowBlur: 4,
    dust: 110,
    mist: 10,
    particles: 36,
  },
  high: {
    label: 'High',
    description: 'Rich lamplight, curling cold air and soft shadows.',
    resolution: 1,
    pixelRatio: 1.65,
    shadowSize: 1024,
    shadowBlur: 8,
    dust: 220,
    mist: 22,
    particles: 48,
  },
  ultra: {
    label: 'Ultra',
    description: 'The fullest atmosphere, finest shadows and crispest detail.',
    resolution: 1,
    pixelRatio: 2,
    shadowSize: 2048,
    shadowBlur: 12,
    dust: 360,
    mist: 36,
    particles: 64,
  },
} as const;
export function graphicsQuality(value: unknown): GraphicsQuality {
  return GRAPHICS_LEVELS.includes(value as GraphicsQuality)
    ? (value as GraphicsQuality)
    : 'high';
}
export function graphicsBudget(value: unknown, fewer = false, reduced = false) {
  const profile = GRAPHICS[graphicsQuality(value)];
  return {
    ...profile,
    dust: reduced ? 0 : fewer ? Math.min(24, profile.dust) : profile.dust,
    mist: reduced || fewer ? 0 : profile.mist,
    particles: fewer ? Math.min(18, profile.particles) : profile.particles,
  };
}
export function graphicsPixelRatio(value: unknown, deviceRatio: number) {
  const profile = GRAPHICS[graphicsQuality(value)];
  return (
    Math.min(Math.max(0.5, deviceRatio), profile.pixelRatio) *
    profile.resolution
  );
}
