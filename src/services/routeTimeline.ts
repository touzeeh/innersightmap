/**
 * Converts a planned route into a time-based track for the avatar.
 *
 * The track is a list of linear segments in building coordinates:
 *   walk   — along a corridor or into a room (x, z change, level constant)
 *   lift   — inside the lift car (x, z fixed, level changes)
 *   stair  — up or down one flight (z runs across the stairwell, level changes)
 *   wait   — standing still, e.g. while the lift doors open
 *
 * Each route node also gets a time stamp, so instructions can be anchored to
 * the moment the avatar reaches the matching node. Everything here is pure and
 * testable; the 3D layer only samples it.
 */
import { CORE, STAIR_POINT } from '../data/layout';
import type { Level } from '../types/building';
import type { NavigationGraph } from '../types/navigation';
import { LIFT_ARRIVE_SECONDS, LIFT_DOOR_SECONDS, LIFT_SECONDS_BASE, LIFT_SECONDS_PER_LEVEL, STAIR_SECONDS_PER_FLIGHT, WALK_SPEED_MPS } from './timing';

/** Stop inside the lift car, metres from the shaft's corridor-side wall. */
const STAIR_BOTTOM_Z = CORE.stair.z0;
const STAIR_TOP_Z = CORE.stair.z1;
const STAIR_X = STAIR_POINT[0];


export type SegmentKind = 'walk' | 'lift' | 'stair' | 'wait';

export interface TrackPoint {
  x: number;
  z: number;
  level: number;
}

export interface TrackSegment {
  kind: SegmentKind;
  t0: number;
  t1: number;
  from: TrackPoint;
  to: TrackPoint;
  /** Walking metres covered by this segment (matches graph edge metres). */
  metres: number;
  /** Walking metres completed before this segment starts. */
  metresBefore: number;
}

export interface TrackSample {
  x: number;
  z: number;
  /** Fractional level: 2.5 means halfway between levels 2 and 3. */
  level: number;
  fromLevel: number;
  toLevel: number;
  kind: SegmentKind;
  /** Progress through the current segment, 0..1. */
  frac: number;
  /** Unit direction of travel in the xz plane, or zero when stationary or riding. */
  dirX: number;
  dirZ: number;
  /** True while the avatar is physically walking (drives the gait animation). */
  walking: boolean;
  /** Walking metres covered so far. */
  metresWalked: number;
  finished: boolean;
}

export interface Timeline {
  segments: TrackSegment[];
  /** Time in seconds at which the avatar reaches each route node. */
  nodeTimes: number[];
  duration: number;
  totalMetres: number;
}

interface Cursor {
  t: number;
  metres: number;
}

function push(
  list: TrackSegment[],
  cursor: Cursor,
  kind: SegmentKind,
  from: TrackPoint,
  to: TrackPoint,
  seconds: number,
  metres: number,
): void {
  const t0 = cursor.t;
  const t1 = t0 + Math.max(0.01, seconds);
  list.push({ kind, t0, t1, from, to, metres, metresBefore: cursor.metres });
  cursor.t = t1;
  cursor.metres += metres;
}

function walkSeconds(from: TrackPoint, to: TrackPoint): number {
  return Math.hypot(to.x - from.x, to.z - from.z) / WALK_SPEED_MPS;
}

