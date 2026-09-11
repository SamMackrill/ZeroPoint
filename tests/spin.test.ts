import { describe, expect, it } from 'vitest';
import { add, cross, DEFAULT_ELECTRON, DEFAULT_ELECTRON_VIEW, DEFAULT_SPIN_DISPLAY, dot, ELECTRON_DT, ELECTRON_MODEL, LATTICE_SAMPLES, norm, parseElectronFile, scale, SHELL_RADII, SAMPLES_PER_SHELL, unit } from '../src/electron/model';
import type { ElectronState } from '../src/electron/model';
import { displayedDipole, localTurnArrow, sectionFrame, sectionIndices, shellCentre } from '../src/electron/spinGeometry';

const state: ElectronState = { model: ELECTRON_MODEL, tick: 120, parameters: { ...DEFAULT_ELECTRON, mode: 'spin' } };
describe('linked spin shell geometry', () => {
  it('reverses adjacent complete bands only when requested, and reverses all bands with projection', () => {
    for (let band = 0; band < 4; band++) {
      const index = LATTICE_SAMPLES + band * SAMPLES_PER_SHELL + 34;
      const d = displayedDipole(state, index, DEFAULT_SPIN_DISPLAY);
      expect(Math.sign(d.spinRate)).toBe(band % 2 ? -1 : 1);
      const shared = displayedDipole(state, index, { ...DEFAULT_SPIN_DISPLAY, alternating: false });
      expect(shared.spinRate).toBeGreaterThan(0);
      const reversed = displayedDipole({ ...state, parameters: { ...state.parameters, spin: -1 } }, index, DEFAULT_SPIN_DISPLAY);
      expect(reversed.spinRate).toBe(-d.spinRate);
      expect(reversed.centre).toEqual(d.centre);
    }
  });
  it('keeps pair centres fixed during turning, collapse and replacement for every preferred axis', () => {
    for (const axis of ['x', 'y', 'z'] as const) for (const tick of [0, 120, 420, 3000, 5760]) for (const index of sectionIndices(4)) {
      const s = { ...state, tick, parameters: { ...state.parameters, axis } }, d = displayedDipole(s, index, DEFAULT_SPIN_DISPLAY);
      const centre = shellCentre(index, axis);
      add(d.positive, d.negative).forEach((v, i) => expect(v / 2).toBeCloseTo(centre[i], 12));
      expect(norm(d.positive)).toBeLessThanOrEqual(norm(d.negative));
      expect(dot(d.direction, unit(scale(centre, -1)))).toBeGreaterThan(0);
      expect(Math.abs(d.spinTurn)).toBeLessThanOrEqual(1.35);
      d.spinPositiveVelocity.forEach((v, i) => expect(v).toBeCloseTo(-d.spinNegativeVelocity[i], 12));
    }
  });
  it('takes the exact equator of each oriented 3D shell with a right-handed viewing frame', () => {
    for (const axis of ['x', 'y', 'z'] as const) {
      const [u, v, n] = sectionFrame(axis);
      expect(cross(u, v)).toEqual(n);
      for (const index of sectionIndices(4)) {
        const d = displayedDipole({ ...state, parameters: { ...state.parameters, axis } }, index, DEFAULT_SPIN_DISPLAY);
        for (const p of [d.centre, d.positive, d.negative, ...localTurnArrow(d)]) {
          expect(dot(p, n)).toBeCloseTo(0, 12);
          expect(Math.hypot(dot(p, u), dot(p, v))).toBeCloseTo(norm(p), 12);
        }
      }
    }
    // Away from the equator, local axes vary across the sphere.
    const a = displayedDipole(state, LATTICE_SAMPLES, DEFAULT_SPIN_DISPLAY);
    const b = displayedDipole(state, LATTICE_SAMPLES + 4, DEFAULT_SPIN_DISPLAY);
    expect(a.localAxis).not.toEqual(b.localAxis);
  });
  it('aligns progressively at the reported local rate, with a stronger near response and capped gain', () => {
    let previous = Infinity;
    for (const [band] of SHELL_RADII.entries()) {
      const index = LATTICE_SAMPLES + band * SAMPLES_PER_SHELL + 34;
      const a = displayedDipole(state, index, DEFAULT_SPIN_DISPLAY);
      const b = displayedDipole({ ...state, tick: state.tick + 1 }, index, DEFAULT_SPIN_DISPLAY);
      expect(b.generation).toBe(a.generation);
      expect(Math.acos(Math.min(1, dot(a.direction, b.direction))) / ELECTRON_DT).toBeCloseTo(Math.abs(a.spinRate), 7);
      expect(dot(b.direction, unit(scale(b.centre, -1)))).toBeGreaterThan(dot(a.direction, unit(scale(a.centre, -1))));
      expect(Math.abs(a.spinRate)).toBeLessThan(previous); previous = Math.abs(a.spinRate);
      const enlarged = displayedDipole(state, index, { ...DEFAULT_SPIN_DISPLAY, gain: 4 });
      expect(Math.abs(enlarged.spinRate)).toBeGreaterThanOrEqual(Math.abs(a.spinRate));
      expect(enlarged.centre).toEqual(a.centre);
    }
  });
  it('round-trips display controls, defaults old saves and rejects unsafe counts and gains', () => {
    const view = { ...DEFAULT_ELECTRON_VIEW, spinDisplay: { count: 4, gain: 4, alternating: false, guides: false, section: false } };
    const file = { format: 'zeropoint-electron', version: 3, state, view };
    expect(parseElectronFile(JSON.stringify(file)).view).toEqual(view);
    const { spinDisplay: _display, ...oldView } = view;
    expect(parseElectronFile(JSON.stringify({ ...file, view: oldView })).view.spinDisplay).toEqual(DEFAULT_SPIN_DISPLAY);
    for (const patch of [{ count: 0 }, { count: 5 }, { count: 1.5 }, { gain: 0 }, { gain: 99 }, { alternating: 'true' }]) {
      expect(() => parseElectronFile(JSON.stringify({ ...file, view: { ...view, spinDisplay: { ...view.spinDisplay, ...patch } } }))).toThrow('Invalid spin display');
    }
  });
});
