/** Smooth illustrative separation: coincident at birth/death, widest at midlife. */
export function lifecycleEnvelope(age: number, lifetime: number): number {
  const progress = age / lifetime;
  return progress <= 0 || progress >= 1 ? 0 : Math.sin(Math.PI * progress);
}

/** Only visibility changes in reduced-flashing mode, never the lobe positions. */
export function lobeScale(age: number, lifetime: number, reducedFlashing: boolean): number {
  return reducedFlashing ? .8 : Math.min(1, lifecycleEnvelope(age, lifetime) / .2);
}
