import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLITS, LIGHT_REACH, PAIR_TICKS, PATH_LENGTH, SLIT_END_TICK, WALL_AT, centralPair, fieldAt, fieldOnWall, fieldPasses, haltTick, innerEdge, openings,
  pairCount, routeViaSlit, slitCsv, slitEvents, slitReadout, validateSlitParameters, wallCrossing, type SlitParameters,
} from '../src/double-slit/model';

const slits = DEFAULT_SLITS;
const open: SlitParameters = { ...slits, wall: 'open' };
const held: SlitParameters = { ...slits, fields: 'light' };
/** The tick at the middle of central pair `n` (0-based), when its field is strongest. */
const midlife = (n: number) => n * PAIR_TICKS + PAIR_TICKS / 2;

describe('double-slit geometry', () => {
  it('puts two slits equidistant from the straight path (Fig. 19-3)', () => {
    expect(openings(slits)).toEqual([[-3.5, -2.5], [2.5, 3.5]]);
    expect(innerEdge(slits)).toBe(2.5);
    expect(openings({ ...slits, slitOffset: 2, slitWidth: 2 })).toEqual([[-3, -1], [1, 3]]);
  });
  it('makes the route through a slit longer than the straight path', () => {
    expect(routeViaSlit(slits)).toBe(10);
    expect(routeViaSlit(slits)).toBeGreaterThan(PATH_LENGTH);
  });
  it('crosses the wall on the straight line where a slit allows it, otherwise at the nearer edge', () => {
    const [left, right] = openings(slits);
    expect(wallCrossing(right, [0, 2], [6, 6])).toBe(3);
    expect(wallCrossing(right, [0, 2], [0, 8])).toBe(2.5);
    expect(wallCrossing(left, [0, 2], [0, 8])).toBe(-2.5);
    expect(wallCrossing(right, [0, 3], [20, 5])).toBe(3.5);
  });
  it('validates parameters', () => {
    expect(validateSlitParameters({ ...slits, extra: 1 })).toEqual(slits);
    expect(() => validateSlitParameters(null)).toThrow('Missing double-slit parameters.');
    expect(() => validateSlitParameters({ ...slits, wall: 'brick' })).toThrow('The wall must be');
    expect(() => validateSlitParameters({ ...slits, fields: 'slow' })).toThrow('The field speed must be');
    expect(() => validateSlitParameters({ ...slits, slitOffset: 1 })).toThrow('slitOffset must be between 2 and 5.');
    expect(() => validateSlitParameters({ ...slits, slitWidth: Number.NaN })).toThrow('slitWidth must be between 0.5 and 2.');
  });
  it('keeps every allowed slit beyond the reach of a field held to light speed', () => {
    expect(innerEdge({ ...slits, slitOffset: 2, slitWidth: 2 })).toBeGreaterThan(LIGHT_REACH);
  });
});

describe('the photon between A and B', () => {
  it('reaches B in the straight-line time with or without the slits (ch. 19: "the same time t")', () => {
    for (const p of [open, slits]) {
      expect(fieldPasses(p)).toBe(true);
      expect(haltTick(p)).toBeNull();
      expect(pairCount(p)).toBe(16);
      expect(slitReadout(p, SLIT_END_TICK - 1).status).toBe('travelling');
      expect(slitReadout(p, SLIT_END_TICK)).toMatchObject({ status: 'absorbed', position: PATH_LENGTH, arrival: PATH_LENGTH, time: PATH_LENGTH });
    }
    expect(slitReadout(slits, 150).position).toBe(slitReadout(open, 150).position);
  });
  it('never gets through when its fields are held to light speed', () => {
    expect(fieldPasses(held)).toBe(false);
    expect(haltTick(held)).toBe(240);
    expect(pairCount(held)).toBe(8);
    expect(slitReadout(held, 239).status).toBe('travelling');
    expect(slitReadout(held, 240)).toMatchObject({ status: 'halted', position: WALL_AT, arrival: null });
    expect(slitReadout(held, SLIT_END_TICK)).toMatchObject({ status: 'halted', position: WALL_AT });
    expect(centralPair(held, 300).active).toBe(false);
    // With nothing in the way the same field speed is no obstacle.
    expect(haltTick({ ...held, wall: 'open' })).toBeNull();
  });
  it('induces one central pair per half wavelength along the straight path', () => {
    const first = centralPair(slits, 0), beyond = centralPair(slits, 240);
    expect(first).toMatchObject({ index: 0, polarity: 1, progress: 0, separation: 0, active: true });
    expect(first.centre).toEqual([0, 0.25]);
    // The hand-off at the wall induces pair 9 just beyond it, still on the straight line.
    expect(beyond).toMatchObject({ index: 8, progress: 0 });
    expect(beyond.centre).toEqual([0, 4.25]);
    expect(centralPair(slits, 239).centre[1]).toBeLessThan(WALL_AT);
    expect(centralPair(slits, SLIT_END_TICK).active).toBe(false);
  });
  it('turns each pair 180° in the page, across the path and widest at midlife, alternating in polarity', () => {
    const born = centralPair(slits, 0), mid = centralPair(slits, midlife(0)), next = centralPair(slits, midlife(1));
    expect(born.direction[0]).toBeCloseTo(0); expect(born.direction[1]).toBeCloseTo(1);
    expect(mid.direction[0]).toBeCloseTo(1); expect(mid.direction[1]).toBeCloseTo(0);
    expect(mid.separation).toBeCloseTo(0.5);
    expect(next.polarity).toBe(-1);
    expect(next.direction[0]).toBeCloseTo(-1);
  });
});

