import { lifecycleEnvelope } from '../model/pairMotion';
export type Vec = [number, number, number];
export const add = (a: Vec, b: Vec): Vec => a.map((v, i) => v + b[i]) as Vec;
export const scale = (a: Vec, n: number): Vec => a.map(v => v * n) as Vec;
export const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (v: Vec) => Math.hypot(...v);
export const unit = (v: Vec): Vec => norm(v) > 1e-12 ? scale(v, 1 / norm(v)) : [0, 0, 0];
export function rotate(v: Vec, axis: Vec, angle: number): Vec {
  if (norm(axis) < 1e-12) return v;
  const a = unit(axis);
  return add(add(scale(v, Math.cos(angle)), scale(cross(a, v), Math.sin(angle))), scale(a, dot(a, v) * (1 - Math.cos(angle))));
}
export const ELECTRON_MODEL = 'electron-polarization/3';
export const ELECTRON_DT = 1 / 120, ELECTRON_END = 5760, CORE_MASK = .3;
export const C = 299792458, RADIUS = 2.42631023538e-12 / 2, TAU = RADIUS / C;
export const ALPHA = 7.2973525643e-3, G_FACTOR = 2.00231930436;
export type ElectronMode = 'electric' | 'spin' | 'moving';
export interface ElectronParameters { mode: ElectronMode; beta: number; spin: 1 | -1; axis: 'x' | 'y' | 'z'; probeX: number; probeY: number; probeZ: number }
export const DEFAULT_ELECTRON: ElectronParameters = { mode: 'electric', beta: .15, spin: 1, axis: 'z', probeX: 0, probeY: 1.8, probeZ: 0 };
export interface ElectronState { model: typeof ELECTRON_MODEL; tick: number; parameters: ElectronParameters }
export interface ElectronSnapshot extends ElectronState { running: boolean; speed: number }
export interface SpinDisplay { count: number; alternating: boolean; gain: number; section: boolean; guides: boolean }
export const DEFAULT_SPIN_DISPLAY: SpinDisplay = { count: 2, alternating: true, gain: 2, section: true, guides: true };
export interface ElectronView { dipoles: boolean; inspect: boolean; shells: boolean; faraday: boolean; electric: boolean; rotation: boolean; magnetic: boolean; intrinsic: boolean; radius: boolean; cutaway: boolean; reducedMotion: boolean; spinDisplay: SpinDisplay }
export type ElectronLayer = Exclude<keyof ElectronView, 'spinDisplay'>;
export const DEFAULT_ELECTRON_VIEW: ElectronView = { dipoles: true, inspect: false, shells: true, faraday: true, electric: false, rotation: true, magnetic: true, intrinsic: false, radius: false, cutaway: false, reducedMotion: false, spinDisplay: DEFAULT_SPIN_DISPLAY };
export type ElectronCommand = { type: 'run'; value: boolean } | { type: 'step' | 'advance' | 'reset' | 'ack' } | { type: 'seek'; tick: number } | { type: 'speed'; value: number } | { type: 'configure'; parameters: ElectronParameters } | { type: 'restore'; state: ElectronState };
export type ElectronReply = { type: 'state'; state: ElectronSnapshot } | { type: 'error'; message: string };
export function validateElectronParameters(value: unknown): ElectronParameters {
  if (!value || typeof value !== 'object') throw new Error('Missing electron parameters.');
  const p = value as ElectronParameters;
  if (!['electric', 'spin', 'moving'].includes(p.mode) || !['x', 'y', 'z'].includes(p.axis) || ![1, -1].includes(p.spin)) throw new Error('Invalid electron mode or spin direction.');
  for (const [key, min, max] of [['beta', -.2, .2], ['probeX', -5, 5], ['probeY', -4, 4], ['probeZ', -3, 3]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return { mode: p.mode, beta: p.beta, spin: p.spin, axis: p.axis, probeX: p.probeX, probeY: p.probeY, probeZ: p.probeZ };
}
export function validateElectronState(value: unknown): ElectronState {
  const s = value as ElectronState;
  if (!s || s.model !== ELECTRON_MODEL || !Number.isInteger(s.tick) || s.tick < 0 || s.tick > ELECTRON_END) throw new Error('Invalid electron experiment state.');
  return { model: ELECTRON_MODEL, tick: s.tick, parameters: validateElectronParameters(s.parameters) };
}
export function parseElectronFile(text: string): { state: ElectronState; view: ElectronView; migrated: boolean } {
  if (text.length > 100000) throw new Error('Electron files must be smaller than 100 KB.');
  const f = JSON.parse(text);
  if (f?.format !== 'zeropoint-electron' || ![1, 2, 3].includes(f.version)) throw new Error('Choose a ZeroPoint electron experiment file.');
  const migrated = [1, 2].includes(f.version) && f.state?.model === `electron-polarization/${f.version}`;
  if (!migrated && f.version !== 3) throw new Error('Incompatible electron file version.');
  const state = validateElectronState(migrated ? { ...f.state, model: ELECTRON_MODEL } : f.state), view = { ...DEFAULT_ELECTRON_VIEW };
  for (const k of Object.keys(view).filter(k => k !== 'spinDisplay') as ElectronLayer[]) { if (migrated && (k === 'inspect' || (f.version === 1 && k === 'shells'))) continue; if (typeof f.view?.[k] !== 'boolean') throw new Error(`Invalid ${k} layer.`); view[k] = f.view[k]; }
  const display = f.view?.spinDisplay;
  if (display !== undefined && (!display || !Number.isInteger(display.count) || display.count < 1 || display.count > 4 || ![1, 2, 4].includes(display.gain) || ['alternating', 'section', 'guides'].some(k => typeof display[k] !== 'boolean'))) throw new Error('Invalid spin display settings.');
  view.spinDisplay = display ? { count: display.count, alternating: display.alternating, gain: display.gain, section: display.section, guides: display.guides } : { ...DEFAULT_SPIN_DISPLAY };
  return { state, view, migrated };
}
export const velocity = (p: ElectronParameters) => p.mode === 'moving' ? p.beta : 0;
export const electronX = (s: ElectronState) => velocity(s.parameters) * (s.tick * ELECTRON_DT - 24);
export const spinAxis = (p: ElectronParameters): Vec => p.axis === 'x' ? [1, 0, 0] : p.axis === 'y' ? [0, 1, 0] : [0, 0, 1];
export const probePosition = (p: ElectronParameters): Vec => [p.probeX, p.probeY, p.probeZ];
const smooth = (x: number) => { const t = Math.max(0, Math.min(1, x)); return t * t * (3 - 2 * t); };
export const electronPresence = (s: ElectronState) => s.parameters.mode === 'electric' ? smooth(s.tick * ELECTRON_DT / .35) : 1;
export const alignmentProgress = (s: ElectronState, radius = 0) => s.parameters.mode === 'electric' ? smooth((s.tick * ELECTRON_DT - .35 - .08 * radius) / (2.65 - .08 * radius)) : 1;
/** Analytic reference: a uniformly moving negative point charge; no acceleration/radiation. */
export function referenceFields(s: ElectronState, point: Vec) {
  const r: Vec = [point[0] - electronX(s), point[1], point[2]], radius = norm(r), beta = velocity(s.parameters);
  const valid = radius >= CORE_MASK;
  if (!valid) return { valid, radius, electric: [0, 0, 0] as Vec, motion: [0, 0, 0] as Vec, intrinsic: [0, 0, 0] as Vec };
  const electric = scale(r, -(1 - beta * beta) / (dot(r, r) - beta * beta * (r[1] ** 2 + r[2] ** 2)) ** 1.5);
  const motion = cross([beta, 0, 0], electric), n = unit(r);
  const moment = scale(spinAxis(s.parameters), -s.parameters.spin * G_FACTOR / (4 * Math.PI));
  const intrinsic = scale(add(scale(n, 3 * dot(moment, n)), scale(moment, -1)), 1 / radius ** 3);
  return { valid, radius, electric, motion, intrinsic };
}
// World-fixed representative sample. Replacement generations reuse a location, never advect it.
export const GRID_SIDE = 13, GRID_SPACING = .8, GRID_HALF = 6;
export const LATTICE_SAMPLES = GRID_SIDE ** 3;
export const SHELL_RADII = [.6, 1.1, 1.8, 2.8] as const;
export const SAMPLES_PER_SHELL = 80;
export const ELECTRON_SAMPLES = LATTICE_SAMPLES + SHELL_RADII.length * SAMPLES_PER_SHELL;
/** Magnified display hypothesis; no radial rotation-rate law is supplied by Fleming. */
export const spinRateAtRadius = (radius: number) => .12 / Math.max(.55, radius) ** 2;
export function sampleCentre(index: number): Vec {
  if (index >= LATTICE_SAMPLES) {
    const shell = Math.floor((index - LATTICE_SAMPLES) / SAMPLES_PER_SHELL), site = (index - LATTICE_SAMPLES) % SAMPLES_PER_SHELL;
    const z = (Math.floor(site / 16) - 2) * .36, r = Math.sqrt(1 - z * z), a = (site % 16) * Math.PI / 8;
    return scale([r * Math.cos(a), r * Math.sin(a), z], SHELL_RADII[shell]);
  }
  return [(index % GRID_SIDE - GRID_HALF) * GRID_SPACING, (Math.floor(index / GRID_SIDE) % GRID_SIDE - GRID_HALF) * GRID_SPACING, (Math.floor(index / (GRID_SIDE ** 2)) - GRID_HALF) * GRID_SPACING];
}
export function dipoleAt(s: ElectronState, index: number) {
  const centre = sampleCentre(index), field = referenceFields(s, centre), inward = unit(field.electric);
  const lifetime = Math.PI * (.8 + (index % 11) / 25), cycles = s.tick * ELECTRON_DT / lifetime + (index * .61803398875) % 1;
  const generation = Math.floor(cycles), u = cycles - generation;
  const localAxis = unit(add(spinAxis(s.parameters), scale(inward, -dot(spinAxis(s.parameters), inward))));
  // Fixed-site local turns, stronger near the core. Keep + ends inward by centering the sweep on radial alignment.
  const spinTurn = s.parameters.mode === 'electric' ? 0 : s.parameters.spin * Math.min(Math.PI / 2, spinRateAtRadius(field.radius) * lifetime);
  const spinRate = norm(localAxis) ? spinTurn / lifetime : 0;
  const motionAxis = unit(field.motion), motionTurn = Math.min(.3, 1.5 * norm(field.motion));
  let direction = rotate(inward, localAxis, spinTurn * (u - .5));
  direction = rotate(direction, motionAxis, -motionTurn * (1 - u));
  if (s.parameters.mode === 'electric') {
    const z = 1 - 2 * ((index * .7548776662466927 + .31) % 1), angle = index * 2.399963229728653;
    const initial: Vec = [Math.sqrt(1 - z * z) * Math.cos(angle), Math.sqrt(1 - z * z) * Math.sin(angle), z];
    const axis = unit(cross(initial, inward)), progress = alignmentProgress(s, field.radius);
    direction = norm(inward) ? rotate(initial, norm(axis) ? axis : unit(cross(initial, [1, .2, .3])), Math.acos(Math.max(-1, Math.min(1, dot(initial, inward)))) * progress) : initial;
  }
  const separation = .22 * lifecycleEnvelope(u, 1);
  // Rotation-only lobe velocity; excludes the separately illustrated radial separation/collapse.
  const spinPositiveVelocity = scale(cross(localAxis, direction), spinRate * separation / 2);
  return { index, centre, field, direction, separation, generation, age: u * lifetime, lifetime, progress: u, localAxis, motionAxis, spinTurn, spinRate, motionTurn, spinPositiveVelocity, spinNegativeVelocity: scale(spinPositiveVelocity, -1),
    positive: add(centre, scale(direction, separation / 2)), negative: add(centre, scale(direction, -separation / 2)) };
}
/** Equal-area sphere quadrature: flux of normalized E divided by 4π, in charge units. */
export function enclosedCharge(s: ElectronState, radius: number, samples = 256) {
  if (!Number.isFinite(radius) || radius < CORE_MASK) throw new Error('Flux sphere must enclose the numerical mask.');
  let flux = 0;
  for (let i = 0; i < samples; i++) {
    const z = 1 - 2 * (i + .5) / samples, a = i * 2.399963229728653, r = Math.sqrt(1 - z * z), n: Vec = [r * Math.cos(a), r * Math.sin(a), z];
    const point = add([electronX(s), 0, 0], scale(n, radius));
    flux += dot(referenceFields(s, point).electric, n) * radius ** 2 / samples;
  }
  return flux;
}
export class ElectronSimulation {
  state: ElectronState = { model: ELECTRON_MODEL, tick: 0, parameters: { ...DEFAULT_ELECTRON } };
  step(n = 1) { if (!Number.isInteger(n) || n < 1 || n > ELECTRON_END) throw new Error('Invalid step count.'); this.state.tick = Math.min(ELECTRON_END, this.state.tick + n); }
  seek(tick: number) { this.state = validateElectronState({ ...this.state, tick }); }
  configure(parameters: ElectronParameters) { this.state = { model: ELECTRON_MODEL, tick: 0, parameters: validateElectronParameters(parameters) }; }
  restore(s: ElectronState) { this.state = validateElectronState(s); }
  snapshot(): ElectronState { return { ...this.state, parameters: { ...this.state.parameters } }; }
}
