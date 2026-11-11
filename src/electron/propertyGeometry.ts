import { add, C, DEFAULT_ELECTRON, dipoleAt, dot, ELECTRON_DT, ELECTRON_MODEL, RADIUS, enclosedCharge, scale } from './model';
import type { ElectronState, Vec } from './model';

/** Rest-frame Gauss comparison, independent of the animated introduction/motion. */
export function fluxAtRadius(radius: number) {
  const reference: ElectronState = { model: ELECTRON_MODEL, tick: 360, parameters: { ...DEFAULT_ELECTRON, mode: 'electric' } };
  return { field: 1 / radius ** 2, area: radius ** 2, charge: enclosedCharge(reference, radius) };
}

/** Kinematic interpretation of Fleming's effective shell scale; not local pair speed. */
export function effectiveShellScale(radiusRatio: number, rateRatio: number) {
  return { frequency: rateRatio * C / (2 * Math.PI * RADIUS), speedOverC: radiusRatio * rateRatio, limitRadius: 1 / rateRatio };
}

/** Conventional-current weights q/e times rotation-only velocity. */
export function chargeMotion(positiveVelocity: Vec) {
  const negativeVelocity = scale(positiveVelocity, -1);
  return { positiveVelocity, negativeVelocity, positiveCurrent: positiveVelocity, negativeCurrent: scale(negativeVelocity, -1) };
}

/** Half a tick either side: short enough to stay within one pair's lifetime almost everywhere. */
const TURN_STEP = .5;
/** A larger change of direction in half a tick is a jump (the electron passing beside the site), not a turn. */
const MAX_STEP_TURN = .05;

/**
 * Rotation-only velocity of a lattice pair's + end, from the model's own turns: Stationary's alignment toward the
 * electron, and Moving's motion-induced turn with its spin turn. It is the rate of change of the pair's direction
 * within one generation, with the separation held, so a replacement pair never reads as a jump; nor does a pair whose
 * direction flips as the electron passes beside it.
 */
export function latticeTurnVelocity(s: ElectronState, index: number): Vec {
  const d = dipoleAt(s, index), at = (tick: number) => { const e = dipoleAt({ ...s, tick }, index); return e.generation === d.generation && Math.acos(Math.min(1, dot(e.direction, d.direction))) < MAX_STEP_TURN ? { tick, direction: e.direction } : null; };
  const before = s.tick >= TURN_STEP ? at(s.tick - TURN_STEP) : null, after = at(s.tick + TURN_STEP);
  const a = before ?? { tick: s.tick, direction: d.direction }, b = after ?? { tick: s.tick, direction: d.direction };
  if (b.tick === a.tick) return [0, 0, 0];
  // A turn moves the end at right angles to the pair; the chord of a one-sided step is not quite, so project it.
  const chord = add(b.direction, scale(a.direction, -1)), turn = add(chord, scale(d.direction, -dot(chord, d.direction)));
  return scale(turn, d.separation / 2 / ((b.tick - a.tick) * ELECTRON_DT));
}

/** Constants as the book uses them (CODATA 2010), so its worked figures reproduce digit for digit. */
const HBAR = 1.054571726e-34, PLANCK = 6.62606957e-34, JOULE_PER_GEV = 1.602176565e-10;
/** The two particles of The Zero-Point Universe ch. 16, with the diameter Fleming assigns each shell. */
export const SHELL_PARTICLES = {
  electron: { label: 'Electron', massEnergy: 0.510998928e-3, diameter: 2.4263102389e-12, unit: 1e-12, unitLabel: 'pm', diameterNote: 'Compton wavelength' },
  proton: { label: 'Proton', massEnergy: 938.272046e-3, diameter: 2 * 0.8775e-15, unit: 1e-15, unitLabel: 'fm', diameterNote: 'twice the charge radius' },
} as const;
export type ShellParticle = keyof typeof SHELL_PARTICLES;

/**
 * Zero-point energy density of every fluctuation with a wavelength of `diameter` or longer, in GeV/cm³: Fleming's
 * Equation 16-1 with ω = 2πc/d, which is ħω⁴/(8π²c³) = 2π²ħc/d⁴.
 */
export const zeroPointDensity = (diameter: number) => 2 * Math.PI ** 2 * HBAR * C / diameter ** 4 / JOULE_PER_GEV / 1e6;
/** A particle's mass-energy spread over a sphere of the given diameter, in GeV/cm³. */
export const massEnergyDensity = (particle: ShellParticle, diameter: number) => SHELL_PARTICLES[particle].massEnergy / (Math.PI * diameter ** 3 / 6) / 1e6;
/** Wavelength of a virtual pair at the pair-production energy, hc/4mc² (ch. 16): Fleming's natural shell thickness. */
export const pairProductionWavelength = (particle: ShellParticle) => PLANCK * C / (4 * SHELL_PARTICLES[particle].massEnergy * JOULE_PER_GEV);

/**
 * A shell as a Casimir cavity (ch. 16, Fig. 16-1): fluctuations with wavelengths between the inner and outer diameters
 * are shut out. `excluded` is their energy density, `mass` the particle's mass-energy density at the mean diameter,
 * and `ratio` the excluded energy as a fraction of mc². An outer diameter of Infinity excludes every longer wavelength.
 */
export function excludedShell(particle: ShellParticle, inner: number, outer: number) {
  const mean = Number.isFinite(outer) ? (inner + outer) / 2 : inner;
  const excluded = zeroPointDensity(inner) - (Number.isFinite(outer) ? zeroPointDensity(outer) : 0), mass = massEnergyDensity(particle, mean);
  return { inner, outer, mean, thickness: Number.isFinite(outer) ? (outer - inner) / 2 : Infinity, excluded, mass, ratio: excluded / mass };
}
/** Fleming's first approximation: with the inner diameter fixed, the outer diameter at which the excluded energy is mc². */
export function balancingOuterDiameter(particle: ShellParticle, inner: number) {
  const share = massEnergyDensity(particle, inner) / zeroPointDensity(inner);
  return share < 1 ? inner / (1 - share) ** .25 : Infinity;
}
/** With the mean diameter fixed, the half-difference of the diameters (the shell thickness) at which the excluded energy is mc². */
export function balancingThickness(particle: ShellParticle, mean: number) {
  let lo = 0, hi = mean * (1 - 1e-9);
  for (let i = 0; i < 100; i++) { const t = (lo + hi) / 2; if (excludedShell(particle, mean - t, mean + t).ratio < 1) lo = t; else hi = t; }
  return (lo + hi) / 2;
}
/** With the difference of the diameters fixed, the mean diameter at which the excluded energy is mc² (Fleming's alternative electron). */
export function balancingDiameter(particle: ShellParticle, difference: number) {
  let lo = difference / 2 * (1 + 1e-9), hi = SHELL_PARTICLES[particle].diameter * 100;
  for (let i = 0; i < 200; i++) { const d = (lo + hi) / 2; if (excludedShell(particle, d - difference / 2, d + difference / 2).ratio > 1) lo = d; else hi = d; }
  return (lo + hi) / 2;
}
