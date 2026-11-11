import { describe, expect, it } from 'vitest';
import { CasimirModel, CHAIN_SQUEEZE, GAP_LIFETIME, ORDINARY_LIFETIME, REACH_PER_LIFETIME, SHORTEST_CHAIN_LIFETIME, extent, parseCasimirFile, STEP, wavelength, type ChargePair } from '../src/casimir/model';

/** Advance a model by a requested amount of simulation time. */
const advance = (m: CasimirModel, seconds: number) => { for (let i = 0; i < Math.round(seconds / STEP); i++) m.step(); };
describe('extended Casimir illustrative lifecycle', () => {
  it('replays births, interactions and pressure deterministically', () => {
    const a = new CasimirModel(), b = new CasimirModel();
    advance(a, 8); advance(b, 8);
    expect(a.particles).toEqual(b.particles);
    expect(a.history).toEqual(b.history);
    expect(a.gapBirths).toBeGreaterThan(0);
    expect(a.births - a.deaths).toBe(a.particles.length);
  });
  it('replaces annihilated identities and grows then collapses the lobes', () => {
    const m = new CasimirModel(); const first = { ...m.particles[0] };
    expect(extent({ ...first, age: 0 })).toBe(0);
    expect(extent({ ...first, age: first.lifetime / 2 })).toBeCloseTo(REACH_PER_LIFETIME * first.lifetime, 12);
    expect(extent({ ...first, age: first.lifetime })).toBeCloseTo(0);
    advance(m, 5);
    expect(m.particles.some(p => p.id === first.id)).toBe(false);
    expect(m.particles.every(p => p.age < p.lifetime)).toBe(true);
  });
  it('opens each Zepton to its own wavelength: a shorter life is a smaller reach', () => {
    const m = new CasimirModel(), [a, b] = [...m.particles].sort((x, y) => x.lifetime - y.lifetime).filter((_, i, all) => i === 0 || i === all.length - 1);
    expect(b.lifetime).toBeGreaterThan(a.lifetime);
    expect(wavelength(b) / wavelength(a)).toBeCloseTo(b.lifetime / a.lifetime, 12);
    expect(extent({ ...b, age: b.lifetime / 2 }) * 2).toBeCloseTo(wavelength(b), 12);
  });
  it('draws every gap birth between like charges smaller than every ordinary Zepton', () => {
    expect(GAP_LIFETIME.shortest + GAP_LIFETIME.span).toBeLessThan(ORDINARY_LIFETIME.shortest);
    const m = new CasimirModel(); let seen = 0;
    for (let second = 0; second < 20; second++) {
      advance(m, 1);
      const gap = m.particles.filter(p => p.gap), ordinary = m.particles.filter(p => !p.gap);
      seen += gap.length;
      if (gap.length) expect(Math.max(...gap.map(wavelength))).toBeLessThan(Math.min(...ordinary.map(wavelength)));
    }
    expect(seen).toBeGreaterThan(20);
  });
  it('shortens the aligned chain between opposite charges, and nowhere else', () => {
    const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;
    const attraction = new CasimirModel('electron-proton'); advance(attraction, 14);
    const chain = attraction.particles.filter(p => attraction.bridge(p) && Math.abs(p.homeY) < .3), outside = attraction.particles.filter(p => !attraction.bridge(p));
    expect(chain.length).toBeGreaterThan(5); expect(outside.length).toBeGreaterThan(20);
    // Replacements on the line between the charges are shorter-wavelength than the field around them.
    expect(mean(chain.map(wavelength))).toBeLessThan(mean(outside.map(wavelength)) * .85);
    expect(Math.min(...chain.map(p => p.lifetime))).toBeGreaterThanOrEqual(ORDINARY_LIFETIME.shortest * CHAIN_SQUEEZE - 1e-12);
    expect(Math.min(...outside.map(p => p.lifetime))).toBeGreaterThanOrEqual(ORDINARY_LIFETIME.shortest);
    // Between like charges nothing closes up: every ordinary Zepton keeps its full range of lifetimes.
    const repulsion = new CasimirModel('electron-electron'); advance(repulsion, 14);
    expect(Math.min(...repulsion.particles.filter(p => !p.gap).map(p => p.lifetime))).toBeGreaterThanOrEqual(ORDINARY_LIFETIME.shortest);
    for (const p of repulsion.particles) expect(repulsion.squeeze({ ...p, alignment: 1 })).toBe(1);
    // As released charges approach, the replacements get smaller still.
    const nearest = chain.reduce((a, b) => (a.x < b.x ? a : b)); // beside the left charge, so still between them once they close
    const held = attraction.squeeze({ ...nearest, alignment: 1 }); attraction.right = attraction.left + attraction.separation * .7;
    expect(held).toBe(CHAIN_SQUEEZE); expect(attraction.squeeze({ ...nearest, alignment: 1 })).toBeCloseTo(CHAIN_SQUEEZE * .7, 12);
    expect(attraction.squeeze({ ...nearest, alignment: .2 })).toBe(1);
  });
  it.each([false, true])('never replaces a chain Zepton with a longer-lived one (charges released: %s)', released => {
    const m = new CasimirModel('electron-proton'); if (released) m.released = true;
    let squeezed = 0, shortened = 0;
    for (let tick = 0; tick < 40 / STEP; tick++) {
      // Those about to vanish this step, with the squeeze their replacement will get.
      const dying = m.particles.filter(p => !p.gap && p.age + STEP >= p.lifetime).map(p => ({ site: p.site, lifetime: p.lifetime, squeeze: m.squeeze(p) }));
      m.step();
      for (const old of dying) {
        const next = m.particles.find(p => p.site === old.site && p.age === 0)!;
        expect(next).toBeDefined();
        if (old.squeeze === 1) { expect(next.lifetime).toBeGreaterThanOrEqual(ORDINARY_LIFETIME.shortest); continue; }
        squeezed++; if (next.lifetime < old.lifetime) shortened++;
        expect(next.lifetime).toBeLessThanOrEqual(old.lifetime);
        expect(next.lifetime).toBeGreaterThanOrEqual(SHORTEST_CHAIN_LIFETIME - 1e-12);
      }
    }
    expect(squeezed).toBeGreaterThan(50); expect(shortened).toBeGreaterThan(20);
    // The shortest possible chain life still spans many fixed steps, so its opening and collapse are drawn.
    expect(SHORTEST_CHAIN_LIFETIME / STEP).toBeGreaterThan(20);
  });
  it.each([4, 5.6, 7])('produces opposite pressure tendencies at separation %s', separation => {
    for (const pair of ['electron-electron', 'electron-proton'] as ChargePair[]) {
      const m = new CasimirModel(pair, separation); advance(m, 12);
      const average = m.history.slice(-60).reduce((v, h) => v + h.inner - h.outer, 0) / 60;
      expect(pair === 'electron-electron' ? average : -average).toBeGreaterThan(.005);
      expect(Math.abs(m.outer - 1)).toBeLessThan(.02);
      expect(m.left).toBe(-separation / 2);
      expect(m.right).toBe(separation / 2);
      expect(m.particles.length).toBeLessThan(260);
    }
  });
  it('keeps gap births random and also shows early expansion in attracting chains', () => {
    const repulsion = new CasimirModel(); advance(repulsion, 3);
    expect(repulsion.particles.some(p => p.gap && p.contribution > 0)).toBe(true);
    const attraction = new CasimirModel('electron-proton'); advance(attraction, 3);
    expect(attraction.particles.some(p => p.contribution > 0)).toBe(true);
    expect(attraction.particles.some(p => p.contribution < 0 && p.neighbor !== null)).toBe(true);
    expect(attraction.gapBirths).toBe(0);
    expect(repulsion.field(0, 0)).toEqual([0, 0]);
  });
  it.each(['electron-electron', 'electron-proton'] as ChargePair[])('moves released %s charges from pressure and holds them again', pair => {
    const m = new CasimirModel(pair); advance(m, 5);
    const left = m.left, right = m.right; m.released = true; advance(m, 1);
    if (pair === 'electron-electron') expect(m.right - m.left).toBeGreaterThan(right - left);
    else expect(m.right - m.left).toBeLessThan(right - left);
    const ratio = Math.abs((m.left - left) / (m.right - right));
    expect(ratio).toBeCloseTo(pair === 'electron-electron' ? 1 : 1836, 5);
    m.hold(); const held = [m.left, m.right]; advance(m, 1); expect([m.left, m.right]).toEqual(held);
  });
  it('bounds release and keeps pressure finite over a long observation', () => {
    const m = new CasimirModel(); advance(m, 5); m.released = true; advance(m, 60);
    expect(m.boundaryReached).toBe(true); expect(m.released).toBe(false);
    expect(Number.isFinite(m.delta)).toBe(true);
    expect(m.births - m.deaths).toBe(m.particles.length);
  });
});

