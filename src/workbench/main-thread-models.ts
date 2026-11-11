// MainThreadModel adapters for the labs that simulate on the main thread. Their models are unchanged: Casimir's
// CasimirModel is recreated on reset or reconfigure (as the lab does today), and the van der Waals correlated-dipole
// clock is a 120-tick loop that the lab advanced with a 50 ms interval (0.05 τ per tick at 1×).
import { CasimirModel, STEP, type CasimirState, type ChargePair } from '../casimir/model';
import type { MainThreadModel } from './main-thread-runtime';

/** Casimir's playback speeds, as the lab offers them today (0.1–2×). */
export const CASIMIR_SPEEDS = [0.1, 0.25, 0.5, 1, 2] as const;

/** Casimir's restart parameters: the charge pairing and initial separation. */
export interface CasimirConfig { pair: ChargePair; separation: number }

/** Casimir as a main-thread model. Snapshots are the live CasimirModel, which renderers read directly. */
export function casimirModel(initial: CasimirConfig = { pair: 'electron-electron', separation: 5.6 }): MainThreadModel<CasimirModel, CasimirConfig, CasimirState> {
  let config = { ...initial }, model = new CasimirModel(config.pair, config.separation);
  return {
    dt: STEP,
    speeds: CASIMIR_SPEEDS,
    step: () => model.step(),
    reset: () => { model = new CasimirModel(config.pair, config.separation); },
    tick: () => model.tick,
    snapshot: () => model,
    configure: next => { config = { ...next }; model = new CasimirModel(config.pair, config.separation); },
    checkpoint: () => model.state(),
    // A restored run keeps its pairing and separation, so Reset repeats it from the start.
    restore: state => { config = { pair: state.pair, separation: state.separation }; model = CasimirModel.restore(state); },
  };
}

/** Ticks in one van der Waals correlated-dipole cycle. */
export const VDW_LOOP_TICKS = 120;

/** The van der Waals dipole clock's state: the tick within the loop and its phase in degrees. */
export interface DipoleClock { tick: number; phase: number }

/** The van der Waals correlated-dipole clock as a main-thread model: a loop of 120 ticks that wraps. */
export function dipoleClockModel(): MainThreadModel<DipoleClock> {
  let tick = 0;
  return {
    dt: 0.05,
    step: () => { tick = (tick + 1) % VDW_LOOP_TICKS; },
    reset: () => { tick = 0; },
    tick: () => tick,
    snapshot: () => ({ tick, phase: tick * 360 / VDW_LOOP_TICKS }),
  };
}

/** A bounded clock's state: just its tick. Labs whose scene is a pure function of time and parameters render from it. */
export interface BoundedClock { tick: number }

/**
 * A clock from tick 0 to `end` that can be scrubbed, as a main-thread model (the double slit). `events` returns the
 * ticks of the current timeline's named events, so Next goes to the one after the current tick, or to the end.
 */
export function boundedClockModel(dt: number, end: number, events: () => readonly number[] = () => []): MainThreadModel<BoundedClock, never, number> {
  let tick = 0;
  /** Keep a requested tick on the timeline. */
  const clamp = (value: number) => Math.min(end, Math.max(0, Math.round(value)));
  return {
    dt, end,
    step: () => { tick = clamp(tick + 1); },
    reset: () => { tick = 0; },
    tick: () => tick,
    snapshot: () => ({ tick }),
    seek: value => { tick = clamp(value); },
    nextEvent: () => { tick = clamp(events().filter(e => e > tick).sort((a, b) => a - b)[0] ?? end); },
    checkpoint: () => tick,
    restore: value => { tick = clamp(value); },
  };
}
