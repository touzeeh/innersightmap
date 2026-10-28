import { describe, expect, it } from 'vitest';
import { getNavigationGraph } from '../data/navigationGraph';
import { planRoute } from '../services/routePlanner';
import { instructionIndexAtNode } from '../services/instructionGenerator';
import { buildTimeline, nodeIndexAtTime, progressAt, remainingMetres, sampleTimeline } from '../services/routeTimeline';
import type { RoutePlan } from '../types/navigation';

const graph = getNavigationGraph();

function plan(start: string, dest: string, preference: 'shortest' | 'step-free' = 'shortest'): RoutePlan {
  const result = planRoute(start, dest, preference, graph);
  if (!result.ok) throw new Error(`no route ${start} → ${dest}: ${result.reason}`);
  return result.route;
}

const textOf = (route: RoutePlan): string[] => route.instructions.map((i) => i.text.en);

describe('instruction generation', () => {
  it('starts with a start instruction and ends with an arrival instruction', () => {
    const route = plan('EXT-MAIN', 'G-EMG');
    expect(route.instructions[0].kind).toBe('start');
    expect(route.instructions[0].text.en).toBe('Start from Main Entrance.');
    const last = route.instructions[route.instructions.length - 1];
    expect(last.kind).toBe('arrive');
    expect(last.text.en).toBe('You have arrived at Emergency Ward.');
  });

  it('gives turn directions at corridor junctions', () => {
    const lines = textOf(plan('EXT-MAIN', 'G-EMG'));
    expect(lines.some((l) => /Turn (left|right)/.test(l))).toBe(true);
  });

  it('announces the room a turn leads into', () => {
    const route = plan('G-REC', '2-SMP');
    const entering = route.instructions.find((i) => i.kind === 'enter');
    expect(entering?.text.en).toMatch(/into Sample Processing|Walk straight into Sample Processing/);
  });

  it('tells the visitor to take the elevator to the target floor, then turn after exiting', () => {
    // Step-free routing uses the lift only, so the ride instructions are deterministic.
    const route = plan('G-REC', '2-BB', 'step-free');
    const lines = textOf(route);
    expect(lines.some((l) => l === 'Take the elevator to Floor 2.')).toBe(true);
    expect(lines.some((l) => /Exit the elevator on Floor 2\./.test(l))).toBe(true);
    const exit = route.instructions.find((i) => i.kind === 'lift-exit');
    // Straight-on exits say nothing extra; only a real turn is announced after exiting.
    expect(exit?.text.en.startsWith('Exit the elevator on Floor 2.')).toBe(true);
    expect(exit?.text.en).not.toMatch(/after exiting the elevator/);
  });

  it('describes stair climbs with the direction of travel', () => {
    const route = plan('G-REC', '1-DOC');
    const lines = textOf(route);
    const hasStairs = route.stairFlights > 0;
    if (hasStairs) expect(lines.some((l) => /Take the staircase up to Floor 1/.test(l))).toBe(true);
    expect(route.instructions.every((i) => i.text.hi.length > 0)).toBe(true);
  });

  it('anchors instructions to route node indices in order', () => {
    const route = plan('G-REC', '3-W302');
    const indices = route.instructions.map((i) => i.nodeIndex);
    expect([...indices].sort((a, b) => a - b)).toEqual(indices);
    expect(indices.every((i) => i >= 0 && i < route.nodeIds.length)).toBe(true);
  });

  it('resolves the active instruction for a node index', () => {
    const route = plan('EXT-MAIN', 'G-EMG');
    expect(instructionIndexAtNode(route.instructions, 0)).toBe(0);
    const last = route.instructions[route.instructions.length - 1];
    expect(instructionIndexAtNode(route.instructions, route.nodeIds.length - 1)).toBe(last.index);
  });

  it('keeps the route duration estimate consistent with its parts', () => {
    const route = plan('G-REC', '2-BB');
    // The estimate is the simulated walk, so it is at least the pure walking time and includes the lift ride.
    expect(route.estimatedSeconds).toBeGreaterThanOrEqual(Math.floor(route.distanceMeters / 1.3));
    expect(route.liftRides).toBeGreaterThanOrEqual(0);
  });
});

