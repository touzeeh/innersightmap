import type { FloorDef, Level } from '../types/building';

/**
 * Storeys of the fictional hospital. Level 0 is the ground floor.
 * Names are in English and Hindi for the UI and voice output.
 */
export const FLOORS: readonly FloorDef[] = [
  { level: 0, id: 'G', label: 'G', name: 'Ground floor', nameHi: 'भूतल' },
  { level: 1, id: '1', label: '1', name: 'Floor 1 · OPD', nameHi: 'पहली मंज़िल · ओपीडी' },
  { level: 2, id: '2', label: '2', name: 'Floor 2 · Diagnostics', nameHi: 'दूसरी मंज़िल · जाँच विभाग' },
  { level: 3, id: '3', label: '3', name: 'Floor 3 · Inpatient care', nameHi: 'तीसरी मंज़िल · इनडोर वार्ड' },
];

export const LEVELS: readonly Level[] = [0, 1, 2, 3];

export function floorById(level: Level): FloorDef {
  const floor = FLOORS.find((f) => f.level === level);
  if (!floor) throw new Error(`Unknown level ${level}`);
  return floor;
}
