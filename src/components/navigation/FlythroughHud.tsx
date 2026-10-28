import { ArrowUp, ArrowUpDown, Camera, CircleCheck, CornerUpLeft, CornerUpRight, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { tr } from '../../i18n/strings';
import type { Instruction, Language, RoutePlan } from '../../types/navigation';
import type { NavigationStep } from './LiveGuidance';

interface FlythroughHudProps {
  language: Language;
  route: RoutePlan;
  routeSteps: readonly NavigationStep[];
  instructionIndex: number;
  onSeek: (index: number) => void;
  muted: boolean;
  onPlay: () => void;
  onToggleMute: () => void;
  firstPerson: boolean;
  onToggleFirstPerson: () => void;
}

export function FlythroughHud({ language, route, routeSteps, instructionIndex: step, onSeek, muted, firstPerson, onPlay, onToggleMute, onToggleFirstPerson }: FlythroughHudProps) {
  const current: Instruction | undefined = route.instructions[Math.min(step, route.instructions.length - 1)];
  const currentGlyph = current?.kind === 'arrive' ? <CircleCheck size={22} aria-hidden="true" />
    : current?.kind.startsWith('lift') || current?.kind.startsWith('stair') ? <ArrowUpDown size={22} aria-hidden="true" />
      : /Turn left/.test(current?.text.en ?? '') ? <CornerUpLeft size={22} aria-hidden="true" />
        : /Turn right/.test(current?.text.en ?? '') ? <CornerUpRight size={22} aria-hidden="true" />
          : <ArrowUp size={22} aria-hidden="true" />;

  return (
    <section className="flythrough-hud" aria-label={language === 'hi' ? 'मार्ग नियंत्रण' : 'Navigation controls'}>
      <div className="flythrough-current" aria-live="polite">
        <span className="flythrough-glyph" aria-hidden="true">{currentGlyph}</span>
        <div className="flythrough-copy">
          <span className="flythrough-kicker">{language === 'hi' ? `चरण ${step + 1} / ${route.instructions.length}` : `STEP ${step + 1} / ${route.instructions.length}`}</span>
          <strong>{routeSteps[step]?.short ?? current?.text[language]}</strong>
        </div>
      </div>
      <div className="flythrough-progress" role="group" aria-label={language === 'hi' ? 'निर्देश चरण' : 'Instruction steps'}>
        {routeSteps.map((item, index) => <button key={item.id} type="button" className={`step-progress-segment${index < step ? ' is-complete' : ''}${index === step ? ' is-current' : ''}`} aria-label={`${tr('stepCounter', language).replace('{current}', String(index + 1)).replace('{total}', String(routeSteps.length))}: ${item.short}`} aria-current={index === step ? 'step' : undefined} onClick={() => onSeek(index)} />)}
      </div>
      <div className="flythrough-actions">
        <div className="live-transport" role="group" aria-label={language === 'hi' ? 'चरण नियंत्रण' : 'Step controls'}>
          <button type="button" className="hud-icon-button" aria-label={tr('previousStep', language)} title={tr('previousStep', language)} onClick={() => onSeek(Math.max(0, step - 1))} disabled={step === 0}><SkipBack size={17} aria-hidden="true" /></button>
          <button type="button" className="hud-play-button flythrough-play-button" onClick={onPlay}><Play size={18} fill="currentColor" aria-hidden="true" /><span>{tr('startNavigation', language)}</span></button>
          <button type="button" className="hud-icon-button" aria-label={tr('nextStep', language)} title={tr('nextStep', language)} onClick={() => onSeek(Math.min(routeSteps.length - 1, step + 1))} disabled={step >= routeSteps.length - 1}><SkipForward size={17} aria-hidden="true" /></button>
        </div>
        <span className="hud-divider" aria-hidden="true" />
        <div className="flythrough-utility-actions">
          <button type="button" className={`hud-icon-button${firstPerson ? ' is-selected' : ''}`} aria-pressed={firstPerson} aria-label={language === 'hi' ? 'प्रथम-व्यक्ति कैमरा' : 'Follow camera'} title={language === 'hi' ? 'प्रथम-व्यक्ति कैमरा' : 'Follow camera'} onClick={onToggleFirstPerson}><Camera size={17} aria-hidden="true" /></button>
          <button type="button" className="hud-icon-button" aria-label={muted ? tr('unmute', language) : tr('mute', language)} title={muted ? tr('unmute', language) : tr('mute', language)} aria-pressed={muted} onClick={onToggleMute}>{muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}</button>
        </div>
      </div>
    </section>
  );
}
