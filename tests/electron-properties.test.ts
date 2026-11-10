import { describe, expect, it } from 'vitest';
import { DEFAULT_ELECTRON, DEFAULT_SPIN_DISPLAY, ELECTRON_MODEL, LATTICE_SAMPLES, RADIUS, C, add, dipoleAt, dot, norm, scale } from '../src/electron/model';
import type { ElectronState } from '../src/electron/model';
import { displayedDipole } from '../src/electron/spinGeometry';
import { SHELL_PARTICLES, balancingDiameter, balancingOuterDiameter, balancingThickness, chargeMotion, effectiveShellScale, excludedShell, fluxAtRadius, latticeTurnVelocity, massEnergyDensity, pairProductionWavelength, zeroPointDensity } from '../src/electron/propertyGeometry';

describe('electron video investigations', () => {
  it('preserves flux while field and area change reciprocally', () => {
    for (const radius of [.5, .9, 1, 2, 3]) {
      const f = fluxAtRadius(radius), doubled = fluxAtRadius(2 * radius);
      expect(f.charge).toBeCloseTo(-1, 12);
      expect(f.field * f.area).toBeCloseTo(1, 12);
      expect(doubled.field / f.field).toBeCloseTo(.25, 12);
      expect(doubled.area / f.area).toBeCloseTo(4, 12);
    }
  });
  it('uses the effective shell lever arm and moves its limit inversely with rate', () => {
    for (const rate of [.5, 1, 2]) {
      const s = effectiveShellScale(1, rate);
      expect(2 * Math.PI * s.limitRadius * RADIUS * s.frequency).toBeCloseTo(C, 5);
      expect(effectiveShellScale(s.limitRadius, rate).speedOverC).toBeCloseTo(1, 12);
      expect(effectiveShellScale(s.limitRadius * 1.1, rate).speedOverC).toBeGreaterThan(1);
      expect(effectiveShellScale(s.limitRadius * .9, rate).speedOverC).toBeLessThan(1);
    }
  });
  it('keeps charge velocities opposite but current parallel across axes, bands and spin signs', () => {
    for (const axis of ['x', 'y', 'z'] as const) for (const spin of [-1, 1] as const) for (const alternating of [true, false]) for (const offset of [34, 114]) {
      const state: ElectronState = { model: ELECTRON_MODEL, tick: 120, parameters: { ...DEFAULT_ELECTRON, mode: 'spin', axis, spin } };
      const d = displayedDipole(state, LATTICE_SAMPLES + offset, { ...DEFAULT_SPIN_DISPLAY, alternating });
      const m = chargeMotion(d.spinPositiveVelocity);
      expect(norm(m.positiveVelocity)).toBeGreaterThan(0);
      expect(norm(add(m.positiveVelocity, m.negativeVelocity))).toBeLessThan(1e-12);
      expect(m.negativeCurrent).toEqual(m.positiveCurrent);
      expect(add(m.positiveCurrent, m.negativeCurrent)).toEqual(scale(m.positiveCurrent, 2));
      const reversed = displayedDipole({ ...state, parameters: { ...state.parameters, spin: spin === 1 ? -1 : 1 } }, LATTICE_SAMPLES + offset, { ...DEFAULT_SPIN_DISPLAY, alternating });
      expect(Math.sign(reversed.spinRate)).toBe(-Math.sign(d.spinRate));
      expect(reversed.centre).toEqual(d.centre);
    }
  });
});

describe('lattice charge motion (Stationary and Moving panes)', () => {
  const state = (mode: 'electric' | 'moving', tick: number): ElectronState => ({ model: ELECTRON_MODEL, tick, parameters: { ...DEFAULT_ELECTRON, mode } });
  const speeds = (s: ElectronState) => Array.from({ length: LATTICE_SAMPLES }, (_, i) => norm(latticeTurnVelocity(s, i)));
  it('turns Stationary pairs once the electron is present, generation after generation', () => {
    expect(Math.max(...speeds(state('electric', 0)))).toBe(0); // before the electron is introduced: born at random, no turn
    expect(Math.max(...speeds(state('electric', 240)))).toBeGreaterThan(0); // the polarization building
    // Each replacement is born at random and turns toward the electron: polarization never comes to rest.
    const settled = speeds(state('electric', 2400));
    expect(settled.filter(v => v > 0).length).toBeGreaterThan(LATTICE_SAMPLES / 2); expect(Math.max(...settled)).toBeLessThan(1);
  });
  it('turns Moving pairs as the electron passes, as pure rotations with no jumps', () => {
    for (let tick = 0; tick <= 5760; tick += 480) {
      const s = state('moving', tick), v = Array.from({ length: LATTICE_SAMPLES }, (_, i) => latticeTurnVelocity(s, i));
      expect(v.filter(x => norm(x) > 0).length).toBeGreaterThan(LATTICE_SAMPLES / 2);
      expect(Math.max(...v.map(norm))).toBeLessThan(1); // a pair the electron passes beside flips, which is not a speed
      v.forEach((x, i) => expect(Math.abs(dot(x, dipoleAt(s, i).direction))).toBeLessThan(1e-3)); // rotation only
    }
  });
  it('keeps the two ends opposite and their currents parallel', () => {
    const m = chargeMotion(latticeTurnVelocity(state('moving', 600), 100));
    expect(norm(add(m.positiveVelocity, m.negativeVelocity))).toBeLessThan(1e-12);
    expect(m.negativeCurrent).toEqual(m.positiveCurrent);
  });
});

