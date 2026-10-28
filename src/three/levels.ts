/**
 * Vertical layout of the building. Every 3D element that sits on a floor, the
 * avatar, the lift car and the route line uses levelToY(), so they stay aligned
 * when the floors are exploded apart.
 */
export const FLOOR_HEIGHT = 6;
/** Extra vertical gap added between floors at full explode. */
export const EXPLODE_GAP = 12.5;
export const PLATE_THICKNESS = 0.3;
export const WALL_HEIGHT = 3.4;
export const CUTAWAY_WALL_HEIGHT = 0.9;
/** Vertical steps in each stair flight. */
export const STAIR_TREADS = 12;

/** World y of the top surface of a floor at a (possibly fractional) level. */
export function levelToY(level: number, explode: number): number {
  return level * (FLOOR_HEIGHT + explode * EXPLODE_GAP);
}
