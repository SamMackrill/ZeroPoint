import { lifecycleEnvelope } from '../model/pairMotion';

export const LIGHT_MODEL = 'light-induction/2';
export const LIGHT_DT = 1 / 120;
export const LIGHT_LENGTH = 12;
export const LIGHT_END_TICK = 1440;
export const LENGTH_METRES = 250e-9;
export const TIME_SECONDS = LENGTH_METRES / 299792458;
export const ENERGY_EV = 6.62607015e-34 * 299792458 / LENGTH_METRES / 1.602176634e-19;
export interface LightParameters { wavelength: number; polarization: number; phase: number; direction: 1 | -1; offset: number; probe: number }
export const DEFAULT_LIGHT: LightParameters = { wavelength: 2, polarization: 0, phase: 0, direction: 1, offset: 0, probe: 0 };
export interface LightState { model: typeof LIGHT_MODEL; tick: number; parameters: LightParameters }
export interface LightView { background: boolean; pairs: boolean; response: boolean; fields: boolean; envelope: boolean; centres: boolean; reducedMotion: boolean }
export const DEFAULT_LIGHT_VIEW: LightView = { background: true, pairs: true, response: true, fields: true, envelope: true, centres: true, reducedMotion: false };
export interface LightSnapshot extends LightState { running: boolean; speed: number }
export type LightCommand = { type: 'run'; value: boolean } | { type: 'step' | 'next' | 'reset' | 'ack' } | { type: 'speed'; value: number } | { type: 'configure'; parameters: LightParameters } | { type: 'seek'; tick: number } | { type: 'restore'; state: LightState };
export type LightReply = { type: 'state'; state: LightSnapshot } | { type: 'error'; message: string };

