/**
 * Mutable state shared between per-frame scene components (avatar, lift car,
 * camera). It lives outside React state so that 60 fps updates never trigger
 * re-renders.
 */
import { Vector3 } from 'three';

export interface SceneBus {
  /** World position of the avatar's feet, updated every frame. */
  avatar: Vector3;
  /** Horizontal direction the guide is facing, used by first-person follow framing. */
  avatarForward: Vector3;
  /** Fractional level the lift car is at, following the avatar while it rides. */
  carLevel: number;
  carX: number;
  carZ: number;
  /** Becomes visible once the guide begins a lift segment. */
  carVisible: boolean;
  /** Set by the camera rig so that labels can be shown or hidden by zoom. */
  zoomedOut: boolean;
}

export function createSceneBus(): SceneBus {
  return { avatar: new Vector3(), avatarForward: new Vector3(0, 0, 1), carLevel: 0, carX: -8, carZ: 0, carVisible: false, zoomedOut: false };
}
