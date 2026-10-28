/**
 * Searchable destinations and start points, derived from the room and
 * connector data. Every room and every connector stop is a destination, so
 * the search index is always in sync with the building model.
 */
import { CONNECTORS, ENTRANCES } from './connectors';
import { LEVELS } from './floors';
import { ROOMS } from './rooms';
import { connectorNodeId } from './navigationGraph';
import type { Destination, StartPoint } from '../types/navigation';

export const DESTINATIONS: readonly Destination[] = [
  ...ROOMS.map<Destination>((room) => ({
    id: room.id,
    kind: 'room',
    name: room.name,
    nameHi: room.nameHi,
    category: room.category,
    level: room.level,
    roomNumber: room.roomNumber,
    publicAccess: room.publicAccess !== false,
  })),
  ...LEVELS.flatMap<Destination>((level) =>
    CONNECTORS.map((connector) => ({
      id: connectorNodeId(connector.kind, level),
      kind: 'connector' as const,
      name: connector.kind === 'stair' ? 'Staircase' : `Elevator ${connector.kind === 'lift-b' ? 'B' : 'A'} Lobby`,
      nameHi: connector.kind === 'stair' ? 'सीढ़ियाँ' : `लिफ्ट ${connector.kind === 'lift-b' ? 'बी' : 'ए'} लॉबी`,
      category: 'circulation' as const,
      level,
      publicAccess: true,
    })),
  ),
];

export const START_POINTS: readonly StartPoint[] = [
  {
    id: 'EXT-MAIN',
    label: { en: 'Main Entrance', hi: 'मुख्य प्रवेश' },
    description: { en: 'Ground floor, south face', hi: 'भूतल, दक्षिणी ओर' },
  },
  {
    id: 'G-REC',
    label: { en: 'Reception', hi: 'रिसेप्शन' },
    description: { en: 'Ground floor, reception desk', hi: 'भूतल, रिसेप्शन डेस्क' },
  },
  {
    id: 'EXT-EMG',
    label: { en: 'Emergency Entrance', hi: 'इमरजेंसी प्रवेश' },
    description: { en: 'Ground floor, west ambulance side', hi: 'भूतल, पश्चिमी एम्बुलेंस ओर' },
  },
  {
    id: connectorNodeId('lift', 0),
    label: { en: 'Lift A Lobby', hi: 'लिफ्ट ए लॉबी' },
    description: { en: 'Ground floor, Main Wing elevator', hi: 'भूतल, मुख्य विंग लिफ्ट' },
  },
  {
    id: connectorNodeId('lift-b', 0),
    label: { en: 'Lift B Lobby', hi: 'लिफ्ट बी लॉबी' },
    description: { en: 'Ground floor, Diagnostics Tower elevator', hi: 'भूतल, जांच टॉवर लिफ्ट' },
  },
];

export const DEFAULT_START_ID = 'EXT-MAIN';

export function destinationById(id: string): Destination | undefined {
  return DESTINATIONS.find((d) => d.id === id);
}

export function isEntranceId(id: string): boolean {
  return ENTRANCES.some((e) => e.id === id);
}
