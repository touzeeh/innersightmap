import { Building2, Moon, RotateCcw, Sun } from 'lucide-react';
import { tr } from '../../i18n/strings';
import type { Language } from '../../types/navigation';

export interface HeaderProps {
  language: Language;
  onLanguage: (language: Language) => void;
  onResetDemo: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ language, onLanguage, onResetDemo, darkMode, onToggleDarkMode }: HeaderProps) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true"><Building2 size={22} /></span>
        <div>
          <h1>{tr('appTitle', language)}</h1>
          <p>{tr('tagline', language)}</p>
        </div>
      </div>
      <div className="topbar-actions">
        <button type="button" className="icon-button theme-toggle" aria-label={darkMode ? 'Switch to light mode' : 'Switch to dark mode'} title={darkMode ? 'Light appearance' : 'Dark appearance'} aria-pressed={darkMode} onClick={onToggleDarkMode}>
          {darkMode ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}
        </button>
        <div className="segmented-inline" role="group" aria-label={tr('languageLabel', language)}>
          <button type="button" className={language === 'en' ? 'is-on' : ''} aria-pressed={language === 'en'} onClick={() => onLanguage('en')}>English</button>
          <button type="button" className={language === 'hi' ? 'is-on' : ''} aria-pressed={language === 'hi'} lang="hi" onClick={() => onLanguage('hi')}>हिन्दी</button>
        </div>
        <button type="button" className="ghost-button" onClick={onResetDemo}>
          <RotateCcw size={16} aria-hidden="true" />
          {tr('resetDemo', language)}
        </button>
      </div>
    </header>
  );
}
