import { useCallback, useEffect, useRef, useState } from 'react';
import type { Language, Localised } from '../types/navigation';
import { describeRecognitionError, RECOGNITION_LANG } from '../services/speechSupport';

export type VoiceStatus = 'unsupported' | 'idle' | 'listening' | 'heard' | 'error';

export interface VoiceRecognitionResult {
  supported: boolean;
  status: VoiceStatus;
  /** Live partial transcript while listening. */
  interim: string;
  /** Final transcript from the last successful recognition. */
  transcript: string;
  error: Localised | null;
  start: () => void;
  stop: () => void;
}

/** Returns the browser's SpeechRecognition constructor, or null when unsupported. */
export function getRecognitionConstructor(): SpeechRecognitionConstructorLike | null {
  if (typeof window === 'undefined') return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

/**
 * Wraps the Web Speech recognition API. It only starts after an explicit user
 * action, reports interim and final text, and surfaces every failure rather
 * than pretending that recognition worked.
 */
export function useVoiceRecognition(
  language: Language,
  onFinal: (transcript: string) => void,
): VoiceRecognitionResult {
  const Ctor = getRecognitionConstructor();
  const supported = Ctor !== null;
  const [status, setStatus] = useState<VoiceStatus>(supported ? 'idle' : 'unsupported');
  const [interim, setInterim] = useState('');
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<Localised | null>(null);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef(onFinal);
  const gotResultRef = useRef(false);
  const errorRef = useRef(false);

  useEffect(() => {
    finalRef.current = onFinal;
  }, [onFinal]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      recognitionRef.current = null;
    };
  }, []);

  const start = useCallback(() => {
    if (!Ctor) {
      setStatus('unsupported');
      setError({
        en: 'Voice input is not supported in this browser. Use the search box instead.',
        hi: 'इस ब्राउज़र में वॉइस इनपुट उपलब्ध नहीं है। खोज बॉक्स का उपयोग करें।',
      });
      return;
    }
    recognitionRef.current?.abort();
    const recognition = new Ctor();
    recognition.lang = RECOGNITION_LANG[language];
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    gotResultRef.current = false;
    errorRef.current = false;
    setError(null);
    setInterim('');

    recognition.onstart = () => setStatus('listening');
    recognition.onresult = (event) => {
      let interimText = '';
      let finalText = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? '';
        if (result.isFinal) finalText += text;
        else interimText += text;
      }
      setInterim(interimText.trim());
      if (finalText.trim()) {
        gotResultRef.current = true;
        const clean = finalText.trim();
        setTranscript(clean);
        setStatus('heard');
        finalRef.current(clean);
      }
    };
    recognition.onerror = (event) => {
      errorRef.current = true;
      setError(describeRecognitionError(event.error));
      setStatus('error');
    };
    recognition.onend = () => {
      recognitionRef.current = null;
      setInterim('');
      // Ended without a final result and without an error event: say so plainly.
      if (!gotResultRef.current && !errorRef.current) {
        setError({
          en: 'No speech was recognised. Try again, or type your destination.',
          hi: 'कोई भाषण पहचाना नहीं गया। दोबारा कोशिश करें, या गंतव्य टाइप करें।',
        });
        setStatus('error');
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
      setStatus('listening');
    } catch {
      recognitionRef.current = null;
      setError({ en: 'Could not start listening. Type your destination instead.', hi: 'सुनना शुरू नहीं हो सका। गंतव्य टाइप करें।' });
      setStatus('error');
    }
  }, [Ctor, language]);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  return { supported, status, interim, transcript, error, start, stop };
}
