/** A deterministic, qualitative animation of Fleming §4, not a force-law solver. */
export type ChargePair = 'electron-electron' | 'electron-proton';
export const STEP = 1 / 30;
export const BASE_PRESSURE = 1;
export type Zepton = {
  id: number; site: number; x: number; y: number; homeX: number; homeY: number;
  angle: number; age: number; lifetime: number; alignment: number;
  gap: boolean; deflected: boolean; contribution: number; neighbor: number | null;
};
export type PressureSample = { time: number; inner: number; outer: number };
export type Interaction = { id: number; time: number; text: string };
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
export const phase = (p: Zepton) => clamp(p.age / p.lifetime, 0, 1);
export const extent = (p: Zepton) => .19 * Math.sin(Math.PI * phase(p));
export function lifeStage(p: Zepton) {
  const f = phase(p);
  return f >= 1 ? 'Annihilated' : f < .15 ? 'Born · random orientation' : f < .5
    ? p.gap ? 'Expanding · pushing neighbours' : 'Aligning · expanding'
    : 'Collapsing · approaching annihilation';
}

export class CasimirModel {
  tick = 0;
  particles: Zepton[] = [];
  events: Interaction[] = [];
  history: PressureSample[] = [];
  births = 0;
  deaths = 0;
  gapBirths = 0;
  released = false;
  boundaryReached = false;
  left: number;
  right: number;
  leftVelocity = 0;
  rightVelocity = 0;
  inner = BASE_PRESSURE;
  outer = BASE_PRESSURE;
  private randomState: number;
  private nextId = 1;
  private eventId = 1;

