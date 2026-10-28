import type { Level, RoomCategory } from './building';

export type Language = 'en' | 'hi';

/** A bilingual string. English is always present; Hindi falls back to English. */
export interface Localised {
  en: string;
  hi: string;
}

export type NavNodeType = 'junction' | 'door' | 'room' | 'lift' | 'lift-b' | 'stair' | 'entrance';

export interface NavNode {
  id: string;
  level: Level;
  x: number;
  z: number;
  type: NavNodeType;
  /** Human-readable name for room, connector or entrance nodes. */
  name?: string;
  nameHi?: string;
  /** Corridor id for junction nodes on a corridor centreline. */
  corridor?: string;
}

export type EdgeKind = 'walk' | 'lift' | 'stair' | 'entrance';

export interface NavEdge {
  to: string;
  /** Planning cost in metre-equivalents. Walking edges cost their length. */
  cost: number;
  /** Walking distance in metres (0 for vertical connector rides). */
  meters: number;
  kind: EdgeKind;
  corridor?: string;
}

export interface NavigationGraph {
  nodes: Map<string, NavNode>;
  adjacency: Map<string, NavEdge[]>;
}

export type TravelPreference = 'shortest' | 'step-free';

export type DestinationKind = 'room' | 'connector';

/** A searchable place the visitor can navigate to. */
export interface Destination {
  /** Equals the navigation node id it resolves to. */
  id: string;
  kind: DestinationKind;
  name: string;
  nameHi: string;
  category: RoomCategory | 'circulation';
  level: Level;
  roomNumber?: string;
  /** Whether a route exists from the main entrance in the current graph. */
  publicAccess: boolean;
}

export interface StartPoint {
  id: string;
  label: Localised;
  description: Localised;
}

export type InstructionKind =
  | 'start'
  | 'walk'
  | 'turn'
  | 'enter'
  | 'to-lift'
  | 'lift-ride'
  | 'lift-exit'
  | 'to-stair'
  | 'stair-climb'
  | 'stair-exit'
  | 'arrive';

export interface Instruction {
  index: number;
  kind: InstructionKind;
  /** Index into route.nodes at which this instruction becomes active. */
  nodeIndex: number;
  /** Cumulative walking metres from the start when this instruction activates. */
  distanceAt: number;
  level: Level;
  /** Target level for lift and stair instructions. */
  targetLevel?: Level;
  text: Localised;
}

export interface RouteSegmentSummary {
  kind: EdgeKind;
  level: Level;
  meters: number;
}

export interface RoutePlan {
  nodeIds: string[];
  /** Walking distance in metres (sum of horizontal legs). */
  distanceMeters: number;
  /** Estimated walking time in seconds, including connector waits. */
  estimatedSeconds: number;
  liftRides: number;
  stairFlights: number;
  levelsVisited: Level[];
  instructions: Instruction[];
  startId: string;
  destinationId: string;
  preference: TravelPreference;
}

export type PlanResult =
  | { ok: true; route: RoutePlan }
  | { ok: false; reason: 'same-location' | 'unknown-node' | 'no-route' | 'not-accessible'; message: Localised };

export type SearchStatus = 'none' | 'single' | 'ambiguous';

export interface SearchMatch {
  destination: Destination;
  score: number;
}

export interface SearchResolution {
  status: SearchStatus;
  /** The confident match when status is "single". */
  match?: Destination;
  /** Candidates when status is "ambiguous" (ordered best first). */
  options: Destination[];
}

export type NavStatus = 'idle' | 'navigating' | 'paused' | 'arrived';

export type CameraMode = 'overview' | 'floor' | 'follow' | 'firstperson' | 'topdown' | 'closeup';

export type PickMode = 'none' | 'start' | 'destination';
