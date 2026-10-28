import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { BoxGeometry, BufferGeometry, Group } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CORE, LIFT_POINT } from '../data/layout';
import { LEVELS } from '../data/floors';
import { levelToY, STAIR_TREADS, WALL_HEIGHT } from './levels';
import type { SceneMaterials } from './palette';
import type { SceneBus } from './sceneBus';
import { useOwnedGeometry } from './useGeometry';

const CAR_HEIGHT = 2.9;

/** A box spanning the x/z rectangle `rect`, from `bottom` to `top` in world y. */
function shaftBox(rect: { x0: number; x1: number; z0: number; z1: number }, bottom: number, top: number): BufferGeometry {
  const width = rect.x1 - rect.x0;
  const height = top - bottom;
  const depth = rect.z1 - rect.z0;
  const geometry = new BoxGeometry(width, height, depth);
  geometry.translate((rect.x0 + rect.x1) / 2, (bottom + top) / 2, (rect.z0 + rect.z1) / 2);
  return geometry;
}

/** A box spanning the x/z rectangle `rect`, from `bottom` to `top` in world y. */
function shaftFrame(rect: { x0: number; x1: number; z0: number; z1: number }, bottom: number, top: number, floorYs: readonly number[]): BufferGeometry {
  const thickness = 0.12;
  const width = rect.x1 - rect.x0;
  const depth = rect.z1 - rect.z0;
  const parts: BufferGeometry[] = [];
  const addBar = (w: number, h: number, d: number, x: number, y: number, z: number): void => {
    const geometry = new BoxGeometry(w, h, d);
    geometry.translate(x, y, z);
    parts.push(geometry);
  };
  const middleY = (bottom + top) / 2;
  const height = top - bottom;
  for (const x of [rect.x0 + thickness / 2, rect.x1 - thickness / 2]) {
    for (const z of [rect.z0 + thickness / 2, rect.z1 - thickness / 2]) {
      addBar(thickness, height, thickness, x, middleY, z);
    }
  }
  const ringYs = [...new Set([bottom + thickness / 2, ...floorYs.filter((y) => y > bottom && y < top), top - thickness / 2])];
  for (const y of ringYs) {
    addBar(width, thickness, thickness, (rect.x0 + rect.x1) / 2, y, rect.z0 + thickness / 2);
    addBar(width, thickness, thickness, (rect.x0 + rect.x1) / 2, y, rect.z1 - thickness / 2);
    addBar(thickness, thickness, depth, rect.x0 + thickness / 2, y, (rect.z0 + rect.z1) / 2);
    addBar(thickness, thickness, depth, rect.x1 - thickness / 2, y, (rect.z0 + rect.z1) / 2);
  }
  const merged = mergeGeometries(parts, false);
  parts.forEach((part) => part.dispose());
  return merged ?? new BufferGeometry();
}

/** Each flight is a stepped run of treads climbing from the bottom of the stairwell to the top. */
function buildFlights(explode: number): BufferGeometry[] {
  const width = CORE.stair.x1 - CORE.stair.x0;
  const depth = (CORE.stair.z1 - CORE.stair.z0) / STAIR_TREADS;
  const flights: BufferGeometry[] = [];
  for (let level = 0; level < LEVELS.length - 1; level++) {
    const y0 = levelToY(level, explode);
    const rise = (levelToY(level + 1, explode) - y0) / STAIR_TREADS;
    const parts: BufferGeometry[] = [];
    for (let i = 0; i < STAIR_TREADS; i++) {
      const treadTop = y0 + (i + 1) * rise;
      const tread = shaftBox(
        { x0: CORE.stair.x0, x1: CORE.stair.x0 + width, z0: CORE.stair.z0 + depth * i, z1: CORE.stair.z0 + depth * (i + 1) },
        treadTop - rise,
        treadTop,
      );
      parts.push(tread);
    }
    const merged = mergeGeometries(parts, false);
    parts.forEach((p) => p.dispose());
    if (merged) flights.push(merged);
  }
  return flights;
}

export interface ConnectorsProps {
  explode: number;
  materials: SceneMaterials;
  bus: SceneBus;
  liftAActive: boolean;
  liftBActive: boolean;
}

