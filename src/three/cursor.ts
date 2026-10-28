/** Sets the pointer cursor over the 3D canvas. Kept in one place so it can be reset reliably. */
export function setCursor(kind: 'pointer' | 'default' | 'grab'): void {
  if (typeof document === 'undefined') return;
  document.body.style.cursor = kind;
}
