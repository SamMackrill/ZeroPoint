// Geometry and field helpers shared by the companion's diagrams. Angles are in degrees, counter-clockwise from +x
// as the reader sees them (so 90° points up the page), although SVG's y axis runs down.

/** Degrees to radians. */
export const rad = (deg: number) => (deg * Math.PI) / 180;

/** Radians to degrees. */
export const deg = (r: number) => (r * 180) / Math.PI;

/** Clamp a value to a range. */
export const clamp = (v: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, v));

/** Linear interpolation. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smooth 0 → 1 easing with zero slope at both ends. */
export const ease = (t: number) => { const c = clamp(t); return c * c * (3 - 2 * c); };

/** The point at distance r from (x, y) in direction `angle` (degrees, up the page is 90°). */
export const polar = (x: number, y: number, r: number, angle: number): [number, number] => [x + r * Math.cos(rad(angle)), y - r * Math.sin(rad(angle))];

/** The direction from one point to another, in degrees (up the page is 90°). */
export const bearing = (x1: number, y1: number, x2: number, y2: number) => deg(Math.atan2(-(y2 - y1), x2 - x1));

/** The signed smallest turn from angle a to angle b, in degrees (−180 to 180]. */
export function turn(a: number, b: number) {
  const d = ((b - a) % 360 + 540) % 360 - 180;
  return d === -180 ? 180 : d;
}

/** Interpolate from angle a toward angle b by the shortest way. */
export const lerpAngle = (a: number, b: number, t: number) => a + turn(a, b) * t;

/** A small seeded generator (mulberry32), so scattered zeptons are the same on every visit. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A point source of a field: a charge (sign ±1) or a body of matter, with a strength. */
export interface Source { x: number; y: number; q: number }

/**
 * The inverse-square field of point sources at a point, as screen components (y down). It points away from a positive
 * source. Used only for its direction and relative strength: the diagrams are schematic.
 */
export function fieldAt(sources: readonly Source[], x: number, y: number): [number, number] {
  let fx = 0, fy = 0;
  for (const s of sources) {
    const dx = x - s.x, dy = y - s.y, d2 = Math.max(dx * dx + dy * dy, 36), d = Math.sqrt(d2);
    fx += (s.q * dx) / (d2 * d); fy += (s.q * dy) / (d2 * d);
  }
  return [fx, fy];
}

/** The field's direction at a point in degrees (up the page is 90°). */
export function fieldAngle(sources: readonly Source[], x: number, y: number) {
  const [fx, fy] = fieldAt(sources, x, y);
  return deg(Math.atan2(-fy, fx));
}

/**
 * Trace a field line from a start point by stepping along the field (forward) or against it, until it leaves the box,
 * comes within `stop` of a source, or runs out of steps. Returns the points visited.
 */
export function traceLine(sources: readonly Source[], x: number, y: number, dir: 1 | -1, box: { w: number; h: number }, stop = 12, step = 5, max = 400): [number, number][] {
  const points: [number, number][] = [[x, y]];
  for (let i = 0; i < max; i++) {
    const [fx, fy] = fieldAt(sources, x, y), m = Math.hypot(fx, fy);
    if (m === 0) break;
    x += (dir * fx * step) / m; y += (dir * fy * step) / m;
    points.push([x, y]);
    if (x < 0 || y < 0 || x > box.w || y > box.h) break;
    if (i > 2 && sources.some(s => Math.hypot(x - s.x, y - s.y) < stop)) break;
  }
  return points;
}

/** An SVG path through points. */
export const pathThrough = (points: readonly (readonly [number, number])[]) => points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');

/** Format a number for a readout to `sig` significant figures, with a power of ten for very large or small values. */
export function fmt(value: number, sig = 3) {
  if (!Number.isFinite(value)) return '∞';
  if (value === 0) return '0';
  const a = Math.abs(value);
  if (a >= 1e5 || a < 1e-3) {
    const [m, e] = value.toExponential(Math.max(0, sig - 1)).split('e');
    return `${Number(m)} × 10${superscript(Number(e))}`;
  }
  return String(Number(value.toPrecision(sig)));
}

const SUPER: Record<string, string> = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };

/** An integer as Unicode superscript digits. */
export const superscript = (n: number) => String(n).split('').map(ch => SUPER[ch] ?? ch).join('');

/** A vector field on the page: the field's screen components (y down) at a point. */
export type FieldFn = (x: number, y: number) => [number, number];

/**
 * Trace a line of any field from a start point, forward or backward, until it leaves the box, returns to its start
 * (a closed loop) or runs out of steps. Returns the points visited and whether the line closed.
 */
export function traceField(field: FieldFn, x: number, y: number, dir: 1 | -1, box: { w: number; h: number }, step = 4, max = 900): { points: [number, number][]; closed: boolean } {
  const points: [number, number][] = [[x, y]], sx = x, sy = y;
  for (let i = 0; i < max; i++) {
    // Midpoint (second-order) step: a first-order step gains step² on the squared radius of a circular line each time,
    // so a line round a wire would spiral outward instead of closing.
    const [fx, fy] = field(x, y), m = Math.hypot(fx, fy);
    if (m === 0) break;
    const [gx, gy] = field(x + (dir * fx * step) / (2 * m), y + (dir * fy * step) / (2 * m)), n = Math.hypot(gx, gy);
    if (n === 0) break;
    x += (dir * gx * step) / n; y += (dir * gy * step) / n;
    points.push([x, y]);
    if (x < 0 || y < 0 || x > box.w || y > box.h) break;
    if (i > 8 && Math.hypot(x - sx, y - sy) < step * 1.2) return { points, closed: true };
  }
  return { points, closed: false };
}

/** A long straight wire seen end-on: its place on the page and its current (positive out of the page). */
export interface Wire { x: number; y: number; i: number }

/** The magnetic field of wires seen end-on, as screen components: it circles each wire, counter-clockwise for a current out of the page. */
export function wireField(wires: readonly Wire[], x: number, y: number): [number, number] {
  let bx = 0, by = 0;
  for (const w of wires) {
    const dx = x - w.x, dy = y - w.y, r2 = Math.max(dx * dx + dy * dy, 64);
    bx += (w.i * dy) / r2; by -= (w.i * dx) / r2;
  }
  return [bx, by];
}

/** A share of a field's peak as a whole percentage, padded so a live readout keeps its width as the number changes. */
export const percentOfPeak = (share: number) => `${String(Math.round(share * 100)).padStart(3, ' ')} % of its peak`;
