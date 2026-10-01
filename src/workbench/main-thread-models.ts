// MainThreadModel adapters for the two labs that simulate on the main thread. Their models are unchanged: Casimir's
// CasimirModel is recreated on reset or reconfigure (as the lab does today), and the van der Waals correlated-dipole
// clock is a 120-tick loop that the lab advanced with a 50 ms interval (0.05 τ per tick at 1×).
import { CasimirModel, STEP, type ChargePair } from '../casimir/model';
import type { MainThreadModel } from './main-thread-runtime';

/** Casimir's playback speeds, as the lab offers them today (0.1–2×). */
export const CASIMIR_SPEEDS = [0.1, 0.25, 0.5, 1, 2] as const;

/** Casimir's restart parameters: the charge pairing and initial separation. */
export interface CasimirConfig { pair: ChargePair; separation: number }

/** Casimir as a main-thread model. Snapshots are the live CasimirModel, which renderers read directly. */
export function casimirModel(initial: CasimirConfig = { pair: 'electron-electron', separation: 5.6 }): MainThreadModel<CasimirModel, CasimirConfig> {
  let config = { ...initial }, model = new CasimirModel(config.pair, config.separation);
  return {
    dt: STEP,
    speeds: CASIMIR_SPEEDS,
    step: () => model.step(),
    reset: () => { model = new CasimirModel(config.pair, config.separation); },
    tick: () => model.tick,
    snapshot: () => model,
    configure: next => { config = { ...next }; model = new CasimirModel(config.pair, config.separation); },
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
