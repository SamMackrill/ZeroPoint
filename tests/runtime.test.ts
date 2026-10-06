import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_PARAMETERS, type Snapshot } from '../src/model/types';
import { LIGHT_END_TICK, type LightSnapshot } from '../src/light/model';
import type { ElectronSnapshot } from '../src/electron/model';
import { electronRuntime, lightRuntime, mediumRuntime, UnsupportedCommand, type WorkerChannel } from '../src/workbench/runtime';
import { MAX_STEPS_PER_FRAME, MainThreadRuntime, type MainThreadModel, type Scheduler } from '../src/workbench/main-thread-runtime';
import { casimirModel, dipoleClockModel, VDW_LOOP_TICKS } from '../src/workbench/main-thread-models';

/** A fake worker channel that records commands and lets tests push states through the sink. */
function channel<C, S>(state: S | null = null) {
  const sent: C[] = [], previous = vi.fn();
  const ch: WorkerChannel<C, S> & { sent: C[]; push(s: S): void; previous: typeof previous } = {
    sent, previous, send: c => { sent.push(c); }, latest: { current: state }, sink: { current: previous },
    push(s) { ch.latest.current = s; ch.sink.current?.(s); },
  };
  return ch;
}

const medium = { seed: 7, parameters: DEFAULT_PARAMETERS, running: false, speed: 1, diagnostics: { tick: 240, time: 2 } } as unknown as Snapshot;

describe('mediumRuntime', () => {
  it('maps the shared commands onto the Medium worker protocol', () => {
    const ch = Object.assign(channel<unknown, Snapshot>(medium), { checkpoint: vi.fn() });
    const rt = mediumRuntime(ch as never);
    rt.run(true); rt.step(); rt.reset(); rt.speed(2); rt.setLive({ birthRate: 9 }); rt.configure({ seed: 3, parameters: DEFAULT_PARAMETERS });
    expect(ch.sent).toEqual([
      { type: 'running', value: true }, { type: 'step' }, { type: 'reset', seed: 7, parameters: DEFAULT_PARAMETERS }, { type: 'speed', value: 2 },
      { type: 'parameters', value: { ...DEFAULT_PARAMETERS, birthRate: 9 } }, { type: 'reset', seed: 3, parameters: DEFAULT_PARAMETERS },
    ]);
    expect(rt.status()).toEqual({ running: false, tick: 240, time: 2, speed: 1, finished: false });
  });
  it('jumps one τ as 120 fixed steps, and leaves seeking to checkpoints', () => {
    const ch = Object.assign(channel<{ type: string }, Snapshot>(medium), { checkpoint: vi.fn() });
    const rt = mediumRuntime(ch as never);
    rt.jump(1);
    expect(ch.sent).toHaveLength(120);
    expect(rt.capabilities.seek).toBe(false);
    expect(() => rt.seek(10)).toThrow(UnsupportedCommand);
    expect(() => rt.nextEvent()).toThrow(UnsupportedCommand);
    expect(() => rt.speed(3)).toThrow('Invalid playback speed');
  });
  it('fans states out to subscribers, keeps the previous sink, and restores it on dispose', () => {
    const ch = Object.assign(channel<unknown, Snapshot>(null), { checkpoint: vi.fn() });
    const rt = mediumRuntime(ch as never), listener = vi.fn();
    expect(() => rt.reset()).toThrow('before the Medium worker has started');
    const off = rt.subscribe(listener);
    ch.push(medium);
    expect(listener).toHaveBeenCalledWith(medium);
    expect(ch.previous).toHaveBeenCalledWith(medium);
    off(); ch.push(medium);
    expect(listener).toHaveBeenCalledTimes(1);
    rt.dispose();
    expect(ch.sink.current).toBe(ch.previous);
  });
});

