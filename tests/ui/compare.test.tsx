// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { electronDefinition, lightDefinition } from '../../src/experiments';
import { scenarioState, withPaths } from '../../src/workbench/definition';
import { CompareTab, parameterDiff, withDeltas } from '../../src/workbench/compare';

describe('A/B compare', () => {
  it('lists only the scenario\'s parameters that differ, as Setup shows them (display units, choice labels)', () => {
    const a = scenarioState(lightDefinition, 'induction').params;
    expect(parameterDiff(lightDefinition, 'induction', a, a)).toEqual([]);
    const b = withPaths(a, { wavelength: 3 });
    expect(parameterDiff(lightDefinition, 'induction', a, b)).toEqual([{ key: 'wavelength', label: 'Wavelength', a: '500 nm', b: '750 nm' }]);
    const spin = scenarioState(electronDefinition, 'spin').params;
    expect(parameterDiff(electronDefinition, 'spin', spin, withPaths(spin, { spin: -1, beta: 0.1 }))).toEqual([{ key: 'spin', label: 'Spin projection', a: '+½', b: '−½' }]); // beta is Moving-only
  });

  it('shows zero Δ for identical A and B, signed Δ at the value\'s precision, and B\'s value for non-numbers', () => {
    const a = [{ label: 'Energy', value: '2.480', unit: 'eV' }, { label: 'Spin', value: '+½' }, { label: 'Only A', value: '1' }];
    expect(withDeltas(a, null)).toEqual(a);
    expect(withDeltas(a, a).map(r => r.delta)).toEqual(['Δ 0.000', 'Δ 0', 'Δ 0']);
    const b = [{ label: 'Energy', value: '2.230' }, { label: 'Spin', value: '−½' }];
    expect(withDeltas(a, b).map(r => r.delta)).toEqual(['Δ −0.250', 'B −½', undefined]);
    expect(withDeltas([{ label: 'Active', value: '1,234' }], [{ label: 'Active', value: '1,240' }])[0].delta).toBe('Δ +6'); // en-GB grouping
  });

  it('pins B, lists the difference, copies B to A and clears', () => {
    const a = scenarioState(lightDefinition, 'induction').params, handlers = { onPin: vi.fn(), onCopyToA: vi.fn(), onClear: vi.fn() };
    const view = render(<CompareTab definition={lightDefinition} scenario="induction" a={a} b={null} {...handlers}/>);
    fireEvent.click(view.getByTestId('compare-pin')); expect(handlers.onPin).toHaveBeenCalled();
    view.rerender(<CompareTab definition={lightDefinition} scenario="induction" a={a} b={a} {...handlers}/>);
    expect(screen.getByText(/same parameters/)).toBeTruthy();
    expect((view.getByTestId('compare-copy') as HTMLButtonElement).disabled).toBe(true);
    view.rerender(<CompareTab definition={lightDefinition} scenario="induction" a={a} b={withPaths(a, { wavelength: 3 })} {...handlers}/>);
    expect(view.getByTestId('compare-diff').textContent).toContain('750 nm');
    fireEvent.click(view.getByTestId('compare-copy')); expect(handlers.onCopyToA).toHaveBeenCalled();
    fireEvent.click(view.getByTestId('compare-clear')); expect(handlers.onClear).toHaveBeenCalled();
  });
});
