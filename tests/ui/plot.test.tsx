// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Plot } from '../../src/ui/Plot';
import { areaPath, extent, formatNumber, linePath, nearestIndex, plotCsv, scale, ticks3 } from '../../src/ui/plot-scale';

describe('plot scales', () => {
  it('maps linear and log domains', () => {
    expect(scale(5, [0, 10], [0, 100])).toBe(50);
    expect(scale(10, [0, 10], [100, 0])).toBe(0);
    expect(scale(100, [10, 1000], [0, 1], 'log')).toBeCloseTo(0.5);
  });
  it('pads extents, ignores gaps, and keeps flat or empty data drawable', () => {
    expect(extent([0, 10, null, NaN])).toEqual([-0.8, 10.8]);
    const [flatLo, flatHi] = extent([3, 3]);
    expect(flatLo).toBeCloseTo(1.26);
    expect(flatHi).toBeCloseTo(4.74);
    expect(extent([])).toEqual([0, 1]);
    const [lo, hi] = extent([0.01, -5, 10], 'log');
    expect(lo).toBeLessThan(0.01);
    expect(hi).toBeGreaterThan(10);
  });
  it('places three ticks, geometric in the middle of a log axis', () => {
    expect(ticks3([0, 2])).toEqual([0, 1, 2]);
    expect(ticks3([1, 100], 'log')).toEqual([1, 10, 100]);
  });
  it('breaks lines and areas at gaps', () => {
    const id = (v: number) => v;
    expect(linePath([0, 1, 2, 3, 4], [1, 2, null, 4, 5], id, id)).toBe('M0 1L1 2M3 4L4 5');
    expect(linePath([1, 2, 3], [1, -1, 2], id, id, { y: 'log' })).toBe('M1 1M3 2');
    expect(areaPath([0, 1, 2, 3], [1, 2, null, 4], id, id, 10)).toBe('M0 10L0 1L1 2L1 10Z');
    expect(areaPath([1, 2, 3, 4], [1, 2, 0, 4], id, id, 10, { y: 'log' })).toBe('M1 10L1 1L2 2L2 10Z');
  });
  it('finds the nearest sample', () => {
    expect(nearestIndex([0, 1, 2, 4], 2.9)).toBe(2);
    expect(nearestIndex([0, 1, 2, 4], 3.1)).toBe(3);
    expect(nearestIndex([0, 1, 2, 4], -5)).toBe(0);
    expect(nearestIndex([], 1)).toBe(-1);
    expect(nearestIndex([100, 200], 145)).toBe(0);
    expect(nearestIndex([100, 200], 145, 'log')).toBe(1);
  });
  it('exports exactly what is plotted as CSV, gaps empty and labels quoted', () => {
    expect(plotCsv('x (τ)', [0, 0.5], [{ label: 'Inner', values: [1, null] }, { label: 'B, z', values: [2, 3] }])).toBe('x (τ),Inner,"B, z"\n0,1,2\n0.5,,3\n');
  });
  it('formats compact numbers with a true minus sign', () => {
    expect([1234.5, 0.5, -2.25, 0, 1e-5, 250000].map(formatNumber)).toEqual(['1,230', '0.5', '−2.25', '0', '1e−5', '2.5e+5']);
  });
});

describe('Plot', () => {
  const x = [0, 1, 2, 3];
  const series = [{ key: 'e', label: 'E', color: '#000000', values: [0, 1, null, 3] }, { key: 'b', label: 'B', color: '#000000', values: [1, 1, 1, 1], dashed: true }];

  it('shows a legend for two or more series, none for one', () => {
    const { rerender } = render(<Plot label="Fields" x={x} series={series}/>);
    expect(screen.getByRole('list', { name: 'Series' }).textContent).toBe('EB');
    rerender(<Plot label="Fields" x={x} series={series.slice(0, 1)}/>);
    expect(screen.queryByRole('list', { name: 'Series' })).toBeNull();
  });
  it('shows the empty message until there are two samples', () => {
    render(<Plot label="Population" x={[0]} series={[{ key: 'a', label: 'A', color: '#000000', values: [1] }]} empty="Run or step the experiment to collect samples"/>);
    expect(screen.getByText('Run or step the experiment to collect samples')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'Population' }).getAttribute('tabindex')).toBe('-1');
    expect(document.querySelectorAll('.plot-x span')).toHaveLength(0);
  });
  it('reads every series at the crosshair with the keyboard, including gaps', () => {
    render(<Plot label="Fields" x={x} series={series} xUnit="τ"/>);
    const area = screen.getByRole('img', { name: /Fields/ });
    fireEvent.keyDown(area, { key: 'ArrowRight' });
    expect(document.querySelector('.plot-readout')?.textContent).toBe('0 τ: E 0; B 1');
    fireEvent.keyDown(area, { key: 'End' });
    fireEvent.keyDown(area, { key: 'ArrowLeft' });
    expect(document.querySelector('.plot-readout')?.textContent).toBe('2 τ: E no value; B 1');
    fireEvent.keyDown(area, { key: 'Escape' });
    expect(document.querySelector('.plot-readout')?.textContent).toBe('');
  });
  it('draws dashed comparison series, a playhead, a reference and markers', () => {
    const { container } = render(<Plot label="Fields" x={x} series={series} playhead={1.5} reference={0} markers={[{ x: 2, label: 'Probe' }, { x: 1, y: 1, label: 'Selected' }]}/>);
    const lines = container.querySelectorAll('path.plot-line');
    expect([...lines].map(l => l.getAttribute('stroke-dasharray'))).toEqual([null, '6 4']);
    expect(container.querySelector('.plot-playhead')).toBeTruthy();
    expect(container.querySelector('.plot-reference')).toBeTruthy();
    expect(container.querySelector('.plot-marker')).toBeTruthy();
    expect(container.querySelector('.plot-point')?.getAttribute('title')).toBe('Selected');
  });
});
