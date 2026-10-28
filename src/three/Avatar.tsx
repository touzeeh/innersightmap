import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh } from 'three';
import { MathUtils, RingGeometry, MeshBasicMaterial } from 'three';
import type { Instruction, NavStatus } from '../types/navigation';
import { displayLevel, nodeIndexAtTime, progressAt, remainingMetres, sampleTimeline, type Timeline, type TrackSample } from '../services/routeTimeline';
import { instructionIndexAtNode as instructionIndexForNode } from '../services/instructionGenerator';
import { levelToY, STAIR_TREADS } from './levels';
import type { SceneBus } from './sceneBus';
import { useOwnedGeometry } from './useGeometry';

/** Where the avatar stands before any route is planned. */
export interface Spawn {
  x: number;
  z: number;
  level: number;
}

export interface AvatarProgress {
  instructionIndex: number;
  progress: number;
  positionMetres: number;
  remainingMetres: number;
  currentLevel: number;
}

export interface AvatarProps {
  timeline: Timeline | null;
  instructions: readonly Instruction[];
  spawn: Spawn;
  status: NavStatus;
  speed: number;
  seekNonce: number;
  seekTime: number;
  explode: number;
  reducedMotion: boolean;
  bus: SceneBus;
  onProgress: (progress: AvatarProgress) => void;
  onArrive: () => void;
}

const REPORT_INTERVAL_SECONDS = 0.25;
const GAIT_RATE = 6.2;
const TURN_RATE = 9;

/** Height of the avatar's feet. Stair flights step in treads; everything else is continuous. */
function feetY(sample: TrackSample, explode: number): number {
  let level = sample.level;
  if (sample.kind === 'stair') {
    const step = Math.round(sample.frac * STAIR_TREADS) / STAIR_TREADS;
    level = sample.fromLevel + (sample.toLevel - sample.fromLevel) * step;
  }
  return levelToY(level, explode) + 0.03;
}

function shortestAngle(from: number, to: number): number {
  return Math.atan2(Math.sin(to - from), Math.cos(to - from));
}

/**
 * Procedural walking guide: torso, head, arms and legs built from primitives.
 * Movement comes from the route timeline, not from a free-running animation,
 * so the avatar cannot leave the route, pass through walls or float between floors.
 */
