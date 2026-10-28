/**
 * Application state: one reducer shared through context. The 3D scene reports
 * navigation progress into it (throttled), and the UI sends intent actions.
 * The planned route is derived from start, destination and travel preference.
 */
import { createContext, useContext, useEffect, useMemo, useReducer, type Dispatch, type ReactNode } from 'react';
import { DESTINATIONS, DEFAULT_START_ID } from '../data/destinations';
import { planRoute } from '../services/routePlanner';
import type { PlanResult } from '../types/navigation';
import type { Language, PickMode, CameraMode, NavStatus, TravelPreference } from '../types/navigation';
import type { Level } from '../types/building';
import { loadPrefs, savePrefs } from './persistence';
import type { Destination } from '../types/navigation';

export type FloorVisibility = readonly [boolean, boolean, boolean, boolean];

export interface AppState {
  language: Language;
  startId: string;
  destinationId: string | null;
  /** Destination ids offered when a query matched several places. */
  clarification: string[] | null;
  preference: TravelPreference;
  navStatus: NavStatus;
  instructionIndex: number;
  progress: number;
  remainingMetres: number;
  currentLevel: number;
  speed: 1 | 2 | 4;
  muted: boolean;
  /** Incremented to ask the announcer to repeat the current instruction. */
  repeatNonce: number;
  floorVisible: FloorVisibility;
  focusLevel: Level | null;
  explode: number;
  cameraMode: CameraMode;
  /** Incremented whenever the camera should animate to the mode's framing. */
  cameraNonce: number;
  cutaway: boolean;
  lowDetail: boolean;
  pickMode: PickMode;
  selectedRoomId: string | null;
  blockedCorridor: string | null;
}

export type AppAction =
  | { type: 'set-language'; language: Language }
  | { type: 'set-start'; id: string }
  | { type: 'set-destination'; id: string | null }
  | { type: 'set-clarification'; ids: string[] | null }
  | { type: 'set-preference'; preference: TravelPreference }
  | { type: 'nav-start' }
  | { type: 'nav-pause' }
  | { type: 'nav-resume' }
  | { type: 'nav-stop' }
  | { type: 'nav-arrive' }
  | { type: 'nav-progress'; instructionIndex: number; progress: number; remainingMetres: number; currentLevel: number }
  | { type: 'set-speed'; speed: 1 | 2 | 4 }
  | { type: 'toggle-mute' }
  | { type: 'repeat-instruction' }
  | { type: 'toggle-floor'; level: Level }
  | { type: 'solo-floor'; level: Level | null }
  | { type: 'set-explode'; explode: number }
  | { type: 'set-camera'; mode: CameraMode; focusLevel?: Level | null }
  | { type: 'recenter-camera' }
  | { type: 'set-cutaway'; cutaway: boolean }
  | { type: 'set-low-detail'; lowDetail: boolean }
  | { type: 'set-pick-mode'; mode: PickMode }
  | { type: 'select-room'; id: string | null }
  | { type: 'toggle-blocked-corridor' }
  | { type: 'reset-demo' };

const ALL_VISIBLE: FloorVisibility = [true, true, true, true];

export function initialState(): AppState {
  const prefs = loadPrefs();
  const validDestination = prefs.destinationId && DESTINATIONS.some((d) => d.id === prefs.destinationId) ? prefs.destinationId : null;
  return {
    language: prefs.language,
    startId: prefs.startId || DEFAULT_START_ID,
    destinationId: validDestination,
    clarification: null,
    preference: prefs.preference,
    navStatus: 'idle',
    instructionIndex: 0,
    progress: 0,
    remainingMetres: 0,
    currentLevel: 0,
    speed: prefs.speed,
    muted: prefs.muted,
    repeatNonce: 0,
    floorVisible: ALL_VISIBLE,
    focusLevel: null,
    explode: 0,
    cameraMode: 'overview',
    cameraNonce: 0,
    cutaway: prefs.cutaway,
    lowDetail: prefs.lowDetail,
    pickMode: 'none',
    selectedRoomId: validDestination,
    blockedCorridor: null,
  };
}

function stopState(state: AppState): AppState {
  return { ...state, navStatus: 'idle', instructionIndex: 0, progress: 0, remainingMetres: 0 };
}

