// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { cameraActions, keyLabel, matches, useActions, type Action } from '../../src/workbench/actions';
import { AboutSheet, ORBIT_GESTURES } from '../../src/workbench/AboutSheet';
import { transportActions, type TimelineRuntime } from '../../src/workbench/TimelineBar';
import type { TimelineSpec } from '../../src/workbench/definition';

const key = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

/** Mount a lab's action listener with a field, a segmented radio and a dialog to type into. */
function Lab({ actions, active = true }: { actions: Action[]; active?: boolean }) {
  useActions(active, actions);
  return <><input aria-label="field"/><button type="button" role="radio" aria-checked="false">option</button><div role="dialog"><button type="button">in dialog</button></div></>;
}

/** A runtime double recording the timeline bar's commands. */
function runtime(status = { running: false, tick: 50, time: 0.5, speed: 1, finished: false }): TimelineRuntime & { calls: string[] } {
  const calls: string[] = [];
  return {
    calls, capabilities: { run: true, step: true, jump: false, nextEvent: true, seek: true, reset: true, speed: true, live: true, configure: false, checkpoint: false, restore: false },
    status: () => status, subscribe: () => () => undefined,
    run: on => calls.push(`run ${on}`), step: () => calls.push('step'), jump: t => calls.push(`jump ${t}`), nextEvent: () => calls.push('next'),
    seek: t => calls.push(`seek ${t}`), reset: () => calls.push('reset'), speed: v => calls.push(`speed ${v}`),
  };
}
const TIMELINE: TimelineSpec = { kind: 'bounded', dt: 0.01, end: 200, next: 'event', events: [{ tick: 20, label: 'a' }, { tick: 80, label: 'b' }] };

describe('action registry', () => {
  it('matches bindings: modifiers exactly, letters in either case, symbols whatever Shift types them', () => {
    expect(matches('Space', key({ key: ' ', code: 'Space' }))).toBe(true);
    expect(matches('Space', key({ key: ' ', code: 'Space', shiftKey: true }))).toBe(false);
    expect(matches('Shift+ArrowRight', key({ key: 'ArrowRight', shiftKey: true }))).toBe(true);
    expect(matches('ArrowRight', key({ key: 'ArrowRight', shiftKey: true }))).toBe(false);
    expect(matches('Mod+s', key({ key: 'S', ctrlKey: true, shiftKey: true }))).toBe(false); // Ctrl Shift S is not Ctrl S
    expect(matches('Mod+s', key({ key: 's', metaKey: true }))).toBe(true);
    expect(matches('c', key({ key: 'c', ctrlKey: true }))).toBe(false);
    expect(matches('<', key({ key: '<', shiftKey: true }))).toBe(true);
    expect(matches('1', key({ key: '1' }))).toBe(true);
    expect(keyLabel('Shift+ArrowRight')).toEqual(['Shift', '→']);
  });

  it('runs actions, but not from fields, dialogs, a focused control\'s own keys, handled events, repeats or when disabled', () => {
    const run = vi.fn(), off = vi.fn(), held = vi.fn();
    const view = render(<Lab actions={[{ id: 'a', label: 'A', group: 'View', keys: ['a', 'Space', 'ArrowRight'], run }, { id: 'b', label: 'B', group: 'View', keys: ['b'], run: off, disabled: true }, { id: 'h', label: 'H', group: 'View', keys: ['h'], run: held, repeat: true }]}/>);
    fireEvent.keyDown(window, { key: 'a' });
    expect(run).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(view.getByLabelText('field'), { key: 'a' });
    fireEvent.keyDown(view.getByText('in dialog'), { key: 'a' });
    fireEvent.keyDown(view.getByText('option'), { key: ' ', code: 'Space' });
    fireEvent.keyDown(view.getByText('option'), { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'a', repeat: true });
    const handled = new KeyboardEvent('keydown', { key: 'a', cancelable: true }); handled.preventDefault(); window.dispatchEvent(handled);
    expect(run).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(view.getByText('option'), { key: 'a' }); // a letter on a focused control is still a shortcut
    expect(run).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(window, { key: 'b' }); expect(off).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: 'h', repeat: true }); expect(held).toHaveBeenCalledTimes(1);
    view.rerender(<Lab active={false} actions={[{ id: 'a', label: 'A', group: 'View', keys: ['a'], run }]}/>);
    fireEvent.keyDown(window, { key: 'a' });
    expect(run).toHaveBeenCalledTimes(2);
  });

  it('maps the timeline bar\'s commands to keys, following the runtime and timeline', () => {
    const rt = runtime(), capture = vi.fn();
    const actions = transportActions(rt, TIMELINE, [0.5, 1, 2], { onCapture: capture });
    const fire = (id: string) => actions.find(a => a.id === id)!.run();
    expect(actions.map(a => a.keys![0])).toEqual(['Space', 'ArrowRight', ']', '[', 'Home', '<', '>', 'c']); // no jump: the runtime cannot
    fire('transport.run'); fire('transport.step'); fire('transport.next'); fire('transport.previous'); fire('transport.reset'); fire('transport.slower'); fire('transport.faster'); fire('transport.capture');
    expect(rt.calls).toEqual(['run true', 'step', 'next', 'seek 20', 'reset', 'speed 0.5', 'speed 2']);
    expect(capture).toHaveBeenCalled();
    const held = runtime(); transportActions(held, TIMELINE, [1], { runDisabled: true }).find(a => a.id === 'transport.run')!.run();
    expect(held.calls).toEqual([]); // Run is held (e.g. a lost graphics context)
    expect(transportActions(rt, { ...TIMELINE, kind: 'static' }, [1])).toEqual([]);
    expect(cameraActions([{ id: 'orbit', label: 'Orbit' }, { id: 'side', label: 'Side' }], () => undefined).map(a => a.keys)).toEqual([['1'], ['2']]);
  });

  it('lists the lab\'s shortcuts by group in the Help sheet', () => {
    render(<AboutSheet open section="shortcuts" onOpenChange={() => undefined} onSection={() => undefined} experiment="Medium" active sections={[{ id: 'scenario', content: <p>notes</p> }]}
      shortcuts={transportActions(runtime(), TIMELINE, [1, 2])}/>);
    expect(screen.getByRole('region', { name: 'Transport shortcuts' }).textContent).toContain('Run / Pause');
    expect(screen.getByText('Previous event').closest('div')!.querySelector('kbd')!.textContent).toBe('[');
  });
  it('lists the viewport’s pointer gestures first, where the one-time orbit hint moves to', () => {
    render(<AboutSheet open section="shortcuts" onOpenChange={() => undefined} onSection={() => undefined} experiment="Medium" active sections={[{ id: 'scenario', content: <p>notes</p> }]}
      shortcuts={transportActions(runtime(), TIMELINE, [1, 2])} pointer={ORBIT_GESTURES}/>);
    const regions = screen.getAllByRole('region');
    expect(regions[0].getAttribute('aria-label')).toBe('Mouse and touch');
    expect(screen.getByText('Orbit the camera').closest('div')!.textContent).toContain('Drag');
  });
});
