import { useEffect, useMemo, useState } from 'react';

/** True when the browser can create a WebGL context. Checked once, without leaving a context behind. */
export function detectWebGL(): boolean {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
    if (!gl) return false;
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** Follows the operating system's "reduce motion" preference. */
export function usePrefersReducedMotion(): boolean {
  const query = useMemo(
    () => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null),
    [],
  );
  const [reduced, setReduced] = useState(() => Boolean(query?.matches));

  useEffect(() => {
    if (!query) return;
    const handler = (event: MediaQueryListEvent): void => setReduced(event.matches);
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, [query]);

  return reduced;
}