export function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'set-language':
      return { ...state, language: action.language };
    case 'set-start':
      if (action.id === state.startId) return state;
      return stopState({ ...state, startId: action.id });
    case 'set-destination':
      if (action.id === state.destinationId) return { ...state, clarification: null };
      return stopState({ ...state, destinationId: action.id, clarification: null, selectedRoomId: action.id, pickMode: 'none' });
    case 'set-clarification':
      return { ...state, clarification: action.ids };
    case 'set-preference':
      if (action.preference === state.preference) return state;
      return stopState({ ...state, preference: action.preference });
    case 'nav-start':
      if (!state.destinationId) return state;
      return { ...state, navStatus: 'navigating', progress: state.navStatus === 'arrived' ? 0 : state.progress };
    case 'nav-pause':
      return state.navStatus === 'navigating' ? { ...state, navStatus: 'paused' } : state;
    case 'nav-resume':
      return state.navStatus === 'paused' ? { ...state, navStatus: 'navigating' } : state;
    case 'nav-stop':
      return stopState(state);
    case 'nav-arrive':
      return { ...state, navStatus: 'arrived', progress: 1, remainingMetres: 0 };
    case 'nav-progress':
      if (state.navStatus === 'idle') return state;
      return {
        ...state,
        instructionIndex: action.instructionIndex,
        progress: action.progress,
        remainingMetres: action.remainingMetres,
        currentLevel: action.currentLevel,
      };
    case 'set-speed':
      return { ...state, speed: action.speed };
    case 'toggle-mute':
      return { ...state, muted: !state.muted };
    case 'repeat-instruction':
      return { ...state, repeatNonce: state.repeatNonce + 1 };
    case 'toggle-floor': {
      const next = [...state.floorVisible] as [boolean, boolean, boolean, boolean];
      next[action.level] = !next[action.level];
      // Never allow every floor to be hidden: the building would disappear.
      if (!next.some(Boolean)) return state;
      return { ...state, floorVisible: next, focusLevel: action.level };
    }
    case 'solo-floor': {
      if (action.level === null) return { ...state, floorVisible: ALL_VISIBLE, focusLevel: null };
      const next: [boolean, boolean, boolean, boolean] = [false, false, false, false];
      next[action.level] = true;
      return { ...state, floorVisible: next, focusLevel: action.level };
    }
    case 'set-explode':
      return { ...state, explode: Math.min(1, Math.max(0, action.explode)) };
    case 'set-camera':
      return {
        ...state,
        cameraMode: action.mode,
        focusLevel: action.focusLevel !== undefined ? action.focusLevel : state.focusLevel,
        cameraNonce: state.cameraNonce + 1,
      };
    case 'recenter-camera':
      return { ...state, cameraMode: 'overview', cameraNonce: state.cameraNonce + 1, floorVisible: ALL_VISIBLE, focusLevel: null };
    case 'set-cutaway':
      return { ...state, cutaway: action.cutaway };
    case 'set-low-detail':
      return { ...state, lowDetail: action.lowDetail };
    case 'set-pick-mode':
      return { ...state, pickMode: action.mode };
    case 'select-room':
      return { ...state, selectedRoomId: action.id };
    case 'toggle-blocked-corridor':
      return { ...stopState(state), blockedCorridor: state.blockedCorridor ? null : 'main-west' };
    case 'reset-demo': {
      const fresh = initialState();
      return { ...fresh, language: state.language, selectedRoomId: null };
    }
    default:
      return state;
  }
}

export interface AppContextValue {
  state: AppState;
  dispatch: Dispatch<AppAction>;
  /** Planned route for the current start, destination and preference. Null until a destination is chosen. */
  plan: PlanResult | null;
  destination: Destination | null;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);

  useEffect(() => {
    savePrefs({
      language: state.language,
      muted: state.muted,
      lowDetail: state.lowDetail,
      cutaway: state.cutaway,
      preference: state.preference,
      startId: state.startId,
      destinationId: state.destinationId,
      speed: state.speed,
    });
  }, [state.language, state.muted, state.lowDetail, state.cutaway, state.preference, state.startId, state.destinationId, state.speed]);

  const plan = useMemo<PlanResult | null>(
    () => (state.destinationId ? planRoute(state.startId, state.destinationId, state.preference, undefined, state.blockedCorridor ? [state.blockedCorridor] : []) : null),
    [state.startId, state.destinationId, state.preference, state.blockedCorridor],
  );

  const destination = useMemo(
    () => (state.destinationId ? DESTINATIONS.find((d) => d.id === state.destinationId) ?? null : null),
    [state.destinationId],
  );

  const value = useMemo<AppContextValue>(() => ({ state, dispatch, plan, destination }), [state, plan, destination]);
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useAppState must be used inside AppStateProvider');
  return ctx;
}
