import { lifecycleEnvelope } from '../model/pairMotion';
export type Vec = [number, number, number];
export const add = (a: Vec, b: Vec): Vec => a.map((v, i) => v + b[i]) as Vec;
export const scale = (a: Vec, n: number): Vec => a.map(v => v * n) as Vec;
export const dot = (a: Vec, b: Vec) => a.reduce((sum, v, i) => sum + v * b[i], 0);
export const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const norm = (v: Vec) => Math.hypot(...v);
export const unit = (v: Vec): Vec => norm(v) > 1e-12 ? scale(v, 1 / norm(v)) : [0, 0, 0];
/** Rotate a vector around an axis using Rodrigues' formula. */
export function rotate(v: Vec, axis: Vec, angle: number): Vec {
  if (norm(axis) < 1e-12) return v;
  const a = unit(axis);
  return add(add(scale(v, Math.cos(angle)), scale(cross(a, v), Math.sin(angle))), scale(a, dot(a, v) * (1 - Math.cos(angle))));
}
export const ELECTRON_MODEL = 'electron-polarization/4';
export const ELECTRON_DT = 1 / 120, ELECTRON_END = 5760, CORE_MASK = .3;
/** The saved-file version, which follows the model's version number. */
export const ELECTRON_FILE_VERSION = 4;
export const C = 299792458, RADIUS = 2.42631023538e-12 / 2, TAU = RADIUS / C;
export const ALPHA = 7.2973525643e-3, G_FACTOR = 2.00231930436;
export type ElectronMode = 'electric' | 'spin' | 'moving';
export interface ElectronParameters { mode: ElectronMode; beta: number; spin: 1 | -1; axis: 'x' | 'y' | 'z'; probeX: number; probeY: number; probeZ: number }
export const DEFAULT_ELECTRON: ElectronParameters = { mode: 'electric', beta: .15, spin: 1, axis: 'z', probeX: 0, probeY: 1.8, probeZ: 0 };
export interface ElectronState { model: typeof ELECTRON_MODEL; tick: number; parameters: ElectronParameters }
export interface ElectronSnapshot extends ElectronState { running: boolean; speed: number }
export interface SpinDisplay { count: number; alternating: boolean; gain: number; section: boolean; guides: boolean }
/** Shared preference is Fleming's account (Electron Properties §3, Fig. 2); alternating whole bands is an extension. */
export const DEFAULT_SPIN_DISPLAY: SpinDisplay = { count: 2, alternating: false, gain: 2, section: true, guides: true };
export interface ElectronView { dipoles: boolean; inspect: boolean; shells: boolean; faraday: boolean; electric: boolean; rotation: boolean; magnetic: boolean; intrinsic: boolean; radius: boolean; cutaway: boolean; reducedMotion: boolean; spinDisplay: SpinDisplay }
export type ElectronLayer = Exclude<keyof ElectronView, 'spinDisplay'>;
export const DEFAULT_ELECTRON_VIEW: ElectronView = { dipoles: true, inspect: false, shells: true, faraday: true, electric: false, rotation: true, magnetic: true, intrinsic: false, radius: false, cutaway: false, reducedMotion: false, spinDisplay: DEFAULT_SPIN_DISPLAY };
export type ElectronCommand = { type: 'run'; value: boolean } | { type: 'step' | 'advance' | 'reset' | 'ack' } | { type: 'seek'; tick: number } | { type: 'speed'; value: number } | { type: 'configure'; parameters: ElectronParameters } | { type: 'restore'; state: ElectronState };
export type ElectronReply = { type: 'state'; state: ElectronSnapshot } | { type: 'error'; message: string };
/** Validate electron experiment parameters and return a safe copy. */
export function validateElectronParameters(value: unknown): ElectronParameters {
  if (!value || typeof value !== 'object') throw new Error('Missing electron parameters.');
  const p = value as ElectronParameters;
  if (!['electric', 'spin', 'moving'].includes(p.mode) || !['x', 'y', 'z'].includes(p.axis) || ![1, -1].includes(p.spin)) throw new Error('Invalid electron mode or spin direction.');
  for (const [key, min, max] of [['beta', -.2, .2], ['probeX', -5, 5], ['probeY', -4, 4], ['probeZ', -3, 3]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return { mode: p.mode, beta: p.beta, spin: p.spin, axis: p.axis, probeX: p.probeX, probeY: p.probeY, probeZ: p.probeZ };
}
/** Validate a serialized electron simulation state. */
export function validateElectronState(value: unknown): ElectronState {
  const s = value as ElectronState;
  if (!s || s.model !== ELECTRON_MODEL || !Number.isInteger(s.tick) || s.tick < 0 || s.tick > ELECTRON_END) throw new Error('Invalid electron experiment state.');
  return { model: ELECTRON_MODEL, tick: s.tick, parameters: validateElectronParameters(s.parameters) };
}
/** Parse an electron experiment file and migrate supported older versions. */
export function parseElectronFile(text: string): { state: ElectronState; view: ElectronView; migrated: boolean } {
  if (text.length > 100000) throw new Error('Electron files must be smaller than 100 KB.');
  const f = JSON.parse(text);
  if (f?.format !== 'zeropoint-electron' || ![1, 2, 3, 4].includes(f.version)) throw new Error('Choose a ZeroPoint electron experiment file.');
  // Versions 1 to 3 hold the same tick and parameters; version 4 changed how the lattice pairs polarize.
  const migrated = [1, 2, 3].includes(f.version) && f.state?.model === `electron-polarization/${f.version}`;
  if (!migrated && f.version !== ELECTRON_FILE_VERSION) throw new Error('Incompatible electron file version.');
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
/** Return the fixed representative location for a lattice or shell sample. */
export function sampleCentre(index: number): Vec {
  if (index >= LATTICE_SAMPLES) {
    const shell = Math.floor((index - LATTICE_SAMPLES) / SAMPLES_PER_SHELL), site = (index - LATTICE_SAMPLES) % SAMPLES_PER_SHELL;
    const z = (Math.floor(site / 16) - 2) * .36, r = Math.sqrt(1 - z * z), a = (site % 16) * Math.PI / 8;
    return scale([r * Math.cos(a), r * Math.sin(a), z], SHELL_RADII[shell]);
  }
  return [(index % GRID_SIDE - GRID_HALF) * GRID_SPACING, (Math.floor(index / GRID_SIDE) % GRID_SIDE - GRID_HALF) * GRID_SPACING, (Math.floor(index / (GRID_SIDE ** 2)) - GRID_HALF) * GRID_SPACING];
}
/**
 * Radius (in R) inside which a lattice pair turns all the way to the charge. Fleming gives no scale: the polarization
 * of a unit charge is far weaker than this, so the radius is a magnification, like the spin gain.
 */
export const FULL_ALIGNMENT_RADIUS = 1.6;
/**
 * Mean radial alignment ⟨cos⟩ of the pairs at a radius. "The same total amount of polarization occurs at each distance
 * away from the charge; it is just spread out over increasingly larger volumes" (The Zero-Point Universe ch. 6), so the
 * mean falls with the inverse square of distance and the total through every sphere is the same.
 */
export const meanAlignment = (radius: number) => Math.min(1, (FULL_ALIGNMENT_RADIUS / Math.max(radius, 1e-9)) ** 2);
/** ⟨cos⟩ of the final angle when uniformly random directions each turn the share `w` of their way to a common axis. */
export function alignmentOfShare(w: number) {
  const a = 1 - Math.max(0, Math.min(1, w));
  // (1 + cos aπ) / (2(1 − a²)), with its limit π²(1 − a)/(4(1 + a)) as a → 1.
  return 1 - a < 1e-6 ? Math.PI ** 2 * (1 - a) / (4 * (1 + a)) : (1 + Math.cos(a * Math.PI)) / (2 * (1 - a * a));
}
const SHARE_STEPS = 512;
/** Inverse of `alignmentOfShare`, tabulated: the share each pair must turn for a given mean alignment. */
const SHARE_TABLE = Array.from({ length: SHARE_STEPS + 1 }, (_, i) => {
  const target = i / SHARE_STEPS; let lo = 0, hi = 1;
  for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (alignmentOfShare(mid) < target) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
});
/** The share of its way to the charge that each pair at a radius turns, so that the mean alignment is `meanAlignment`. */
export function turnShare(radius: number) {
  const mean = meanAlignment(radius);
  if (mean >= 1) return 1;
  const x = mean * SHARE_STEPS, i = Math.min(SHARE_STEPS - 1, Math.floor(x));
  return SHARE_TABLE[i] + (SHARE_TABLE[i + 1] - SHARE_TABLE[i]) * (x - i);
}
/** A pair turns quickly at first and settles as it opens; it never overshoots. */
const settle = (u: number) => 1 - (1 - u) ** 2;
const TURN_STEPS = 64;
/** Mean alignment of pairs caught at every stage of their turn, for each final share (tabulated over the lifetime). */
const TURNING_TABLE = Array.from({ length: TURN_STEPS + 1 }, (_, i) => {
  let sum = 0; for (let n = 0; n < 200; n++) sum += alignmentOfShare(i / TURN_STEPS * settle((n + .5) / 200));
  return sum / 200;
});
/**
 * Mean alignment of the pairs on display when each will finally turn the share `w`: at any instant they are spread
 * over every stage of that turn, so this is lower than the settled `alignmentOfShare(w)`.
 */
export function alignmentWhileTurning(w: number) {
  const x = Math.max(0, Math.min(1, w)) * TURN_STEPS, i = Math.min(TURN_STEPS - 1, Math.floor(x));
  return TURNING_TABLE[i] + (TURNING_TABLE[i + 1] - TURNING_TABLE[i]) * (x - i);
}
/**
 * The orientation a generation is born with. Pairs "are continually being produced in somewhat random orientations"
 * (Electron Properties §3): each site's successive generations get their own seeded direction, uniform on the sphere.
 */
export function birthDirection(index: number, generation: number): Vec {
  const z = 1 - 2 * ((index * .7548776662466927 + generation * .5698402909980532 + .31) % 1), angle = index * 2.399963229728653 + generation * 1.9416110387254666;
  return [Math.sqrt(1 - z * z) * Math.cos(angle), Math.sqrt(1 - z * z) * Math.sin(angle), z];
}
/**
 * Derive the representative dipole geometry and fields at a sample site.
 *
 * Lattice pairs polarize the way Fleming describes: each generation is born at its own random angle and turns toward
 * the charge during its life, completely inside `FULL_ALIGNMENT_RADIUS` and by a share that thins with distance
 * outside it, so most distant pairs are "only oriented to a slight degree". `aligned` is the direction a fully
 * polarized pair would have (with the spin and motion turns); `direction` is where this generation actually points.
 * Shell samples (the spin close-up) keep the ordered Fig. 2 geometry and start from `aligned`.
 */
export function dipoleAt(s: ElectronState, index: number) {
  const centre = sampleCentre(index), field = referenceFields(s, centre), inward = unit(field.electric);
  const lifetime = Math.PI * (.8 + (index % 11) / 25), cycles = s.tick * ELECTRON_DT / lifetime + (index * .61803398875) % 1;
  const generation = Math.floor(cycles), u = cycles - generation;
  const localAxis = unit(add(spinAxis(s.parameters), scale(inward, -dot(spinAxis(s.parameters), inward))));
  // Fixed-site local turns, stronger near the core. Keep + ends inward by centering the sweep on radial alignment.
  const spinTurn = s.parameters.mode === 'electric' ? 0 : s.parameters.spin * Math.min(Math.PI / 2, spinRateAtRadius(field.radius) * lifetime);
  const spinRate = norm(localAxis) ? spinTurn / lifetime : 0;
  const motionAxis = unit(field.motion), motionTurn = Math.min(.3, 1.5 * norm(field.motion));
  const turns = (from: Vec) => rotate(rotate(from, localAxis, spinTurn * (u - .5)), motionAxis, -motionTurn * (1 - u));
  const aligned = turns(inward), born = birthDirection(index, generation);
  let direction = aligned, share = 1;
  if (index < LATTICE_SAMPLES) {
    // Before the electron is introduced the share is zero: an unpolarized medium that keeps renewing at random.
    share = norm(inward) ? turnShare(field.radius) * alignmentProgress(s, field.radius) : 0;
    const axis = unit(cross(born, inward)), angle = Math.acos(Math.max(-1, Math.min(1, dot(born, inward))));
    direction = turns(share ? rotate(born, norm(axis) ? axis : unit(cross(born, [1, .2, .3])), angle * share * settle(u)) : born);
  }
  const separation = .22 * lifecycleEnvelope(u, 1);
  // Rotation-only lobe velocity; excludes the separately illustrated radial separation/collapse.
  const spinPositiveVelocity = scale(cross(localAxis, direction), spinRate * separation / 2);
  return { index, centre, field, direction, aligned, born, share, separation, generation, age: u * lifetime, lifetime, progress: u, localAxis, motionAxis, spinTurn, spinRate, motionTurn, spinPositiveVelocity, spinNegativeVelocity: scale(spinPositiveVelocity, -1),
    positive: add(centre, scale(direction, separation / 2)), negative: add(centre, scale(direction, -separation / 2)) };
}
/**
 * The total radial alignment of the displayed lattice pairs, shell by shell: the sum of each pair's direction along the
 * inward radius, in bins of `width`. Outside `FULL_ALIGNMENT_RADIUS` the sum is level, because the number of pairs
 * grows as r² while their mean alignment falls as 1/r²: Gauss's law read from the dipoles themselves. `expected` is
 * what the rule predicts for pairs caught mid-turn, and `settled` what they reach by the end of their lives. The
 * outermost bins, which the cubic sample cuts off, are left out.
 */
export function shellAlignment(s: ElectronState, width = GRID_SPACING) {
  const bins = Math.floor(GRID_HALF * GRID_SPACING / width), core: Vec = [electronX(s), 0, 0];
  const shells = Array.from({ length: bins }, (_, i) => ({ radius: (i + .5) * width, pairs: 0, total: 0, mean: 0, expected: 0, settled: 0 }));
  for (let i = 0; i < LATTICE_SAMPLES; i++) {
    const d = dipoleAt(s, i), out = add(d.centre, scale(core, -1)), bin = Math.floor(norm(out) / width);
    if (!d.field.valid || bin >= bins) continue;
    shells[bin].pairs++; shells[bin].total += dot(d.direction, unit(scale(out, -1)));
    shells[bin].expected += alignmentWhileTurning(d.share); shells[bin].settled += alignmentOfShare(d.share);
  }
  for (const shell of shells) shell.mean = shell.pairs ? shell.total / shell.pairs : 0;
  return shells;
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
