import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Language } from '../types/navigation';
import { pickVoice, SYNTHESIS_LANG } from '../services/speechSupport';

export interface SpeechSynthesisControls {
  supported: boolean;
  voicesReady: boolean;
  /** Whether an installed voice exists for the language (Hindi voices are often missing). */
  hasVoice: (language: Language) => boolean;
  speak: (text: string, language: Language, rate?: number) => void;
  enqueue: (text: string, language: Language, rate?: number) => void;
  cancel: () => void;
  pause: () => void;
  resume: () => void;
  speaking: boolean;
}

function splitSpeechText(text: string): string[] {
  if (text.length <= 120) return [text];
  const sentences = text.split(/(?<=[.!?।])\s+/u).filter(Boolean);
  const chunks: string[] = [];
  for (const sentence of sentences) {
    if (sentence.length <= 120) {
      chunks.push(sentence);
      continue;
    }
    let current = '';
    for (const word of sentence.split(/\s+/u)) {
      if (current && `${current} ${word}`.length > 120) {
        chunks.push(current);
        current = word;
      } else current = current ? `${current} ${word}` : word;
    }
    if (current) chunks.push(current);
  }
  return chunks;
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
  const [voicesReady, setVoicesReady] = useState(false);
  const speechGeneration = useRef(0);
  const queueRef = useRef<Array<{ text: string; language: Language; rate: number }>>([]);
  const activeRef = useRef(false);
  const voicesRef = useRef(voices);
  voicesRef.current = voices;

  const runQueueRef = useRef<() => void>(() => undefined);
  runQueueRef.current = () => {
    if (!engine || !supported || activeRef.current) return;
    const next = queueRef.current.shift();
    if (!next) {
      setSpeaking(false);
      return;
    }
    const generation = speechGeneration.current;
    const parts = splitSpeechText(next.text);
    const voice = pickVoice(voicesRef.current, next.language);
    activeRef.current = true;
    setSpeaking(true);
    const speakPart = (index: number): void => {
      if (generation !== speechGeneration.current) return;
      if (index >= parts.length) {
        activeRef.current = false;
        runQueueRef.current();
        return;
      }
      const utterance = new SpeechSynthesisUtterance(parts[index]);
      utterance.lang = SYNTHESIS_LANG[next.language];
      if (voice) utterance.voice = voice as SpeechSynthesisVoice;
      utterance.rate = Math.max(0.1, Math.min(1.3, next.rate));
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => speakPart(index + 1);
      utterance.onerror = () => {
        if (generation !== speechGeneration.current) return;
        activeRef.current = false;
        runQueueRef.current();
      };
      engine.speak(utterance);
    };
    speakPart(0);
  };

  useEffect(() => {
    if (!supported || !engine) return;
    const load = (): void => { setVoices(engine.getVoices()); setVoicesReady(true); };
    const initialVoices = engine.getVoices();
    setVoices(initialVoices);
    setVoicesReady(initialVoices.length > 0);
    engine.addEventListener('voiceschanged', load);
    return () => engine.removeEventListener('voiceschanged', load);
  }, [supported, engine]);

  const hasVoice = useCallback(
    (language: Language) => pickVoice(voices, language) !== null,
    [voices],
  );

  const speak = useCallback(
    (text: string, language: Language, rate = 1) => {
      if (!engine || !supported || !text) return;
      speechGeneration.current += 1;
      queueRef.current = [];
      activeRef.current = false;
      engine.cancel();
      setSpeaking(false);
      queueRef.current.push({ text, language, rate });
      runQueueRef.current();
    },
    [engine, supported],
  );

  const enqueue = useCallback((text: string, language: Language, rate = 1) => {
    if (!engine || !supported || !text) return;
    // Keep the line currently being spoken intact, but discard announcements
    // that became outdated while the listener was still hearing it.
    queueRef.current = [];
    queueRef.current.push({ text, language, rate });
    runQueueRef.current();
  }, [engine, supported]);

  const cancel = useCallback(() => {
    speechGeneration.current += 1;
    queueRef.current = [];
    activeRef.current = false;
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
    () => ({ supported, voicesReady, hasVoice, speak, enqueue, cancel, pause, resume, speaking }),
    [supported, voicesReady, hasVoice, speak, enqueue, cancel, pause, resume, speaking],
  );
}
