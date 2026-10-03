import { Diamond, Pause, Play, RotateCcw, SkipForward, StepForward } from 'lucide-react';
import type { Capabilities, RuntimeStatus } from './runtime';
import type { Action } from './actions';
import type { TimelineEvent, TimelineSpec } from './definition';
import { useRuntimeStatus, type StatusSource } from './useRuntimeStatus';
import { Segmented } from '../ui/Segmented';
import './timeline-bar.css';

/** The runtime commands the timeline bar issues. */
export interface TimelineRuntime extends StatusSource {
  readonly capabilities: Capabilities;
  run(on: boolean): void;
  step(): void;
  jump(tau: number): void;
  nextEvent(): void;
  seek(tick: number): void;
  reset(): void;
  speed(value: number): void;
}

/** A captured checkpoint shown as a ◆ marker. */
export interface TimelineMarker { id: string; tick: number; label: string }

/** Props for TimelineBar. */
export interface TimelineBarProps {
  runtime: TimelineRuntime;
  timeline: TimelineSpec;
  speeds: readonly number[];
  markers?: readonly TimelineMarker[];
  /** Restore a ◆ checkpoint. */
  onMarker?(marker: TimelineMarker): void;
  /** Capture a checkpoint (shows "◆ Capture"). */
  onCapture?(): void;
  /** Hold playback, e.g. while the viewport recovers a lost graphics context. */
  runDisabled?: boolean;
}

/** Speed labels: fractions as glyphs, as in the plan (¼ ½ 1× 2× 4×). */
export const speedLabel = (speed: number) => (speed === 0.25 ? '¼' : speed === 0.5 ? '½' : `${speed}×`);

/**
 * The scrubber's length in ticks: the end of a bounded or looping timeline; on an open one, the furthest of the current
 * tick, its events and its ◆ markers, so markers keep their places after restoring an earlier one.
 */
export const trackLength = (timeline: TimelineSpec, status: RuntimeStatus, markers: readonly { tick: number }[] = []) =>
  Math.max(1, timeline.end ?? Math.max(status.tick, ...timeline.events.map(e => e.tick), ...markers.map(m => m.tick)));

/** Time readout: "2.40 / 12 τ" on bounded timelines, "2.433 τ · tick 292" on open and looping ones. */
export function timeText(timeline: TimelineSpec, status: RuntimeStatus): string {
  if (timeline.kind === 'bounded' && timeline.end !== undefined) return `${status.time.toFixed(2)} / ${Number((timeline.end * timeline.dt).toFixed(2))} τ`;
  return `${status.time.toFixed(3)} τ · tick ${status.tick.toLocaleString('en-GB')}`;
}

/**
 * The timeline bar (docs/ui-redesign-plan.html §05 D, §07): the same 40 px bar for every timed experiment. Reset,
 * Run/Pause, Step, Next (the next event, or +1 τ), speed, a scrubber with event ticks and ◆ checkpoint markers, the
 * time and Capture. Controls follow the runtime's capabilities. Static scenarios have no timeline bar.
 */
export function TimelineBar({ runtime, timeline, speeds, markers = [], onMarker, onCapture, runDisabled }: TimelineBarProps) {
  const status = useRuntimeStatus(runtime);
  if (!status || timeline.kind === 'static') return null;
  const can = runtime.capabilities, length = trackLength(timeline, status, markers);
  const nextIsEvent = timeline.next !== 'jump' && can.nextEvent;
  const pct = (tick: number) => `${Math.min(100, Math.max(0, (tick / length) * 100))}%`;
  const event = (e: TimelineEvent) => `${e.label} · ${(e.tick * timeline.dt).toFixed(2)} τ`;
  return (
    <div className="timeline-bar" role="toolbar" aria-label="Timeline">
      <button type="button" className="timeline-button" data-testid="transport-reset" disabled={!can.reset} onClick={() => runtime.reset()} title="Reset" aria-label="Reset"><RotateCcw size={15} aria-hidden="true"/></button>
      <button type="button" className={`timeline-run${status.running ? ' is-running' : ''}`} data-testid="transport-run" disabled={!can.run || (status.finished && !status.running) || (runDisabled && !status.running)} onClick={() => runtime.run(!status.running)}>
        {status.running ? <Pause size={14} aria-hidden="true"/> : <Play size={14} aria-hidden="true"/>}{status.running ? 'Pause' : 'Run'}
      </button>
      <button type="button" className="timeline-button" data-testid="transport-step" disabled={!can.step || status.finished} onClick={() => runtime.step()} title="Step" aria-label="Step"><StepForward size={15} aria-hidden="true"/></button>
      {timeline.next && (
        <button type="button" className="timeline-button" data-testid="transport-next" disabled={status.finished || (nextIsEvent ? false : !can.jump)} onClick={() => (nextIsEvent ? runtime.nextEvent() : runtime.jump(1))}
          title={nextIsEvent ? 'Next event' : 'Jump +1 τ'} aria-label={nextIsEvent ? 'Next event' : 'Jump +1 τ'}>
          <SkipForward size={15} aria-hidden="true"/>{!nextIsEvent && <span className="timeline-jump">+1 τ</span>}
        </button>
      )}
      <Segmented label="Playback speed" testId="transport-speed" options={speeds.map(s => ({ value: String(s), label: speedLabel(s), title: `${s}× speed` }))}
        value={String(status.speed)} onChange={v => runtime.speed(Number(v))} disabled={!can.speed}/>
      <div className={`timeline-track is-${timeline.kind}`}>
        {can.seek
          ? <input type="range" data-testid="timeline" aria-label="Timeline" min={0} max={length} step={1} value={Math.min(status.tick, length)} onChange={e => runtime.seek(Number(e.target.value))}/>
          : <div className="timeline-progress" role="progressbar" aria-label="Elapsed time" aria-valuemin={0} aria-valuemax={length} aria-valuenow={status.tick}><i style={{ width: pct(status.tick) }}/></div>}
        {timeline.events.map(e => (
          <button type="button" key={`${e.tick}-${e.label}`} data-testid={e.id ? `event-${e.id}` : undefined} className="timeline-tick" style={{ left: pct(e.tick) }} title={event(e)} aria-label={event(e)} disabled={!can.seek} onClick={() => runtime.seek(e.tick)}/>
        ))}
        {markers.map(m => (
          <button type="button" key={m.id} className="timeline-marker" style={{ left: pct(m.tick) }} title={`${m.label} · tick ${m.tick}`} aria-label={`Restore ${m.label}`} onClick={() => onMarker?.(m)}><Diamond size={10} aria-hidden="true"/></button>
        ))}
      </div>
      <output className="timeline-time" aria-live="off">{timeText(timeline, status)}</output>
      {onCapture && <button type="button" className="timeline-capture" data-testid="capture" onClick={onCapture}><Diamond size={12} aria-hidden="true"/>Capture</button>}
    </div>
  );
}

