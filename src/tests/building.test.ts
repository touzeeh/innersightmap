import { describe, expect, it } from 'vitest';
import { CONNECTORS, ENTRANCES } from '../data/connectors';
import { FLOORS } from '../data/floors';
import { BLOCKS, CORE, CORRIDOR_JUNCTIONS, CORRIDORS } from '../data/layout';
import { ROOMS } from '../data/rooms';
import { DESTINATIONS } from '../data/destinations';
import { buildNavigationGraph } from '../data/navigationGraph';
import { CORRIDOR_WIDTH, type Rect } from '../types/building';

const EPS = 1e-6;

function overlaps(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 - EPS && b.x0 < a.x1 - EPS && a.z0 < b.z1 - EPS && b.z0 < a.z1 - EPS;
}

function corridorRects(): Rect[] {
  const half = CORRIDOR_WIDTH / 2;
  return CORRIDORS.map((c) => ({
    x0: Math.min(c.from[0], c.to[0]) - half,
    x1: Math.max(c.from[0], c.to[0]) + half,
    z0: Math.min(c.from[1], c.to[1]) - half,
    z1: Math.max(c.from[1], c.to[1]) + half,
  }));
}

describe('building data integrity', () => {
  it('defines four floors with unique room ids', () => {
    expect(FLOORS.map((f) => f.level)).toEqual([0, 1, 2, 3]);
    const ids = ROOMS.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives every floor at least 8 destinations, counting lifts and stairs', () => {
    for (const floor of FLOORS) {
      const count = DESTINATIONS.filter((d) => d.level === floor.level).length;
      expect(count, `floor ${floor.id}`).toBeGreaterThanOrEqual(8);
      expect(count, `floor ${floor.id}`).toBeLessThanOrEqual(12);
    }
  });

  it('places every room inside its block and every door on the block boundary', () => {
    for (const room of ROOMS) {
      const block = BLOCKS[room.block];
      expect(block, `${room.id} block`).toBeDefined();
      const r = block.rect;
      const onBoundary =
        Math.abs(room.door[0] - r.x0) < EPS ||
        Math.abs(room.door[0] - r.x1) < EPS ||
        Math.abs(room.door[1] - r.z0) < EPS ||
        Math.abs(room.door[1] - r.z1) < EPS;
      expect(onBoundary, `${room.id} door on wall`).toBe(true);
    }
  });

  it('keeps room blocks clear of corridors and the vertical core', () => {
    const blockedRects = [...corridorRects(), CORE.lift, CORE.stair, CORE.service];
    for (const block of Object.values(BLOCKS)) {
      for (const blocked of blockedRects) {
        expect(overlaps(block.rect, blocked), `${block.id} overlaps a corridor or core`).toBe(false);
      }
    }
  });

  it('only opens rooms onto real corridor junctions', () => {
    const graph = buildNavigationGraph();
    for (const room of ROOMS) {
      if (room.publicAccess === false) continue;
      const floorId = FLOORS.find((f) => f.level === room.level)!.id;
      const key = `${floorId}@${room.junction[0]},${room.junction[1]}`;
      expect(graph.nodes.has(key), `${room.id} junction ${key}`).toBe(true);
    }
  });

  it('uses the same junction skeleton on every floor so lifts and stairs line up', () => {
    const graph = buildNavigationGraph();
    for (const floor of FLOORS) {
      for (const x of CORRIDOR_JUNCTIONS.main) {
        expect(graph.nodes.has(`${floor.id}@${x === -2 ? 'lift' : x === 2 ? 'stair' : `${x},0`}`)).toBe(true);
      }
    }
    expect(graph.nodes.get('G@lift')!.x).toBe(graph.nodes.get('3@lift')!.x);
    expect(graph.nodes.get('G@lift')!.z).toBe(graph.nodes.get('3@lift')!.z);
  });

  it('defines one elevator spanning all floors and stairs between neighbours only', () => {
    const lift = CONNECTORS.find((c) => c.kind === 'lift')!;
    const stair = CONNECTORS.find((c) => c.kind === 'stair')!;
    expect(lift.levels).toEqual([0, 1, 2, 3]);
    expect(stair.levels).toEqual([0, 1, 2, 3]);
    expect(ENTRANCES.map((e) => e.id)).toEqual(['EXT-MAIN', 'EXT-EMG']);
  });

  it('marks the restricted store as not publicly accessible', () => {
    const restricted = DESTINATIONS.find((d) => d.id === '2-RES');
    expect(restricted?.publicAccess).toBe(false);
  });
});
