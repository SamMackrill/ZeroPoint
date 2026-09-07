import { describe, expect, it } from 'vitest';
import { DEFAULT_LIGHT, DEFAULT_LIGHT_VIEW, ENERGY_EV, LIGHT_DT, LIGHT_END_TICK, LIGHT_MODEL, LightSimulation, TIME_SECONDS, hopTicks, lightReadout, pairAt, parseLightFile, sourceX, validateLightParameters, validateLightState, waveAt } from '../src/light/model';

describe('illustrative light induction model', () => {
  it('uses half-wavelength events, alternating half-turns and symmetric lobes about fixed centres', () => {
    for (const wavelength of [1, 1.7, 2, 4]) {
      const p = { ...DEFAULT_LIGHT, wavelength }, interval = hopTicks(p);
      expect(interval * LIGHT_DT).toBeCloseTo(wavelength / 2, 12);
      for (let index = 0; index < 3; index++) {
        const start = pairAt(p, index * interval, index), middle = pairAt(p, (index + .5) * interval, index), end = pairAt(p, (index + 1) * interval, index);
        expect(middle.centre).toBe(start.centre); expect(end.centre).toBe(start.centre);
        expect(start.separation).toBe(0); expect(end.separation).toBe(0); expect(middle.separation).toBeCloseTo(.42);
        expect(Math.abs(end.angle - start.angle)).toBeCloseTo(Math.PI);
        expect(Math.sign(end.angle - start.angle)).toBe(index % 2 ? -1 : 1);
        const left = middle.direction.map((v, j) => (j ? 0 : middle.centre) - v * middle.separation / 2);
        const right = middle.direction.map((v, j) => (j ? 0 : middle.centre) + v * middle.separation / 2);
        expect((left[0] + right[0]) / 2).toBe(middle.centre);
        expect((left[1] + right[1]) / 2).toBe(0); expect((left[2] + right[2]) / 2).toBe(0);
        const next = pairAt(p, (index + 1) * interval, index + 1);
        end.direction.forEach((v, j) => expect(next.direction[j]).toBeCloseTo(v, 12));
      }
    }
  });
  it('advances at c in either direction with exact event stepping and a bounded exit', () => {
    for (const direction of [-1, 1] as const) {
      const m = new LightSimulation(); m.configure({ ...DEFAULT_LIGHT, wavelength: 1.7, direction, offset: .8 });
      m.step(17); m.next(); expect(m.state.tick).toBe(102);
      const d = lightReadout(m.state);
      expect((d.x - sourceX(m.state.parameters)) / d.time).toBeCloseTo(direction);
      expect(d.time * 250e-9 / (d.time * TIME_SECONDS)).toBeCloseTo(299792458, 5);
      m.step(LIGHT_END_TICK); expect(m.state.tick).toBe(LIGHT_END_TICK); m.next(); expect(m.state.tick).toBe(LIGHT_END_TICK);
      expect(lightReadout(m.state).finished).toBe(true);
    }
  });
  it('transfers a single energy budget without multiplying energy by handoff count', () => {
    const m = new LightSimulation();
    for (let tick = 0; tick <= LIGHT_END_TICK; tick++) {
      m.seek(tick); const d = lightReadout(m.state);
      expect(d.energy).toBe(ENERGY_EV / DEFAULT_LIGHT.wavelength);
      expect(d.pairEnergy + d.fieldEnergy + d.departedEnergy).toBeCloseTo(d.energy, 12);
      if (tick < LIGHT_END_TICK) expect(d.pairEnergy).toBe(d.fieldEnergy);
      else { expect(d.pairEnergy).toBe(0); expect(d.departedEnergy).toBe(d.energy); }
    }
  });
  it('replays saved states and checkpoints identically, independently of step batches', () => {
    const a = new LightSimulation(); a.configure({ ...DEFAULT_LIGHT, wavelength: 2.3, polarization: 65, phase: 90, direction: -1 }); a.step(137);
    const file = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: a.snapshot(), view: DEFAULT_LIGHT_VIEW }));
    const b = new LightSimulation(); b.restore(file.state);
    a.step(400); for (let i = 0; i < 400; i++) b.step();
    expect(b.snapshot()).toEqual(a.snapshot()); expect(lightReadout(b.state)).toEqual(lightReadout(a.state));
    const checkpoint = a.snapshot(); a.seek(0); expect(checkpoint.tick).toBe(537);
  });
  it('rejects incompatible, nonfinite and out-of-range state without mutating the sequence', () => {
    const m = new LightSimulation(); m.step(123); const before = m.snapshot();
    for (const bad of [NaN, Infinity, -1, 1441, 1.5]) expect(() => m.seek(bad)).toThrow();
    for (const wavelength of [0, .9, 4.1, 1.01, NaN]) expect(() => m.configure({ ...DEFAULT_LIGHT, wavelength })).toThrow();
    expect(() => validateLightParameters({ ...DEFAULT_LIGHT, direction: 0 })).toThrow();
    expect(() => validateLightState({ ...before, model: 'medium-lifecycle/2' })).toThrow();
    expect(() => parseLightFile('{}')).toThrow();
    expect(() => parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: before, view: { ...DEFAULT_LIGHT_VIEW, fields: 1 } }))).toThrow();
    expect(m.snapshot()).toEqual(before);
  });
  it('rotates the pair plane with polarization and reverses the magnetic projection with travel direction', () => {
    const a = pairAt(DEFAULT_LIGHT, 60, 0), b = pairAt({ ...DEFAULT_LIGHT, polarization: 90 }, 60, 0);
    expect(b.direction[0]).toBeCloseTo(a.direction[0]); expect(b.direction[2]).toBeCloseTo(a.direction[1]); expect(b.direction[1]).toBeCloseTo(0);
    const p = { ...DEFAULT_LIGHT, phase: 0 };
    expect(waveAt(p, 6, 0).electric).toBe(1);
    expect(waveAt({ ...p, direction: -1 }, 6, 0).magnetic).toBe(-1);
    expect(waveAt(p, 3, 3).envelope).toBe(0);
    expect(waveAt(p, 12, 6).electric).toBe(0);
  });
  it('has no physical dependence on render layers or playback state', () => {
    const model = new LightSimulation(); model.step(60); const before = model.snapshot();
    const saved = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: before, view: Object.fromEntries(Object.keys(DEFAULT_LIGHT_VIEW).map(k => [k, false])) }));
    expect(saved.state).toEqual(before); expect(saved.state.model).toBe(LIGHT_MODEL);
    model.configure({ ...DEFAULT_LIGHT, wavelength: 4 }); expect(model.state.tick).toBe(0);
    expect(lightReadout(model.state).energy).toBeCloseTo(lightReadout(before).energy / 2);
  });
});
