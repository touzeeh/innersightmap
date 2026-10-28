import { useEffect, useState } from 'react';
import { Camera, Play, SkipBack, SkipForward, Volume2, VolumeX } from 'lucide-react';
import { tr } from '../../i18n/strings';
import type { Instruction, Language, RoutePlan } from '../../types/navigation';

interface FlythroughHudProps {
  language: Language;
  route: RoutePlan;
  muted: boolean;
  onPlay: () => void;
  onToggleMute: () => void;
  firstPerson: boolean;
  onToggleFirstPerson: () => void;
}

export function FlythroughHud({ language, route, muted, firstPerson, onPlay, onToggleMute, onToggleFirstPerson }: FlythroughHudProps) {
  const [step, setStep] = useState(0);
  useEffect(() => setStep(0), [route.nodeIds]);
  const current: Instruction | undefined = route.instructions[Math.min(step, route.instructions.length - 1)];
  const previous = (): void => setStep((value) => Math.max(0, value - 1));
  const next = (): void => setStep((value) => Math.min(route.instructions.length - 1, value + 1));

  return (
    <section className="flythrough-hud" aria-label={language === 'hi' ? 'मार्ग नियंत्रण' : 'Navigation controls'}>
      <div className="flythrough-current" aria-live="polite">
        <span className="flythrough-kicker">{language === 'hi' ? `चरण ${step + 1} / ${route.instructions.length}` : `STEP ${step + 1} / ${route.instructions.length}`}</span>
        <strong>{current?.text[language]}</strong>
      </div>
      <div className="flythrough-actions">
        <button type="button" className="hud-icon-button" aria-label={language === 'hi' ? 'पिछला चरण' : 'Previous step'} title={language === 'hi' ? 'पिछला चरण' : 'Previous step'} onClick={previous} disabled={step === 0}><SkipBack size={17} aria-hidden="true" /></button>
        <button type="button" className="hud-play-button" onClick={onPlay}><Play size={16} fill="currentColor" aria-hidden="true" />{language === 'hi' ? 'फ्लायथ्रू चलाएँ' : 'Play Flythrough'}</button>
        <button type="button" className="hud-icon-button" aria-label={language === 'hi' ? 'अगला चरण' : 'Next step'} title={language === 'hi' ? 'अगला चरण' : 'Next step'} onClick={next} disabled={step >= route.instructions.length - 1}><SkipForward size={17} aria-hidden="true" /></button>
        <span className="hud-divider" aria-hidden="true" />
        <button type="button" className={`hud-follow-button${firstPerson ? ' is-on' : ''}`} aria-pressed={firstPerson} onClick={onToggleFirstPerson}><Camera size={16} aria-hidden="true" />{language === 'hi' ? 'प्रथम-व्यक्ति कैमरा' : '1st-Person Follow Cam'}</button>
        <button type="button" className="hud-icon-button" aria-label={muted ? tr('unmute', language) : tr('mute', language)} title={muted ? tr('unmute', language) : tr('mute', language)} aria-pressed={muted} onClick={onToggleMute}>{muted ? <VolumeX size={17} aria-hidden="true" /> : <Volume2 size={17} aria-hidden="true" />}</button>
      </div>
    </section>
  );
}
