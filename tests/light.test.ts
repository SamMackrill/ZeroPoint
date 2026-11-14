import { describe, expect, it } from 'vitest';
import { DEFAULT_LIGHT, DEFAULT_LIGHT_VIEW, ENERGY_EV, LIGHT_DT, LIGHT_END_TICK, LIGHT_MODEL, LightSimulation, TIME_SECONDS, absorption, fieldAt, hopTicks, lightReadout, pairAt, pairWavelength, parseLightFile, runEndTick, polarizationAxis, sourceX, validateLightParameters, validateLightState, waveAt } from '../src/light/model';

describe('illustrative light induction model', () => {
  it('uses half-wavelength events, alternating half-turns and symmetric lobes about fixed centres', () => {
    for (const direction of [1, -1] as const) for (const wavelength of [1, 1.7, 2, 4]) {
      const p = { ...DEFAULT_LIGHT, wavelength, direction }, interval = hopTicks(p);
      expect(interval * LIGHT_DT).toBeCloseTo(wavelength / 2, 12);
      for (let index = 0; index < 3; index++) {
        const start = pairAt(p, index * interval, index), middle = pairAt(p, (index + .5) * interval, index), end = pairAt(p, (index + 1) * interval, index);
        expect(middle.centre).toBe(start.centre); expect(end.centre).toBe(start.centre);
        expect(Math.abs(end.angle - start.angle)).toBeCloseTo(Math.PI);
        expect(Math.sign(end.angle - start.angle)).toBe((index % 2 ? -1 : 1) * direction);
        const left = middle.direction.map((v, j) => (j ? 0 : middle.centre) - v * middle.separation / 2);
        const right = middle.direction.map((v, j) => (j ? 0 : middle.centre) + v * middle.separation / 2);
        expect((left[0] + right[0]) / 2).toBeCloseTo(middle.centre, 12);
        expect((left[1] + right[1]) / 2).toBeCloseTo(0, 12); expect((left[2] + right[2]) / 2).toBeCloseTo(0, 12);
      }
    }
  });
  it('opens each pair to its wavelength, half the photon wavelength, across the path at midlife', () => {
    for (const wavelength of [1, 1.7, 2, 4]) {
      const p = { ...DEFAULT_LIGHT, wavelength }, interval = hopTicks(p);
      expect(pairWavelength(p)).toBe(wavelength / 2);
      for (let index = 0; index < 4; index++) {
        const start = pairAt(p, index * interval, index), middle = pairAt(p, (index + .5) * interval, index), end = pairAt(p, (index + 1) * interval, index);
        expect(start.separation).toBe(0); expect(end.separation).toBe(0); expect(middle.separation).toBeCloseTo(wavelength / 2, 12); expect(middle.peak).toBe(wavelength / 2);
        // Every pair is born along the path and ends reversed; at midlife it lies along the polarization axis.
        [1, 0, 0].forEach((v, j) => { expect(start.direction[j]).toBeCloseTo(v, 12); expect(end.direction[j]).toBeCloseTo(-v, 12); });
        const polarity = index % 2 ? -1 : 1;
        expect(middle.polarity).toBe(polarity); expect(middle.axial).toBeCloseTo(0, 12); expect(middle.transverse).toBeCloseTo(polarity, 12);
        polarizationAxis(p).forEach((v, j) => expect(middle.direction[j]).toBeCloseTo(polarity * v, 12));
        // The lobes never reach beyond the pair's own half-wavelength cell along the path.
        for (let tick = index * interval; tick <= (index + 1) * interval; tick++) { const pair = pairAt(p, tick, index); expect(Math.abs(pair.axial) * pair.separation / 2).toBeLessThanOrEqual(wavelength / 4 + 1e-12); }
      }
    }
  });
  it('takes the field from the active pair: one polarity per pair, zero at each hand-off, reversing for the next', () => {
    for (const direction of [1, -1] as const) {
      const p = { ...DEFAULT_LIGHT, wavelength: 2, direction }, interval = hopTicks(p);
      for (let index = 0; index < 5; index++) {
        const polarity = index % 2 ? -1 : 1;
        for (let tick = index * interval; tick < (index + 1) * interval; tick++) {
          const pair = pairAt(p, tick, index), field = waveAt(p, tick * LIGHT_DT, pair.centre);
          // At the pair's own centre the field is the transverse part of its moment: orientation times opening.
          expect(field.electric).toBeCloseTo(pair.transverse * pair.separation / pair.peak, 10);
          expect(field.magnetic).toBeCloseTo(direction * field.electric, 12);
          expect(Math.sign(field.electric) * polarity).toBeGreaterThanOrEqual(0);
        }
        expect(waveAt(p, index * interval * LIGHT_DT, pairAt(p, index * interval, index).centre).electric).toBeCloseTo(0, 12);
        expect(waveAt(p, (index + .5) * interval * LIGHT_DT, pairAt(p, 0, index).centre).electric).toBeCloseTo(polarity, 12);
      }
    }
  });
  it('lets the field fall with the inverse square of distance from the active pair, in every direction', () => {
    const p = { ...DEFAULT_LIGHT, wavelength: 2 }, centre = pairAt(p, 60, 0).centre, core = p.wavelength / 4;
    const at = (dx: number, dy: number, dz: number) => fieldAt(p, .5, [centre + dx, dy, dz]).electric;
    expect(at(0, 0, 0)).toBeCloseTo(1, 12); expect(at(core, 0, 0)).toBeCloseTo(.5, 12);
    expect(at(0, core, 0)).toBeCloseTo(at(core, 0, 0), 12); expect(at(0, 0, core)).toBeCloseTo(at(core, 0, 0), 12);
    // Far from the pair the product of field and squared distance levels off.
    expect(at(0, 8, 0) * 64).toBeCloseTo(at(0, 16, 0) * 256, 2);
    expect(fieldAt(p, .5, [centre, 3, 0]).envelope).toBeGreaterThan(0);
  });
  it('keeps the magnetic field on the rotation axis and E x B along the direction of travel', () => {
    const cross = (a: number[], b: number[]) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    for (const direction of [1, -1] as const) for (const polarization of [0, 35, 90]) {
      const p = { ...DEFAULT_LIGHT, direction, polarization }, interval = hopTicks(p), e = polarizationAxis(p), b = cross([1, 0, 0], e);
      for (let index = 0; index < 4; index++) {
        const early = pairAt(p, index * interval + 20, index), late = pairAt(p, index * interval + 40, index), field = waveAt(p, (index * interval + 30) * LIGHT_DT, early.centre);
        const axis = cross(early.direction, late.direction), magnetic = b.map(v => v * field.magnetic), electric = e.map(v => v * field.electric);
        // Right-hand grip: B points along the rotation axis.
        expect(axis[0] * magnetic[0] + axis[1] * magnetic[1] + axis[2] * magnetic[2]).toBeGreaterThan(0);
        expect(early.sense).toBe(Math.sign(axis[0] * b[0] + axis[1] * b[1] + axis[2] * b[2]));
        const poynting = cross(electric, magnetic);
        expect(Math.sign(poynting[0])).toBe(direction); expect(poynting[1]).toBeCloseTo(0, 12); expect(poynting[2]).toBeCloseTo(0, 12);
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
    expect(waveAt(p, .5, -5.5).electric).toBeCloseTo(1, 12); expect(waveAt(p, 1.5, -4.5).electric).toBeCloseTo(-1, 12);
    expect(waveAt({ ...p, direction: -1 }, .5, 5.5).magnetic).toBeCloseTo(-1, 12);
    expect(waveAt(p, 1, -5.5).envelope).toBe(0);
    expect(waveAt(p, 12, 6).electric).toBe(0); expect(waveAt(p, .5, 6.5).envelope).toBe(0);
  });
  it('opens model 1 and 2 files, which hold the same state without an absorber, and marks them as upgraded', () => {
    const m = new LightSimulation(); m.configure({ ...DEFAULT_LIGHT, wavelength: 3, phase: 45 }); m.step(200);
    const current = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: m.snapshot(), view: DEFAULT_LIGHT_VIEW }));
    for (const model of ['light-induction/1', 'light-induction/2']) {
      const { absorber: _none, ...parameters } = m.snapshot().parameters;
      const old = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: { ...m.snapshot(), model, parameters }, view: DEFAULT_LIGHT_VIEW }));
      expect(old.migrated).toBe(true); expect(old.state).toEqual(current.state); expect(old.state.model).toBe(LIGHT_MODEL); expect(old.state.parameters.absorber).toBe(false);
    }
    expect(current.migrated).toBe(false);
    // A current file must say whether there is a wall.
    const { absorber: _missing, ...incomplete } = m.snapshot().parameters;
    expect(() => parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: { ...m.snapshot(), parameters: incomplete }, view: DEFAULT_LIGHT_VIEW }))).toThrow('The absorber must be on or off.');
    expect(() => parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: { ...m.snapshot(), model: 'light-induction/0' }, view: DEFAULT_LIGHT_VIEW }))).toThrow();
  });
  it('has no physical dependence on render layers or playback state', () => {
    const model = new LightSimulation(); model.step(60); const before = model.snapshot();
    const saved = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: before, view: Object.fromEntries(Object.keys(DEFAULT_LIGHT_VIEW).map(k => [k, false])) }));
    expect(saved.state).toEqual(before); expect(saved.state.model).toBe(LIGHT_MODEL);
    model.configure({ ...DEFAULT_LIGHT, wavelength: 4 }); expect(model.state.tick).toBe(0);
    expect(lightReadout(model.state).energy).toBeCloseTo(lightReadout(before).energy / 2);
  });
});