/** Lift shaft with its moving car, stairwell with treads, and one label per vertical shaft. */
export function Connectors({ explode, materials, bus, liftAActive, liftBActive }: ConnectorsProps) {
  const floorYs = LEVELS.map((level) => levelToY(level, explode));
  const liftShaft = useOwnedGeometry(() => shaftFrame(CORE.lift, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT, floorYs), [explode]);
  const liftBShaft = useOwnedGeometry(() => shaftFrame(CORE.liftB, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT, floorYs), [explode]);
  const stairShaft = useOwnedGeometry(() => shaftFrame(CORE.stair, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT, floorYs), [explode]);
  const flights = useMemo(() => buildFlights(explode), [explode]);
  useEffect(() => () => flights.forEach((g) => g.dispose()), [flights]);

  const carGeometry = useOwnedGeometry(() => {
    const geometry = new BoxGeometry(CORE.lift.x1 - CORE.lift.x0 - 0.45, CAR_HEIGHT, CORE.lift.z1 - CORE.lift.z0 - 0.45);
    geometry.translate(0, CAR_HEIGHT / 2, 0);
    return geometry;
  }, []);

  // The glowing cabin appears when the route reaches a lift segment, then follows its interpolated floor.
  const carRef = useRef<Group>(null);
  const explodeRef = useRef(explode);
  explodeRef.current = explode;
  useFrame(() => {
    if (carRef.current) {
      carRef.current.position.set(bus.carX, levelToY(bus.carLevel, explodeRef.current) + 0.1, bus.carZ);
      carRef.current.visible = bus.carVisible;
    }
  });

  return (
    <group>
      <mesh geometry={liftShaft} material={liftAActive ? materials.shaftActive : materials.shaft} renderOrder={1} />
      <mesh geometry={liftBShaft} material={liftBActive ? materials.shaftActive : materials.shaft} renderOrder={1} />
      <mesh geometry={stairShaft} material={materials.shaft} renderOrder={1} />

      <group ref={carRef} position={[LIFT_POINT[0], 0.1, LIFT_POINT[1]]}>
        <mesh geometry={carGeometry} material={materials.car} castShadow renderOrder={5} />
        <mesh position={[0, CAR_HEIGHT / 2, 0]}>
          <boxGeometry args={[CORE.lift.x1 - CORE.lift.x0 - 0.69, CAR_HEIGHT - 0.24, CORE.lift.z1 - CORE.lift.z0 - 0.69]} />
          <meshBasicMaterial color="#dbeafe" transparent opacity={0.12} side={2} depthWrite={false} />
        </mesh>
        <mesh position={[0, CAR_HEIGHT - 0.18, 0]}>
          <boxGeometry args={[CORE.lift.x1 - CORE.lift.x0 - 0.5, 0.06, CORE.lift.z1 - CORE.lift.z0 - 0.5]} />
          <meshBasicMaterial color="#67e8f9" toneMapped={false} />
        </mesh>
        <pointLight position={[0, CAR_HEIGHT - 0.35, 0]} color="#67e8f9" intensity={1.8} distance={8} />
      </group>

      {/* Glazed skybridge links Lift A and Lift B on Floor 2 only. */}
      <group position={[0, levelToY(2, explode) + 0.08, 0]}>
        <mesh material={materials.skybridge}>
          <boxGeometry args={[16, 0.18, 3.2]} />
        </mesh>
        {[-1.48, 1.48].map((z) => <mesh key={z} position={[0, 0.62, z]} material={materials.doorFrame}>
          <boxGeometry args={[16, 1.05, 0.08]} />
        </mesh>)}
      </group>
      <group position={[0, levelToY(2, explode) + 0.08, 12]}>
        <mesh material={materials.skybridge}>
          <boxGeometry args={[68, 0.18, 3.2]} />
        </mesh>
        {[-1.48, 1.48].map((z) => <mesh key={z} position={[0, 0.62, z]} material={materials.doorFrame}>
          <boxGeometry args={[68, 1.05, 0.08]} />
        </mesh>)}
      </group>

      {flights.map((geometry, i) => (
        <mesh key={`flight-${i}`} geometry={geometry} material={materials.stair} castShadow receiveShadow />
      ))}

    </group>
  );
}
