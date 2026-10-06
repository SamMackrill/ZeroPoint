// Runtime adapter (docs/ui-redesign-plan.html §14): one command vocabulary for every experiment, so the shell's
// timeline bar drives Medium, Light, Electron, Casimir and van der Waals alike. Worker protocols are unchanged: the
// worker adapters wrap each lab's existing hook (its send, latest and sink), and main-thread labs use MainThreadRuntime.
// Per-tick state reaches renderers and plots through subscribe(), never through shell-level React state.
import { DT, type Checkpoint, type Command, type Parameters, type Snapshot } from '../model/types';
import { LIGHT_DT, LIGHT_END_TICK, type LightCommand, type LightParameters, type LightSnapshot, type LightState } from '../light/model';
import { ELECTRON_DT, ELECTRON_END, type ElectronCommand, type ElectronParameters, type ElectronSnapshot, type ElectronState } from '../electron/model';

/** The standard playback speeds (the timeline bar's ¼ ½ 1× 2× 4×); a definition may set its own (Casimir 0.1–2×). */
export const SPEEDS = [0.25, 0.5, 1, 2, 4] as const;

/** Which commands a runtime supports; drives which timeline-bar controls are enabled. */
export interface Capabilities {
  run: boolean;
  step: boolean;
  /** Jump forward by a model-time interval (e.g. +1 τ). */
  jump: boolean;
  /** Go to the next named event (induction, milestone). */
  nextEvent: boolean;
  /** Seek to any tick (bounded timelines). */
  seek: boolean;
  reset: boolean;
  speed: boolean;
  /** Apply parameters without a restart. */
  live: boolean;
  /** Apply parameters by restarting (↻). */
  configure: boolean;
  checkpoint: boolean;
  restore: boolean;
}

/** Where a runtime is: what the timeline bar and readout strip show. */
export interface RuntimeStatus {
  running: boolean;
  tick: number;
  /** Model time in τ. */
  time: number;
  speed: number;
  /** A bounded timeline has reached its end. */
  finished: boolean;
}

/**
 * The normalised commands. S is the per-tick state, L the live parameters, P the restart parameters and C a
 * checkpoint. Commands a runtime does not support (see capabilities) throw UnsupportedCommand.
 */
export interface Runtime<S, L = never, P = never, C = never> {
  readonly capabilities: Capabilities;
  run(on: boolean): void;
  step(): void;
  jump(tau: number): void;
  nextEvent(): void;
  seek(tick: number): void;
  reset(): void;
  speed(value: number): void;
  setLive(parameters: L): void;
  configure(parameters: P): void;
  checkpoint(): Promise<C>;
  restore(checkpoint: C): void;
  /** Receive every new state; returns the unsubscribe function. */
  subscribe(listener: (state: S) => void): () => void;
  latest(): S | null;
  status(): RuntimeStatus;
  dispose(): void;
}

/** Thrown when the shell calls a command the runtime's capabilities say it lacks. */
export class UnsupportedCommand extends Error {
  constructor(command: string) { super(`This experiment does not support ${command}.`); this.name = 'UnsupportedCommand'; }
}

/** Validate a playback speed against the experiment's speed set (the standard set unless the definition says otherwise). */
export function checkSpeed(value: number, speeds: readonly number[] = SPEEDS): number {
  if (!speeds.includes(value)) throw new Error(`Invalid playback speed ${value}; use one of ${speeds.join(', ')}.`);
  return value;
}

/** The part of a lab's worker hook an adapter needs: its command sender and its latest-state and sink refs. */
export interface WorkerChannel<Command, State> {
  send(command: Command): void;
  latest: { current: State | null };
  sink: { current: ((state: State) => void) | null };
}

