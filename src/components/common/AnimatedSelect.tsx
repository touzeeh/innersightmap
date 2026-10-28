import { useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

export interface SelectOption {
  value: string;
  label: string;
  detail?: string;
}

export interface SelectGroup {
  label: string;
  options: SelectOption[];
}

interface AnimatedSelectProps {
  id: string;
  value: string;
  options?: SelectOption[];
  groups?: SelectGroup[];
  placeholder?: string;
  searchPlaceholder: string;
  emptyLabel: string;
  disabled?: boolean;
  className?: string;
  onChange: (value: string) => void;
}

export function AnimatedSelect({
  id, value, options = [], groups = [], placeholder, searchPlaceholder, emptyLabel,
  disabled = false, className = '', onChange,
}: AnimatedSelectProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const closeTimer = useRef<number | null>(null);
  const [menuPosition, setMenuPosition] = useState<CSSProperties>({});
  const listId = useId();

  const allOptions = useMemo(() => groups.length ? groups.flatMap((group) => group.options) : options, [groups, options]);
  const selected = allOptions.find((option) => option.value === value);
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const visibleOptions = useMemo(() => allOptions.filter((option) =>
    !normalizedQuery || `${option.label} ${option.detail ?? ''}`.toLocaleLowerCase().includes(normalizedQuery),
  ), [allOptions, normalizedQuery]);
  const visibleGroups = useMemo(() => groups.map((group) => ({
    ...group,
    options: group.options.filter((option) => visibleOptions.some((visible) => visible.value === option.value)),
  })).filter((group) => group.options.length > 0), [groups, visibleOptions]);

  const close = (restoreFocus = false): void => {
    setOpen(false);
    setQuery('');
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => setMounted(false), 190);
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus());
  };

  const show = (): void => {
    if (disabled) return;
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    setMounted(true);
    setQuery('');
    setActiveIndex(Math.max(0, allOptions.findIndex((option) => option.value === value)));
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const roomBelow = window.innerHeight - rect.bottom - 12;
      const roomAbove = rect.top - 12;
      const placeAbove = roomBelow < Math.min(260, roomAbove) && roomAbove > roomBelow;
      const maxHeight = Math.max(140, Math.min(320, placeAbove ? roomAbove : roomBelow));
      setMenuPosition({
        position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: placeAbove ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 8,
        width: rect.width, maxHeight,
      });
    }
    requestAnimationFrame(() => {
      setOpen(true);
      requestAnimationFrame(() => searchRef.current?.focus());
    });
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event: PointerEvent): void => {
      if (!rootRef.current?.contains(event.target as Node) && !menuRef.current?.contains(event.target as Node)) close();
    };
    const reposition = (): void => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const roomBelow = window.innerHeight - rect.bottom - 12;
      const roomAbove = rect.top - 12;
      const placeAbove = roomBelow < Math.min(260, roomAbove) && roomAbove > roomBelow;
      const maxHeight = Math.max(140, Math.min(320, placeAbove ? roomAbove : roomBelow));
      setMenuPosition({
        position: 'fixed', left: Math.max(8, Math.min(rect.left, window.innerWidth - rect.width - 8)),
        top: placeAbove ? Math.max(8, rect.top - maxHeight - 8) : rect.bottom + 8,
        width: rect.width, maxHeight,
      });
    };
    const onKeyDown = (event: globalThis.KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close(true);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    window.addEventListener('scroll', reposition, true);
    window.addEventListener('resize', reposition);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('scroll', reposition, true);
      window.removeEventListener('resize', reposition);
    };
  }, [open]);

  useEffect(() => () => {
    if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
  }, []);

  const choose = (option: SelectOption): void => {
    onChange(option.value);
    close(true);
  };

  const onSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'ArrowDown' && visibleOptions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, visibleOptions.length - 1));
    } else if (event.key === 'ArrowUp' && visibleOptions.length) {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, 0));
    } else if (event.key === 'Enter' && visibleOptions[activeIndex]) {
      event.preventDefault();
      choose(visibleOptions[activeIndex]);
    } else if (event.key === 'Tab') {
      close();
    }
  };

  const renderOption = (option: SelectOption, index: number) => (
    <button
      key={option.value}
      id={`${listId}-${option.value}`}
      type="button"
      role="option"
      tabIndex={-1}
      aria-selected={option.value === value}
      className={`animated-select-option${option.value === value ? ' is-selected' : ''}${index === activeIndex ? ' is-active' : ''}`}
      onMouseEnter={() => setActiveIndex(index)}
      onClick={() => choose(option)}
    >
      <span className="animated-select-option-copy">
        <span className="animated-select-option-label">{option.label}</span>
        {option.detail ? <span className="animated-select-option-detail">{option.detail}</span> : null}
      </span>
      {option.value === value ? <Check size={16} aria-hidden="true" /> : null}
    </button>
  );

  let optionIndex = -1;
  const menu = mounted ? createPortal(
    <div ref={menuRef} style={menuPosition} className={`animated-select-menu${open ? ' is-open' : ''}`}>
      <div className="animated-select-search-wrap">
        <Search size={15} aria-hidden="true" />
        <input
          ref={searchRef}
          role="combobox"
          type="search"
          autoComplete="off"
          value={query}
          placeholder={searchPlaceholder}
          aria-label={searchPlaceholder}
          aria-expanded={open}
          aria-autocomplete="list"
          aria-controls={listId}
          aria-activedescendant={visibleOptions[activeIndex] ? `${listId}-${visibleOptions[activeIndex].value}` : undefined}
          onChange={(event) => { setQuery(event.target.value); setActiveIndex(0); }}
          onKeyDown={onSearchKeyDown}
        />
      </div>
      <div id={listId} className="animated-select-list" role="listbox" aria-label={placeholder ?? searchPlaceholder}>
        {groups.length ? visibleGroups.map((group) => (
          <div className="animated-select-group" key={group.label}>
            <div className="animated-select-group-label">{group.label}</div>
            {group.options.map((option) => {
              optionIndex += 1;
              return renderOption(option, optionIndex);
            })}
          </div>
        )) : visibleOptions.map((option, index) => renderOption(option, index))}
        {visibleOptions.length === 0 ? <div className="animated-select-empty">{emptyLabel}</div> : null}
      </div>
    </div>, document.body,
  ) : null;

  return (
    <>
    <div ref={rootRef} className={`animated-select ${className}${open ? ' is-open' : ''}${disabled ? ' is-disabled' : ''}`}>
      <button
        ref={triggerRef}
        id={id}
        type="button"
        className="animated-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        disabled={disabled}
        onClick={() => open ? close() : show()}
        onKeyDown={(event) => {
          if (['ArrowDown', 'Enter', ' '].includes(event.key) && !open) {
            event.preventDefault();
            show();
          }
        }}
      >
        <span className={`animated-select-value${!selected ? ' is-placeholder' : ''}`}>{selected?.label ?? placeholder}</span>
        <ChevronDown className="animated-select-chevron" size={17} aria-hidden="true" />
      </button>
    </div>
    {menu}
    </>
  );
}
