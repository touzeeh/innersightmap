import { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PerspectiveCamera, Vector3 } from 'three';
import type { CameraMode } from '../types/navigation';
import { levelToY } from './levels';
import type { SceneBus } from './sceneBus';

/** The subset of OrbitControls this rig uses. Typed locally to avoid importing three-stdlib directly. */
interface OrbitLike {
  target: Vector3;
  addEventListener(type: 'start', listener: () => void): void;
  removeEventListener(type: 'start', listener: () => void): void;
}

export interface CameraRigProps {
  mode: CameraMode;
  /** Changes whenever the camera should animate to the mode's framing. */
  nonce: number;
  focusLevel: number | null;
  explode: number;
  reducedMotion: boolean;
  bus: SceneBus;
  destination: Vector3 | null;
  groundRoute?: boolean;
}

const OVERVIEW_OFFSET = new Vector3(32, 15, 34);
const GROUND_ROUTE_OFFSET = new Vector3(32, 23, 34);
const FLOOR_OFFSET = new Vector3(34, 40, 40);
const CLOSEUP_OFFSET = new Vector3(7.5, 7.5, 9);
const FOLLOW_OFFSET = new Vector3(9, 10, 9);
const TOPDOWN_OFFSET = new Vector3(0, 44, 0.01);
const FOLLOW_LIFT = new Vector3(0, 1.2, 0);
const FIRST_PERSON_EYE = new Vector3(0, 1.4, 0);
const FIRST_PERSON_LOOK = new Vector3(0, 1.08, 0);
const FIRST_PERSON_BACK = 1.8;
const FIRST_PERSON_LOOKAHEAD = 7.5;
const TWEEN_SECONDS = 1.1;
const ZOOM_FAR_DISTANCE = 62;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Tween {
  fromPos: Vector3;
  fromTarget: Vector3;
  start: number;
  duration: number;
  offset: Vector3;
  /** Writes the look-at point for this frame into `out`. Follow modes read the live avatar. */
  targetFor: (out: Vector3) => Vector3;
}

/**
 * Camera framing for each mode, with eased transitions. The user can always
 * orbit or zoom: a drag cancels a transition, and follow modes move the camera
 * by the avatar's displacement so the chosen viewing angle is kept.
 */