/** Build the time track for an ordered list of route node ids. Positions come from the graph. */
export function buildTimeline(nodeIds: readonly string[], graph: NavigationGraph): Timeline {
  const segments: TrackSegment[] = [];
  const cursor: Cursor = { t: 0, metres: 0 };
  const nodeTimes: number[] = [0];

  const pointOf = (id: string): TrackPoint => {
    const node = graph.nodes.get(id);
    if (!node) throw new Error(`Timeline references unknown node ${id}`);
    return { x: node.x, z: node.z, level: node.level };
  };
  const edgeKind = (fromId: string, toId: string | undefined): string | undefined => {
    if (!toId) return undefined;
    return graph.adjacency.get(fromId)?.find((e) => e.to === toId)?.kind;
  };

  // `here` is where the avatar is standing. Chained stair flights keep the avatar
  // in the stairwell instead of stepping out onto every intermediate floor.
  let here: TrackPoint = pointOf(nodeIds[0]);

  for (let i = 0; i < nodeIds.length - 1; i++) {
    const a = pointOf(nodeIds[i]);
    const b = pointOf(nodeIds[i + 1]);
    const kind = edgeKind(nodeIds[i], nodeIds[i + 1]);
    const nextKind = edgeKind(nodeIds[i + 1], nodeIds[i + 2]);
    const edgeMetres = graph.adjacency.get(nodeIds[i])?.find((e) => e.to === nodeIds[i + 1])?.meters ?? 0;
    if (kind === undefined) throw new Error(`Timeline has no edge ${nodeIds[i]} → ${nodeIds[i + 1]}`);

    if (kind === 'lift') {
      const span = Math.abs(b.level - a.level);
      const carEntry: TrackPoint = { x: a.x, z: a.z, level: a.level };
      const carExit: TrackPoint = { x: b.x, z: b.z, level: b.level };
      push(segments, cursor, 'walk', here, carEntry, walkSeconds(here, carEntry), 0);
      push(segments, cursor, 'wait', carEntry, carEntry, LIFT_DOOR_SECONDS, 0);
      push(segments, cursor, 'lift', carEntry, carExit, LIFT_SECONDS_BASE + LIFT_SECONDS_PER_LEVEL * span, 0);
      push(segments, cursor, 'wait', carExit, carExit, LIFT_ARRIVE_SECONDS, 0);
      push(segments, cursor, 'walk', carExit, b, walkSeconds(carExit, b), 0);
      here = b;
    } else if (kind === 'stair') {
      if (b.level > a.level) {
        // Up: enter at the bottom of the flight and climb to the top.
        const bottom: TrackPoint = { x: STAIR_X, z: STAIR_BOTTOM_Z, level: a.level };
        const top: TrackPoint = { x: STAIR_X, z: STAIR_TOP_Z, level: b.level };
        push(segments, cursor, 'walk', here, bottom, walkSeconds(here, bottom), 0);
        push(segments, cursor, 'stair', bottom, top, STAIR_SECONDS_PER_FLIGHT, edgeMetres);
        here = top;
      } else {
        // Down: walk through the stairwell to the top and descend to the lower level.
        const top: TrackPoint = { x: STAIR_X, z: STAIR_TOP_Z, level: a.level };
        const bottom: TrackPoint = { x: STAIR_X, z: STAIR_BOTTOM_Z, level: b.level };
        push(segments, cursor, 'walk', here, top, walkSeconds(here, top), 0);
        push(segments, cursor, 'stair', top, bottom, STAIR_SECONDS_PER_FLIGHT, edgeMetres);
        here = bottom;
      }
      // Step out onto the corridor only when the next move is not another flight.
      if (nextKind !== 'stair') {
        push(segments, cursor, 'walk', here, b, walkSeconds(here, b), 0);
        here = b;
      }
    } else {
      push(segments, cursor, 'walk', here, b, walkSeconds(here, b), edgeMetres);
      here = b;
    }
    nodeTimes.push(cursor.t);
  }

  return {
    segments,
    nodeTimes,
    duration: cursor.t,
    totalMetres: cursor.metres,
  };
}

/** Sample the track at time t (seconds). Times past the end clamp to the final position. */
export function sampleTimeline(timeline: Timeline, t: number): TrackSample {
  const segs = timeline.segments;
  if (segs.length === 0) {
    return { x: 0, z: 0, level: 0, fromLevel: 0, toLevel: 0, kind: 'wait', frac: 1, dirX: 0, dirZ: 0, walking: false, metresWalked: 0, finished: true };
  }
  const last = segs[segs.length - 1];
  if (t >= timeline.duration) {
    return {
      x: last.to.x,
      z: last.to.z,
      level: last.to.level,
      fromLevel: last.to.level,
      toLevel: last.to.level,
      kind: 'wait',
      frac: 1,
      dirX: 0,
      dirZ: 0,
      walking: false,
      metresWalked: timeline.totalMetres,
      finished: true,
    };
  }

  let lo = 0;
  let hi = segs.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (segs[mid].t0 <= t) lo = mid;
    else hi = mid - 1;
  }
  const seg = segs[lo];

  const span = Math.max(1e-9, seg.t1 - seg.t0);
  const frac = Math.min(1, Math.max(0, (t - seg.t0) / span));
  const x = seg.from.x + (seg.to.x - seg.from.x) * frac;
  const z = seg.from.z + (seg.to.z - seg.from.z) * frac;
  const level = seg.from.level + (seg.to.level - seg.from.level) * frac;
  const dx = seg.to.x - seg.from.x;
  const dz = seg.to.z - seg.from.z;
  const len = Math.hypot(dx, dz);
  const walking = seg.kind === 'walk' || seg.kind === 'stair';

  return {
    x,
    z,
    level,
    fromLevel: seg.from.level,
    toLevel: seg.to.level,
    kind: seg.kind,
    frac,
    dirX: len > 1e-6 ? dx / len : 0,
    dirZ: len > 1e-6 ? dz / len : 0,
    walking,
    metresWalked: seg.metresBefore + seg.metres * frac,
    finished: false,
  };
}

/** Index of the last route node the avatar has reached by time t. */
export function nodeIndexAtTime(timeline: Timeline, t: number): number {
  let index = 0;
  for (let i = 0; i < timeline.nodeTimes.length; i++) {
    if (timeline.nodeTimes[i] <= t + 1e-9) index = i;
    else break;
  }
  return index;
}

/** Walking metres still to cover from time t. */
export function remainingMetres(timeline: Timeline, t: number): number {
  const sample = sampleTimeline(timeline, t);
  return Math.max(0, timeline.totalMetres - sample.metresWalked);
}

/** Fraction of the route completed, 0..1. */
export function progressAt(timeline: Timeline, t: number): number {
  if (timeline.duration <= 0) return 1;
  return Math.min(1, Math.max(0, t / timeline.duration));
}

/** The whole-floor level a fractional level rounds to, for "current floor" text. */
export function displayLevel(level: number): Level {
  return Math.min(3, Math.max(0, Math.round(level))) as Level;
}
