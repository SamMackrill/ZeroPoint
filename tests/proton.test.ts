import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ELECTRON, DEFAULT_ELECTRON_VIEW, ELECTRON_FILE_VERSION, ELECTRON_MODEL, FULL_ALIGNMENT_RADIUS, LATTICE_SAMPLES, POLARIZERS, dipoleAt, dot, enclosedCharge,
  norm, parseElectronFile, polarizationRate, radiusOf, referenceFields, sampleCentre, scale, shellAlignment, tauOf, unit, validateElectronParameters,
  type ElectronMode, type ElectronState, type Particle,
} from '../src/electron/model';
import { faradayLines } from '../src/electron/fieldLines';

/** A state for a particle in a mode at a tick (the polarization is established by tick 360). */
const state = (particle: Particle, mode: ElectronMode = 'electric', tick = 360): ElectronState => ({ model: ELECTRON_MODEL, tick, parameters: { ...DEFAULT_ELECTRON, mode, particle } });

// Fleming, "Electron and proton radii are due to quantum polarization rate and the speed of light".
describe('the proton as a second polarizer', () => {
  it('turns c over its circumference: about 1386 times the electron’s rate, the ratio of the radii (§4)', () => {
    expect(polarizationRate('electron')).toBeCloseTo(3.933e19, -16);
    expect(polarizationRate('proton')).toBeCloseTo(5.452e22, -19);
    expect(polarizationRate('proton') / polarizationRate('electron')).toBeCloseTo(1386, 0);
    expect(radiusOf('electron') / radiusOf('proton')).toBeCloseTo(polarizationRate('proton') / polarizationRate('electron'), 9);
    // Both shells reach the speed of light at their own radius.
    for (const particle of ['electron', 'proton'] as const) expect(2 * Math.PI * radiusOf(particle) * polarizationRate(particle)).toBeCloseTo(299792458, 0);
    expect(tauOf('proton')).toBeCloseTo(0.8751e-15 / 299792458, 30);
    expect(POLARIZERS.proton).toMatchObject({ charge: 1, g: 2.1086 });
  });
  it('has the opposite field: outward from a proton, with enclosed charge +1', () => {
    for (const point of [[1.5, 0, 0], [0, -2, 1], [-1, 1, 1]] as const) {
      const e = referenceFields(state('electron'), [...point]).electric, p = referenceFields(state('proton'), [...point]).electric;
      expect(dot(unit(p), unit([...point]))).toBeCloseTo(1, 12);
      expect(dot(unit(e), unit([...point]))).toBeCloseTo(-1, 12);
      expect(norm(p)).toBeCloseTo(norm(e), 12);
    }
    expect(enclosedCharge(state('proton'), 2)).toBeCloseTo(1, 3);
    expect(enclosedCharge(state('electron'), 2)).toBeCloseTo(-1, 3);
  });
  it('carries its moment along the spin, with g = 2.1086 in proton magnetons; the electron’s is against it', () => {
    const at: [number, number, number] = [0, 0, 2], p = referenceFields(state('proton', 'spin'), at).intrinsic, e = referenceFields(state('electron', 'spin'), at).intrinsic;
    expect(p[2]).toBeGreaterThan(0); expect(e[2]).toBeLessThan(0);
    expect(norm(p) / norm(e)).toBeCloseTo(2.1086 / 2.00231930436, 9);
  });
  it('reverses the moving charge’s magnetic field', () => {
    const at: [number, number, number] = [0, 1.5, 0];
    const p = referenceFields(state('proton', 'moving', 2880), at).motion, e = referenceFields(state('electron', 'moving', 2880), at).motion;
    expect(norm(p)).toBeGreaterThan(0);
    expect(dot(unit(p), unit(e))).toBeCloseTo(-1, 12);
  });
  it('turns its pairs’ positive ends outward, where the electron’s turn inward (§3)', () => {
    let outward = 0, inward = 0, counted = 0;
    for (let i = 0; i < LATTICE_SAMPLES; i++) {
      const radius = norm(sampleCentre(i));
      if (radius < 0.5 || radius > FULL_ALIGNMENT_RADIUS) continue;
      const out = unit(sampleCentre(i)), p = dipoleAt(state('proton'), i), e = dipoleAt(state('electron'), i);
      // Fully polarized near the core: each pair has turned its whole share, along the field.
      expect(p.share).toBeCloseTo(1, 9); expect(e.share).toBeCloseTo(1, 9);
      expect(dot(p.aligned, out)).toBeCloseTo(1, 9); expect(dot(e.aligned, out)).toBeCloseTo(-1, 9);
      outward += dot(p.direction, out); inward += dot(e.direction, scale(out, -1)); counted++;
    }
    expect(counted).toBeGreaterThan(10);
    expect(outward / counted).toBeGreaterThan(0.5); expect(inward / counted).toBeGreaterThan(0.5);
  });
  it('polarizes with the same strength along its own field, shell by shell', () => {
    const p = shellAlignment(state('proton')), e = shellAlignment(state('electron'));
    expect(p.map(s => s.expected)).toEqual(e.map(s => s.expected));
    for (const shell of p.filter(s => s.pairs > 20)) expect(shell.mean).toBeGreaterThan(0);
  });
  it('validates the particle, keeps it in files, and opens older files as an electron', () => {
    expect(() => validateElectronParameters({ ...DEFAULT_ELECTRON, particle: 'neutron' })).toThrow('The particle must be an electron or a proton.');
    const proton = { format: 'zeropoint-electron', version: ELECTRON_FILE_VERSION, state: state('proton'), view: DEFAULT_ELECTRON_VIEW };
    expect(parseElectronFile(JSON.stringify(proton))).toMatchObject({ migrated: false, state: { parameters: { particle: 'proton' } } });
    const { particle: _none, ...older } = DEFAULT_ELECTRON;
    const v4 = parseElectronFile(JSON.stringify({ format: 'zeropoint-electron', version: 4, state: { model: 'electron-polarization/4', tick: 120, parameters: older }, view: DEFAULT_ELECTRON_VIEW }));
    expect(v4).toMatchObject({ migrated: true, state: { model: ELECTRON_MODEL, tick: 120, parameters: { particle: 'electron' } } });
    expect(() => parseElectronFile(JSON.stringify({ ...proton, state: { ...state('proton'), parameters: older } }))).toThrow('The particle must be an electron or a proton.');
  });
  it('traces Faraday lines outward from the proton, as from the electron', () => {
    for (const particle of ['electron', 'proton'] as const) {
      const lines = faradayLines(state(particle), false);
      expect(lines.length).toBe(40);
      const long = lines.filter(line => line.length > 20);
      expect(long.length).toBeGreaterThan(30);
      for (const line of long) expect(norm(line.at(-1)!)).toBeGreaterThan(norm(line[0]) + 1);
    }
  });
});

