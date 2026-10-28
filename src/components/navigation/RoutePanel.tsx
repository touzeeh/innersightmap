import { useEffect, useRef } from 'react';
import { ArrowUp, ArrowUpDown, CircleCheck, CornerUpLeft, CornerUpRight, DoorOpen, Flag, X, LocateFixed, Play } from 'lucide-react';
import { DESTINATIONS, START_POINTS } from '../../data/destinations';
import { ROOMS } from '../../data/rooms';
import { tr } from '../../i18n/strings';
import { floorLabel, startLabel } from '../../services/destinationSearch';
import { formatEstimate } from '../../services/routePlanner';
import type { Destination, Instruction, Language, NavStatus, PickMode, PlanResult, TravelPreference } from '../../types/navigation';

export interface RoutePanelProps {
  language: Language;
  startId: string;
  selectedRoomId: string | null;
  destination: Destination | null;
  preference: TravelPreference;
  navStatus: NavStatus;
  plan: PlanResult | null;
  pickMode: PickMode;
  activeInstruction: number;
  onStartChange: (id: string) => void;
  onPreferenceChange: (preference: TravelPreference) => void;
  onPickMode: (mode: PickMode) => void;
  onClearDestination: () => void;
  onDestinationChange: (id: string) => void;
  onFocusNode: (nodeId: string) => void;
  onStart: () => void;
  onSwap: () => void;
  blockedCorridor: string | null;
  onToggleBlockedCorridor: () => void;
}

function InstructionIcon({ instruction }: { instruction: Instruction }) {
  const en = instruction.text.en;
  const size = 18;
  switch (instruction.kind) {
    case 'start':
      return <Flag size={size} aria-hidden="true" />;
    case 'arrive':
      return <CircleCheck size={size} aria-hidden="true" />;
    case 'enter':
      return <DoorOpen size={size} aria-hidden="true" />;
    case 'lift-ride':
    case 'lift-exit':
    case 'stair-climb':
    case 'stair-exit':
    case 'to-lift':
    case 'to-stair':
      return <ArrowUpDown size={size} aria-hidden="true" />;
    case 'turn':
    case 'walk':
    default:
      if (/Turn left/.test(en)) return <CornerUpLeft size={size} aria-hidden="true" />;
      if (/Turn right/.test(en)) return <CornerUpRight size={size} aria-hidden="true" />;
      return <ArrowUp size={size} aria-hidden="true" />;
  }
}