/** A set of listeners fed from a channel's sink; the previous sink keeps receiving states. */
function fanOut<State>(channel: WorkerChannel<unknown, State>) {
  const listeners = new Set<(state: State) => void>(), previous = channel.sink.current;
  const sink = (state: State) => { previous?.(state); for (const listener of listeners) listener(state); };
  channel.sink.current = sink;
  return {
    subscribe(listener: (state: State) => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    dispose() { listeners.clear(); if (channel.sink.current === sink) channel.sink.current = previous; },
  };
}

/** Medium's restart parameters: a seed and the physical parameters. */
export interface MediumConfig { seed: number; parameters: Parameters }

/** The Medium worker hook (useSimulation): its channel plus the promise-based checkpoint request. */
export interface MediumChannel extends WorkerChannel<Command, Snapshot> {
  checkpoint(): Promise<Checkpoint>;
}

/**
 * The latest Run or Pause sent to a worker. status() reports it until the worker confirms it (or 1 s passes, in case it
 * refused), so a second press straight after the first reads the intended state, not the worker's last report, and
 * sends Pause rather than Run again. Any other command (step, seek, reset, restore) supersedes it.
 */
function runIntent() {
  let pending: { on: boolean; at: number } | null = null;
  return {
    sent(on: boolean) { pending = { on, at: performance.now() }; },
    clear() { pending = null; },
    running(reported: boolean | undefined) {
      if (pending && (reported === pending.on || performance.now() - pending.at > 1000)) pending = null;
      return pending ? pending.on : reported ?? false;
    },
  };
}

/**
 * Medium: an open-ended timeline. Parameters are live, the seed restarts (configure), jump steps through model time,
 * and seeking is the shell's job (restore the nearest checkpoint), so seek and nextEvent are unsupported.
 */
export function mediumRuntime(channel: MediumChannel): Runtime<Snapshot, Partial<Parameters>, MediumConfig, Checkpoint> {
  const listeners = fanOut(channel), now = () => channel.latest.current;
  const require = (command: string) => { const state = now(); if (!state) throw new Error(`Cannot ${command} before the Medium worker has started.`); return state; };
  const intent = runIntent();
  return {
    capabilities: { run: true, step: true, jump: true, nextEvent: false, seek: false, reset: true, speed: true, live: true, configure: true, checkpoint: true, restore: true },
    run: on => { intent.sent(on); channel.send({ type: 'running', value: on }); },
    step: () => { intent.clear(); channel.send({ type: 'step' }); },
    jump: tau => { intent.clear(); for (let i = Math.round(tau / DT); i > 0; i--) channel.send({ type: 'step' }); },
    nextEvent: () => { throw new UnsupportedCommand('next event'); },
    seek: () => { throw new UnsupportedCommand('seek'); },
    reset: () => { const state = require('reset'); intent.clear(); channel.send({ type: 'reset', seed: state.seed, parameters: state.parameters }); },
    speed: value => channel.send({ type: 'speed', value: checkSpeed(value) }),
    setLive: parameters => channel.send({ type: 'parameters', value: { ...require('change parameters').parameters, ...parameters } }),
    configure: ({ seed, parameters }) => { intent.clear(); channel.send({ type: 'reset', seed, parameters }); },
    checkpoint: () => channel.checkpoint(),
    restore: checkpoint => { intent.clear(); channel.send({ type: 'restore', checkpoint }); },
    subscribe: listeners.subscribe,
    latest: now,
    status: () => { const s = now(); return { running: intent.running(s?.running), tick: s?.diagnostics.tick ?? 0, time: s?.diagnostics.time ?? 0, speed: s?.speed ?? 1, finished: false }; },
    dispose: listeners.dispose,
  };
}

/** Options for a bounded, tick-based worker (Light, Electron). */
interface TickOptions<S> {
  dt: number;
  end: number;
  /** Ticks of named events for nextEvent, when the worker has no "next" command of its own. */
  events?(state: S): readonly number[];
  /** The worker's own next-event command (Light's "next induction"). */
  next?: boolean;
}

/** A bounded, tick-based worker runtime; checkpoints are the state without playback fields. */
function tickRuntime<Command extends { type: string }, S extends { tick: number; running: boolean; speed: number }, P, C>(channel: WorkerChannel<Command, S>, options: TickOptions<S>, toCheckpoint: (state: S) => C) {
  const listeners = fanOut(channel), now = () => channel.latest.current;
  const intent = runIntent();
  // Every command but Run and speed supersedes a pending Run or Pause (they pause, or replace the run).
  const send = (command: unknown) => { if (!['run', 'speed'].includes((command as { type: string }).type)) intent.clear(); channel.send(command as Command); };
  const tick = () => now()?.tick ?? 0;
  const seek = (target: number) => send({ type: 'seek', tick: Math.max(0, Math.min(options.end, Math.round(target))) });
  const runtime: Runtime<S, never, P, C> = {
    capabilities: { run: true, step: true, jump: true, nextEvent: Boolean(options.next || options.events), seek: true, reset: true, speed: true, live: false, configure: true, checkpoint: true, restore: true },
    run: on => { send({ type: 'run', value: on }); intent.sent(on); },
    step: () => send({ type: 'step' }),
    jump: tau => seek(tick() + tau / options.dt),
    nextEvent: () => {
      if (options.next) { send({ type: 'next' }); return; }
      const state = now();
      if (!options.events || !state) throw new UnsupportedCommand('next event');
      const target = [...options.events(state)].sort((a, b) => a - b).find(t => t > state.tick);
      if (target !== undefined) seek(target);
    },
    seek,
    reset: () => send({ type: 'reset' }),
    speed: value => send({ type: 'speed', value: checkSpeed(value) }),
    setLive: () => { throw new UnsupportedCommand('live parameters'); },
    configure: parameters => send({ type: 'configure', parameters }),
    checkpoint: () => { const state = now(); return state ? Promise.resolve(toCheckpoint(state)) : Promise.reject(new Error('No state to checkpoint yet.')); },
    restore: state => send({ type: 'restore', state }),
    subscribe: listeners.subscribe,
    latest: now,
    status: () => { const s = now(); return { running: intent.running(s?.running), tick: tick(), time: tick() * options.dt, speed: s?.speed ?? 1, finished: tick() >= options.end }; },
    dispose: listeners.dispose,
  };
  return runtime;
}

/** Light: bounded at 0–12 τ; every parameter restarts the sequence, and nextEvent is the next induction. */
export function lightRuntime(channel: WorkerChannel<LightCommand, LightSnapshot>): Runtime<LightSnapshot, never, LightParameters, LightState> {
  return tickRuntime<LightCommand, LightSnapshot, LightParameters, LightState>(channel, { dt: LIGHT_DT, end: LIGHT_END_TICK, next: true }, ({ model, tick, parameters }) => ({ model, tick, parameters: { ...parameters } }));
}

/** Electron: bounded at 0–48 τ; nextEvent goes to the next milestone the definition names for the current mode. */
export function electronRuntime(channel: WorkerChannel<ElectronCommand, ElectronSnapshot>, milestones?: (state: ElectronSnapshot) => readonly number[]): Runtime<ElectronSnapshot, never, ElectronParameters, ElectronState> {
  return tickRuntime<ElectronCommand, ElectronSnapshot, ElectronParameters, ElectronState>(channel, { dt: ELECTRON_DT, end: ELECTRON_END, events: milestones }, ({ model, tick, parameters }) => ({ model, tick, parameters: { ...parameters } }));
}
