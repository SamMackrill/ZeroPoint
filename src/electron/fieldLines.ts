import { CORE_MASK, LATTICE_SAMPLES, add, dipoleAt, electronX, norm, scale, unit } from './model';
import type { ElectronState, Vec } from './model';

/** Display polarization: interpolate the actual representative pair moments, not reference E. */
export function polarizationGrid(state: ElectronState): Vec[] {
  return Array.from({ length: LATTICE_SAMPLES }, (_, i) => {
    const pair = dipoleAt(state, i);
    return scale(pair.direction, pair.separation);
  });
}

export function samplePolarization(grid: Vec[], point: Vec): Vec {
  const q = [point[0] / .6 + 9, point[1] / .8 + 4, point[2] / .8 + 3];
  if (q.some((v, i) => v < 0 || v > [18, 8, 6][i])) return [0, 0, 0];
  const base = q.map((v, i) => Math.min(Math.floor(v), [17, 7, 5][i]));
  const f = q.map((v, i) => v - base[i]);
  const result: Vec = [0, 0, 0];
  for (let z = 0; z <= 1; z++) for (let y = 0; y <= 1; y++) for (let x = 0; x <= 1; x++) {
    const weight = (x ? f[0] : 1 - f[0]) * (y ? f[1] : 1 - f[1]) * (z ? f[2] : 1 - f[2]);
    const v = grid[base[0] + x + 19 * (base[1] + y) + 171 * (base[2] + z)];
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

export function faradayLines(state: ElectronState, cutaway: boolean): Vec[][] {
  const grid = polarizationGrid(state), core: Vec = [electronX(state), 0, 0];
  const directions: Vec[] = Array.from({ length: 20 }, (_, i) => [Math.cos(i * Math.PI / 10), Math.sin(i * Math.PI / 10), 0]);
  if (!cutaway) for (let i = 0; i < 20; i++) {
    const z = 1 - 2 * (i + .5) / 20, r = Math.sqrt(1 - z * z), a = i * 2.399963;
    directions.push([r * Math.cos(a), r * Math.sin(a), z]);
  }
  return directions.map(n => tracePolarization(grid, add(core, scale(n, .38)), core));
}
