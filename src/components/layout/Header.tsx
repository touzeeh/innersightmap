import { useEffect, useRef, useState } from 'react';
import { CircleHelp, MapPin, Moon, MoreHorizontal, RotateCcw, Siren, Sun, Type, Volume2, VolumeX } from 'lucide-react';
import { tr } from '../../i18n/strings';
import type { Language } from '../../types/navigation';

export const HOSPITAL_NAME = 'City General Hospital · Main Building';

export interface HeaderProps {
  language: Language;
  onLanguage: (language: Language) => void;
  onResetDemo: () => void;
  onEmergency: () => void;
  muted: boolean;
  onToggleMute: () => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function Header({ language, onLanguage, onResetDemo, onEmergency, muted, onToggleMute, darkMode, onToggleDarkMode }: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setMenuOpen(false);
        setConfirmReset(false);
        setHelpOpen(false);
        menuButtonRef.current?.focus();
      }
    };
    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) {
        setMenuOpen(false);
        setConfirmReset(false);
        setHelpOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [menuOpen]);

  const finishReset = (): void => {
    onResetDemo();
    setConfirmReset(false);
    setMenuOpen(false);
    menuButtonRef.current?.focus();
  };

  return (
    <header className={'topbar' + (largeText ? ' header-large-text' : '')}>
      <div className="brand" aria-label="InnerSight">
        <span className="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="23" height="23" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 21s7-6.1 7-12a7 7 0 1 0-14 0c0 5.9 7 12 7 12Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M9 13.2v-3.1h3v3.1h3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="9" cy="8.6" r=".8" fill="currentColor" />
          </svg>
        </span>
        <span className="brand-copy">
          <span className="brand-wordmark"><span>Inner</span><strong>Sight</strong></span>
          <span className="brand-subtitle">{tr('tagline', language)}</span>
        </span>
      </div>

      <div className="hospital-chip" title={HOSPITAL_NAME}>
        <MapPin size={16} aria-hidden="true" />
        <span>{HOSPITAL_NAME}</span>
      </div>

      <div className="topbar-actions">
        <button type="button" className="header-emergency" onClick={onEmergency} aria-label={tr('emergency', language)} title={tr('emergency', language)}>
          <Siren size={17} aria-hidden="true" />
          <span>{tr('emergency', language)}</span>
        </button>
        <div className={'language-switch' + (language === 'hi' ? ' is-hindi' : '')} role="group" aria-label={tr('languageLabel', language)}>
          <button type="button" lang="en" className={language === 'en' ? 'is-on' : ''} aria-pressed={language === 'en'} aria-label="English" onClick={() => onLanguage('en')}>
            <span className="language-full">English</span><span className="language-short">EN</span>
          </button>
          <button type="button" lang="hi" className={language === 'hi' ? 'is-on' : ''} aria-pressed={language === 'hi'} aria-label="हिन्दी" onClick={() => onLanguage('hi')}>
            <span className="language-full">हिन्दी</span><span className="language-short">हि</span>
          </button>
        </div>
        <button type="button" className="theme-toggle" aria-label={tr(darkMode ? 'switchToLightTheme' : 'switchToDarkTheme', language)} title={tr(darkMode ? 'switchToLightTheme' : 'switchToDarkTheme', language)} aria-pressed={darkMode} onClick={onToggleDarkMode}>
          {darkMode ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>
        <div className="header-menu-wrap" ref={menuRef}>
          <button ref={menuButtonRef} type="button" className="header-more" aria-label={tr('moreMenu', language)} title={tr('moreMenu', language)} aria-expanded={menuOpen} aria-haspopup="true" onClick={() => setMenuOpen((open) => !open)}>
            <MoreHorizontal size={20} aria-hidden="true" />
          </button>
          {menuOpen ? <div className="header-menu" role="group" aria-label={tr('moreMenu', language)}>
            {confirmReset ? <div className="header-confirm" role="group" aria-label={tr('resetDemo', language)}>
              <span>{tr('confirmResetPrompt', language)}</span>
              <button type="button" className="header-menu-danger" onClick={finishReset}>{tr('confirmReset', language)}</button>
              <button type="button" onClick={() => setConfirmReset(false)}>{tr('cancel', language)}</button>
            </div> : <button type="button" onClick={() => setConfirmReset(true)}><RotateCcw size={16} aria-hidden="true" />{tr('resetDemo', language)}</button>}
            <button type="button" aria-pressed={largeText} onClick={() => setLargeText((value) => !value)}><Type size={16} aria-hidden="true" />{tr('largeText', language)}<span className="header-menu-check">{largeText ? '✓' : ''}</span></button>
            <button type="button" aria-expanded={helpOpen} onClick={() => setHelpOpen((value) => !value)}><CircleHelp size={16} aria-hidden="true" />{tr('helpLegend', language)}</button>
            {helpOpen ? <div className="header-help-legend" role="group" aria-label={tr('helpLegend', language)}>
              <span><i className="legend-emergency-dot" />{tr('legendEmergency', language)}</span>
              <span><i className="legend-diagnostics-dot" />{tr('legendDiagnostics', language)}</span>
              <span><i className="legend-services-dot" />{tr('legendServices', language)}</span>
              <span><i className="legend-lifts-dot" />{tr('legendLifts', language)}</span>
            </div> : null}
            <button type="button" onClick={onToggleMute}>{muted ? <Volume2 size={16} aria-hidden="true" /> : <VolumeX size={16} aria-hidden="true" />}{tr(muted ? 'soundOn' : 'soundOff', language)}</button>
            <button type="button" className="header-mobile-theme" onClick={onToggleDarkMode}>{darkMode ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}{tr(darkMode ? 'switchToLightTheme' : 'switchToDarkTheme', language)}</button>
          </div> : null}
        </div>
      </div>
    </header>
  );
}
