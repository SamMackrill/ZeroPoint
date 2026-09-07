import { describe, expect, it } from 'vitest';
import { Medium } from '../src/model/Medium';
import { CAPACITY, DEFAULT_PARAMETERS, DEFAULT_VIEW, DT, MODEL_VERSION, SNAPSHOT_STRIDE, STATE_STRIDE } from '../src/model/types';
import { lifecycleEnvelope, lobeScale } from '../src/model/pairMotion';
import { parseExperiment, validateCheckpoint } from '../src/persistence/experiment';
describe('reference lifecycle model', () => {
  it('replays the same seed, including zero, independently of stepping batches', () => {
    for (const seed of [0, 2026]) {
      const a = new Medium(seed), b = new Medium(seed); a.step(480); for (let i = 0; i < 48; i++) b.step(10);
      expect(a.serialize()).toEqual(b.serialize());
    }
    expect(new Medium(1).serialize().particles).not.toEqual(new Medium(2).serialize().particles);
  });
  it('preserves combined energy while births and deaths actually occur', () => {
    const model = new Medium(); const initial = model.diagnostics(); model.step(1200); const d = model.diagnostics();
    expect(d.births).toBeGreaterThan(initial.births + 10000); expect(d.deaths).toBeGreaterThan(10000);
    expect(Math.abs(d.residual)).toBeLessThan(1e-7); expect(d.births - d.deaths).toBe(d.active);
    expect(d.active).toBeLessThan(CAPACITY); expect(d.reservoir).toBeGreaterThan(0);
  });
  it('stops all births at zero rate and returns the existing population energy', () => {
    const model = new Medium(); const births = model.births;
    model.updateParameters({ ...DEFAULT_PARAMETERS, birthRate: 0 }); model.step(1000);
    expect(model.births).toBe(births); expect(model.diagnostics().active).toBe(0); expect(model.diagnostics().fieldEnergy).toBe(0);
    expect(model.reservoir).toBeCloseTo(CAPACITY * 5, 7);
  });
  it('handles more than one birth per tick and reports capacity losses', () => {
    const model = new Medium(7, { birthRate: 10000, frequency: .25, separation: 0 });
    const births = model.births; model.step(); expect(model.births - births).toBeGreaterThan(1);
    model.step(1000); expect(model.rejected).toBeGreaterThan(0); expect(Math.abs(model.diagnostics().residual)).toBeLessThan(1e-7);
    expect(() => validateCheckpoint(model.serialize())).not.toThrow();
  });
  it('assigns E times lifetime = 1/2 and keeps normalized positions finite', () => {
    const model = new Medium(); model.step(30); const data = new Float32Array(CAPACITY * SNAPSHOT_STRIDE); const count = model.snapshot(data);
    expect(count).toBe(model.diagnostics().active);
    for (let i = 0; i < count; i++) { const n = i * SNAPSHOT_STRIDE; expect(data[n + 7] / 2 * data[n + 9]).toBeCloseTo(.5, 6); for (let j = 0; j < 3; j++) expect(Math.abs(data[n + j])).toBeLessThanOrEqual(4); }
  });
  it('serializes and resumes exactly across parameter changes and a zero-rate interval', () => {
    const a = new Medium(); a.step(140); a.updateParameters({ birthRate: 0, frequency: 2, separation: .2 }); a.step(30);
    const text = JSON.stringify({ format: 'zeropoint-experiment', version: 1, checkpoint: a.serialize(), view: DEFAULT_VIEW });
    const file = parseExperiment(text), b = Medium.restore(file.checkpoint);
    for (const m of [a, b]) { m.updateParameters({ birthRate: 3500, frequency: .5, separation: .08 }); m.step(500); }
    expect(a.serialize()).toEqual(b.serialize()); expect(a.tick * DT).toBeCloseTo(670 / 120);
  });
  it('does not mutate physics by generating or omitting rendering snapshots', () => {
    const a = new Medium(), b = new Medium(); const target = new Float32Array(CAPACITY * SNAPSHOT_STRIDE);
    for (let i = 0; i < 100; i++) { a.snapshot(target); a.step(); } b.step(100);
    expect(a.serialize()).toEqual(b.serialize());
  });
});
describe('untrusted experiment files', () => {
  it('upgrades version 1 files without reviving pair translation or changing lifecycle state', () => {
    const original = new Medium(); original.step(90); const c = original.serialize();
    const legacy = { ...c, model: 'medium-lifecycle/1', parameters: { birthRate: c.parameters.birthRate, frequency: c.parameters.frequency, jitter: .4 }, initialParameters: { birthRate: c.initialParameters.birthRate, frequency: c.initialParameters.frequency, jitter: .12 } };
    const file = parseExperiment(JSON.stringify({ format: 'zeropoint-experiment', version: 1, checkpoint: legacy, view: DEFAULT_VIEW }));
    expect(file.checkpoint.model).toBe(MODEL_VERSION); expect(file.checkpoint.parameters).toEqual(DEFAULT_PARAMETERS);
    expect(file.checkpoint.particles).toEqual(c.particles); expect(file.checkpoint.rng).toBe(c.rng);
    expect(file.checkpoint.events.at(-1)?.text).toContain('fixed-centre');
    const restored = Medium.restore(file.checkpoint); original.step(30); restored.step(30);
    expect(restored.diagnostics()).toEqual(original.diagnostics()); expect(restored.particles).toEqual(original.particles);
    expect(() => validateCheckpoint({ ...legacy, parameters: { ...legacy.parameters, jitter: -1 } })).toThrow('legacy');
  });
  it('rejects unsupported versions, malformed state and a tampered energy ledger', () => {
    expect(() => parseExperiment('{')).toThrow('valid JSON');
    expect(() => parseExperiment('{"format":"zeropoint-experiment","version":20}')).toThrow('Unsupported');
    const c = new Medium().serialize(); c.reservoir += 10; expect(() => validateCheckpoint(c)).toThrow('ledger');
    c.reservoir -= 10; c.free[1] = c.free[0]; expect(() => validateCheckpoint(c)).toThrow('free-slot');
  });
  it('rejects invalid parameter ranges, seeds, particles and birth schedules', () => {
    expect(() => new Medium(-1)).toThrow('Seed'); expect(() => new Medium(1, { ...DEFAULT_PARAMETERS, birthRate: Infinity })).toThrow('birthRate');
    const c = new Medium().serialize(); c.particles[0] = NaN; expect(() => validateCheckpoint(c)).toThrow('particle state');
    const b = new Medium().serialize(); b.nextBirth = -2; expect(() => validateCheckpoint(b)).toThrow('schedule');
  });
});