export function RoutePanel({
  language,
  startId,
  selectedRoomId,
  destination,
  preference,
  navStatus,
  plan,
  pickMode,
  activeInstruction,
  onStartChange,
  onPreferenceChange,
  onPickMode,
  onClearDestination,
  onDestinationChange,
  onFocusNode,
  onStart,
  onSwap,
  blockedCorridor,
  onToggleBlockedCorridor,
}: RoutePanelProps) {
  const startOptions = START_POINTS.map((s) => ({ id: s.id, label: startLabel(s.id, language) }));
  const wingName = (id: string): string => {
    const room = ROOMS.find((candidate) => candidate.id === id);
    if (!room) return language === 'hi' ? 'कनेक्टर' : 'Connectors';
    if (room.block.startsWith('WA')) return language === 'hi' ? 'विंग A · ओपीडी' : 'Wing A · OPD';
    if (room.block.startsWith('WB')) return language === 'hi' ? 'विंग B · इमरजेंसी' : 'Wing B · Emergency';
    if (room.block.startsWith('WC')) return language === 'hi' ? 'विंग C · जांच और लैब' : 'Wing C · Diagnostics & Labs';
    if (room.door[0] < -20) return language === 'hi' ? 'विंग B · इमरजेंसी' : 'Wing B · Emergency';
    if (room.door[0] > 20) return language === 'hi' ? 'विंग C · जांच और लैब' : 'Wing C · Diagnostics & Labs';
    return language === 'hi' ? 'मुख्य विंग' : 'Main Wing';
  };
  const destinationsByFloor = [0, 1, 2, 3].flatMap((level) => {
    const onFloor = DESTINATIONS.filter((item) => item.level === level);
    const wingNames = [...new Set(onFloor.map((item) => wingName(item.id)))];
    return wingNames.map((wing) => ({ level, wing, items: onFloor.filter((item) => wingName(item.id) === wing) }));
  });
  if (selectedRoomId && !START_POINTS.some((s) => s.id === selectedRoomId)) {
    startOptions.push({ id: selectedRoomId, label: startLabel(selectedRoomId, language) });
  }
  const route = plan?.ok ? plan.route : null;
  const navigating = navStatus === 'navigating' || navStatus === 'paused';
  const activeStepRef = useRef<HTMLLIElement | null>(null);
  const showDevControls = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('dev') === '1';

  useEffect(() => {
    if (navStatus === 'navigating' && activeStepRef.current) {
      activeStepRef.current.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' });
    }
  }, [activeInstruction, navStatus]);

  return (
    <section className="panel route-panel" aria-labelledby="route-heading">
      <div className="route-scroll-area">
        <header className="panel-head">
          <h2 id="route-heading">{tr('routeHeading', language)}</h2>
        </header>

      <div className="route-pair">
        {destination ? <button type="button" className="route-swap" aria-label={language === 'hi' ? 'शुरुआत और गंतव्य बदलें' : 'Swap start and destination'} title={language === 'hi' ? 'शुरुआत और गंतव्य बदलें' : 'Swap start and destination'} onClick={onSwap} disabled={navigating}>⇅</button> : null}
        <div className="route-input-row">
          <span className="route-dot start-dot" aria-hidden="true" />
          <label className="visually-hidden" htmlFor="start-select">{tr('startHeading', language)}</label>
          <select id="start-select" value={startId} onChange={(e) => onStartChange(e.target.value)} disabled={navigating}>
            {startOptions.map((o) => (
              <option key={o.id} value={o.id}>{o.label}</option>
            ))}
          </select>
          <button
            type="button"
            className={`icon-button map-pick${pickMode === 'start' ? ' is-on' : ''}`}
            aria-pressed={pickMode === 'start'}
            title={tr('pickStart', language)}
            aria-label={tr('pickStart', language)}
            onClick={() => onPickMode(pickMode === 'start' ? 'none' : 'start')}
            disabled={navigating}
          >
            <LocateFixed size={17} aria-hidden="true" />
          </button>
        </div>
        <div className="route-input-row destination-input-row">
          <span className="route-dot destination-dot" aria-hidden="true" />
        <label className="visually-hidden" htmlFor="destination-select">{tr('searchHeading', language)}</label>
        <select id="destination-select" className="destination-select" value={destination?.id ?? ''} onChange={(event) => onDestinationChange(event.target.value)} disabled={navigating}>
          <option value="">{tr('chooseDestination', language)}</option>
          {destinationsByFloor.map(({ level, wing, items }) => (
            <optgroup key={`${level}-${wing}`} label={`${floorLabel(level as 0 | 1 | 2 | 3, language)} · ${wing}`}>
              {items.map((item) => <option key={item.id} value={item.id}>{item.roomNumber ? `${item.roomNumber} · ` : ''}{language === 'hi' ? item.nameHi : item.name}</option>)}
            </optgroup>
          ))}
        </select>
        {destination ? <button type="button" className="icon-button destination-clear" onClick={onClearDestination} aria-label={tr('clearDestination', language)} disabled={navigating}><X size={16} aria-hidden="true" /></button> : null}
        <button
          type="button"
          className={`icon-button map-pick${pickMode === 'destination' ? ' is-on' : ''}`}
          aria-pressed={pickMode === 'destination'}
          title={tr('pickDestination', language)}
          aria-label={tr('pickDestination', language)}
          onClick={() => onPickMode(pickMode === 'destination' ? 'none' : 'destination')}
          disabled={navigating}
        >
          <LocateFixed size={17} aria-hidden="true" />
        </button>
        </div>
      </div>

      <fieldset className="field-group segmented">
        <legend className="field-label">{tr('routeType', language)}</legend>
        <label className={preference === 'shortest' ? 'is-on' : ''}>
          <input type="radio" name="preference" value="shortest" checked={preference === 'shortest'} onChange={() => onPreferenceChange('shortest')} disabled={navigating} />
          {tr('routeShortest', language)}
        </label>
        <label className={preference === 'step-free' ? 'is-on' : ''}>
          <input type="radio" name="preference" value="step-free" checked={preference === 'step-free'} onChange={() => onPreferenceChange('step-free')} disabled={navigating} />
          {tr('routeStepFree', language)}
        </label>
      </fieldset>

      {plan && !plan.ok ? (
        <p className="route-error" role="alert">{plan.message[language]}</p>
      ) : null}

      {route ? (
        <>
          {showDevControls ? <button type="button" className={`corridor-test-button${blockedCorridor ? ' is-blocked' : ''}`} onClick={onToggleBlockedCorridor} disabled={navigating} aria-pressed={Boolean(blockedCorridor)}>
            {blockedCorridor ? '↻ Restore corridor' : '🚧 Block Corridor (Test Rerouting)'}
          </button> : null}
          <dl className="summary">
            <div>
              <dt>{tr('distance', language)}</dt>
              <dd>{route.distanceMeters} m</dd>
            </div>
            <div>
              <dt>{tr('duration', language)}</dt>
              <dd>{formatEstimate(route.estimatedSeconds, language)}</dd>
            </div>
            <div>
              <dt>{tr('floorChanges', language)}</dt>
              <dd>{route.liftRides + route.stairFlights > 0 ? `${route.liftRides ? `${route.liftRides} ${language === 'hi' ? 'लिफ्ट' : 'lift'}` : ''}${route.liftRides && route.stairFlights ? ' · ' : ''}${route.stairFlights ? `${route.stairFlights} ${language === 'hi' ? 'सीढ़ी' : 'stair'}` : ''}` : tr('noFloorChange', language)}</dd>
            </div>
          </dl>
          <div className="directions">
            <h3>{tr('directions', language)}</h3>
            <div className="direction-scroll">
              <ol>
                {route.instructions.map((ins) => {
                  const isActive = navigating && ins.index === activeInstruction;
                  return (
                    <li key={ins.index} ref={isActive ? activeStepRef : undefined} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'step' : undefined}>
                      <button type="button" className="direction-step-button" onClick={() => { const nodeId = route.nodeIds[ins.nodeIndex]; if (nodeId) onFocusNode(nodeId); }} aria-label={`${language === 'hi' ? 'मानचित्र पर दिखाएँ:' : 'Show on map:'} ${ins.text[language]}`}>
                      <span className="direction-icon"><InstructionIcon instruction={ins} /></span>
                      <span>{ins.text[language]}</span>
                      </button>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>
        </>
      ) : null}
      </div>
      {route ? <footer className="route-footer">
        <button type="button" className="primary-button route-start-button" onClick={onStart} disabled={navigating || !route}>
          <Play size={17} fill="currentColor" aria-hidden="true" />
          {tr('startNavigation', language)}
        </button>
      </footer> : null}
    </section>
  );
}
