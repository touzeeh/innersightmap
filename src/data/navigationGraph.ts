/**
 * Builds the navigation graph from the structured building data.
 *
 * Node kinds:
 *   junction  corridor intersection or bend on a centreline
 *   door      doorway on a room wall, joined to the corridor junction it opens onto
 *   room      room centre (also the destination pin for that room)
 *   lift      corridor-side node of the elevator on one floor
 *   stair     corridor-side node of the staircase on one floor
 *   entrance  exterior entrance inside the building
 *
 * Rooms are dead ends: a room's centre connects only to its own doorway, so a
 * route can never cut through a room to reach another corridor. Rooms with
 * publicAccess set to false get no doorway edge and are unreachable.
 *
 * Node id scheme:
 *   junction  "<floor>@<x>,<z>"        e.g. "G@-12,0"
 *   lift      "<floor>@lift"           e.g. "2@lift"
 *   stair     "<floor>@stair"          e.g. "2@stair"
 *   door      "<roomId>#door"          e.g. "G-REC#door"
 *   room      "<roomId>"               e.g. "G-REC"
 *   entrance  "<entrance id>"          e.g. "EXT-MAIN"
 */
import { CONNECTORS, ENTRANCES } from './connectors';
import { BLOCKS, CORRIDORS, LIFT_POINT, STAIR_POINT } from './layout';
import { ROOMS } from './rooms';
import { FLOORS, floorById } from './floors';
import type { ConnectorDef, EntranceDef, Level, Point, RoomDef } from '../types/building';
import type { EdgeKind, NavEdge, NavigationGraph, NavNode, NavNodeType } from '../types/navigation';

/** Vertical travel costs, in metre-equivalents used only for route choice. */
export const LIFT_BASE_COST = 30;
export const LIFT_COST_PER_LEVEL = 4;
export const STAIR_FLIGHT_COST = 14;
/** Horizontal run of one staircase flight, in metres (z-span of the stair shaft). */
export const STAIR_RUN_METERS = 3;

export interface GraphData {
  rooms: readonly RoomDef[];
  connectors: readonly ConnectorDef[];
  entrances: readonly EntranceDef[];
}

const EPS = 1e-6;

function pointKey(x: number, z: number): string {
  return `${round(x)},${round(z)}`;
}

function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function dist(ax: number, az: number, bx: number, bz: number): number {
  return Math.hypot(bx - ax, bz - az);
}

/** Corridor junction positions per corridor, in walking order. */
function corridorPoints(): { corridor: string; points: Point[] }[] {
  return CORRIDORS.map((corridor) => ({ corridor: corridor.id, points: [...(corridor.points ?? [corridor.from, corridor.to])] }));
}

