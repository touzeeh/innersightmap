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
        <button type="button" className="voice-button" aria-label={tr('voiceUnsupported', language)} title={tr('voiceUnsupported', language)} onClick={voice.start}>
          <Mic size={18} aria-hidden="true" />
          <span>{tr('voiceStart', language)}</span>
        </button>
        {voice.error ? <div className="voice-feedback-pill" role="status" aria-live="polite"><div><strong>Voice unavailable · आवाज़ उपलब्ध नहीं</strong><p>{voice.error[language]}</p></div></div> : null}
      </div>
    );
  }

  let status: string | null = null;
  if (listening) status = voice.interim ? `“${voice.interim}”` : tr('voiceListening', language);
  else if (voice.status === 'heard' && voice.transcript) status = `“${voice.transcript}”`;
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
        {status ? <div className={`voice-feedback-pill${listening ? ' is-listening' : ''}`} role="status" aria-live="polite">
          {listening ? <span className="voice-waveform" aria-hidden="true">{Array.from({ length: 7 }, (_, index) => <i key={index} style={{ animationDelay: `${index * 75}ms` }} />)}</span> : null}
          <div>
            <strong>{listening ? (language === 'hi' ? 'सुन रहा है · Listening' : 'Listening · सुन रहा है') : voice.status === 'heard' ? (language === 'hi' ? 'गंतव्य की पुष्टि · Destination confirmed' : 'Destination confirmed · गंतव्य की पुष्टि') : (language === 'hi' ? 'आवाज़ उपलब्ध नहीं' : 'Voice unavailable')}</strong>
            <p>{status}</p>
            {voice.status === 'heard' ? <small>{language === 'hi' ? 'मार्ग की पुष्टि करें और नेविगेशन शुरू करें।' : 'Confirm the route and start navigation.'}</small> : null}
          </div>
        </div> : null}
    </div>
  );
}
