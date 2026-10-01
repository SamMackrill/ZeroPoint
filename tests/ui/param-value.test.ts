import { describe, expect, it } from 'vitest';
import { formatValue, normalizeValue, nudgeValue, parseValue, stepDecimals } from '../../src/ui/param-value';
import { soloLayer, toggleLayer } from '../../src/ui/layer-visibility';

describe('ParamRow values', () => {
  it('derives precision from the step', () => {
    expect([1, 0.5, 0.05, 0.001, 1e-7, 10].map(stepDecimals)).toEqual([0, 1, 2, 3, 7, 0]);
    expect(formatValue(625, 1)).toBe('625');
    expect(formatValue(0.1 + 0.2, 0.01)).toBe('0.30');
  });
  it('parses typed values with units, signs, commas and exponents', () => {
    expect(parseValue('625 nm')).toBe(625);
    expect(parseValue('  0.5τ')).toBe(0.5);
    expect(parseValue('-2')).toBe(-2);
    expect(parseValue('−2.5')).toBe(-2.5);
    expect(parseValue('0,75')).toBe(0.75);
    expect(parseValue('.5')).toBe(0.5);
    expect(parseValue('1e-3 s')).toBe(0.001);
    expect(parseValue('nm')).toBeNull();
    expect(parseValue('')).toBeNull();
  });
  it('clamps and removes float noise', () => {
    expect(normalizeValue(0.1 + 0.2, 0, 1, 0.1)).toBe(0.3);
    expect(normalizeValue(900, 380, 780, 1)).toBe(780);
    expect(normalizeValue(-5, 0, 10, 1)).toBe(0);
  });
  it('nudges by a step, ×10 with Shift and ×0.1 with Alt', () => {
    expect(nudgeValue(625, 1, 1, 380, 780)).toBe(626);
    expect(nudgeValue(625, -1, 1, 380, 780, { shiftKey: true })).toBe(615);
    expect(nudgeValue(0.5, 1, 0.1, 0, 1, { altKey: true })).toBe(0.51);
    expect(nudgeValue(779, 1, 1, 380, 780, { shiftKey: true })).toBe(780);
  });
});

describe('layer visibility', () => {
  const keys = ['pairs', 'shells', 'faraday'];
  it('toggles one layer', () => {
    expect(toggleLayer({ pairs: true, shells: false }, 'shells')).toEqual({ pairs: true, shells: true });
  });
  it('solos a layer, and a second solo shows every listed layer again', () => {
    const solo = soloLayer({ pairs: true, shells: true, faraday: false, hidden: true }, keys, 'faraday');
    expect(solo).toEqual({ pairs: false, shells: false, faraday: true, hidden: true });
    expect(soloLayer(solo, keys, 'faraday')).toEqual({ pairs: true, shells: true, faraday: true, hidden: true });
  });
});