export function CameraRig({ mode, nonce, focusLevel, explode, reducedMotion, bus, destination, groundRoute = false }: CameraRigProps) {
  const camera = useThree((s) => s.camera);
  const gl = useThree((s) => s.gl);
  const controls = useThree((s) => s.controls) as unknown as OrbitLike | null;

  const scratch = useMemo(() => ({ goal: new Vector3(), toPos: new Vector3(), delta: new Vector3() }), []);
  const tween = useRef<Tween | null>(null);
  const followActive = useRef(false);
  const lastAvatar = useRef(new Vector3());
  const clock = useRef(0);
  const zoomedOut = useRef(false);
  const defaultFov = useRef(camera instanceof PerspectiveCamera ? camera.fov : 36);

  // Latest values for the framing effect, which runs only when mode or nonce change.
  const latest = useRef({ focusLevel, explode, destination, reducedMotion, groundRoute });
  latest.current = { focusLevel, explode, destination, reducedMotion, groundRoute };

  // A user drag cancels any transition in progress.
  useEffect(() => {
    if (camera instanceof PerspectiveCamera) {
      camera.fov = mode === 'firstperson' ? 68 : defaultFov.current;
      camera.updateProjectionMatrix();
    }
  }, [camera, mode]);

  useEffect(() => {
    if (!controls) return;
    const cancel = (): void => {
      tween.current = null;
    };
    controls.addEventListener('start', cancel);
    return () => controls.removeEventListener('start', cancel);
  }, [controls]);

  useEffect(() => {
    if (!controls) return;
    const { focusLevel: level, explode: ex, destination: dest, reducedMotion: reduced, groundRoute: ground } = latest.current;
    const offset = new Vector3();
    let targetFor: (out: Vector3) => Vector3;

    switch (mode) {
      case 'floor': {
        const y = levelToY(level ?? 0, ex) + 0.5;
        offset.copy(FLOOR_OFFSET);
        targetFor = (out) => out.set(0, y, 0);
        break;
      }
      case 'closeup':
        if (dest) {
          offset.copy(CLOSEUP_OFFSET);
          const point = dest.clone().add(new Vector3(0, 1, 0));
          targetFor = (out) => out.copy(point);
          break;
        }
        offset.copy(OVERVIEW_OFFSET);
        targetFor = (out) => out.set(0, levelToY(1.5, ex) + 2, 0);
        break;
      case 'follow':
        offset.copy(FOLLOW_OFFSET);
        targetFor = (out) => out.copy(bus.avatar).add(FOLLOW_LIFT);
        break;
      case 'firstperson':
        offset.copy(bus.avatarForward).multiplyScalar(-(FIRST_PERSON_BACK + FIRST_PERSON_LOOKAHEAD)).add(new Vector3(0, FIRST_PERSON_EYE.y - FIRST_PERSON_LOOK.y, 0));
        targetFor = (out) => out.copy(bus.avatar).addScaledVector(bus.avatarForward, FIRST_PERSON_LOOKAHEAD).add(FIRST_PERSON_LOOK);
        break;
      case 'topdown':
        offset.copy(TOPDOWN_OFFSET);
        targetFor = (out) => out.copy(bus.avatar);
        break;
      case 'overview':
      default:
        offset.copy(ground ? GROUND_ROUTE_OFFSET : OVERVIEW_OFFSET);
        targetFor = (out) => out.set(0, levelToY(1.5, ex) + 2, 0);
        break;
    }

    followActive.current = mode === 'follow' || mode === 'firstperson' || mode === 'topdown';
    lastAvatar.current.copy(bus.avatar);

    if (reduced) {
      // No animation for reduced motion: place the camera immediately.
      const end = targetFor(new Vector3());
      controls.target.copy(end);
      camera.position.copy(end).add(offset);
      tween.current = null;
      return;
    }
    tween.current = {
      fromPos: camera.position.clone(),
      fromTarget: controls.target.clone(),
      start: clock.current,
      duration: TWEEN_SECONDS,
      offset,
      targetFor,
    };
    // Depends on mode and nonce only; the other values are read from `latest`.
  }, [mode, nonce, controls]);

  useFrame((_, delta) => {
    clock.current += Math.min(delta, 0.05);
    if (!controls) return;

    const t = tween.current;
    if (t) {
      const elapsed = clock.current - t.start;
      const k = Math.min(1, elapsed / t.duration);
      const e = easeInOutCubic(k);
      const goal = t.targetFor(scratch.goal);
      scratch.toPos.copy(goal).add(t.offset);
      controls.target.lerpVectors(t.fromTarget, goal, e);
      camera.position.lerpVectors(t.fromPos, scratch.toPos, e);
      if (k >= 1) {
        tween.current = null;
        lastAvatar.current.copy(bus.avatar);
      }
    } else if (followActive.current) {
      if (mode === 'firstperson') {
        const forward = bus.avatarForward;
        scratch.goal.copy(bus.avatar).addScaledVector(forward, FIRST_PERSON_LOOKAHEAD).add(FIRST_PERSON_LOOK);
        scratch.toPos.copy(bus.avatar).addScaledVector(forward, -FIRST_PERSON_BACK).add(FIRST_PERSON_EYE);
        const followEase = 1 - Math.exp(-5.5 * Math.min(delta, 0.05));
        camera.position.lerp(scratch.toPos, followEase);
        controls.target.lerp(scratch.goal, followEase);
      } else {
        scratch.delta.subVectors(bus.avatar, lastAvatar.current);
        if (scratch.delta.lengthSq() > 0) {
          camera.position.add(scratch.delta);
          controls.target.add(scratch.delta);
        }
      }
      lastAvatar.current.copy(bus.avatar);
    }

    // Minor room labels are hidden by CSS when the camera is far away.
    const far = camera.position.distanceTo(controls.target) > ZOOM_FAR_DISTANCE;
    if (far !== zoomedOut.current) {
      zoomedOut.current = far;
      bus.zoomedOut = far;
      gl.domElement.closest('.stage-view')?.classList.toggle('zoom-far', far);
    }
  });

  return null;
}
