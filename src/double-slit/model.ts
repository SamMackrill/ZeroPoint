// The double-slit model: Fleming's single photon between a source A and an absorber B, with a wall and two slits in the
// way (The Zero-Point Universe ch. 19, Fig. 19-3). Everything here is a pure function of the parameters and the tick.
// Lengths are in photon wavelengths λ and times in periods τ = λ/c, the terms Fleming's argument is made in.
import { lifecycleEnvelope } from '../model/pairMotion';

export const SLIT_MODEL = 'double-slit/1';
/** Ticks per period: one tick is τ/60. */
export const SLIT_TICKS_PER_TAU = 60;
export const SLIT_DT = 1 / SLIT_TICKS_PER_TAU;
/** A central pair lasts while the photon covers half a wavelength (ch. 19: "extinguished each half wavelength"). */
export const PAIR_TICKS = SLIT_TICKS_PER_TAU / 2;
/** The straight path from A to B, in λ. Fleming gives no distance; this is a display choice. */
export const PATH_LENGTH = 8;
/** The wall's distance from A, in λ: halfway, at a hand-off between two central pairs. */
export const WALL_AT = 4;
export const SLIT_END_TICK = PATH_LENGTH * SLIT_TICKS_PER_TAU;
/** How far a field moving at c spreads in one central pair's life: "a half wavelength to either side" (ch. 19). */
export const LIGHT_REACH = 0.5;
/** Inside a quarter-wavelength the inverse-square fall-off is softened so the centre stays finite (as in the Light lab). */
export const FIELD_CORE = 0.25;

/** What stands between A and B: a wall with two slits, or nothing. */
export type WallKind = 'slits' | 'open';
/** How fast the photon's fields spread: far faster than light (Fleming), or held to light speed (his counterfactual). */
export type FieldSpeed = 'fast' | 'light';
/** A point in the plane of the page: x across the path, y along it from A, both in λ. */
export type Point = readonly [number, number];

/** The scenario (wall and field speed) and the slit geometry. */
export interface SlitParameters {
  wall: WallKind;
  fields: FieldSpeed;
  /** Distance from the straight path to the centre of each slit, in λ. The slits are equidistant from the path. */
  slitOffset: number;
  /** Width of each slit, in λ. */
  slitWidth: number;
}
export const DEFAULT_SLITS: SlitParameters = { wall: 'slits', fields: 'fast', slitOffset: 3, slitWidth: 1 };
export const SLIT_OFFSET_RANGE = [2, 5] as const;
export const SLIT_WIDTH_RANGE = [0.5, 2] as const;

/** Validate double-slit parameters and return a safe copy. */
export function validateSlitParameters(value: unknown): SlitParameters {
  if (!value || typeof value !== 'object') throw new Error('Missing double-slit parameters.');
  const p = value as SlitParameters;
  if (p.wall !== 'slits' && p.wall !== 'open') throw new Error('The wall must be "slits" or "open".');
  if (p.fields !== 'fast' && p.fields !== 'light') throw new Error('The field speed must be "fast" or "light".');
  for (const [key, [min, max]] of [['slitOffset', SLIT_OFFSET_RANGE], ['slitWidth', SLIT_WIDTH_RANGE]] as const) {
    if (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key] < min || p[key] > max) throw new Error(`${key} must be between ${min} and ${max}.`);
  }
  return { wall: p.wall, fields: p.fields, slitOffset: p.slitOffset, slitWidth: p.slitWidth };
}

/** The two openings in the wall as [from, to] across the path, left then right. */
export function openings(p: SlitParameters): readonly [Point, Point] {
  const half = p.slitWidth / 2;
  return [[-p.slitOffset - half, -p.slitOffset + half], [p.slitOffset - half, p.slitOffset + half]];
}
/** Distance from the straight path to the nearest edge of either slit, in λ. */
export const innerEdge = (p: SlitParameters) => p.slitOffset - p.slitWidth / 2;
/** Length of the route from A through the centre of a slit to B, in λ: longer than the straight path. */
export const routeViaSlit = (p: SlitParameters) => Math.hypot(p.slitOffset, WALL_AT) + Math.hypot(p.slitOffset, PATH_LENGTH - WALL_AT);

