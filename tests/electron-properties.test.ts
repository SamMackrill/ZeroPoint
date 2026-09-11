import { describe, expect, it } from 'vitest';
import { DEFAULT_ELECTRON, DEFAULT_SPIN_DISPLAY, ELECTRON_MODEL, LATTICE_SAMPLES, RADIUS, C, add, norm, scale } from '../src/electron/model';
import type { ElectronState } from '../src/electron/model';
import { displayedDipole } from '../src/electron/spinGeometry';
import { chargeMotion, effectiveShellScale, fluxAtRadius } from '../src/electron/propertyGeometry';

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
      const m = chargeMotion(d);
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
