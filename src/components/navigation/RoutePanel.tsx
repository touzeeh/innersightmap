import { ArrowUp, ArrowUpDown, CircleCheck, CornerUpLeft, CornerUpRight, DoorOpen, Flag, Play, X, LocateFixed } from 'lucide-react';
import { START_POINTS } from '../../data/destinations';
import { CATEGORY_META } from '../../i18n/categories';
import { tr } from '../../i18n/strings';
import { destinationLabel, startLabel } from '../../services/destinationSearch';
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
  onStart,
  onSwap,
  blockedCorridor,
  onToggleBlockedCorridor,
}: RoutePanelProps) {
  const startOptions = START_POINTS.map((s) => ({ id: s.id, label: startLabel(s.id, language) }));
  if (selectedRoomId && !START_POINTS.some((s) => s.id === selectedRoomId)) {
    startOptions.push({ id: selectedRoomId, label: startLabel(selectedRoomId, language) });
  }
  const route = plan?.ok ? plan.route : null;
  const meta = destination ? CATEGORY_META[destination.category] : null;
  const DestIcon = meta?.icon;
  const navigating = navStatus === 'navigating' || navStatus === 'paused';

  return (
    <section className="panel route-panel" aria-labelledby="route-heading">
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
        {destination && meta && DestIcon ? (
          <div className="dest-card route-dest-card">
            <span className="result-icon" style={{ color: meta.accent }} aria-hidden="true"><DestIcon size={20} /></span>
            <div className="dest-text">
              <strong>{language === 'hi' ? destination.nameHi : destination.name}</strong>
              <span className="result-meta">{destinationLabel(destination, language)}</span>
              <span className="chip" style={{ borderColor: meta.accent, color: meta.accent }}>{meta.label[language]}</span>
            </div>
            <button type="button" className="icon-button" onClick={onClearDestination} aria-label={tr('clearDestination', language)} disabled={navigating}>
              <X size={16} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <span className="route-placeholder">{tr('chooseDestination', language)}</span>
        )}
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
          <button type="button" className={`corridor-test-button${blockedCorridor ? ' is-blocked' : ''}`} onClick={onToggleBlockedCorridor} disabled={navigating} aria-pressed={Boolean(blockedCorridor)}>
            {blockedCorridor ? '↻ Restore corridor' : '🚧 Block Corridor (Test Rerouting)'}
          </button>
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
                    <li key={ins.index} className={isActive ? 'is-active' : ''} aria-current={isActive ? 'step' : undefined}>
                      <span className="direction-icon"><InstructionIcon instruction={ins} /></span>
                      <span>{ins.text[language]}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </div>

          <button
            type="button"
            className="primary-button"
            onClick={onStart}
            disabled={navigating}
          >
            <Play size={18} aria-hidden="true" />
            {tr('startNavigation', language)}
          </button>
        </>
      ) : null}
    </section>
  );
}
