import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import { Vector3 } from 'three';
import { levelToY } from './levels';
import { COLORS } from './palette';
import type { Timeline } from '../services/routeTimeline';

/** Height above the floor at which the route line is drawn so it sits on top of the plates. */
const ROUTE_LIFT = 0.45;

/** Polyline through the timeline's segment ends, in world coordinates for the current explode. */
export function routePolyline(timeline: Timeline, explode: number): Vector3[] {
  const points: Vector3[] = [];
  const push = (x: number, level: number, z: number): void => {
    const p = new Vector3(x, levelToY(level, explode) + ROUTE_LIFT, z);
    const last = points[points.length - 1];
    if (!last || last.distanceToSquared(p) > 1e-6) points.push(p);
  };
  for (const seg of timeline.segments) {
    push(seg.from.x, seg.from.level, seg.from.z);
    push(seg.to.x, seg.to.level, seg.to.z);
  }
  return points;
}

export interface RouteOverlayProps {
  timeline: Timeline | null;
  explode: number;
  destination: { x: number; level: number; z: number } | null;
  start: { x: number; level: number; z: number } | null;
  startLabel: string;
  destinationLabel: string;
  firstPerson?: boolean;
}

interface TurnMark { x: number; z: number; level: number; dirX: number; dirZ: number }

function TurnArrow({ turn, index, explode }: { turn: TurnMark; index: number; explode: number }) {
  const ref = useRef<Group>(null);
  useFrame((state) => {
    if (ref.current) ref.current.position.y = levelToY(turn.level, explode) + 1.5 + Math.sin(state.clock.elapsedTime * 2.5 + index) * 0.08;
  });
  const points: [number, number, number][] = [[-0.24, 0, -0.18], [0, 0, 0.18], [0.24, 0, -0.18]];
  return (
    <group ref={ref} position={[turn.x, levelToY(turn.level, explode) + 1.5, turn.z]} rotation={[0, Math.atan2(turn.dirX, turn.dirZ), 0]}>
      {[0, 1, 2].map((chevron) => {
        const offset = -0.58 * chevron;
        const shifted = points.map(([x, y, z]) => [x, y, z + offset] as [number, number, number]);
        return <group key={chevron}>
          <Line points={shifted} color="#22d3ee" lineWidth={10} transparent opacity={0.22} depthTest={false} renderOrder={13} />
          <Line points={shifted} color={chevron === 0 ? '#ecfeff' : '#67e8f9'} lineWidth={4} transparent opacity={0.96} depthTest={false} renderOrder={14} />
        </group>;
      })}
    </group>
  );
}

function findTurns(timeline: Timeline | null): TurnMark[] {
  if (!timeline) return [];
  const turns: TurnMark[] = [];
  let previous: Timeline['segments'][number] | null = null;
  for (const segment of timeline.segments) {
    if (segment.kind !== 'walk') { previous = null; continue; }
    if (previous && previous.from.level === segment.from.level && Math.hypot(previous.to.x - segment.from.x, previous.to.z - segment.from.z) < 0.01) {
      const ax = previous.to.x - previous.from.x;
      const az = previous.to.z - previous.from.z;
      const bx = segment.to.x - segment.from.x;
      const bz = segment.to.z - segment.from.z;
      const al = Math.hypot(ax, az) || 1;
      const bl = Math.hypot(bx, bz) || 1;
      if ((ax * bx + az * bz) / (al * bl) < 0.94 && bl > 0.01) {
        turns.push({ x: segment.from.x, z: segment.from.z, level: segment.from.level, dirX: bx / bl, dirZ: bz / bl });
      }
    }
    previous = segment;
  }
  return turns;
}

/** Bright route line, start and destination markers. Drawn above the floors so it stays visible. */
export function RouteOverlay({ timeline, explode, destination, start, startLabel, destinationLabel, firstPerson = false }: RouteOverlayProps) {
  const points = useMemo(() => (timeline ? routePolyline(timeline, explode) : []), [timeline, explode]);
  const turns = useMemo(() => findTurns(timeline), [timeline]);
  const ringRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (ringRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3.2);
      ringRef.current.scale.setScalar(0.9 + pulse * 0.25);
    }
  });

  return (
    <group>
      {timeline && points.length > 1 ? (
        <>
          <Line points={points} color={COLORS.cyan} lineWidth={10} transparent opacity={0.3} depthTest={false} renderOrder={9} />
          <Line points={points} color="#67e8f9" lineWidth={3.5} depthTest={false} renderOrder={10} />
        </>
      ) : null}

      {start ? (
        <Html position={[start.x, levelToY(start.level, explode) + 1.8, start.z]} center zIndexRange={[30, 0]}>
          <div className="map-pin pin-start">{startLabel}</div>
        </Html>
      ) : null}

      {destination ? (
        <group position={[destination.x, levelToY(destination.level, explode) + 0.1, destination.z]}>
          <mesh ref={ringRef} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[0.9, 1.25, 40]} />
            <meshBasicMaterial color={COLORS.amber} transparent opacity={0.9} depthWrite={false} />
          </mesh>
          <Html position={[0, 3.2, 0]} center zIndexRange={[30, 0]}>
            <div className="map-pin pin-destination">{destinationLabel}</div>
          </Html>
        </group>
      ) : null}

      {firstPerson ? turns.map((turn, index) => <TurnArrow key={`ar-turn-${index}`} turn={turn} index={index} explode={explode} />) : null}
    </group>
  );
}