describe('the field of the central pair', () => {
  it('is extinguished at each hand-off and reverses with the next pair', () => {
    const probe = [1, 1] as const;
    expect(fieldAt(slits, 0, probe).envelope).toBe(0);
    expect(fieldAt(slits, PAIR_TICKS, probe).envelope).toBe(0);
    expect(fieldAt(slits, midlife(0), probe).electric).toBeGreaterThan(0);
    expect(fieldAt(slits, midlife(1), probe).electric).toBeLessThan(0);
  });
  it('falls with the inverse square of distance, well away from the pair', () => {
    const near = fieldAt(open, midlife(0), [2, 0.25]).envelope, far = fieldAt(open, midlife(0), [4, 0.25]).envelope;
    expect(near / far).toBeGreaterThan(3.9);
    expect(near / far).toBeLessThan(4);
  });
  it('reaches B through both slits equally while the pair is still short of the wall', () => {
    const atB = fieldAt(slits, midlife(3), [0, PATH_LENGTH]);
    expect(atB.direct).toBe(0);
    expect(atB.left).toBeGreaterThan(0);
    expect(atB.left).toBeCloseTo(atB.right, 12);
    expect(atB.envelope).toBeCloseTo(atB.left + atB.right, 12);
    // Off the axis the nearer slit carries more.
    const offAxis = fieldAt(slits, midlife(3), [2, PATH_LENGTH]);
    expect(offAxis.right).toBeGreaterThan(offAxis.left);
  });
  it('takes the straight line through a slit where there is one, and bends round its edge where there is not', () => {
    const pair = centralPair(slits, midlife(7)).centre, [, right] = openings(slits);
    // A point as far beyond the wall as the pair is short of it, in line with the pair through the right-hand slit's centre.
    const through = [(right[0] + right[1]), WALL_AT + (WALL_AT - pair[1])] as const;
    const seen = fieldAt(slits, midlife(7), through), unobstructed = fieldAt(open, midlife(7), through);
    // That slit's route is the straight line, so its half share is half of what the open path would bring.
    expect(seen.right).toBeCloseTo(unobstructed.direct / 2, 12);
    expect(seen.left).toBeLessThan(seen.right);
    // Straight behind the wall's middle the route is longer than the straight line, so the field is weaker.
    expect(fieldAt(slits, midlife(7), [0, 4.5]).envelope).toBeLessThan(fieldAt(open, midlife(7), [0, 4.5]).envelope);
  });
  it('is weaker at B through the slits than over an open path, and direct once the pair is beyond the wall', () => {
    expect(fieldAt(slits, midlife(3), [0, PATH_LENGTH]).envelope).toBeLessThan(fieldAt(open, midlife(3), [0, PATH_LENGTH]).envelope);
    const after = fieldAt(slits, midlife(12), [0, PATH_LENGTH]);
    expect(after.direct).toBeGreaterThan(0);
    expect(after.left + after.right).toBe(0);
    expect(after.envelope).toBe(fieldAt(open, midlife(12), [0, PATH_LENGTH]).envelope);
  });
  it('stops half a wavelength from the pair when held to light speed, so nothing reaches a slit or B', () => {
    const t = midlife(7), y = centralPair(held, t).centre[1];
    expect(fieldAt(held, t, [0.4, y]).envelope).toBeGreaterThan(0);
    expect(fieldAt(held, t, [0.6, y]).envelope).toBe(0);
    expect(fieldOnWall(held, t, 0).envelope).toBeGreaterThan(0);
    expect(fieldOnWall(held, t, slits.slitOffset).envelope).toBe(0);
    for (let tick = 0; tick <= SLIT_END_TICK; tick += 5) expect(fieldAt(held, tick, [0, PATH_LENGTH]).envelope).toBe(0);
    // Fleming's fields do reach the slits.
    expect(fieldOnWall(slits, t, slits.slitOffset).envelope).toBeGreaterThan(0);
  });
  it('is gone once the photon is absorbed', () => {
    expect(fieldAt(slits, SLIT_END_TICK, [0, PATH_LENGTH - 0.25]).envelope).toBe(0);
    expect(slitReadout(slits, SLIT_END_TICK).atB.envelope).toBe(0);
  });
});

describe('timeline events and export', () => {
  it('names the wall and the arrival', () => {
    expect(slitEvents(slits)).toEqual([{ tick: 240, label: 'Next pair induced beyond the wall', id: 'wall' }, { tick: 480, label: 'Absorbed at B', id: 'arrive' }]);
    expect(slitEvents(open)).toEqual([{ tick: 480, label: 'Absorbed at B', id: 'arrive' }]);
    expect(slitEvents(held).map(e => e.label)).toEqual(['Halted at the wall', 'Nothing arrives at B']);
  });
  it('exports every tick of the run', () => {
    const rows = slitCsv(slits).split('\n');
    expect(rows).toHaveLength(SLIT_END_TICK + 2);
    expect(rows[0].split(',')).toHaveLength(11);
    expect(rows[1]).toMatch(/^double-slit\/1,0,0\.0000,travelling,0\.0000,1,1,/);
    expect(rows.at(-1)).toMatch(/^double-slit\/1,480,8\.0000,absorbed,8\.0000,,,/);
    expect(slitCsv(held).split('\n').at(-1)).toContain(',halted,4.0000,');
  });
});
