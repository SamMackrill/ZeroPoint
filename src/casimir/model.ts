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
/** Constrain a numeric value to an inclusive interval. */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
/** Return the elapsed fraction of a Zepton's lifetime. */
export const phase = (p: Zepton) => clamp(p.age / p.lifetime, 0, 1);
/** Return the current half-separation of a Zepton's charge lobes. */
export const extent = (p: Zepton) => .19 * Math.sin(Math.PI * phase(p));
/** Describe the visible lifecycle stage of a Zepton. */
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

  /** Initialize a seeded field around the selected charge pairing. */
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
  /** Return elapsed simulation time in expanded observation units. */
  get time() { return this.tick * STEP; }
  /** Return the inner pressure minus the outer pressure. */
  get delta() { return this.inner - this.outer; }
  /** Return the current midpoint between the two charges. */
  get midpoint() { return (this.left + this.right) / 2; }
  /** Advance and sample the model's deterministic pseudorandom sequence. */
  private random() {
    this.randomState = (Math.imul(1664525, this.randomState) + 1013904223) >>> 0;
    return this.randomState / 4294967296;
  }
  /** Add an interaction message to the bounded event history. */
  private log(text: string) {
    this.events = [{ id: this.eventId++, time: this.time, text }, ...this.events].slice(0, 5);
  }
  /** Add a newly created Zepton at a field or gap site. */
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
  /** Report whether a Zepton lies in the interaction region between charges. */
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
  /** Advance particle lifecycles, pressure samples, and released charge motion. */
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
  /** Stop released charge motion while preserving their current positions. */
  hold() { this.released = false; this.leftVelocity = 0; this.rightVelocity = 0; }
  /** The full state, generator included, so a restored run continues exactly as this one would. */
  state(): CasimirState {
    const { pair, separation, tick, births, deaths, gapBirths, released, boundaryReached, left, right, leftVelocity, rightVelocity, inner, outer, randomState, nextId, eventId } = this;
    return {
      pair, separation, tick, births, deaths, gapBirths, released, boundaryReached, left, right, leftVelocity, rightVelocity, inner, outer, randomState, nextId, eventId,
      particles: this.particles.map(p => ({ ...p })), events: this.events.map(e => ({ ...e })), history: this.history.map(h => ({ ...h })),
    };
  }
  /** A model continuing from a saved state (validate it first: see parseCasimirFile). */
  static restore(state: CasimirState) {
    const model = new CasimirModel(state.pair, state.separation);
    Object.assign(model, state, { particles: state.particles.map(p => ({ ...p })), events: state.events.map(e => ({ ...e })), history: state.history.map(h => ({ ...h })) });
    return model;
  }
}

/** A Casimir run's saved state: the model's fields and its generator. */
export interface CasimirState {
  pair: ChargePair; separation: number; tick: number;
  particles: Zepton[]; events: Interaction[]; history: PressureSample[];
  births: number; deaths: number; gapBirths: number; released: boolean; boundaryReached: boolean;
  left: number; right: number; leftVelocity: number; rightVelocity: number; inner: number; outer: number;
  randomState: number; nextId: number; eventId: number;
}

/** Ids and counters stay well inside the safe-integer range, so a restored run can keep incrementing them exactly. */
const COUNT_LIMIT = 2 ** 48;
/** A non-negative integer: an id or a counter. */
const count = (v: number) => Number.isSafeInteger(v) && v >= 0 && v <= COUNT_LIMIT;
/** Charges further out than this (scene units) are not a state the model reaches. */
const POSITION_LIMIT = 1_000;

/** Largest Casimir file accepted, in characters. */
export const CASIMIR_FILE_LIMIT = 1_000_000;

