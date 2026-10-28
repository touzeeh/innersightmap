/**
 * Deterministic interpretation of recognised speech. No language model is
 * used: short phrases are matched against command keywords, digits and
 * ordinals answer clarification prompts, and everything else becomes a
 * destination query for the local search index.
 */
import { contentTokens, normalizeText } from './textNormalize';

export type VoiceCommand = 'start' | 'stop' | 'pause' | 'resume' | 'repeat' | 'language-en' | 'language-hi';

export type VoiceIntent =
  | { type: 'command'; command: VoiceCommand }
  | { type: 'select'; index: number }
  | { type: 'destination'; query: string }
  | { type: 'empty' };

/** Commands are only recognised in short utterances so "go to the pharmacy" is never a command. */
const MAX_COMMAND_TOKENS = 4;

const COMMAND_WORDS: { command: VoiceCommand; words: string[] }[] = [
  { command: 'stop', words: ['stop', 'cancel', 'end', 'band', 'बंद', 'रद्द', 'रोको'] },
  { command: 'pause', words: ['pause', 'wait', 'रुको', 'रुकिए', 'ठहरो'] },
  { command: 'resume', words: ['resume', 'continue', 'जारी', 'जारी रखो'] },
  { command: 'repeat', words: ['repeat', 'again', 'dobara', 'दोबारा', 'दोहराओ', 'दोहराइए', 'पुनः', 'फिर से बोलो'] },
  { command: 'start', words: ['start', 'begin', 'शुरू', 'शुरु'] },
];

const HINDI_WORDS = ['हिंदी', 'हिन्दी', 'hindi'];
const ENGLISH_WORDS = ['english', 'अंग्रेजी', 'अंग्रेज़ी'];
const SWITCH_WORDS = ['switch', 'change', 'language', 'भाषा', 'बदलो', 'बदलिए', 'to'];

const ORDINALS: Record<string, number> = {
  '1': 1, one: 1, first: 1, पहला: 1, पहले: 1, एक: 1,
  '2': 2, two: 2, second: 2, दूसरा: 2, दो: 2,
  '3': 3, three: 3, third: 3, तीसरा: 3, तीन: 3,
  '4': 4, four: 4, fourth: 4, चौथा: 4, चार: 4,
  '5': 5, five: 5, fifth: 5, पांचवां: 5, पाँचवाँ: 5,
  '6': 6, six: 6, sixth: 6, छठा: 6, छह: 6,
};

const normalizedSet = (words: string[]): Set<string> => new Set(words.map((w) => normalizeText(w)));

export function parseVoiceIntent(transcript: string, pendingOptionCount = 0): VoiceIntent {
  const norm = normalizeText(transcript);
  if (!norm) return { type: 'empty' };
  const tokens = norm.split(' ');

  if (tokens.length <= MAX_COMMAND_TOKENS) {
    const hindi = normalizedSet(HINDI_WORDS);
    const english = normalizedSet(ENGLISH_WORDS);
    const switchWords = normalizedSet(SWITCH_WORDS);
    const hasSwitch = tokens.some((t) => switchWords.has(t));
    if (tokens.some((t) => hindi.has(t)) && (hasSwitch || tokens.length <= 2)) {
      return { type: 'command', command: 'language-hi' };
    }
    if (tokens.some((t) => english.has(t)) && (hasSwitch || tokens.length <= 2)) {
      return { type: 'command', command: 'language-en' };
    }

    for (const group of COMMAND_WORDS) {
      const words = normalizedSet(group.words);
      if (tokens.some((t) => words.has(t))) {
        return { type: 'command', command: group.command };
      }
    }

    if (pendingOptionCount > 0 && tokens.length <= 2) {
      for (const t of tokens) {
        const index = ORDINALS[t];
        if (index !== undefined && index <= pendingOptionCount) return { type: 'select', index: index - 1 };
      }
    }
  }

  if (contentTokens(norm).length === 0) return { type: 'empty' };
  return { type: 'destination', query: transcript.trim() };
}
