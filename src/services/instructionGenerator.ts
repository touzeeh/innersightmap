/**
 * Turns an ordered list of navigation nodes into visitor-facing directions.
 *
 * The path is first grouped into "walk items" (straight runs on one corridor)
 * and vertical items (lift or stair rides). Each instruction is then anchored
 * to the node index where it becomes active, so the 3D avatar, the live panel
 * and spoken guidance all share one timeline.
 */
import { CORRIDORS } from '../data/layout';
import type { Level } from '../types/building';
import type { Instruction, Localised, NavNode, NavigationGraph } from '../types/navigation';
import { floorLabel } from './destinationSearch';

/** Angles below this (degrees) count as going straight. */
const STRAIGHT_LIMIT_DEG = 30;
const AROUND_LIMIT_DEG = 150;
/** Walk runs shorter than this are not announced on their own. */
const MIN_ANNOUNCED_METRES = 4;

interface Segment {
  fromIdx: number;
  toIdx: number;
  from: NavNode;
  to: NavNode;
  kind: 'walk' | 'lift' | 'stair';
  dx: number;
  dz: number;
  length: number;
  corridor?: string;
}

interface WalkItem {
  type: 'walk';
  startIdx: number;
  endIdx: number;
  level: Level;
  dx: number;
  dz: number;
  metres: number;
  corridor?: string;
  /** True when the run goes through a doorway into a room. */
  enterRoom: NavNode | null;
  endNode: NavNode;
}

interface VerticalItem {
  type: 'vertical';
  kind: 'lift' | 'stair';
  fromIdx: number;
  toIdx: number;
  fromLevel: Level;
  toLevel: Level;
}

type Item = WalkItem | VerticalItem;

export type TurnKind = 'straight' | 'left' | 'right' | 'around';

export function turnBetween(inDx: number, inDz: number, outDx: number, outDz: number): { turn: TurnKind; degrees: number } {
  const cross = inDx * outDz - inDz * outDx; // positive = clockwise seen from above (right turn when north is -z)
  const dot = inDx * outDx + inDz * outDz;
  const degrees = (Math.atan2(cross, dot) * 180) / Math.PI;
  const abs = Math.abs(degrees);
  if (abs < STRAIGHT_LIMIT_DEG) return { turn: 'straight', degrees };
  if (abs > AROUND_LIMIT_DEG) return { turn: 'around', degrees };
  return { turn: degrees > 0 ? 'right' : 'left', degrees };
}

const TURN_TEXT: Record<Exclude<TurnKind, 'straight'>, Localised> = {
  left: { en: 'Turn left', hi: 'बाएँ मुड़ें' },
  right: { en: 'Turn right', hi: 'दाएँ मुड़ें' },
  around: { en: 'Turn around', hi: 'पीछे की ओर मुड़ें' },
};

function join(parts: Localised[]): Localised {
  return {
    en: parts.map((p) => p.en).join(' '),
    hi: parts.map((p) => p.hi).join(' '),
  };
}

function corridorName(id: string | undefined): Localised {
  const corridor = CORRIDORS.find((c) => c.id === id);
  if (!corridor) return { en: 'corridor', hi: 'गलियारा' };
  return { en: corridor.label, hi: corridor.labelHi };
}

function metres(n: number): number {
  return Math.max(1, Math.round(n));
}

function nodeName(node: NavNode): Localised {
  return { en: node.name ?? 'your destination', hi: node.nameHi ?? node.name ?? 'गंतव्य' };
}

function floorText(level: Level): Localised {
  return { en: floorLabel(level, 'en'), hi: floorLabel(level, 'hi') };
}

