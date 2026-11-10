// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PlateDiagram, SAMPLE_WAVELENGTHS, fitsGap } from '../../src/van-der-waals/diagrams';

// Fleming's Fig. 3-3: fluctuations of every wavelength outside the plates, only those shorter than the gap between them.
describe('plate diagram', () => {
  const count = (gap: number, modes = false) => {
    const view = render(<PlateDiagram gap={gap} modes={modes}/>);
    const result = { inside: view.getByTestId('vdw-fluctuations-inside').querySelectorAll('ellipse').length, outside: view.getByTestId('vdw-fluctuations-outside').querySelectorAll('ellipse').length, caption: view.getByTestId('vdw-fit-count').textContent ?? '', curves: view.container.querySelectorAll('polyline').length };
    view.unmount();
    return result;
  };
  it('admits a wavelength between the plates only when it is shorter than the gap', () => {
    expect(fitsGap(199, 200)).toBe(true); expect(fitsGap(200, 200)).toBe(false); expect(fitsGap(260, 200)).toBe(false);
    expect(SAMPLE_WAVELENGTHS.filter(w => fitsGap(w, 100))).toEqual([30, 42, 58, 80]);
    expect(SAMPLE_WAVELENGTHS.filter(w => fitsGap(w, 1000))).toHaveLength(SAMPLE_WAVELENGTHS.length - 1);
  });
  it('draws every wavelength outside whatever the gap, and fewer between the plates as they close', () => {
    const wide = count(1000), middle = count(200), narrow = count(100);
    expect(wide.outside).toBe(middle.outside); expect(middle.outside).toBe(narrow.outside);
    expect(wide.inside).toBeGreaterThan(middle.inside); expect(middle.inside).toBeGreaterThan(narrow.inside); expect(narrow.inside).toBeGreaterThan(0);
    expect(narrow.outside).toBeGreaterThan(wide.inside);
    expect(middle.caption).toContain('6 of 14 sample wavelengths fit'); expect(narrow.caption).toContain('4 of 14');
  });
  it('keeps the standing-wave curves as a separate layer, off unless asked for', () => {
    expect(count(200).curves).toBe(0); expect(count(200, true).curves).toBe(3);
    expect(count(200, true).inside).toBe(count(200).inside);
  });
});
