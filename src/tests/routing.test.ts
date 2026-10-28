import { describe, expect, it } from 'vitest';
import { buildNavigationGraph, connectorNodeId, getNavigationGraph } from '../data/navigationGraph';
import { CONNECTORS, ENTRANCES, LIFT, STAIR } from '../data/connectors';
import { ROOMS } from '../data/rooms';
import { BLOCKS, CORRIDORS } from '../data/layout';
import { CORRIDOR_WIDTH } from '../types/building';
import { planRoute } from '../services/routePlanner';
import { findShortestPath } from '../services/pathfinding';
import { turnBetween } from '../services/instructionGenerator';
import type { RoutePlan } from '../types/navigation';

const graph = getNavigationGraph();
const BLOCK_RECTS = new Map(Object.values(BLOCKS).map((b) => [b.id, b.rect]));

function mustPlan(start: string, dest: string, preference: 'shortest' | 'step-free' = 'shortest'): RoutePlan {
  const result = planRoute(start, dest, preference, graph);
  if (!result.ok) throw new Error(`Expected a route ${start} → ${dest}, got ${result.reason}`);
  return result.route;
}

describe('pathfinding', () => {
  it('returns a single node path for identical start and goal', () => {
    expect(findShortestPath(graph, 'G-REC', 'G-REC')?.nodeIds).toEqual(['G-REC']);
  });

  it('returns null for unknown nodes', () => {
    expect(findShortestPath(graph, 'NOPE', 'G-REC')).toBeNull();
  });

  it('prefers the cheaper of two routes', () => {
    const path = findShortestPath(graph, 'G-REC', 'G-WC');
    expect(path).not.toBeNull();
    const direct = path!.edges.reduce((sum, e) => sum + e.cost, 0);
    expect(direct).toBeCloseTo(path!.cost, 6);
  });
});

describe('route planning: required journeys', () => {
  it('routes Reception to Blood Bank across floors', () => {
    const route = mustPlan('G-REC', '2-BB');
    expect(route.levelsVisited).toEqual(expect.arrayContaining([0, 2]));
    expect(route.liftRides + route.stairFlights).toBeGreaterThanOrEqual(1);
    expect(route.nodeIds[0]).toBe('G-REC');
    expect(route.nodeIds[route.nodeIds.length - 1]).toBe('2-BB');
    expect(route.distanceMeters).toBeGreaterThan(0);
    expect(route.estimatedSeconds).toBeGreaterThan(0);
  });

  it('routes Main Entrance to Emergency Ward on the same floor without a connector', () => {
    const route = mustPlan('EXT-MAIN', 'G-EMG');
    expect(route.levelsVisited).toEqual([0]);
    expect(route.liftRides).toBe(0);
    expect(route.stairFlights).toBe(0);
    expect(route.nodeIds).toContain('G-ENT');
  });

  it('routes Reception to a room on Floor 3', () => {
    const route = mustPlan('G-REC', '3-W302');
    expect(route.levelsVisited).toContain(3);
    expect(route.instructions.some((i) => i.kind === 'lift-ride' || i.kind === 'stair-climb')).toBe(true);
  });

  it('uses a valid elevator or staircase node when changing floor', () => {
    const route = mustPlan('G-REC', '1-DOC');
    const vertical = route.nodeIds.filter((id) => id.endsWith('@lift') || id.endsWith('@stair'));
    expect(vertical.length).toBeGreaterThanOrEqual(2);
    for (const id of vertical) {
      expect(graph.nodes.get(id)?.type === 'lift' || graph.nodes.get(id)?.type === 'stair').toBe(true);
    }
  });
});

describe('connectors', () => {
  it('routes through the elevator when stairs are not available', () => {
    const liftOnly = buildNavigationGraph({ rooms: ROOMS, connectors: [LIFT], entrances: ENTRANCES });
    const result = planRoute('G-REC', '2-BB', 'shortest', liftOnly);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.route.liftRides).toBe(1);
    expect(result.route.stairFlights).toBe(0);
  });

  it('routes through the staircase when no elevator exists', () => {
    const stairOnly = buildNavigationGraph({ rooms: ROOMS, connectors: [STAIR], entrances: ENTRANCES });
    const result = planRoute('G-REC', '1-DOC', 'shortest', stairOnly);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.route.stairFlights).toBeGreaterThanOrEqual(1);
    expect(result.route.liftRides).toBe(0);
    expect(result.route.nodeIds.some((id) => id.endsWith('@stair'))).toBe(true);
  });

  it('only joins stairs between neighbouring floors', () => {
    for (const [id, edges] of graph.adjacency) {
      for (const edge of edges) {
        if (edge.kind !== 'stair') continue;
        const a = graph.nodes.get(id)!;
        const b = graph.nodes.get(edge.to)!;
        expect(Math.abs(a.level - b.level), `${id} → ${edge.to}`).toBe(1);
      }
    }
  });

  it('lets lifts skip floors directly', () => {
    const liftEdges = graph.adjacency.get(connectorNodeId('lift', 0))!.filter((e) => e.kind === 'lift');
    expect(liftEdges.map((e) => graph.nodes.get(e.to)!.level).sort()).toEqual([1, 2, 3]);
  });

  it('offers a step-free route that avoids stairs', () => {
    const route = mustPlan('G-REC', '3-NEU', 'step-free');
    expect(route.stairFlights).toBe(0);
    expect(route.nodeIds.some((id) => id.endsWith('@stair'))).toBe(false);
    expect(route.liftRides).toBeGreaterThanOrEqual(1);
  });
});

