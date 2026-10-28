/**
 * Plans a visitor route between two navigation nodes and summarises it.
 * Distances are walking metres from the building model. Times are estimates
 * from fixed assumptions, not measurements.
 */
import { getNavigationGraph } from '../data/navigationGraph';
import { DESTINATIONS } from '../data/destinations';
import type { Level } from '../types/building';
import type { Localised, NavigationGraph, PlanResult, RoutePlan, TravelPreference } from '../types/navigation';
import { findShortestPath } from './pathfinding';
import { generateInstructions } from './instructionGenerator';
import { destinationLabel, startLabel } from './destinationSearch';
import { buildTimeline } from './routeTimeline';

export function planRoute(
  startId: string,
  destinationId: string,
  preference: TravelPreference = 'shortest',
  graph: NavigationGraph = getNavigationGraph(),
  excludeCorridors: readonly string[] = [],
): PlanResult {
  const startNode = graph.nodes.get(startId);
  const destNode = graph.nodes.get(destinationId);
  if (!startNode || !destNode) {
    return {
      ok: false,
      reason: 'unknown-node',
      message: { en: 'That start point or destination is not part of the building model.', hi: 'चुना गया प्रारंभिक बिंदु या गंतव्य भवन मॉडल में नहीं है।' },
    };
  }
  if (startId === destinationId) {
    return {
      ok: false,
      reason: 'same-location',
      message: { en: 'You are already at this destination.', hi: 'आप पहले से ही इस गंतव्य पर हैं।' },
    };
  }

  const destination = DESTINATIONS.find((d) => d.id === destinationId);
  if (destination && !destination.publicAccess) {
    return {
      ok: false,
      reason: 'not-accessible',
      message: {
        en: `${destination.name} is restricted and is not open for visitor navigation.`,
        hi: `${destination.nameHi} प्रतिबंधित है और आगंतुक नेविगेशन के लिए खुला नहीं है।`,
      },
    };
  }

  const path = findShortestPath(graph, startId, destinationId, {
    excludeKinds: preference === 'step-free' ? ['stair'] : [],
    excludeCorridors,
  });
  if (!path) {
    const from = startLabel(startId, 'en');
    const to = destination ? destinationLabel(destination, 'en') : destinationId;
    const fromHi = startLabel(startId, 'hi');
    const toHi = destination ? destinationLabel(destination, 'hi') : destinationId;
    const stepFree = preference === 'step-free';
    const message: Localised = stepFree
      ? {
          en: `No step-free route from ${from} to ${to}. Switch to "Shortest" to allow stairs.`,
          hi: `${fromHi} से ${toHi} तक बिना सीढ़ियों का कोई मार्ग नहीं है। सीढ़ियों की अनुमति के लिए "सबसे छोटा" चुनें।`,
        }
      : {
          en: `No valid route found from ${from} to ${to}. Check the start point or choose another destination.`,
          hi: `${fromHi} से ${toHi} तक कोई वैध मार्ग नहीं मिला। प्रारंभिक बिंदु जाँचें या दूसरा गंतव्य चुनें।`,
        };
    return { ok: false, reason: 'no-route', message };
  }

  let liftRides = 0;
  let stairFlights = 0;
  let distanceMeters = 0;
  for (const edge of path.edges) {
    distanceMeters += edge.meters;
    if (edge.kind === 'lift') liftRides++;
    else if (edge.kind === 'stair') stairFlights++;
  }

  const instructions = generateInstructions(path.nodeIds, graph);
  // The estimate is the simulated walk duration at 1x, so the panel and the avatar agree.
  const estimatedSeconds = buildTimeline(path.nodeIds, graph).duration;

  const levelsVisited: Level[] = [];
  for (const id of path.nodeIds) {
    const level = levelOf(graph, id);
    if (!levelsVisited.includes(level)) levelsVisited.push(level);
  }

  const route: RoutePlan = {
    nodeIds: path.nodeIds,
    distanceMeters: Math.round(distanceMeters * 10) / 10,
    estimatedSeconds: Math.round(estimatedSeconds),
    liftRides,
    stairFlights,
    levelsVisited,
    instructions,
    startId,
    destinationId,
    preference,
  };
  return { ok: true, route };
}

function levelOf(graph: NavigationGraph, id: string): Level {
  const node = graph.nodes.get(id);
  if (!node) throw new Error(`Unknown node ${id}`);
  return node.level;
}

/** Format an estimated duration for display, e.g. "about 2 min" or "about 45 s". */
export function formatEstimate(seconds: number, language: 'en' | 'hi' = 'en'): string {
  if (seconds < 90) {
    return language === 'hi' ? `लगभग ${Math.max(1, Math.round(seconds))} सेकंड` : `about ${Math.max(1, Math.round(seconds))} s`;
  }
  const minutes = Math.round(seconds / 60);
  return language === 'hi' ? `लगभग ${minutes} मिनट` : `about ${minutes} min`;
}