/**
 * Whether the photon's field gets past the wall. With nothing in the way it does. With a wall it must reach a slit:
 * Fleming's fields spread far faster than light and do; a field held to light speed reaches only half a wavelength
 * from the path, so "the fields, and thus the photon, could never make it through the slits" (ch. 19).
 */
export const fieldPasses = (p: SlitParameters) => p.wall === 'open' || p.fields === 'fast' || innerEdge(p) <= LIGHT_REACH;
/** The tick at which the sequence stops at the wall, or null when the photon goes on to B. */
export const haltTick = (p: SlitParameters) => (fieldPasses(p) ? null : WALL_AT * SLIT_TICKS_PER_TAU);
/** How many central pairs the run induces: one per half wavelength as far as the photon gets. */
export const pairCount = (p: SlitParameters) => (haltTick(p) ?? SLIT_END_TICK) / PAIR_TICKS;

/**
 * The central pair at a tick. As in the Light lab (book Figs 4-9 and 5-1), each pair is born along the path, turns
 * 180° in the plane of the page and lies across the path at midlife, when it is widest (its own wavelength, λ/2);
 * successive pairs alternate in polarity. The centres follow the straight line from A to B at c on both sides of the
 * wall: Fleming's photon takes "the same time t" with the slits in the way, which a centre detouring through a slit at
 * c could not do. `active` is false once the photon has been absorbed at B or has halted at the wall.
 */
export function centralPair(p: SlitParameters, tick: number) {
  const count = pairCount(p), index = Math.min(count - 1, Math.max(0, Math.floor(tick / PAIR_TICKS)));
  const progress = Math.max(0, Math.min(1, (tick - index * PAIR_TICKS) / PAIR_TICKS)), polarity = index % 2 === 0 ? 1 : -1;
  const turn = Math.PI * progress;
  return {
    index, progress, polarity, turn,
    /** The pair's centre: the middle of the half wavelength of path the photon covers during its life. */
    centre: [0, (index + 0.5) * 0.5] as Point,
    /** Unit vector from the negative to the positive lobe: along the path at birth, across it at midlife. */
    direction: [polarity * Math.sin(turn), Math.cos(turn)] as Point,
    separation: 0.5 * lifecycleEnvelope(progress, 1),
    active: tick >= 0 && tick < count * PAIR_TICKS,
  };
}

/** Which side of the wall a height is on: −1 toward A, +1 toward B. */
const side = (y: number) => (y > WALL_AT ? 1 : -1);

/** The shortest route between two points on opposite sides of the wall that passes through one opening. */
function routeThrough([from, to]: Point, a: Point, b: Point): number {
  const crossing = a[0] + (WALL_AT - a[1]) / (b[1] - a[1]) * (b[0] - a[0]);
  if (crossing >= from && crossing <= to) return Math.hypot(b[0] - a[0], b[1] - a[1]);
  const edge = crossing < from ? from : to;
  return Math.hypot(edge - a[0], WALL_AT - a[1]) + Math.hypot(b[0] - edge, b[1] - WALL_AT);
}

/** The field's fall-off after a route of length `r`: inverse-square at distance (ch. 19), softened inside the core. */
const fallOff = (p: SlitParameters, r: number) => (p.fields === 'light' && r > LIGHT_REACH ? 0 : 1 / (1 + (r / FIELD_CORE) ** 2));

/**
 * The field at a point, taken from the active central pair (not an electromagnetic field solver).
 *
 * As in the Light lab the pair produces the field: its strength is the transverse part of the pair's moment, so it is
 * zero at each hand-off and reverses with the next pair, and it "declines in strength at a rate proportional to the
 * inverse of the distance squared" (ch. 19). It is taken as established at once wherever it reaches, because Fleming's
 * fields spread far faster than light. Across the wall the field "travels through the slits": the distance is then the
 * shortest route through each opening, and the two openings carry half each (`left` and `right`), so a wall never
 * strengthens the field beyond it and the two shares are equal on the straight path. Fleming does not say how the
 * field divides between the slits; the route rule and the equal shares are this model's construction. Held to light
 * speed, a field stops half a wavelength from its pair. `envelope` is the unsigned strength.
 */