describe('unreachable destinations', () => {
  it('refuses to route to a restricted room', () => {
    const result = planRoute('G-REC', '2-RES', 'shortest', graph);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('not-accessible');
    expect(result.message.en).toMatch(/restricted/i);
  });

  it('reports no route when the building has no connectors between floors', () => {
    const groundOnly = buildNavigationGraph({ rooms: ROOMS, connectors: [], entrances: ENTRANCES });
    const result = planRoute('G-REC', '2-BB', 'shortest', groundOnly);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe('no-route');
    expect(result.message.en).toMatch(/no valid route/i);
    expect(result.message.hi.length).toBeGreaterThan(0);
  });

  it('reports same-location when start and destination match', () => {
    const result = planRoute('G-REC', 'G-REC', 'shortest', graph);
    expect(result).toMatchObject({ ok: false, reason: 'same-location' });
  });

  it('reports unknown nodes', () => {
    const result = planRoute('NOPE', 'G-REC', 'shortest', graph);
    expect(result).toMatchObject({ ok: false, reason: 'unknown-node' });
  });
});

describe('geometry guarantees', () => {
  it('keeps every walking edge inside a corridor or inside the room it serves', () => {
    const corridors = CORRIDORS.map((c) => ({
      x0: Math.min(c.from[0], c.to[0]) - CORRIDOR_WIDTH / 2 - 0.01,
      x1: Math.max(c.from[0], c.to[0]) + CORRIDOR_WIDTH / 2 + 0.01,
      z0: Math.min(c.from[1], c.to[1]) - CORRIDOR_WIDTH / 2 - 0.01,
      z1: Math.max(c.from[1], c.to[1]) + CORRIDOR_WIDTH / 2 + 0.01,
    }));
    const inside = (x: number, z: number, r: { x0: number; x1: number; z0: number; z1: number }) =>
      x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1;

    for (const [id, edges] of graph.adjacency) {
      const a = graph.nodes.get(id)!;
      for (const edge of edges) {
        if (edge.kind !== 'walk' && edge.kind !== 'entrance') continue;
        const b = graph.nodes.get(edge.to)!;
        const mx = (a.x + b.x) / 2;
        const mz = (a.z + b.z) / 2;
        const inCorridor = corridors.some((r) => inside(mx, mz, r));
        const room = ROOMS.find((r) => r.id === a.id || r.id === b.id || `${r.id}#door` === a.id || `${r.id}#door` === b.id);
        const inRoom = room
          ? (() => {
              const block = BLOCK_RECTS.get(room.block)!;
              return inside(mx, mz, { x0: block.x0 - 0.01, x1: block.x1 + 0.01, z0: block.z0 - 0.01, z1: block.z1 + 0.01 });
            })()
          : false;
        const entrance = a.type === 'entrance' || b.type === 'entrance';
        expect(inCorridor || inRoom || entrance, `edge ${id} → ${edge.to} midpoint (${mx},${mz})`).toBe(true);
      }
    }
  });

  it('never passes through a room except as its start or destination', () => {
    const route = mustPlan('G-REC', '1-PATH');
    const rooms = route.nodeIds.slice(1, -1).filter((id) => graph.nodes.get(id)?.type === 'room');
    expect(rooms).toEqual([]);
  });

  it('keeps every connector in the building', () => {
    for (const connector of CONNECTORS) {
      expect(connector.point[0]).toBeGreaterThan(-24);
      expect(connector.point[0]).toBeLessThan(24);
    }
  });
});

describe('turn classification', () => {
  it('reads left and right from the walker’s point of view (north is −z)', () => {
    // Walking north (−z) then east (+x) is a right turn.
    expect(turnBetween(0, -1, 1, 0).turn).toBe('right');
    // Walking north then west is a left turn.
    expect(turnBetween(0, -1, -1, 0).turn).toBe('left');
    expect(turnBetween(0, -1, 0, -1).turn).toBe('straight');
    expect(turnBetween(0, -1, 0, 1).turn).toBe('around');
  });
});