describe('avatar progression along the route', () => {
  it('spawns at the start and finishes at the destination pin', () => {
    const route = plan('G-REC', '2-BB');
    const timeline = buildTimeline(route.nodeIds, graph);
    const start = sampleTimeline(timeline, 0);
    const first = graph.nodes.get(route.nodeIds[0])!;
    expect(start.x).toBeCloseTo(first.x, 6);
    expect(start.z).toBeCloseTo(first.z, 6);
    expect(start.level).toBe(first.level);

    const end = sampleTimeline(timeline, timeline.duration + 1);
    const dest = graph.nodes.get(route.nodeIds[route.nodeIds.length - 1])!;
    expect(end.finished).toBe(true);
    expect(end.x).toBeCloseTo(dest.x, 6);
    expect(end.z).toBeCloseTo(dest.z, 6);
    expect(end.level).toBe(dest.level);
  });

  it('never teleports: horizontal position changes smoothly between samples', () => {
    const route = plan('G-REC', '3-W302');
    const timeline = buildTimeline(route.nodeIds, graph);
    const dt = 0.05;
    let prev = sampleTimeline(timeline, 0);
    for (let t = dt; t < timeline.duration; t += dt) {
      const next = sampleTimeline(timeline, t);
      const step = Math.hypot(next.x - prev.x, next.z - prev.z);
      // Walking is 1.3 m/s; allow a little headroom for the stair flight's diagonal geometry.
      expect(step).toBeLessThanOrEqual(1.3 * dt * 1.5 + 1e-6);
      prev = next;
    }
  });

  it('changes level across floors and stays within the building footprint', () => {
    const route = plan('G-REC', '3-W302');
    const timeline = buildTimeline(route.nodeIds, graph);
    const levels = new Set<number>();
    for (let t = 0; t <= timeline.duration; t += 0.1) {
      const s = sampleTimeline(timeline, t);
      levels.add(Math.round(s.level * 100) / 100);
      expect(Math.abs(s.x)).toBeLessThanOrEqual(24);
      expect(Math.abs(s.z)).toBeLessThanOrEqual(16);
    }
    expect(levels.has(0)).toBe(true);
    expect(levels.has(3)).toBe(true);
  });

  it('advances through route nodes in order and reports remaining distance', () => {
    const route = plan('G-REC', '2-BB');
    const timeline = buildTimeline(route.nodeIds, graph);
    let lastIndex = 0;
    let lastRemaining = Infinity;
    for (let t = 0; t <= timeline.duration; t += 0.5) {
      const index = nodeIndexAtTime(timeline, t);
      expect(index).toBeGreaterThanOrEqual(lastIndex);
      lastIndex = index;
      const remaining = remainingMetres(timeline, t);
      expect(remaining).toBeLessThanOrEqual(lastRemaining + 1e-9);
      lastRemaining = remaining;
    }
    expect(nodeIndexAtTime(timeline, timeline.duration)).toBe(route.nodeIds.length - 1);
    expect(remainingMetres(timeline, timeline.duration)).toBeCloseTo(0, 6);
    expect(progressAt(timeline, 0)).toBe(0);
    expect(progressAt(timeline, timeline.duration)).toBe(1);
  });

  it('stops walking at the end: the final sample is stationary and not walking', () => {
    const route = plan('EXT-MAIN', 'G-EMG');
    const timeline = buildTimeline(route.nodeIds, graph);
    const end = sampleTimeline(timeline, timeline.duration);
    expect(end.walking).toBe(false);
    expect(end.dirX).toBe(0);
    expect(end.dirZ).toBe(0);
  });

  it('faces the direction of travel while walking', () => {
    const route = plan('EXT-MAIN', 'G-EMG');
    const timeline = buildTimeline(route.nodeIds, graph);
    const s = sampleTimeline(timeline, 0.2);
    expect(s.walking).toBe(true);
    expect(Math.hypot(s.dirX, s.dirZ)).toBeCloseTo(1, 6);
  });
});
