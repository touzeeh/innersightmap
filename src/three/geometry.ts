/**
 * Procedural wall geometry. Walls are generated from room rectangles and door
 * openings, then merged into a single BufferGeometry per floor so the scene
 * uses a handful of draw calls rather than hundreds.
 */
import { BoxGeometry, BufferGeometry } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { DOOR_WIDTH } from '../data/layout';
import type { Point, Rect } from '../types/building';

const EPS = 1e-6;

export interface WallBox {
  cx: number;
  cz: number;
  sx: number;
  sz: number;
}

/**
 * Wall boxes around a rectangle, with a gap at each opening. Openings must lie
 * on the rectangle's boundary. Walls are centred on the boundary line.
 */
export function wallBoxesForRect(rect: Rect, openings: readonly Point[], thickness: number, openWidth = DOOR_WIDTH): WallBox[] {
  const boxes: WallBox[] = [];
  const half = openWidth / 2;

  // Gaps along one side, as [start, end] ranges in that side's free coordinate.
  const gapsOn = (side: 'north' | 'south' | 'west' | 'east'): [number, number][] => {
    const gaps: [number, number][] = [];
    for (const [x, z] of openings) {
      if ((side === 'north' || side === 'south') && Math.abs(z - (side === 'north' ? rect.z0 : rect.z1)) < EPS) {
        gaps.push([x - half, x + half]);
      } else if ((side === 'west' || side === 'east') && Math.abs(x - (side === 'west' ? rect.x0 : rect.x1)) < EPS) {
        gaps.push([z - half, z + half]);
      }
    }
    return gaps;
  };

  const runs = (from: number, to: number, gaps: [number, number][]): [number, number][] => {
    const sorted = [...gaps].sort((a, b) => a[0] - b[0]);
    const out: [number, number][] = [];
    let cursor = from;
    for (const [g0, g1] of sorted) {
      const start = Math.max(from, g0);
      const end = Math.min(to, g1);
      if (start > cursor + EPS) out.push([cursor, start]);
      cursor = Math.max(cursor, end);
    }
    if (cursor < to - EPS) out.push([cursor, to]);
    return out;
  };

  for (const [a, b] of runs(rect.x0, rect.x1, gapsOn('north'))) {
    boxes.push({ cx: (a + b) / 2, cz: rect.z0, sx: b - a + thickness, sz: thickness });
  }
  for (const [a, b] of runs(rect.x0, rect.x1, gapsOn('south'))) {
    boxes.push({ cx: (a + b) / 2, cz: rect.z1, sx: b - a + thickness, sz: thickness });
  }
  for (const [a, b] of runs(rect.z0, rect.z1, gapsOn('west'))) {
    boxes.push({ cx: rect.x0, cz: (a + b) / 2, sx: thickness, sz: b - a });
  }
  for (const [a, b] of runs(rect.z0, rect.z1, gapsOn('east'))) {
    boxes.push({ cx: rect.x1, cz: (a + b) / 2, sx: thickness, sz: b - a });
  }
  return boxes;
}

/** Merge wall boxes into one geometry standing on y = 0 with the given height. */
export function wallBoxesToGeometry(boxes: readonly WallBox[], height: number): BufferGeometry | null {
  if (boxes.length === 0) return null;
  const parts = boxes.map((box) => {
    const geometry = new BoxGeometry(box.sx, height, box.sz);
    geometry.translate(box.cx, height / 2, box.cz);
    return geometry;
  });
  const merged = mergeGeometries(parts, false);
  parts.forEach((g) => g.dispose());
  return merged;
}

/** A thin slab geometry for a rectangle, with its top surface at y = 0. */
export function slabGeometry(rect: Rect, thickness: number): BoxGeometry {
  const geometry = new BoxGeometry(rect.x1 - rect.x0, thickness, rect.z1 - rect.z0);
  geometry.translate((rect.x0 + rect.x1) / 2, -thickness / 2, (rect.z0 + rect.z1) / 2);
  return geometry;
}
