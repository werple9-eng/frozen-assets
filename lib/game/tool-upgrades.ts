import { TOOLS, type ToolId } from './campaign-content';
import type { Upgrade } from './model';

export type UpgradeLevels = Record<Upgrade, number>;
export type ToolUpgradeLevels = Record<ToolId, UpgradeLevels>;
export function freshToolUpgrades(
  baseline: UpgradeLevels = { heat: 0, tank: 0, wide: 0, residual: 0 },
): ToolUpgradeLevels {
  return Object.fromEntries(
    TOOLS.map((t) => [t.id, { ...baseline }]),
  ) as ToolUpgradeLevels;
}
export function copyToolUpgrades(levels: ToolUpgradeLevels): ToolUpgradeLevels {
  return Object.fromEntries(
    TOOLS.map((t) => [t.id, { ...levels[t.id] }]),
  ) as ToolUpgradeLevels;
}
export const TOOL_FITTINGS: Record<
  ToolId,
  {
    names: Record<Upgrade, string>;
    descriptions: Record<Upgrade, string>;
    force: number;
    speed: number;
    radius: number;
    fracture: number;
  }
> = {
  hand: {
    names: {
      heat: 'Honed edge',
      tank: 'Light grip',
      wide: 'Broad blade',
      residual: 'Scored cuts',
    },
    descriptions: {
      heat: 'A sharper edge cuts deeper with each tap.',
      tank: 'A lighter grip shortens the reset between taps.',
      wide: 'A broader blade chips a wider patch.',
      residual: 'Scored cuts spread small fractures around the blade.',
    },
    force: 0.045,
    speed: 0.035,
    radius: 0.035,
    fracture: 0.07,
  },
  grip: {
    names: {
      heat: 'Hardened blade',
      tank: 'Return spring',
      wide: 'Chisel shoulder',
      residual: 'Repeat fractures',
    },
    descriptions: {
      heat: 'A hardened blade delivers stronger repeated cuts.',
      tank: 'A stronger return spring speeds up held strikes.',
      wide: 'A wider shoulder opens the cut around the blade.',
      residual: 'Repeated impacts fracture the ice around each cut.',
    },
    force: 0.05,
    speed: 0.05,
    radius: 0.035,
    fracture: 0.075,
  },
  pick: {
    names: {
      heat: 'Tempered point',
      tank: 'Balanced haft',
      wide: 'Wider bite',
      residual: 'Hairline cracks',
    },
    descriptions: {
      heat: 'A tempered point drives deeper into hard ice.',
      tank: 'A balanced haft brings the pick back sooner.',
      wide: 'The pick removes a wider bite at the point.',
      residual: 'Hairline cracks carry damage beyond the point.',
    },
    force: 0.06,
    speed: 0.035,
    radius: 0.04,
    fracture: 0.08,
  },
  heavy: {
    names: {
      heat: 'Forged head',
      tank: 'Counterweight',
      wide: 'Splitting wedge',
      residual: 'Fault lines',
    },
    descriptions: {
      heat: 'More weight behind the forged head increases impact.',
      tank: 'A counterweight shortens the heavy pick’s recovery.',
      wide: 'A broader wedge splits a larger patch.',
      residual: 'Heavy strikes drive fractures out along fault lines.',
    },
    force: 0.075,
    speed: 0.04,
    radius: 0.045,
    fracture: 0.09,
  },
  sledge: {
    names: {
      heat: 'Head mass',
      tank: 'Rebound grip',
      wide: 'Broad face',
      residual: 'Shockwave',
    },
    descriptions: {
      heat: 'A heavier head crushes more ice on impact.',
      tank: 'The rebound grip returns the hammer sooner.',
      wide: 'A broad striking face spreads the impact area.',
      residual: 'A shockwave cracks ice outside the striking face.',
    },
    force: 0.09,
    speed: 0.045,
    radius: 0.05,
    fracture: 0.1,
  },
  breaker: {
    names: {
      heat: 'Drive piston',
      tank: 'Cycle motor',
      wide: 'Chipper head',
      residual: 'Vibration',
    },
    descriptions: {
      heat: 'A stronger piston drives each powered stroke deeper.',
      tank: 'The cycle motor increases the rate of powered strikes.',
      wide: 'A wider chipper head clears a broader patch.',
      residual: 'Vibration fractures the ice around each stroke.',
    },
    force: 0.05,
    speed: 0.04,
    radius: 0.04,
    fracture: 0.085,
  },
  thermal: {
    names: {
      heat: 'Heat output',
      tank: 'Fuel tank',
      wide: 'Fan nozzle',
      residual: 'Afterheat',
    },
    descriptions: {
      heat: 'Increase local heat output.',
      tank: 'Carry more fuel between refills.',
      wide: 'Melt a wider patch with the fan nozzle.',
      residual: 'Leave warmth that keeps melting after you move.',
    },
    force: 0,
    speed: 0,
    radius: 0,
    fracture: 0,
  },
};
