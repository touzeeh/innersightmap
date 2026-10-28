import { ArrowUpDown, Camera, CircleCheck, CornerUpLeft, CornerUpRight, Pause, Play, Repeat, SkipBack, Square, Volume2, VolumeX, ArrowUp } from 'lucide-react';
import { tr } from '../../i18n/strings';
import { floorLabel } from '../../services/destinationSearch';
import type { Destination, Instruction, Language, NavStatus, RoutePlan } from '../../types/navigation';
import type { Level } from '../../types/building';

export interface LiveGuidanceProps {
  language: Language;
  route: RoutePlan;
  destination: Destination;
  navStatus: NavStatus;
  instructionIndex: number;
  progress: number;
  remainingMetres: number;
  currentLevel: number;
  muted: boolean;
  speed: 1 | 2 | 4;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  onRepeat: () => void;
  onToggleMute: () => void;
  onSpeed: (speed: 1 | 2 | 4) => void;
  onPrevious: () => void;
  onNext: () => void;
  firstPerson: boolean;
  onToggleFirstPerson: () => void;
}

/** Instructions that need the visitor to prepare: a turn, a room entry, or a connector. */
const PREPARE_KINDS: ReadonlySet<Instruction['kind']> = new Set(['turn', 'enter', 'lift-ride', 'stair-climb', 'lift-exit', 'stair-exit']);

function InstructionGlyph({ instruction }: { instruction: Instruction | undefined }) {
  if (!instruction) return null;
  const size = 26;
  if (instruction.kind === 'arrive') return <CircleCheck size={size} aria-hidden="true" />;
  if (instruction.kind.startsWith('lift') || instruction.kind.startsWith('stair')) return <ArrowUpDown size={size} aria-hidden="true" />;
  if (/Turn left/.test(instruction.text.en)) return <CornerUpLeft size={size} aria-hidden="true" />;
  if (/Turn right/.test(instruction.text.en)) return <CornerUpRight size={size} aria-hidden="true" />;
  return <ArrowUp size={size} aria-hidden="true" />;
}

/**
 * Live guidance overlay shown while navigating or paused. It shows the current
 * and next instruction, the floors, distance and time left, progress, and controls.
 */
export function LiveGuidance(props: LiveGuidanceProps) {
  const { language, route, destination, navStatus, instructionIndex, progress, remainingMetres, currentLevel, muted, speed } = props;
  const current = route.instructions[instructionIndex];
  const next = route.instructions[instructionIndex + 1];
  const approaching = next !== undefined && PREPARE_KINDS.has(next.kind);
  const arrived = navStatus === 'arrived';
  const paused = navStatus === 'paused';
  const remainingSeconds = Math.max(0, Math.round(route.estimatedSeconds * (1 - progress)));
  const displayFloor = Math.min(3, Math.max(0, Math.round(currentLevel))) as Level;

  if (arrived) {
    return (
      <section className="live live-arrived" aria-live="polite" aria-label={tr('arrivedTitle', language)}>
        <div className="arrival">
          <CircleCheck size={34} aria-hidden="true" />
          <div>
            <strong>{tr('arrivedTitle', language)}: {language === 'hi' ? destination.nameHi : destination.name}</strong>
            <span>{tr('arrivedBody', language)}</span>
          </div>
        </div>
        <div className="live-actions">
          <button type="button" className="ghost-button" onClick={props.onRepeat}>
            <Repeat size={16} aria-hidden="true" />
            {tr('repeat', language)}
          </button>
          <button type="button" className="ghost-button" onClick={props.onStop}>
            <Square size={16} aria-hidden="true" />
            {tr('stop', language)}
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className={`live live-compact${paused ? ' is-paused' : ''}`} aria-label={tr('nowLabel', language)}>
      <div className="live-main">
        <div className={`live-now${approaching ? ' is-approaching' : ''}`}>
          <span className="live-glyph" aria-hidden="true"><InstructionGlyph instruction={current} /></span>
          <div>
            <span className="live-label">{tr('nowLabel', language)}{paused ? ` · ${language === 'hi' ? 'रुका हुआ' : 'paused'}` : ''}</span>
            <p aria-live="polite" className="live-text">{current?.text[language] ?? ''}</p>
          </div>
        </div>
        {next ? (
          <div className="live-next">
            <span className="live-label">{tr('nextLabel', language)}</span>
            <p>{next.text[language]}</p>
          </div>
        ) : null}
      </div>

      <dl className="live-stats live-stats-inline" aria-label={language === 'hi' ? 'मार्ग विवरण' : 'Route details'}>
        <div><dd>{Math.round(remainingMetres)} m</dd></div>
        <div><dd>{remainingSeconds < 60 ? `${remainingSeconds} s` : `${Math.round(remainingSeconds / 60)} min`}</dd></div>
        <div><dd>{floorLabel(displayFloor, language)}</dd></div>
      </dl>

      <div className="progress" role="progressbar" aria-label={tr('progress', language)} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <div className="progress-fill" style={{ width: `${Math.round(progress * 1000) / 10}%` }} />
      </div>

      <div className="live-actions">
        <button type="button" className="hud-icon-button" onClick={props.onPrevious} disabled={instructionIndex <= 0} aria-label={language === 'hi' ? 'पिछला निर्देश' : 'Previous'} title={language === 'hi' ? 'पिछला निर्देश' : 'Previous'}><SkipBack size={16} aria-hidden="true" /></button>
        {paused ? (
          <button type="button" className="hud-icon-button is-primary" onClick={props.onResume} aria-label={tr('resume', language)} title={tr('resume', language)}><Play size={16} aria-hidden="true" /></button>
        ) : (
          <button type="button" className="hud-icon-button is-primary" onClick={props.onPause} aria-label={tr('pause', language)} title={tr('pause', language)}><Pause size={16} aria-hidden="true" /></button>
        )}
        <button type="button" className="hud-icon-button" onClick={props.onStop} aria-label={tr('stop', language)} title={tr('stop', language)}><Square size={15} aria-hidden="true" /></button>
        <button type="button" className={`hud-icon-button${props.firstPerson ? ' is-selected' : ''}`} onClick={props.onToggleFirstPerson} aria-pressed={props.firstPerson} aria-label={language === 'hi' ? 'प्रथम-व्यक्ति कैमरा' : '1st-Person Follow Cam'} title={language === 'hi' ? 'प्रथम-व्यक्ति कैमरा' : '1st-Person Follow Cam'}><Camera size={16} aria-hidden="true" /></button>
        <button type="button" className="hud-icon-button" onClick={props.onToggleMute} aria-pressed={muted} aria-label={muted ? tr('unmute', language) : tr('mute', language)} title={muted ? tr('unmute', language) : tr('mute', language)}>
          {muted ? <VolumeX size={16} aria-hidden="true" /> : <Volume2 size={16} aria-hidden="true" />}
        </button>
        <div className="speed speed-inline" role="group" aria-label={tr('speed', language)}>
          {([1, 2, 4] as const).map((s) => (
            <button key={s} type="button" className={s === speed ? 'is-on' : ''} aria-pressed={s === speed} onClick={() => props.onSpeed(s)} title={`${s}×`}>
              {s}x
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
