/**
 * Dijkstra shortest path over the navigation graph, with a binary min-heap.
 * The graph is small (a few hundred nodes), so this is fast and easy to verify.
 */
import type { EdgeKind, NavEdge, NavigationGraph } from '../types/navigation';

export interface PathOptions {
  /** Edge kinds that must not be used. Step-free routing excludes 'stair'. */
  excludeKinds?: readonly EdgeKind[];
  /** Corridor identifiers temporarily closed by the demo rerouting control. */
  excludeCorridors?: readonly string[];
}

export interface PathResult {
  nodeIds: string[];
  edges: NavEdge[];
  cost: number;
}

/** Minimal binary min-heap keyed by a numeric priority. */
export class MinHeap<T> {
  private items: { value: T; priority: number }[] = [];

  get size(): number {
    return this.items.length;
  }

  push(value: T, priority: number): void {
    this.items.push({ value, priority });
    this.bubbleUp(this.items.length - 1);
  }

  pop(): { value: T; priority: number } | undefined {
    if (this.items.length === 0) return undefined;
    const top = this.items[0];
    const last = this.items.pop()!;
    if (this.items.length > 0) {
      this.items[0] = last;
      this.sinkDown(0);
    }
    return top;
  }

  private bubbleUp(index: number): void {
    let i = index;
    while (i > 0) {
      const parent = (i - 1) >> 1;
      if (this.items[parent].priority <= this.items[i].priority) break;
      [this.items[parent], this.items[i]] = [this.items[i], this.items[parent]];
      i = parent;
    }
  }

  private sinkDown(index: number): void {
    let i = index;
    const n = this.items.length;
    for (;;) {
      const left = 2 * i + 1;
      const right = left + 1;
      let smallest = i;
      if (left < n && this.items[left].priority < this.items[smallest].priority) smallest = left;
      if (right < n && this.items[right].priority < this.items[smallest].priority) smallest = right;
      if (smallest === i) break;
      [this.items[smallest], this.items[i]] = [this.items[i], this.items[smallest]];
      i = smallest;
    }
  }
}

/**
 * Lowest-cost path from `startId` to `goalId`, or null when no path exists.
 * Costs are metre-equivalents (see data/navigationGraph.ts).
 */
export function findShortestPath(graph: NavigationGraph, startId: string, goalId: string, options: PathOptions = {}): PathResult | null {
  if (!graph.nodes.has(startId) || !graph.nodes.has(goalId)) return null;
  if (startId === goalId) return { nodeIds: [startId], edges: [], cost: 0 };

  const excluded = new Set<EdgeKind>(options.excludeKinds ?? []);
  const excludedCorridors = new Set(options.excludeCorridors ?? []);
  const dist = new Map<string, number>([[startId, 0]]);
  const previous = new Map<string, { node: string; edge: NavEdge }>();
  const settled = new Set<string>();
  const heap = new MinHeap<string>();
  heap.push(startId, 0);

  while (heap.size > 0) {
    const current = heap.pop()!;
    const node = current.value;
    if (settled.has(node)) continue;
    settled.add(node);
    if (node === goalId) break;

    for (const edge of graph.adjacency.get(node) ?? []) {
      if (excluded.has(edge.kind)) continue;
      if (edge.corridor && excludedCorridors.has(edge.corridor)) continue;
      if (settled.has(edge.to)) continue;
      const candidate = current.priority + edge.cost;
      const known = dist.get(edge.to);
      if (known === undefined || candidate < known) {
        dist.set(edge.to, candidate);
        previous.set(edge.to, { node, edge });
        heap.push(edge.to, candidate);
      }
    }
  }

  if (!dist.has(goalId) || !settled.has(goalId)) return null;

  const nodeIds: string[] = [goalId];
  const edges: NavEdge[] = [];
  let cursor = goalId;
  while (cursor !== startId) {
    const step = previous.get(cursor);
    if (!step) return null;
    edges.push(step.edge);
    nodeIds.push(step.node);
    cursor = step.node;
  }
  nodeIds.reverse();
  edges.reverse();
  return { nodeIds, edges, cost: dist.get(goalId)! };
}
