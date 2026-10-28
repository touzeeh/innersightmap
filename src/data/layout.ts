/**
 * Shared floor-plan skeleton for every storey of the fictional hospital.
 *
 * All floors use the same corridor network and core position so that lifts,
 * stairs and corridors line up vertically. Floors differ only in which rooms
 * are placed into each block (see data/rooms.ts).
 *
 * Units are metres. The original core is extended into OPD, emergency and
 * diagnostics wings around an open courtyard.
 */
import type { BlockDef, CorridorDef, Point, Rect } from '../types/building';

export const BUILDING_BOUNDS: Rect = { x0: -48, x1: 48, z0: -24, z1: 40 };

/** Thickness of interior and exterior walls in metres. */
export const WALL_THICKNESS = 0.25;

/** Width of a doorway opening in metres. */
export const DOOR_WIDTH = 1.6;

/** Corridor centrelines. Junctions are generated along these lines. */
export const CORRIDORS: readonly CorridorDef[] = [
  { id: 'main-west', label: 'central courtyard west passage', labelHi: 'आंगन का पश्चिमी गलियारा', from: [-16, 0], to: [-8, 0], points: [[-16, 0], [-12, 0], [-8, 0]] },
  { id: 'main-east', label: 'central courtyard east passage', labelHi: 'आंगन का पूर्वी गलियारा', from: [8, 0], to: [16, 0], points: [[8, 0], [12, 0], [16, 0]] },
  { id: 'north', label: 'north courtyard gallery', labelHi: 'उत्तरी आंगन गलियारा', from: [-16, 8], to: [16, 8], points: [[-16, 8], [-12, 8], [-8, 8], [-4, 8], [0, 8], [4, 8], [8, 8], [12, 8], [16, 8]] },
  { id: 'south', label: 'south courtyard gallery', labelHi: 'दक्षिणी आंगन गलियारा', from: [-16, -8], to: [16, -8], points: [[-16, -8], [-12, -8], [-8, -8], [-4, -8], [0, -8], [4, -8], [8, -8], [12, -8], [16, -8]] },
  { id: 'west', label: 'west wing connector', labelHi: 'पश्चिमी विंग गलियारा', from: [-16, -12], to: [-16, 12], points: [[-16, -12], [-16, -8], [-16, -4], [-16, 0], [-16, 4], [-16, 8], [-16, 12]] },
  { id: 'east', label: 'east wing connector', labelHi: 'पूर्वी विंग गलियारा', from: [16, -12], to: [16, 12], points: [[16, -12], [16, -8], [16, -4], [16, 0], [16, 4], [16, 8], [16, 12]] },
  { id: 'courtyard-west-edge', label: 'west courtyard edge', labelHi: 'आंगन का पश्चिमी किनारा', from: [-8, -8], to: [-8, 8], points: [[-8, -8], [-8, -4], [-8, 0], [-8, 4], [-8, 8]] },
  { id: 'courtyard-east-edge', label: 'east courtyard edge', labelHi: 'आंगन का पूर्वी किनारा', from: [8, -8], to: [8, 8], points: [[8, -8], [8, -4], [8, 0], [8, 4], [8, 8]] },
  { id: 'courtyard-crossing', label: 'central courtyard crossing', labelHi: 'केंद्रीय आंगन मार्ग', from: [0, -8], to: [0, 8], points: [[0, -8], [0, -4], [0, 0], [0, 4], [0, 8]] },
  { id: 'wing-b-link', label: 'trauma wing link', labelHi: 'ट्रॉमा विंग संपर्क', from: [-16, 0], to: [-34, 0], points: [[-16, 0], [-20, 0], [-24, 0], [-28, 0], [-34, 0]] },
  { id: 'wing-b-spine', label: 'Wing B trauma corridor', labelHi: 'विंग बी ट्रॉमा गलियारा', from: [-34, -12], to: [-34, 12], points: [[-34, -12], [-34, -8], [-34, 0], [-34, 8], [-34, 12]] },
  { id: 'wing-c-link', label: 'diagnostics tower link', labelHi: 'जांच टॉवर संपर्क', from: [16, 0], to: [34, 0], points: [[16, 0], [20, 0], [24, 0], [28, 0], [34, 0]] },
  { id: 'wing-c-spine', label: 'Wing C laboratory corridor', labelHi: 'विंग सी प्रयोगशाला गलियारा', from: [34, -12], to: [34, 12], points: [[34, -12], [34, -8], [34, 0], [34, 8], [34, 12]] },
  { id: 'wing-a-riser', label: 'OPD north connector', labelHi: 'ओपीडी उत्तरी संपर्क', from: [0, 8], to: [0, 22], points: [[0, 8], [0, 12], [0, 16], [0, 20], [0, 22]] },
  { id: 'wing-a-spine', label: 'Wing A OPD gallery', labelHi: 'विंग ए ओपीडी गलियारा', from: [-14, 22], to: [14, 22], points: [[-14, 22], [-10, 22], [-8, 22], [-4, 22], [0, 22], [4, 22], [8, 22], [10, 22], [14, 22]] },
];

/**
 * Junction coordinates for each corridor, ordered along its centreline.
 * Consecutive points on a line become a walkable edge. Shared corners
 * (for example (-16, 0)) are de-duplicated by position.
 */
