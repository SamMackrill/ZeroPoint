// @vitest-environment jsdom
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { lightDefinition, mediumDefinition, electronDefinition, type MediumParams } from '../../src/experiments';
import { DEFAULT_LIGHT } from '../../src/light/model';
import type { Capabilities, RuntimeStatus } from '../../src/workbench/runtime';
import { getPath, withPaths } from '../../src/workbench/definition';
import { TimelineBar, speedLabel, timeText, trackLength, type TimelineRuntime } from '../../src/workbench/TimelineBar';
import { SetupPanel, ViewPanel, Inspector } from '../../src/workbench/Inspector';
import { Dock } from '../../src/workbench/Dock';
import { Rail, StatusBar } from '../../src/workbench/Chrome';
import { useRuntimeStatus } from '../../src/workbench/useRuntimeStatus';

const ALL: Capabilities = { run: true, step: true, jump: true, nextEvent: true, seek: true, reset: true, speed: true, live: false, configure: true, checkpoint: true, restore: true };

/** A fake runtime: records commands, and lets tests change its status and notify subscribers. */
function fakeRuntime(status: Partial<RuntimeStatus> = {}, capabilities: Partial<Capabilities> = {}) {
  const listeners = new Set<() => void>(), calls: unknown[][] = [];
  let current: RuntimeStatus = { running: false, tick: 0, time: 0, speed: 1, finished: false, ...status };
  const record = (name: string) => (...args: unknown[]) => { calls.push([name, ...args]); };
  const runtime: TimelineRuntime & { calls: unknown[][]; set(s: Partial<RuntimeStatus>): void } = {
    capabilities: { ...ALL, ...capabilities }, calls,
    run: record('run'), step: record('step'), jump: record('jump'), nextEvent: record('nextEvent'), seek: record('seek'), reset: record('reset'), speed: record('speed'),
    status: () => current,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    set(s) { current = { ...current, ...s }; for (const l of listeners) l(); },
  };
  return runtime;
}

