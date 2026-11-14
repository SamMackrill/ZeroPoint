import { describe, expect, it } from 'vitest';
import { DEFAULT_SLITS, SLIT_MODEL } from '../src/double-slit/model';
import { doubleSlitDefinition } from '../src/experiments/double-slit/definition';
import { parseSlitFile, slitFile } from '../src/experiments/double-slit/file';
import { appliesTo, scenarioState, validateDefinition } from '../src/workbench/definition';

describe('double-slit definition', () => {
  it('is valid, and sets the wall and field speed by scenario', () => {
    expect(validateDefinition(doubleSlitDefinition)).toEqual([]);
    expect(scenarioState(doubleSlitDefinition, 'slits').params).toMatchObject({ wall: 'slits', fields: 'fast' });
    expect(scenarioState(doubleSlitDefinition, 'open').params).toMatchObject({ wall: 'open', fields: 'fast' });
    expect(scenarioState(doubleSlitDefinition, 'light-speed')).toMatchObject({ params: { wall: 'slits', fields: 'light' }, view: { reach: true } });
  });
  it('offers the slit geometry and the field routes only where they apply', () => {
    const shown = (scenario: string) => doubleSlitDefinition.params.filter(p => appliesTo(p, scenario)).map(p => p.key);
    expect(shown('slits')).toEqual(['slitOffset', 'slitWidth']); expect(shown('light-speed')).toEqual(['slitOffset', 'slitWidth']); expect(shown('open')).toEqual([]);
    expect(doubleSlitDefinition.layers.filter(l => appliesTo(l, 'light-speed')).map(l => l.key)).not.toContain('routes');
  });
  it('gives each scenario a bounded timeline with the wall and the arrival as events', () => {
    const timeline = (scenario: string) => doubleSlitDefinition.timeline(scenario, scenarioState(doubleSlitDefinition, scenario).params);
    expect(timeline('slits')).toMatchObject({ kind: 'bounded', end: 480, next: 'event' });
    expect(timeline('slits').events.map(e => e.tick)).toEqual([240, 480]);
    expect(timeline('open').events.map(e => e.id)).toEqual(['arrive']);
    expect(timeline('light-speed').events[0]).toMatchObject({ tick: 240, label: 'Halted at the wall' });
  });
});

describe('double-slit files', () => {
  const held = scenarioState(doubleSlitDefinition, 'light-speed');
  const params = { ...held.params, slitOffset: 4, slitWidth: 1.5 };
  it('round-trips the scenario, slits, layers and tick', () => {
    const file = slitFile('light-speed', params, { ...held.view, zeptons: false }, 200);
    expect(file).toMatchObject({ format: 'zeropoint-double-slit', version: 1, model: SLIT_MODEL });
    expect(parseSlitFile(JSON.stringify(file))).toEqual({ scenario: 'light-speed', params, view: { ...held.view, zeptons: false }, tick: 200 });
  });
  it('takes the wall and field speed from the scenario, not from the file', () => {
    const file = slitFile('open', { ...DEFAULT_SLITS, wall: 'slits', fields: 'light' }, held.view, 0);
    expect(parseSlitFile(JSON.stringify(file)).params).toMatchObject({ wall: 'open', fields: 'fast' });
  });
  it('keeps the slit geometry of an Open path file, which the lab carries to the next scenario', () => {
    const geometry = { slitOffset: 5, slitWidth: 2 };
    const file = slitFile('open', { ...DEFAULT_SLITS, ...geometry, wall: 'open' }, held.view, 10);
    expect(parseSlitFile(JSON.stringify(file)).params).toEqual({ wall: 'open', fields: 'fast', ...geometry });
    // Hidden or not, an out-of-range value is still rejected.
    expect(() => parseSlitFile(JSON.stringify({ ...file, params: { ...file.params, slitOffset: 99 } }))).toThrow('Slit distance from path must be a number from 2 to 5.');
  });
  it('rejects other formats, unknown scenarios and out-of-range values', () => {
    const good = slitFile('slits', DEFAULT_SLITS, held.view, 0);
    expect(() => parseSlitFile('{')).toThrow('This is not a JSON file.');
    expect(() => parseSlitFile('null')).toThrow('This is not a double-slit experiment file.');
    expect(() => parseSlitFile(JSON.stringify({ ...good, format: 'zeropoint-vdw' }))).toThrow('This is not a double-slit experiment file.');
    expect(() => parseSlitFile(JSON.stringify({ ...good, version: 2 }))).toThrow('Unsupported double-slit file (version 2, model double-slit/1).');
    expect(() => parseSlitFile(JSON.stringify({ ...good, model: 'double-slit/0' }))).toThrow('Unsupported double-slit file');
    expect(() => parseSlitFile(JSON.stringify({ ...good, scenario: 'three-slits' }))).toThrow('Unknown scenario "three-slits".');
    expect(() => parseSlitFile(JSON.stringify({ ...good, params: { ...DEFAULT_SLITS, slitOffset: 9 } }))).toThrow('Slit distance from path must be a number from 2 to 5.');
    expect(() => parseSlitFile(JSON.stringify({ ...good, params: undefined }))).toThrow('Slit distance from path must be a number');
    expect(() => parseSlitFile(JSON.stringify({ ...good, view: { ...held.view, routes: 'yes' } }))).toThrow('The routes layer setting is missing.');
    expect(() => parseSlitFile(JSON.stringify({ ...good, tick: 481 }))).toThrow('The tick must be an integer from 0 to 480.');
    expect(() => parseSlitFile(JSON.stringify({ ...good, tick: 1.5 }))).toThrow('The tick must be an integer');
  });
});
