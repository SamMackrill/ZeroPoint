// The numbers the book companion's diagrams compute from Fleming's equations, against the values his text gives.
// Where they differ from the text, the item's notes record it; the tests pin what the page shows.
import { describe, expect, it } from 'vitest';
import { vacuumDensity } from '../src/book/chapters/ch02';

describe('book companion: the book’s numbers', () => {
  it('Equation 2-6: the density rises as the fourth power of the cutoff frequency, to an enormous value at the Planck length', () => {
    expect(vacuumDensity(1.616e-35)).toBeGreaterThan(1e110);
    expect(vacuumDensity(1e-4) / vacuumDensity(1e-3)).toBeCloseTo(1e4, 6);
  });
});
