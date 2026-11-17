// Behaviour of individual companion diagrams that a reader relies on, beyond the book's numbers.
import { describe, expect, it } from 'vitest';
import { deflectionPath } from '../src/book/chapters/ch07';
import { precessingRadius } from '../src/book/chapters/ch12';

describe('book companion: diagrams', () => {
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
});
