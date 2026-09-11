import { CAPACITY, DEFAULT_PARAMETERS, DT, MAX_TICK, MODEL_VERSION, SNAPSHOT_STRIDE, STATE_STRIDE, validateParameters, validateSeed } from './types';
import type { Checkpoint, Diagnostics, ModelEvent, Parameters } from './types';
import { lifecycleEnvelope } from './pairMotion';

// Coordinates: a periodic 8 × 8 × 8 normalized cell. No interparticle force law.
export class Medium {
  readonly particles = new Float64Array(CAPACITY * STATE_STRIDE);
  free = Array.from({ length: CAPACITY }, (_, i) => CAPACITY - i - 1);
  seed: number; rng: number; tick = 0; parameters: Parameters; initialParameters: Parameters;
  parameterVersion = 0; nextBirth = 0; reservoir = CAPACITY * 5;
  births = 0; deaths = 0; rejected = 0; events: ModelEvent[] = [];
  constructor(seed = 2026, parameters = DEFAULT_PARAMETERS, populate = true) {
    this.seed = validateSeed(seed); this.rng = seed >>> 0;
    this.parameters = validateParameters(parameters); this.initialParameters = { ...this.parameters };
    if (populate) {
      const initial = Math.min(6000, Math.round(parameters.birthRate * .6 / parameters.frequency));
      for (let i = 0; i < initial; i++) this.birth(true);
      this.scheduleBirth(0);
      this.events.push({ tick: 0, kind: 'reset', text: `Initialized with seed ${seed}` });
    }
  }
  random() { this.rng = (Math.imul(this.rng, 1664525) + 1013904223) >>> 0; return (this.rng + .5) / 4294967296; }
  scheduleBirth(time: number) { this.nextBirth = this.parameters.birthRate ? time - Math.log(this.random()) / this.parameters.birthRate : -1; }
  birth(initial = false) {
    if (!this.free.length) { this.rejected++; return; }
    const slot = this.free.pop()!, b = slot * STATE_STRIDE, p = this.particles;
    p[b] = (this.random() - .5) * 8; p[b + 1] = (this.random() - .5) * 8; p[b + 2] = (this.random() - .5) * 8;
    const z = this.random() * 2 - 1, az = this.random() * Math.PI * 2, r = Math.sqrt(1 - z * z);
    p[b + 3] = Math.cos(az) * r; p[b + 4] = z; p[b + 5] = Math.sin(az) * r;
    p[b + 6] = this.parameters.frequency * (.5 + this.random());
    p[b + 7] = this.tick * DT - (initial ? this.random() / p[b + 6] : 0);
    p[b + 8] = this.random() * 2 * Math.PI; p[b + 9]++;
    this.reservoir -= p[b + 6] / 2; this.births++;
  }
  step(steps = 1) {
    if (!Number.isInteger(steps) || steps < 1 || steps > 10000) throw new Error('Invalid step count.');
    if (this.tick + steps > MAX_TICK) throw new Error('Run limit reached. Save this experiment and reset to begin another run.');
    for (let s = 0; s < steps; s++) {
      this.tick++; const time = this.tick * DT, p = this.particles;
      for (let slot = 0; slot < CAPACITY; slot++) {
        const b = slot * STATE_STRIDE, f = p[b + 6];
        if (f > 0 && time - p[b + 7] >= 1 / f) { this.reservoir += f / 2; p[b + 6] = 0; this.free.push(slot); this.deaths++; }
      }
      while (this.nextBirth >= 0 && this.nextBirth <= time) { const due = this.nextBirth; this.birth(); this.scheduleBirth(due); }
    }
  }
  updateParameters(value: Parameters) {
    const p = validateParameters(value), rateChanged = p.birthRate !== this.parameters.birthRate;
    this.parameters = p; this.parameterVersion++;
    if (rateChanged) this.scheduleBirth(this.tick * DT);
    this.events.push({ tick: this.tick, kind: 'parameters', text: `Parameters v${this.parameterVersion} · rate ${p.birthRate}/τ · frequency ${p.frequency} f₀ · peak separation ${p.separation} L₀` });
    this.events = this.events.slice(-100);
  }
  diagnostics(): Diagnostics {
    let fieldEnergy = 0, frequency = 0; const active = CAPACITY - this.free.length;
    for (let b = 0; b < this.particles.length; b += STATE_STRIDE) { fieldEnergy += this.particles[b + 6] / 2; frequency += this.particles[b + 6]; }
    return { tick: this.tick, time: this.tick * DT, active, births: this.births, deaths: this.deaths, rejected: this.rejected, fieldEnergy, reservoir: this.reservoir, totalEnergy: CAPACITY * 5, residual: fieldEnergy + this.reservoir - CAPACITY * 5, meanFrequency: active ? frequency / active : 0, parameterVersion: this.parameterVersion };
  }
  snapshot(target: Float32Array) {
    let count = 0; const p = this.particles, time = this.tick * DT;
    for (let slot = 0; slot < CAPACITY; slot++) {
      const b = slot * STATE_STRIDE, f = p[b + 6]; if (f === 0) continue;
      const age = time - p[b + 7], phase = p[b + 8] + 2 * Math.PI * f * age, n = count++ * SNAPSHOT_STRIDE;
      // The pair midpoint stays at its birth position throughout this generation.
      target[n] = p[b]; target[n + 1] = p[b + 1]; target[n + 2] = p[b + 2];
      // Each pair rotates in a plane perpendicular to its seeded spin axis.
      const ax = p[b + 3], ay = p[b + 4], az = p[b + 5], r = Math.hypot(ax, az);
      const ux = r > 1e-12 ? az / r : 1, uz = r > 1e-12 ? -ax / r : 0;
      const vx = ay * uz, vy = az * ux - ax * uz, vz = -ay * ux;
      const c = Math.cos(phase), s = Math.sin(phase);
      target[n + 3] = ux * c + vx * s; target[n + 4] = vy * s; target[n + 5] = uz * c + vz * s;
      // Snapshot field 6 is the full lobe-centre separation, in normalized length.
      target[n + 6] = this.parameters.separation * lifecycleEnvelope(age, 1 / f); target[n + 7] = f;
      target[n + 8] = age; target[n + 9] = 1 / f; target[n + 10] = slot; target[n + 11] = p[b + 9];
    }
    return count;
  }
  serialize(): Checkpoint {
    return { model: MODEL_VERSION, seed: this.seed, rng: this.rng, tick: this.tick, parameters: { ...this.parameters }, initialParameters: { ...this.initialParameters }, parameterVersion: this.parameterVersion, nextBirth: this.nextBirth, reservoir: this.reservoir, births: this.births, deaths: this.deaths, rejected: this.rejected, particles: Array.from(this.particles), free: [...this.free], events: this.events.map(e => ({ ...e })) };
  }
  static restore(saved: Checkpoint) {
    const model = new Medium(saved.seed, saved.parameters, false);
    model.rng = saved.rng; model.tick = saved.tick; model.parameterVersion = saved.parameterVersion; model.initialParameters = { ...saved.initialParameters };
    model.nextBirth = saved.nextBirth; model.reservoir = saved.reservoir; model.births = saved.births; model.deaths = saved.deaths; model.rejected = saved.rejected;
    model.particles.set(saved.particles); model.free = [...saved.free]; model.events = saved.events.map(e => ({ ...e })); return model;
  }
}