describe('run intent', () => {
  it('reports a just-sent Run until the worker confirms it, so a quick second press pauses', () => {
    const ch = Object.assign(channel<{ type: string; value?: boolean }, Snapshot>(medium), { checkpoint: vi.fn() });
    const rt = mediumRuntime(ch as never);
    rt.run(!rt.status().running); // Run: the worker has not replied yet
    expect(rt.status().running).toBe(true);
    rt.run(!rt.status().running); // a second press straight after sends Pause, not Run again
    expect(ch.sent).toEqual([{ type: 'running', value: true }, { type: 'running', value: false }]);
    ch.push({ ...medium, running: false }); // the worker settles paused
    expect(rt.status().running).toBe(false);
    rt.run(true); rt.step(); // stepping supersedes the pending Run (the worker pauses to step)
    expect(rt.status().running).toBe(false);
  });
  it('keeps a pending Pause through the worker’s late reply to the Run before it', () => {
    const ch = Object.assign(channel<{ type: string; value?: boolean }, Snapshot>(medium), { checkpoint: vi.fn() });
    const rt = mediumRuntime(ch as never);
    rt.run(true); rt.run(false); // the state on hand already reads paused, but it predates both presses
    expect(rt.status().running).toBe(false);
    ch.push({ ...medium, running: true }); // the worker acts on the Run
    expect(rt.status().running).toBe(false); // still Pause, so the next press sends Run rather than Pause again
    ch.push({ ...medium, running: false }); // then on the Pause
    expect(rt.status().running).toBe(false);
    ch.push({ ...medium, running: true }); // the intent is settled: later reports read through
    expect(rt.status().running).toBe(true);
  });
  it('drops a pending Run at a bounded timeline’s end, when the final report overtook the Running one', () => {
    const near = { model: 'light', tick: LIGHT_END_TICK - 1, parameters: {}, running: false, speed: 1 } as unknown as LightSnapshot;
    const ch = channel<unknown, LightSnapshot>(near), rt = lightRuntime(ch as never);
    rt.run(true);
    ch.push({ ...near, running: true }); ch.push({ ...near, tick: LIGHT_END_TICK, running: false }); // both before status() is read
    expect(rt.status()).toMatchObject({ running: false, finished: true });
  });
  it('gives up on an intent the worker never confirms after a second', () => {
    vi.useFakeTimers();
    const ch = channel<unknown, LightSnapshot>({ model: 'light', tick: 0, parameters: {}, running: false, speed: 1 } as unknown as LightSnapshot), rt = lightRuntime(ch as never);
    rt.run(true); expect(rt.status().running).toBe(true);
    vi.advanceTimersByTime(1100); expect(rt.status().running).toBe(false); // the worker refused (e.g. the sequence had finished)
    vi.useRealTimers();
  });
});

describe('tick runtimes', () => {
  const light = { model: 'light', tick: 100, parameters: { wavelength: 625 }, running: true, speed: 1 } as unknown as LightSnapshot;
  it('Light seeks within its bounds, uses its own next-induction command, and checkpoints without playback fields', async () => {
    const ch = channel<unknown, LightSnapshot>(light), rt = lightRuntime(ch as never);
    rt.jump(1); rt.jump(100); rt.nextEvent(); rt.seek(-5);
    expect(ch.sent).toEqual([{ type: 'seek', tick: 220 }, { type: 'seek', tick: LIGHT_END_TICK }, { type: 'next' }, { type: 'seek', tick: 0 }]);
    expect(await rt.checkpoint()).toEqual({ model: 'light', tick: 100, parameters: { wavelength: 625 } });
    expect(rt.capabilities.live).toBe(false);
    expect(() => rt.setLive(undefined as never)).toThrow(UnsupportedCommand);
    ch.push({ ...light, tick: LIGHT_END_TICK, running: false });
    expect(rt.status()).toMatchObject({ finished: true, running: false, time: LIGHT_END_TICK / 120 });
  });
  it('Electron goes to the next milestone the definition names, or reports no next-event capability', () => {
    const state = { model: 'electron', tick: 400, parameters: {}, running: false, speed: 1 } as unknown as ElectronSnapshot;
    const ch = channel<unknown, ElectronSnapshot>(state), rt = electronRuntime(ch as never, () => [2880, 360]);
    rt.nextEvent();
    expect(ch.sent).toEqual([{ type: 'seek', tick: 2880 }]);
    const bare = electronRuntime(channel<unknown, ElectronSnapshot>(state) as never);
    expect(bare.capabilities.nextEvent).toBe(false);
    expect(() => bare.nextEvent()).toThrow(UnsupportedCommand);
  });
});

/** A scheduler whose frames run only when the test advances time. */
function fakeScheduler() {
  let now = 0, next = 1;
  const frames = new Map<number, (t: number) => void>();
  const scheduler: Scheduler & { advance(ms: number): void; pending(): number } = {
    now: () => now, frame: cb => { frames.set(next, cb); return next++; }, cancel: h => { frames.delete(h); },
    advance(ms) { now += ms; const due = [...frames.values()]; frames.clear(); for (const cb of due) cb(now); },
    pending: () => frames.size,
  };
  return scheduler;
}

