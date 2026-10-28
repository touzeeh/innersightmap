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
import { resolveDestination } from './services/destinationSearch';
import { parseVoiceIntent, type VoiceCommand } from './services/voiceIntent';
import { formatEstimate, planRoute } from './services/routePlanner';
import { buildTimeline } from './services/routeTimeline';
import type { AvatarProgress } from './three/Avatar';
import type { Instruction, Language, PickMode } from './types/navigation';
import type { Level, RoomCategory } from './types/building';
import { Header } from './components/layout/Header';
import { DestinationSearch } from './components/search/DestinationSearch';
import { RoutePanel } from './components/navigation/RoutePanel';
import { LiveGuidance } from './components/navigation/LiveGuidance';
import { FirstPersonRadar } from './components/navigation/FirstPersonRadar';
import { CameraControls, FloorSelector } from './components/building/ViewControls';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { SceneFallback, SceneLoading } from './components/common/SceneFallback';
import './styles.css';

/** The 3D bundle (Three.js, R3F, drei) loads on demand so the page shell paints first. */
const BuildingScene = lazy(() => import('./three/BuildingScene').then((m) => ({ default: m.BuildingScene })));

const NO_INSTRUCTIONS: readonly Instruction[] = [];

type ControllerEvent = { type: 'STEP_ENTER' | 'APPROACH' | 'ARRIVE' | 'PAUSE' | 'RESUME' | 'SEEK'; index: number; nonce: number };
interface NavigationStep {
  id: string;
  icon: Instruction['kind'];
  short: string;
  long: Instruction['text'];
  distance: number;
  floor: number;
  startDist: number;
  maneuverDist: number;
  endDist: number;
}

function shortInstruction(text: string): string {
  const firstSentence = text.split(/(?<=[.!?।])\s+/u)[0]?.trim() ?? text.trim();
  const chars = Array.from(firstSentence);
  if (chars.length <= 40) return firstSentence;
  const shortened = chars.slice(0, 39).join('');
  const wordBoundary = shortened.lastIndexOf(' ');
  return `${(wordBoundary > 20 ? shortened.slice(0, wordBoundary) : shortened).trim()}…`;
}

