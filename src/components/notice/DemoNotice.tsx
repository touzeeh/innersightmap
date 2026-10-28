import { Info } from 'lucide-react';
import { tr } from '../../i18n/strings';
import type { Language } from '../../types/navigation';

/** Always-visible statement of what the demo does and does not do. */
export function DemoNotice({ language }: { language: Language }) {
  return (
    <p className="demo-notice">
      <Info size={16} aria-hidden="true" />
      <span>{tr('demoNotice', language)}</span>
    </p>
  );
}
