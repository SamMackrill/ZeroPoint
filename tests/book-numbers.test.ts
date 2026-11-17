// The numbers the book companion's diagrams compute from Fleming's equations, against the values his text gives.
// Where they differ from the text, the item's notes record it; the tests pin what the page shows.
import { describe, expect, it } from 'vitest';
import { vacuumDensity } from '../src/book/chapters/ch02';
import { casimirPressure } from '../src/book/chapters/ch03';
import { PARTICLES, excludedDensity, massDensity } from '../src/book/chapters/ch16';
import { pathDiameter } from '../src/book/chapters/ch18';
import { bendingAngle, clockGain, shapiroDelay, TARGETS } from '../src/book/chapters/ch23';
import { TESTS } from '../src/book/chapters/ch24';
import { casimirForceEqualSpacing, coulombForce } from '../src/book/chapters/ch25';

describe('book companion: the book’s numbers', () => {
  it('Equation 3-1: the Casimir pressure at 1 µm is about 1.3 mPa', () => {
    expect(casimirPressure(1e-6)).toBeCloseTo(1.3e-3, 4);
  });

  it('Equation 2-6: the density rises as the fourth power of the cutoff frequency, to an enormous value at the Planck length', () => {
    expect(vacuumDensity(1.616e-35)).toBeGreaterThan(1e110);
    expect(vacuumDensity(1e-4) / vacuumDensity(1e-3)).toBeCloseTo(1e4, 6);
  });

  /** The energy a shell excludes, over a sphere of its mean diameter, in MeV; as Figure 16-1’s readout computes it. */
  const excludedEnergy = (particle: 'proton' | 'electron', [inner, outer]: [number, number]) => excludedDensity(particle, inner, outer) * (Math.PI / 6) * ((inner + outer) / 2) ** 3;

  it('Equation 16-1: the proton shell excludes 938 MeV; the electron shells about the Compton wavelength exclude 0.511 MeV', () => {
    const [proton] = PARTICLES.proton.shells, [printed, compton, pair] = PARTICLES.electron.shells;
    expect(excludedEnergy('proton', proton.d)).toBeCloseTo(938, -1);
    expect((proton.d[0] + proton.d[1]) / 2).toBeCloseTo(PARTICLES.proton.diameter, 3);
    expect(excludedEnergy('electron', compton.d)).toBeCloseTo(0.511, 3);
    expect((compton.d[0] + compton.d[1]) / 2).toBeCloseTo(PARTICLES.electron.diameter, 3);
    expect(excludedEnergy('electron', pair.d)).toBeCloseTo(0.511, 2);
    expect(pair.d[1] - pair.d[0]).toBeCloseTo(PARTICLES.electron.pair, 2);
    // The printed shell (p. 125) is not centred on the Compton wavelength and excludes 0.555 MeV; the page records it.
    expect(excludedEnergy('electron', printed.d)).toBeCloseTo(0.555, 3);
    // MeV/pm³ to GeV/cm³ is a factor of 10⁻³ × 10³⁰: the text’s 6.833 × 10²⁵ GeV/cm³ (p. 125).
    expect(massDensity('electron', PARTICLES.electron.diameter) * 1e27 / 1e25).toBeCloseTo(6.833, 3);
  });

  it('Figure 18-2: between two sun-sized stars 4 × 10²⁰ m apart the path of gravity is about 2.45 mm across', () => {
    expect(pathDiameter(4e20) * 1000).toBeCloseTo(2.45, 2);
    expect(pathDiameter(4e20) / 1e-10).toBeCloseTo(2.45e7, -5); // hydrogen atoms
  });

  it('Equation 23-6: starlight grazing the Sun bends 1.75″; a GPS clock gains about 45.7 µs a day', () => {
    expect(bendingAngle(1.32712440018e20, 6.957e8)).toBeCloseTo(1.75, 2);
    expect(clockGain(20.2e6)).toBeCloseTo(45.7, 0);
  });

  it('Equation 23-6: the Shapiro delay to Mercury at superior conjunction is about 220 µs', () => {
    expect(shapiroDelay(6.957e8, TARGETS.mercury.r) * 1e6).toBeGreaterThan(200);
    expect(shapiroDelay(6.957e8, TARGETS.mercury.r) * 1e6).toBeLessThan(240);
  });

  it('Equations 25-5 and 25-6: 55.3 N of Casimir attraction at 1.755 fm against about 18.7 N of Coulomb repulsion', () => {
    expect(casimirForceEqualSpacing(1.755)).toBeCloseTo(55.3, 0);
    expect(coulombForce(3.51)).toBeCloseTo(18.7, 0); // the text’s 20.6 N is recorded on the page as a discrepancy
  });

  it('Chapter 24: general relativity fails Fleming’s ten tests and passes the five classic ones', () => {
    expect(TESTS.filter(t => !t.gr).map(t => t.id)).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']);
    expect(TESTS.filter(t => t.gr).map(t => t.id)).toEqual(['A', 'B', 'C', 'D', 'E']);
  });
});