/** A counter model stepping 1/30 τ, optionally bounded. */
function counter(end?: number): MainThreadModel<number> & { ticks: number } {
  const m = { ticks: 0, dt: 1 / 30, end, step: () => { m.ticks++; }, reset: () => { m.ticks = 0; }, tick: () => m.ticks, snapshot: () => m.ticks };
  return m;
}

describe('MainThreadRuntime', () => {
  it('runs whole fixed steps for elapsed time, scaled by speed, and publishes each frame', () => {
    const s = fakeScheduler(), m = counter(), rt = new MainThreadRuntime(m, s, undefined), seen: number[] = [];
    rt.subscribe(v => seen.push(v));
    rt.run(true);
    s.advance(100);
    expect(m.ticks).toBe(3);
    rt.speed(2);
    s.advance(50);
    expect(m.ticks).toBe(6);
    expect(seen.at(-1)).toBe(6);
    expect(rt.status()).toMatchObject({ running: true, tick: 6, speed: 2 });
  });
  it('bounds catch-up after a stall, so model time slows instead of jumping', () => {
    const s = fakeScheduler(), m = counter(), rt = new MainThreadRuntime(m, s, undefined);
    rt.speed(4); rt.run(true);
    s.advance(5000);
    expect(m.ticks).toBe(MAX_STEPS_PER_FRAME);
  });
  it('pauses at the end of a bounded timeline and will not run past it', () => {
    const s = fakeScheduler(), m = counter(4), rt = new MainThreadRuntime(m, s, undefined);
    rt.run(true); s.advance(100); s.advance(100);
    expect(m.ticks).toBe(4);
    expect(rt.status()).toMatchObject({ running: false, finished: true });
    expect(s.pending()).toBe(0);
    rt.run(true);
    expect(rt.status().running).toBe(false);
  });
  it('steps, jumps and resets while paused, and stops scheduling frames on pause', () => {
    const s = fakeScheduler(), m = counter(), rt = new MainThreadRuntime(m, s, undefined);
    rt.run(true); rt.step();
    expect(rt.status().running).toBe(false);
    expect(s.pending()).toBe(0);
    rt.jump(1);
    expect(m.ticks).toBe(31);
    rt.reset();
    expect(rt.latest()).toBe(0);
    expect(() => rt.seek()).toThrow(UnsupportedCommand);
    expect(() => rt.configure(undefined as never)).toThrow(UnsupportedCommand);
    return expect(rt.checkpoint()).rejects.toThrow(UnsupportedCommand);
  });
  it('pauses when the tab is hidden', () => {
    const doc = Object.assign(new EventTarget(), { hidden: false }) as unknown as Document;
    const s = fakeScheduler(), rt = new MainThreadRuntime(counter(), s, doc);
    const detach = rt.attach();
    rt.run(true);
    (doc as unknown as { hidden: boolean }).hidden = true;
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(rt.status().running).toBe(false);
    detach(); rt.run(true);
    doc.dispatchEvent(new Event('visibilitychange'));
    expect(rt.status().running).toBe(true);
    rt.dispose();
  });
});

describe('main-thread models', () => {
  it('Casimir restarts with new parameters and resets to them', () => {
    const s = fakeScheduler(), rt = new MainThreadRuntime(casimirModel(), s, undefined);
    rt.speed(0.1);
    expect(() => rt.speed(4)).toThrow('Invalid playback speed 4; use one of 0.1, 0.25, 0.5, 1, 2.');
    rt.jump(1);
    expect(rt.status().tick).toBe(30);
    rt.configure({ pair: 'electron-proton', separation: 6 });
    expect(rt.latest()).toMatchObject({ tick: 0, pair: 'electron-proton', separation: 6 });
    rt.step(); rt.reset();
    expect(rt.latest()).toMatchObject({ tick: 0, pair: 'electron-proton' });
  });
  it('the van der Waals dipole clock loops every 120 ticks', () => {
    const rt = new MainThreadRuntime(dipoleClockModel(), fakeScheduler(), undefined);
    rt.jump(0.05 * (VDW_LOOP_TICKS + 15));
    expect(rt.latest()).toEqual({ tick: 15, phase: 45 });
  });
});
