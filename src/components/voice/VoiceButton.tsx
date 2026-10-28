import { Mic, MicOff } from 'lucide-react';
import type { VoiceRecognitionResult } from '../../hooks/useVoiceRecognition';
import { tr } from '../../i18n/strings';
import type { Language } from '../../types/navigation';

interface VoiceButtonProps {
  language: Language;
  voice: VoiceRecognitionResult;
}

/**
 * Microphone control with visible states: idle, listening (with live partial text),
 * heard, and error. Unsupported browsers get a clear message and keep the typed search.
 */
export function VoiceButton({ language, voice }: VoiceButtonProps) {
  const listening = voice.status === 'listening';
  const Icon = listening ? MicOff : Mic;

  if (!voice.supported) {
    return (
      <div className="voice voice-unsupported" role="note">
        <button type="button" className="voice-button" disabled aria-label={tr('voiceUnsupported', language)} title={tr('voiceUnsupported', language)}>
          <Mic size={18} aria-hidden="true" />
          <span>{tr('voiceStart', language)}</span>
        </button>
      </div>
    );
  }

  let status: string | null = null;
  if (listening) status = voice.interim ? `“${voice.interim}”` : tr('voiceListening', language);
  else if (voice.status === 'heard' && voice.transcript) status = `${tr('voiceHeard', language)}: “${voice.transcript}”`;
  else if (voice.status === 'error' && voice.error) status = voice.error[language];

  return (
    <div className={`voice voice-${voice.status}`}>
      <button
        type="button"
        className={`voice-button${listening ? ' is-listening' : ''}`}
        aria-pressed={listening}
        aria-label={listening ? tr('voiceStop', language) : tr('voiceStart', language)}
        onClick={() => (listening ? voice.stop() : voice.start())}
      >
        <Icon size={18} aria-hidden="true" />
        <span>{listening ? tr('voiceStop', language) : tr('voiceStart', language)}</span>
      </button>
        {status ? <p className="voice-status" role="status" aria-live="polite">{status}</p> : null}
    </div>
  );
}