export function Avatar({ timeline, instructions, spawn, status, speed, seekNonce, seekTime, explode, reducedMotion, bus, onProgress, onArrive }: AvatarProps) {
  const root = useRef<Group>(null);
  const body = useRef<Group>(null);
  const armL = useRef<Group>(null);
  const armR = useRef<Group>(null);
  const legL = useRef<Group>(null);
  const legR = useRef<Group>(null);
  const ring = useRef<Mesh>(null);

  const timeRef = useRef(0);
  const yawRef = useRef(0);
  const phaseRef = useRef(0);
  const walkWeight = useRef(0);
  const clockRef = useRef(0);
  const arrivedRef = useRef(false);
  const lastReport = useRef<{ instruction: number; at: number }>({ instruction: -1, at: -Infinity });
  const statusRef = useRef(status);
  const speedRef = useRef(speed);
  const explodeRef = useRef(explode);
  const reducedRef = useRef(reducedMotion);
  const timelineRef = useRef(timeline);
  const instructionsRef = useRef(instructions);
  const onProgressRef = useRef(onProgress);
  const onArriveRef = useRef(onArrive);
  const spawnRef = useRef(spawn);
  const seekTimeRef = useRef(seekTime);

  // Keep latest props in refs so the frame loop reads current values without re-subscribing.
  useEffect(() => {
    statusRef.current = status;
    speedRef.current = speed;
    explodeRef.current = explode;
    reducedRef.current = reducedMotion;
    timelineRef.current = timeline;
    instructionsRef.current = instructions;
    onProgressRef.current = onProgress;
    onArriveRef.current = onArrive;
    spawnRef.current = spawn;
    seekTimeRef.current = seekTime;
  });

  useEffect(() => {
    if (seekNonce === 0) return;
    const current = timelineRef.current;
    if (!current) return;
    timeRef.current = Math.max(0, Math.min(current.duration, seekTimeRef.current));
    arrivedRef.current = false;
    lastReport.current = { instruction: -1, at: -Infinity };
  }, [seekNonce]);

  // A new route, or a restart from the beginning, puts the avatar back at its start.
  useEffect(() => {
    timeRef.current = 0;
    arrivedRef.current = false;
    lastReport.current = { instruction: -1, at: -Infinity };
    bus.carVisible = false;
  }, [timeline]);

  const previousStatus = useRef<NavStatus>(status);
  useEffect(() => {
    const before = previousStatus.current;
    previousStatus.current = status;
    if (status === 'idle') {
      timeRef.current = 0;
      arrivedRef.current = false;
      lastReport.current = { instruction: -1, at: -Infinity };
    } else if (status === 'navigating' && (before === 'idle' || before === 'arrived')) {
      timeRef.current = 0;
      arrivedRef.current = false;
      lastReport.current = { instruction: -1, at: -Infinity };
    }
  }, [status]);

  const ringGeometry = useOwnedGeometry(() => new RingGeometry(0.42, 0.52, 40), []);
  const ringMaterial = useMemo(() => new MeshBasicMaterial({ color: '#06b6d4', transparent: true, opacity: 0.8, depthWrite: false }), []);
  useEffect(() => () => ringMaterial.dispose(), [ringMaterial]);

  useFrame((_, delta) => {
    const dt = Math.min(delta, 0.05);
    clockRef.current += dt;
    const current = timelineRef.current;
    const running = statusRef.current === 'navigating';

    if (running && current) {
      timeRef.current = Math.min(current.duration, timeRef.current + dt * speedRef.current);
    }

    const sample: TrackSample = current
      ? sampleTimeline(current, timeRef.current)
      : { x: spawnRef.current.x, z: spawnRef.current.z, level: spawnRef.current.level, fromLevel: spawnRef.current.level, toLevel: spawnRef.current.level, kind: 'wait', frac: 1, dirX: 0, dirZ: 0, walking: false, metresWalked: 0, finished: true };

    const y = feetY(sample, explodeRef.current);
    root.current?.position.set(sample.x, y, sample.z);
    bus.avatar.set(sample.x, y, sample.z);
    if (sample.kind === 'lift' || sample.kind === 'wait') {
      if (sample.kind === 'lift') {
        bus.carLevel = sample.level;
        bus.carX = sample.x;
        bus.carZ = sample.z;
        bus.carVisible = true;
      }
    }

    // Turn towards the direction of travel, smoothly.
    if (sample.walking && (Math.abs(sample.dirX) + Math.abs(sample.dirZ)) > 1e-6) {
      const target = Math.atan2(sample.dirX, sample.dirZ);
      const rate = reducedRef.current ? 1 : 1 - Math.exp(-TURN_RATE * dt);
      yawRef.current += shortestAngle(yawRef.current, target) * rate;
    }
    if (root.current) root.current.rotation.y = yawRef.current;
    bus.avatarForward.set(Math.sin(yawRef.current), 0, Math.cos(yawRef.current));

    // Gait: legs and arms swing while walking and relax to rest when stopped.
    const walkTarget = sample.walking && running ? 1 : 0;
    walkWeight.current = MathUtils.lerp(walkWeight.current, walkTarget, reducedRef.current ? 1 : 1 - Math.exp(-10 * dt));
    if (sample.walking) phaseRef.current += dt * GAIT_RATE * (running ? speedRef.current : 1) * (reducedRef.current ? 0.5 : 1);
    const swing = Math.sin(phaseRef.current) * 0.6 * walkWeight.current;
    if (legL.current) legL.current.rotation.x = swing;
    if (legR.current) legR.current.rotation.x = -swing;
    if (armL.current) armL.current.rotation.x = -swing * 0.8;
    if (armR.current) {
      if (statusRef.current === 'arrived') {
        // Raise the right arm and wave once arrived.
        armR.current.rotation.z = MathUtils.lerp(armR.current.rotation.z, -2.6, 0.12);
        armR.current.rotation.x = Math.sin(clockRef.current * 6) * 0.3;
      } else {
        armR.current.rotation.z = MathUtils.lerp(armR.current.rotation.z, 0, 0.12);
        armR.current.rotation.x = swing * 0.8;
      }
    }
    if (body.current) body.current.position.y = Math.abs(Math.sin(phaseRef.current)) * 0.035 * walkWeight.current;

    if (ring.current) {
      const pulse = 0.6 + 0.4 * Math.sin(clockRef.current * 3);
      ring.current.scale.setScalar(1 + 0.08 * pulse);
      ringMaterial.opacity = 0.45 + 0.4 * pulse;
    }

    if (!current) return;

    // Progress and instructions, reported at a low rate so the UI stays calm.
    const nodeIndex = nodeIndexAtTime(current, timeRef.current);
    const instructionIndex = instructionIndexForNode(instructionsRef.current, nodeIndex);
    const now = clockRef.current;
    const changed = instructionIndex !== lastReport.current.instruction;
    if (running && (changed || now - lastReport.current.at >= REPORT_INTERVAL_SECONDS)) {
      lastReport.current = { instruction: instructionIndex, at: now };
      onProgressRef.current({
        instructionIndex,
        progress: progressAt(current, timeRef.current),
        positionMetres: sampleTimeline(current, timeRef.current).metresWalked,
        remainingMetres: remainingMetres(current, timeRef.current),
        currentLevel: displayLevel(sample.level),
      });
    }

    if (sample.finished && running && !arrivedRef.current) {
      arrivedRef.current = true;
      onArriveRef.current();
    }
  });

  return (
    <group>
      <group ref={root} position={[spawn.x, levelToY(spawn.level, explode) + 0.03, spawn.z]}>
        <mesh ref={ring} geometry={ringGeometry} material={ringMaterial} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.025, 0]} />
        <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.03, 0.58]}>
          <coneGeometry args={[0.13, 0.32, 3]} />
          <meshBasicMaterial color="#67e8f9" transparent opacity={0.94} depthWrite={false} />
        </mesh>
        <group ref={body}>
          {/* Torso: cobalt jacket with a cyan guide band. */}
          <mesh position={[0, 1.05, 0]} castShadow>
            <boxGeometry args={[0.46, 0.62, 0.26]} />
            <meshStandardMaterial color="#1d4ed8" roughness={0.55} />
          </mesh>
          <mesh position={[0, 1.02, 0.135]}>
            <boxGeometry args={[0.46, 0.08, 0.01]} />
            <meshStandardMaterial color="#67e8f9" emissive="#06b6d4" emissiveIntensity={0.6} />
          </mesh>
          {/* Head and hair. */}
          <mesh position={[0, 1.55, 0]} castShadow>
            <sphereGeometry args={[0.15, 20, 16]} />
            <meshStandardMaterial color="#f1c7a5" roughness={0.7} />
          </mesh>
          <mesh position={[0, 1.64, -0.02]} scale={[1, 0.6, 1.02]}>
            <sphereGeometry args={[0.158, 20, 12]} />
            <meshStandardMaterial color="#2b2118" roughness={0.9} />
          </mesh>

          {/* Arms pivot at the shoulder so they swing naturally. */}
          <group ref={armL} position={[-0.31, 1.33, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.14, 0.6, 0.16]} />
              <meshStandardMaterial color="#1e40af" roughness={0.6} />
            </mesh>
          </group>
          <group ref={armR} position={[0.31, 1.33, 0]}>
            <mesh position={[0, -0.3, 0]} castShadow>
              <boxGeometry args={[0.14, 0.6, 0.16]} />
              <meshStandardMaterial color="#1e40af" roughness={0.6} />
            </mesh>
          </group>

          {/* Legs pivot at the hip. */}
          <group ref={legL} position={[-0.12, 0.72, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow>
              <boxGeometry args={[0.17, 0.72, 0.19]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.76, 0.04]}>
              <boxGeometry args={[0.18, 0.09, 0.27]} />
              <meshStandardMaterial color="#111827" roughness={0.5} />
            </mesh>
          </group>
          <group ref={legR} position={[0.12, 0.72, 0]}>
            <mesh position={[0, -0.36, 0]} castShadow>
              <boxGeometry args={[0.17, 0.72, 0.19]} />
              <meshStandardMaterial color="#0f172a" roughness={0.7} />
            </mesh>
            <mesh position={[0, -0.76, 0.04]}>
              <boxGeometry args={[0.18, 0.09, 0.27]} />
              <meshStandardMaterial color="#111827" roughness={0.5} />
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
