import { C, DEFAULT_ELECTRON, ELECTRON_MODEL, RADIUS, enclosedCharge, scale } from './model';
import type { ElectronState } from './model';
import type { displayedDipole } from './spinGeometry';

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
export function chargeMotion(d: ReturnType<typeof displayedDipole>) {
  return { positiveVelocity: d.spinPositiveVelocity, negativeVelocity: d.spinNegativeVelocity,
    positiveCurrent: d.spinPositiveVelocity, negativeCurrent: scale(d.spinNegativeVelocity, -1) };
}
