// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DipoleCloseUp } from '../../src/experiments/medium/DipoleCloseUp';
import { FOCUS_DISTANCE, focusDistance, type PickedDipole } from '../../src/rendering/FieldRenderer';

const PICKED: PickedDipole = { slot: 3, generation: 2, frequency: 1, age: .5, lifetime: 1, separation: .3, position: [0, 0, 0] };
/** The x positions of the two lobes in the close-up. */
const lobes = (picked: PickedDipole) => [...render(<DipoleCloseUp picked={picked}/>).container.querySelectorAll('circle[r="20"]')].map(circle => Number(circle.getAttribute('cx')));

describe('Medium dipole close-up and focus', () => {
  it('draws the lobes apart at midlife, and coincident when the separation is zero', () => {
    const [positive, negative] = lobes(PICKED);
    expect(positive - negative).toBeCloseTo(220, 9);
    expect(lobes({ ...PICKED, separation: 0 })).toEqual([160, 160]);
    expect(lobes({ ...PICKED, age: 0, separation: 0 })).toEqual([160, 160]);
  });
  it('backs the focused camera off until the widest pair fits, whichever way it lies', () => {
    const fov = 43, fits = (span: number, aspect: number) => 2 * focusDistance(span, fov, aspect) * Math.tan(fov * Math.PI / 360) * Math.min(1, aspect);
    expect(focusDistance(0, fov, 1.6)).toBe(FOCUS_DISTANCE); expect(focusDistance(.3, fov, 1.6)).toBe(FOCUS_DISTANCE);
    for (const aspect of [.5, 1, 1.6]) for (const span of [.3, 2, 6.4]) expect(fits(span, aspect)).toBeGreaterThan(span);
    expect(focusDistance(6.4, fov, 1.6)).toBeGreaterThan(FOCUS_DISTANCE);
    expect(focusDistance(6.4, fov, .5)).toBeGreaterThan(focusDistance(6.4, fov, 1.6));
  });
});
