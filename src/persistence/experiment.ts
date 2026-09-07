import { CAPACITY, DEFAULT_PARAMETERS, DEFAULT_VIEW, DT, MAX_TICK, MODEL_VERSION, STATE_STRIDE, validateParameters, validateSeed } from '../model/types';
import type { Checkpoint, ExperimentFile, ViewSettings } from '../model/types';
const integer = (n: unknown, max = Number.MAX_SAFE_INTEGER): n is number => typeof n === 'number' && Number.isSafeInteger(n) && n >= 0 && n <= max;
export function validateCheckpoint(value: unknown): Checkpoint {
  if (!value || typeof value !== 'object') throw new Error('Missing checkpoint.');
  let c = value as Checkpoint;
  const legacy = (value as { model?: string }).model === 'medium-lifecycle/1';
  if (legacy) {
    const upgrade = (value: unknown) => {
      const p = value as { birthRate: number; frequency: number; jitter: number } | null;
      if (!p || typeof p.jitter !== 'number' || !Number.isFinite(p.jitter) || p.jitter < 0 || p.jitter > .5) throw new Error('Invalid legacy jitter parameter.');
      return validateParameters({ birthRate: p.birthRate, frequency: p.frequency, separation: DEFAULT_PARAMETERS.separation });
    };
    c = { ...c, model: MODEL_VERSION, parameters: upgrade(c.parameters), initialParameters: upgrade(c.initialParameters) };
  }
  if (c.model !== MODEL_VERSION) throw new Error('This file uses an unsupported simulation model.');
  validateSeed(c.seed); validateSeed(c.rng); validateParameters(c.parameters); validateParameters(c.initialParameters);
  for (const key of ['tick', 'births', 'deaths', 'rejected', 'parameterVersion'] as const) if (!integer(c[key], key === 'tick' ? MAX_TICK : Number.MAX_SAFE_INTEGER)) throw new Error(`Invalid checkpoint ${key}.`);
  if (!Number.isFinite(c.nextBirth) || (c.parameters.birthRate === 0 ? c.nextBirth !== -1 : c.nextBirth < c.tick * DT)) throw new Error('Invalid birth schedule.');
  if (!Number.isFinite(c.reservoir) || c.reservoir < 0) throw new Error('Invalid reservoir energy.');
  if (!Array.isArray(c.particles) || c.particles.length !== CAPACITY * STATE_STRIDE || !c.particles.every(x => typeof x === 'number' && Number.isFinite(x))) throw new Error('Invalid particle state.');
  if (!Array.isArray(c.free) || c.free.length > CAPACITY || !c.free.every(i => integer(i, CAPACITY - 1)) || new Set(c.free).size !== c.free.length) throw new Error('Invalid free-slot list.');
  const free = new Set(c.free); let energy = 0;
  for (let slot = 0; slot < CAPACITY; slot++) {
    const b = slot * STATE_STRIDE, p = c.particles, f = p[b + 6];
    if (f < 0 || f > 4.5 || free.has(slot) !== (f === 0) || !integer(p[b + 9], MAX_TICK)) throw new Error('Inconsistent particle slots.');
    if ([p[b], p[b + 1], p[b + 2]].some(x => Math.abs(x) > 4)) throw new Error('Particle outside the cell.');
    if (f > 0) {
      const age = c.tick * DT - p[b + 7], norm = Math.hypot(p[b + 3], p[b + 4], p[b + 5]);
      if (f < .125 || age < 0 || age >= 1 / f + 1e-8 || Math.abs(norm - 1) > 1e-8 || p[b + 9] < 1 || Math.abs(p[b + 8]) > 2 * Math.PI) throw new Error('Invalid active dipole.');
    }
    energy += f / 2;
  }
  if (c.births - c.deaths !== CAPACITY - c.free.length || Math.abs(energy + c.reservoir - CAPACITY * 5) > 1e-5) throw new Error('Checkpoint energy or lifecycle ledger does not balance.');
  if (!Array.isArray(c.events) || c.events.length > 100 || c.events.some(e => !e || !integer(e.tick, c.tick) || !['reset','parameters','checkpoint','restored'].includes(e.kind) || typeof e.text !== 'string' || e.text.length > 500)) throw new Error('Invalid event history.');
  if (legacy) c = { ...c, events: [...c.events, { tick: c.tick, kind: 'restored' as const, text: 'Upgraded to fixed-centre rotation and pair separation; legacy translational jitter removed.' }].slice(-100) };
  return c;
}
export function validateView(value: unknown): ViewSettings {
  if (!value || typeof value !== 'object') return { ...DEFAULT_VIEW };
  const v = value as ViewSettings;
  if (!['dipoles', 'points'].includes(v.representation) || ['medium', 'bounds', 'slice', 'reducedMotion'].some(k => typeof v[k as keyof ViewSettings] !== 'boolean') || !Number.isFinite(v.sliceZ) || v.sliceZ < -4 || v.sliceZ > 4) throw new Error('Invalid view settings.');
  return { ...v };
}
export function parseExperiment(text: string): ExperimentFile {
  if (text.length > 8 * 1024 * 1024) throw new Error('Experiment files must be smaller than 8 MB.');
  let file: ExperimentFile;
  try { file = JSON.parse(text); } catch { throw new Error('This is not a valid JSON experiment file.'); }
  if (!file || file.format !== 'zeropoint-experiment' || file.version !== 1) throw new Error('Unsupported experiment file format.');
  return { format: file.format, version: 1, savedAt: typeof file.savedAt === 'string' ? file.savedAt : '', checkpoint: validateCheckpoint(file.checkpoint), view: validateView(file.view) };
}
export function downloadFile(name: string, body: BlobPart, type: string) {
  const url = URL.createObjectURL(new Blob([body], { type })); const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
