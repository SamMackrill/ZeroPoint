import { add, C, DEFAULT_ELECTRON, dipoleAt, dot, ELECTRON_DT, ELECTRON_MODEL, RADIUS, enclosedCharge, scale } from './model';
import type { ElectronState, Vec } from './model';

/** Rest-frame Gauss comparison, independent of the animated introduction/motion. */
export function fluxAtRadius(radius: number) {
  const reference: ElectronState = { model: ELECTRON_MODEL, tick: 360, parameters: { ...DEFAULT_ELECTRON, mode: 'electric' } };
  return { field: 1 / radius ** 2, area: radius ** 2, charge: enclosedCharge(reference, radius) };
}

/** Kinematic interpretation of Fleming's effective shell scale; not local pair speed. */
export function effectiveShellScale(radiusRatio: number, rateRatio: number) {
  return { frequency: rateRatio * C / (2 * Math.PI * RADIUS), speedOverC: radiusRatio * rateRatio, limitRadius: 1 / rateRatio };
}

/** Conventional-current weights q/e times rotation-only velocity. */
export function chargeMotion(positiveVelocity: Vec) {
  const negativeVelocity = scale(positiveVelocity, -1);
  return { positiveVelocity, negativeVelocity, positiveCurrent: positiveVelocity, negativeCurrent: scale(negativeVelocity, -1) };
}

/** Half a tick either side: short enough to stay within one pair's lifetime almost everywhere. */
const TURN_STEP = .5;
/** A larger change of direction in half a tick is a jump (the electron passing beside the site), not a turn. */
const MAX_STEP_TURN = .05;

/**
 * Rotation-only velocity of a lattice pair's + end, from the model's own turns: Stationary's alignment toward the
 * electron, and Moving's motion-induced turn with its spin turn. It is the rate of change of the pair's direction
 * within one generation, with the separation held, so a replacement pair never reads as a jump; nor does a pair whose
 * direction flips as the electron passes beside it.
 */
export function latticeTurnVelocity(s: ElectronState, index: number): Vec {
  const d = dipoleAt(s, index), at = (tick: number) => { const e = dipoleAt({ ...s, tick }, index); return e.generation === d.generation && Math.acos(Math.min(1, dot(e.direction, d.direction))) < MAX_STEP_TURN ? { tick, direction: e.direction } : null; };
  const before = s.tick >= TURN_STEP ? at(s.tick - TURN_STEP) : null, after = at(s.tick + TURN_STEP);
  const a = before ?? { tick: s.tick, direction: d.direction }, b = after ?? { tick: s.tick, direction: d.direction };
  if (b.tick === a.tick) return [0, 0, 0];
  return scale(add(b.direction, scale(a.direction, -1)), d.separation / 2 / ((b.tick - a.tick) * ELECTRON_DT));
}
