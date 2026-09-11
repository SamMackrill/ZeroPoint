/** Analytic references, independent of the illustrative dipole animation. */
export const HBAR = 1.054571817e-34;
export const C = 299792458;
export const GAP_MIN_NM = 100;
export const GAP_MAX_NM = 1000;

function positive(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be finite and positive.`);
}

/** Infinite perfect conductors, T = 0; finite-area force neglects edges. */
export function casimir(gapNm: number, areaMm2: number) {
  positive(gapNm, 'Gap'); positive(areaMm2, 'Area');
  const d = gapNm * 1e-9, area = areaMm2 * 1e-6;
  const energyPerArea = -(Math.PI ** 2) * HBAR * C / (720 * d ** 3);
  const pressure = -(Math.PI ** 2) * HBAR * C / (240 * d ** 4);
  return { pressure, force: pressure * area, energyPerArea, energy: energyPerArea * area };
}

/** London short-range reference: r in r₀, E₀ = C₆/r₀⁶; no material C₆ is assumed. */
export function london(distance: number) {
  positive(distance, 'Pair separation');
  return { energy: -1 / distance ** 6, force: -6 / distance ** 7 };
}

/** Static, logarithmically spaced gap sweep, not a moving-plate simulation. */
export function pressureSweep(areaMm2: number) {
  return Array.from({ length: 61 }, (_, i) => {
    const gapNm = GAP_MIN_NM * (GAP_MAX_NM / GAP_MIN_NM) ** (i / 60);
    return { gapNm, ...casimir(gapNm, areaMm2) };
  });
}

export function pressureCSV(areaMm2: number) {
  return 'model,gap_nm,area_mm2,pressure_Pa,force_N,interaction_energy_per_area_J_m2,interaction_energy_J\n' +
    pressureSweep(areaMm2).map(r => ['ideal-perfect-conductor-T0', r.gapNm, areaMm2, r.pressure, r.force, r.energyPerArea, r.energy].join(',')).join('\n');
}