/** Options for transportActions: Capture, and holds on Run or on every key. */
export interface TransportActionOptions {
  onCapture?(): void;
  /** Hold Run (as TimelineBar's runDisabled), e.g. while the viewport recovers a lost graphics context. */
  runDisabled?: boolean;
  /** No transport keys at all, e.g. while the worker starts or after an error. */
  disabled?: boolean;
}

/**
 * The timeline bar's commands as keyboard actions (plan §11 keyboard map): Space, →, Shift →, ] and [, Home, < and >,
 * and C. Each follows the runtime's capabilities and the timeline's kind, as the bar's buttons do; static scenarios
 * have none.
 */
export function transportActions(runtime: TimelineRuntime, timeline: TimelineSpec, speeds: readonly number[], options: TransportActionOptions = {}): Action[] {
  if (timeline.kind === 'static') return [];
  const can = runtime.capabilities, off = !!options.disabled;
  const nextIsEvent = timeline.next !== 'jump' && can.nextEvent;
  const speedBy = (delta: number) => {
    const at = speeds.indexOf(runtime.status().speed), from = at < 0 ? Math.max(0, speeds.indexOf(1)) : at;
    runtime.speed(speeds[Math.min(speeds.length - 1, Math.max(0, from + delta))]);
  };
  const previousEvent = () => {
    const tick = runtime.status().tick;
    runtime.seek([...timeline.events].reverse().find(e => e.tick < tick)?.tick ?? 0);
  };
  const actions: Action[] = [
    { id: 'transport.run', label: 'Run / Pause', group: 'Transport', keys: ['Space'], disabled: off || !can.run, run: () => {
      const status = runtime.status();
      if (status.running || !(options.runDisabled || status.finished)) runtime.run(!status.running);
    } },
    { id: 'transport.step', label: 'Step', group: 'Transport', keys: ['ArrowRight'], repeat: true, disabled: off || !can.step, run: () => { if (!runtime.status().finished) runtime.step(); } },
  ];
  if (can.jump) actions.push({ id: 'transport.jump', label: 'Jump +1 τ', group: 'Transport', keys: ['Shift+ArrowRight'], disabled: off, run: () => { if (!runtime.status().finished) runtime.jump(1); } });
  if (timeline.next && nextIsEvent) actions.push({ id: 'transport.next', label: 'Next event', group: 'Transport', keys: [']'], disabled: off, run: () => runtime.nextEvent() });
  if (nextIsEvent && can.seek && timeline.events.length) actions.push({ id: 'transport.previous', label: 'Previous event', group: 'Transport', keys: ['['], disabled: off, run: previousEvent });
  if (can.reset) actions.push({ id: 'transport.reset', label: 'Reset to start', group: 'Transport', keys: ['Home'], disabled: off, run: () => runtime.reset() });
  if (can.speed && speeds.length > 1) actions.push(
    { id: 'transport.slower', label: 'Slower', group: 'Transport', keys: ['<'], disabled: off, run: () => speedBy(-1) },
    { id: 'transport.faster', label: 'Faster', group: 'Transport', keys: ['>'], disabled: off, run: () => speedBy(1) },
  );
  if (options.onCapture) actions.push({ id: 'transport.capture', label: 'Capture checkpoint', group: 'Transport', keys: ['c'], disabled: off, run: options.onCapture });
  return actions;
}
