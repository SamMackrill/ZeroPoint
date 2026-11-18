// Behaviour of individual companion diagrams that a reader relies on, beyond the book's numbers.
import { describe, expect, it } from 'vitest';
import { DEBYE_FAR, DEBYE_NEAREST, debyeMotion } from '../src/book/chapters/ch03';
import { PAIR_CYCLE, pairLife, sightedBySeek } from '../src/book/chapters/ch04';
import { percentOfPeak } from '../src/book/kit';
import { dwellAngle, meanOffset } from '../src/book/chapters/ch06';
import { channelFlow, circleRadii, deflectionPath, fieldLineXs } from '../src/book/chapters/ch07';
import { COIL_LENGTH, COIL_RADIUS, COIL_ZEPTONS, SEEDS, ZEPTON_COUNTS, coilField, coilFieldLine, linesForCurrent } from '../src/book/three/coil-math';
import { PATCH_AREA, SPHERE_LINES, evenDirections, patchAngle } from '../src/book/three/sphere-math';
import { bodyVelocity, speedOfLight } from '../src/book/chapters/ch10';
import { precessingRadius } from '../src/book/chapters/ch12';

describe('book companion: diagrams', () => {
  it('Figure 7-2: idle wheels between vortices turning together only turn; between rows that differ they travel', () => {
    expect(channelFlow(0.6, 0.6)).toBe(0);
    expect(channelFlow(0.8, -0.8)).toBeCloseTo(0.8, 9); // along A–B: the current
    expect(channelFlow(0.2, 0.8)).toBeLessThan(0); // an outer row lagging: the drift runs the other way
  });

  it('Figure 7-1: the lines of force grow in number with strength, and the circles spread out as 1/r', () => {
    expect(fieldLineXs(0.7)).toHaveLength(6); // as printed
    expect(fieldLineXs(0)).toHaveLength(0);
    expect(circleRadii(1)).toHaveLength(5);
    expect(circleRadii(0.5).length).toBeLessThan(circleRadii(1).length);
    expect(circleRadii(-1)).toEqual(circleRadii(1)); // the direction does not change the count
    const r = circleRadii(1), ratios = r.slice(1).map((v, i) => v / r[i]);
    for (const q of ratios) expect(q).toBeCloseTo(ratios[0], 1); // a constant ratio: density falling as 1/r
  });

  it('Figure 6-18: the coil’s field runs to the north pole on the right inside, and back the other way outside', () => {
    expect(coilField(0, 0)[0]).toBeGreaterThan(0); // inside, along +x: north to the right, as the caption says
    expect(coilField(0, COIL_RADIUS * 1.75)[0]).toBeLessThan(0); // outside, the opposite way (p. 59)
    expect(Math.abs(coilField(0, 0)[1])).toBeLessThan(1e-6); // on the axis, straight along it
    // A line from inside the coil leaves the right-hand end and comes back on the outside.
    const line = coilFieldLine(0, 0.35), xs = line.map(([x]) => x);
    expect(Math.max(...xs)).toBeGreaterThan(COIL_LENGTH / 2);
    expect(Math.max(...line.map(([, rho]) => rho))).toBeGreaterThan(COIL_RADIUS);
    // The field lines drawn follow the current: none when off, more as it rises, all of them at full current either way.
    expect(linesForCurrent(0)).toBe(0);
    expect(linesForCurrent(0.1)).toBe(1);
    expect(linesForCurrent(0.5)).toBe(SEEDS.length / 2);
    expect(linesForCurrent(-1)).toBe(SEEDS.length);
    // Every zepton the control can show has a place; those inside the coil spin about a field along +x.
    expect(COIL_ZEPTONS).toHaveLength(ZEPTON_COUNTS.many);
    for (const [x, rho] of COIL_ZEPTONS) {
      if (rho < COIL_RADIUS * 0.7) expect(coilField(x, rho)[0], `inside at ${x}, ${rho}`).toBeGreaterThan(0);
      else expect(rho, `outside at ${x}`).toBeGreaterThan(COIL_RADIUS * 1.3); // clear of the wire
    }
  });

  it('Figure 6-4: the lines come from every direction evenly, and the patch keeps one area as the sphere grows', () => {
    const dirs = evenDirections(SPHERE_LINES);
    for (const [x, y, z] of dirs) expect(Math.hypot(x, y, z)).toBeCloseTo(1, 9);
    const mean = dirs.reduce((m, [x, y, z]) => [m[0] + x, m[1] + y, m[2] + z], [0, 0, 0]).map(v => v / dirs.length);
    expect(Math.hypot(...mean)).toBeLessThan(0.05); // no direction favoured
    for (const r of [1, 2, 3.56]) expect(2 * Math.PI * r * r * (1 - Math.cos(patchAngle(r)))).toBeCloseTo(PATCH_AREA, 9);
  });

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
