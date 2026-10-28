import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Language } from '../types/navigation';
import { pickVoice, SYNTHESIS_LANG } from '../services/speechSupport';

export interface SpeechSynthesisControls {
  supported: boolean;
  /** Whether an installed voice exists for the language (Hindi voices are often missing). */
  hasVoice: (language: Language) => boolean;
  speak: (text: string, language: Language) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  speaking: boolean;
}

function synth(): SpeechSynthesis | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  return window.speechSynthesis;
}

/** Text-to-speech using the browser's installed voices. Mute is handled by the caller. */
export function useSpeechSynthesis(): SpeechSynthesisControls {
  const engine = synth();
  const supported = engine !== null && typeof SpeechSynthesisUtterance !== 'undefined';
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [speaking, setSpeaking] = useState(false);

  useEffect(() => {
    if (!supported || !engine) return;
    const load = (): void => setVoices(engine.getVoices());
    load();
    engine.addEventListener('voiceschanged', load);
    return () => engine.removeEventListener('voiceschanged', load);
  }, [supported, engine]);

  const hasVoice = useCallback(
    (language: Language) => pickVoice(voices, language) !== null,
    [voices],
  );

  const speak = useCallback(
    (text: string, language: Language) => {
      if (!engine || !supported || !text) return;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = SYNTHESIS_LANG[language];
      const voice = pickVoice(voices, language);
      if (voice) utterance.voice = voice as SpeechSynthesisVoice;
      utterance.rate = 0.95;
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      utterance.onerror = () => setSpeaking(false);
      engine.speak(utterance);
    },
    [engine, supported, voices],
  );

  const cancel = useCallback(() => {
    engine?.cancel();
    setSpeaking(false);
  }, [engine]);

  const pause = useCallback(() => engine?.pause(), [engine]);
  const resume = useCallback(() => engine?.resume(), [engine]);

  useEffect(() => {
    return () => engine?.cancel();
  }, [engine]);

  // Memoised so effects that depend on the controls do not re-run on every render.
  return useMemo(
    () => ({ supported, hasVoice, speak, cancel, pause, resume, speaking }),
    [supported, hasVoice, speak, cancel, pause, resume, speaking],
  );
}
