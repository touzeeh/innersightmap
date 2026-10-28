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

/** Walkable corridor floors, one slab per corridor centreline. */
export function CorridorPlates({ materials }: { materials: SceneMaterials }) {
  const geometries = useMemo(
    () =>
      CORRIDORS.map((corridor) => {
        const rect = corridorRect(corridor.from, corridor.to);
        const geometry = new BoxGeometry(rect.x1 - rect.x0, PLATE_THICKNESS, rect.z1 - rect.z0);
        geometry.translate((rect.x0 + rect.x1) / 2, -PLATE_THICKNESS / 2, (rect.z0 + rect.z1) / 2);
        const alongX = Math.abs(corridor.to[0] - corridor.from[0]) >= Math.abs(corridor.to[1] - corridor.from[1]);
        const stripes = [-1, 1].map((side) => {
          const stripe = new BoxGeometry(alongX ? rect.x1 - rect.x0 : 0.07, 0.035, alongX ? 0.07 : rect.z1 - rect.z0);
          stripe.translate((rect.x0 + rect.x1) / 2 + (alongX ? 0 : side * (CORRIDOR_WIDTH / 2 - 0.24)), 0.025, (rect.z0 + rect.z1) / 2 + (alongX ? side * (CORRIDOR_WIDTH / 2 - 0.24) : 0));
          return stripe;
        });
        return { floor: geometry, stripes };
      }),
    [],
  );

  useEffect(() => () => geometries.forEach(({ floor, stripes }) => { floor.dispose(); stripes.forEach((g) => g.dispose()); }), [geometries]);

  return (
    <>
      {geometries.map(({ floor, stripes }, i) => (
        <group key={CORRIDORS[i].id}>
          <mesh geometry={floor} material={materials.floors.corridor} receiveShadow />
          {stripes.map((geometry, stripeIndex) => <mesh key={stripeIndex} geometry={geometry} material={materials.routeGlow} renderOrder={4} />)}
        </group>
      ))}
    </>
  );
}
