/**
 * Demo preferences in localStorage. Only user choices are stored. Navigation
 * always starts idle on reload, so a visitor is never dropped into a running
 * simulation they did not ask for.
 */
import type { Language, TravelPreference } from '../types/navigation';

export const PREFS_KEY = 'innersight:prefs:v1';

export interface StoredPrefs {
  language: Language;
  muted: boolean;
  lowDetail: boolean;
  cutaway: boolean;
  preference: TravelPreference;
  startId: string;
  destinationId: string | null;
  speed: 1 | 2 | 4;
}

const DEFAULTS: StoredPrefs = {
  language: 'en',
  muted: false,
  lowDetail: false,
  cutaway: false,
  preference: 'shortest',
  startId: 'EXT-MAIN',
  destinationId: null,
  speed: 2,
};

function storage(): Storage | null {
  try {
    return typeof window !== 'undefined' && window.localStorage ? window.localStorage : null;
  } catch {
    return null;
  }
}

/** Load preferences, ignoring anything malformed or stale. */
export function loadPrefs(): StoredPrefs {
  const store = storage();
  if (!store) return { ...DEFAULTS };
  try {
    const raw = store.getItem(PREFS_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw) as Partial<StoredPrefs>;
    return {
      language: parsed.language === 'hi' ? 'hi' : 'en',
      muted: Boolean(parsed.muted),
      lowDetail: Boolean(parsed.lowDetail),
      cutaway: Boolean(parsed.cutaway),
      preference: parsed.preference === 'step-free' ? 'step-free' : 'shortest',
      startId: typeof parsed.startId === 'string' ? parsed.startId : DEFAULTS.startId,
      destinationId: typeof parsed.destinationId === 'string' ? parsed.destinationId : null,
      speed: parsed.speed === 1 || parsed.speed === 4 ? parsed.speed : 2,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

export function savePrefs(prefs: StoredPrefs): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Storage can be full or blocked (private mode). Preferences are a convenience only.
  }
}

export function clearPrefs(): void {
  const store = storage();
  try {
    store?.removeItem(PREFS_KEY);
  } catch {
    // Ignore: nothing else depends on this key.
  }
}
