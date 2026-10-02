// Unified selection (docs/ui-redesign-plan.html §07, roadmap P4): in every viewport a click without movement picks and
// a drag orbits; Esc clears the selection and F focuses the camera on it.
import { useEffect } from 'react';

/** A pointer that moves less than this between down and up is a click (a pick), not a drag (an orbit). */
export const CLICK_TOLERANCE_PX = 4;

/** Whether a pointer press released here was a click rather than a drag. */
export const isClick = (down: { x: number; y: number }, up: { clientX: number; clientY: number }) => Math.hypot(up.clientX - down.x, up.clientY - down.y) <= CLICK_TOLERANCE_PX;

/** Whether a key event belongs to a text field, a control or an open dialog, where the selection keys must not act. */
function busy(event: KeyboardEvent): boolean {
  if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey) return true;
  const target = event.target;
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || !!target.closest('input, textarea, select, [role=dialog], dialog[open]');
}

/**
 * Esc clears the selection and F focuses it, while `active`. Keys typed into fields, used with modifiers, or already
 * handled elsewhere (an open popover's Esc, a plot's arrows) are left alone.
 */
export function useSelectionKeys({ active, hasSelection, onClear, onFocus }: { active: boolean; hasSelection: boolean; onClear(): void; onFocus?(): void }) {
  useEffect(() => {
    if (!active || !hasSelection) return;
    const onKey = (event: KeyboardEvent) => {
      if (busy(event)) return;
      if (event.key === 'Escape') { event.preventDefault(); onClear(); }
      else if ((event.key === 'f' || event.key === 'F') && onFocus) { event.preventDefault(); onFocus(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, hasSelection, onClear, onFocus]);
}
