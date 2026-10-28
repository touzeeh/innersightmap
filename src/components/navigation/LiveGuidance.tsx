import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { ArrowUp, ArrowUpDown, Camera, CircleCheck, CornerUpLeft, CornerUpRight, MoreHorizontal, Pause, Play, QrCode, SkipBack, SkipForward, StopCircle, Volume2, VolumeX } from 'lucide-react';
import { tr } from '../../i18n/strings';
import { floorLabel } from '../../services/destinationSearch';
import type { Destination, Instruction, Language, NavStatus, RoutePlan } from '../../types/navigation';
import type { Level } from '../../types/building';
import { QRPassModal } from './QRPassModal';

export interface NavigationStep {
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

export interface LiveGuidanceProps {
  language: Language;
  route: RoutePlan;
  routeSteps: readonly NavigationStep[];
  destination: Destination;
  navStatus: NavStatus;
  instructionIndex: number;
  positionMetres: number;
  remainingMetres: number;
  remainingSeconds: number;
  currentLevel: number;
  muted: boolean;
  speed: 1 | 2 | 4;
  onPause: () => void;
  onResume: () => void;
  onStart: () => void;
  onStop: () => void;
  onReplay: () => void;
  onToggleMute: () => void;
  onSpeedCycle: () => void;
  onSeek: (index: number) => void;
  firstPerson: boolean;
  onToggleFirstPerson: () => void;
}

function StepGlyph({ kind, text }: { kind: Instruction['kind']; text: string }) {
  const props = { size: 23, 'aria-hidden': true as const };
  if (kind === 'arrive') return <CircleCheck {...props} />;
  if (kind.startsWith('lift') || kind.startsWith('stair') || kind === 'to-stair') return <ArrowUpDown {...props} />;
  if (/turn left/i.test(text)) return <CornerUpLeft {...props} />;
  if (/turn right/i.test(text)) return <CornerUpRight {...props} />;
  return <ArrowUp {...props} />;
}

function QRPassAction({ language, route, destination }: { language: Language; route: RoutePlan; destination: Destination }) {
  const [open, setOpen] = useState(false);
  return <>
    <button type="button" className="guidance-menu-item" role="menuitem" onClick={() => setOpen(true)}>
      <QrCode size={16} aria-hidden="true" />{tr('qrPass', language)}
    </button>
    {open ? <QRPassModal language={language} route={route} destination={destination} onClose={() => setOpen(false)} /> : null}
  </>;
}

export function LiveGuidance(props: LiveGuidanceProps) {
  const { language, route, routeSteps, destination, navStatus, instructionIndex, positionMetres, remainingMetres, remainingSeconds, currentLevel, muted, speed } = props;
  const [moreOpen, setMoreOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const arrived = navStatus === 'arrived';
  const paused = navStatus === 'paused';
  const current = routeSteps[Math.min(instructionIndex, routeSteps.length - 1)];
  const next = routeSteps[instructionIndex + 1];
  const displayFloor = Math.min(3, Math.max(0, Math.round(currentLevel))) as Level;

  useEffect(() => {
    if (!moreOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        setMoreOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setMoreOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('pointerdown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('pointerdown', onPointerDown);
    };
  }, [moreOpen]);

  return (
    <section className={`live nav-controller-bar${arrived ? ' is-arrived' : ''}${paused ? ' is-paused' : ''}`} aria-label={tr('navigationControls', language)}>
      <div className="nav-progress-strip" role="group" aria-label={tr('progress', language)}>
        {routeSteps.map((step, index) => {
          const span = Math.max(0.01, step.endDist - step.startDist);
          const fill = index < instructionIndex ? 100 : index === instructionIndex ? Math.max(0, Math.min(100, ((positionMetres - step.startDist) / span) * 100)) : 0;
          return <button
            key={step.id}
            type="button"
            className={`nav-progress-segment${index < instructionIndex ? ' is-complete' : ''}${index === instructionIndex ? ' is-current' : ''}`}
            style={{ '--segment-fill': `${fill}%` } as CSSProperties}
            onClick={() => props.onSeek(index)}
            aria-label={`${tr('stepCounter', language).replace('{current}', String(index + 1)).replace('{total}', String(routeSteps.length))}: ${step.short}`}
            aria-current={index === instructionIndex ? 'step' : undefined}
            title={step.short}
          />;
        })}
      </div>

      <span className={`nav-step-icon${arrived ? ' is-arrival' : ''}`} aria-hidden="true">
        <StepGlyph kind={current?.icon ?? 'arrive'} text={current?.short ?? ''} />
      </span>

      <div className="nav-step-copy" aria-live="polite" aria-atomic="true">
        <span className="nav-step-kicker">{arrived
          ? tr('arrivedTitle', language)
          : tr('stepCounter', language).replace('{current}', String(instructionIndex + 1)).replace('{total}', String(routeSteps.length))}{paused && !arrived ? ` · ${tr('pausedLabel', language)}` : ''}</span>
        <p className="nav-step-text">{arrived
          ? `${tr('arrivedTitle', language)}: ${language === 'hi' ? destination.nameHi : destination.name}`
          : current?.short ?? tr('chooseDestination', language)}</p>
        {next && !arrived ? <span className="nav-next-preview">{tr('nextLabel', language)}: {next.short}</span> : null}
      </div>

      <div className="nav-footer-row">
        <div className="nav-meta-row">
          <span className="nav-meta-chip">{Math.round(remainingMetres)} {tr('meterShort', language)}</span>
          <span className="nav-meta-chip">{remainingSeconds < 60 ? `${remainingSeconds} ${tr('secondShort', language)}` : `${Math.round(remainingSeconds / 60)} ${language === 'hi' ? 'मिनट' : 'min'}`}</span>
          <span className={`nav-meta-chip nav-floor-chip floor-level-${displayFloor}`}>{floorLabel(displayFloor, language)}</span>
          {speed === 4 ? <span className="voice-reduced-note">{tr('voiceReduced', language)}</span> : null}
        </div>

        <div className="nav-bar-controls" role="group" aria-label={tr('navigationControls', language)}>
        <button type="button" className="nav-control-button" onClick={() => props.onSeek(Math.max(0, instructionIndex - 1))} disabled={instructionIndex <= 0 || arrived} aria-label={tr('previousStep', language)} title={tr('previousStep', language)}><SkipBack size={17} aria-hidden="true" /></button>
        <button type="button" className="nav-play-button" onClick={arrived ? props.onReplay : navStatus === 'idle' ? props.onStart : paused ? props.onResume : props.onPause} aria-label={arrived ? tr('replayRoute', language) : navStatus === 'idle' ? tr('startNavigation', language) : paused ? tr('resume', language) : tr('pause', language)} title={arrived ? tr('replayRoute', language) : navStatus === 'idle' ? tr('startNavigation', language) : paused ? tr('resume', language) : tr('pause', language)}>
          {arrived || navStatus === 'idle' || paused ? <Play size={20} fill="currentColor" aria-hidden="true" /> : <Pause size={20} fill="currentColor" aria-hidden="true" />}
        </button>
        <button type="button" className="nav-control-button" onClick={() => props.onSeek(Math.min(routeSteps.length - 1, instructionIndex + 1))} disabled={instructionIndex >= routeSteps.length - 1 || arrived} aria-label={tr('nextStep', language)} title={tr('nextStep', language)}><SkipForward size={17} aria-hidden="true" /></button>
        <button type="button" className="nav-control-button nav-mute-button" onClick={props.onToggleMute} aria-pressed={muted} aria-label={muted ? tr('unmute', language) : tr('mute', language)} title={muted ? tr('unmute', language) : tr('mute', language)}>{muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}</button>
        <button type="button" className="nav-speed-button" onClick={props.onSpeedCycle} aria-label={`${tr('speed', language)} ${speed}x`} title={`${tr('speed', language)} ${speed}x`}>{speed}x</button>
        <div className="nav-more-wrap" ref={menuRef}>
          <button ref={triggerRef} type="button" className="nav-control-button" aria-label={tr('moreMenu', language)} aria-expanded={moreOpen} title={tr('moreMenu', language)} onClick={() => setMoreOpen((open) => !open)}><MoreHorizontal size={19} aria-hidden="true" /></button>
          {moreOpen ? <div className="nav-more-menu" role="menu">
            <button type="button" className="guidance-menu-item" role="menuitemcheckbox" aria-checked={props.firstPerson} onClick={props.onToggleFirstPerson}><Camera size={16} aria-hidden="true" />{tr('followCamera', language)}{props.firstPerson ? <span aria-hidden="true">✓</span> : null}</button>
            <button type="button" className="guidance-menu-item guidance-mobile-only" role="menuitemcheckbox" aria-checked={muted} onClick={props.onToggleMute}>{muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}{muted ? tr('unmute', language) : tr('mute', language)}</button>
            <button type="button" className="guidance-menu-item guidance-mobile-only" onClick={props.onSpeedCycle}><ArrowUp size={16} aria-hidden="true" />{tr('speed', language)} · {speed}x</button>
            <QRPassAction language={language} route={route} destination={destination} />
            <button type="button" className="guidance-menu-item is-danger" role="menuitem" onClick={props.onStop}><StopCircle size={16} aria-hidden="true" />{tr('endNavigation', language)}</button>
          </div> : null}
        </div>
        </div>
      </div>
    </section>
  );
}