describe('fixed-centre pair motion', () => {
  function fixture() {
    const m = new Medium(2026, { ...DEFAULT_PARAMETERS, birthRate: 0 }, false);
    m.birth(); m.particles[6] = 1; m.particles[7] = 0;
    return m;
  }
  function sample(m: Medium, tick: number) { m.tick = tick; const data = new Float32Array(CAPACITY * SNAPSHOT_STRIDE); m.snapshot(data); return data.slice(0, SNAPSHOT_STRIDE); }
  it('never translates surviving pair centres while its dipole direction rotates', () => {
    const m = new Medium(), before = new Float32Array(CAPACITY * SNAPSHOT_STRIDE), after = new Float32Array(CAPACITY * SNAPSHOT_STRIDE);
    const count = m.snapshot(before); m.step(12); const remaining = m.snapshot(after);
    const prior = new Map(Array.from({ length: count }, (_, i) => { const row = before.slice(i * SNAPSHOT_STRIDE, (i + 1) * SNAPSHOT_STRIDE); return [`${row[10]}:${row[11]}`, row]; }));
    let compared = 0, rotations = 0;
    for (let i = 0; i < remaining; i++) {
      const row = after.slice(i * SNAPSHOT_STRIDE, (i + 1) * SNAPSHOT_STRIDE), old = prior.get(`${row[10]}:${row[11]}`); if (!old) continue;
      expect(row.slice(0, 3)).toEqual(old.slice(0, 3));
      expect(Math.hypot(row[3], row[4], row[5])).toBeCloseTo(1, 6);
      const b = row[10] * STATE_STRIDE;
      expect(row[3] * m.particles[b + 3] + row[4] * m.particles[b + 4] + row[5] * m.particles[b + 5]).toBeCloseTo(0, 6);
      if (Math.hypot(row[3] - old[3], row[4] - old[4], row[5] - old[5]) > .01) rotations++;
      compared++;
    }
    expect(compared).toBeGreaterThan(500); expect(rotations).toBe(compared);
  });
  it('separates and collapses symmetrically about one fixed point over a full lifetime', () => {
    const m = fixture(), samples = [0, 30, 60, 90, 120].map(t => sample(m, t));
    expect(samples[0][6]).toBe(0); expect(samples[2][6]).toBeCloseTo(.3, 6); expect(samples[4][6]).toBe(0);
    expect(samples[1][6]).toBeCloseTo(samples[3][6], 6); expect(samples[1][6]).toBeLessThan(samples[2][6]);
    for (const row of samples) {
      expect(row.slice(0, 3)).toEqual(samples[0].slice(0, 3));
      for (let k = 0; k < 3; k++) {
        const positive = row[k] + row[k + 3] * row[6] / 2, negative = row[k] - row[k + 3] * row[6] / 2;
        expect((positive + negative) / 2).toBeCloseTo(row[k], 10);
      }
    }
  });
  it('changes separation without changing midpoints, lifetimes or the energy ledger', () => {
    const m = new Medium(), before = new Float32Array(CAPACITY * SNAPSHOT_STRIDE); const count = m.snapshot(before); const energy = m.diagnostics().fieldEnergy;
    m.updateParameters({ ...DEFAULT_PARAMETERS, separation: .6 }); const after = new Float32Array(CAPACITY * SNAPSHOT_STRIDE); expect(m.snapshot(after)).toBe(count);
    for (let i = 0; i < count; i++) { const n = i * SNAPSHOT_STRIDE; expect(after.slice(n, n + 6)).toEqual(before.slice(n, n + 6)); expect(after[n + 6]).toBeCloseTo(before[n + 6] * 2, 6); expect(after[n + 9]).toBe(before[n + 9]); }
    expect(m.diagnostics().fieldEnergy).toBe(energy);
  });
  it('treats lobe-size fading separately from the separation lifecycle', () => {
    expect(lifecycleEnvelope(0, 1)).toBe(0); expect(lifecycleEnvelope(.5, 1)).toBe(1); expect(lifecycleEnvelope(1, 1)).toBe(0);
    expect(lobeScale(.25, 1, false)).toBe(1); expect(lobeScale(.5, 1, false)).toBe(1);
    expect(lobeScale(0, 1, false)).toBe(0); expect(lobeScale(1, 1, false)).toBe(0);
    expect(lobeScale(.25, 1, true)).toBe(.8); expect(lobeScale(.5, 1, true)).toBe(.8);
  });
});
