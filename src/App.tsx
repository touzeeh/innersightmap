import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { DESTINATIONS } from './data/destinations';
import { getNavigationGraph } from './data/navigationGraph';
import { AppStateProvider, useAppState } from './state/appState';
import { clearPrefs } from './state/persistence';
import { useSpeechSynthesis } from './hooks/useSpeechSynthesis';
import { useVoiceRecognition } from './hooks/useVoiceRecognition';
import { detectWebGL, usePrefersReducedMotion } from './hooks/useCapabilities';
import { tr, type StringKey } from './i18n/strings';
import { CATEGORY_META } from './i18n/categories';
import { floorLabel, resolveDestination } from './services/destinationSearch';
import { parseVoiceIntent, type VoiceCommand } from './services/voiceIntent';
import { formatEstimate, planRoute } from './services/routePlanner';
import { buildTimeline } from './services/routeTimeline';
import type { AvatarProgress } from './three/Avatar';
import type { Instruction, Language, PickMode } from './types/navigation';
import type { Level } from './types/building';
import { Header } from './components/layout/Header';
import { DestinationSearch } from './components/search/DestinationSearch';
import { RoutePanel } from './components/navigation/RoutePanel';
import { LiveGuidance } from './components/navigation/LiveGuidance';
import { FlythroughHud } from './components/navigation/FlythroughHud';
import { FirstPersonRadar } from './components/navigation/FirstPersonRadar';
import { CameraControls, FloorSelector } from './components/building/ViewControls';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SceneFallback, SceneLoading } from './components/common/SceneFallback';
import './styles.css';

/** The 3D bundle (Three.js, R3F, drei) loads on demand so the page shell paints first. */
const BuildingScene = lazy(() => import('./three/BuildingScene').then((m) => ({ default: m.BuildingScene })));

const NO_INSTRUCTIONS: readonly Instruction[] = [];

