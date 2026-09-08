import { ELECTRON_DT, ELECTRON_END, ElectronSimulation } from './model';
import type { ElectronCommand, ElectronReply } from './model';
const ctx = self as unknown as { postMessage: (reply: ElectronReply) => void; onmessage: (event: MessageEvent<ElectronCommand>) => void };
const simulation = new ElectronSimulation();
let running = false, speed = 1, accumulator = 0, last = performance.now(), sent = 0, outstanding = false, dirty = true;
function emit() {
  if (outstanding) { dirty = true; return; }
  outstanding = true; dirty = false; sent = performance.now();
  ctx.postMessage({ type: 'state', state: { ...simulation.snapshot(), running, speed } });
}
function pause() { running = false; accumulator = 0; }
function fail(error: unknown) { pause(); ctx.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) }); }
ctx.onmessage = ({ data }) => {
  try {
    if (data.type === 'ack') { outstanding = false; if (dirty) emit(); return; }
    switch (data.type) {
      case 'run': running = data.value && simulation.state.tick < ELECTRON_END; accumulator = 0; last = performance.now(); break;
      case 'step': pause(); simulation.step(); break;
      case 'advance': pause(); simulation.step(120); break;
      case 'reset': pause(); simulation.seek(0); break;
      case 'configure': pause(); simulation.configure(data.parameters); break;
      case 'seek': pause(); simulation.seek(data.tick); break;
      case 'restore': pause(); simulation.restore(data.state); break;
      case 'speed': if (![.25, .5, 1, 2, 4].includes(data.value)) throw new Error('Invalid playback speed.'); speed = data.value; break;
    }
    emit();
  } catch (error) { fail(error); }
};
setInterval(() => {
  const now = performance.now(), elapsed = Math.min(.1, (now - last) / 1000); last = now;
  if (!running) return;
  try {
    accumulator += elapsed * speed;
    let steps = 0;
    while (accumulator >= ELECTRON_DT && steps++ < 12) { simulation.step(); accumulator -= ELECTRON_DT; }
    accumulator = Math.min(accumulator, 12 * ELECTRON_DT);
    if (simulation.state.tick === ELECTRON_END) pause();
    if (!running || now - sent >= 33) emit();
  } catch (error) { fail(error); }
}, 8);
emit();
