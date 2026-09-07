import { lifecycleEnvelope } from '../model/pairMotion';

export const LIGHT_MODEL = 'light-induction/1';
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
export function validateLightState(value: unknown): LightState {
  if (!value || typeof value !== 'object') throw new Error('Missing light state.');
  const s = value as LightState;
  if (s.model !== LIGHT_MODEL) throw new Error('This file is not a supported light experiment.');
  if (!Number.isInteger(s.tick) || s.tick < 0 || s.tick > LIGHT_END_TICK) throw new Error('Invalid light timeline position.');
  return { model: LIGHT_MODEL, tick: s.tick, parameters: validateLightParameters(s.parameters) };
}
export function parseLightFile(text: string): { state: LightState; view: LightView } {
  if (text.length > 100_000) throw new Error('Light files must be smaller than 100 KB.');
  const f = JSON.parse(text);
  if (f?.format !== 'zeropoint-light' || f.version !== 1) throw new Error('Choose a ZeroPoint light experiment file.');
  const state = validateLightState(f.state), view = { ...DEFAULT_LIGHT_VIEW };
  for (const key of Object.keys(view) as (keyof LightView)[]) {
    if (typeof f.view?.[key] !== 'boolean') throw new Error(`Invalid ${key} layer setting.`);
    view[key] = f.view[key];
  }
  return { state, view };
}
export const hopTicks = (p: LightParameters) => Math.round(p.wavelength * 60);
export const sourceX = (p: LightParameters) => p.offset - p.direction * 6;
export const pairCount = (p: LightParameters) => Math.ceil(LIGHT_END_TICK / hopTicks(p));
export function pairAt(p: LightParameters, tick: number, index: number) {
  const duration = hopTicks(p), progress = Math.max(0, Math.min(1, (tick - index * duration) / duration));
  const sense = index % 2 === 0 ? 1 : -1;
  const angle = p.phase * Math.PI / 180 + index * Math.PI + sense * Math.PI * progress;
  const pol = p.polarization * Math.PI / 180;
  const separation = .42 * lifecycleEnvelope(progress, 1);
  const centre = sourceX(p) + p.direction * (index + .5) * p.wavelength / 2;
  const direction: [number, number, number] = [Math.sin(angle), Math.cos(angle) * Math.cos(pol), Math.cos(angle) * Math.sin(pol)];
  return { index, centre, progress, sense, angle, direction, separation, age: progress * duration * LIGHT_DT, lifetime: duration * LIGHT_DT, active: tick >= index * duration && tick < (index + 1) * duration && tick < LIGHT_END_TICK };
}
/** Prescribed finite envelope, not an electromagnetic field solver. */
export function waveAt(p: LightParameters, time: number, x: number) {
  const distance = p.direction * (x - sourceX(p)), local = distance - time;
  if (time < 0 || time >= LIGHT_LENGTH || distance < 0 || distance > LIGHT_LENGTH) return { electric: 0, magnetic: 0, envelope: 0 };
  const u = Math.abs(local) / (p.wavelength / 2);
  const envelope = u >= 1 ? 0 : Math.cos(u * Math.PI / 2) ** 2;
  const electric = envelope * Math.cos(2 * Math.PI * local / p.wavelength + p.phase * Math.PI / 180);
  return { electric, magnetic: p.direction * electric, envelope };
}
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
