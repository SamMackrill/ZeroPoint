// Behaviour of individual companion diagrams that a reader relies on, beyond the book's numbers.
import { describe, expect, it } from 'vitest';
import { DEBYE_FAR, DEBYE_NEAREST, debyeMotion } from '../src/book/chapters/ch03';
import { PAIR_CYCLE, pairLife, sightedBySeek } from '../src/book/chapters/ch04';
import { percentOfPeak } from '../src/book/kit';
import { dwellAngle, meanOffset } from '../src/book/chapters/ch06';
import { deflectionPath } from '../src/book/chapters/ch07';
import { bodyVelocity, speedOfLight } from '../src/book/chapters/ch10';
import { precessingRadius } from '../src/book/chapters/ch12';

describe('book companion: diagrams', () => {
  it('Figure 6-1: an atom’s electron moves smoothly and always forward, lingering on the far side as the free electron nears', () => {
    for (const share of [0, 0.4, 0.92]) {
      let last = dwellAngle(-10, share);
      for (let psi = -10; psi < 10; psi += 0.01) {
        const angle = dwellAngle(psi, share);
        expect(angle - last, `share ${share}, psi ${psi}`).toBeGreaterThanOrEqual(0); // forward only
        expect(angle - last, `share ${share}, psi ${psi}`).toBeLessThan(25); // no jumps
        last = angle;
      }
    }
    expect(meanOffset(0)).toBeCloseTo(0, 6); // with no free charge the atom is neutral on average
    expect(meanOffset(0.4)).toBeGreaterThan(0.2);
    expect(meanOffset(0.92)).toBeGreaterThan(meanOffset(0.4));
  });

  it('Figure 4-9: each pair turns its half-turn and is gone before the next forms, so the charges never jump', () => {
    let last = -1;
    for (let t = 0; t < PAIR_CYCLE; t += 0.001) {
      const { turned, presence } = pairLife(t, true);
      if (t < 1) { expect(turned).toBeGreaterThanOrEqual(last); last = turned; } // one pair turns one way only
      else expect(presence).toBe(0); // between pairs nothing is drawn
    }
    expect(pairLife(PAIR_CYCLE - 1e-9, true).presence).toBe(0);
    expect(pairLife(0.5, true).presence).toBe(1);
    expect(pairLife(1, false)).toEqual({ turned: 180, presence: 1 }); // paused at the end of the turn
    expect(pairLife(1.07, false).presence).toBe(0); // between pairs, the gap stays empty
    expect(pairLife(0.5, false).presence).toBe(1);
    expect(pairLife(0.03, true).presence).toBeCloseTo(0.5, 9); // paused mid-fade, the fade is kept
    expect(pairLife(0, false).presence).toBe(1); // set to 0° by hand, the pair is shown
    // Sought while playing, then paused mid-fade: the seek did not mark the pair as shown in full, so the fade is kept.
    const sought = sightedBySeek(true);
    expect(pairLife(0.03, false || !sought).presence).toBeCloseTo(0.5, 9);
    expect(sightedBySeek(false)).toBe(true);
  });

  it('Figure 4-9: the field readouts keep one width as the value changes', () => {
    const widths = new Set(Array.from({ length: 101 }, (_, i) => percentOfPeak(i / 100).length));
    expect([...widths]).toHaveLength(1);
  });

  it('Figure 3-1: released dipoles part in I with shrunken moments and close in II with grown ones', () => {
    for (let r0 = 1.9; r0 <= 3.6; r0 += 0.05) { // the slider's range and step
      const one = debyeMotion('I', 0.8, r0), two = debyeMotion('II', 0.8, r0);
      expect(one.at(-1)!.r).toBeGreaterThanOrEqual(DEBYE_FAR);
      expect(one.slice(1).every(f => f.p < 1), `r0 ${r0}`).toBe(true);
      expect(two.at(-1)!.r - two.at(-1)!.p).toBeLessThanOrEqual(DEBYE_NEAREST);
      expect(two.slice(1).every(f => f.p > 1), `r0 ${r0}`).toBe(true);
      // Responsive dipoles part more slowly in I, and close faster in II, than rigid ones would.
      const rigidI = debyeMotion('I', 0, r0), rigidII = debyeMotion('II', 0, r0), at = (fs: typeof one, i: number) => Math.abs(fs[Math.min(i, fs.length - 1)].r - r0);
      expect(at(one, 30)).toBeLessThan(at(rigidI, 30));
      expect(at(two, 30)).toBeGreaterThan(at(rigidII, 30));
    }
  });

  it('Figure 7-3: at every slider setting the moving charge passes the fixed one, away if positive, toward if negative', () => {
    const body: [number, number] = [320, 190];
    for (let offset = 30; offset <= 160; offset += 5) { // the slider's range and step
      for (const q of [1, -1]) {
        const path = deflectionPath([body[0] + offset, 380], [0, -1.4], body, q * 40), [ex, ey] = path.at(-1)!;
        expect(ey, `offset ${offset}, charge ${q}`).toBeLessThan(body[1]); // it goes on past, not back
        expect(Math.sign(ex - (body[0] + offset)), `offset ${offset}, charge ${q}`).toBe(q);
      }
      // Near enough at the default and closer starts for the pressure between them to be drawn.
      if (offset <= 100) expect(Math.min(...deflectionPath([body[0] + offset, 380], [0, -1.4], body, 40).map(([x, y]) => Math.hypot(x - body[0], y - body[1])))).toBeLessThan(130);
    }
  });

  it('Figure 12-5: successive perihelia are one turn plus the chosen advance apart', () => {
    for (const advance of [0, 0.06, 0.15]) {
      // Search the second orbit for its perihelion (the smallest radius) and measure how far past one turn it falls.
      let best = 0, least = Infinity;
      for (let i = 0; i <= 20000; i++) { const th = Math.PI + (i / 20000) * 2 * Math.PI * 1.2, r = precessingRadius(th, 120, 0.55, advance); if (r < least) { least = r; best = th; } }
      expect((best / (2 * Math.PI) - 1) * 360, `advance ${advance}`).toBeCloseTo(advance * 360, 0);
    }
  });

  it('Figure 10-2: however much momentum, the velocity reads below c', () => {
    expect(speedOfLight(bodyVelocity(1, 2))).toBe('0.45 c');
    expect(speedOfLight(bodyVelocity(20, 1))).toBe('0.9988 c');
    expect(speedOfLight(bodyVelocity(500, 1))).toMatch(/^0\.99999\d* c$/);
    expect(speedOfLight(bodyVelocity(1e6, 1))).toBe('within a billionth of c');
  });
});
