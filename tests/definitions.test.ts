import { describe, expect, it } from 'vitest';
import { DEFAULT_LIGHT } from '../src/light/model';
import { EXPERIMENTS, casimirDefinition, electronDefinition, lightDefinition, mediumDefinition, vanDerWaalsDefinition } from '../src/experiments';
import { inductionEvents } from '../src/experiments/light/definition';
import { appliesTo, getPath, scenarioState, validateDefinition, withPaths, type ExperimentDefinition } from '../src/workbench/definition';

describe('experiment definitions', () => {
  it.each(EXPERIMENTS.map(d => [d.title, d] as const))('%s is valid', (_title, definition) => {
    expect(validateDefinition(definition as ExperimentDefinition)).toEqual([]);
  });
  it('lists the five experiments with unique ids, in rail order', () => {
    expect(EXPERIMENTS.map(d => d.id)).toEqual(['medium', 'light', 'electron', 'casimir', 'vdw']);
  });
  it('applies scenario overrides to the defaults', () => {
    expect(scenarioState(mediumDefinition, 'sparse').params).toMatchObject({ birthRate: 200, frequency: 0.6, seed: 2026 });
    expect(scenarioState(electronDefinition, 'moving').params.mode).toBe('moving');
    expect(() => scenarioState(mediumDefinition, 'missing')).toThrow('Medium lifecycle has no scenario "missing".');
  });
  it('shows only the controls, layers and cameras that apply (rule 3)', () => {
    const shown = (scenario: string) => electronDefinition.params.filter(p => appliesTo(p, scenario)).map(p => p.key);
    expect(shown('moving')).toContain('beta');
    expect(shown('stationary')).not.toContain('beta');
    expect(shown('charge-flux')).toEqual([]);
    expect(electronDefinition.cameras.filter(c => appliesTo(c, 'spin')).map(c => c.id)).toContain('shell');
    expect(vanDerWaalsDefinition.params.filter(p => appliesTo(p, 'pressure')).map(p => p.key)).toEqual(['gap', 'area']);
  });
  it('gives each scenario its timeline kind and events', () => {
    const light = lightDefinition.timeline('induction', DEFAULT_LIGHT);
    expect(light).toMatchObject({ kind: 'bounded', end: 1440, next: 'event' });
    expect(light.events).toHaveLength(12);
    expect(light.events[2]).toEqual({ tick: 360, label: 'Pair 3 induced' });
    expect(inductionEvents({ ...DEFAULT_LIGHT, wavelength: 4 }).map(e => e.tick)).toEqual([240, 480, 720, 960, 1200, 1440]);
    expect(electronDefinition.timeline('stationary', electronDefinition.defaultParams).events.map(e => e.tick)).toEqual([42, 360]);
    expect(electronDefinition.timeline('spin', electronDefinition.defaultParams)).toMatchObject({ kind: 'bounded', next: 'jump', events: [] });
    expect(electronDefinition.timeline('radius-limit', electronDefinition.defaultParams).kind).toBe('static');
    expect(mediumDefinition.timeline('balanced', mediumDefinition.defaultParams)).toMatchObject({ kind: 'open', next: 'jump' });
    expect(vanDerWaalsDefinition.timeline('correlated', vanDerWaalsDefinition.defaultParams)).toMatchObject({ kind: 'loop', end: 120 });
    expect(casimirDefinition.speeds).toEqual([0.1, 0.25, 0.5, 1, 2]);
  });
  it('converts Light wavelengths between L and nm', () => {
    const wavelength = lightDefinition.params.find(p => p.key === 'wavelength');
    expect(wavelength?.kind === 'range' && wavelength.display?.toDisplay(2)).toBe(500);
    expect(wavelength?.kind === 'range' && wavelength.display?.fromDisplay(625)).toBe(2.5);
  });
});

describe('definition helpers', () => {
  it('reads and writes dotted paths without mutating the source', () => {
    const view = { spinDisplay: { count: 2, gain: 2 }, shells: true };
    expect(getPath(view, 'spinDisplay.count')).toBe(2);
    expect(getPath(view, 'spinDisplay.missing.deep')).toBeUndefined();
    const next = withPaths(view, { 'spinDisplay.count': 4, shells: false });
    expect(next).toEqual({ spinDisplay: { count: 4, gain: 2 }, shells: false });
    expect(view.spinDisplay.count).toBe(2);
  });
  it('reports mistakes in a definition', () => {
    const broken: ExperimentDefinition<{ a: number; b: string }, { on: boolean; size: number }> = {
      id: 'broken', title: 'Broken',
      scenarios: [{ id: 's', title: 'S', description: '', params: { a: 50 } }, { id: 's', title: 'Again', description: '' }, { id: 'still', title: 'Still', description: '', static: true }],
      defaultParams: { a: 1, b: 'x' }, defaultView: { on: true, size: 3 },
      params: [
        { kind: 'range', key: 'a', label: 'A', group: 'G', apply: 'live', min: 0, max: 10, step: 1 },
        { kind: 'choice', key: 'b', label: 'B', group: 'G', apply: 'live', options: [{ value: 'y', label: 'Y' }], scenarios: ['nope'] },
        { kind: 'range', key: 'c', label: 'C', group: 'G', apply: 'live', min: 0, max: 1, step: 1, scenarios: ['s'] },
      ],
      layers: [{ key: 'size', label: 'Size', group: 'Guides' }],
      cameras: [],
      speeds: [1],
      timeline: () => ({ kind: 'bounded', dt: 1, end: 10, events: [{ tick: 11, label: 'Late' }] }),
    };
    expect(validateDefinition(broken)).toEqual(expect.arrayContaining([
      'duplicate scenario "s"',
      'parameter "a" = 50 is outside 0–10 in scenario "s"',
      'parameter "b" refers to unknown scenario "nope"',
      'parameter "c" is missing in scenario "s"',
      'parameter "c" is not in the defaults',
      'layer "size" is not a boolean view setting',
      'scenario "still" is static but its timeline is bounded',
      'event "Late" at tick 11 is outside scenario "s"',
    ]));
  });
});