/** Validate light experiment parameters and return a safe copy. */
export function validateLightParameters(value: unknown): LightParameters {
  if (!value || typeof value !== 'object') throw new Error('Missing light parameters.');
  const p = value as LightParameters;
  for (const [key, min, max] of [['wavelength', 1, 4], ['polarization', 0, 180], ['phase', 0, 360], ['offset', -2, 2], ['probe', -5, 5]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  if (Math.abs(p.wavelength * 10 - Math.round(p.wavelength * 10)) > 1e-8) throw new Error('Wavelength must use increments of 0.1 L.');
  if (p.direction !== 1 && p.direction !== -1) throw new Error('Direction must be +1 or −1.');
  return { wavelength: p.wavelength, polarization: p.polarization, phase: p.phase, direction: p.direction, offset: p.offset, probe: p.probe };
}
/** Validate a serialized light simulation state. */
export function validateLightState(value: unknown): LightState {
  if (!value || typeof value !== 'object') throw new Error('Missing light state.');
  const s = value as LightState;
  if (s.model !== LIGHT_MODEL) throw new Error('This file is not a supported light experiment.');
  if (!Number.isInteger(s.tick) || s.tick < 0 || s.tick > LIGHT_END_TICK) throw new Error('Invalid light timeline position.');
  return { model: LIGHT_MODEL, tick: s.tick, parameters: validateLightParameters(s.parameters) };
}
/** Parse and validate a serialized light experiment file. */
export function parseLightFile(text: string): { state: LightState; view: LightView; migrated: boolean } {
  if (text.length > 100_000) throw new Error('Light files must be smaller than 100 KB.');
  const f = JSON.parse(text);
  if (f?.format !== 'zeropoint-light' || f.version !== 1) throw new Error('Choose a ZeroPoint light experiment file.');
  // Model 1 stored the same tick and parameters; model 2 changed only the pair geometry and the field drawn from it.
  const migrated = f.state?.model === 'light-induction/1';
  const state = validateLightState(migrated ? { ...f.state, model: LIGHT_MODEL } : f.state), view = { ...DEFAULT_LIGHT_VIEW };
  for (const key of Object.keys(view) as (keyof LightView)[]) {
    if (typeof f.view?.[key] !== 'boolean') throw new Error(`Invalid ${key} layer setting.`);
    view[key] = f.view[key];
  }
  return { state, view, migrated };
}
export const hopTicks = (p: LightParameters) => Math.round(p.wavelength * 60);
export const sourceX = (p: LightParameters) => p.offset - p.direction * 6;
export const pairCount = (p: LightParameters) => Math.ceil(LIGHT_END_TICK / hopTicks(p));
/** The transverse unit vector of the chosen polarization: the axis the electric field alternates along. */
export const polarizationAxis = (p: LightParameters): [number, number, number] => { const a = p.polarization * Math.PI / 180; return [0, Math.cos(a), Math.sin(a)]; };
/** A pair opens to its own wavelength, which is half the photon wavelength (Fleming, Photons §2; book Eq. 4-4). */
export const pairWavelength = (p: LightParameters) => p.wavelength / 2;
/**
 * The induced pair for hand-off `index` at the requested tick.
 *
 * Fleming's figures (book Figs 4-9 and 5-1; Photons Fig. 3) draw each pair across the path with one field polarity,
 * alternating pair by pair. So each pair is born along the path, turns 180° in the plane of travel and polarization,
 * and is transverse at midlife, when it is widest (its wavelength, λ/2). `polarity` alternates; the rotation `sense`
 * about x̂ × ê follows from it and from the travel direction, so the magnetic field lies along the rotation axis
 * (right-hand grip, book ch. 6) and E × B points along the travel direction. `phase` offsets every pair's start angle.
 */
export function pairAt(p: LightParameters, tick: number, index: number) {
  const duration = hopTicks(p), progress = Math.max(0, Math.min(1, (tick - index * duration) / duration));
  const polarity = index % 2 === 0 ? 1 : -1, sense = polarity * p.direction;
  const turn = Math.PI * progress, start = p.phase * Math.PI / 180, theta = start + turn, e = polarizationAxis(p);
  const axial = p.direction * Math.cos(theta), transverse = polarity * Math.sin(theta);
  const peak = pairWavelength(p), separation = peak * lifecycleEnvelope(progress, 1);
  const centre = sourceX(p) + p.direction * (index + .5) * p.wavelength / 2;
  const direction: [number, number, number] = [axial, transverse * e[1], transverse * e[2]];
  return { index, centre, progress, polarity, sense, turn, angle: start + sense * turn, axial, transverse, direction, separation, peak, age: progress * duration * LIGHT_DT, lifetime: duration * LIGHT_DT, active: tick >= index * duration && tick < (index + 1) * duration && tick < LIGHT_END_TICK };
}
/** The pair that is active at a continuous time (in τ), with its progress through its life. */
function activePair(p: LightParameters, time: number) {
  const life = p.wavelength / 2, index = Math.min(pairCount(p) - 1, Math.floor(time / life + 1e-9));
  const progress = Math.max(0, Math.min(1, time / life - index)), polarity = index % 2 === 0 ? 1 : -1;
  return { index, progress, polarity, centre: sourceX(p) + p.direction * (index + .5) * life };
}
/**
 * The field at a point, taken from the active pair's rotating dipole moment (not an electromagnetic field solver).
 *
 * The pair produces the field: its strength is the transverse part of the pair's moment (orientation × separation),
 * so it swells and collapses with the pair, is zero at each hand-off and reverses for the next pair (book ch. 5:
 * the field "reverses electric and magnetic polarity"; ch. 19: the fields "are also extinguished each half
 * wavelength along with the central zepton"). It falls with the inverse square of distance from that pair (ch. 19),
 * softened inside a quarter-wavelength, and is taken as established at once everywhere in the window, because
 * Fleming's fields spread far faster than light. `envelope` is the unsigned strength of the response.
 */
export function fieldAt(p: LightParameters, time: number, point: readonly [number, number, number]) {
  const distance = p.direction * (point[0] - sourceX(p));
  if (time < 0 || time >= LIGHT_LENGTH || distance < 0 || distance > LIGHT_LENGTH) return { electric: 0, magnetic: 0, envelope: 0 };
  const pair = activePair(p, time), open = lifecycleEnvelope(pair.progress, 1), core = p.wavelength / 4;
  const r2 = (point[0] - pair.centre) ** 2 + point[1] ** 2 + point[2] ** 2, reach = 1 / (1 + r2 / (core * core));
  const electric = pair.polarity * Math.sin(p.phase * Math.PI / 180 + Math.PI * pair.progress) * open * reach;
  return { electric, magnetic: p.direction * electric, envelope: open * reach };
}
/** The field on the travel axis at position `x`: see `fieldAt`. */
export const waveAt = (p: LightParameters, time: number, x: number) => fieldAt(p, time, [x, 0, 0]);
/** Summarize the current light timeline, position, and energy allocation. */
export function lightReadout(s: LightState) {
  const p = s.parameters, time = s.tick * LIGHT_DT, finished = s.tick === LIGHT_END_TICK;
  const index = Math.min(pairCount(p) - 1, Math.floor(s.tick / hopTicks(p)));
  const total = ENERGY_EV / p.wavelength, inView = finished ? 0 : total;
  return { time, finished, index, handoffs: Math.min(pairCount(p) - 1, Math.floor(s.tick / hopTicks(p))), x: sourceX(p) + p.direction * time,
    pair: pairAt(p, s.tick, index), energy: total, pairEnergy: inView / 2, fieldEnergy: inView / 2, departedEnergy: finished ? total : 0,
    probe: waveAt(p, time, p.probe) };
}
export class LightSimulation {
  state: LightState = { model: LIGHT_MODEL, tick: 0, parameters: { ...DEFAULT_LIGHT } };
  step(count = 1) { if (!Number.isInteger(count) || count < 1 || count > LIGHT_END_TICK) throw new Error('Invalid light step count.'); this.state.tick = Math.min(LIGHT_END_TICK, this.state.tick + count); }
  next() { this.state.tick = Math.min(LIGHT_END_TICK, (Math.floor(this.state.tick / hopTicks(this.state.parameters)) + 1) * hopTicks(this.state.parameters)); }
  configure(p: LightParameters) { this.state = { model: LIGHT_MODEL, tick: 0, parameters: validateLightParameters(p) }; }
  seek(tick: number) { this.state = validateLightState({ ...this.state, tick }); }
  restore(state: LightState) { this.state = validateLightState(state); }
  snapshot(): LightState { return { ...this.state, parameters: { ...this.state.parameters } }; }
}
