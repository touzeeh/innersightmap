/**
 * Destination search: scores every destination against a query using names,
 * room numbers, aliases (English and Hindi), categories and floor numbers.
 * Deterministic and offline, so it works without any paid API.
 */
import { CATEGORY_KEYWORDS, DESTINATION_ALIASES } from '../data/aliases';
import { DESTINATIONS, START_POINTS } from '../data/destinations';
import type { Level } from '../types/building';
import type { Destination, SearchMatch, SearchResolution } from '../types/navigation';
import { contentTokens, editDistance, normalizedCore, normalizeText } from './textNormalize';

/** Minimum score for a result to appear in the list. */
export const MIN_RESULT_SCORE = 40;
/** Minimum score for a single match to be treated as confident. */
export const CONFIDENT_SCORE = 65;
/** Category matches are capped so that "emergency" points at the ward, not every ICU-type room. */
const CATEGORY_CAP = 50;

/** The alias key for a destination: its room id, or 'lift' / 'stair' for connectors. */
export function aliasKeyFor(destination: Destination): string {
  if (destination.kind === 'room') return destination.id;
  return destination.id.endsWith('@lift') ? 'lift' : 'stair';
}

/** Every normalised string this destination can be found by, with a flag for category-derived text. */
export function candidateStrings(destination: Destination): { text: string; weak: boolean }[] {
  const aliases = DESTINATION_ALIASES[aliasKeyFor(destination)] ?? [];
  const number = destination.roomNumber;
  const list: { text: string; weak: boolean }[] = [
    { text: destination.name, weak: false },
    { text: destination.nameHi, weak: false },
    ...aliases.map((text) => ({ text, weak: false })),
  ];
  if (number) {
    list.push({ text: `${destination.name} ${number}`, weak: false });
    list.push({ text: `${destination.nameHi} ${number}`, weak: false });
    list.push({ text: `room ${number}`, weak: false });
  }
  const categoryWords = CATEGORY_KEYWORDS[destination.category] ?? [];
  for (const word of categoryWords) list.push({ text: word, weak: true });
  return list.map((c) => ({ text: normalizedCore(c.text), weak: c.weak })).filter((c) => c.text.length > 0);
}

/** Score a single query against a single candidate string (0–100). */
export function scoreCandidate(queryTokens: string[], queryCore: string, candidate: string): number {
  const candTokens = candidate.split(' ').filter(Boolean);
  const candCore = candTokens.join(' ');
  if (!queryCore || !candCore) return 0;
  if (candCore === queryCore) return 100;
  if (queryCore.length >= 3 && candCore.startsWith(queryCore)) return 88;
  if (queryCore.length >= 3 && candCore.includes(queryCore)) return 75;

  let matched = 0;
  for (const qt of queryTokens) {
    const hit = candTokens.some((ct) => {
      if (ct === qt) return true;
      if (qt.length >= 3 && ct.startsWith(qt)) return true;
      if (/^[a-z0-9]+$/.test(qt) && qt.length >= 5) {
        const allowed = qt.length >= 8 ? 2 : 1;
        return editDistance(qt, ct) <= allowed;
      }
      return false;
    });
    if (hit) matched++;
  }
  const fraction = queryTokens.length ? matched / queryTokens.length : 0;
  if (fraction < 0.5) return 0;
  return Math.round(80 * fraction);
}

/** Floor number mentioned in a query, e.g. "floor 2", "2nd floor", "मंज़िल 2". */
export function floorFromQuery(query: string): Level | null {
  const text = normalizeText(query);
  const match = text.match(/(?:floor|मंज़िल|मंजिल|माला)\s*(\d)\b|\b(\d)\s*(?:st|nd|rd|th)?\s*(?:floor|मंज़िल|मंजिल)/);
  const digit = match ? (match[1] ?? match[2]) : null;
  if (!digit) return null;
  const level = Number(digit);
  return level >= 0 && level <= 3 ? (level as Level) : null;
}

/** Rank all destinations for a free-text query. Results are sorted best first. */
export function searchDestinations(query: string, destinations: readonly Destination[] = DESTINATIONS, limit = 12): SearchMatch[] {
  const tokens = contentTokens(query);
  const core = tokens.join(' ');
  const floor = floorFromQuery(query);
  if (!core && floor === null) return [];

  const results: SearchMatch[] = [];
  for (const destination of destinations) {
    let score = 0;
    if (core) {
      for (const candidate of candidateStrings(destination)) {
        const raw = scoreCandidate(tokens, core, candidate.text);
        const value = candidate.weak ? Math.min(raw, CATEGORY_CAP) : raw;
        if (value > score) score = value;
      }
    }
    // Floor-only queries ("floor 2") list every place on that floor.
    if (floor !== null && destination.level === floor && tokens.every((t) => /^\d+$/.test(t))) {
      score = Math.max(score, 45);
    }
    if (score >= MIN_RESULT_SCORE) results.push({ destination, score });
  }

  results.sort((a, b) => b.score - a.score || a.destination.level - b.destination.level || a.destination.name.localeCompare(b.destination.name));
  return results.slice(0, limit);
}

/**
 * Decide whether a query identifies one destination. Returns "single" only when
 * exactly one destination scores confidently; otherwise lists the candidates.
 */
export function resolveDestination(query: string, destinations: readonly Destination[] = DESTINATIONS): SearchResolution {
  const matches = searchDestinations(query, destinations, 20);
  if (matches.length === 0) return { status: 'none', options: [] };
  const top = matches[0].score;
  const strong = matches.filter((m) => m.score >= CONFIDENT_SCORE && m.score >= top - 5);
  if (strong.length === 1 && top >= CONFIDENT_SCORE) {
    return { status: 'single', match: strong[0].destination, options: [] };
  }
  const options = (strong.length > 1 ? strong : matches.slice(0, 5)).map((m) => m.destination);
  return { status: 'ambiguous', options: options.slice(0, 6) };
}

/** Human-readable label for a destination, e.g. "Blood Bank · Floor 2 · Room 201". */
export function destinationLabel(destination: Destination, language: 'en' | 'hi' = 'en'): string {
  const name = language === 'hi' ? destination.nameHi : destination.name;
  const room = destination.roomNumber ? (language === 'hi' ? ` · कमरा ${destination.roomNumber}` : ` · Room ${destination.roomNumber}`) : '';
  return `${name} · ${floorLabel(destination.level, language)}${room}`;
}

/** "Ground floor" / "Floor 2" in English, "भूतल" / "मंज़िल 2" in Hindi. */
export function floorLabel(level: Level, language: 'en' | 'hi' = 'en'): string {
  if (language === 'hi') return level === 0 ? 'भूतल' : `मंज़िल ${level}`;
  return level === 0 ? 'Ground floor' : `Floor ${level}`;
}

/** Start-point ids the user can pick from. Resolves a start id to a display name. */
export function startLabel(id: string, language: 'en' | 'hi' = 'en'): string {
  const sp = START_POINTS.find((s) => s.id === id);
  if (sp) return language === 'hi' ? sp.label.hi : sp.label.en;
  const dest = DESTINATIONS.find((d) => d.id === id);
  if (dest) return language === 'hi' ? dest.nameHi : dest.name;
  return id;
}
