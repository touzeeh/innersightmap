import { useEffect, useMemo } from 'react';
import { BoxGeometry } from 'three';
import { CORRIDORS } from '../data/layout';
import { CORRIDOR_WIDTH, type Rect } from '../types/building';
import type { SceneMaterials } from './palette';
import { PLATE_THICKNESS } from './levels';

/** Centreline of a corridor widened by half its width at both ends, as a plan rectangle. */
export function corridorRect(from: readonly [number, number], to: readonly [number, number]): Rect {
  const half = CORRIDOR_WIDTH / 2;
  return {
    x0: Math.min(from[0], to[0]) - half,
    x1: Math.max(from[0], to[0]) + half,
    z0: Math.min(from[1], to[1]) - half,
    z1: Math.max(from[1], to[1]) + half,
  };
}

/** Walkable corridor floors as clean matte-white slabs. */
export function CorridorPlates({ materials }: { materials: SceneMaterials }) {
  const geometries = useMemo(
    () =>
      CORRIDORS.map((corridor) => {
        const rect = corridorRect(corridor.from, corridor.to);
        const geometry = new BoxGeometry(rect.x1 - rect.x0, PLATE_THICKNESS, rect.z1 - rect.z0);
        geometry.translate((rect.x0 + rect.x1) / 2, -PLATE_THICKNESS / 2, (rect.z0 + rect.z1) / 2);
        return geometry;
      }),
    [],
  );

  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries]);

  return (
    <>
      {geometries.map((geometry, i) => <mesh key={CORRIDORS[i].id} geometry={geometry} material={materials.floors.corridor} receiveShadow />)}
    </>
  );
}