/** Check that a value is an object holding the given fields of the given kinds; returns it typed. */
function shaped<T>(value: unknown, what: string, fields: Record<string, 'number' | 'boolean' | 'string' | 'number?'>): T {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`Invalid ${what}.`);
  const o = value as Record<string, unknown>;
  for (const [key, kind] of Object.entries(fields)) {
    const v = o[key];
    const ok = kind === 'number' ? Number.isFinite(v) : kind === 'number?' ? v === null || Number.isFinite(v) : typeof v === kind;
    if (!ok) throw new Error(`Invalid ${what}: ${key}.`);
  }
  return o as T;
}
/** Check that a value is an array of at most `max` items, each checked by `item`. */
function list<T>(value: unknown, what: string, max: number, item: (v: unknown) => T): T[] {
  if (!Array.isArray(value) || value.length > max) throw new Error(`Invalid ${what}.`);
  return value.map(item);
}

const ZEPTON = { id: 'number', site: 'number', x: 'number', y: 'number', homeX: 'number', homeY: 'number', angle: 'number', age: 'number', lifetime: 'number', alignment: 'number', gap: 'boolean', deflected: 'boolean', contribution: 'number', neighbor: 'number?' } as const;

/** Parse and validate a saved Casimir experiment (format zeropoint-casimir, version 1). */
export function parseCasimirFile(text: string): CasimirState {
  if (text.length > CASIMIR_FILE_LIMIT) throw new Error('Casimir files must be smaller than 1 MB.');
  const f = JSON.parse(text);
  if (f?.format !== 'zeropoint-casimir' || f.version !== 1) throw new Error('Choose a ZeroPoint Casimir experiment file.');
  const s = shaped<CasimirState>(f.state, 'Casimir state', {
    separation: 'number', tick: 'number', births: 'number', deaths: 'number', gapBirths: 'number', released: 'boolean', boundaryReached: 'boolean',
    left: 'number', right: 'number', leftVelocity: 'number', rightVelocity: 'number', inner: 'number', outer: 'number', randomState: 'number', nextId: 'number', eventId: 'number',
  });
  if (s.pair !== 'electron-electron' && s.pair !== 'electron-proton') throw new Error('Invalid Casimir state: pair.');
  if (s.separation < 4 || s.separation > 7) throw new Error('Invalid Casimir state: separation.');
  if (!count(s.tick) || !Number.isInteger(s.randomState) || s.randomState < 0 || s.randomState > 0xffffffff) throw new Error('Invalid Casimir state: tick or generator.');
  // Finite is not enough: step() divides by lifetimes and hands out ids, so a crafted file must not slip in values that
  // turn the run to NaN or repeat ids.
  for (const key of ['nextId', 'eventId', 'births', 'deaths', 'gapBirths'] as const) if (!count(s[key])) throw new Error(`Invalid Casimir state: ${key}.`);
  if (!(s.left < s.right) || Math.abs(s.left) > POSITION_LIMIT || Math.abs(s.right) > POSITION_LIMIT) throw new Error('Invalid Casimir state: charge positions.');
  const ids = new Set<number>();
  let last = -Infinity;
  return {
    ...s,
    particles: list(s.particles, 'Zeptons', 5_000, v => {
      const z = shaped<Zepton>(v, 'Zepton', ZEPTON);
      if (ids.has(z.id)) throw new Error(`Invalid Zeptons: id ${z.id} appears twice.`);
      ids.add(z.id);
      // A gap birth has no lattice site (-1).
      if (!count(z.id) || !(Number.isInteger(z.site) && z.site >= -1) || !(z.lifetime > 0) || z.age < 0) throw new Error('Invalid Zepton: id, site, age or lifetime.');
      return z;
    }),
    events: list(s.events, 'interactions', 5_000, v => shaped<Interaction>(v, 'interaction', { id: 'number', time: 'number', text: 'string' })),
    history: list(s.history, 'pressure history', 100_000, v => {
      const h = shaped<PressureSample>(v, 'pressure sample', { time: 'number', inner: 'number', outer: 'number' });
      if (h.time < last) throw new Error('Invalid pressure history: times go backwards.');
      last = h.time;
      return h;
    }),
  };
}
