import { CORE_MASK, GRID_SIDE, GRID_SPACING, GRID_HALF, LATTICE_SAMPLES, alignmentProgress, add, dipoleAt, electronX, norm, scale, unit } from './model';
import type { ElectronState, Vec } from './model';

/** Display polarization: interpolate the actual representative pair moments, not reference E. */
export function polarizationGrid(state: ElectronState): Vec[] {
  return Array.from({ length: LATTICE_SAMPLES }, (_, i) => {
    const pair = dipoleAt(state, i);
    return scale(pair.direction, pair.field.valid ? pair.separation : 0);
  });
}

/** Trilinearly interpolate a polarization vector within the sample grid. */
export function samplePolarization(grid: Vec[], point: Vec): Vec {
  const q = point.map(v => v / GRID_SPACING + GRID_HALF);
  if (q.some(v => v < 0 || v > GRID_SIDE - 1)) return [0, 0, 0];
  const base = q.map(v => Math.min(Math.floor(v), GRID_SIDE - 2));
  const f = q.map((v, i) => v - base[i]);
  const result: Vec = [0, 0, 0];
  for (let z = 0; z <= 1; z++) for (let y = 0; y <= 1; y++) for (let x = 0; x <= 1; x++) {
    const weight = (x ? f[0] : 1 - f[0]) * (y ? f[1] : 1 - f[1]) * (z ? f[2] : 1 - f[2]);
    const v = grid[base[0] + x + GRID_SIDE * (base[1] + y) + GRID_SIDE ** 2 * (base[2] + z)];
    for (let i = 0; i < 3; i++) result[i] += v[i] * weight;
  }
  return result;
}

/** Trace outward against P with midpoint integration; arrowheads later point inward along P. */
export function tracePolarization(grid: Vec[], seed: Vec, core: Vec, steps = 160): Vec[] {
  const points: Vec[] = [seed], h = .055;
  for (let i = 0; i < steps; i++) {
    const p = points[points.length - 1], v = unit(samplePolarization(grid, p));
    if (!norm(v)) break;
    const mid = add(p, scale(v, -h / 2)), tangent = unit(samplePolarization(grid, mid));
    if (!norm(tangent)) break;
    const next = add(p, scale(tangent, -h));
    if (norm(add(next, scale(core, -1))) < CORE_MASK || !norm(samplePolarization(grid, next))) break;
    // Stop stalled paths / loops in a disordered initial pattern.
    if (points.some((old, j) => j < points.length - 5 && j % 3 === 0 && Math.hypot(old[0] - next[0], old[1] - next[1], old[2] - next[2]) < h * .6)) break;
    points.push(next);
  }
  return points;
}

/** Build display Faraday lines from the current polarization field. */
export function faradayLines(state: ElectronState, cutaway: boolean): Vec[][] {
  if (alignmentProgress(state) === 0) return [];
  const grid = polarizationGrid(state), core: Vec = [electronX(state), 0, 0];
  const count = cutaway ? 20 : 40;
  const directions: Vec[] = Array.from({ length: count }, (_, i) => {
    if (cutaway) return [Math.cos(i * Math.PI / 10), Math.sin(i * Math.PI / 10), 0];
    const z = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - z * z), a = i * 2.399963229728653;
    return [r * Math.cos(a), r * Math.sin(a), z];
  });
  return directions.map(n => tracePolarization(grid, add(core, scale(n, .38)), core));
}
