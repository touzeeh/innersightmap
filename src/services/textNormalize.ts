/**
 * Text normalisation shared by search and voice matching. Works for English
 * and Devanagari Hindi. It is deliberately simple and deterministic.
 */

/** Filler words removed from both queries and candidate names before matching. */
const ENGLISH_STOP_WORDS = [
  'a', 'an', 'the', 'to', 'me', 'my', 'i', 'we', 'you', 'can', 'please', 'need', 'want', 'take', 'go',
  'find', 'show', 'get', 'lead', 'bring', 'navigate', 'direction', 'directions', 'way', 'where', 'is',
  'am', 'at', 'in', 'on', 'of', 'for', 'from', 'and', 'room', 'floor',
];

const HINDI_STOP_WORDS = [
  'मुझे', 'मुझको', 'मैं', 'मुझ', 'को', 'तक', 'ले', 'लेकर', 'चलो', 'चलिए', 'चलें', 'जाना', 'जाने', 'जाऊं', 'जाऊँ',
  'है', 'हैं', 'चाहिए', 'चाहिये', 'चाहता', 'चाहती', 'कहाँ', 'कहां', 'का', 'की', 'के', 'में', 'पर', 'से',
  'वाला', 'वाली', 'करो', 'दिखाओ', 'बताओ', 'रूम', 'कमरा', 'नंबर', 'नम्बर', 'ढूंढो', 'खोजो', 'और', 'यह', 'वह',
];

export const STOP_WORDS: ReadonlySet<string> = new Set([...ENGLISH_STOP_WORDS, ...HINDI_STOP_WORDS]);

/**
 * Normalise a string for comparison:
 * - Unicode NFC, with nukta removed (ड़ → ड, ज़ → ज) so Hindi spellings match.
 * - Chandrabindu (ँ) folded to anusvara (ं) so जाँच and जांच match.
 * - Devanagari digits mapped to ASCII digits.
 * - Zero-width joiners removed; punctuation and hyphens become spaces.
 * - Lower-cased, whitespace collapsed.
 */
export function normalizeText(input: string): string {
  return input
    .normalize('NFD')
    .replace(/़/g, '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/ँ/g, 'ं')
    .replace(/[​-‍﻿]/g, '')
    .replace(/[०-९]/g, (ch) => String(ch.charCodeAt(0) - 0x0966))
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Normalised tokens with filler words removed. */
export function contentTokens(input: string): string[] {
  return normalizeText(input)
    .split(' ')
    .filter((t) => t.length > 0 && !STOP_WORDS.has(t));
}

/** Collapse a string to its normalised content form, e.g. "Take me to the Blood Bank" → "blood bank". */
export function normalizedCore(input: string): string {
  return contentTokens(input).join(' ');
}

/** Levenshtein distance for short Latin tokens, used for typo tolerance. */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[n];
}
