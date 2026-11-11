// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SlitDiagram, shownResponse, stateLine, type SlitLayers } from '../../src/double-slit/Diagram';
import { DEFAULT_SLITS, PAIR_TICKS, SLIT_END_TICK, type SlitParameters } from '../../src/double-slit/model';
import { palette } from '../../src/ui/palette';

const all: SlitLayers = { zeptons: true, fields: true, routes: true, reach: true, path: true };
const slits = DEFAULT_SLITS, open: SlitParameters = { ...slits, wall: 'open' }, held: SlitParameters = { ...slits, fields: 'light' };
/** The tick at the middle of central pair `n` (0-based). */
const midlife = (n: number) => n * PAIR_TICKS + PAIR_TICKS / 2;

/** Render the diagram and report what it drew. */
function draw(params: SlitParameters, tick: number, layers: SlitLayers = all) {
  const view = render(<SlitDiagram params={params} tick={tick} layers={layers}/>);
  const zeptons = [...(view.queryByTestId('slit-zeptons')?.children ?? [])];
  const result = {
    label: view.getByTestId('slit-diagram').getAttribute('aria-label') ?? '',
    wall: view.queryByTestId('slit-wall')?.querySelectorAll('line').length ?? 0,
    zeptons: zeptons.length,
    turned: zeptons.filter(z => z.getAttribute('stroke') === palette.dataE).length,
    routes: view.queryByTestId('slit-routes')?.querySelectorAll('polyline').length ?? 0,
    reach: !!view.queryByTestId('slit-reach'),
    pair: !!view.queryByTestId('slit-pair'),
    mark: !!view.queryByTestId('slit-photon-mark'),
    outcome: view.getByTestId('slit-outcome').textContent ?? '',
  };
  view.unmount();
  return result;
}

// Fleming's Fig. 19-3: a photon from A to B past a wall with a slit to either side of the straight path.
describe('double-slit diagram', () => {
  it('draws the wall in three pieces with two slits, and no wall on an open path', () => {
    expect(draw(slits, 0).wall).toBe(3);
    expect(draw(open, 0).wall).toBe(0);
    expect(draw(slits, 0).label).toContain('two slits 1 wavelengths wide, each 3 wavelengths from the straight path');
    expect(draw(open, 0).label).toContain('Nothing stands between source A and absorber B.');
  });
  it('turns zeptons on both sides of the wall when the field passes the slits', () => {
    const scene = draw(slits, midlife(3));
    expect(scene.zeptons).toBe(558);
    expect(scene.turned).toBe(scene.zeptons);
    expect(scene.pair).toBe(true); expect(scene.mark).toBe(true);
    expect(scene.label).toContain('Central pair 4 of 16');
  });
  it('turns only the zeptons within half a wavelength when the fields are held to light speed', () => {
    const scene = draw(held, midlife(3));
    expect(scene.turned).toBeGreaterThan(0);
    expect(scene.turned).toBeLessThan(12);
    expect(scene.label).toContain('held to light speed');
  });
  it('leaves every zepton at rest at a hand-off, when the field is extinguished', () => {
    expect(draw(slits, PAIR_TICKS).turned).toBe(0);
  });
  it('shows the routes through both slits only while the pair is short of the wall', () => {
    expect(draw(slits, midlife(3)).routes).toBe(2);
    expect(draw(slits, midlife(10)).routes).toBe(0);
    expect(draw(held, midlife(3)).routes).toBe(0);
    expect(draw(open, midlife(3)).routes).toBe(0);
  });
  it('shows the outcome: absorbed at B, or halted at the wall', () => {
    const absorbed = draw(slits, SLIT_END_TICK), halted = draw(held, 300);
    expect(absorbed.outcome).toBe('absorbed all at once'); expect(absorbed.pair).toBe(false); expect(absorbed.mark).toBe(false);
    expect(absorbed.label).toContain('The photon has been absorbed at B.');
    expect(halted.outcome).toBe('nothing arrives'); expect(halted.pair).toBe(false); expect(halted.turned).toBe(0);
    expect(halted.label).toContain('halted at the wall');
  });
  it('hides each layer when it is switched off', () => {
    const bare = draw(slits, midlife(3), { zeptons: false, fields: false, routes: false, reach: false, path: false });
    expect(bare).toMatchObject({ zeptons: 0, routes: 0, reach: false, pair: true, wall: 3 });
    expect(draw(slits, midlife(3)).reach).toBe(true);
  });
  it('magnifies the weak far field without ever exceeding a full turn', () => {
    expect(shownResponse(0)).toBe(0); expect(shownResponse(1)).toBe(1); expect(shownResponse(4)).toBe(1); expect(shownResponse(-1)).toBe(0);
    expect(shownResponse(0.0001)).toBeCloseTo(0.1);
    expect(shownResponse(0.001)).toBeGreaterThan(shownResponse(0.0001));
  });
});

describe('double-slit state line', () => {
  it('says what the photon is doing in each scenario', () => {
    expect(stateLine(slits, midlife(3))).toBe('Pair 4 of 16 · its field reaches B through both slits');
    expect(stateLine(slits, midlife(10))).toBe('Pair 11 of 16 · beyond the wall');
    expect(stateLine(open, midlife(3))).toBe('Pair 4 of 16 · its field reaches B directly');
    expect(stateLine(held, midlife(3))).toBe('Pair 4 of 8 · its field stops λ/2 from the path');
    expect(stateLine(held, 240)).toBe('Halted at the wall · no field reached a slit');
    expect(stateLine(slits, SLIT_END_TICK)).toBe('Absorbed at B at 8.00 τ, the straight-line time');
  });
});
