/**
 * Building model types. All coordinates are in metres in a building-local
 * frame: x grows east, z grows south, the building is centred on (0, 0) and
 * level 0 sits at y = 0. Floor elevation is computed in three/levels.ts.
 */

/** Stable floor identifier as shown to visitors ("G", "1", "2", "3"). */
export type FloorId = 'G' | '1' | '2' | '3';

/** Numeric floor level, 0 = ground. Used for graph maths and 3D positioning. */
export type Level = 0 | 1 | 2 | 3;

export interface FloorDef {
  level: Level;
  id: FloorId;
  label: string;
  name: string;
  nameHi: string;
}

/** Categories drive colour, icon and search-by-category behaviour. */
export type RoomCategory =
  | 'entrance'
  | 'reception'
  | 'emergency'
  | 'clinical'
  | 'lab'
  | 'imaging'
  | 'pharmacy'
  | 'ward'
  | 'waiting'
  | 'washroom'
  | 'staff'
  | 'restricted';

/** Axis-aligned rectangle on the floor plan (metres). */
export interface Rect {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

/** A point on the floor plan (metres). */
export type Point = readonly [x: number, z: number];

/** A named planning block that rooms are placed into (see data/layout.ts). */
export interface BlockDef {
  id: string;
  rect: Rect;
}

export interface RoomDef {
  /** Globally unique id, e.g. "G-REC" or "2-XR". Also the room's navigation node id. */
  id: string;
  level: Level;
  name: string;
  nameHi: string;
  roomNumber?: string;
  category: RoomCategory;
  /** Planning block id from data/layout.ts; determines the rectangle. */
  block: string;
  /** Doorway position on the room's wall. */
  door: Point;
  /** Corridor junction the doorway opens onto. Must be a junction in the layout. */
  junction: Point;
  /** False keeps the room visible on the map but excludes it from routing. */
  publicAccess?: boolean;
  /** Optional exterior door (used for the main entrance). */
  exteriorDoor?: Point;
}

/** A vertical connector (lift or stair) that joins one or more floors. */
export interface ConnectorDef {
  id: string;
  kind: 'lift' | 'lift-b' | 'stair';
  name: string;
  nameHi: string;
  /** Position of the connector's corridor-side node on each floor. */
  point: Point;
  /** Levels the connector serves. Stairs must only serve adjacent levels. */
  levels: readonly Level[];
}

/** An exterior entrance that the visitor can start navigation from. */
export interface EntranceDef {
  id: string;
  name: string;
  nameHi: string;
  level: Level;
  /** Point just inside the building, joined to `connectsTo`. */
  point: Point;
  connectsTo: string;
}

/** Corridor centreline used for drawing and junction placement. */
export interface CorridorDef {
  id: string;
  label: string;
  labelHi: string;
  /** Start and end of the centreline. */
  from: Point;
  to: Point;
  /** Optional ordered nodes for a multi-turn corridor chain. */
  points?: readonly Point[];
}

/** Corridor centreline width in metres. */
export const CORRIDOR_WIDTH = 3;