function InnerSight() {
  const { state, dispatch, plan, destination } = useAppState();
  const { language, muted, navStatus, instructionIndex, repeatNonce } = state;
  const graph = getNavigationGraph();
  const route = plan && plan.ok ? plan.route : null;
  const instructions = route ? route.instructions : NO_INSTRUCTIONS;
  const timeline = useMemo(() => (route ? buildTimeline(route.nodeIds, graph) : null), [route, graph]);

  const speech = useSpeechSynthesis();
  const reducedMotion = usePrefersReducedMotion();
  const [webgl] = useState(detectWebGL);
  const [sceneProblem, setSceneProblem] = useState<StringKey | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('innersight-theme') === 'dark');
  const [autoRotate, setAutoRotate] = useState(false);

  useEffect(() => {
    window.localStorage.setItem('innersight-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const speakable = useCallback(
    (text: string, lang: Language) => {
      if (!muted && speech.supported && text) speech.speak(text, lang);
    },
    [muted, speech],
  );

  const report = useCallback(
    (text: string) => {
      setFeedback(text);
      speakable(text, language);
    },
    [language, speakable],
  );

  // Announce the current instruction as navigation moves on.
  useEffect(() => {
    if (!route) return;
    if (navStatus === 'idle' || navStatus === 'paused') {
      speech.cancel();
      return;
    }
    const ins = route.instructions[instructionIndex];
    if (ins) speakable(ins.text[language], language);
    // Only the instruction, status and language drive announcements.
  }, [navStatus, instructionIndex, language, route]);

  // Repeat request: speak the current instruction on demand, even while paused.
  const repeatSeen = useRef(0);
  useEffect(() => {
    if (repeatNonce === repeatSeen.current) return;
    repeatSeen.current = repeatNonce;
    if (!route) return;
    const ins = route.instructions[instructionIndex];
    if (ins) speakable(ins.text[language], language);
  }, [repeatNonce]);

  useEffect(() => {
    if (muted) speech.cancel();
  }, [muted, speech]);

  const choose = useCallback(
    (id: string) => {
      dispatch({ type: 'set-destination', id });
      setFeedback(null);
    },
    [dispatch],
  );

  /** Voice selection: set the destination, then say how far it is and wait for "start". */
  const chooseByVoice = useCallback(
    (id: string) => {
      choose(id);
      const target = DESTINATIONS.find((d) => d.id === id);
      const result = planRoute(state.startId, id, state.preference, graph);
      if (!target) return;
      const name = language === 'hi' ? target.nameHi : target.name;
      if (result.ok) {
        const r = result.route;
        const text =
          language === 'hi'
            ? `${name} का मार्ग तैयार है: लगभग ${r.distanceMeters} मीटर, ${formatEstimate(r.estimatedSeconds, 'hi')}। शुरू करने के लिए "नेविगेशन शुरू करो" बोलें।`
            : `Route to ${name} is ready: about ${r.distanceMeters} metres, ${formatEstimate(r.estimatedSeconds)}. Say "start navigation" when you are ready.`;
        report(text);
      } else {
        report(result.message[language]);
      }
    },
    [choose, graph, language, report, state.preference, state.startId],
  );

  const runCommand = useCallback(
    (command: VoiceCommand) => {
      switch (command) {
        case 'start': {
          if (!route) {
            const reason = plan && !plan.ok ? plan.message[language] : tr('voiceNeedDestination', language);
            report(reason);
            return;
          }
          if (navStatus !== 'navigating') dispatch({ type: 'nav-start' });
          return;
        }
        case 'stop':
          dispatch({ type: 'nav-stop' });
          speech.cancel();
          report(tr('voiceStopped', language));
          return;
        case 'pause':
          if (navStatus === 'navigating') {
            dispatch({ type: 'nav-pause' });
            speech.cancel();
            report(tr('voicePaused', language));
          }
          return;
        case 'resume':
          if (navStatus === 'paused') {
            dispatch({ type: 'nav-resume' });
            setFeedback(tr('voiceResumed', language));
          }
          return;
        case 'repeat':
          if (route && (navStatus === 'navigating' || navStatus === 'paused' || navStatus === 'arrived')) {
            dispatch({ type: 'repeat-instruction' });
          } else {
            report(tr('voiceNothingToRepeat', language));
          }
          return;
        case 'language-hi':
        case 'language-en': {
          const next: Language = command === 'language-hi' ? 'hi' : 'en';
          dispatch({ type: 'set-language', language: next });
          const text = tr(next === 'hi' ? 'voiceLanguageHindi' : 'voiceLanguageEnglish', next);
          setFeedback(text);
          if (!muted && speech.supported) speech.speak(text, next);
          return;
        }
      }
    },
    [dispatch, language, muted, navStatus, plan, report, route, speech],
  );

  const handleTranscript = useCallback(
    (transcript: string) => {
      const intent = parseVoiceIntent(transcript, state.clarification?.length ?? 0);
      switch (intent.type) {
        case 'empty':
          report(tr('voiceFeedbackEmpty', language));
          return;
        case 'command':
          runCommand(intent.command);
          return;
        case 'select': {
          const id = state.clarification?.[intent.index];
          if (id) chooseByVoice(id);
          return;
        }
        case 'destination': {
          const resolution = resolveDestination(intent.query);
          if (resolution.status === 'single' && resolution.match) {
            chooseByVoice(resolution.match.id);
          } else if (resolution.status === 'ambiguous' && resolution.options.length > 0) {
            dispatch({ type: 'set-clarification', ids: resolution.options.map((o) => o.id) });
            report(tr('voiceFeedbackAmbiguous', language));
          } else {
            report(tr('voiceFeedbackNone', language));
          }
        }
      }
    },
    [chooseByVoice, dispatch, language, report, runCommand, state.clarification],
  );

  const voice = useVoiceRecognition(language, handleTranscript);

  // Scene callbacks. Both are stable so the memoised scene does not re-render on progress.
  const onProgress = useCallback((p: AvatarProgress) => dispatch({ type: 'nav-progress', ...p }), [dispatch]);
  const onArrive = useCallback(() => dispatch({ type: 'nav-arrive' }), [dispatch]);
  const onContextLost = useCallback(() => setSceneProblem('webglLost'), []);

  const onRoomSelect = useCallback(
    (id: string) => {
      if (state.pickMode === 'start') {
        dispatch({ type: 'set-start', id });
        dispatch({ type: 'set-pick-mode', mode: 'none' });
        return;
      }
      // Choosing a destination also clears any pending clarification and the pick mode.
      choose(id);
    },
    [choose, dispatch, state.pickMode],
  );

  // Escape cancels a pending map pick.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape' && state.pickMode !== 'none') dispatch({ type: 'set-pick-mode', mode: 'none' });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [dispatch, state.pickMode]);

  const navigating = navStatus === 'navigating' || navStatus === 'paused' || navStatus === 'arrived';
  // Be honest about what the browser can speak: no output at all, or no voice for the chosen language.
  const speechNote = !speech.supported
    ? tr('voiceUnavailableNote', language)
    : language === 'hi' && !speech.hasVoice('hi')
      ? tr('noHindiVoice', language)
      : null;
  const selectedRoom = state.selectedRoomId ? DESTINATIONS.find((d) => d.id === state.selectedRoomId) ?? null : null;
  const SelectedIcon = selectedRoom ? CATEGORY_META[selectedRoom.category].icon : null;
  const setPick = (mode: PickMode): void => dispatch({ type: 'set-pick-mode', mode });
  const startNavigation = useCallback(() => dispatch({ type: 'nav-start' }), [dispatch]);

  const sceneNode = !webgl ? (
    <SceneFallback language={language} reason="webglUnavailable" />
  ) : sceneProblem ? (
    <SceneFallback language={language} reason={sceneProblem} />
  ) : (
    <ErrorBoundary fallback={() => <SceneFallback language={language} reason="sceneError" />}>
      <Suspense fallback={<SceneLoading language={language} />}>
        <BuildingScene
          key={state.lowDetail ? 'low' : 'high'}
          language={language}
          floorVisible={state.floorVisible}
          navLevel={Math.round(navigating ? state.currentLevel : (graph.nodes.get(state.startId)?.level ?? state.currentLevel))}
          explode={state.explode}
          cutaway={state.cutaway}
          lowDetail={state.lowDetail}
          darkMode={darkMode}
          autoRotate={autoRotate}
          cameraMode={state.cameraMode}
          cameraNonce={state.cameraNonce}
          focusLevel={state.focusLevel}
          startId={state.startId}
          destinationId={state.destinationId}
          selectedRoomId={state.selectedRoomId}
          blockedCorridor={state.blockedCorridor}
          timeline={timeline}
          instructions={instructions}
          navStatus={navStatus}
          speed={state.speed}
          reducedMotion={reducedMotion}
          onRoomSelect={onRoomSelect}
          onProgress={onProgress}
          onArrive={onArrive}
          onContextLost={onContextLost}
        />
      </Suspense>
    </ErrorBoundary>
  );

  return (
    <div className="app" lang={language} data-theme={darkMode ? 'dark' : 'light'}>
      <Header
        language={language}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onLanguage={(next) => dispatch({ type: 'set-language', language: next })}
        onResetDemo={() => {
          clearPrefs();
          speech.cancel();
          setFeedback(null);
          dispatch({ type: 'reset-demo' });
          dispatch({ type: 'recenter-camera' });
        }}
      />

      <main className="layout">
        <aside className={`sidebar${route ? ' has-route' : ''}`} aria-label={tr('searchHeading', language)}>
          <DestinationSearch
            language={language}
            clarification={state.clarification}
            feedback={feedback}
            note={speechNote}
            voice={voice}
            onChoose={choose}
            onDismissClarification={() => dispatch({ type: 'set-clarification', ids: null })}
          />
          <RoutePanel
            language={language}
            startId={state.startId}
            selectedRoomId={state.selectedRoomId}
            destination={destination}
            preference={state.preference}
            navStatus={navStatus}
            plan={plan}
            pickMode={state.pickMode}
            activeInstruction={instructionIndex}
            onStartChange={(id) => dispatch({ type: 'set-start', id })}
            onPreferenceChange={(preference) => dispatch({ type: 'set-preference', preference })}
            onPickMode={setPick}
            onClearDestination={() => dispatch({ type: 'set-destination', id: null })}
            onStart={startNavigation}
            onSwap={() => {
              if (!destination) return;
              dispatch({ type: 'set-start', id: destination.id });
              dispatch({ type: 'set-destination', id: state.startId });
            }}
            blockedCorridor={state.blockedCorridor}
            onToggleBlockedCorridor={() => dispatch({ type: 'toggle-blocked-corridor' })}
          />
        </aside>

        <section className="stage" aria-label="3D building">
          <div className="stage-view">
            {sceneNode}

            {state.cameraMode === 'firstperson' && timeline ? <FirstPersonRadar timeline={timeline} progress={state.progress} language={language} /> : null}

            <div className="spatial-dock">
              <FloorSelector
                language={language}
                floorVisible={state.floorVisible}
                focusLevel={state.focusLevel}
                onToggleFloor={(level: Level) => dispatch({ type: 'toggle-floor', level })}
                onSolo={(level) => {
                  dispatch({ type: 'solo-floor', level });
                  if (level !== null) dispatch({ type: 'set-camera', mode: 'floor', focusLevel: level });
                }}
              />
              <CameraControls
                language={language}
                autoRotate={autoRotate}
                cameraMode={state.cameraMode}
                explode={state.explode}
                cutaway={state.cutaway}
                lowDetail={state.lowDetail}
                onCamera={(mode, focusLevel) => dispatch({ type: 'set-camera', mode, focusLevel })}
                onExplode={(explode) => dispatch({ type: 'set-explode', explode })}
                onCutaway={(cutaway) => dispatch({ type: 'set-cutaway', cutaway })}
                onLowDetail={(lowDetail) => dispatch({ type: 'set-low-detail', lowDetail })}
                onResetCamera={() => dispatch({ type: 'recenter-camera' })}
                onToggleAutoRotate={() => setAutoRotate((current) => !current)}
              />
            </div>

            {state.pickMode !== 'none' ? (
              <div className="pick-banner" role="status">
                <span>{tr(state.pickMode === 'start' ? 'pickingStart' : 'pickingDestination', language)}</span>
                <button type="button" className="ghost-button compact" onClick={() => setPick('none')}>
                  {tr('cancelPick', language)}
                </button>
              </div>
            ) : null}

            {selectedRoom && !navigating && state.pickMode === 'none' ? (
              <div className="room-card overlay-room-card" aria-live="polite">
                <span className="result-icon" style={{ color: CATEGORY_META[selectedRoom.category].accent }} aria-hidden="true">
                  {SelectedIcon ? <SelectedIcon size={20} /> : null}
                </span>
                <div>
                  <span className="live-label">{tr('roomInfo', language)}</span>
                  <strong>{language === 'hi' ? selectedRoom.nameHi : selectedRoom.name}</strong>
                  <span className="result-meta">
                    {floorLabel(selectedRoom.level, language)} · {CATEGORY_META[selectedRoom.category].label[language]}
                    {selectedRoom.roomNumber ? ` · ${selectedRoom.roomNumber}` : ''}
                  </span>
                </div>
                <div className="room-card-actions">
                  <button type="button" className="ghost-button compact" onClick={() => dispatch({ type: 'set-start', id: selectedRoom.id })}>
                    {tr('setAsStart', language)}
                  </button>
                </div>
              </div>
            ) : null}

            {route && destination ? createPortal(
              <div className="overlay overlay-bottom">
                {navigating ? <LiveGuidance
                  language={language}
                  route={route}
                  destination={destination}
                  navStatus={navStatus}
                  instructionIndex={instructionIndex}
                  progress={state.progress}
                  remainingMetres={state.remainingMetres}
                  currentLevel={state.currentLevel}
                  muted={muted}
                  speed={state.speed}
                  firstPerson={state.cameraMode === 'firstperson'}
                  onToggleFirstPerson={() => dispatch({ type: 'set-camera', mode: state.cameraMode === 'firstperson' ? 'follow' : 'firstperson' })}
                  onPause={() => dispatch({ type: 'nav-pause' })}
                  onResume={() => dispatch({ type: 'nav-resume' })}
                  onStop={() => {
                    dispatch({ type: 'nav-stop' });
                    speech.cancel();
                  }}
                  onRepeat={() => dispatch({ type: 'repeat-instruction' })}
                  onToggleMute={() => dispatch({ type: 'toggle-mute' })}
                  onSpeed={(speed) => dispatch({ type: 'set-speed', speed })}
                  onPrevious={() => { const previous = route.instructions[Math.max(0, instructionIndex - 1)]; if (previous) speakable(previous.text[language], language); }}
                  onNext={() => { const next = route.instructions[Math.min(route.instructions.length - 1, instructionIndex + 1)]; if (next) speakable(next.text[language], language); }}
                /> : <FlythroughHud language={language} route={route} muted={muted} firstPerson={state.cameraMode === 'firstperson'} onToggleFirstPerson={() => dispatch({ type: 'set-camera', mode: state.cameraMode === 'firstperson' ? 'overview' : 'firstperson' })} onPlay={startNavigation} onToggleMute={() => dispatch({ type: 'toggle-mute' })} />}
              </div>,
              document.body,
            ) : null}
          </div>
          {!route && navStatus !== 'navigating' && navStatus !== 'paused' ? <p className="stage-hint">{tr('controlsHint', language)}</p> : null}
        </section>
      </main>

    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <InnerSight />
    </AppStateProvider>
  );
}

