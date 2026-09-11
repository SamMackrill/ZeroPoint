import { Medium } from '../model/Medium';
import { CAPACITY, DT, SNAPSHOT_STRIDE } from '../model/types';
import type { Command, WorkerReply } from '../model/types';
import { validateCheckpoint } from '../persistence/experiment';
const ctx = self as unknown as { postMessage: (reply: WorkerReply, transfer?: Transferable[]) => void; onmessage: (event: MessageEvent<Command>) => void };
let model: Medium | undefined, running = false, speed = 1, accumulator = 0, lastTime = performance.now(), stepMs = 0, lastSend = 0;
// Two owned buffers. Returned buffers are recycled; no unbounded snapshot queue.
const pool = [new ArrayBuffer(CAPACITY * SNAPSHOT_STRIDE * 4), new ArrayBuffer(CAPACITY * SNAPSHOT_STRIDE * 4)];
/** Publish the latest simulation snapshot using an available transfer buffer. */
function emit() {
  if (!model || !pool.length) return;
  const buffer = pool.pop()!, count = model.snapshot(new Float32Array(buffer));
  ctx.postMessage({ type: 'snapshot', buffer, count, diagnostics: model.diagnostics(), parameters: { ...model.parameters }, seed: model.seed, running, speed, events: model.events, stepMs }, [buffer]); lastSend = performance.now();
}
ctx.onmessage = ({ data }) => {
  try {
    if (data.type === 'recycle') { if (data.buffer.byteLength === CAPACITY * SNAPSHOT_STRIDE * 4 && pool.length < 2) pool.push(data.buffer); return; }
    if (data.type === 'initialize' || data.type === 'reset') { model = new Medium(data.seed, data.parameters); running = false; accumulator = 0; }
    if (!model) throw new Error('Simulation is not initialized.');
    if (data.type === 'running') { running = data.value; accumulator = 0; lastTime = performance.now(); }
    if (data.type === 'step') { running = false; accumulator = 0; const t = performance.now(); model.step(); stepMs = performance.now() - t; }
    if (data.type === 'parameters') model.updateParameters(data.value);
    if (data.type === 'speed') { if (![.25, .5, 1, 2, 4].includes(data.value)) throw new Error('Invalid playback speed.'); speed = data.value; }
    if (data.type === 'restore') { model = Medium.restore(validateCheckpoint(data.checkpoint)); running = false; accumulator = 0; }
    if (data.type === 'save') { ctx.postMessage({ type: 'saved', checkpoint: model.serialize() }); return; }
    emit();
  } catch (error) { running = false; ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
};
setInterval(() => {
  const now = performance.now(), elapsed = Math.min((now - lastTime) / 1000, .1); lastTime = now;
  try {
    if (model && running) {
      accumulator += elapsed * speed;
      let steps = 0; const start = performance.now();
      while (accumulator >= DT && steps < 12) { model.step(); accumulator -= DT; steps++; }
      if (steps) stepMs = (performance.now() - start) / steps;
      // Bounded catch-up: slow model time under load; never change DT.
      accumulator = Math.min(accumulator, DT * 12);
    }
    if (now - lastSend >= (running ? 33 : 250)) emit();
  } catch (error) { running = false; ctx.postMessage({ type: 'error', message: String(error) }); }
}, 8);
