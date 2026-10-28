import { TriangleAlert } from 'lucide-react';
import { tr, type StringKey } from '../../i18n/strings';
import type { Language } from '../../types/navigation';

/** Shown in place of the 3D view when WebGL is unavailable or the scene fails. Search and directions still work. */
export function SceneFallback({ language, reason }: { language: Language; reason: StringKey }) {
  return (
    <div className="scene-fallback" role="alert">
      <TriangleAlert size={28} aria-hidden="true" />
      <p>{tr(reason, language)}</p>
      <p className="hint">{tr('webglFallback', language)}</p>
    </div>
  );
}

/** Small loading state while the 3D bundle and scene are prepared. */
export function SceneLoading({ language }: { language: Language }) {
  return (
    <div className="scene-loading" role="status" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{tr('loadingScene', language)}</p>
    </div>
  );
}
