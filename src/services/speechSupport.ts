/**
 * Pure helpers for the Web Speech API: voice choice and user-facing error text.
 * Kept free of browser globals so they can be unit tested.
 */
import type { Language, Localised } from '../types/navigation';

export interface VoiceLike {
  name: string;
  lang: string;
}

/** BCP-47 tags used for recognition and synthesis. */
export const RECOGNITION_LANG: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN' };
export const SYNTHESIS_LANG: Record<Language, string> = { en: 'en-IN', hi: 'hi-IN' };

/**
 * Choose the best available voice for a language. Prefers an exact regional
 * match, then the same base language, and returns null when none is installed.
 */
export function pickVoice<T extends VoiceLike>(voices: readonly T[], language: Language): T | null {
  const base = language === 'hi' ? 'hi' : 'en';
  const preferred = language === 'hi' ? ['hi-IN'] : ['en-IN', 'en-GB', 'en-US'];
  for (const tag of preferred) {
    const exact = voices.find((v) => v.lang.replace('_', '-').toLowerCase() === tag.toLowerCase());
    if (exact) return exact;
  }
  return voices.find((v) => v.lang.toLowerCase().startsWith(base)) ?? null;
}

/** Map a SpeechRecognition error code to a clear, bilingual explanation. */
export function describeRecognitionError(code: string): Localised {
  switch (code) {
    case 'not-allowed':
    case 'service-not-allowed':
      return {
        en: 'Microphone access was blocked. Allow microphone permission in the browser, or type your destination instead.',
        hi: 'माइक्रोफ़ोन की अनुमति नहीं मिली। ब्राउज़र में अनुमति दें, या गंतव्य टाइप करें।',
      };
    case 'no-speech':
      return { en: 'No speech was detected. Try again, or type your destination.', hi: 'कोई आवाज़ नहीं सुनी गई। दोबारा कोशिश करें, या गंतव्य टाइप करें।' };
    case 'audio-capture':
      return { en: 'No microphone was found. Type your destination instead.', hi: 'कोई माइक्रोफ़ोन नहीं मिला। गंतव्य टाइप करें।' };
    case 'network':
      return {
        en: 'Brave could not reach its online speech-recognition service. Try this page in Google Chrome or Microsoft Edge for Speak, or type your destination here.',
        hi: 'Brave की ऑनलाइन वाक् पहचान सेवा तक नहीं पहुँच सकी। Speak के लिए यह पेज Google Chrome या Microsoft Edge में खोलें, या गंतव्य यहाँ टाइप करें।',
      };
    case 'language-not-supported':
      return { en: 'This browser does not support speech recognition in the selected language.', hi: 'इस ब्राउज़र में चुनी गई भाषा के लिए वाक् पहचान उपलब्ध नहीं है।' };
    case 'aborted':
      return { en: 'Listening was stopped.', hi: 'सुनना बंद किया गया।' };
    default:
      return { en: `Voice recognition failed (${code}). Type your destination instead.`, hi: `वाक् पहचान विफल रही (${code})। गंतव्य टाइप करें।` };
  }
}