function InnerSight() {
  const { state, dispatch, plan, destination } = useAppState();
  const { language, muted, navStatus, instructionIndex, repeatNonce } = state;
  const graph = getNavigationGraph();
  const route = plan && plan.ok ? plan.route : null;
  const instructions = route ? route.instructions : NO_INSTRUCTIONS;
  const timeline = useMemo(() => (route ? buildTimeline(route.nodeIds, graph) : null), [route, graph]);
  const routeSteps = useMemo<NavigationStep[]>(() => {
    if (!route) return [];
    return route.instructions.map((instruction, index) => {
      const startDist = instruction.distanceAt;
      const endDist = route.instructions[index + 1]?.distanceAt ?? route.distanceMeters;
      return {
        id: `${route.startId}:${route.destinationId}:${instruction.index}`,
        icon: instruction.kind,
        short: shortInstruction(instruction.text[language]),
        long: instruction.text,
        distance: Math.max(0, endDist - startDist),
        floor: instruction.level,
        startDist,
        maneuverDist: instruction.distanceAt,
        endDist: Math.max(startDist, endDist),
      };
    });
  }, [route, language]);

  const speech = useSpeechSynthesis();
  const speechRef = useRef(speech);
  speechRef.current = speech;
  const reducedMotion = usePrefersReducedMotion();
  const [webgl] = useState(detectWebGL);
  const [sceneProblem, setSceneProblem] = useState<StringKey | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState(() => window.localStorage.getItem('innersight-theme') === 'dark');
  const [autoRotate, setAutoRotate] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<RoomCategory | 'circulation' | null>(null);
  const [panelScrolling, setPanelScrolling] = useState(false);
  const [controllerEvents, setControllerEvents] = useState<ControllerEvent[]>([]);
  const panelScrollTimer = useRef<number | null>(null);
  const eventNonce = useRef(0);
  const processedVoiceEventNonce = useRef(0);
  const loggedControllerEventNonce = useRef(0);
  const deferredVoiceEvent = useRef<ControllerEvent | null>(null);
  const voiceStarted = useRef(false);
  const lastSpokenStepId = useRef<string | null>(null);
  const lastProgressStep = useRef(-1);
  const approachSpoken = useRef(new Set<string>());
  const hindiFallbackShown = useRef(false);

  const emitControllerEvent = useCallback((type: ControllerEvent['type'], index = state.instructionIndex) => {
    const nextEvent = { type, index, nonce: ++eventNonce.current };
    setControllerEvents((events) => ['SEEK', 'PAUSE', 'RESUME', 'ARRIVE'].includes(type) ? [nextEvent] : [...events, nextEvent]);
  }, [state.instructionIndex]);
  const consumeControllerEvent = useCallback((nonce: number) => {
    setControllerEvents((events) => events.filter((event) => event.nonce !== nonce));
  }, []);

  const pauseSceneDuringPanelScroll = useCallback(() => {
    setPanelScrolling(true);
    if (panelScrollTimer.current !== null) window.clearTimeout(panelScrollTimer.current);
    panelScrollTimer.current = window.setTimeout(() => {
      setPanelScrolling(false);
      panelScrollTimer.current = null;
    }, 180);
  }, []);

  useEffect(() => () => {
    if (panelScrollTimer.current !== null) window.clearTimeout(panelScrollTimer.current);
  }, []);

  useEffect(() => {
    const params = new URL(window.location.href).searchParams;
    const sharedStart = params.get('start');
    const sharedDestination = params.get('destination');
    if (sharedStart && graph.nodes.has(sharedStart)) dispatch({ type: 'set-start', id: sharedStart });
    if (sharedDestination && graph.nodes.has(sharedDestination)) dispatch({ type: 'set-destination', id: sharedDestination });
  }, [dispatch, graph]);

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
  const toggleMute = useCallback(() => {
    if (!muted) speechRef.current.cancel();
    dispatch({ type: 'toggle-mute' });
  }, [dispatch, muted]);

  const startNavigation = useCallback(() => {
    if (!route) return;
    speechRef.current.cancel();
    if (navStatus === 'arrived') dispatch({ type: 'nav-stop' });
    voiceStarted.current = true;
    lastSpokenStepId.current = null;
    approachSpoken.current.clear();
    lastProgressStep.current = navStatus === 'arrived' ? 0 : state.instructionIndex;
    emitControllerEvent('STEP_ENTER', navStatus === 'arrived' ? 0 : state.instructionIndex);
    dispatch({ type: 'nav-start' });
  }, [dispatch, emitControllerEvent, navStatus, route, state.instructionIndex]);

  const seekStep = useCallback((index: number) => {
    if (!route || !timeline || !routeSteps[index]) return;
    const safeIndex = Math.max(0, Math.min(routeSteps.length - 1, index));
    const instruction = route.instructions[safeIndex];
    const seekTime = timeline.nodeTimes[Math.min(instruction.nodeIndex, timeline.nodeTimes.length - 1)] ?? 0;
    const positionMetres = routeSteps[safeIndex].startDist;
    dispatch({
      type: 'nav-seek', instructionIndex: safeIndex,
      progress: timeline.duration > 0 ? seekTime / timeline.duration : 0,
      positionMetres, remainingMetres: Math.max(0, route.distanceMeters - positionMetres),
      currentLevel: instruction.level, seekTime,
    });
    lastProgressStep.current = safeIndex;
    if (voiceStarted.current) emitControllerEvent('SEEK', safeIndex);
    else emitControllerEvent('SEEK', safeIndex);
  }, [dispatch, emitControllerEvent, route, routeSteps, timeline]);

  // One event stream drives both navigation UI state and speech announcements.
  useEffect(() => {
    const controllerEvent = controllerEvents[0];
    if (!controllerEvent || processedVoiceEventNonce.current === controllerEvent.nonce) return;
    const engine = speechRef.current;
    const step = routeSteps[controllerEvent.index];
    const debug = new URL(window.location.href).searchParams.get('debug') === '1';
    const logEvent = (spokenText: string): void => {
      if (debug && loggedControllerEventNonce.current !== controllerEvent.nonce) {
        loggedControllerEventNonce.current = controllerEvent.nonce;
        console.info('[InnerSight navigation]', JSON.stringify({
        timestamp: new Date().toISOString(), event: controllerEvent.type,
        position: `${Math.round(state.positionMetres)} m`, stepIndex: controllerEvent.index, spokenText,
        }));
      }
    };
    if (controllerEvent.type === 'PAUSE') {
      processedVoiceEventNonce.current = controllerEvent.nonce;
      engine.cancel();
      logEvent('');
      consumeControllerEvent(controllerEvent.nonce);
      return;
    }
    if (!voiceStarted.current || muted) {
      processedVoiceEventNonce.current = controllerEvent.nonce;
      if (controllerEvent.type !== 'APPROACH') logEvent('');
      consumeControllerEvent(controllerEvent.nonce);
      return;
    }
    if (!engine.voicesReady) {
      const anticipated = controllerEvent.type === 'STEP_ENTER' || controllerEvent.type === 'RESUME' || controllerEvent.type === 'SEEK'
        ? step?.short ?? ''
        : controllerEvent.type === 'APPROACH' && step && state.speed !== 4
          ? tr('approachPrompt', language).replace('{distance}', state.speed === 2 ? '15' : '10').replace('{step}', step.short)
          : controllerEvent.type === 'ARRIVE' && destination
            ? tr('voiceArrivedAt', language).replace('{destination}', language === 'hi' ? destination.nameHi : destination.name)
            : '';
      if (engine.supported) deferredVoiceEvent.current = controllerEvent;
      processedVoiceEventNonce.current = controllerEvent.nonce;
      logEvent(anticipated);
      consumeControllerEvent(controllerEvent.nonce);
      return;
    }
    if (language === 'hi' && !engine.hasVoice('hi')) {
      processedVoiceEventNonce.current = controllerEvent.nonce;
      engine.cancel();
      if (!hindiFallbackShown.current) {
        hindiFallbackShown.current = true;
        setFeedback(tr('hindiVoiceUnavailable', language));
      }
      logEvent('');
      consumeControllerEvent(controllerEvent.nonce);
      return;
    }
    let utterance = '';
    const rate = state.speed === 4 ? 1.3 : state.speed === 2 ? 1.15 : 1;
    if (controllerEvent.type === 'STEP_ENTER' && step) {
      if (lastSpokenStepId.current === step.id) {
        processedVoiceEventNonce.current = controllerEvent.nonce;
        consumeControllerEvent(controllerEvent.nonce);
        return;
      }
      lastSpokenStepId.current = step.id;
      utterance = step.short;
    } else if (controllerEvent.type === 'APPROACH' && step && state.speed !== 4) {
      utterance = tr('approachPrompt', language).replace('{distance}', state.speed === 2 ? '15' : '10').replace('{step}', step.short);
    } else if (controllerEvent.type === 'ARRIVE' && destination) {
      const name = language === 'hi' ? destination.nameHi : destination.name;
      utterance = tr('voiceArrivedAt', language).replace('{destination}', name);
    } else if (controllerEvent.type === 'RESUME' && step) {
      utterance = step.short;
      lastSpokenStepId.current = step.id;
    } else if (controllerEvent.type === 'SEEK' && step) {
      utterance = step.short;
      lastSpokenStepId.current = step.id;
    }
    if (utterance) {
      const canFinishCurrent = state.speed !== 4 && ['STEP_ENTER', 'APPROACH', 'ARRIVE'].includes(controllerEvent.type);
      if (canFinishCurrent) engine.enqueue(utterance, language, rate);
      else engine.speak(utterance, language, rate);
    }
    processedVoiceEventNonce.current = controllerEvent.nonce;
    logEvent(utterance);
    consumeControllerEvent(controllerEvent.nonce);
  }, [controllerEvents, routeSteps, language, muted, state.speed, state.positionMetres, destination, speech.voicesReady, speech.hasVoice, consumeControllerEvent]);

  useEffect(() => {
    const pending = deferredVoiceEvent.current;
    if (!pending || !speech.voicesReady) return;
    deferredVoiceEvent.current = null;
    if (!voiceStarted.current || muted || navStatus !== 'navigating') return;
    if (language === 'hi' && !speech.hasVoice('hi')) {
      if (!hindiFallbackShown.current) {
        hindiFallbackShown.current = true;
        setFeedback(tr('hindiVoiceUnavailable', language));
      }
      return;
    }
    if (pending.type === 'APPROACH' && state.speed !== 4 && routeSteps[pending.index] && routeSteps[pending.index].maneuverDist > state.positionMetres) {
      emitControllerEvent('APPROACH', pending.index);
    } else {
      emitControllerEvent('STEP_ENTER', state.instructionIndex);
    }
  }, [speech.voicesReady, speech.hasVoice, navStatus, muted, language, routeSteps, state.speed, state.positionMetres, state.instructionIndex, emitControllerEvent]);

  // If browser voices arrive after navigation starts, show the Hindi text-only fallback once.
  useEffect(() => {
    if (voiceStarted.current && language === 'hi' && speech.voicesReady && !speech.hasVoice('hi') && !hindiFallbackShown.current) {
      hindiFallbackShown.current = true;
      setFeedback(tr('hindiVoiceUnavailable', language));
    }
  }, [language, speech.voicesReady, speech.hasVoice]);

  // Repeat request: speak the current instruction on demand, even while paused.
  const repeatSeen = useRef(0);
  useEffect(() => {
    if (repeatNonce === repeatSeen.current) return;
    repeatSeen.current = repeatNonce;
    if (!route) return;
    const step = routeSteps[instructionIndex];
    if (step && voiceStarted.current) {
      const engine = speechRef.current;
      if (language === 'hi' && engine.voicesReady && !engine.hasVoice('hi')) return;
      engine.speak(step.short, language, state.speed === 4 ? 1.3 : state.speed === 2 ? 1.15 : 1);
    }
  }, [repeatNonce, routeSteps, instructionIndex, language, state.speed]);

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
          if (navStatus !== 'navigating') startNavigation();
          return;
        }
        case 'stop':
          dispatch({ type: 'nav-stop' });
          voiceStarted.current = false;
          speech.cancel();
          report(tr('voiceStopped', language));
          return;
        case 'pause':
          if (navStatus === 'navigating') {
            dispatch({ type: 'nav-pause' });
            emitControllerEvent('PAUSE');
            setFeedback(tr('voicePaused', language));
          }
          return;
        case 'resume':
          if (navStatus === 'paused') {
            dispatch({ type: 'nav-resume' });
            emitControllerEvent('RESUME');
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
    [dispatch, emitControllerEvent, language, muted, navStatus, plan, report, route, speech, startNavigation],
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
  const onProgress = useCallback((p: AvatarProgress) => {
    dispatch({ type: 'nav-progress', ...p });
    if (p.instructionIndex !== lastProgressStep.current) {
      lastProgressStep.current = p.instructionIndex;
      emitControllerEvent('STEP_ENTER', p.instructionIndex);
    }
    const upcomingIndex = p.instructionIndex + 1;
    const upcoming = routeSteps[upcomingIndex];
    const threshold = state.speed === 1 ? 10 : state.speed === 2 ? 15 : 0;
    if (upcoming && threshold > 0 && upcoming.maneuverDist > 0 && upcoming.maneuverDist - p.positionMetres <= threshold && upcoming.maneuverDist - p.positionMetres >= 0 && !approachSpoken.current.has(upcoming.id)) {
      approachSpoken.current.add(upcoming.id);
      emitControllerEvent('APPROACH', upcomingIndex);
    }
  }, [dispatch, emitControllerEvent, routeSteps, state.speed]);
  const onArrive = useCallback(() => {
    dispatch({ type: 'nav-arrive' });
    emitControllerEvent('ARRIVE', Math.max(0, routeSteps.length - 1));
  }, [dispatch, emitControllerEvent, routeSteps.length]);
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
    : null;
  const setPick = (mode: PickMode): void => dispatch({ type: 'set-pick-mode', mode });
  const emergencyRoute = useCallback(() => {
    dispatch({ type: 'set-destination', id: 'G-EMG' });
    dispatch({ type: 'nav-start' });
  }, [dispatch]);

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
          focusNodeId={state.cameraFocusNode}
          categoryFilter={categoryFilter}
          focusLevel={state.focusLevel}
          startId={state.startId}
          destinationId={state.destinationId}
          selectedRoomId={state.selectedRoomId}
          blockedCorridor={state.blockedCorridor}
          timeline={timeline}
          instructions={instructions}
          navStatus={navStatus}
          speed={state.speed}
          seekNonce={state.seekNonce}
          seekTime={state.seekTime}
          reducedMotion={reducedMotion}
          pauseRender={panelScrolling}
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
        muted={muted}
        onToggleMute={toggleMute}
        onToggleDarkMode={() => setDarkMode((current) => !current)}
        onLanguage={(next) => dispatch({ type: 'set-language', language: next })}
        onEmergency={emergencyRoute}
        onResetDemo={() => {
          clearPrefs();
          speech.cancel();
          setFeedback(null);
          dispatch({ type: 'reset-demo' });
          dispatch({ type: 'recenter-camera' });
        }}
      />

      <main className="layout">
        <aside
          className={`sidebar${route ? ' has-route' : ''}`}
          aria-label={tr('searchHeading', language)}
          onScrollCapture={pauseSceneDuringPanelScroll}
          onWheelCapture={(event) => event.stopPropagation()}
        >
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
            onDestinationChange={(id) => dispatch({ type: 'set-destination', id: id || null })}
            onFocusNode={(nodeId) => dispatch({ type: 'focus-route-node', nodeId })}
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

            <div className="spatial-dock" onWheelCapture={(event) => event.stopPropagation()}>
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

            <div className="hospital-status-pill scene-legend" role="group" aria-label="Hospital departments and status">
              <button type="button" className={`legend-filter legend-emergency${categoryFilter === 'emergency' ? ' is-active' : ''}`} aria-pressed={categoryFilter === 'emergency'} onClick={() => setCategoryFilter(categoryFilter === 'emergency' ? null : 'emergency')} title="Filter emergency departments"><i />Emergency</button>
              <button type="button" className={`legend-filter legend-labs${categoryFilter === 'lab' ? ' is-active' : ''}`} aria-pressed={categoryFilter === 'lab'} onClick={() => setCategoryFilter(categoryFilter === 'lab' ? null : 'lab')} title="Filter labs"><i />Labs</button>
              <button type="button" className={`legend-filter legend-pharmacy${categoryFilter === 'pharmacy' ? ' is-active' : ''}`} aria-pressed={categoryFilter === 'pharmacy'} onClick={() => setCategoryFilter(categoryFilter === 'pharmacy' ? null : 'pharmacy')} title="Filter pharmacy"><i />Pharmacy</button>
              <button type="button" className={`legend-filter legend-connectors${categoryFilter === 'circulation' ? ' is-active' : ''}`} aria-pressed={categoryFilter === 'circulation'} onClick={() => setCategoryFilter(categoryFilter === 'circulation' ? null : 'circulation')} title="Filter lifts and stairs"><i />Lift/Stairs</button>
              <span className="legend-status"><span className="status-open-dot" aria-hidden="true" />All Wings Open · 2 Lifts Active · AI Voice Ready</span>
              <button type="button" className="sos-quick-route" onClick={emergencyRoute} title="Start a route to Emergency"><span aria-hidden="true">🚨</span> SOS Emergency</button>
            </div>

            {state.pickMode !== 'none' ? (
              <div className="pick-banner" role="status">
                <span>{tr(state.pickMode === 'start' ? 'pickingStart' : 'pickingDestination', language)}</span>
                <button type="button" className="ghost-button compact" onClick={() => setPick('none')}>
                  {tr('cancelPick', language)}
                </button>
              </div>
            ) : null}

            {route && destination ? createPortal(
              <div className="overlay overlay-bottom">
                <LiveGuidance
                  language={language}
                  route={route}
                  routeSteps={routeSteps}
                  destination={destination}
                  navStatus={navStatus}
                  instructionIndex={instructionIndex}
                  positionMetres={state.positionMetres}
                  remainingMetres={navStatus === 'idle' ? route.distanceMeters : state.remainingMetres}
                  remainingSeconds={navStatus === 'idle' ? route.estimatedSeconds : Math.max(0, Math.round(route.estimatedSeconds * (1 - state.progress)))}
                  currentLevel={navStatus === 'idle' ? route.instructions[0]?.level ?? 0 : state.currentLevel}
                  muted={muted}
                  speed={state.speed}
                  onStart={startNavigation}
                  firstPerson={state.cameraMode === 'firstperson'}
                  onToggleFirstPerson={() => dispatch({ type: 'set-camera', mode: state.cameraMode === 'firstperson' ? 'follow' : 'firstperson' })}
                  onPause={() => { dispatch({ type: 'nav-pause' }); emitControllerEvent('PAUSE'); }}
                  onResume={() => { dispatch({ type: 'nav-resume' }); emitControllerEvent('RESUME'); }}
                  onStop={() => {
                    dispatch({ type: 'nav-stop' });
                    voiceStarted.current = false;
                    speech.cancel();
                  }}
                  onReplay={startNavigation}
                  onToggleMute={toggleMute}
                  onSpeedCycle={() => dispatch({ type: 'set-speed', speed: state.speed === 1 ? 2 : state.speed === 2 ? 4 : 1 })}
                  onSeek={seekStep}
                />
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

