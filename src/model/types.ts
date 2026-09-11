export const MODEL_VERSION = 'medium-lifecycle/2';
export const CAPACITY = 10000;
export const DT = 1 / 120;
export const FREQUENCY_UNIT = 1e20;
export const ENERGY_UNIT = 6.62607015e-34 * FREQUENCY_UNIT;
export const SNAPSHOT_STRIDE = 12;
export const STATE_STRIDE = 10;
export const MAX_TICK = 10_000_000;
export interface Parameters { birthRate: number; frequency: number; separation: number }
export const DEFAULT_PARAMETERS: Parameters = { birthRate: 1400, frequency: 1, separation: 0.3 };
export interface ModelEvent { tick: number; kind: 'reset' | 'parameters' | 'checkpoint' | 'restored'; text: string }
export interface Diagnostics { tick: number; time: number; active: number; births: number; deaths: number; rejected: number; fieldEnergy: number; reservoir: number; totalEnergy: number; residual: number; meanFrequency: number; parameterVersion: number }
export interface Checkpoint {
  model: typeof MODEL_VERSION; seed: number; rng: number; tick: number; parameters: Parameters;
  initialParameters: Parameters; parameterVersion: number; nextBirth: number; reservoir: number;
  births: number; deaths: number; rejected: number; particles: number[]; free: number[]; events: ModelEvent[];
}
export interface Snapshot { data: Float32Array; diagnostics: Diagnostics; parameters: Parameters; seed: number; running: boolean; speed: number; events: ModelEvent[]; stepMs: number }
export type Command =
  | { type: 'initialize'; seed: number; parameters: Parameters }
  | { type: 'running'; value: boolean }
  | { type: 'step' }
  | { type: 'speed'; value: number }
  | { type: 'parameters'; value: Parameters }
  | { type: 'reset'; seed: number; parameters: Parameters }
  | { type: 'save'; id: number }
  | { type: 'restore'; checkpoint: Checkpoint }
  | { type: 'recycle'; buffer: ArrayBuffer };
export type WorkerReply =
  | { type: 'snapshot'; buffer: ArrayBuffer; count: number; diagnostics: Diagnostics; parameters: Parameters; seed: number; running: boolean; speed: number; events: ModelEvent[]; stepMs: number }
  | { type: 'saved'; id: number; checkpoint: Checkpoint }
  | { type: 'error'; message: string };
export interface ViewSettings { representation: 'dipoles' | 'points'; medium: boolean; bounds: boolean; slice: boolean; sliceZ: number; reducedMotion: boolean }
export const DEFAULT_VIEW: ViewSettings = { representation: 'dipoles', medium: true, bounds: true, slice: false, sliceZ: 0, reducedMotion: false };
export interface ExperimentFile { format: 'zeropoint-experiment'; version: 1; savedAt: string; checkpoint: Checkpoint; view: ViewSettings }
/** Validate medium parameters and return a safe copy. */
export function validateParameters(value: unknown): Parameters {
  if (!value || typeof value !== 'object') throw new Error('Parameters must be an object.');
  const p = value as Parameters;
  for (const [key, min, max] of [['birthRate', 0, 10000], ['frequency', .25, 3], ['separation', 0, .8]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return { birthRate: p.birthRate, frequency: p.frequency, separation: p.separation };
}
/** Validate a deterministic simulation seed. */
export function validateSeed(seed: number) { if (!Number.isInteger(seed) || seed < 0 || seed > 0xffffffff) throw new Error('Seed must be an integer from 0 to 4294967295.'); return seed; }
