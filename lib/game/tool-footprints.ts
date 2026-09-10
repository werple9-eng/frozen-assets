import type { ToolId } from './campaign-content';
/** Fan spreads across the face; its penetration is a fraction of lateral reach. */
export const THERMAL_FAN_DEPTH_SCALE = 0.45;
/** World-unit working radii for the 0.30-unit grid. Legacy/taught parcels retain their old tools. */
export const TOOL_FOOTPRINTS: Record<ToolId, number> = {
  hand: 0.34,
  grip: 0.34,
  pick: 0.52,
  heavy: 0.6,
  sledge: 0.8,
  breaker: 0.57,
  thermal: 0.85,
};