export const CORRIDOR_JUNCTIONS: Record<'main' | 'north' | 'south' | 'west' | 'east', readonly number[]> = {
  main: [-16, -12, -8, -4, -2, 0, 2, 4, 8, 12, 16],
  north: [-16, -12, -8, -4, 0, 4, 8, 12, 16],
  south: [-16, -12, -8, -4, 0, 4, 8, 12, 16],
  west: [-12, -8, -4, 0, 4, 8, 12],
  east: [-12, -8, -4, 0, 4, 8, 12],
};

/** Positions of the lift and stair connector nodes on the main corridor. */
export const LIFT_POINT: Point = [-8, 0];
export const LIFT_B_POINT: Point = [34, 0];
export const STAIR_POINT: Point = [8, 0];

/** Vertical core: lift shaft and stairwell that open onto the main corridor. */
export const CORE = {
  lift: { x0: -9.5, x1: -6.5, z0: -1.5, z1: 1.5 } satisfies Rect,
  liftB: { x0: 32.5, x1: 35.5, z0: -1.5, z1: 1.5 } satisfies Rect,
  stair: { x0: 6.5, x1: 9.5, z0: -1.5, z1: 1.5 } satisfies Rect,
  /** Solid service block behind the shafts. */
  service: { x0: -4.5, x1: 4.5, z0: 4.5, z1: 6.5 } satisfies Rect,
};

/**
 * Planning blocks. Rooms are placed into these rectangles. The rectangles do
 * not overlap corridors or the vertical core.
 */
export const BLOCKS: Record<string, BlockDef> = {
  CNW: { id: 'CNW', rect: { x0: -14.5, x1: -4.5, z0: 1.5, z1: 6.5 } },
  CNE: { id: 'CNE', rect: { x0: 4.5, x1: 14.5, z0: 1.5, z1: 6.5 } },
  CNF1: { id: 'CNF1', rect: { x0: -14.5, x1: -5.5, z0: 9.5, z1: 15.5 } },
  CNF2: { id: 'CNF2', rect: { x0: -5.5, x1: 5.5, z0: 9.5, z1: 15.5 } },
  CNF3: { id: 'CNF3', rect: { x0: 5.5, x1: 14.5, z0: 9.5, z1: 15.5 } },
  CSN_W: { id: 'CSN_W', rect: { x0: -14.5, x1: -4.5, z0: -6.5, z1: -1.5 } },
  CSN_E: { id: 'CSN_E', rect: { x0: 4.5, x1: 14.5, z0: -6.5, z1: -1.5 } },
  CSC: { id: 'CSC', rect: { x0: -4.5, x1: 4.5, z0: -6.5, z1: -1.5 } },
  CSF_W: { id: 'CSF_W', rect: { x0: -14.5, x1: -5.5, z0: -15.5, z1: -9.5 } },
  CSF_C: { id: 'CSF_C', rect: { x0: -5.5, x1: 5.5, z0: -15.5, z1: -9.5 } },
  CSF_E: { id: 'CSF_E', rect: { x0: 5.5, x1: 14.5, z0: -15.5, z1: -9.5 } },
  WW1: { id: 'WW1', rect: { x0: -23.5, x1: -17.5, z0: -15.5, z1: -9.5 } },
  WW2: { id: 'WW2', rect: { x0: -23.5, x1: -17.5, z0: -7.5, z1: -1.5 } },
  WW3: { id: 'WW3', rect: { x0: -23.5, x1: -17.5, z0: 1.5, z1: 7.5 } },
  WW4: { id: 'WW4', rect: { x0: -23.5, x1: -17.5, z0: 8.5, z1: 15.5 } },
  EW1: { id: 'EW1', rect: { x0: 17.5, x1: 23.5, z0: -15.5, z1: -9.5 } },
  EW2: { id: 'EW2', rect: { x0: 17.5, x1: 23.5, z0: -7.5, z1: -1.5 } },
  EW3: { id: 'EW3', rect: { x0: 17.5, x1: 23.5, z0: 1.5, z1: 7.5 } },
  EW4: { id: 'EW4', rect: { x0: 17.5, x1: 23.5, z0: 8.5, z1: 15.5 } },
  WB1: { id: 'WB1', rect: { x0: -46, x1: -36, z0: -14, z1: -2 } },
  WB2: { id: 'WB2', rect: { x0: -46, x1: -36, z0: 2, z1: 14 } },
  WC1: { id: 'WC1', rect: { x0: 36, x1: 46, z0: -14, z1: -2 } },
  WC2: { id: 'WC2', rect: { x0: 36, x1: 46, z0: 2, z1: 14 } },
  WA1: { id: 'WA1', rect: { x0: -14, x1: -6, z0: 24, z1: 34 } },
  WA2: { id: 'WA2', rect: { x0: -4, x1: 4, z0: 24, z1: 34 } },
  WA3: { id: 'WA3', rect: { x0: 6, x1: 14, z0: 24, z1: 34 } },
};

/** Entrance that the visitor may start from, expressed as a point inside the building. */
export const EXTERIOR_DOORS: readonly Point[] = [
  [0, -16], // Main entrance, south face
  [-48, -8], // Emergency entrance, west face
];