/** Build the ordered list of walk and vertical items from node ids. */
function buildItems(nodeIds: string[], graph: NavigationGraph): { items: Item[]; segments: Segment[] } {
  const segments: Segment[] = [];
  for (let i = 0; i < nodeIds.length - 1; i++) {
    const from = graph.nodes.get(nodeIds[i]);
    const to = graph.nodes.get(nodeIds[i + 1]);
    if (!from || !to) throw new Error(`Route references unknown node ${!from ? nodeIds[i] : nodeIds[i + 1]}`);
    const edge = graph.adjacency.get(from.id)?.find((e) => e.to === to.id);
    if (!edge) throw new Error(`No edge between ${from.id} and ${to.id}`);
    const length = Math.hypot(to.x - from.x, to.z - from.z);
    const kind: Segment['kind'] = edge.kind === 'lift' ? 'lift' : edge.kind === 'stair' ? 'stair' : 'walk';
    segments.push({
      fromIdx: i,
      toIdx: i + 1,
      from,
      to,
      kind,
      dx: length > 0 ? (to.x - from.x) / length : 0,
      dz: length > 0 ? (to.z - from.z) / length : 0,
      length,
      corridor: edge.corridor,
    });
  }

  const items: Item[] = [];
  let open: WalkItem | null = null;
  const closeOpen = (): void => {
    if (open) {
      // A run only "enters" a room when it finishes inside one.
      open.enterRoom = open.endNode.type === 'room' ? open.endNode : null;
      items.push(open);
    }
    open = null;
  };

  for (const seg of segments) {
    if (seg.kind !== 'walk') {
      closeOpen();
      const last = items[items.length - 1];
      // Consecutive flights in one stairwell are one climb: "Take the staircase up to Floor 3".
      if (last && last.type === 'vertical' && last.kind === seg.kind && last.toIdx === seg.fromIdx) {
        last.toIdx = seg.toIdx;
        last.toLevel = seg.to.level;
        continue;
      }
      items.push({
        type: 'vertical',
        kind: seg.kind,
        fromIdx: seg.fromIdx,
        toIdx: seg.toIdx,
        fromLevel: seg.from.level,
        toLevel: seg.to.level,
      });
      continue;
    }
    const sameRun =
      open !== null &&
      open.endIdx === seg.fromIdx &&
      open.corridor === seg.corridor &&
      Math.abs(open.dx - seg.dx) < 0.01 &&
      Math.abs(open.dz - seg.dz) < 0.01;
    if (sameRun && open) {
      open.endIdx = seg.toIdx;
      open.metres += seg.length;
      open.endNode = seg.to;
    } else {
      closeOpen();
      open = {
        type: 'walk',
        startIdx: seg.fromIdx,
        endIdx: seg.toIdx,
        level: seg.from.level,
        dx: seg.dx,
        dz: seg.dz,
        metres: seg.length,
        corridor: seg.corridor,
        enterRoom: null,
        endNode: seg.to,
      };
    }
  }
  closeOpen();
  return { items, segments };
}

/**
 * Generate ordered instructions for a route. The first instruction is always
 * "start" and the last is always "arrive".
 */