// Fleming: a photon "is always absorbed all at once" (book ch. 19), and "the field energy gets absorbed along with the
// energy of the central quantum particle pair dipole" (Photons §6).
describe('absorption at a wall', () => {
  const wall = { ...DEFAULT_LIGHT, absorber: true };
  const at = (parameters: typeof wall, tick: number) => lightReadout({ model: LIGHT_MODEL, tick, parameters });
  it('has no wall, and so no absorption, unless asked for', () => {
    expect(absorption(DEFAULT_LIGHT)).toBeNull();
    expect(runEndTick(DEFAULT_LIGHT)).toBe(LIGHT_END_TICK);
    expect(at(DEFAULT_LIGHT, LIGHT_END_TICK)).toMatchObject({ absorbed: false, wall: null, absorbedEnergy: 0 });
  });
  it('stands the wall where the last whole pair in the window ends its half wavelength', () => {
    expect(absorption(wall)).toEqual({ tick: 1440, pair: 11, x: 6 });
    expect(absorption({ ...wall, direction: -1 })).toEqual({ tick: 1440, pair: 11, x: -6 });
    // 1.7 L pairs do not divide the window: 14 complete, and the wall stands a little short of the edge.
    const odd = { ...wall, wavelength: 1.7 }, end = absorption(odd)!;
    expect(end.pair).toBe(13); expect(end.tick).toBe(14 * hopTicks(odd)); expect(end.x).toBeCloseTo(-6 + 14 * 0.85, 12);
    expect(end.tick).toBeLessThan(LIGHT_END_TICK);
    // The pair start angle moves every hand-off, and the wall with them.
    const turned = { ...wall, phase: 90 }, shifted = absorption(turned)!;
    expect(shifted).toEqual({ tick: 1380, pair: 11, x: 5.5 });
    expect(pairAt(turned, shifted.tick - 1, shifted.pair).active).toBe(true);
  });
  it('absorbs the whole budget at one tick, the field with the central pair', () => {
    for (const p of [wall, { ...wall, wavelength: 1.7 }, { ...wall, wavelength: 3.3, phase: 45, direction: -1 as const }]) {
      const end = absorption(p)!, before = at(p, end.tick - 1), after = at(p, end.tick);
      expect(before).toMatchObject({ absorbed: false, absorbedEnergy: 0 });
      expect(before.pairEnergy).toBe(before.energy / 2); expect(before.fieldEnergy).toBe(before.energy / 2);
      expect(after).toMatchObject({ absorbed: true, pairEnergy: 0, fieldEnergy: 0, departedEnergy: 0 });
      expect(after.absorbedEnergy).toBe(after.energy);
      expect(after.x).toBeCloseTo(end.x, 12);
      // Nothing leaves by the window when the wall has taken it, and the budget balances at every tick.
      for (let tick = 0; tick <= LIGHT_END_TICK; tick += 7) { const d = at(p, tick); expect(d.pairEnergy + d.fieldEnergy + d.absorbedEnergy + d.departedEnergy).toBeCloseTo(d.energy, 12); }
      expect(at(p, LIGHT_END_TICK)).toMatchObject({ absorbed: true, departedEnergy: 0 });
      expect(at(p, LIGHT_END_TICK).x).toBeCloseTo(end.x, 12);
    }
  });
  it('leaves no field anywhere and no pair once the photon is absorbed', () => {
    const p = { ...wall, wavelength: 1.7 }, end = absorption(p)!, last = pairAt(p, end.tick - hopTicks(p) / 2, end.pair);
    expect(last.active).toBe(true);
    expect(fieldAt(p, (end.tick - hopTicks(p) / 2) * LIGHT_DT, [last.centre, 1, 0]).envelope).toBeGreaterThan(0);
    for (const tick of [end.tick, end.tick + 1, LIGHT_END_TICK - 1]) {
      expect(pairAt(p, tick, end.pair).active).toBe(false);
      expect(pairAt(p, tick, end.pair + 1).active).toBe(false);
      for (const x of [last.centre, 0, -5, end.x]) expect(fieldAt(p, tick * LIGHT_DT, [x, 0.5, 0]).envelope).toBe(0);
      expect(at(p, tick).index).toBe(end.pair);
    }
  });
  it('steps Next from the last induction to the absorption, then to the end of the timeline', () => {
    const p = { ...wall, wavelength: 1.7 }, end = absorption(p)!, m = new LightSimulation();
    m.configure(p); m.seek(end.tick - hopTicks(p) + 3);
    m.next(); expect(m.state.tick).toBe(end.tick);
    m.next(); expect(m.state.tick).toBe(LIGHT_END_TICK);
    m.next(); expect(m.state.tick).toBe(LIGHT_END_TICK);
  });
  it('opens files saved before the light-cone layer with the cone shown', () => {
    const { cone: _none, ...older } = DEFAULT_LIGHT_VIEW, m = new LightSimulation(); m.configure(wall);
    const saved = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: m.snapshot(), view: { ...older, pairs: false } }));
    expect(saved.view).toEqual({ ...DEFAULT_LIGHT_VIEW, pairs: false, cone: true });
    expect(() => parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: m.snapshot(), view: { ...DEFAULT_LIGHT_VIEW, cone: 'yes' } }))).toThrow('Invalid cone layer setting.');
  });
  it('keeps the wall in saved files and rejects a missing or malformed setting', () => {
    const m = new LightSimulation(); m.configure(wall); m.step(300);
    const saved = parseLightFile(JSON.stringify({ format: 'zeropoint-light', version: 1, state: m.snapshot(), view: DEFAULT_LIGHT_VIEW }));
    expect(saved.migrated).toBe(false); expect(saved.state.parameters.absorber).toBe(true);
    expect(() => validateLightParameters({ ...wall, absorber: 'yes' })).toThrow('The absorber must be on or off.');
  });
});
