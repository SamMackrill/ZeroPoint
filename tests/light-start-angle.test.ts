import { describe, expect, it } from 'vitest';
import { inductionEvents } from '../src/experiments/light/definition';
import { DEFAULT_LIGHT, LIGHT_DT, LIGHT_END_TICK, LIGHT_MODEL, LightSimulation, hopTicks, isHandoff, lightReadout, pairAt, pairCount, pairIndexAt, pairStartTick, polarizationAxis, runStart, waveAt, type LightParameters } from '../src/light/model';

const ANGLES = [0, 15, 45, 90, 135, 180, 225, 270, 345, 360];
const cross = (a: readonly number[], b: readonly number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: readonly number[], b: readonly number[]) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

describe('light pair start angle', () => {
  it('only chooses where in the cycle the run begins: the first pair has already turned through it', () => {
    for (const wavelength of [1, 1.7, 2, 4]) for (const phase of ANGLES) {
      const p = { ...DEFAULT_LIGHT, wavelength, phase }, duration = hopTicks(p), { elapsed, flips } = runStart(p), first = pairAt(p, 0, 0);
      expect(elapsed).toBeGreaterThanOrEqual(0); expect(elapsed).toBeLessThan(duration);
      // Whole pairs skipped plus the share of the first pair behind it make up the angle, to the nearest tick.
      expect((flips + elapsed / duration) * 180).toBeCloseTo(phase, -Math.log10(180 / duration) - .31);
      expect(first.active).toBe(true); expect(first.progress).toBeCloseTo(elapsed / duration, 12);
      expect(first.polarity).toBe(flips % 2 ? -1 : 1);
      expect(lightReadout({ model: LIGHT_MODEL, tick: 0, parameters: p }).index).toBe(0);
    }
    const quarter = pairAt({ ...DEFAULT_LIGHT, phase: 90 }, 0, 0), half = pairAt({ ...DEFAULT_LIGHT, phase: 180 }, 0, 0), full = pairAt({ ...DEFAULT_LIGHT, phase: 360 }, 0, 0);
    // At 90° the first pair is across the path and fully open at tick 0.
    expect(quarter.axial).toBeCloseTo(0, 12); expect(quarter.transverse).toBeCloseTo(1, 12); expect(quarter.separation).toBeCloseTo(quarter.peak, 12);
    // At 180° the run begins with the next pair: just induced, opposite polarity. 360° is where 0° began.
    expect(half.progress).toBe(0); expect(half.polarity).toBe(-1); expect(full).toEqual(pairAt(DEFAULT_LIGHT, 0, 0));
  });
  it('gives every pair the same half-turn from along the path to reversed, at every start angle', () => {
    for (const direction of [1, -1] as const) for (const phase of ANGLES) {
      const p = { ...DEFAULT_LIGHT, direction, phase }, duration = hopTicks(p);
      for (let index = 1; index < 5; index++) {
        const born = pairStartTick(p, index), start = pairAt(p, born, index), middle = pairAt(p, born + duration / 2, index), end = pairAt(p, born + duration, index);
        [direction, 0, 0].forEach((v, j) => { expect(start.direction[j]).toBeCloseTo(v, 12); expect(end.direction[j]).toBeCloseTo(-v, 12); });
        expect(start.separation).toBe(0); expect(end.separation).toBe(0); expect(middle.separation).toBeCloseTo(p.wavelength / 2, 12);
        polarizationAxis(p).forEach((v, j) => expect(middle.direction[j]).toBeCloseTo(middle.polarity * v, 12));
        expect(middle.polarity).toBe(-pairAt(p, 0, index - 1).polarity);
        expect(middle.centre).toBe(start.centre);
        // Each fixed centre is the middle of the stretch the energy covers during that pair's life.
        expect(lightReadout({ model: LIGHT_MODEL, tick: born + duration / 2, parameters: p }).x).toBeCloseTo(middle.centre, 12);
      }
    }
  });
  it('keeps one field polarity per pair, B on the rotation axis and E x B along travel, at every start angle', () => {
    for (const direction of [1, -1] as const) for (const polarization of [0, 35, 90]) for (const phase of ANGLES) {
      const p: LightParameters = { ...DEFAULT_LIGHT, direction, polarization, phase }, e = polarizationAxis(p), b = cross([1, 0, 0], e);
      let nonzero = 0;
      for (let tick = 0; tick < 720; tick += 7) {
        const index = pairIndexAt(p, tick), pair = pairAt(p, tick, index), later = pairAt(p, tick + 1, index), field = waveAt(p, tick * LIGHT_DT, pair.centre);
        // Inside the window the field at the pair's own centre is the transverse part of its moment.
        if (direction * (pair.centre - (p.offset - direction * 6)) < 0) continue;
        expect(field.electric).toBeCloseTo(pair.transverse * pair.separation / pair.peak, 10);
        expect(Math.sign(field.electric) * pair.polarity).toBeGreaterThanOrEqual(0);
        if (Math.abs(field.electric) < 1e-6 || later.progress <= pair.progress) continue;
        nonzero++;
        const axis = cross(pair.direction, later.direction), magnetic = b.map(v => v * field.magnetic), electric = e.map(v => v * field.electric);
        expect(dot(axis, magnetic)).toBeGreaterThan(0); // right-hand grip
        expect(pair.sense).toBe(Math.sign(dot(axis, b)));
        const poynting = cross(electric, magnetic);
        expect(Math.sign(poynting[0])).toBe(direction); expect(poynting[1]).toBeCloseTo(0, 12); expect(poynting[2]).toBeCloseTo(0, 12);
      }
      expect(nonzero).toBeGreaterThan(60);
    }
  });
  it('extinguishes the field at every hand-off, wherever the start angle puts them', () => {
    for (const phase of ANGLES) {
      const p = { ...DEFAULT_LIGHT, wavelength: 1.7, phase }, events = inductionEvents(p);
      expect(events.length).toBe(pairCount(p) - 1);
      events.forEach((event, i) => {
        expect(event.tick).toBe(pairStartTick(p, i + 1)); expect(event.tick).toBeGreaterThan(0); expect(event.tick).toBeLessThan(LIGHT_END_TICK);
        expect(isHandoff(p, event.tick)).toBe(true); expect(isHandoff(p, event.tick + 1)).toBe(false);
        expect(pairIndexAt(p, event.tick)).toBe(i + 1); expect(pairIndexAt(p, event.tick - 1)).toBe(i);
        for (const x of [-5, 0, 5]) expect(waveAt(p, event.tick * LIGHT_DT, x).envelope).toBeCloseTo(0, 12);
      });
      expect(isHandoff(p, 0)).toBe(false);
    }
  });
  it('steps to the next induction from any tick', () => {
    for (const phase of [0, 45, 270]) {
      const m = new LightSimulation(); m.configure({ ...DEFAULT_LIGHT, wavelength: 1.7, phase });
      const p = m.state.parameters, ticks = inductionEvents(p).map(event => event.tick);
      m.next(); expect(m.state.tick).toBe(ticks[0]);
      m.step(17); m.next(); expect(m.state.tick).toBe(ticks[1]);
      m.seek(ticks[ticks.length - 1]); m.next(); expect(m.state.tick).toBe(LIGHT_END_TICK);
    }
  });
});
