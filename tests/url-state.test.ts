import { describe, expect, it } from 'vitest';
import { electronDefinition, lightDefinition } from '../src/experiments';
import { scenarioState, withPaths } from '../src/workbench/definition';
import { decodeUrl, encodeUrl, resolveUrl, routeFor } from '../src/workbench/urlState';

describe('URL state', () => {
  // Spin starts with Faraday lines off (its definition's view), so turning them on is a change.
  it('encodes only what differs from the scenario, and round-trips through decode and resolve', () => {
    const start = scenarioState(electronDefinition, 'spin');
    const params = withPaths(start.params, { spin: -1, axis: 'x' });
    const view = withPaths(start.view, { radius: true, faraday: true, 'spinDisplay.gain': 4 });
    const route = routeFor(electronDefinition, 'spin', params, view, { camera: 'shell', split: 'section', tick: 691 });
    const hash = encodeUrl(route);
    expect(hash).toBe('#/electron/spin?axis=x&spin=-1&spinDisplay.gain=4&cam=shell&split=section&t=691&L=+faraday,+radius');
    const decoded = decodeUrl(hash)!;
    expect(decoded).toEqual(route);
    const { scenario, overrides, dropped } = resolveUrl(electronDefinition, decoded);
    expect(scenario).toBe('spin');
    expect(dropped).toEqual([]);
    expect(overrides).toEqual({ params: { axis: 'x', spin: -1 }, view: { 'spinDisplay.gain': 4, faraday: true, radius: true }, camera: 'shell', split: 'section', tick: 691 });
  });

  it('gives a bare route for a scenario at its starting state, without a scenario for single-scenario labs', () => {
    const spin = scenarioState(electronDefinition, 'spin');
    expect(encodeUrl(routeFor(electronDefinition, 'spin', spin.params, spin.view))).toBe('#/electron/spin');
    const light = scenarioState(lightDefinition, 'induction');
    expect(encodeUrl(routeFor(lightDefinition, 'induction', withPaths(light.params, { wavelength: 2.5 }), light.view))).toBe('#/light?wavelength=2.5');
  });

  it('drops unknown keys, values out of range or not offered, layers and cameras of other scenarios, and unknown scenarios', () => {
    const route = decodeUrl('#/electron/spin?beta=0.1&spin=2&axis=q&wobble=1&spinDisplay.count=3&cam=nope&L=+shells,+bogus')!;
    const { overrides, dropped } = resolveUrl(electronDefinition, route);
    expect(overrides.params).toEqual({});
    expect(overrides.view).toEqual({ 'spinDisplay.count': 3, shells: true });
    expect(dropped.sort()).toEqual(['axis', 'beta', 'camera nope', 'layer bogus', 'spin', 'wobble'].sort()); // beta is Moving-only
    expect(resolveUrl(electronDefinition, decodeUrl('#/electron/nowhere')!)).toMatchObject({ scenario: 'stationary', dropped: ['scenario nowhere'] });
    expect(resolveUrl(lightDefinition, decodeUrl('#/light?wavelength=9')!).dropped).toEqual(['wavelength']);
  });

  it('rejects hashes that are not routes', () => {
    expect(decodeUrl('')).toBeNull();
    expect(decodeUrl('#section-2')).toBeNull();
    expect(decodeUrl('#/medium')).toEqual({ experiment: 'medium', values: {}, layers: {} });
    expect(decodeUrl('#/medium?t=-4&t2=1')!.tick).toBeUndefined();
  });
});
