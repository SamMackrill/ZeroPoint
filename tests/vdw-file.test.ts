import { describe, expect, it } from 'vitest';
import { parseVdwFile, vdwFile } from '../src/experiments/van-der-waals/file';
import { vanDerWaalsDefinition } from '../src/experiments/van-der-waals/definition';

describe('van der Waals files', () => {
  const params = { ...vanDerWaalsDefinition.defaultParams, gap: 500, area: 2 };
  it('round-trips the stage, parameters, layer and clock tick', () => {
    const text = JSON.stringify(vdwFile('pressure', params, { modes: false }, 15));
    expect(parseVdwFile(text)).toEqual({ scenario: 'pressure', params, view: { modes: false }, tick: 15 });
  });
  it('rejects other formats, unknown stages and out-of-range values', () => {
    const good = vdwFile('correlated', params, { modes: true }, 0);
    expect(() => parseVdwFile('{')).toThrow('This is not a JSON file.');
    expect(() => parseVdwFile(JSON.stringify({ ...good, format: 'zeropoint-light' }))).toThrow('This is not a van der Waals experiment file.');
    expect(() => parseVdwFile(JSON.stringify({ ...good, version: 2 }))).toThrow('Unsupported van der Waals file version 2.');
    expect(() => parseVdwFile(JSON.stringify({ ...good, scenario: 'plates' }))).toThrow('Unknown stage "plates".');
    expect(() => parseVdwFile(JSON.stringify({ ...good, params: { ...params, gap: 5 } }))).toThrow('Plate gap must be a number from 100 to 1000.');
    expect(() => parseVdwFile(JSON.stringify({ ...good, tick: 120 }))).toThrow('The dipole clock tick must be an integer from 0 to 119.');
  });
});