export function buildNavigationGraph(data: GraphData = { rooms: ROOMS, connectors: CONNECTORS, entrances: ENTRANCES }): NavigationGraph {
  const nodes = new Map<string, NavNode>();
  const adjacency = new Map<string, NavEdge[]>();

  const addNode = (node: NavNode): void => {
    if (nodes.has(node.id)) throw new Error(`Duplicate navigation node ${node.id}`);
    nodes.set(node.id, node);
    adjacency.set(node.id, []);
  };

  const addEdge = (a: string, b: string, edge: { cost: number; meters: number; kind: EdgeKind; corridor?: string }): void => {
    adjacency.get(a)!.push({ to: b, ...edge });
    adjacency.get(b)!.push({ to: a, ...edge });
  };

  // Connector lookup by plan position so a corridor junction at a lift or
  // stair point becomes that connector's node.
  const connectorAt = new Map<string, ConnectorDef>();
  for (const c of data.connectors) connectorAt.set(pointKey(c.point[0], c.point[1]), c);

  // 1. Corridor junctions, one set per floor. Floors share the same skeleton.
  for (const floor of FLOORS) {
    const fid = floor.id;
    for (const line of corridorPoints()) {
      let previous: string | null = null;
      let prevPoint: Point | null = null;
      for (const p of line.points) {
        const connector = connectorAt.get(pointKey(p[0], p[1]));
        const id = connector && connector.levels.includes(floor.level)
          ? connectorNodeId(connector.kind, floor.level)
          : `${fid}@${round(p[0])},${round(p[1])}`;
        if (!nodes.has(id)) {
          const type: NavNodeType = connector && connector.levels.includes(floor.level)
            ? (connector.kind as NavNodeType)
            : 'junction';
          addNode({
            id,
            level: floor.level,
            x: p[0],
            z: p[1],
            type,
            name: connector && connector.levels.includes(floor.level) ? connector.name : undefined,
            nameHi: connector && connector.levels.includes(floor.level) ? connector.nameHi : undefined,
            corridor: type === 'junction' ? line.corridor : undefined,
          });
        }
        if (previous && prevPoint) {
          const d = dist(prevPoint[0], prevPoint[1], p[0], p[1]);
          addEdge(previous, id, { cost: d, meters: d, kind: 'walk', corridor: line.corridor });
        }
        previous = id;
        prevPoint = p;
      }
    }
  }

  // 2. Rooms, doorways and their connections to the corridor network.
  for (const room of data.rooms) {
    const block = BLOCKS[room.block];
    if (!block) throw new Error(`Room ${room.id} references unknown block ${room.block}`);
    const cx = (block.rect.x0 + block.rect.x1) / 2;
    const cz = (block.rect.z0 + block.rect.z1) / 2;
    const fid = floorById(room.level).id;

    // The room's pin sits on the line through its doorway, so walking from the
    // corridor into the room is one straight run with no false turn.
    const doorOnHorizontalWall = room.door[1] === block.rect.z0 || room.door[1] === block.rect.z1;
    const pinX = doorOnHorizontalWall ? room.door[0] : cx;
    const pinZ = doorOnHorizontalWall ? cz : room.door[1];

    addNode({
      id: room.id,
      level: room.level,
      x: round(pinX),
      z: round(pinZ),
      type: 'room',
      name: room.name,
      nameHi: room.nameHi,
    });

    if (room.publicAccess === false) continue;

    const doorId = `${room.id}#door`;
    addNode({ id: doorId, level: room.level, x: room.door[0], z: room.door[1], type: 'door', name: room.name, nameHi: room.nameHi });
    const junctionId = `${fid}@${round(room.junction[0])},${round(room.junction[1])}`;
    if (!nodes.has(junctionId)) {
      throw new Error(`Room ${room.id} opens onto ${junctionId}, which is not a corridor junction`);
    }
    const jNode = nodes.get(junctionId)!;
    const doorToJunction = dist(room.door[0], room.door[1], jNode.x, jNode.z);
    if (doorToJunction > 2 + EPS) {
      throw new Error(`Room ${room.id} door is too far from its junction`);
    }
    addEdge(doorId, junctionId, { cost: doorToJunction, meters: doorToJunction, kind: 'walk' });
    const toPin = dist(room.door[0], room.door[1], round(pinX), round(pinZ));
    addEdge(doorId, room.id, { cost: toPin, meters: toPin, kind: 'walk' });
  }

  // 3. Exterior entrances, joined to a room inside the building.
  for (const entrance of data.entrances) {
    const fid = floorById(entrance.level).id;
    const id = entrance.id;
    addNode({ id, level: entrance.level, x: entrance.point[0], z: entrance.point[1], type: 'entrance', name: entrance.name, nameHi: entrance.nameHi });
    const target = nodes.get(entrance.connectsTo);
    if (!target || target.level !== entrance.level) {
      throw new Error(`Entrance ${entrance.id} must connect to a room on floor ${fid}`);
    }
    const d = dist(entrance.point[0], entrance.point[1], target.x, target.z);
    addEdge(id, entrance.connectsTo, { cost: d, meters: d, kind: 'entrance' });
  }

  // 4. Vertical connectors. Lifts join every pair of stops; stairs join neighbours.
  for (const connector of data.connectors) {
    const stops = connector.levels.map((level) => ({ level, id: connectorNodeId(connector.kind, level) }));
    for (const stop of stops) {
      if (!nodes.has(stop.id)) throw new Error(`Connector ${connector.id} has no node on level ${stop.level}`);
    }
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const a = stops[i];
        const b = stops[j];
        const span = Math.abs(a.level - b.level);
        if (connector.kind === 'stair') {
          if (span !== 1) continue;
          addEdge(a.id, b.id, { cost: STAIR_FLIGHT_COST, meters: STAIR_RUN_METERS, kind: 'stair' });
        } else {
          addEdge(a.id, b.id, { cost: LIFT_BASE_COST + LIFT_COST_PER_LEVEL * span, meters: 0, kind: 'lift' });
        }
      }
    }
  }

  // A direct glass crossing exists on Floor 2 only; every other floor must
  // route around the open courtyard galleries.
  const bridgeWest = nodes.get(connectorNodeId('lift', 2));
  const bridgeEast = nodes.get(connectorNodeId('stair', 2));
  if (bridgeWest && bridgeEast) {
    addEdge(bridgeWest.id, bridgeEast.id, { cost: 16, meters: 16, kind: 'walk', corridor: 'skybridge-floor2' });
  }
  const wingBBridge = nodes.get(junctionNodeId(2, -34, 12));
  const wingCBridge = nodes.get(junctionNodeId(2, 34, 12));
  if (wingBBridge && wingCBridge) {
    addEdge(wingBBridge.id, wingCBridge.id, { cost: 68, meters: 68, kind: 'walk', corridor: 'skybridge-floor2' });
  }

  return { nodes, adjacency };
}

/** Node id of a connector on a given level. */
export function connectorNodeId(kind: 'lift' | 'lift-b' | 'stair', level: Level): string {
  return `${floorById(level).id}@${kind}`;
}

/** Node id of a corridor junction on a given level. */
export function junctionNodeId(level: Level, x: number, z: number): string {
  return `${floorById(level).id}@${round(x)},${round(z)}`;
}

export const LIFT_NODE_POINT: Point = LIFT_POINT;
export const STAIR_NODE_POINT: Point = STAIR_POINT;

/** Shared singleton graph used by the application. */
let cached: NavigationGraph | null = null;
export function getNavigationGraph(): NavigationGraph {
  if (!cached) cached = buildNavigationGraph();
  return cached;
}
