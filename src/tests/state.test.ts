import { describe, expect, it } from 'vitest';
import { initialState, reducer, type AppState } from '../state/appState';
import { loadPrefs, PREFS_KEY, savePrefs } from '../state/persistence';

function base(overrides: Partial<AppState> = {}): AppState {
  return { ...initialState(), ...overrides };
}

describe('app reducer', () => {
  it('starts idle from the default start point with every floor visible', () => {
    const s = initialState();
    expect(s.navStatus).toBe('idle');
    expect(s.startId).toBe('EXT-MAIN');
    expect(s.floorVisible).toEqual([true, true, true, true]);
  });

  it('stops navigation when the destination changes, and clears the clarification', () => {
    const s = base({ destinationId: 'G-REC', navStatus: 'navigating', instructionIndex: 3, clarification: ['1-BLC'] });
    const next = reducer(s, { type: 'set-destination', id: '2-BB' });
    expect(next.destinationId).toBe('2-BB');
    expect(next.navStatus).toBe('idle');
    expect(next.instructionIndex).toBe(0);
    expect(next.clarification).toBeNull();
    expect(next.selectedRoomId).toBe('2-BB');
  });

  it('ignores progress while idle so a stale report cannot start the timeline', () => {
    const s = base({ destinationId: 'G-REC' });
    const next = reducer(s, { type: 'nav-progress', instructionIndex: 2, progress: 0.4, remainingMetres: 10, currentLevel: 1 });
    expect(next).toBe(s);
  });

  it('only starts navigation when a destination exists', () => {
    const s = base({ destinationId: null });
    expect(reducer(s, { type: 'nav-start' })).toBe(s);
    const ready = reducer(base({ destinationId: 'G-REC' }), { type: 'nav-start' });
    expect(ready.navStatus).toBe('navigating');
  });

  it('pauses and resumes only from the right states', () => {
    const navigating = base({ destinationId: 'G-REC', navStatus: 'navigating' });
    const paused = reducer(navigating, { type: 'nav-pause' });
    expect(paused.navStatus).toBe('paused');
    expect(reducer(paused, { type: 'nav-resume' }).navStatus).toBe('navigating');
    expect(reducer(base({ navStatus: 'idle' }), { type: 'nav-pause' }).navStatus).toBe('idle');
  });

  it('restarts from the beginning after arrival', () => {
    const arrived = base({ destinationId: 'G-REC', navStatus: 'arrived', progress: 1 });
    const again = reducer(arrived, { type: 'nav-start' });
    expect(again.navStatus).toBe('navigating');
    expect(again.progress).toBe(0);
  });

  it('never allows every floor to be hidden', () => {
    const s = base({ floorVisible: [false, false, false, true] });
    expect(reducer(s, { type: 'toggle-floor', level: 3 })).toBe(s);
    const hidden = reducer(base(), { type: 'toggle-floor', level: 1 });
    expect(hidden.floorVisible).toEqual([true, false, true, true]);
  });

  it('isolates a single floor and restores all floors', () => {
    const solo = reducer(base(), { type: 'solo-floor', level: 2 });
    expect(solo.floorVisible).toEqual([false, false, true, false]);
    expect(solo.focusLevel).toBe(2);
    expect(reducer(solo, { type: 'solo-floor', level: null }).floorVisible).toEqual([true, true, true, true]);
  });

  it('clamps explode to 0..1', () => {
    expect(reducer(base(), { type: 'set-explode', explode: 4 }).explode).toBe(1);
    expect(reducer(base(), { type: 'set-explode', explode: -2 }).explode).toBe(0);
  });

  it('sets a room as the start point while in start-pick mode', () => {
    const s = base({ pickMode: 'start' });
    const next = reducer(s, { type: 'set-start', id: '1-OPD' });
    expect(next.startId).toBe('1-OPD');
    expect(next.navStatus).toBe('idle');
  });

  it('recenters the camera to the overview with all floors visible', () => {
    const s = base({ cameraMode: 'closeup', floorVisible: [false, true, false, false], focusLevel: 1 });
    const next = reducer(s, { type: 'recenter-camera' });
    expect(next.cameraMode).toBe('overview');
    expect(next.floorVisible).toEqual([true, true, true, true]);
    expect(next.cameraNonce).toBe(s.cameraNonce + 1);
  });

  it('resets the demo but keeps the chosen language', () => {
    const s = base({ language: 'hi', destinationId: 'G-REC', explode: 0.6 });
    const next = reducer(s, { type: 'reset-demo' });
    expect(next.language).toBe('hi');
    expect(next.destinationId).toBeNull();
    expect(next.explode).toBe(0);
  });
});

describe('persistence', () => {
  it('round-trips demo preferences through localStorage', () => {
    savePrefs({ language: 'hi', muted: true, lowDetail: false, cutaway: true, preference: 'step-free', startId: 'G-REC', destinationId: '2-BB', speed: 4 });
    expect(loadPrefs()).toEqual({ language: 'hi', muted: true, lowDetail: false, cutaway: true, preference: 'step-free', startId: 'G-REC', destinationId: '2-BB', speed: 4 });
  });

  it('falls back to defaults when stored data is malformed', () => {
    window.localStorage.setItem(PREFS_KEY, '{not json');
    expect(loadPrefs().language).toBe('en');
    window.localStorage.setItem(PREFS_KEY, JSON.stringify({ language: 'fr', speed: 9, preference: 'weird' }));
    const prefs = loadPrefs();
    expect(prefs.language).toBe('en');
    expect(prefs.speed).toBe(2);
    expect(prefs.preference).toBe('shortest');
  });
});
