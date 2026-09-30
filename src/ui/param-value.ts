// Pure value handling for ParamRow (docs/ui-redesign-plan.html §07): parsing typed input, nudging and formatting.

/** Number of decimal places a step implies (0.05 → 2, 1 → 0, 1e-3 → 3). */
export function stepDecimals(step: number): number {
  if (!Number.isFinite(step) || step <= 0) return 0;
  const text = step.toString();
  const exponent = /e-(\d+)$/.exec(text);
  if (exponent) return Number(exponent[1]);
  return text.includes('.') ? text.split('.')[1].length : 0;
}

/** Clamp to [min, max] and round to the step's precision (plus one place, for Alt nudges), removing float noise. */
export function normalizeValue(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  const places = stepDecimals(step) + 1;
  return Number(clamped.toFixed(places));
}

/**
 * Parse what was typed into a value field. Accepts a leading number with an optional unit or trailing text
 * ("625 nm", "0.5τ", "-2", "1e-3"), and a comma as the decimal separator. Returns null when there is no number.
 */
export function parseValue(text: string): number | null {
  const match = /^\s*([-+−]?(?:\d+[.,]?\d*|[.,]\d+)(?:e[+-]?\d+)?)/i.exec(text);
  if (!match) return null;
  const value = Number(match[1].replace(',', '.').replace('−', '-'));
  return Number.isFinite(value) ? value : null;
}

/** Keyboard modifiers that scale a nudge: Shift for ×10, Alt for ×0.1. */
export interface NudgeModifiers { shiftKey?: boolean; altKey?: boolean }

/** Nudge a value by one step in a direction (+1 or -1), scaled by the modifiers, clamped and rounded. */
export function nudgeValue(value: number, direction: 1 | -1, step: number, min: number, max: number, modifiers: NudgeModifiers = {}): number {
  const scale = modifiers.shiftKey ? 10 : modifiers.altKey ? 0.1 : 1;
  return normalizeValue(value + direction * step * scale, min, max, step);
}

/** Format a value at the step's precision. */
export function formatValue(value: number, step: number): string {
  return value.toFixed(stepDecimals(step));
}
