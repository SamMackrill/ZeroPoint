// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CommandPalette } from '../../src/workbench/CommandPalette';
import { layerActions, matches, parameterActions, press, useActions, type Action } from '../../src/workbench/actions';
import type { ExperimentDefinition } from '../../src/workbench/definition';

/** A visible lab publishing its actions, as each workbench does. */
function Lab({ actions }: { actions: Action[] }) { useActions(true, actions); return null; }

const DEFINITION = {
  layers: [{ key: 'bounds', label: 'Cell boundaries' }, { key: 'slice', label: 'Energy slice', scenarios: ['other'] }],
  params: [{ kind: 'range', key: 'rate', label: 'Creation rate', min: 0, max: 1, step: 0.1 }, { kind: 'choice', key: 'mode', label: 'Mode', options: [] }],
} as unknown as ExperimentDefinition;

describe('command palette', () => {
  beforeEach(() => { vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 0; }); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('opens on Ctrl K with navigation and the visible lab\'s actions, filters as you type, and runs the choice', () => {
    const go = vi.fn(), step = vi.fn();
    render(<><Lab actions={[{ id: 'transport.step', label: 'Step', group: 'Transport', keys: ['ArrowRight'], run: step }, { id: 'setup.apply', label: 'Apply pending changes', group: 'Setup', keys: ['Mod+Enter'], run: () => undefined, palette: false }]}/>
      <CommandPalette navigation={[{ id: 'go.light', label: 'Light through the ZPF', group: 'Scenarios', run: go }]}/></>);
    expect(screen.queryByRole('combobox', { name: 'Command palette' })).toBeNull();
    act(() => { fireEvent.keyDown(window, { key: 'k', ctrlKey: true }); });
    expect(screen.getByText('Light through the ZPF')).toBeTruthy();
    expect(screen.getByTestId('palette-transport.step').textContent).toContain('→'); // its shortcut, on the right
    expect(screen.queryByText('Apply pending changes')).toBeNull(); // palette: false
    fireEvent.change(screen.getByRole('combobox', { name: 'Command palette' }), { target: { value: 'step' } });
    expect(screen.queryByText('Light through the ZPF')).toBeNull();
    fireEvent.click(screen.getByText('Step'));
    expect(step).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('combobox', { name: 'Command palette' })).toBeNull();
  });

  it('ignores Ctrl K from inside another dialog', () => {
    const view = render(<><div role="dialog"><button type="button">in Help</button></div><CommandPalette navigation={[]}/></>);
    fireEvent.keyDown(view.getByText('in Help'), { key: 'k', ctrlKey: true });
    expect(screen.queryByRole('combobox', { name: 'Command palette' })).toBeNull();
  });

  it('presses a listed key for its own component, and builds layer and parameter entries from a definition', () => {
    const seen: KeyboardEvent[] = [], listen = (e: KeyboardEvent) => seen.push(e);
    window.addEventListener('keydown', listen);
    press('Mod+.'); press('\\');
    window.removeEventListener('keydown', listen);
    expect(matches('Mod+.', seen[0])).toBe(true);
    expect(seen[1].key).toBe('\\');
    const onView = vi.fn(), layers = layerActions(DEFINITION, 'base', { bounds: true }, onView);
    expect(layers.map(l => l.label)).toEqual(['Hide Cell boundaries']); // only the scenario's layers
    layers[0].run(); expect(onView).toHaveBeenCalledWith('bounds', false);
    const openSetup = vi.fn(), params = parameterActions(DEFINITION, 'base', openSetup);
    expect(params.map(p => p.label)).toEqual(['Creation rate']); // range parameters have a value field
    params[0].run(); expect(openSetup).toHaveBeenCalled();
  });
});

describe('palette filter', () => {
  it('matches whole words in the label or group, not scattered letters', async () => {
    const { paletteFilter } = await import('../../src/workbench/CommandPalette');
    expect(paletteFilter('layer.shells', 'shell', ['Hide Zepton shells', 'Layers'])).toBe(1);
    expect(paletteFilter('layer.electric', 'shell', ['Show Radial E reference', 'Layers'])).toBe(0);
    expect(paletteFilter('go.vdw.pressure', 'waals pressure', ['Van der Waals & vacuum pressure › Reveal the pressure', 'Scenarios'])).toBe(1);
    expect(paletteFilter('layer.faraday', 'layers', ['Show Faraday lines', 'Layers'])).toBe(1);
  });
});
