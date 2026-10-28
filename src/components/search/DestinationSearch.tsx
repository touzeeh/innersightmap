import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { DESTINATIONS } from '../../data/destinations';
import { CATEGORY_META } from '../../i18n/categories';
import { tr } from '../../i18n/strings';
import { floorLabel, searchDestinations } from '../../services/destinationSearch';
import type { VoiceRecognitionResult } from '../../hooks/useVoiceRecognition';
import type { Destination, Language } from '../../types/navigation';
import { VoiceButton } from '../voice/VoiceButton';

export interface DestinationSearchProps {
  language: Language;
  clarification: string[] | null;
  feedback: string | null;
  /** Standing note about the voice setup, e.g. no Hindi voice installed. */
  note?: string | null;
  voice: VoiceRecognitionResult;
  onChoose: (id: string) => void;
  onDismissClarification: () => void;
}

const MAX_RESULTS = 10;

function DestinationRow({ destination, language, active, id, onChoose }: {
  destination: Destination;
  language: Language;
  active: boolean;
  id: string;
  onChoose: (id: string) => void;
}) {
  const meta = CATEGORY_META[destination.category];
  const Icon = meta.icon;
  const name = language === 'hi' ? destination.nameHi : destination.name;
  return (
    <li
      id={id}
      role="option"
      aria-selected={active}
      className={`result-row${active ? ' is-active' : ''}${destination.publicAccess ? '' : ' is-restricted'}`}
      onMouseDown={(event) => {
        // Keep focus in the input so the list stays open while choosing.
        event.preventDefault();
        onChoose(destination.id);
      }}
    >
      <span className="result-icon" style={{ color: meta.accent }} aria-hidden="true">
        <Icon size={18} />
      </span>
      <span className="result-text">
        <span className="result-name">{name}</span>
        <span className="result-meta">
          {floorLabel(destination.level, language)}
          {destination.roomNumber ? ` · ${language === 'hi' ? 'कमरा' : 'Room'} ${destination.roomNumber}` : ''}
          {' · '}
          {meta.label[language]}
        </span>
      </span>
    </li>
  );
}

export function DestinationSearch({ language, clarification, feedback, voice, onChoose, onDismissClarification }: DestinationSearchProps) {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputId = useId();

  const results = useMemo(() => (query.trim() ? searchDestinations(query, DESTINATIONS, MAX_RESULTS) : []), [query]);
  const open = query.trim().length > 0;
  const activeIndex = results.length ? Math.min(active, results.length - 1) : 0;

  const choose = (id: string): void => {
    onChoose(id);
    setQuery('');
    setActive(0);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : 0));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : 0));
    } else if (event.key === 'Enter' && results[activeIndex]) {
      event.preventDefault();
      choose(results[activeIndex].destination.id);
    } else if (event.key === 'Escape') {
      setQuery('');
    }
  };

  const clarifyOptions = (clarification ?? []).map((id) => DESTINATIONS.find((d) => d.id === id)).filter((d): d is Destination => Boolean(d));

  return (
    <section className="panel search-panel" aria-labelledby={`${inputId}-heading`}>
      <header className="panel-head">
        <h2 id={`${inputId}-heading`}>{tr('searchHeading', language)}</h2>
      </header>

      <div className="command-bar">
      <div className="search-field">
        <label className="visually-hidden" htmlFor={inputId}>{tr('searchHeading', language)}</label>
        <input
          id={inputId}
          role="combobox"
          type="search"
          autoComplete="off"
          spellCheck={false}
          value={query}
          placeholder={tr('searchPlaceholder', language)}
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && results[activeIndex] ? `${listId}-${activeIndex}` : undefined}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {query ? (
          <button type="button" className="icon-button" aria-label={tr('clearSearch', language)} onClick={() => setQuery('')}>
            <X size={16} aria-hidden="true" />
          </button>
        ) : null}
      </div>
      <VoiceButton language={language} voice={voice} />
      </div>
      <div className="quick-chips" role="group" aria-label={language === 'hi' ? 'त्वरित गंतव्य' : 'Quick destinations'}>
        <button type="button" className="quick-chip" onClick={() => choose('2-BB')}>{language === 'hi' ? 'ब्लड बैंक' : 'Blood Bank'}</button>
        <button type="button" className="quick-chip" onClick={() => choose('G-EMG')}>{language === 'hi' ? 'आपातकालीन' : 'Emergency'}</button>
        <button type="button" className="quick-chip" onClick={() => choose('G-PHM')}>{language === 'hi' ? 'फार्मेसी' : 'Pharmacy'}</button>
        <button type="button" className="quick-chip" onClick={() => { setQuery('washroom'); setActive(0); }}>{language === 'hi' ? 'शौचालय' : 'Washroom'}</button>
      </div>

      {open ? (
        <div className="results">
          {results.length > 0 ? (
            <ul id={listId} role="listbox" aria-label={tr('resultsLabel', language)} className="result-list">
              {results.map((match, index) => (
                <DestinationRow
                  key={match.destination.id}
                  id={`${listId}-${index}`}
                  destination={match.destination}
                  language={language}
                  active={index === activeIndex}
                  onChoose={choose}
                />
              ))}
            </ul>
          ) : (
            <p className="empty-state" role="status">{tr('noResults', language)}</p>
          )}
        </div>
      ) : null}

      {clarifyOptions.length > 0 ? (
        <div className="clarify" role="group" aria-label={tr('clarifyTitle', language)}>
          <div className="clarify-head">
            <strong>{tr('clarifyTitle', language)}</strong>
            <button type="button" className="text-button" onClick={onDismissClarification}>
              {tr('cancelPick', language)}
            </button>
          </div>
          <div className="clarify-options">
            {clarifyOptions.map((d, i) => (
              <button key={d.id} type="button" className="clarify-option" onClick={() => choose(d.id)}>
                <span className="clarify-index">{i + 1}</span>
                <span>
                  {language === 'hi' ? d.nameHi : d.name}
                  <small> · {floorLabel(d.level, language)}{d.roomNumber ? ` · ${d.roomNumber}` : ''}</small>
                </span>
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {feedback ? <p className="feedback" role="status" aria-live="polite">{feedback}</p> : null}
    </section>
  );
}