export function fieldAt(p: SlitParameters, tick: number, point: Point) {
  const pair = centralPair(p, tick), none = { electric: 0, envelope: 0, direct: 0, left: 0, right: 0 };
  if (!pair.active) return none;
  const open = lifecycleEnvelope(pair.progress, 1);
  let direct = 0, left = 0, right = 0;
  if (p.wall === 'open' || side(point[1]) === side(pair.centre[1])) direct = fallOff(p, Math.hypot(point[0] - pair.centre[0], point[1] - pair.centre[1]));
  else { const [l, r] = openings(p); left = fallOff(p, routeThrough(l, pair.centre, point)) / 2; right = fallOff(p, routeThrough(r, pair.centre, point)) / 2; }
  const envelope = open * (direct + left + right);
  return { electric: pair.polarity * Math.sin(pair.turn) * envelope, envelope, direct: open * direct, left: open * left, right: open * right };
}

/** The field on the face of the wall nearest the active pair, at `x` across the path. */
export function fieldOnWall(p: SlitParameters, tick: number, x: number) {
  const pair = centralPair(p, tick);
  return fieldAt(p, tick, [x, WALL_AT + side(pair.centre[1]) * 1e-9]);
}

/** Where the run stands at a tick. */
export type SlitStatus = 'travelling' | 'halted' | 'absorbed';

/** Summarize the run at a tick: the photon's place, what becomes of it, and the field arriving at B. */
export function slitReadout(p: SlitParameters, tick: number) {
  const halt = haltTick(p), time = tick * SLIT_DT;
  const status: SlitStatus = halt !== null && tick >= halt ? 'halted' : tick >= SLIT_END_TICK ? 'absorbed' : 'travelling';
  return {
    time, status,
    /** Distance from A along the straight path, in λ: the photon moves at c = 1 λ/τ. */
    position: status === 'halted' ? WALL_AT : Math.min(PATH_LENGTH, time),
    pair: centralPair(p, tick),
    /** When the photon reaches B, in τ: the straight-line distance over c with or without the slits, or never. */
    arrival: halt === null ? PATH_LENGTH : null,
    atB: fieldAt(p, tick, [0, PATH_LENGTH]),
  };
}

/** The ticks worth naming on the timeline, with their labels. */
export function slitEvents(p: SlitParameters): { tick: number; label: string; id: string }[] {
  const wall = WALL_AT * SLIT_TICKS_PER_TAU;
  if (p.wall === 'open') return [{ tick: SLIT_END_TICK, label: 'Absorbed at B', id: 'arrive' }];
  if (!fieldPasses(p)) return [{ tick: wall, label: 'Halted at the wall', id: 'wall' }, { tick: SLIT_END_TICK, label: 'Nothing arrives at B', id: 'arrive' }];
  return [{ tick: wall, label: 'Next pair induced beyond the wall', id: 'wall' }, { tick: SLIT_END_TICK, label: 'Absorbed at B', id: 'arrive' }];
}

/** Every tick of the run as CSV: the photon's place, its central pair and the field at B and on the wall at the slits. */
export function slitCsv(p: SlitParameters): string {
  const rows = ['model,tick,time_tau,status,position_lambda,pair,pair_polarity,field_at_B,field_at_B_via_left_slit,field_at_B_via_right_slit,field_on_wall_at_slit_centre'];
  for (let tick = 0; tick <= SLIT_END_TICK; tick++) {
    const r = slitReadout(p, tick);
    rows.push([SLIT_MODEL, tick, r.time.toFixed(4), r.status, r.position.toFixed(4), r.pair.active ? r.pair.index + 1 : '', r.pair.active ? r.pair.polarity : '',
      r.atB.electric.toExponential(4), r.atB.left.toExponential(4), r.atB.right.toExponential(4), fieldOnWall(p, tick, p.slitOffset).electric.toExponential(4)].join(','));
  }
  return rows.join('\n');
}
