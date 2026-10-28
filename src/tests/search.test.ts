import { describe, expect, it } from 'vitest';
import { resolveDestination, searchDestinations, floorFromQuery } from '../services/destinationSearch';
import { parseVoiceIntent } from '../services/voiceIntent';
import { normalizeText, editDistance } from '../services/textNormalize';
import { DESTINATIONS } from '../data/destinations';

const idsOf = (query: string): string[] => searchDestinations(query).map((m) => m.destination.id);

describe('text normalisation', () => {
  it('folds case, punctuation and Hindi spelling variants', () => {
    expect(normalizeText('  Blood-Bank!  ')).toBe('blood bank');
    expect(normalizeText('खून की जांच')).toBe(normalizeText('खून की जाँच'));
    expect(normalizeText('इमरजेंसी')).toBe(normalizeText('इमरजेंसी'));
    expect(normalizeText('लिफ़्ट')).toBe(normalizeText('लिफ्ट'));
    expect(normalizeText('२०४')).toBe('204');
  });

  it('computes edit distance for typo tolerance', () => {
    expect(editDistance('emergency', 'emergancy')).toBe(1);
    expect(editDistance('kitten', 'sitting')).toBe(3);
  });
});

describe('destination search', () => {
  it('finds the Blood Bank by English name, alias and partial text', () => {
    expect(resolveDestination('Blood Bank')).toMatchObject({ status: 'single', match: { id: '2-BB' } });
    expect(resolveDestination('blood ba')).toMatchObject({ status: 'single', match: { id: '2-BB' } });
    expect(resolveDestination('BLOOD BANK')).toMatchObject({ status: 'single', match: { id: '2-BB' } });
  });

  it('finds the Emergency Ward and Pharmacy', () => {
    expect(resolveDestination('Emergency Ward')).toMatchObject({ status: 'single', match: { id: 'G-EMG' } });
    expect(resolveDestination('Pharmacy')).toMatchObject({ status: 'single', match: { id: 'G-PHM' } });
  });

  it('matches room numbers in several phrasings', () => {
    expect(resolveDestination('Room 204')).toMatchObject({ status: 'single', match: { id: '2-REC' } });
    expect(resolveDestination('204')).toMatchObject({ status: 'single', match: { id: '2-REC' } });
  });

  it('matches common Hindi names and Hindi voice-style sentences', () => {
    expect(resolveDestination('इमरजेंसी वार्ड')).toMatchObject({ status: 'single', match: { id: 'G-EMG' } });
    expect(resolveDestination('मुझे ब्लड बैंक जाना है')).toMatchObject({ status: 'single', match: { id: '2-BB' } });
    expect(resolveDestination('मुझे रूम 204 तक ले चलो')).toMatchObject({ status: 'single', match: { id: '2-REC' } });
    expect(resolveDestination('फार्मेसी')).toMatchObject({ status: 'single', match: { id: 'G-PHM' } });
  });

  it('treats the Hindi phrase for a blood test as ambiguous between two labs', () => {
    const result = resolveDestination('खून की जाँच');
    expect(result.status).toBe('ambiguous');
    expect(result.options.map((d) => d.id).sort()).toEqual(['1-BLC', '1-PATH']);
  });

  it('asks for clarification when a washroom query matches every floor', () => {
    const result = resolveDestination('washroom');
    expect(result.status).toBe('ambiguous');
    expect(result.options.length).toBe(4);
    expect(new Set(result.options.map((d) => d.level))).toEqual(new Set([0, 1, 2, 3]));
  });

  it('asks for clarification for lifts and stairs on each floor', () => {
    expect(resolveDestination('lift').status).toBe('ambiguous');
    expect(resolveDestination('stairs').status).toBe('ambiguous');
  });

  it('lists every place on a requested floor', () => {
    const ids = idsOf('floor 2');
    expect(ids.length).toBeGreaterThanOrEqual(8);
    expect(DESTINATIONS.filter((d) => d.level === 2).every((d) => ids.includes(d.id))).toBe(true);
    expect(floorFromQuery('मंज़िल 3')).toBe(3);
    expect(floorFromQuery('2nd floor')).toBe(2);
  });

  it('returns no matches for nonsense input', () => {
    expect(resolveDestination('qwxzv')).toEqual({ status: 'none', options: [] });
    expect(searchDestinations('')).toEqual([]);
  });

  it('ranks exact names above partial matches', () => {
    const results = searchDestinations('reception');
    expect(results[0].destination.id).toBe('G-REC');
    expect(results[0].score).toBeGreaterThan(results[results.length - 1].score);
  });
});

describe('voice intent parsing', () => {
  it('recognises short English commands', () => {
    expect(parseVoiceIntent('Start navigation.')).toEqual({ type: 'command', command: 'start' });
    expect(parseVoiceIntent('Stop.')).toEqual({ type: 'command', command: 'stop' });
    expect(parseVoiceIntent('Repeat directions')).toEqual({ type: 'command', command: 'repeat' });
    expect(parseVoiceIntent('Pause')).toEqual({ type: 'command', command: 'pause' });
  });

  it('switches language on request', () => {
    expect(parseVoiceIntent('Switch to Hindi')).toEqual({ type: 'command', command: 'language-hi' });
    expect(parseVoiceIntent('Switch to English')).toEqual({ type: 'command', command: 'language-en' });
    expect(parseVoiceIntent('रुको')).toEqual({ type: 'command', command: 'pause' });
  });

  it('treats longer utterances as destination requests, not commands', () => {
    expect(parseVoiceIntent('Go to the pharmacy')).toEqual({ type: 'destination', query: 'Go to the pharmacy' });
    expect(parseVoiceIntent('Take me to the blood bank')).toMatchObject({ type: 'destination' });
    expect(parseVoiceIntent('मुझे ब्लड बैंक जाना है।')).toMatchObject({ type: 'destination' });
  });

  it('answers clarification prompts with ordinals and digits', () => {
    expect(parseVoiceIntent('two', 3)).toEqual({ type: 'select', index: 1 });
    expect(parseVoiceIntent('पहला', 2)).toEqual({ type: 'select', index: 0 });
    expect(parseVoiceIntent('3', 2)).toEqual({ type: 'destination', query: '3' });
  });

  it('returns empty for filler-only speech', () => {
    expect(parseVoiceIntent('   ')).toEqual({ type: 'empty' });
    expect(parseVoiceIntent('the a an')).toEqual({ type: 'empty' });
  });
});
