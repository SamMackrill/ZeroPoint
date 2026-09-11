import { describe, expect, it } from 'vitest';
import { CasimirModel, extent, STEP, type ChargePair } from '../src/casimir/model';

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
    expect(extent({ ...first, age: first.lifetime / 2 })).toBeCloseTo(.19);
    expect(extent({ ...first, age: first.lifetime })).toBeCloseTo(0);
    advance(m, 5);
    expect(m.particles.some(p => p.id === first.id)).toBe(false);
    expect(m.particles.every(p => p.age < p.lifetime)).toBe(true);
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
