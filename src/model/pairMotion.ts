/** The most a zepton can turn in its lifetime: 180° (Fleming, Electron Properties §6; The Zero-Point Universe ch. 19). */
export const HALF_TURN = Math.PI;

/**
 * Peak lobe-centre separation of a pair at frequency `f` (in f₀). A zepton opens to its own wavelength c/f, so the
 * peak is inversely proportional to frequency; `atReference` is the displayed peak for a pair at f₀.
 */
export function peakSeparation(atReference: number, frequency: number): number {
  return frequency > 0 ? atReference / frequency : 0;
}

/** Smooth illustrative separation: coincident at birth/death, widest at midlife. */
export function lifecycleEnvelope(age: number, lifetime: number): number {
  const progress = age / lifetime;
  return progress <= 0 || progress >= 1 ? 0 : Math.sin(Math.PI * progress);
}

/** Only visibility changes in reduced-flashing mode, never the lobe positions. */
export function lobeScale(age: number, lifetime: number, reducedFlashing: boolean): number {
  return reducedFlashing ? .8 : Math.min(1, lifecycleEnvelope(age, lifetime) / .2);
}
