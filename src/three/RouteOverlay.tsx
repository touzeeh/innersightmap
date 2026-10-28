import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html, Line } from '@react-three/drei';
import type { Group, Mesh } from 'three';
import { CatmullRomCurve3, ConeGeometry, TubeGeometry, Vector3 } from 'three';
import { levelToY } from './levels';
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
  reducedMotion?: boolean;
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

function FlowingArrows({ curve }: { curve: CatmullRomCurve3 }) {
  const arrows = useRef<Array<Group | null>>([]);
  const scratch = useMemo(() => ({ point: new Vector3(), tangent: new Vector3() }), []);
  const up = useMemo(() => new Vector3(0, 1, 0), []);
  useFrame((state) => {
    const phase = (state.clock.elapsedTime * 0.09) % 1;
    arrows.current.forEach((arrow, index) => {
      if (!arrow) return;
      const at = (phase + index / 4) % 1;
      curve.getPointAt(at, scratch.point);
      curve.getTangentAt(at, scratch.tangent).normalize();
      arrow.position.copy(scratch.point);
      arrow.quaternion.setFromUnitVectors(up, scratch.tangent);
    });
  });
  return <group>
    {Array.from({ length: 4 }, (_, index) => <group key={index} ref={(node) => { arrows.current[index] = node; }}>
      <mesh geometry={ARROW_GEOMETRY} renderOrder={12}>
        <meshBasicMaterial color="#ccfbf1" toneMapped={false} depthTest={false} depthWrite={false} />
      </mesh>
    </group>)}
  </group>;
}

const ARROW_GEOMETRY = new ConeGeometry(0.17, 0.42, 3);

/** Bright route line, start and destination markers. Drawn above the floors so it stays visible. */
export function RouteOverlay({ timeline, explode, destination, start, startLabel, destinationLabel, firstPerson = false, reducedMotion = false }: RouteOverlayProps) {
  const points = useMemo(() => (timeline ? routePolyline(timeline, explode) : []), [timeline, explode]);
  const curve = useMemo(() => points.length > 1 ? new CatmullRomCurve3(points, false, 'centripetal', 0.1) : null, [points]);
  const glowTube = useMemo(() => curve ? new TubeGeometry(curve, Math.max(64, points.length * 18), 0.3, 9, false) : null, [curve, points.length]);
  const routeTube = useMemo(() => curve ? new TubeGeometry(curve, Math.max(64, points.length * 18), 0.105, 8, false) : null, [curve, points.length]);
  const turns = useMemo(() => findTurns(timeline), [timeline]);
  const startRingRef = useRef<Mesh>(null);
  const destinationRingRef = useRef<Mesh>(null);

  useFrame((state) => {
    if (reducedMotion) return;
    if (startRingRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3.2);
      startRingRef.current.scale.setScalar(0.88 + pulse * 0.32);
    }
    if (destinationRingRef.current) {
      const pulse = 0.5 + 0.5 * Math.sin(state.clock.elapsedTime * 3.2);
      destinationRingRef.current.scale.setScalar(0.88 + pulse * 0.32);
    }
  });

  useEffect(() => () => { glowTube?.dispose(); routeTube?.dispose(); }, [glowTube, routeTube]);

  return (
    <group>
      {timeline && glowTube && routeTube ? (
        <>
          <mesh geometry={glowTube} renderOrder={9}>
            <meshBasicMaterial color="#0d9488" transparent opacity={0.28} toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh geometry={routeTube} renderOrder={10}>
            <meshBasicMaterial color="#0d9488" toneMapped={false} depthTest={false} depthWrite={false} />
          </mesh>
          {reducedMotion ? null : <FlowingArrows curve={curve!} />}
        </>
      ) : null}

      {start ? (
        <group position={[start.x, levelToY(start.level, explode), start.z]}>
          <mesh ref={startRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={11}>
            <ringGeometry args={[0.28, 0.42, 36]} />
            <meshBasicMaterial color="#2563eb" transparent opacity={0.88} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, 1.65, 0]}>
            <cylinderGeometry args={[0.035, 0.11, 3.3, 10]} />
            <meshBasicMaterial color="#2563eb" transparent opacity={0.48} depthWrite={false} />
          </mesh>
          <mesh position={[0, 3.25, 0]}>
            <sphereGeometry args={[0.2, 16, 12]} />
            <meshBasicMaterial color="#60a5fa" toneMapped={false} />
          </mesh>
          <Html position={[0, 4.1, 0]} center zIndexRange={[30, 0]}>
            <div className="map-pin pin-start">{startLabel}</div>
          </Html>
        </group>
      ) : null}

      {destination ? (
        <group position={[destination.x, levelToY(destination.level, explode) + 0.1, destination.z]}>
          <mesh ref={destinationRingRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} renderOrder={11}>
            <ringGeometry args={[0.34, 0.49, 36]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.92} depthTest={false} depthWrite={false} />
          </mesh>
          <mesh position={[0, 2.6, 0]}>
            <cylinderGeometry args={[0.035, 0.11, 5.2, 10]} />
            <meshBasicMaterial color="#10b981" transparent opacity={0.52} depthWrite={false} />
          </mesh>
          <mesh position={[0, 5.2, 0]}>
            <sphereGeometry args={[0.22, 16, 12]} />
            <meshBasicMaterial color="#10b981" toneMapped={false} />
          </mesh>
          <Html position={[1.35, 5.2, 0]} center zIndexRange={[30, 0]}>
            <div className="map-pin pin-destination">{destinationLabel}</div>
          </Html>
        </group>
      ) : null}

      {firstPerson ? turns.map((turn, index) => <TurnArrow key={`ar-turn-${index}`} turn={turn} index={index} explode={explode} />) : null}
    </group>
  );
}
