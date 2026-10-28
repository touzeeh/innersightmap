import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges, Html } from '@react-three/drei';
import { BoxGeometry, BufferGeometry, Group } from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CORE, LIFT_B_POINT, LIFT_POINT, STAIR_POINT } from '../data/layout';
import { LEVELS } from '../data/floors';
import { levelToY, STAIR_TREADS, WALL_HEIGHT } from './levels';
import type { SceneMaterials } from './palette';
import type { SceneBus } from './sceneBus';
import { useOwnedGeometry } from './useGeometry';

const CAR_HEIGHT = 2.9;

/** A box spanning the x/z rectangle `rect`, from `bottom` to `top` in world y. */
function shaftBox(rect: { x0: number; x1: number; z0: number; z1: number }, bottom: number, top: number): BoxGeometry {
  const geometry = new BoxGeometry(rect.x1 - rect.x0, top - bottom, rect.z1 - rect.z0);
  geometry.translate((rect.x0 + rect.x1) / 2, (top + bottom) / 2, (rect.z0 + rect.z1) / 2);
  return geometry;
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
  labels: boolean;
}

/** Lift shaft with its moving car, stairwell with treads, and one label per vertical shaft. */
export function Connectors({ explode, materials, bus, labels }: ConnectorsProps) {
  const liftShaft = useOwnedGeometry(() => shaftBox(CORE.lift, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT), [explode]);
  const liftBShaft = useOwnedGeometry(() => shaftBox(CORE.liftB, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT), [explode]);
  const stairShaft = useOwnedGeometry(() => shaftBox(CORE.stair, levelToY(0, explode) - 0.1, levelToY(3, explode) + WALL_HEIGHT), [explode]);
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
      <mesh geometry={liftShaft} material={materials.shaft} renderOrder={1}>
        <Edges color="#5f93d3" />
      </mesh>
      <mesh geometry={liftBShaft} material={materials.shaft} renderOrder={1}>
        <Edges color="#5f93d3" />
      </mesh>
      <mesh geometry={stairShaft} material={materials.shaft} renderOrder={1}>
        <Edges color="#8aa7c9" />
      </mesh>

      <group ref={carRef} position={[LIFT_POINT[0], 0.1, LIFT_POINT[1]]}>
        <mesh geometry={carGeometry} material={materials.car} castShadow renderOrder={5}>
          <Edges color="#67e8f9" threshold={12} />
        </mesh>
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
          <Edges color="#38bdf8" />
        </mesh>
        {[-1.48, 1.48].map((z) => <mesh key={z} position={[0, 0.62, z]} material={materials.doorFrame}>
          <boxGeometry args={[16, 1.05, 0.08]} />
        </mesh>)}
      </group>
      <group position={[0, levelToY(2, explode) + 0.08, 12]}>
        <mesh material={materials.skybridge}>
          <boxGeometry args={[68, 0.18, 3.2]} />
          <Edges color="#38bdf8" />
        </mesh>
        {[-1.48, 1.48].map((z) => <mesh key={z} position={[0, 0.62, z]} material={materials.doorFrame}>
          <boxGeometry args={[68, 1.05, 0.08]} />
        </mesh>)}
      </group>

      {flights.map((geometry, i) => (
        <mesh key={`flight-${i}`} geometry={geometry} material={materials.stair} castShadow receiveShadow />
      ))}

      {labels
        ? <>
            <Html position={[LIFT_POINT[0], levelToY(3, explode) + WALL_HEIGHT + 0.5, LIFT_POINT[1] + 2.4]} center zIndexRange={[12, 0]}>
              <div className="room-label is-key connector-label">Lift A</div>
            </Html>
            <Html position={[LIFT_B_POINT[0], levelToY(3, explode) + WALL_HEIGHT + 0.5, LIFT_B_POINT[1] + 2.4]} center zIndexRange={[12, 0]}>
              <div className="room-label is-key connector-label">Lift B</div>
            </Html>
            <Html position={[STAIR_POINT[0] + 0.6, levelToY(3, explode) + WALL_HEIGHT + 0.5, STAIR_POINT[1] + 2.4]} center zIndexRange={[12, 0]}>
              <div className="room-label is-key connector-label">Stairs</div>
            </Html>
          </>
        : null}
    </group>
  );
}
