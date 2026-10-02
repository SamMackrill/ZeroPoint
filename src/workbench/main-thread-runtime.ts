// MainThreadRuntime (docs/ui-redesign-plan.html §14): Casimir and van der Waals simulate on the main thread, so this
// driver gives them what the workers already have — a fixed-step accumulator with bounded catch-up, playback speed and
// a hidden-tab pause — behind the same Runtime interface.
import { checkSpeed, SPEEDS, UnsupportedCommand, type Capabilities, type Runtime, type RuntimeStatus } from './runtime';

/** A main-thread model: fixed steps of `dt` τ, a tick count and a snapshot for subscribers. */
export interface MainThreadModel<S, P = never, C = never> {
  /** Model time per step, in τ; at 1× one τ of model time passes per second. */
  readonly dt: number;
  step(): void;
  reset(): void;
  tick(): number;
  snapshot(): S;
  /** Last tick of a bounded timeline; playback pauses there. */
  readonly end?: number;
  /** Playback speeds this experiment offers; the standard set when omitted. */
  readonly speeds?: readonly number[];
  /** Restart with new parameters (↻). */
  configure?(parameters: P): void;
  checkpoint?(): C;
  restore?(checkpoint: C): void;
}

/** Frame scheduling, injectable so tests can drive time. */
export interface Scheduler {
  frame(callback: (now: number) => void): number;
  cancel(handle: number): void;
  now(): number;
}

/** requestAnimationFrame in the browser. */
export const browserScheduler: Scheduler = {
  frame: callback => requestAnimationFrame(callback),
  cancel: handle => cancelAnimationFrame(handle),
  now: () => performance.now(),
};

/** Steps one frame may run before model time slows down instead (as in the workers). */
export const MAX_STEPS_PER_FRAME = 12;
/** Wall-clock time one frame may account for, so a stalled tab does not jump ahead. */
export const MAX_FRAME_SECONDS = 0.1;

/** Drive a main-thread model with the shared Runtime commands. */
export class MainThreadRuntime<S, P = never, C = never> implements Runtime<S, never, P, C> {
  readonly capabilities: Capabilities;
  private running = false;
  private rate = 1;
  private accumulator = 0;
  private last = 0;
  private handle: number | null = null;
  private current: S;
  private readonly listeners = new Set<(state: S) => void>();
  private readonly onVisibility = () => { if (this.doc?.hidden) this.run(false); };

  constructor(private readonly model: MainThreadModel<S, P, C>, private readonly scheduler: Scheduler = browserScheduler, private readonly doc: Document | undefined = globalThis.document) {
    this.capabilities = { run: true, step: true, jump: true, nextEvent: false, seek: false, reset: true, speed: true, live: false, configure: Boolean(model.configure), checkpoint: Boolean(model.checkpoint), restore: Boolean(model.restore) };
    this.current = model.snapshot();
  }

  /** Whether a bounded timeline has reached its end. */
  private get finished() { return this.model.end !== undefined && this.model.tick() >= this.model.end; }

  /** Publish the model's state to subscribers. */
  private emit() { this.current = this.model.snapshot(); for (const listener of this.listeners) listener(this.current); }

  /** Advance by whole steps for the wall-clock time since the last frame, then schedule the next frame. */
  private readonly frame = (now: number) => {
    this.handle = null;
    if (!this.running) return;
    this.accumulator += Math.min(MAX_FRAME_SECONDS, Math.max(0, now - this.last) / 1000) * this.rate;
    this.last = now;
    let steps = 0;
    while (this.accumulator >= this.model.dt && steps < MAX_STEPS_PER_FRAME && !this.finished) { this.model.step(); this.accumulator -= this.model.dt; steps++; }
    // Bounded catch-up: under load model time slows down; the step size never changes.
    this.accumulator = Math.min(this.accumulator, this.model.dt * MAX_STEPS_PER_FRAME);
    if (this.finished) this.running = false;
    if (steps || !this.running) this.emit();
    if (this.running) this.handle = this.scheduler.frame(this.frame);
  };

  run(on: boolean) {
    const next = on && !this.finished;
    if (next === this.running) return;
    this.running = next;
    this.accumulator = 0;
    if (next) { this.last = this.scheduler.now(); this.handle = this.scheduler.frame(this.frame); }
    else if (this.handle !== null) { this.scheduler.cancel(this.handle); this.handle = null; }
    this.emit();
  }

  /** Pause, then run `count` steps (stopping at the end of a bounded timeline) and publish once. */
  private advance(count: number) {
    this.run(false);
    for (let i = 0; i < count && !this.finished; i++) this.model.step();
    this.emit();
  }

  step() { this.advance(1); }
  jump(tau: number) { this.advance(Math.round(tau / this.model.dt)); }
  nextEvent(): never { throw new UnsupportedCommand('next event'); }
  seek(): never { throw new UnsupportedCommand('seek'); }
  reset() { this.run(false); this.model.reset(); this.emit(); }
  speed(value: number) { this.rate = checkSpeed(value, this.model.speeds ?? SPEEDS); this.emit(); }
  setLive(): never { throw new UnsupportedCommand('live parameters'); }

  configure(parameters: P) {
    if (!this.model.configure) throw new UnsupportedCommand('configure');
    this.run(false);
    this.model.configure(parameters);
    this.emit();
  }

  checkpoint(): Promise<C> {
    return this.model.checkpoint ? Promise.resolve(this.model.checkpoint()) : Promise.reject(new UnsupportedCommand('checkpoint'));
  }

  restore(checkpoint: C) {
    if (!this.model.restore) throw new UnsupportedCommand('restore');
    this.run(false);
    this.model.restore(checkpoint);
    this.emit();
  }

  subscribe(listener: (state: S) => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  latest() { return this.current; }

  status(): RuntimeStatus {
    const tick = this.model.tick();
    return { running: this.running, tick, time: tick * this.model.dt, speed: this.rate, finished: this.finished };
  }

  /**
   * Pause on a hidden tab while attached; returns the detach function. Construction has no side effects, so a component
   * attaches from an effect (and StrictMode's repeated effects re-attach) rather than from useMemo.
   */
  attach(): () => void {
    this.doc?.addEventListener('visibilitychange', this.onVisibility);
    return () => this.doc?.removeEventListener('visibilitychange', this.onVisibility);
  }

  dispose() {
    this.run(false);
    this.listeners.clear();
    this.doc?.removeEventListener('visibilitychange', this.onVisibility);
  }
}
