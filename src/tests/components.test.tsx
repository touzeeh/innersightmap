import { describe, expect, it, vi, type Mock } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { DestinationSearch } from '../components/search/DestinationSearch';
import { VoiceButton } from '../components/voice/VoiceButton';
import { DESTINATIONS } from '../data/destinations';
import type { VoiceRecognitionResult } from '../hooks/useVoiceRecognition';

function voiceState(overrides: Partial<VoiceRecognitionResult> = {}): VoiceRecognitionResult {
  return {
    supported: true,
    status: 'idle',
    interim: '',
    transcript: '',
    error: null,
    start: vi.fn(),
    stop: vi.fn(),
    ...overrides,
  };
}

function renderSearch(overrides: Partial<Parameters<typeof DestinationSearch>[0]> = {}): { onChoose: Mock } {
  const onChoose = vi.fn();
  const props = {
    language: 'en' as const,
    clarification: null,
    feedback: null,
    note: null,
    voice: voiceState(),
    onDismissClarification: vi.fn(),
    ...overrides,
    onChoose,
  };
  render(<DestinationSearch {...props} />);
  return { onChoose };
}

describe('destination search panel', () => {
  it('lists every washroom on every floor as the user types', () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'washroom' } });
    const listbox = screen.getByRole('listbox');
    const options = within(listbox).getAllByRole('option');
    expect(options.length).toBe(4);
    expect(options.every((o) => /Floor|Ground floor/.test(o.textContent ?? ''))).toBe(true);
  });

  it('chooses the highlighted result with the keyboard', () => {
    const props = renderSearch();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'pharmacy' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(props.onChoose).toHaveBeenCalledWith('G-PHM');
  });

  it('moves the highlight with arrow keys before choosing', () => {
    const props = renderSearch();
    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'washroom' } });
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    const chosen = props.onChoose.mock.calls[0][0] as string;
    expect(DESTINATIONS.find((d) => d.id === chosen)?.category).toBe('washroom');
    expect(chosen).not.toBe('G-WC');
  });

  it('shows an empty state for a query with no match', () => {
    renderSearch();
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'xqzvw' } });
    expect(screen.getByText(/No matching places/)).toBeInTheDocument();
  });

  it('offers the candidates when a voice query was ambiguous and lets the user pick one', () => {
    const props = renderSearch({ clarification: ['1-PATH', '1-BLC'] });
    expect(screen.getByText('Which one did you mean?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Blood Collection/ }));
    expect(props.onChoose).toHaveBeenCalledWith('1-BLC');
  });

  it('clears the query with Escape', () => {
    renderSearch();
    const input = screen.getByRole('combobox') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'lift' } });
    fireEvent.keyDown(input, { key: 'Escape' });
    expect(input.value).toBe('');
  });
});

describe('voice button fallback', () => {
  it('explains that voice input is unavailable and keeps the search box usable', () => {
    renderSearch({ voice: voiceState({ supported: false, status: 'unsupported' }) });
    expect(screen.getAllByText(/Voice input is not available in this browser/).length).toBeGreaterThan(0);
    expect(screen.getByRole('combobox')).toBeEnabled();
  });

  it('reports a real failure instead of pretending recognition worked', () => {
    render(
      <VoiceButton
        language="en"
        voice={voiceState({
          status: 'error',
          error: { en: 'Microphone access was blocked. Type your destination instead.', hi: 'x' },
        })}
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent('Microphone access was blocked');
    expect(screen.queryByText(/Heard/)).not.toBeInTheDocument();
  });

  it('shows the live partial transcript while listening', () => {
    render(<VoiceButton language="en" voice={voiceState({ status: 'listening', interim: 'blood ba' })} />);
    expect(screen.getByRole('button', { name: 'Stop listening' })).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('blood ba');
  });

  it('starts listening only after an explicit click', () => {
    const voice = voiceState();
    render(<VoiceButton language="en" voice={voice} />);
    expect(voice.start).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Speak' }));
    expect(voice.start).toHaveBeenCalledTimes(1);
  });
});