describe('TimelineBar', () => {
  const light = lightDefinition.timeline('induction', DEFAULT_LIGHT);
  it('issues the shared commands and shows bounded time', async () => {
    const rt = fakeRuntime({ tick: 288, time: 2.4 });
    render(<TimelineBar runtime={rt} timeline={light} speeds={[0.25, 0.5, 1, 2, 4]} onCapture={() => rt.calls.push(['capture'])}/>);
    await userEvent.click(screen.getByTestId('transport-run'));
    await userEvent.click(screen.getByRole('button', { name: 'Step' }));
    await userEvent.click(screen.getByRole('button', { name: 'Next event' }));
    await userEvent.click(screen.getByRole('button', { name: 'Reset' }));
    await userEvent.click(screen.getByRole('radio', { name: '2× speed' }));
    await userEvent.click(screen.getByRole('button', { name: 'Pair 3 induced · 3.00 τ' }));
    await userEvent.click(screen.getByTestId('capture'));
    expect(rt.calls).toEqual([['run', true], ['step'], ['nextEvent'], ['reset'], ['speed', 2], ['seek', 360], ['capture']]);
    expect(screen.getByText('2.40 / 12 τ')).toBeTruthy();
  });
  it('follows capabilities: open timelines show progress and jump +1 τ instead of seeking', async () => {
    const rt = fakeRuntime({ tick: 292, time: 2.433, running: true }, { seek: false, nextEvent: false });
    render(<TimelineBar runtime={rt} timeline={mediumDefinition.timeline('balanced', mediumDefinition.defaultParams)} speeds={[1]}/>);
    expect(screen.queryByTestId('timeline')).toBeNull();
    expect(screen.getByRole('progressbar', { name: 'Elapsed time' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Jump +1 τ' }));
    await userEvent.click(screen.getByTestId('transport-run'));
    expect(rt.calls).toEqual([['jump', 1], ['run', false]]);
    expect(screen.getByText('2.433 τ · tick 292')).toBeTruthy();
  });
  it('restores ◆ checkpoints and disables playback at the end of a bounded timeline', async () => {
    const rt = fakeRuntime({ tick: 1440, time: 12, finished: true }), onMarker = vi.fn();
    render(<TimelineBar runtime={rt} timeline={light} speeds={[1]} markers={[{ id: 'a', tick: 600, label: 'Checkpoint 1' }]} onMarker={onMarker}/>);
    expect((screen.getByTestId('transport-run') as HTMLButtonElement).disabled).toBe(true);
    await userEvent.click(screen.getByRole('button', { name: 'Restore Checkpoint 1' }));
    expect(onMarker).toHaveBeenCalledWith({ id: 'a', tick: 600, label: 'Checkpoint 1' });
  });
  it('hides itself for static scenarios', () => {
    const { container } = render(<TimelineBar runtime={fakeRuntime()} timeline={{ kind: 'static', dt: 1, events: [] }} speeds={[1]}/>);
    expect(container.innerHTML).toBe('');
  });
  it('formats speeds, track lengths and time', () => {
    expect([0.1, 0.25, 0.5, 1, 4].map(speedLabel)).toEqual(['0.1×', '¼', '½', '1×', '4×']);
    const status = { running: false, tick: 50, time: 0.5, speed: 1, finished: false };
    expect(trackLength({ kind: 'open', dt: 0.01, events: [] }, status)).toBe(50);
    expect(trackLength(light, status)).toBe(1440);
    expect(timeText({ kind: 'loop', dt: 0.05, end: 120, events: [] }, status)).toBe('0.500 τ · tick 50');
  });
});

describe('useRuntimeStatus', () => {
  it('throttles subscription updates to the given rate', () => {
    vi.useFakeTimers();
    try {
      const rt = fakeRuntime(), renders = vi.fn();
      /** Show the tick and count renders. */
      function Probe() { const s = useRuntimeStatus(rt, 10); renders(); return <span>{s?.tick}</span>; }
      render(<Probe/>);
      const before = renders.mock.calls.length;
      act(() => { for (let i = 1; i <= 50; i++) rt.set({ tick: i }); });
      act(() => { vi.advanceTimersByTime(150); });
      expect(screen.getByText('50')).toBeTruthy();
      expect(renders.mock.calls.length - before).toBeLessThanOrEqual(3);
    } finally { vi.useRealTimers(); }
  });
});

describe('Setup and View panels', () => {
  /** Medium's Setup wired to local state, reporting live changes and applies. */
  function MediumSetup({ onLive, onApply }: { onLive(k: string, v: unknown): void; onApply(c: Record<string, unknown>): void }) {
    const [params, setParams] = useState<MediumParams>(mediumDefinition.defaultParams);
    return <SetupPanel definition={mediumDefinition} scenario="balanced" params={params}
      onLive={(k, v) => { onLive(k, v); setParams(p => withPaths(p, { [k]: v })); }} onApply={c => { onApply(c); setParams(p => withPaths(p, c)); }}/>;
  }
  it('applies live parameters at once and stages restart parameters behind the pending bar', async () => {
    const onLive = vi.fn(), onApply = vi.fn();
    render(<MediumSetup onLive={onLive} onApply={onApply}/>);
    const rate = screen.getByRole('textbox', { name: 'Creation rate' });
    await userEvent.clear(rate); await userEvent.type(rate, '2000{Enter}');
    expect(onLive).toHaveBeenCalledWith('birthRate', 2000);
    expect(screen.queryByRole('status')).toBeNull();
    const seed = screen.getByRole('textbox', { name: /^Seed/ });
    await userEvent.clear(seed); await userEvent.type(seed, '7{Enter}');
    expect(screen.getByRole('status').textContent).toContain('1 change needs restart');
    expect(onApply).not.toHaveBeenCalled();
    await userEvent.click(screen.getByTestId('params-apply'));
    expect(onApply).toHaveBeenCalledWith({ seed: 7 });
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('reverts staged changes with Esc and applies with Ctrl ⏎', async () => {
    const onApply = vi.fn();
    render(<MediumSetup onLive={() => undefined} onApply={onApply}/>);
    const seed = screen.getByRole('textbox', { name: /^Seed/ });
    await userEvent.clear(seed); await userEvent.type(seed, '9{Enter}');
    fireEvent.keyDown(seed, { key: 'Escape' });
    expect(screen.queryByRole('status')).toBeNull();
    await userEvent.clear(seed); await userEvent.type(seed, '11{Enter}');
    fireEvent.keyDown(seed, { key: 'Enter', ctrlKey: true });
    expect(onApply).toHaveBeenCalledWith({ seed: 11 });
  });
  it('shows only the controls a scenario uses, with choices as segmented controls', () => {
    const { rerender } = render(<SetupPanel definition={electronDefinition} scenario="stationary" params={electronDefinition.defaultParams} onLive={() => undefined} onApply={() => undefined}/>);
    expect(screen.queryByRole('textbox', { name: 'Velocity' })).toBeNull();
    expect(screen.getByRole('radio', { name: 'spin up' }).getAttribute('aria-checked')).toBe('true');
    rerender(<SetupPanel definition={electronDefinition} scenario="radius-limit" params={electronDefinition.defaultParams} onLive={() => undefined} onApply={() => undefined}/>);
    expect(screen.getByText('This scenario has no parameters.')).toBeTruthy();
  });
  it('shows display scales and restart marks (Light wavelength in nm)', () => {
    render(<SetupPanel definition={lightDefinition} scenario="induction" params={DEFAULT_LIGHT} onLive={() => undefined} onApply={() => undefined}/>);
    expect(screen.getByRole('textbox', { name: /^Wavelength/ })).toHaveProperty('value', '500');
    expect(screen.getAllByLabelText('applies on restart').length).toBeGreaterThan(3);
  });
  it('toggles layers, nests layer-bound controls, and changes view controls', async () => {
    const onView = vi.fn();
    /** Medium's View wired to local state. */
    function MediumView() {
      const [view, setView] = useState(mediumDefinition.defaultView);
      return <ViewPanel definition={mediumDefinition} scenario="balanced" view={view} onView={(k, v) => { onView(k, v); setView(old => withPaths(old, { [k]: v })); }}/>;
    }
    render(<MediumView/>);
    expect(screen.queryByRole('slider', { name: 'Slice Z' })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: 'Energy density slice' }));
    expect(onView).toHaveBeenCalledWith('slice', true);
    expect(screen.getByRole('slider', { name: 'Slice Z' })).toBeTruthy();
    await userEvent.click(screen.getByRole('radio', { name: 'Points' }));
    expect(onView).toHaveBeenCalledWith('representation', 'points');
    expect(getPath({ a: { b: 1 } }, 'a.b')).toBe(1);
  });
  it('defaults the Selection tab to an empty state', async () => {
    render(<Inspector setup={<p>setup</p>} view={<p>view</p>}/>);
    await userEvent.click(screen.getByRole('tab', { name: 'Selection' }));
    expect(screen.getByText('Click something in the viewport to inspect it.')).toBeTruthy();
  });
});

describe('Dock, Rail and StatusBar', () => {
  it('keeps the readout strip when the dock collapses', async () => {
    const onCollapsed = vi.fn();
    const { rerender } = render(<Dock readouts={[{ label: 'Active', value: '1,575' }, { label: 'Time', value: '2.433', unit: 'τ' }]} tabs={[{ id: 'plots', label: 'Plots', content: <p>plot</p> }]} onCollapsedChange={onCollapsed}/>);
    expect(screen.getByText('plot')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Collapse dock' }));
    expect(onCollapsed).toHaveBeenCalledWith(true);
    rerender(<Dock readouts={[{ label: 'Active', value: '1,575' }]} tabs={[{ id: 'plots', label: 'Plots', content: <p>plot</p> }]} collapsed onCollapsedChange={onCollapsed}/>);
    expect(screen.queryByText('plot')).toBeNull();
    expect(screen.getByText('1,575')).toBeTruthy();
  });
  it('switches experiments and the active experiment\'s scenarios, and lists planned work', async () => {
    const onExperiment = vi.fn(), onScenario = vi.fn();
    render(<Rail experiments={[{ id: 'medium', title: 'Medium lifecycle', scenarios: mediumDefinition.scenarios }, { id: 'light', title: 'Light through the ZPF' }]}
      planned={[{ id: 'lamb', title: 'Lamb shift', summary: 'Levels.' }]} experiment="medium" scenario="balanced" onExperiment={onExperiment} onScenario={onScenario}/>);
    await userEvent.click(screen.getByTestId('lab-light'));
    await userEvent.click(screen.getByTestId('scenario-slow'));
    expect(onExperiment).toHaveBeenCalledWith('light');
    expect(onScenario).toHaveBeenCalledWith('medium', 'slow');
    expect(screen.getByTestId('scenario-balanced').getAttribute('aria-current')).toBe('true');
    await userEvent.click(screen.getByRole('button', { name: /Lamb shift/ }));
    expect(screen.getByText('Levels.')).toBeTruthy();
  });
  it('shows the run state in the status bar', () => {
    render(<StatusBar running={false} items={['Seed 2026', 'Tick 292']}/>);
    expect(screen.getByText('Paused')).toBeTruthy();
    expect(screen.getByText('Tick 292')).toBeTruthy();
  });
});