  constructor(public pair: ChargePair = 'electron-electron', public separation = 5.6, seed = 2026) {
    this.randomState = seed >>> 0;
    this.left = -separation / 2;
    this.right = separation / 2;
    // A staggered cohort is already present; pressure builds as it interacts.
    for (let row = 0; row < 9; row++) for (let col = 0; col < 23; col++) {
      const x = (col - 11) * .52, y = (row - 4) * .52;
      if (Math.min(Math.hypot(x - this.left, y), Math.hypot(x - this.right, y)) < .5) continue;
      const p = this.birth(row * 23 + col, x, y, false);
      p.age = this.random() * p.lifetime * .8;
    }
    this.history.push({ time: 0, inner: 1, outer: 1 });
  }
  get time() { return this.tick * STEP; }
  get delta() { return this.inner - this.outer; }
  get midpoint() { return (this.left + this.right) / 2; }
  private random() {
    this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  private log(text: string) {
    this.events = [{ id: this.eventId++, time: this.time, text }, ...this.events].slice(0, 5);
  }
  private birth(site: number, x: number, y: number, gap: boolean) {
    const p: Zepton = { id: this.nextId++, site, x, y, homeX: x, homeY: y,
      angle: this.random() * Math.PI * 2, age: 0, lifetime: gap ? 1.5 + this.random() : 2.4 + this.random() * 1.5,
      alignment: 0, gap, deflected: false, contribution: 0, neighbor: null };
    this.particles.push(p); this.births++;
    if (gap) { this.gapBirths++; this.log(`Gap filled by Zepton #${p.id} · random orientation`); }
    return p;
  }
  /** Direction of the positive lobe; softening is solely for the drawing. */
  field(x: number, y: number): [number, number] {
    let ex = 0, ey = 0;
    for (const [cx, q] of [[this.left, -1], [this.right, this.pair === 'electron-electron' ? -1 : 1]]) {
      const dx = x - cx, r = (dx * dx + y * y + .18) ** 1.5;
      ex += q * dx / r; ey += q * y / r;
    }
    return [ex, ey];
  }
  bridge(p: Zepton) { return p.x > this.left + .35 && p.x < this.right - .35 && Math.abs(p.y) < 1.5; }
  /** Shared kernel for the heat map, probe, and pressure readings. */
  pressureAt(x: number, y: number, contributors = this.particles) {
    let delta = 0;
    for (const p of contributors) {
      if (!p.contribution) continue;
      const d2 = (x - p.x) ** 2 + (y - p.y) ** 2;
      if (d2 < 6) delta += p.contribution * Math.exp(-d2 / .85) * .075;
    }
    return clamp(BASE_PRESSURE + delta, .15, 1.85);
  }
  step() {
    this.tick++;
    const dead: Zepton[] = [];
    for (const p of this.particles) { p.age += STEP; if (p.age >= p.lifetime) dead.push(p); }
    this.particles = this.particles.filter(p => p.age < p.lifetime);
    for (const p of dead) {
      this.deaths++;
      if (!p.gap) this.birth(p.site, p.homeX, p.homeY, false);
    }
    const gaps: { x: number; y: number }[] = [];
    for (const p of this.particles) {
      const f = phase(p), [ex, ey] = this.field(p.x, p.y);
      const neutral = Math.hypot(p.x - this.midpoint, p.y) < .4 && this.pair === 'electron-electron';
      const turn = Math.atan2(Math.sin(Math.atan2(ey, ex) - p.angle), Math.cos(Math.atan2(ey, ex) - p.angle));
      if (f > .08 && !neutral) p.angle += turn * Math.min(1, STEP * 8 * f);
      p.alignment = neutral ? 0 : Math.max(0, Math.cos(turn)) * Math.min(1, f * 5);
      p.contribution = 0; p.neighbor = null;
      if (!this.bridge(p)) continue;
      if (this.pair === 'electron-electron') {
        const middle = Math.abs(p.homeX - this.midpoint) < .9 && Math.abs(p.homeY) < 1.1;
        if (!p.gap && middle && f > .38) {
          if (!p.deflected) { p.deflected = true; gaps.push({ x: p.homeX, y: p.homeY }); }
          p.y = p.homeY + (p.homeY >= 0 ? 1 : -1) * .4 * Math.sin(Math.PI * (f - .38) / .62);
        }
        // Newly expanding, disordered gap dipoles add isotropic pressure.
        if (p.gap) p.contribution = 1.7 * Math.sin(Math.PI * f) * (f < .5 ? 1 : .45);
      } else {
        // Early growth pushes back; aligned contraction has greater weight.
        p.contribution = p.alignment * Math.sin(Math.PI * f) * (f < .5 ? .22 : -1.25);
        if (f > .5 && p.alignment > .6) {
          let nearest: Zepton | undefined, distance = .9;
          for (const q of this.particles) {
            if (q.id === p.id || q.alignment < .5) continue;
            const d = Math.hypot(q.x - p.x, q.y - p.y);
            if (d < distance) { distance = d; nearest = q; }
          }
          if (nearest) {
            p.neighbor = nearest.id;
            // Small schematic inward displacement; fixed birth sites replenish the field.
            p.x += (nearest.x - p.x) * STEP * .1;
            p.y += (nearest.y - p.y) * STEP * .1;
          }
        }
      }
    }
    for (const g of gaps) {
      if (this.particles.filter(p => p.gap).length < 48)
        this.birth(-1, g.x + (this.random() - .5) * .2, g.y + (this.random() - .5) * .2, true);
    }
    if (dead.length && this.tick % 9 === 0) this.log(`${dead.length} Zepton${dead.length > 1 ? 's' : ''} annihilated · field replenished`);
    if (this.pair === 'electron-proton' && this.tick % 45 === 0)
      this.log('Aligned neighbours contract into short-lived voids');
    let total = 0;
    for (let i = 0; i < 9; i++) total += this.pressureAt(this.left + (this.right - this.left) * (.2 + i * .075), 0);
    this.inner = total / 9;
    this.outer = (this.pressureAt(this.left - 1, 0) + this.pressureAt(this.right + 1, 0)) / 2;
    if (this.tick % 3 === 0) this.history = [...this.history, { time: this.time, inner: this.inner, outer: this.outer }].slice(-240);
    if (this.released && !this.boundaryReached) {
      this.leftVelocity -= this.delta * STEP * 1.8;
      this.rightVelocity += this.delta * STEP * 1.8 / (this.pair === 'electron-proton' ? 1836 : 1);
      this.left += this.leftVelocity * STEP; this.right += this.rightVelocity * STEP;
      if (this.right - this.left <= 2.2 || this.left < -5 || this.right > 5) {
        this.boundaryReached = true; this.hold();
      }
    }
  }
  hold() { this.released = false; this.leftVelocity = 0; this.rightVelocity = 0; }
}
