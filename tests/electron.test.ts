import { describe, expect, it } from 'vitest';
import { CORE_MASK, DEFAULT_ELECTRON, DEFAULT_ELECTRON_VIEW, ELECTRON_MODEL, GRID_SIDE, GRID_SPACING, LATTICE_SAMPLES, SAMPLES_PER_SHELL, ElectronSimulation, add, alignmentProgress, electronPresence, dipoleAt, dot, electronX, enclosedCharge, norm, parseElectronFile, referenceFields, sampleCentre, scale, spinRateAtRadius, unit } from '../src/electron/model';
import type { ElectronMode, ElectronState, Vec } from '../src/electron/model';
import { faradayLines, polarizationGrid, samplePolarization, tracePolarization } from '../src/electron/fieldLines';
const state = (mode: ElectronMode = 'electric', tick = 360): ElectronState => ({ model: ELECTRON_MODEL, tick, parameters: { ...DEFAULT_ELECTRON, mode } });

describe('electron polarization experiment', () => {
  it('starts unpolarized in a cube, introduces the electron, then resolves a 3D field', () => {
    const initial = state('electric', 0), middle = state('electric', 60), end = state('electric', 360);
    expect(DEFAULT_ELECTRON_VIEW.inspect).toBe(false); expect(DEFAULT_ELECTRON_VIEW.cutaway).toBe(false);
    expect(electronPresence(initial)).toBe(0); expect(electronPresence(middle)).toBe(1);
    expect(alignmentProgress(initial)).toBe(0);
    expect(alignmentProgress(middle, .8)).toBeGreaterThan(alignmentProgress(middle, 4.8));
    for (const radius of [0, 1, 4, 8.4]) expect(alignmentProgress(end, radius)).toBe(1);
    const points = Array.from({ length: LATTICE_SAMPLES }, (_, i) => sampleCentre(i));
    for (let axis = 0; axis < 3; axis++) {
      expect(new Set(points.map(p => p[axis])).size).toBe(GRID_SIDE);
      expect(Math.max(...points.map(p => p[axis])) - Math.min(...points.map(p => p[axis]))).toBeCloseTo((GRID_SIDE - 1) * GRID_SPACING);
    }
    const mean = points.reduce((sum, _p, i) => add(sum, dipoleAt(initial, i).direction), [0, 0, 0] as Vec);
    expect(norm(mean) / LATTICE_SAMPLES).toBeLessThan(.025);
    expect(faradayLines(initial, false)).toEqual([]);
    const lines = faradayLines(end, false);
    expect(lines).toHaveLength(40);
    expect(lines.filter(line => Math.abs(line[0][2]) > .1).length).toBeGreaterThan(20);
  });
  it('uses a capped inverse-square display rate with opposite charge-layer tangents', () => {
    expect(spinRateAtRadius(1) / spinRateAtRadius(2)).toBeCloseTo(4);
    expect(spinRateAtRadius(.6) / spinRateAtRadius(2.8)).toBeCloseTo(21.7777777778);
    expect(Number.isFinite(spinRateAtRadius(0))).toBe(true);
    for (const spin of [-1, 1] as const) for (let band = 0; band < 4; band++) {
      const i = LATTICE_SAMPLES + band * SAMPLES_PER_SHELL + 34, s = { ...state('spin', 120), parameters: { ...DEFAULT_ELECTRON, mode: 'spin' as const, spin } }, d = dipoleAt(s, i);
      expect(Math.abs(d.spinRate)).toBeCloseTo(spinRateAtRadius(d.field.radius));
      expect(Math.abs(d.spinTurn)).toBeLessThanOrEqual(Math.PI / 2);
      expect(norm(d.positive)).toBeLessThan(norm(d.negative));
      d.spinPositiveVelocity.forEach((v, j) => expect(v).toBeCloseTo(-d.spinNegativeVelocity[j], 12));
      // Relative charge velocities have opposite angular senses around the bare electron.
      const circulation = (r: Vec, v: Vec) => r[0] * v[1] - r[1] * v[0];
      expect(Math.sign(circulation(d.positive, d.spinPositiveVelocity))).toBe(-spin);
      expect(Math.sign(circulation(d.negative, d.spinNegativeVelocity))).toBe(spin);
      const later = dipoleAt({ ...s, tick: 121 }, i);
      expect(later.centre).toEqual(d.centre);
      const angle = Math.acos(Math.min(1, dot(later.direction, d.direction)));
      expect(angle * 120).toBeCloseTo(Math.abs(d.spinRate), 8);
    }
  });
  it('migrates version-one saved experiments explicitly and rejects malformed new layers', () => {
    const { shells: _shells, ...oldView } = DEFAULT_ELECTRON_VIEW;
    const legacy = { format: 'zeropoint-electron', version: 1, state: { ...state('spin'), model: 'electron-polarization/1' }, view: oldView };
    const migrated = parseElectronFile(JSON.stringify(legacy));
    expect(migrated.migrated).toBe(true); expect(migrated.state.model).toBe(ELECTRON_MODEL); expect(migrated.state.tick).toBe(360); expect(migrated.view.shells).toBe(true);
    const { inspect: _inspect, ...v2View } = DEFAULT_ELECTRON_VIEW;
    const v2 = parseElectronFile(JSON.stringify({ ...legacy, version: 2, state: { ...state('electric'), model: 'electron-polarization/2' }, view: v2View }));
    expect(v2.migrated).toBe(true); expect(v2.view.inspect).toBe(false);
    expect(() => parseElectronFile(JSON.stringify({ ...legacy, version: 2 }))).toThrow();
    expect(() => parseElectronFile(JSON.stringify({ ...legacy, version: 2, state: state('spin'), view: { ...DEFAULT_ELECTRON_VIEW, shells: 'yes' } }))).toThrow();
  });
  it('keeps pair midpoints fixed through local rotation, replacement and electron motion', () => {
    for (const mode of ['electric', 'spin', 'moving'] as const) for (const tick of [0, 120, 360, 1200, 2880, 5760]) for (const index of [420, 636, 712]) {
      const d = dipoleAt(state(mode, tick), index);
      add(d.positive, d.negative).forEach((v, i) => expect(v / 2).toBeCloseTo(sampleCentre(index)[i], 12));
      expect(d.separation).toBeGreaterThanOrEqual(0); expect(d.separation).toBeLessThanOrEqual(.22);
      if (mode === 'electric') expect(electronX(state(mode, tick))).toBeCloseTo(0);
    }
    expect(dipoleAt(state('spin', 1200), 636).generation).toBeGreaterThan(dipoleAt(state('spin', 0), 636).generation);
    expect(dipoleAt(state('spin', 0), 636).direction).not.toEqual(dipoleAt(state('spin', 120), 636).direction);
  });
  it('aligns positive ends toward the electron and preserves inverse-square flux', () => {
    const s = state();
    for (let i = 0; i < LATTICE_SAMPLES; i++) {
      const d = dipoleAt(s, i); if (!d.field.valid) continue;
      expect(dot(d.direction, unit(scale(d.centre, -1)))).toBeCloseTo(1, 12);
      expect(norm(d.positive)).toBeLessThanOrEqual(norm(d.negative));
    }
    expect(referenceFields(s, [0, 2, 0]).electric[1]).toBeCloseTo(referenceFields(s, [0, 1, 0]).electric[1] / 4);
    for (const mode of ['electric', 'moving'] as const) for (const r of [.4, 1, 3]) expect(enclosedCharge(state(mode), r)).toBeCloseTo(-1, 5);
    expect(referenceFields(s, [0, 0, 0]).valid).toBe(false);
  });
  it('separates spin magnetism from the signed velocity response', () => {
    const a = state('moving', 2880), b = { ...a, parameters: { ...a.parameters, beta: -.15 } };
    const f = referenceFields(a, [0, 2, 0]), reverse = referenceFields(b, [0, 2, 0]);
    expect(f.motion[2]).toBeLessThan(0); expect(reverse.electric).toEqual(f.electric);
    reverse.motion.forEach((v, i) => expect(v).toBeCloseTo(-f.motion[i]));
    const spin = state('spin'), opposite = { ...spin, parameters: { ...spin.parameters, spin: -1 as const } };
    expect(norm(referenceFields(spin, [0, 2, 0]).motion)).toBe(0);
    expect(norm(referenceFields(spin, [0, 2, 0]).intrinsic)).toBeGreaterThan(0);
    expect(dipoleAt(opposite, 636).spinTurn).toBe(-dipoleAt(spin, 636).spinTurn);
    referenceFields(opposite, [0, 2, 0]).intrinsic.forEach((v, i) => expect(v).toBeCloseTo(-referenceFields(spin, [0, 2, 0]).intrinsic[i]));
    expect(norm(referenceFields({ ...a, parameters: { ...a.parameters, beta: 0 } }, [0, 2, 0]).motion)).toBe(0);
  });
  it('traces Faraday lines from sampled dipoles, with bounded paths outside the mask', () => {
    const aligned = state(), grid = polarizationGrid(aligned), index = 636;
    samplePolarization(grid, sampleCentre(index)).forEach((v, i) => expect(v).toBeCloseTo(grid[index][i], 12));
    expect(dot(unit(samplePolarization(grid, [0, 1.6, 0])), [0, -1, 0])).toBeCloseTo(1);
    const lines = faradayLines(aligned, true);
    expect(lines).toHaveLength(20);
    for (const line of lines) {
      expect(line.length).toBeGreaterThan(10); expect(line.length).toBeLessThanOrEqual(161);
      for (const p of line) { expect(norm(p)).toBeGreaterThanOrEqual(CORE_MASK); expect(p.every(Number.isFinite)).toBe(true); }
    }
    expect(faradayLines(state('electric', 0), true)).not.toEqual(lines);
    // A synthetic constant polarization produces its own streamline, independent of analytic E.
    const constant: Vec[] = grid.map(() => [0, 1, 0]);
    const path = tracePolarization(constant, [2, 1, 0], [0, 0, 0], 10);
    expect(path.at(-1)![0]).toBe(2); expect(path.at(-1)![1]).toBeCloseTo(.45);
    expect(samplePolarization(grid, [6, 0, 0])).toEqual([0, 0, 0]);
  });
  it('replays exact states and rejects invalid imports without changing the run', () => {
    const a = new ElectronSimulation(), b = new ElectronSimulation(); a.configure(state('moving').parameters); a.step(137);
    const file = parseElectronFile(JSON.stringify({ format: 'zeropoint-electron', version: 3, state: a.snapshot(), view: { ...DEFAULT_ELECTRON_VIEW, faraday: false } }));
    b.restore(file.state); a.step(400); for (let i = 0; i < 400; i++) b.step(); expect(a.snapshot()).toEqual(b.snapshot());
    expect(file.view.faraday).toBe(false); const before = a.snapshot();
    for (const beta of [NaN, Infinity, -.3, .3]) expect(() => a.configure({ ...DEFAULT_ELECTRON, beta })).toThrow();
    for (const tick of [-1, 5761, 1.5, NaN]) expect(() => a.seek(tick)).toThrow();
    expect(() => parseElectronFile('{}')).toThrow(); expect(a.snapshot()).toEqual(before);
    a.seek(5760); a.step(); expect(a.state.tick).toBe(5760);
  });
});