describe('mass as excluded zero-point energy (The Zero-Point Universe ch. 16)', () => {
  /** A value to the book's four significant figures. */
  const figures = (value: number) => +value.toPrecision(4);
  it('reproduces Fleming\'s worked figures for the proton', () => {
    const d = SHELL_PARTICLES.proton.diameter;
    expect(d).toBeCloseTo(1.755e-15, 20);
    expect(figures(massEnergyDensity('proton', d))).toBe(3.315e38);
    expect(figures(zeroPointDensity(d))).toBe(4.106e38);
    expect(figures(balancingOuterDiameter('proton', d))).toBe(2.649e-15);
    const t = balancingThickness('proton', d), shell = excludedShell('proton', d - t, d + t);
    expect(figures(shell.inner)).toBe(1.586e-15); expect(figures(shell.outer)).toBe(1.924e-15);
    expect(+t.toPrecision(3)).toBe(1.69e-16); expect(shell.ratio).toBeCloseTo(1, 9);
    expect(+pairProductionWavelength('proton').toPrecision(3)).toBe(3.30e-16);
  });
  it('reproduces Fleming\'s first approximation and alternative shell for the electron', () => {
    const d = SHELL_PARTICLES.electron.diameter;
    expect(figures(massEnergyDensity('electron', d))).toBe(6.833e25);
    expect(figures(zeroPointDensity(d))).toBe(1.124e26);
    expect(figures(balancingOuterDiameter('electron', d))).toBe(3.066e-12);
    expect(figures(pairProductionWavelength('electron'))).toBe(6.066e-13);
    // With the diameters a pair-production wavelength apart, the balancing shell has a mean radius of about 1.6 pm.
    const mean = balancingDiameter('electron', pairProductionWavelength('electron'));
    expect(figures(mean / 2)).toBe(1.592e-12);
    expect(figures(mean - pairProductionWavelength('electron') / 2)).toBe(2.880e-12); expect(figures(mean + pairProductionWavelength('electron') / 2)).toBe(3.487e-12);
    // The symmetric shell about the Compton wavelength, by the same recipe that gives the proton's figures. The book
    // prints 2.123 and 2.472 pm for this case, which do not average to the Compton wavelength.
    const t = balancingThickness('electron', d), shell = excludedShell('electron', d - t, d + t);
    expect(shell.ratio).toBeCloseTo(1, 9); expect((shell.inner + shell.outer) / 2).toBeCloseTo(d, 24);
    expect(figures(shell.inner)).toBe(2.247e-12); expect(figures(shell.outer)).toBe(2.606e-12);
  });
  it('excludes more energy from a thicker or a smaller shell, and the fourth power of diameter sets the scale', () => {
    const d = SHELL_PARTICLES.electron.diameter;
    expect(zeroPointDensity(d / 2) / zeroPointDensity(d)).toBeCloseTo(16, 9);
    expect(massEnergyDensity('electron', d / 2) / massEnergyDensity('electron', d)).toBeCloseTo(8, 9);
    const thin = excludedShell('electron', d * .95, d * 1.05), thick = excludedShell('electron', d * .9, d * 1.1);
    expect(thick.excluded).toBeGreaterThan(thin.excluded); expect(thin.thickness).toBeCloseTo(d * .05, 24);
    expect(excludedShell('electron', d, Infinity).excluded).toBe(zeroPointDensity(d));
    // The balance is unique for a given diameter: below it the shell excludes too little, above it too much.
    const t = balancingThickness('electron', d);
    expect(excludedShell('electron', d - t * .9, d + t * .9).ratio).toBeLessThan(1); expect(excludedShell('electron', d - t * 1.1, d + t * 1.1).ratio).toBeGreaterThan(1);
    expect(balancingOuterDiameter('proton', SHELL_PARTICLES.proton.diameter / 2)).toBeGreaterThan(SHELL_PARTICLES.proton.diameter / 2);
  });
});
