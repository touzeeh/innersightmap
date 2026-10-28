import { describe, expect, it } from 'vitest';
import { describeRecognitionError, pickVoice } from '../services/speechSupport';

const voices = [
  { name: 'Google US English', lang: 'en-US' },
  { name: 'Google UK English Female', lang: 'en_GB' },
  { name: 'Microsoft Ravi', lang: 'hi-IN' },
];

describe('voice selection', () => {
  it('prefers the Indian English voice, then British, then US', () => {
    expect(pickVoice([...voices, { name: 'Indian', lang: 'en-IN' }], 'en')?.name).toBe('Indian');
    expect(pickVoice(voices, 'en')?.name).toBe('Google UK English Female');
    expect(pickVoice([voices[0]], 'en')?.name).toBe('Google US English');
  });

  it('selects a Hindi voice when one is installed', () => {
    expect(pickVoice(voices, 'hi')?.name).toBe('Microsoft Ravi');
  });

  it('returns null when no voice exists for the language, so the UI can say so', () => {
    expect(pickVoice([voices[0]], 'hi')).toBeNull();
    expect(pickVoice([], 'en')).toBeNull();
  });
});

describe('recognition errors', () => {
  it('explains a blocked microphone and points to typed search', () => {
    const message = describeRecognitionError('not-allowed');
    expect(message.en).toMatch(/Microphone access was blocked/);
    expect(message.en).toMatch(/type your destination/i);
    expect(message.hi.length).toBeGreaterThan(0);
  });

  it('gives a usable message for unknown codes too', () => {
    expect(describeRecognitionError('weird-code').en).toMatch(/weird-code/);
  });
});
