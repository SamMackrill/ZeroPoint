import { describe, expect, it } from 'vitest';
import { casimir, london, pressureCSV, pressureSweep } from '../src/van-der-waals/model';

describe('van der Waals and Casimir references', () => {
  it('has attractive pressure with the expected SI magnitude and area conversion', () => {
    const r = casimir(100, 1);
    expect(r.pressure).toBeCloseTo(-13.0012577, 6);
    expect(r.force).toBeCloseTo(-13.0012577e-6, 12);
    expect(r.energyPerArea).toBeCloseTo(-4.33375257e-7, 14);
    expect(r.energy).toBeCloseTo(r.energyPerArea * 1e-6, 20);
    expect(casimir(200, 1).pressure / r.pressure).toBeCloseTo(1 / 16, 14);
    expect(casimir(200, 1).energyPerArea / r.energyPerArea).toBeCloseTo(1 / 8, 14);
    expect(casimir(100, 2).pressure).toBe(r.pressure);
    expect(casimir(100, 2).force).toBe(2 * r.force);
  });
  it('gets pressure from the negative derivative of interaction energy per area', () => {
    for (const gap of [100, 200, 750, 1000]) {
      const h = .001;
      const derivative = (casimir(gap + h, 1).energyPerArea - casimir(gap - h, 1).energyPerArea) / (2 * h * 1e-9);
      expect(-derivative / casimir(gap, 1).pressure).toBeCloseTo(1, 8);
    }
  });
  it('distinguishes London energy and force falloff and their derivative', () => {
    expect(london(2).energy / london(1).energy).toBe(1 / 64);
    expect(london(2).force / london(1).force).toBe(1 / 128);
    const r = 1.7, h = 1e-5;
    expect(-(london(r + h).energy - london(r - h).energy) / (2 * h)).toBeCloseTo(london(r).force, 8);
  });
  it('rejects singular or nonfinite inputs', () => {
    for (const invalid of [0, -1, NaN, Infinity]) {
      expect(() => london(invalid)).toThrow();
      expect(() => casimir(invalid, 1)).toThrow();
      expect(() => casimir(200, invalid)).toThrow();
    }
  });
  it('exports a bounded increasing-gap sweep with units and a model label', () => {
    const rows = pressureSweep(2);
    expect(rows).toHaveLength(61);
    expect(rows[0].gapNm).toBe(100); expect(rows.at(-1)!.gapNm).toBe(1000);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].gapNm).toBeGreaterThan(rows[i - 1].gapNm);
      expect(rows[i].pressure).toBeGreaterThan(rows[i - 1].pressure);
      expect(rows[i].pressure).toBeLessThan(0);
    }
    const csv = pressureCSV(2).split('\n');
    expect(csv).toHaveLength(62);
    expect(csv[0]).toContain('pressure_Pa,force_N');
    expect(csv[1].split(',').slice(0, 3)).toEqual(['ideal-perfect-conductor-T0', '100', '2']);
    expect(Number(csv[1].split(',')[4])).toBe(rows[0].force);
  });
});