describe('Casimir files', () => {
  const file = (state: unknown) => JSON.stringify({ format: 'zeropoint-casimir', version: 1, state, view: {} });
  it('restores a saved run that continues exactly as the original', () => {
    const a = new CasimirModel('electron-proton', 6);
    advance(a, 3); a.released = true; // the charges move, so velocities and positions are saved too
    const b = CasimirModel.restore(parseCasimirFile(file(a.state())));
    expect(b.state()).toEqual(a.state());
    advance(a, 2); advance(b, 2);
    expect(b.state()).toEqual(a.state());
  });
  it('round-trips a run with gap births, which have no lattice site', () => {
    const a = new CasimirModel('electron-electron');
    advance(a, 8);
    expect(a.particles.some(p => p.site === -1)).toBe(true);
    expect(CasimirModel.restore(parseCasimirFile(file(a.state()))).state()).toEqual(a.state());
  });
  it('keeps the restored state independent of the file it came from', () => {
    const state = new CasimirModel().state(), b = CasimirModel.restore(state);
    b.step(); state.particles[0].x = 99;
    expect(b.particles[0].x).not.toBe(99);
  });
  it('rejects other files and invalid states', () => {
    const good = new CasimirModel().state();
    expect(() => parseCasimirFile('{}')).toThrow('Choose a ZeroPoint Casimir experiment file.');
    expect(() => parseCasimirFile(file({ ...good, pair: 'proton-proton' }))).toThrow('pair');
    expect(() => parseCasimirFile(file({ ...good, separation: 12 }))).toThrow('separation');
    expect(() => parseCasimirFile(file({ ...good, inner: 'high' }))).toThrow('inner');
    expect(() => parseCasimirFile(file({ ...good, tick: -1 }))).toThrow('tick');
    expect(() => parseCasimirFile(file({ ...good, particles: [{ ...good.particles[0], gap: 1 }] }))).toThrow('Zepton: gap');
    expect(() => parseCasimirFile(' '.repeat(1_000_001))).toThrow('smaller than 1 MB');
    // Values the parser's types allow but the run cannot use.
    expect(() => parseCasimirFile(file({ ...good, nextId: 1.5 }))).toThrow('nextId');
    expect(() => parseCasimirFile(file({ ...good, nextId: 2 ** 53 }))).toThrow('nextId'); // nextId++ would repeat it
    expect(() => parseCasimirFile(file({ ...good, tick: 2 ** 53 }))).toThrow('tick'); // tick++ would stall
    expect(() => parseCasimirFile(file({ ...good, particles: [good.particles[0], { ...good.particles[1], id: good.particles[0].id }] }))).toThrow('appears twice');
    expect(() => parseCasimirFile(file({ ...good, history: [{ time: 1, inner: 1, outer: 1 }, { time: .5, inner: 1, outer: 1 }] }))).toThrow('backwards');
    expect(() => parseCasimirFile(file({ ...good, births: -1 }))).toThrow('births');
    expect(() => parseCasimirFile(file({ ...good, left: 3, right: -3 }))).toThrow('charge positions');
    expect(() => parseCasimirFile(file({ ...good, particles: [{ ...good.particles[0], lifetime: 0 }] }))).toThrow('lifetime');
    expect(() => parseCasimirFile(file({ ...good, particles: [{ ...good.particles[0], site: 2.5 }] }))).toThrow('site');
    expect(() => parseCasimirFile(file({ ...good, particles: [{ ...good.particles[0], site: -2 }] }))).toThrow('site');
  });
});
