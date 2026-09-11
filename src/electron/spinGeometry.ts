import { add, cross, dipoleAt, dot, LATTICE_SAMPLES, norm, referenceFields, rotate, sampleCentre, scale, SAMPLES_PER_SHELL, spinAxis, spinRateAtRadius, unit } from './model';
import type { ElectronParameters, ElectronState, SpinDisplay, Vec } from './model';

export const SHELL_COLOURS = ['#f4c783', '#bda7ff', '#8ed9c3', '#ed9cbb'];
export const shellBand = (index: number) => Math.floor((index - LATTICE_SAMPLES) / SAMPLES_PER_SHELL);
// Right-handed section coordinates: viewed from +axis, U is right and V is up.
/** Return a right-handed section frame for the selected spin axis. */
export function sectionFrame(axis: ElectronParameters['axis']): [Vec, Vec, Vec] {
  return axis === 'x' ? [[0, 1, 0], [0, 0, 1], [1, 0, 0]] : axis === 'y' ? [[0, 0, 1], [1, 0, 0], [0, 1, 0]] : [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
}
/** Orient a shell sample centre to the selected spin axis. */
export function shellCentre(index: number, axis: ElectronParameters['axis']): Vec {
  if (index < LATTICE_SAMPLES) return sampleCentre(index);
  const [u, v, n] = sectionFrame(axis), c = sampleCentre(index);
  return add(add(scale(u, c[0]), scale(v, c[1])), scale(n, c[2]));
}
export const shellSense = (band: number, spin: 1 | -1, alternating: boolean) => spin * (alternating && band % 2 ? -1 : 1);

/** Shared geometry for the 3D samples, exact equatorial section and inspector.
 * Section 3 supplies the preferred local turns; alternating whole bands is an
 * optional extension. Rate, gain, sampling and timing are display conventions.
 */
export function displayedDipole(s: ElectronState, index: number, display: SpinDisplay) {
  const d = dipoleAt(s, index);
  if (s.parameters.mode !== 'spin' || index < LATTICE_SAMPLES) return d;
  const centre = shellCentre(index, s.parameters.axis), field = referenceFields(s, centre), inward = unit(field.electric);
  const axis = spinAxis(s.parameters), localAxis = unit(add(axis, scale(inward, -dot(axis, inward))));
  const sense = shellSense(shellBand(index), s.parameters.spin, display.alternating);
  const spinTurn = sense * Math.min(1.35, spinRateAtRadius(field.radius) * display.gain * d.lifetime);
  const spinRate = norm(localAxis) ? spinTurn / d.lifetime : 0;
  // Each replacement starts partially aligned and turns toward radial alignment.
  const direction = rotate(inward, localAxis, -spinTurn * (1 - d.progress));
  const positive = add(centre, scale(direction, d.separation / 2)), negative = add(centre, scale(direction, -d.separation / 2));
  const spinPositiveVelocity = scale(cross(localAxis, direction), spinRate * d.separation / 2);
  return { ...d, centre, field, direction, localAxis, spinTurn, spinRate, positive, negative, spinPositiveVelocity, spinNegativeVelocity: scale(spinPositiveVelocity, -1) };
}

/** Curled local arrow, anchored at the pair midpoint; never an orbit of the core. */
export function localTurnArrow(d: ReturnType<typeof displayedDipole>): Vec[] {
  if (!norm(d.localAxis) || !d.spinRate) return [];
  const u = unit(scale(d.centre, -1)), v = cross(d.localAxis, u), sense = Math.sign(d.spinRate);
  const radius = .14, sweep = 1.2 + Math.min(3.2, Math.abs(d.spinRate) * 9);
  const point = (a: number) => add(d.centre, add(scale(u, radius * Math.cos(a)), scale(v, radius * Math.sin(a))));
  const points = Array.from({ length: 21 }, (_, i) => point(sense * sweep * i / 20));
  const end = points[20], angle = sense * sweep;
  const tangent = scale(add(scale(u, -Math.sin(angle)), scale(v, Math.cos(angle))), sense);
  const radial = add(scale(u, Math.cos(angle)), scale(v, Math.sin(angle)));
  return [...points, add(add(end, scale(tangent, -.045)), scale(radial, .025)), end, add(add(end, scale(tangent, -.045)), scale(radial, -.025))];
}

/** Return the equatorial sample indices for the requested shell count. */
export function sectionIndices(count: number) {
  return Array.from({ length: count * 16 }, (_, i) => LATTICE_SAMPLES + Math.floor(i / 16) * SAMPLES_PER_SHELL + 32 + i % 16);
}
