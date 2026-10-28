/**
 * Vertical connectors. Each lift is a single shaft serving every level, and
 * each staircase serves adjacent levels only. Both open onto the main corridor
 * at the core positions defined in data/layout.ts.
 */
import type { ConnectorDef, EntranceDef } from '../types/building';
import { LIFT_B_POINT, LIFT_POINT, STAIR_POINT } from './layout';

export const LIFT: ConnectorDef = {
  id: 'LIFT-A',
  kind: 'lift',
  name: 'Elevator',
  nameHi: 'लिफ्ट',
  point: LIFT_POINT,
  levels: [0, 1, 2, 3],
};

export const LIFT_B: ConnectorDef = {
  id: 'LIFT-B',
  kind: 'lift-b',
  name: 'Elevator B',
  nameHi: 'लिफ्ट बी',
  point: LIFT_B_POINT,
  levels: [0, 1, 2, 3],
};

export const STAIR: ConnectorDef = {
  id: 'STAIR-A',
  kind: 'stair',
  name: 'Staircase',
  nameHi: 'सीढ़ियाँ',
  point: STAIR_POINT,
  levels: [0, 1, 2, 3],
};

export const CONNECTORS: readonly ConnectorDef[] = [LIFT, LIFT_B, STAIR];

/**
 * Exterior entrances that can serve as a start point. Each is joined to a
 * room inside the building so the route begins at the door.
 */
export const ENTRANCES: readonly EntranceDef[] = [
  {
    id: 'EXT-MAIN',
    name: 'Main Entrance',
    nameHi: 'मुख्य प्रवेश',
    level: 0,
    point: [0, -14],
    connectsTo: 'G-ENT',
  },
  {
    id: 'EXT-EMG',
    name: 'Emergency Entrance',
    nameHi: 'इमरजेंसी प्रवेश',
    level: 0,
    point: [-48, -8],
    connectsTo: 'B-EMG',
  },
];
