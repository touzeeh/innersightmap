import { useEffect, useMemo, type DependencyList } from 'react';
import type { BufferGeometry } from 'three';

/**
 * Create a geometry once per dependency change and dispose the previous one.
 * R3F only disposes geometry declared in JSX, so geometry built here must be
 * released explicitly to avoid leaking GPU buffers.
 */
export function useOwnedGeometry<T extends BufferGeometry | null>(factory: () => T, deps: DependencyList): T {
  const geometry = useMemo(factory, deps);
  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);
  return geometry;
}