export function generateInstructions(nodeIds: string[], graph: NavigationGraph): Instruction[] {
  if (nodeIds.length === 0) return [];
  const startNode = graph.nodes.get(nodeIds[0]);
  const endNode = graph.nodes.get(nodeIds[nodeIds.length - 1]);
  if (!startNode || !endNode) throw new Error('Route has unknown endpoints');

  const { items } = buildItems(nodeIds, graph);
  const instructions: Instruction[] = [];
  const push = (kind: Instruction['kind'], nodeIndex: number, distanceAt: number, level: Level, text: Localised, targetLevel?: Level): void => {
    instructions.push({ index: instructions.length, kind, nodeIndex, distanceAt, level, text, targetLevel });
  };

  const leaveRoom = startNode.type === 'room';
  push('start', 0, 0, startNode.level, {
    en: `Start from ${nodeName(startNode).en}.${leaveRoom ? ' Leave through the doorway.' : ''}`,
    hi: `${nodeName(startNode).hi} से शुरू करें।${leaveRoom ? ' दरवाज़े से बाहर निकलें।' : ''}`,
  });

  let distance = 0;
  let previousWalk: WalkItem | null = null;
  let lastApproachDir: { dx: number; dz: number } | null = null;

  for (let k = 0; k < items.length; k++) {
    const item = items[k];
    const next = items[k + 1];

    if (item.type === 'vertical') {
      const rideText: Localised =
        item.kind === 'lift'
          ? { en: `Take the elevator to ${floorText(item.toLevel).en}.`, hi: `लिफ्ट से ${floorText(item.toLevel).hi} पर जाएँ।` }
          : {
              en: `Take the staircase ${item.toLevel > item.fromLevel ? 'up' : 'down'} to ${floorText(item.toLevel).en}.`,
              hi: `सीढ़ियों से ${item.toLevel > item.fromLevel ? 'ऊपर' : 'नीचे'} ${floorText(item.toLevel).hi} पर जाएँ।`,
            };
      push(item.kind === 'lift' ? 'lift-ride' : 'stair-climb', item.fromIdx, distance, item.fromLevel, rideText, item.toLevel);
      lastApproachDir = previousWalk ? { dx: previousWalk.dx, dz: previousWalk.dz } : lastApproachDir;
      previousWalk = null;
      continue;
    }

    // Walk item. Gather the phrases that describe this run.
    const phrases: Localised[] = [];
    let kind: Instruction['kind'] = 'walk';
    const prev: Item | undefined = items[k - 1];
    const afterVertical = prev !== undefined && prev.type === 'vertical';

    if (afterVertical && prev.type === 'vertical') {
      const exitLevel = floorText(prev.toLevel);
      const exitWord = prev.kind === 'lift' ? 'elevator' : 'staircase';
      const exitHi = prev.kind === 'lift' ? 'लिफ्ट' : 'सीढ़ियों';
      phrases.push({
        en: `Exit the ${exitWord} on ${exitLevel.en}.`,
        hi: `${exitLevel.hi} पर ${exitHi} से बाहर निकलें।`,
      });
      kind = prev.kind === 'lift' ? 'lift-exit' : 'stair-exit';
      if (lastApproachDir) {
        const { turn } = turnBetween(lastApproachDir.dx, lastApproachDir.dz, item.dx, item.dz);
        if (turn === 'left' || turn === 'right') {
          const t = TURN_TEXT[turn];
          phrases.push({
            en: `${t.en} after exiting the ${exitWord}.`,
            hi: `${exitHi} से निकलकर ${t.hi}।`,
          });
        }
      }
    } else if (previousWalk) {
      const { turn } = turnBetween(previousWalk.dx, previousWalk.dz, item.dx, item.dz);
      if (turn !== 'straight') {
        const t = TURN_TEXT[turn];
        if (item.enterRoom) {
          phrases.push({ en: `${t.en} into ${nodeName(item.enterRoom).en}.`, hi: `${nodeName(item.enterRoom).hi} की ओर ${t.hi}।` });
          kind = 'enter';
        } else {
          phrases.push({ en: `${t.en} at the next junction.`, hi: `अगले चौराहे पर ${t.hi}।` });
          kind = 'turn';
        }
      }
    }

    if (item.enterRoom && kind !== 'enter') {
      // Walking straight into a room with no turn beforehand.
      phrases.push({ en: `Walk straight into ${nodeName(item.enterRoom).en}.`, hi: `सीधे ${nodeName(item.enterRoom).hi} में जाएँ।` });
      kind = 'enter';
    } else if (!item.enterRoom && item.metres >= MIN_ANNOUNCED_METRES && item.corridor) {
      const corridor = corridorName(item.corridor);
      const verb = kind === 'walk' && !afterVertical && !previousWalk ? 'Walk straight' : 'Continue straight';
      const verbHi = verb === 'Walk straight' ? 'सीधे चलें' : 'सीधे चलते रहें';
      phrases.push({
        en: `${verb} along the ${corridor.en} for about ${metres(item.metres)} m.`,
        hi: `${corridor.hi} पर ${verbHi}, लगभग ${metres(item.metres)} मीटर।`,
      });
    }

    // If the run ends at a lift or stair, say so before the ride begins.
    const ridesNext = next && next.type === 'vertical' && next.fromIdx === item.endIdx;
    if (ridesNext && next.type === 'vertical') {
      phrases.push(
        next.kind === 'lift'
          ? { en: 'Continue to the elevator lobby.', hi: 'लिफ्ट लॉबी की ओर बढ़ें।' }
          : { en: 'Continue to the staircase.', hi: 'सीढ़ियों की ओर बढ़ें।' },
      );
    }

    if (phrases.length > 0) {
      push(kind, item.startIdx, distance, item.level, join(phrases));
    }
    distance += item.metres;
    previousWalk = item;
    lastApproachDir = null;
  }

  push('arrive', nodeIds.length - 1, distance, endNode.level, {
    en: `You have arrived at ${nodeName(endNode).en}.`,
    hi: `आप ${nodeName(endNode).hi} पर पहुँच गए हैं।`,
  });

  return instructions;
}

/** Instruction in effect at a given node index, i.e. the last one anchored at or before it. */
export function instructionIndexAtNode(instructions: readonly Instruction[], nodeIndex: number): number {
  let current = 0;
  for (const ins of instructions) {
    if (ins.nodeIndex <= nodeIndex) current = ins.index;
    else break;
  }
  return current;
}
