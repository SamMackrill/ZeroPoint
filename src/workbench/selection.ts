// Unified selection (docs/ui-redesign-plan.html §07, roadmap P4): in every viewport a click without movement picks and
// a drag orbits; Esc clears the selection and F focuses the camera on it.
import { useCommand } from './actions';

/** A pointer that moves less than this between down and up is a click (a pick), not a drag (an orbit). */
export const CLICK_TOLERANCE_PX = 4;

/** Whether a pointer press released here was a click rather than a drag. */
export const isClick = (down: { x: number; y: number }, up: { clientX: number; clientY: number }) => Math.hypot(up.clientX - down.x, up.clientY - down.y) <= CLICK_TOLERANCE_PX;

/**
 * Esc clears the selection and F focuses it, while `active`. Keys typed into fields, used with modifiers, or already
 * handled elsewhere (an open popover's Esc, a plot's arrows) are left alone.
 */
export function useSelectionKeys({ active, hasSelection, onClear, onFocus }: { active: boolean; hasSelection: boolean; onClear(): void; onFocus?(): void }) {
  useCommand('selection.clear', active && hasSelection, onClear);
  useCommand('selection.focus', active && hasSelection && !!onFocus, () => onFocus?.());
}
